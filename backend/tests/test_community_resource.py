"""
Unit tests for community resource endpoints.

These tests exercise non-authenticated resource handlers directly and mock
service dependencies to validate response contract and status codes.
"""

from unittest.mock import Mock

import pytest
from flask import Flask

from modules.community.resources import community_resource as resource_module
from modules.auth_v2.utils import decorators as auth_decorators


@pytest.fixture(scope="module")
def app():
    """Minimal Flask app for exercising Smorest-decorated resources."""
    return Flask(__name__)


def test_list_communities_success(monkeypatch, app):
    """GET list returns paginated community payload with success response."""
    community = Mock()
    community.to_dict.return_value = {"id": 10, "name": "Community A"}

    monkeypatch.setattr(resource_module, "resolve_optional_user_id", lambda: 42)
    monkeypatch.setattr(
        resource_module.community_service,
        "search_communities",
        lambda args, limit, offset: ([community], 1),
    )

    with app.test_request_context("/api/v2/community?limit=20&offset=0"):
        response = resource_module.CommunityListResource().get()
        payload = response.get_json()
        status = response.status_code

    assert status == 200
    assert payload["success"] is True
    assert payload["data"]["pagination"]["total"] == 1
    assert payload["data"]["communities"][0]["id"] == 10


def test_list_communities_internal_error(monkeypatch, app):
    """GET list returns standardized 500 response on unexpected errors."""

    def _raise_error(args, limit, offset):
        raise RuntimeError("boom")

    monkeypatch.setattr(resource_module, "resolve_optional_user_id", lambda: None)
    monkeypatch.setattr(resource_module.community_service, "search_communities", _raise_error)

    with app.test_request_context("/api/v2/community?limit=20&offset=0"):
        response = resource_module.CommunityListResource().get()
        payload = response.get_json()
        status = response.status_code

    assert status == 500
    assert payload["success"] is False
    assert payload["message"] == "An error occurred while searching communities"


def test_get_community_not_found(monkeypatch, app):
    """GET by ID returns not_found when service cannot locate community."""
    monkeypatch.setattr(resource_module, "resolve_optional_user_id", lambda: None)
    monkeypatch.setattr(resource_module.community_service, "get_community", lambda community_id: (None, "missing"))

    with app.test_request_context("/api/v2/community/999"):
        response = resource_module.CommunityResource().get(999)
        payload = response.get_json()
        status = response.status_code

    assert status == 404
    assert payload["success"] is False
    assert payload["message"] == "Community not found"


def test_get_community_success(monkeypatch, app):
    """GET by ID returns community details and success response."""
    community = Mock()
    community.to_dict.return_value = {"id": 7, "name": "Alpha"}

    monkeypatch.setattr(resource_module, "resolve_optional_user_id", lambda: 99)
    monkeypatch.setattr(resource_module.community_service, "get_community", lambda community_id: (community, None))

    with app.test_request_context("/api/v2/community/7"):
        response = resource_module.CommunityResource().get(7)
        payload = response.get_json()
        status = response.status_code

    assert status == 200
    assert payload["success"] is True
    assert payload["data"]["id"] == 7


def test_community_stats_not_found(monkeypatch, app):
    """Stats endpoint returns not_found when service has no stats."""
    monkeypatch.setattr(resource_module.community_service, "get_community_stats", lambda community_id: {})

    with app.test_request_context("/api/v2/community/100/stats"):
        response = resource_module.CommunityStatsResource().get(100)
        payload = response.get_json()
        status = response.status_code

    assert status == 404
    assert payload["error"] == "not_found"


def test_community_stats_success(monkeypatch, app):
    """Stats endpoint returns standardized success response."""
    monkeypatch.setattr(
        resource_module.community_service,
        "get_community_stats",
        lambda community_id: {"member_count": 3},
    )

    with app.test_request_context("/api/v2/community/10/stats"):
        response = resource_module.CommunityStatsResource().get(10)
        payload = response.get_json()
        status = response.status_code

    assert status == 200
    assert payload["success"] is True
    assert payload["data"]["member_count"] == 3


