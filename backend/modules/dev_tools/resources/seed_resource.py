"""
Dev-only seed endpoint.

Creates an email-verified user in one call and returns access/refresh tokens.
HARD-GATED: refuses to run unless FLASK_ENV=development. Returns 403 in prod.

This unblocks frontend/integration testing without an SMTP roundtrip.

Endpoint:
    POST /api/v2/dev/seed-user
    Body: {
        "email": "...",
        "password": "...",
        "firstname": "Smoke",   # optional, defaults provided
        "lastname":  "Test",    # optional
        "date_of_birth": "1995-06-15",  # optional
        "phone_number": "+2348012345678" # optional
    }

    Response 200: {
        success: true,
        message: "Seeded",
        data: {
            user_id, email, email_verified: true,
            tokens: { access_token, refresh_token, token_type, expires_in }
        }
    }
"""
import os
import logging
from flask import abort, request
from flask.views import MethodView
from flask_smorest import Blueprint
from werkzeug.exceptions import HTTPException

from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.password_service import PasswordService
from modules.auth_v2.services.token_service import TokenService
from modules.core.response_formatter import format_data, format_error

logger = logging.getLogger(__name__)

dev_seed_blp = Blueprint(
    "dev_seed",
    __name__,
    url_prefix="/api/v2/dev",
    description="Dev-only utilities (gated on FLASK_ENV=development)",
)


def _is_dev() -> bool:
    return (os.getenv("FLASK_ENV", "").lower() == "development") or bool(
        os.getenv("DEBUG", "").lower() in ("1", "true", "yes")
    )


@dev_seed_blp.route("/seed-user")
class SeedUserResource(MethodView):
    """Create-or-update a user, mark email_verified, and return tokens."""

    def post(self):
        if not _is_dev():
            abort(403, description="Dev seed endpoint disabled outside development.")

        try:
            payload = request.get_json(silent=True) or {}
            email = (payload.get("email") or "").strip().lower()
            password = payload.get("password") or ""
            if not email or not password:
                response, status = format_error(
                    message="email and password are required",
                    error_code="BAD_REQUEST",
                    status_code=400,
                )
                return response, status

            user_repo = UserRepository()
            password_service = PasswordService()
            token_service = TokenService()

            user = user_repo.find_by_email(email)
            password_hash = password_service.hash_password(password)

            if user is None:
                user = user_repo.create_user(
                    email=email,
                    firstname=payload.get("firstname", "Dev"),
                    lastname=payload.get("lastname", "Tester"),
                    password_hash=password_hash,
                    date_of_birth=payload.get("date_of_birth"),
                    phone_number=payload.get("phone_number"),
                    nin=None,
                )
                created = True
                if user is None:
                    response, status = format_error(
                        message="Failed to create user",
                        error_code="DB_ERROR",
                        status_code=500,
                    )
                    return response, status
            else:
                # Reset password to whatever the caller asked for so the same
                # creds can be used to log in via the regular endpoint.
                user_repo.update_user(user.id, password_hash=password_hash)
                created = False

            # Force-verify email so login bypasses OTP.
            user_repo.verify_email(user.id)

            # Re-fetch to pick up updated state.
            user = user_repo.find_by_id(user.id)

            tokens = token_service.generate_tokens(user.id, user.email)

            # On first creation, drop a welcome notification + audit row so the
            # wired Inbox / Audit pages have something to show immediately.
            if created:
                try:
                    from modules.notifications.services.notification_service import NotificationService
                    from modules.audit.services.audit_service import AuditService
                    NotificationService().create_for_user(
                        user_id=user.id,
                        title=f"Welcome, {user.firstname}!",
                        body="Verify your identity to unlock the wallet, then join a community to start collecting bills together.",
                        category='system',
                        source='CCPay',
                        action_href='/dashboard/wallet',
                        action_label='Verify identity',
                    )
                    AuditService().record(
                        user_id=user.id,
                        action='Account created (dev seed)',
                        details=f'Account seeded for {user.email}',
                        category='security',
                        severity='info',
                        actor='System',
                    )
                except Exception:
                    pass

            logger.info(
                "[dev/seed-user] %s user_id=%s email=%s",
                "created" if created else "updated",
                user.id,
                user.email,
            )

            response, status = format_data(
                data={
                    "user_id": user.id,
                    "email": user.email,
                    "email_verified": True,
                    "created": created,
                    "tokens": tokens,
                    "user": user.to_dict() if hasattr(user, "to_dict") else None,
                },
                message="Seeded",
                status_code=200,
            )
            return response, status
        except HTTPException:
            raise
        except Exception as e:  # noqa: BLE001
            logger.exception("[dev/seed-user] unexpected error: %s", e)
            response, status = format_error(
                message="Seed failed",
                error_code="UNEXPECTED",
                status_code=500,
            )
            return response, status
