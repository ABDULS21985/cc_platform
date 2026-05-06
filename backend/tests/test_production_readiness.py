"""Tests for production readiness configuration validation."""
from types import SimpleNamespace

from modules.core.production_readiness import collect_runtime_config_issues


def _valid_env(firebase_path: str) -> dict:
    return {
        "SECRET_KEY": "s" * 40,
        "JWT_SECRET_KEY": "j" * 40,
        "DB_HOST": "db.example.com",
        "DB_USER": "ccpay",
        "DB_PASSWORD": "secret",
        "DB_NAME": "ccpay",
        "REDIS_URL": "rediss://redis.example.com:6379/0",
        "ALLOWED_ORIGINS": "https://app.ccpay.ng",
        "PERSONAL_PAYMENT_PROVIDER": "bell_mfb",
        "COMMUNITY_PAYMENT_PROVIDER": "safehaven",
        "BELL_MFB_CLIENT_ID": "bell-client",
        "BELL_MFB_CLIENT_SECRET": "bell-secret",
        "BELL_MFB_BASE_URL": "https://api.bellmfb.example",
        "SAFEHAVEN_BASE_URL": "https://api.safehavenmfb.com",
        "SAFEHAVEN_OAUTH_APP_CLIENT_ID": "oauth-client",
        "SAFEHAVEN_CLIENT_ID": "client",
        "SAFEHAVEN_USER_ID": "user",
        "SAFEHAVEN_PRIVATE_KEY_PEM": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----",
        "SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER": "0123456789",
        "SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE": "090286",
        "SAFEHAVEN_WEBHOOK_SECRET": "safe-webhook",
        "SAFEHAVEN_OAUTH_ISSUER": "safe-issuer",
        "SAFEHAVEN_CALLBACK_URL": "https://api.ccpay.ng/api/v2/wallet/webhook",
        "PAYSTACK_SECRET_KEY": "sk_live_x",
        "SMS_ENABLED": "true",
        "TERMII_API_KEY": "termii",
        "TERMII_SENDER_ID": "CCPay",
        "ENABLE_PUSH_NOTIFICATIONS": "true",
        "FCM_ENABLED": "true",
        "FIREBASE_CREDENTIALS": firebase_path,
        "CLOUDINARY_CLOUD_NAME": "cloud",
        "CLOUDINARY_API_KEY": "key",
        "CLOUDINARY_API_SECRET": "secret",
    }


def test_valid_runtime_config_has_no_issues(tmp_path):
    firebase = tmp_path / "firebase.json"
    firebase.write_text("{}", encoding="utf-8")
    issues = collect_runtime_config_issues(
        SimpleNamespace(PRODUCTION=True),
        environ=_valid_env(str(firebase)),
    )
    assert issues == []


def test_dev_secrets_and_missing_redis_are_blockers(tmp_path):
    firebase = tmp_path / "firebase.json"
    firebase.write_text("{}", encoding="utf-8")
    env = _valid_env(str(firebase))
    env["SECRET_KEY"] = "dev-secret-key-change-me"
    env.pop("REDIS_URL")

    issues = collect_runtime_config_issues(SimpleNamespace(PRODUCTION=True), environ=env)

    assert "SECRET_KEY is still using a development fallback" in issues
    assert "REDIS_URL is required" in issues