def test_user_communities_authenticated_success(monkeypatch, app):
    """Authenticated /me endpoint returns user communities payload."""
    user = Mock(id=11)
    community = Mock()
    community.to_dict.return_value = {"id": 3, "name": "Owned"}

    monkeypatch.setattr(auth_decorators, "current_user", Mock(is_authenticated=False))
    monkeypatch.setattr(auth_decorators.TokenService, "validate_token", lambda self, token: (user, None))
    monkeypatch.setattr(
        resource_module.community_service,
        "get_user_communities",
        lambda user_id, limit, offset: ([community], 1),
    )

    with app.test_request_context(
        "/api/v2/community/me?limit=20&offset=0",
        headers={"Authorization": "Bearer valid-token"},
    ):
        response = resource_module.UserCommunitiesResource().get()
        payload = response.get_json()
        status = response.status_code

    assert status == 200
    assert payload["success"] is True
    assert payload["data"]["pagination"]["total"] == 1
    assert payload["data"]["communities"][0]["id"] == 3


def test_user_owned_communities_authenticated_success(monkeypatch, app):
    """Authenticated /me/owned endpoint returns owner-scoped communities payload."""
    user = Mock(id=99)
    community = Mock()
    community.to_dict.return_value = {"id": 5, "name": "Owner Community"}

    monkeypatch.setattr(auth_decorators, "current_user", Mock(is_authenticated=False))
    monkeypatch.setattr(auth_decorators.TokenService, "validate_token", lambda self, token: (user, None))
    monkeypatch.setattr(
        resource_module.community_service,
        "get_user_owned_communities",
        lambda user_id, limit, offset: ([community], 1),
    )

    with app.test_request_context(
        "/api/v2/community/me/owned?limit=20&offset=0",
        headers={"Authorization": "Bearer valid-token"},
    ):
        response = resource_module.UserOwnedCommunitiesResource().get()
        payload = response.get_json()
        status = response.status_code

    assert status == 200
    assert payload["success"] is True
    assert payload["data"]["communities"][0]["id"] == 5


def test_create_community_authenticated_success(monkeypatch, app):
    """Authenticated create endpoint returns created community payload."""
    user = Mock(id=7)
    created = Mock()
    created.to_dict.return_value = {"id": 21, "name": "New Community"}

    monkeypatch.setattr(auth_decorators, "current_user", Mock(is_authenticated=False))
    monkeypatch.setattr(auth_decorators.TokenService, "validate_token", lambda self, token: (user, None))
    monkeypatch.setattr(
        resource_module.community_service,
        "create_community",
        lambda creator_id, data: (created, None),
    )

    with app.test_request_context(
        "/api/v2/community",
        method="POST",
        json={"name": "New Community", "member_cost": "0.00"},
        headers={"Authorization": "Bearer valid-token"},
    ):
        response = resource_module.CommunityListResource().post()
        payload = response.get_json()
        status = response.status_code

    assert status == 201
    assert payload["success"] is True
    assert payload["data"]["id"] == 21


def test_update_community_forbidden(monkeypatch, app):
    """Authenticated update endpoint returns forbidden when role check fails."""
    user = Mock(id=7)
    community = Mock()

    monkeypatch.setattr(auth_decorators, "current_user", Mock(is_authenticated=False))
    monkeypatch.setattr(auth_decorators.TokenService, "validate_token", lambda self, token: (user, None))
    monkeypatch.setattr(resource_module.community_service, "get_community", lambda community_id: (community, None))
    monkeypatch.setattr(resource_module.membership_service, "is_admin_or_owner", lambda community_id, user_id: False)

    with app.test_request_context(
        "/api/v2/community/1",
        method="PUT",
        json={"name": "Updated"},
        headers={"Authorization": "Bearer valid-token"},
    ):
        response = resource_module.CommunityResource().put(1)
        payload = response.get_json()
        status = response.status_code

    assert status == 403
    assert payload["success"] is False
    assert payload["message"] == "Not authorized to update community"


def test_delete_community_forbidden(monkeypatch, app):
    """Authenticated delete endpoint returns forbidden when user is not owner."""
    user = Mock(id=7)

    monkeypatch.setattr(auth_decorators, "current_user", Mock(is_authenticated=False))
    monkeypatch.setattr(auth_decorators.TokenService, "validate_token", lambda self, token: (user, None))
    monkeypatch.setattr(resource_module.membership_service, "is_owner", lambda community_id, user_id: False)

    with app.test_request_context(
        "/api/v2/community/1",
        method="DELETE",
        headers={"Authorization": "Bearer valid-token"},
    ):
        response = resource_module.CommunityResource().delete(1)
        payload = response.get_json()
        status = response.status_code

    assert status == 403
    assert payload["success"] is False
    assert payload["error"] == "forbidden"
