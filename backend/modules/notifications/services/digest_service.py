"""Email digest worker.

Aggregates a user's recent unread notifications and emails them on a
configurable cadence (off / daily / weekly). Users opt in via the
`digest_frequency` field on `NotificationPreference`.

Schedule:
    - The runner is started once at app boot via `start_digest_scheduler(app)`.
    - It wakes once an hour and dispatches digests for users whose
      `last_digest_at` is older than the cadence.
    - Empty digests are skipped (no notifications since last run = no email).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from html import escape
from typing import List

from modules.auth_v2.extensions import db
from modules.auth_v2.models.user import User
from modules.auth_v2.services.email_service import EmailService
from modules.notifications.models.notification import Notification
from modules.notifications.models.preference import NotificationPreference

logger = logging.getLogger(__name__)


CADENCE_HOURS = {'daily': 24, 'weekly': 24 * 7}


class DigestService:
    def __init__(self):
        self.email = EmailService()

    # ------------------------------------------------------------------
    # HTML rendering
    # ------------------------------------------------------------------
    @staticmethod
    def _category_label(category: str) -> str:
        return {
            'money': 'Money',
            'bills': 'Bills',
            'communities': 'Community activity',
            'events': 'Events',
            'security': 'Security',
            'system': 'Product updates',
        }.get(category, category.title())

    def _render_html(self, user: User, notifications: List[Notification]) -> str:
        # Group by category for a tidy summary.
        groups: dict[str, list[Notification]] = {}
        for n in notifications:
            groups.setdefault(n.category, []).append(n)

        sections_html = []
        for cat, items in groups.items():
            rows = []
            for n in items:
                amount_html = ''
                if n.amount_value:
                    sign = '−' if n.amount_direction == 'out' else '+'
                    amount_html = (
                        f'<div style="color:#0E9DA5;font-weight:700;font-size:13px">'
                        f'{sign}₦{escape(n.amount_value)}</div>'
                    )
                rows.append(
                    f'<tr><td style="padding:12px 0;border-bottom:1px solid #f1f5f9">'
                    f'<div style="font-weight:600;color:#0f172a">{escape(n.title)}</div>'
                    f'<div style="color:#475569;font-size:13px;margin-top:2px">'
                    f'{escape(n.body or "")}</div>'
                    f'<div style="color:#94a3b8;font-size:11px;margin-top:4px;'
                    f'text-transform:uppercase;letter-spacing:.08em">'
                    f'{escape(n.source)}</div>{amount_html}</td></tr>'
                )
            sections_html.append(
                f'<tr><td><h3 style="color:#0f172a;margin:24px 0 8px;font-size:14px;'
                f'text-transform:uppercase;letter-spacing:.1em">'
                f'{self._category_label(cat)} ({len(items)})</h3>'
                f'<table width="100%" style="border-collapse:collapse">{"".join(rows)}'
                f'</table></td></tr>'
            )

        firstname = escape(user.firstname or 'there')
        return f"""
<html><body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;
        padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
        <tr><td>
          <div style="color:#0E9DA5;font-weight:800;font-size:20px;letter-spacing:-.01em">CCPay</div>
          <h1 style="color:#0f172a;font-size:22px;margin:8px 0 4px">
            Hi {firstname}, here's what you missed.
          </h1>
          <p style="color:#475569;font-size:14px;margin:0">
            {len(notifications)} new {'notification' if len(notifications) == 1 else 'notifications'}
            since your last digest.
          </p>
        </td></tr>
        {''.join(sections_html)}
        <tr><td>
          <a href="https://app.ccpay.local/dashboard/inbox"
             style="display:inline-block;background:#0E9DA5;color:#fff;text-decoration:none;
             padding:10px 20px;border-radius:10px;font-weight:600;margin-top:24px">
            Open inbox
          </a>
        </td></tr>
        <tr><td>
          <p style="color:#94a3b8;font-size:11px;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px">
            You're receiving this because email digests are turned on. Manage cadence in
            <a href="https://app.ccpay.local/dashboard/settings?tab=notification"
               style="color:#0E9DA5">notification settings</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
""".strip()

    # ------------------------------------------------------------------
    # Per-user dispatch
    # ------------------------------------------------------------------
    def send_digest_for_user(self, user_id: int, lookback_hours: int = 24) -> bool:
        """Send a digest email for one user. Returns True iff an email went out."""
        user = User.query.filter_by(id=user_id).first()
        if not user or not user.email:
            return False

        cutoff = datetime.utcnow() - timedelta(hours=lookback_hours)
        notifications = (
            Notification.query.filter(
                Notification.user_id == user_id,
                Notification.created_at >= cutoff,
                Notification.is_read.is_(False),
            )
            .order_by(Notification.created_at.desc())
            .all()
        )
        if not notifications:
            logger.info('digest skipped for user %s — no unread items in window', user_id)
            return False

        html = self._render_html(user, notifications)
        subject = f"Your CCPay digest — {len(notifications)} new {'item' if len(notifications) == 1 else 'items'}"
        ok = self.email._send_email(user.email, subject, html)
        if ok:
            pref = NotificationPreference.query.filter_by(user_id=user_id).first()
            if pref:
                pref.last_digest_at = datetime.utcnow()
                db.session.commit()
        return ok

    # ------------------------------------------------------------------
    # Sweeper
    # ------------------------------------------------------------------
    def run_pending_digests(self) -> dict:
        """Find users whose digest is due, dispatch each. Returns a summary dict."""
        now = datetime.utcnow()
        sent, skipped = 0, 0
        prefs = (
            NotificationPreference.query.filter(
                NotificationPreference.digest_frequency.in_(['daily', 'weekly'])
            ).all()
        )
        for pref in prefs:
            window = CADENCE_HOURS.get(pref.digest_frequency)
            if not window:
                continue
            if pref.last_digest_at and (now - pref.last_digest_at) < timedelta(hours=window):
                skipped += 1
                continue
            try:
                ok = self.send_digest_for_user(pref.user_id, lookback_hours=window)
                sent += 1 if ok else 0
            except Exception as exc:
                logger.warning('digest failed for user %s: %s', pref.user_id, exc)
        return {'checked': len(prefs), 'sent': sent, 'skipped': skipped}


# ----------------------------------------------------------------------
# Scheduler glue (APScheduler)
# ----------------------------------------------------------------------
_scheduler = None


def start_digest_scheduler(app) -> None:
    """Start a background scheduler that fires once per hour. Idempotent."""
    global _scheduler
    if _scheduler is not None:
        return
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        logger.warning('APScheduler not available; digest scheduler not started')
        return

    sched = BackgroundScheduler(daemon=True)

    def _tick():
        with app.app_context():
            try:
                summary = DigestService().run_pending_digests()
                logger.info('digest sweep complete: %s', summary)
            except Exception as exc:
                logger.warning('digest sweep failed: %s', exc)

    # Hourly sweep — most users will be on daily so checking once an hour
    # picks them up within an hour of being due.
    sched.add_job(_tick, 'interval', hours=1, id='ccp_digest', replace_existing=True)
    sched.start()
    _scheduler = sched
    logger.info('✓ Digest scheduler started (hourly sweep)')
