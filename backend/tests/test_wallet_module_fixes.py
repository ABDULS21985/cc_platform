"""
Unit tests for production-grade wallet fixes:

1. DepositService picks the opposite-of-primary fallback provider.
2. WithdrawalService emits the `withdrawal.reconciliation_pending` envelope.
3. WalletTransaction.to_dict surfaces destination_bank_code from meta.
4. SafeHavenProvider sleeps with jittered backoff between retry attempts.

These tests are designed to run without a live Flask app or DB. Heavy
dependencies are patched at import time.
"""
import logging
from decimal import Decimal
from unittest.mock import MagicMock, Mock, patch

import pytest


# ---------------------------------------------------------------------------
# 1. DepositService fallback selection
# ---------------------------------------------------------------------------

@pytest.fixture
def deposit_service_factory():
    """Return a builder that constructs a DepositService with everything mocked."""
    def _build(primary_id: str):
        from modules.wallet.services import deposit_service as ds_module

        with patch.object(ds_module, "WalletRepository", return_value=MagicMock()), \
             patch.object(ds_module, "WalletTransactionRepository", return_value=MagicMock()), \
             patch.object(ds_module, "VerificationRepository", return_value=MagicMock()), \
             patch.object(ds_module, "EncryptionService", return_value=MagicMock()), \
             patch.object(ds_module.PaymentProviderFactory, "get_provider",
                          return_value=MagicMock(name=f"primary[{primary_id}]")), \
             patch.object(ds_module, "BellMFBProvider", autospec=True) as bell_cls, \
             patch.object(ds_module, "SafeHavenProvider", autospec=True) as safe_cls, \
             patch.dict("os.environ", {"PERSONAL_PAYMENT_PROVIDER": primary_id}, clear=False):
            bell_instance = MagicMock(name="BellMFB")
            safe_instance = MagicMock(name="SafeHaven")
            bell_cls.return_value = bell_instance
            safe_cls.return_value = safe_instance

            service = ds_module.DepositService()
            return service, bell_cls, safe_cls

    return _build


class TestDepositFallbackSelection:
    """When primary is bell_mfb, fallback must be SafeHaven (and vice-versa)."""

    def test_bell_primary_picks_safehaven_fallback(self, deposit_service_factory):
        service, bell_cls, safe_cls = deposit_service_factory("bell_mfb")
        # Fallback must be a SafeHaven instance, not Bell MFB.
        safe_cls.assert_called_once()
        bell_cls.assert_not_called()
        assert service.fallback_provider is safe_cls.return_value

    def test_safehaven_primary_picks_bell_fallback(self, deposit_service_factory):
        service, bell_cls, safe_cls = deposit_service_factory("safehaven")
        bell_cls.assert_called_once()
        safe_cls.assert_not_called()
        assert service.fallback_provider is bell_cls.return_value

    def test_default_when_env_unset(self):
        """No PERSONAL_PAYMENT_PROVIDER means default 'bell_mfb' primary, SafeHaven fallback."""
        from modules.wallet.services import deposit_service as ds_module
        env = {k: v for k, v in __import__("os").environ.items() if k != "PERSONAL_PAYMENT_PROVIDER"}
        with patch.object(ds_module, "WalletRepository", return_value=MagicMock()), \
             patch.object(ds_module, "WalletTransactionRepository", return_value=MagicMock()), \
             patch.object(ds_module, "VerificationRepository", return_value=MagicMock()), \
             patch.object(ds_module, "EncryptionService", return_value=MagicMock()), \
             patch.object(ds_module.PaymentProviderFactory, "get_provider",
                          return_value=MagicMock(name="primary")), \
             patch.object(ds_module, "BellMFBProvider", autospec=True) as bell_cls, \
             patch.object(ds_module, "SafeHavenProvider", autospec=True) as safe_cls, \
             patch.dict("os.environ", env, clear=True):
            service = ds_module.DepositService()
            assert service.fallback_provider is safe_cls.return_value
            bell_cls.assert_not_called()


# ---------------------------------------------------------------------------
# 2. Withdrawal reconciliation log envelope
# ---------------------------------------------------------------------------

class _StubSession:
    """Minimal stub for db.session used inside WithdrawalService."""
    def add(self, _): pass
    def commit(self): pass
    def refresh(self, _): pass
    def rollback(self): pass


