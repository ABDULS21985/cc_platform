"""
Transaction PIN Service

Responsible for setting/verifying a user's transaction PIN and enforcing
simple lockout rules against brute-force attempts.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from modules.auth_v2.extensions import db
from modules.auth_v2.models.user import User
from modules.auth_v2.services.password_service import PasswordService


class TransactionPinService:
    PIN_LENGTH = 4
    MAX_FAILED_ATTEMPTS = 5
    LOCKOUT_MINUTES = 15

    def _validate_format(self, pin: str) -> None:
        if not pin or not isinstance(pin, str):
            raise ValueError("PIN is required")
        if len(pin) != self.PIN_LENGTH or not pin.isdigit():
            raise ValueError(f"PIN must be exactly {self.PIN_LENGTH} digits")

    def _get_user(self, user_id: int) -> User:
        user = User.query.get(user_id)
        if not user:
            raise ValueError("User not found")
        return user

    def is_locked(self, user: User) -> bool:
        return bool(user.pin_locked_until and user.pin_locked_until > datetime.utcnow())

    def set_pin(self, *, user_id: int, pin: str, overwrite: bool = False) -> None:
        self._validate_format(pin)
        user = self._get_user(user_id)

        if user.transaction_pin_hash and not overwrite:
            raise ValueError("PIN already set")

        user.transaction_pin_hash = PasswordService.hash_password(pin)
        user.pin_failed_attempts = 0
        user.pin_locked_until = None
        user.pin_updated_at = datetime.utcnow()
        db.session.commit()

    def change_pin(self, *, user_id: int, old_pin: str, new_pin: str) -> None:
        self.verify_pin(user_id=user_id, pin=old_pin)
        self.set_pin(user_id=user_id, pin=new_pin, overwrite=True)

    def verify_pin(self, *, user_id: int, pin: str) -> None:
        self._validate_format(pin)
        user = self._get_user(user_id)

        if not user.transaction_pin_hash:
            raise ValueError("PIN not set")

        if self.is_locked(user):
            raise ValueError("PIN temporarily locked. Try again later.")

        ok = PasswordService.verify_password(pin, user.transaction_pin_hash)
        if ok:
            if user.pin_failed_attempts:
                user.pin_failed_attempts = 0
                user.pin_locked_until = None
                db.session.commit()
            return

        user.pin_failed_attempts = int(user.pin_failed_attempts or 0) + 1
        if user.pin_failed_attempts >= self.MAX_FAILED_ATTEMPTS:
            user.pin_locked_until = datetime.utcnow() + timedelta(minutes=self.LOCKOUT_MINUTES)
        db.session.commit()
        raise ValueError("Invalid PIN")

