"""Repository for wallet saved recipients."""
from typing import List, Optional

from modules.auth_v2.extensions import db
from modules.wallet.models.wallet_beneficiary import WalletBeneficiary


class WalletBeneficiaryRepository:
    """Data access for wallet beneficiaries."""

    def list_for_user(self, user_id: int, limit: int = 50, offset: int = 0) -> List[WalletBeneficiary]:
        return (
            WalletBeneficiary.query.filter_by(user_id=user_id)
            .order_by(
                WalletBeneficiary.is_favorite.desc(),
                WalletBeneficiary.last_used_at.desc().nullslast(),
                WalletBeneficiary.updated_at.desc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )

    def count_for_user(self, user_id: int) -> int:
        return WalletBeneficiary.query.filter_by(user_id=user_id).count()

    def find_by_id_for_user(self, beneficiary_id: int, user_id: int) -> Optional[WalletBeneficiary]:
        return WalletBeneficiary.query.filter_by(id=beneficiary_id, user_id=user_id).first()

    def find_by_account_for_user(
        self,
        user_id: int,
        account_number: str,
        bank_code: str,
    ) -> Optional[WalletBeneficiary]:
        return WalletBeneficiary.query.filter_by(
            user_id=user_id,
            account_number=account_number,
            bank_code=bank_code,
        ).first()

    def create(self, data: dict) -> WalletBeneficiary:
        beneficiary = WalletBeneficiary(**data)
        db.session.add(beneficiary)
        db.session.commit()
        db.session.refresh(beneficiary)
        return beneficiary

    def save(self, beneficiary: WalletBeneficiary) -> WalletBeneficiary:
        db.session.add(beneficiary)
        db.session.commit()
        db.session.refresh(beneficiary)
        return beneficiary

    def delete(self, beneficiary: WalletBeneficiary) -> None:
        db.session.delete(beneficiary)
        db.session.commit()
