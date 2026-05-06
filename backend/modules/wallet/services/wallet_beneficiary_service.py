"""Business logic for wallet saved recipients."""
from typing import Any, Dict, Optional

from modules.wallet.repositories.wallet_beneficiary_repository import WalletBeneficiaryRepository


class WalletBeneficiaryService:
    """Service layer for wallet beneficiaries."""

    def __init__(self, beneficiary_repo: Optional[WalletBeneficiaryRepository] = None):
        self.beneficiary_repo = beneficiary_repo or WalletBeneficiaryRepository()

    def list_beneficiaries(self, user_id: int, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        beneficiaries = self.beneficiary_repo.list_for_user(user_id, limit=limit, offset=offset)
        total = self.beneficiary_repo.count_for_user(user_id)
        return {
            "beneficiaries": [beneficiary.to_dict() for beneficiary in beneficiaries],
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + len(beneficiaries)) < total,
            },
        }

    def save_beneficiary(self, user_id: int, data: dict) -> Dict[str, Any]:
        account_number = str(data["account_number"]).strip()
        bank_code = str(data["bank_code"]).strip()
        existing = self.beneficiary_repo.find_by_account_for_user(
            user_id=user_id,
            account_number=account_number,
            bank_code=bank_code,
        )

        payload = {
            "account_number": account_number,
            "account_name": str(data["account_name"]).strip(),
            "bank_code": bank_code,
            "bank_name": str(data["bank_name"]).strip(),
            "nickname": (str(data.get("nickname")).strip() or None) if data.get("nickname") else None,
            "is_favorite": bool(data.get("is_favorite", False)),
        }

        if existing:
            for key, value in payload.items():
                setattr(existing, key, value)
            existing.mark_used()
            beneficiary = self.beneficiary_repo.save(existing)
            already_saved = True
        else:
            beneficiary = self.beneficiary_repo.create(
                {
                    "user_id": user_id,
                    **payload,
                }
            )
            already_saved = False

        return {
            "beneficiary": beneficiary.to_dict(),
            "already_saved": already_saved,
        }

    def delete_beneficiary(self, user_id: int, beneficiary_id: int) -> bool:
        beneficiary = self.beneficiary_repo.find_by_id_for_user(beneficiary_id, user_id)
        if not beneficiary:
            return False
        self.beneficiary_repo.delete(beneficiary)
        return True
