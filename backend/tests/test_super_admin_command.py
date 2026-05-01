"""Unit tests for super-admin bootstrap command logic."""

from types import SimpleNamespace
from unittest.mock import Mock

import pytest

from modules.admin.commands.super_admin_command import bootstrap_super_admin


@pytest.fixture
def command_module(monkeypatch):
    """Patch command module dependencies for deterministic unit tests."""
    import modules.admin.commands.super_admin_command as command

    db_session = Mock()
    monkeypatch.setattr(command, "db", SimpleNamespace(session=db_session))
    monkeypatch.setattr(command, "AdminAuditLog", Mock(return_value=SimpleNamespace()))

    password_service = Mock()
    password_service.hash_password.return_value = "hashed"
    monkeypatch.setattr(command, "PasswordService", Mock(return_value=password_service))

    return command, db_session


def test_bootstrap_requires_env_gate(command_module, monkeypatch):
    """Bootstrap should fail unless env gate is enabled."""
    command, _ = command_module
    monkeypatch.setattr(command, "_is_bootstrap_enabled", lambda: False)

    with pytest.raises(ValueError, match="ALLOW_SUPER_ADMIN_BOOTSTRAP"):
        bootstrap_super_admin(
            email="admin@example.com",
            password="StrongPass1!",
            firstname="Admin",
            lastname="User",
            force=False,
        )


def test_bootstrap_blocks_when_super_admin_exists_without_force(command_module, monkeypatch):
    """Bootstrap should refuse to run when a super admin already exists and force is false."""
    command, _ = command_module
    monkeypatch.setattr(command, "_is_bootstrap_enabled", lambda: True)

    query = Mock()
    query.filter_by.return_value.count.return_value = 1

    user_model = Mock()
    user_model.query = query
    user_model.email = "email"
    monkeypatch.setattr(command, "User", user_model)

    with pytest.raises(ValueError, match="already exists"):
        bootstrap_super_admin(
            email="admin@example.com",
            password="StrongPass1!",
            firstname="Admin",
            lastname="User",
            force=False,
        )


def test_bootstrap_promotes_existing_user(command_module, monkeypatch):
    """Existing user should be promoted to super_admin and activated."""
    command, db_session = command_module
    monkeypatch.setattr(command, "_is_bootstrap_enabled", lambda: True)

    existing_user = SimpleNamespace(
        id=42,
        email="admin@example.com",
        firstname="Old",
        lastname="Name",
        password_hash="old",
        role="user",
        is_active=False,
        email_verified=False,
    )

    query = Mock()
    query.filter_by.return_value.count.return_value = 0
    query.filter.return_value.first.return_value = existing_user

    user_model = Mock()
    user_model.query = query
    user_model.email = "email"
    monkeypatch.setattr(command, "User", user_model)

    result = bootstrap_super_admin(
        email="ADMIN@example.com",
        password="StrongPass1!",
        firstname="New",
        lastname="Admin",
        force=False,
    )

    assert result["action"] == "promoted"
    assert result["email"] == "admin@example.com"
    assert existing_user.firstname == "New"
    assert existing_user.lastname == "Admin"
    assert existing_user.role == "super_admin"
    assert existing_user.is_active is True
    assert existing_user.email_verified is True
    db_session.commit.assert_called_once()


def test_bootstrap_creates_new_super_admin(command_module, monkeypatch):
    """Bootstrap should create a new super_admin when no matching user exists."""
    command, db_session = command_module
    monkeypatch.setattr(command, "_is_bootstrap_enabled", lambda: True)

    query = Mock()
    query.filter_by.return_value.count.return_value = 0
    query.filter.return_value.first.return_value = None

    created_user = SimpleNamespace(id=99, email="new-admin@example.com")

    user_model = Mock(return_value=created_user)
    user_model.query = query
    user_model.email = "email"
    monkeypatch.setattr(command, "User", user_model)

    result = bootstrap_super_admin(
        email="new-admin@example.com",
        password="StrongPass1!",
        firstname="New",
        lastname="Admin",
        force=False,
    )

    assert result["action"] == "created"
    assert result["user_id"] == "99"
    assert result["email"] == "new-admin@example.com"
    assert db_session.add.call_count >= 2
    db_session.commit.assert_called_once()
