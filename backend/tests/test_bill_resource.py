"""Unit tests for bill resource response enrichment."""

from unittest.mock import Mock

import pytest
from flask import Flask

from modules.community.resources import bill_resource as resource_module


@pytest.fixture(scope="module")
def app():
    """Minimal Flask app for exercising bill resources."""
    return Flask(__name__)


def test_list_bills_includes_progress_and_counts(monkeypatch, app):
    """Bill list response includes progress and payer/expected member counts."""
    bill = Mock()

    monkeypatch.setattr(
        resource_module.bill_service,
        "get_community_bills",
        lambda community_id, args, limit, offset: ([bill], 1),
    )
    monkeypatch.setattr(
        resource_module.bill_service,
        "serialize_bill_data",
        lambda current_bill: {
            "id": 5,
            "title": "March dues",
            "paid_member_count": 3,
            "expected_member_count": 10,
            "progress_percentage": 30,
        },
    )

    with app.test_request_context("/api/v2/community/1/bills?limit=50&offset=0"):
        response = resource_module.BillListResource.get.__wrapped__.__wrapped__(
            resource_module.BillListResource(),
            {"limit": 50, "offset": 0, "status": None},
            1,
        )
        payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"]["bills"][0]["paid_member_count"] == 3
    assert payload["data"]["bills"][0]["expected_member_count"] == 10
    assert payload["data"]["bills"][0]["progress_percentage"] == 30


def test_get_bill_includes_progress_and_counts(monkeypatch, app):
    """Single bill response includes progress and payer/expected member counts."""
    bill = Mock(community_id=7)

    monkeypatch.setattr(resource_module.bill_service, "get_bill", lambda bill_id: (bill, None))
    monkeypatch.setattr(
        resource_module.bill_service,
        "serialize_bill_data",
        lambda current_bill: {
            "id": 9,
            "title": "April levy",
            "paid_member_count": 4,
            "expected_member_count": 8,
            "progress_percentage": 50,
        },
    )

    with app.test_request_context("/api/v2/community/7/bills/9"):
        response = resource_module.BillResource().get(7, 9)
        payload = response.get_json()

    assert response.status_code == 200
    assert payload["data"]["paid_member_count"] == 4
    assert payload["data"]["expected_member_count"] == 8
    assert payload["data"]["progress_percentage"] == 50