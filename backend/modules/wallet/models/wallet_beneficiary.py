"""
Wallet beneficiary model.
Stores user-saved bank recipients for wallet transfers.
"""
from datetime import datetime

from modules.auth_v2.extensions import db


class WalletBeneficiary(db.Model):
    """Saved transfer recipient owned by a user."""

    __tablename__ = "wallet_beneficiaries"
    __table_args__ = (
        db.UniqueConstraint(
            "user_id",
            "account_number",
            "bank_code",
            name="uq_wallet_beneficiary_user_account_bank",
        ),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_number = db.Column(db.String(20), nullable=False)
    account_name = db.Column(db.String(255), nullable=False)
    bank_code = db.Column(db.String(20), nullable=False)
    bank_name = db.Column(db.String(100), nullable=False)
    nickname = db.Column(db.String(100), nullable=True)
    is_favorite = db.Column(db.Boolean, nullable=False, default=False)
    last_used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    user = db.relationship(
        "User",
        backref=db.backref(
            "wallet_beneficiaries",
            lazy="dynamic",
            cascade="all, delete-orphan",
        ),
    )

    def mark_used(self) -> None:
        self.last_used_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def to_dict(self) -> dict:
        display_name = self.nickname or self.account_name
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": display_name,
            "account_number": self.account_number,
            "account_name": self.account_name,
            "bank_code": self.bank_code,
            "bank_name": self.bank_name,
            "nickname": self.nickname,
            "is_favorite": self.is_favorite,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @property
    def display_name(self) -> str:
        return self.nickname or self.account_name