class TestWithdrawalReconciliationLog:
    def test_emits_reconciliation_pending_envelope(self, caplog):
        from modules.wallet.services import withdrawal_service as ws_module

        # Build a wallet stub that supports .with_for_update().first().
        wallet_stub = MagicMock()
        wallet_stub.id = 42
        wallet_stub.balance = Decimal("10000.00")
        wallet_stub.account_number = "9999999999"
        wallet_stub.status = "active"

        query_chain = MagicMock()
        query_chain.filter_by.return_value.with_for_update.return_value.first.return_value = wallet_stub

        # Patch out PIN, DB session and the WalletTransaction model so
        # nothing requires Flask app context.
        pin = MagicMock()
        pin.verify_pin.return_value = None

        # WalletTransaction stub: capture instantiation kwargs and produce a
        # row-like object the service can read back from.
        captured = {}

        def fake_txn_init(**kwargs):
            captured.update(kwargs)
            row = MagicMock()
            row.id = 7
            row.reference = kwargs["reference"]
            row.status = kwargs.get("status", "pending")
            row.meta = kwargs.get("meta", {})
            row.created_at = MagicMock(isoformat=lambda: "2026-05-06T12:00:00+00:00")
            return row

        with patch.object(ws_module, "Wallet", MagicMock(query=query_chain)), \
             patch.object(ws_module, "db", MagicMock(session=_StubSession())), \
             patch.object(ws_module, "WalletTransaction") as WT_cls:
            WT_cls.generate_reference.return_value = "WTH-TESTREF"
            WT_cls.compute_signed_amount.return_value = Decimal("-1000.00")
            WT_cls.side_effect = fake_txn_init

            svc = ws_module.WithdrawalService(pin_service=pin)

            # Suppress the best-effort notify/audit by mocking it directly.
            svc._notify_and_audit = MagicMock()

            with caplog.at_level(logging.WARNING, logger=ws_module.logger.name):
                svc.initiate_withdrawal(
                    user_id=11,
                    amount=Decimal("1000.00"),
                    bank_code="058",
                    account_number="0123456789",
                    pin="1234",
                    account_name="Jane Doe",
                    bank_name="GTBank",
                )

        warning_records = [
            r for r in caplog.records
            if r.levelno == logging.WARNING
            and getattr(r, "event", None) == "withdrawal.reconciliation_pending"
        ]
        assert len(warning_records) == 1, f"expected exactly one envelope, got {warning_records}"
        rec = warning_records[0]
        # Required envelope fields:
        assert rec.transaction_id == 7
        assert rec.reference == "WTH-TESTREF"
        assert rec.user_id == 11
        assert rec.wallet_id == 42
        assert rec.amount == "1000.00"
        # Fee = max(amount * 2%, 50) = max(20, 50) = 50.00
        assert rec.fee == "50.00"
        assert rec.destination_bank == "GTBank"
        assert rec.destination_bank_code == "058"
        assert rec.destination_account_number == "0123456789"
        assert rec.status == "pending"
        assert rec.provider_status == "provider_unavailable"
        assert rec.created_at  # any iso string


# ---------------------------------------------------------------------------
# 3. WalletTransaction.to_dict — destination_bank_code
# ---------------------------------------------------------------------------

class _FakeRow:
    """Plain object that mimics WalletTransaction column access for to_dict."""
    def __init__(self, **kwargs):
        defaults = {
            "id": None, "reference": None, "bell_mfb_reference": None,
            "type": None, "amount": Decimal("0.00"),
            "signed_amount": None, "fee": Decimal("0.00"),
            "stamp_duty": Decimal("0.00"), "net_amount": Decimal("0.00"),
            "balance_before": None, "balance_after": None,
            "description": None,
            "source_account_number": None, "source_account_name": None,
            "source_bank_code": None, "source_bank_name": None,
            "destination_account_number": None, "destination_account_name": None,
            "status": None,
            "community_id": None, "bill_id": None, "bill_session_id": None,
            "transaction_type": None,
            "completed_at": None, "created_at": None,
            "meta": None,
        }
        defaults.update(kwargs)
        for k, v in defaults.items():
            object.__setattr__(self, k, v)


