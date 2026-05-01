"""Regression tests for auth profile resource behavior."""

from flask import Flask
from flask_smorest import Api

from modules.auth_v2.extensions import login_manager
from modules.auth_v2.resources.profile_resource import profile_blp


def create_test_app():
    """Create a minimal app that can serve the profile resource."""
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "test-secret"
    app.config["API_TITLE"] = "Test API"
    app.config["API_VERSION"] = "v1"
    app.config["OPENAPI_VERSION"] = "3.0.3"

    login_manager.init_app(app)

    api = Api(app)
    api.register_blueprint(profile_blp)
    return app


def test_profile_requires_auth_returns_json_401():
    """Unauthenticated profile requests should return API-style 401 JSON."""
    app = create_test_app()
    client = app.test_client()

    response = client.get("/api/v2/user/profile")

    assert response.status_code == 401
    payload = response.get_json()
    assert payload["success"] is False
    assert payload["error"] == "unauthorized"
    assert payload["message"] == "Authentication required"