"""Unit tests for wallet saved recipient service."""
from datetime import datetime
from unittest.mock import Mock

from modules.wallet.services.wallet_beneficiary_service import WalletBeneficiaryService


class DummyBeneficiary:
    def __init__(self, **kwargs):
        self.id = kwargs.get("id", 1)
        self.user_id = kwargs.get("user_id", 7)
        self.account_number = kwargs.get("account_number", "0011223344")
        self.account_name = kwargs.get("account_name", "Adaeze Mbakwe")
        self.bank_code = kwargs.get("bank_code", "058")
        self.bank_name = kwargs.get("bank_name", "GTBank")
        self.nickname = kwargs.get("nickname")
        self.is_favorite = kwargs.get("is_favorite", False)
        self.last_used_at = kwargs.get("last_used_at")
        self.created_at = kwargs.get("created_at", datetime.utcnow())
        self.updated_at = kwargs.get("updated_at", datetime.utcnow())

    def mark_used(self):
        self.last_used_at = datetime.utcnow()

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.nickname or self.account_name,
            "account_number": self.account_number,
            "account_name": self.account_name,
            "bank_code": self.bank_code,
            "bank_name": self.bank_name,
            "nickname": self.nickname,
            "is_favorite": self.is_favorite,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


def test_list_beneficiaries_returns_serialized_records_and_pagination():
    repo = Mock()
    repo.list_for_user.return_value = [DummyBeneficiary()]
    repo.count_for_user.return_value = 1

    result = WalletBeneficiaryService(repo).list_beneficiaries(user_id=7, limit=10, offset=0)

    assert result["beneficiaries"][0]["account_number"] == "0011223344"
    assert result["pagination"] == {
        "total": 1,
        "limit": 10,
        "offset": 0,
        "has_more": False,
    }
    repo.list_for_user.assert_called_once_with(7, limit=10, offset=0)


def test_save_beneficiary_creates_new_record_when_absent():
    repo = Mock()
    repo.find_by_account_for_user.return_value = None
    repo.create.side_effect = lambda data: DummyBeneficiary(id=3, **data)

    result = WalletBeneficiaryService(repo).save_beneficiary(
        user_id=7,
        data={
            "account_number": "0011223344",
            "account_name": "Adaeze Mbakwe",
            "bank_code": "058",
            "bank_name": "GTBank",
        },
    )

    assert result["already_saved"] is False
    assert result["beneficiary"]["id"] == 3
    repo.create.assert_called_once()


def test_save_beneficiary_updates_existing_record():
    existing = DummyBeneficiary(account_name="Old Name", bank_name="Old Bank")
    repo = Mock()
    repo.find_by_account_for_user.return_value = existing
    repo.save.side_effect = lambda beneficiary: beneficiary

    result = WalletBeneficiaryService(repo).save_beneficiary(
        user_id=7,
        data={
            "account_number": "0011223344",
            "account_name": "Adaeze Mbakwe",
            "bank_code": "058",
            "bank_name": "GTBank",
            "nickname": "Rent",
        },
    )

    assert result["already_saved"] is True
    assert result["beneficiary"]["account_name"] == "Adaeze Mbakwe"
    assert result["beneficiary"]["name"] == "Rent"
    assert existing.last_used_at is not None
    repo.save.assert_called_once_with(existing)