class TestWalletTransactionToDict:
    """Exercise the bound method against a duck-typed row to avoid SA setup."""

    @staticmethod
    def _to_dict(row):
        from modules.wallet.models.wallet_transaction import WalletTransaction
        return WalletTransaction.to_dict(row)

    def test_destination_bank_code_from_meta_bank_code(self):
        row = _FakeRow(
            id=1, reference="WTH-1", type="withdrawal",
            amount=Decimal("100.00"), signed_amount=Decimal("-100.00"),
            fee=Decimal("50.00"), net_amount=Decimal("50.00"),
            balance_before=Decimal("1000.00"), balance_after=Decimal("900.00"),
            destination_account_number="0123456789",
            destination_account_name="Jane",
            status="pending",
            meta={"bank_code": "058", "bank_name": "GTBank"},
        )
        result = self._to_dict(row)
        assert "destination_bank_code" in result
        assert result["destination_bank_code"] == "058"
        assert result["destination_bank_name"] == "GTBank"

    def test_destination_bank_code_prefers_explicit_key(self):
        row = _FakeRow(meta={"destination_bank_code": "044", "bank_code": "058"})
        result = self._to_dict(row)
        assert result["destination_bank_code"] == "044"

    def test_destination_bank_code_none_when_absent(self):
        row = _FakeRow(meta=None)
        result = self._to_dict(row)
        assert result["destination_bank_code"] is None


# ---------------------------------------------------------------------------
# 4. SafeHaven retry backoff
# ---------------------------------------------------------------------------

@pytest.fixture
def safehaven_env():
    env = {
        "SAFEHAVEN_BASE_URL": "https://sandbox.safehaven/api",
        "SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER": "1234567890",
        "SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE": "058",
        "SAFEHAVEN_CALLBACK_URL": "https://example.com/cb",
        "SAFEHAVEN_CLIENT_ID": "client-x",
    }
    with patch.dict("os.environ", env, clear=False):
        yield


class TestSafeHavenBackoff:
    def test_backoff_sleeps_between_attempts(self, safehaven_env):
        from modules.wallet.providers import safehaven_provider as sh_module
        from modules.wallet.providers.base_payment_provider import VirtualAccountRequest

        with patch.object(sh_module, "SafeHavenAuthService") as auth_cls:
            auth_cls.return_value.get_valid_token.return_value = "tok"
            provider = sh_module.SafeHavenProvider()

            first = MagicMock()
            first.status_code = 400
            first.json.return_value = {"success": False, "message": "try again"}
            first.text = "{}"
            first.headers = {}

            second = MagicMock()
            second.status_code = 200
            second.json.return_value = {
                "success": True,
                "data": {
                    "accountNumber": "9000000001",
                    "accountName": "Test Acct",
                    "client": "cl-1",
                    "externalReference": "ext-1",
                },
            }
            second.text = ""
            second.headers = {}

            request = VirtualAccountRequest(
                user_id=1,
                wallet_id=2,
                first_name="A",
                last_name="B",
                phone_number="08000000000",
                bvn="00000000000",
                date_of_birth="1990/01/01",
                metadata={"amount": "1000"},
            )

            sleep_calls = []
            with patch.object(sh_module.requests, "post", side_effect=[first, second]), \
                 patch.object(sh_module.time, "sleep", side_effect=lambda s: sleep_calls.append(s)):
                response = provider.ensure_virtual_account(request)

            assert response.account_number == "9000000001"
            assert len(sleep_calls) == 1, f"expected 1 sleep, got {sleep_calls}"
            slept = sleep_calls[0]
            # base 0.25s ± 0.05s jitter
            assert 0.20 <= slept <= 0.30, f"backoff out of expected range: {slept}"

    def test_no_sleep_before_first_attempt(self, safehaven_env):
        from modules.wallet.providers import safehaven_provider as sh_module
        from modules.wallet.providers.base_payment_provider import VirtualAccountRequest

        with patch.object(sh_module, "SafeHavenAuthService") as auth_cls:
            auth_cls.return_value.get_valid_token.return_value = "tok"
            provider = sh_module.SafeHavenProvider()

            ok = MagicMock()
            ok.status_code = 200
            ok.json.return_value = {
                "success": True,
                "data": {
                    "accountNumber": "9000000002",
                    "accountName": "Test",
                    "client": "cl",
                    "externalReference": "ext",
                },
            }
            ok.text = ""
            ok.headers = {}

            request = VirtualAccountRequest(
                user_id=1,
                wallet_id=2,
                first_name="A",
                last_name="B",
                phone_number="08000000000",
                bvn="00000000000",
                date_of_birth="1990/01/01",
                metadata={"amount": "1000"},
            )

            sleep_calls = []
            with patch.object(sh_module.requests, "post", return_value=ok), \
                 patch.object(sh_module.time, "sleep", side_effect=lambda s: sleep_calls.append(s)):
                response = provider.ensure_virtual_account(request)

            assert response.account_number == "9000000002"
            assert sleep_calls == []
