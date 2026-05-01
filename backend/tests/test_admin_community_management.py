"""Unit tests for super admin community member actions."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest


@pytest.fixture
def service_module(monkeypatch):
    import modules.admin.services.communities_service as svc_mod
    import modules.auth_v2.extensions as extensions

    # Patch db session commit used inside update_member
    db_session = Mock()
    monkeypatch.setattr(svc_mod, "AdminAuditService", Mock(return_value=Mock(log=Mock())))
    monkeypatch.setattr(extensions, "db", SimpleNamespace(session=db_session))
    return svc_mod, db_session


def test_update_member_blocks_owner_role_change(service_module, monkeypatch):
    svc_mod, _ = service_module

    owner_member = SimpleNamespace(role="owner", status="active")

    query = Mock()
    query.filter_by.return_value.first.return_value = owner_member

    community_member_model = Mock()
    community_member_model.query = query
    monkeypatch.setattr(svc_mod, "CommunityMember", community_member_model)

    service = svc_mod.AdminCommunitiesService()
    member, err = service.update_member(
        actor_user_id=1,
        community_id=10,
        user_id=99,
        updates={"role": "admin"},
    )

    assert member is None
    assert "owner role" in err.lower()


def test_update_member_applies_changes_and_audits(service_module, monkeypatch):
    svc_mod, db_session = service_module

    member_row = SimpleNamespace(role="member", status="active")

    query = Mock()
    query.filter_by.return_value.first.return_value = member_row

    community_member_model = Mock()
    community_member_model.query = query
    monkeypatch.setattr(svc_mod, "CommunityMember", community_member_model)

    service = svc_mod.AdminCommunitiesService()
    result, err = service.update_member(
        actor_user_id=7,
        community_id=5,
        user_id=42,
        updates={"role": "admin", "status": "suspended"},
    )

    assert err is None
    assert result["community_id"] == 5
    assert result["user_id"] == 42
    assert result["role"] == "admin"
    assert result["status"] == "suspended"
    db_session.commit.assert_called_once()
    service.audit.log.assert_called_once()

