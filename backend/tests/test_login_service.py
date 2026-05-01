"""Unit tests for LoginService portal-routing metadata."""

import pytest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from modules.auth_v2.services.login_service import LoginService


@pytest.fixture
def login_service_with_mocks():
    """Create LoginService with mocked dependencies."""
    with patch("modules.auth_v2.services.login_service.UserRepository") as repo_cls, \
         patch("modules.auth_v2.services.login_service.PasswordService") as password_cls, \
         patch("modules.auth_v2.services.login_service.OTPService"), \
         patch("modules.auth_v2.services.login_service.EmailService"), \
         patch("modules.auth_v2.services.login_service.TokenService") as token_cls, \
         patch("modules.auth_v2.services.login_service.login_user"):
        repo = Mock()
        password = Mock()
        token = Mock()

        repo_cls.return_value = repo
        password_cls.return_value = password
        token_cls.return_value = token

        service = LoginService()

        token.generate_tokens.return_value = {
            "access_token": "access-token",
            "refresh_token": "refresh-token",
            "token_type": "Bearer",
            "expires_in": 3600,
        }

        yield service, repo, password, token


def _build_user(role: str = "user"):
    """Create a user-like object for login service tests."""
    return SimpleNamespace(
        id=1,
        email="test@example.com",
        firstname="Test",
        lastname="User",
        full_name="Test User",
        role=role,
        is_active=True,
        email_verified=True,
        bvn_verified=False,
        nin_verified=False,
        verification_status="unverified",
        password_hash="hashed-password",
    )


def test_login_super_admin_includes_admin_portal_access(login_service_with_mocks):
    """Super admin login should advertise admin portal access in response."""
    service, repo, password, _ = login_service_with_mocks
    repo.find_by_email.return_value = _build_user(role="super_admin")
    password.verify_password.return_value = True

    response, status_code = service.login("test@example.com", "StrongPass1!")

    assert status_code == 200
    assert response["portal_access"]["platform_admin"] is True
    assert response["portal_access"]["platform_role"] == "super_admin"
    assert response["portal_access"]["recommended_portal"] == "admin"


def test_login_regular_user_includes_app_portal_access(login_service_with_mocks):
    """Regular user login should advertise app portal access in response."""
    service, repo, password, _ = login_service_with_mocks
    repo.find_by_email.return_value = _build_user(role="user")
    password.verify_password.return_value = True

    response, status_code = service.login("test@example.com", "StrongPass1!")

    assert status_code == 200
    assert response["portal_access"]["platform_admin"] is False
    assert response["portal_access"]["platform_role"] is None
    assert response["portal_access"]["recommended_portal"] == "app"
