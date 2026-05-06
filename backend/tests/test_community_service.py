"""Unit tests for the four 'not-found-instead-of-empty-dict' service paths.

Validates that the four service methods we hardened return a
``(response, status)`` tuple from ``format_not_found`` (404) when the
underlying entity is missing, instead of the legacy ``{}`` placeholder
that callers couldn't distinguish from a real empty result.
"""

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def community_service_with_mocks(monkeypatch):
    from modules.community.services.community_service import CommunityService

    svc = CommunityService()
    svc.repo = MagicMock()
    svc.member_repo = MagicMock()
    svc.wallet_repo = MagicMock()
    return svc


def test_get_community_stats_returns_404_tuple_when_missing(community_service_with_mocks):
    svc = community_service_with_mocks
    svc.repo.find_by_id.return_value = None

    result = svc.get_community_stats(999)

    assert isinstance(result, tuple)
    body, status = result
    assert status == 404
    assert body['success'] is False
    assert body['error'] == 'not_found'
    assert 'Community' in body['message']


def test_get_community_stats_returns_dict_when_present(community_service_with_mocks):
    svc = community_service_with_mocks
    community = MagicMock(
        id=1,
        name='Test',
        visibility='public',
        status='active',
        created_at=None,
    )
    svc.repo.find_by_id.return_value = community
    svc.wallet_repo.find_by_community_id.return_value = MagicMock(balance=42.5)
    svc.member_repo.find_by_community.return_value = ([], 0)

    result = svc.get_community_stats(1)

    assert isinstance(result, dict)
    assert result['id'] == 1
    assert result['balance'] == 42.5


def test_wallet_summary_returns_404_tuple_when_missing(monkeypatch):
    from modules.community.services.wallet_service import CommunityWalletService

    svc = CommunityWalletService()
    svc.wallet_repo = MagicMock()
    svc.wallet_repo.find_by_community_id.return_value = None

    result = svc.get_wallet_summary(123)

    assert isinstance(result, tuple)
    body, status = result
    assert status == 404
    assert body['success'] is False
    assert body['error'] == 'not_found'
    assert 'Wallet' in body['message']


def test_bill_progress_returns_404_tuple_when_missing(monkeypatch):
    from modules.community.services.bill_service import BillService

    svc = BillService()
    svc.bill_repo = MagicMock()
    svc.bill_repo.find_by_id.return_value = None

    result = svc.get_bill_progress(42)

    assert isinstance(result, tuple)
    body, status = result
    assert status == 404
    assert body['success'] is False
    assert body['error'] == 'not_found'
    assert 'Bill' in body['message']


def test_payment_status_returns_404_tuple_when_missing(monkeypatch):
    from modules.community.services.payment_intent_service import PaymentIntentService

    svc = PaymentIntentService()
    svc.bill_repo = MagicMock()
    svc.bill_repo.find_by_id.return_value = None

    result = svc.get_payment_status(7)

    assert isinstance(result, tuple)
    body, status = result
    assert status == 404
    assert body['success'] is False
    assert body['error'] == 'not_found'
    assert 'Payment' in body['message']
