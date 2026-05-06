"""
Deactivation Service — request, complete, and reverse account deactivation.

Policy (frozen 2026-05-06):
  * Soft-delete with a 30-day grace period; login is blocked while
    `users.deactivated_at` is non-null.
  * Wallet must have zero balance to request deactivation.
  * If the user is the SOLE owner of any community, deactivation is
    blocked until ownership is transferred.
  * Subscriptions and standing instructions are paused on request,
    cancelled at PII scrub.
  * After 30 days a scheduled job sets `pii_scrubbed_at` and zeroes
    name/phone/NIN/profile_photo. The job lives in modules/tasks (planned)
    — until then, run scripts/scrub_deactivated_users.py manually.
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, Tuple

from modules.auth_v2.extensions import db
from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService

logger = logging.getLogger(__name__)

GRACE_PERIOD_DAYS = 30


class DeactivationService:
    def __init__(self):
        self.user_repo = UserRepository()
        self.password_service = PasswordService()

    # ---------------------------------------------------------------- public

    def preflight(self, user_id: int) -> Tuple[Dict, int]:
        """Return blockers (if any) before deactivation can proceed."""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return ({'error': 'User not found', 'code': 'NOT_FOUND'}, 404)

        blockers = []

        # Wallet balance check
        try:
            from modules.wallet.repositories.wallet_repository import WalletRepository
            wallet = WalletRepository().find_by_user_id(user_id)
            balance = float(wallet.balance) if wallet and wallet.balance else 0.0
            if balance > 0.0:
                blockers.append({
                    'kind': 'wallet_balance',
                    'message': f'Withdraw or transfer your ₦{balance:,.2f} wallet balance before deactivating.',
                    'amount': balance,
                })
        except Exception as exc:
            logger.warning(f"Wallet preflight check skipped: {exc}")

        # Sole-owner check
        try:
            from modules.community.models.community_member import CommunityMember
            from modules.community.models.community import Community
            owned = (
                Community.query
                .join(CommunityMember, CommunityMember.community_id == Community.id)
                .filter(CommunityMember.user_id == user_id, CommunityMember.role == 'owner')
                .all()
            )
            for community in owned:
                other_owners = (
                    CommunityMember.query
                    .filter(
                        CommunityMember.community_id == community.id,
                        CommunityMember.role == 'owner',
                        CommunityMember.user_id != user_id,
                    )
                    .count()
                )
                if other_owners == 0:
                    blockers.append({
                        'kind': 'sole_owner',
                        'community_id': community.id,
                        'community_name': community.name,
                        'message': f"You're the sole owner of '{community.name}'. Transfer ownership before deactivating.",
                    })
        except Exception as exc:
            logger.warning(f"Sole-owner preflight check skipped: {exc}")

        return (
            {
                'success': True,
                'message': 'Preflight complete',
                'data': {
                    'blockers': blockers,
                    'can_deactivate': len(blockers) == 0,
                    'grace_days': GRACE_PERIOD_DAYS,
                },
            },
            200,
        )

    def request_deactivation(
        self, user_id: int, password: str, reason: str = ''
    ) -> Tuple[Dict, int]:
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return ({'error': 'User not found', 'code': 'NOT_FOUND'}, 404)
        if user.deactivated_at:
            return (
                {'error': 'Account already deactivated', 'code': 'ALREADY_DEACTIVATED'},
                409,
            )

        # Re-confirm password before destructive action.
        if not user.password_hash or not self.password_service.verify_password(
            password, user.password_hash
        ):
            return ({'error': 'Password incorrect', 'code': 'INVALID_PASSWORD'}, 401)

        # Re-run preflight to short-circuit if state changed since last check.
        preflight_resp, _ = self.preflight(user_id)
        blockers = preflight_resp.get('data', {}).get('blockers', [])
        if blockers:
            return (
                {
                    'error': 'Cannot deactivate yet',
                    'code': 'BLOCKED',
                    'blockers': blockers,
                },
                400,
            )

        now = datetime.utcnow()
        user.deactivated_at = now
        user.is_active = False
        db.session.commit()

        # Side effects: pause subscriptions/standing instructions, revoke sessions.
        self._on_deactivate(user_id)

        # Audit + notification (best-effort).
        try:
            from modules.audit.services.audit_service import AuditService
            AuditService().record(
                user_id=user_id,
                action='Account deactivated',
                details=f'Reason: {reason or "unspecified"}',
                category='security',
                severity='warning',
                actor='You',
            )
        except Exception:
            pass

        try:
            from modules.notifications.services.email_dispatcher import EmailDispatcher
            html = (
                f"<p>Hi {user.firstname},</p>"
                f"<p>Your CCPay account has been deactivated. You have "
                f"{GRACE_PERIOD_DAYS} days to change your mind — sign in again "
                f"to reactivate. After that, your personal info will be removed.</p>"
            )
            EmailDispatcher().dispatch_security(
                user_id=user_id,
                subject='Your CCPay account has been deactivated',
                html=html,
            )
        except Exception:
            pass

        return (
            {
                'success': True,
                'message': f'Account deactivated. You have {GRACE_PERIOD_DAYS} days to reactivate by signing in.',
                'data': {'deactivated_at': now.isoformat()},
            },
            200,
        )

    def reactivate(self, user_id: int) -> Tuple[Dict, int]:
        """Reverse a deactivation while still inside the grace window."""
        user = self.user_repo.find_by_id(user_id)
        if not user:
            return ({'error': 'User not found', 'code': 'NOT_FOUND'}, 404)
        if not user.deactivated_at:
            return ({'success': True, 'message': 'Account already active', 'data': {}}, 200)
        if user.pii_scrubbed_at:
            return (
                {'error': 'Grace period expired — account cannot be reactivated', 'code': 'GRACE_EXPIRED'},
                410,
            )

        user.deactivated_at = None
        user.is_active = True
        db.session.commit()
        try:
            from modules.audit.services.audit_service import AuditService
            AuditService().record(
                user_id=user_id,
                action='Account reactivated',
                details='Account restored within the grace window',
                category='security',
                severity='info',
                actor='You',
            )
        except Exception:
            pass
        return ({'success': True, 'message': 'Account reactivated', 'data': {}}, 200)

    def scrub_eligible(self) -> Dict:
        """
        Run the PII scrub for users whose `deactivated_at` is older than the
        grace window. Idempotent — already-scrubbed users are skipped.

        Returns a summary dict: {scrubbed: N, skipped: N, errors: []}
        """
        from modules.auth_v2.models.user import User
        cutoff = datetime.utcnow() - timedelta(days=GRACE_PERIOD_DAYS)
        candidates = (
            User.query
            .filter(User.deactivated_at.is_not(None))
            .filter(User.deactivated_at < cutoff)
            .filter(User.pii_scrubbed_at.is_(None))
            .all()
        )
        summary = {'scrubbed': 0, 'skipped': 0, 'errors': []}
        for u in candidates:
            try:
                self._scrub_user(u)
                summary['scrubbed'] += 1
            except Exception as exc:
                logger.error(f"Scrub failed for user {u.id}: {exc}", exc_info=True)
                summary['errors'].append({'user_id': u.id, 'error': str(exc)})
        return summary

    # ---------------------------------------------------------------- private

    def _on_deactivate(self, user_id: int) -> None:
        """Best-effort side effects when a user deactivates."""
        try:
            from modules.subscriptions.repositories.subscription_repository import (
                SubscriptionRepository,
            )
            from modules.subscriptions.models.subscription import (
                SubscriptionStatus,
            )
            repo = SubscriptionRepository()
            actives = repo.list_for_user(user_id, status=SubscriptionStatus.ACTIVE, limit=500)
            for s in actives:
                repo.update(s.id, status=SubscriptionStatus.PAUSED)
        except Exception as exc:
            logger.warning(f"Failed to pause subscriptions on deactivation: {exc}")

        try:
            from modules.auth_v2.repositories.auth_session_repository import (
                AuthSessionRepository,
            )
            AuthSessionRepository().revoke_all_others(user_id, current_session_id=None)
        except Exception as exc:
            logger.warning(f"Failed to revoke sessions on deactivation: {exc}")

    def _scrub_user(self, user) -> None:
        """Zero out PII while preserving FK integrity."""
        user.firstname = 'Removed'
        user.lastname = 'User'
        user.email = f'scrubbed-{user.id}@deleted.ccpay.local'
        user.phone_number = None
        user.nin = None
        user.bio = None
        user.profile_photo = None
        user.header_image = None
        user.password_hash = None
        user.transaction_pin_hash = None
        user.pii_scrubbed_at = datetime.utcnow()
        db.session.commit()

        # Cancel all subscriptions & standing instructions.
        try:
            from modules.subscriptions.models.subscription import Subscription, SubscriptionStatus
            Subscription.query.filter_by(user_id=user.id).update(
                {Subscription.status: SubscriptionStatus.CANCELLED}
            )
            db.session.commit()
        except Exception as exc:
            logger.warning(f"Failed to cancel subscriptions during scrub: {exc}")
