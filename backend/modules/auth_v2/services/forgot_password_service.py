"""
Forgot Password Service

Implements OTP-based password reset flow:
- Request reset: send OTP to email (no user enumeration)
- Confirm reset: verify OTP and set new password
"""

import logging
from typing import Dict, Any, Tuple

from modules.auth_v2.repositories.user_repository import UserRepository
from modules.auth_v2.services.otp_service import OTPService
from modules.auth_v2.services.email_service import EmailService
from modules.auth_v2.services.password_service import PasswordService
from modules.auth_v2.extensions import db

logger = logging.getLogger(__name__)


class ForgotPasswordService:
    OTP_TYPE = "password_reset"
    OTP_EXPIRY_MINUTES = 10

    def __init__(self):
        self.user_repo = UserRepository()
        self.otp_service = OTPService()
        self.email_service = EmailService()
        self.password_service = PasswordService()

    def request_reset(self, email: str) -> Tuple[Dict[str, Any], int]:
        """
        Send password reset OTP to email.

        Important: do not reveal whether the email exists (avoid account enumeration).
        """
        try:
            user = self.user_repo.find_by_email(email)

            # Always return success (even if user not found).
            if not user:
                logger.info("Password reset requested for unknown email", extra={"email": email})
                return {
                    "success": True,
                    "message": "If an account exists for this email, a reset code has been sent.",
                }, 200

            otp = self.otp_service.create_otp(
                user.email,
                otp_type=self.OTP_TYPE,
                expiry_minutes=self.OTP_EXPIRY_MINUTES,
            )

            sent = self.email_service.send_password_reset_otp(
                to_email=user.email,
                firstname=user.firstname or "User",
                otp=otp,
                expiry_minutes=self.OTP_EXPIRY_MINUTES,
            )
            if not sent:
                # Still avoid enumeration — but provide a clear generic error.
                return {
                    "success": False,
                    "error": "email_send_failed",
                    "message": "Unable to send reset email at the moment. Please try again.",
                }, 503

            return {
                "success": True,
                "message": "If an account exists for this email, a reset code has been sent.",
                "otp_sent": True,
            }, 200

        except Exception as e:
            logger.error(f"Error requesting password reset: {e}", exc_info=True)
            return {
                "success": False,
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again.",
            }, 500

    def confirm_reset(self, email: str, otp: str, new_password: str) -> Tuple[Dict[str, Any], int]:
        """Verify OTP and set a new password."""
        try:
            user = self.user_repo.find_by_email(email)
            if not user:
                # Avoid enumeration
                return {
                    "success": False,
                    "error": "invalid_reset_request",
                    "message": "Invalid reset request",
                }, 400

            ok, msg = self.otp_service.verify_otp(email, otp, otp_type=self.OTP_TYPE)
            if not ok:
                return {
                    "success": False,
                    "error": "invalid_otp",
                    "message": msg,
                }, 400

            user.password_hash = self.password_service.hash_password(new_password)
            db.session.commit()

            return {
                "success": True,
                "message": "Password reset successfully. Please log in with your new password.",
            }, 200

        except Exception as e:
            logger.error(f"Error confirming password reset: {e}", exc_info=True)
            db.session.rollback()
            return {
                "success": False,
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again.",
            }, 500

