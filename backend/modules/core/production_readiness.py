"""Production readiness validation for runtime configuration.

This module deliberately performs only deterministic checks: required secrets,
required provider credentials, HTTPS callback URLs, and local/test credential
guards. It does not call paid provider APIs at startup.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, Mapping


DEV_SECRET_VALUES = {
    "",
    "dev-secret-key-change-me",
    "jwt-secret-dev",
    "change-me",
    "changeme",
    "secret",
}


class RuntimeConfigError(RuntimeError):
    """Raised when a production/staging config is not deployable."""


def _value(name: str, environ: Mapping[str, str] | None = None) -> str:
    env = environ or os.environ
    return str(env.get(name) or "").strip()


def _bool(name: str, default: bool = False, environ: Mapping[str, str] | None = None) -> bool:
    raw = _value(name, environ)
    if raw == "":
        return default
    return raw.lower() in {"1", "true", "yes", "on"}


def _missing(name: str, issues: list[str], environ: Mapping[str, str] | None = None) -> None:
    if not _value(name, environ):
        issues.append(f"{name} is required")


def _missing_any(
    names: Iterable[str],
    issues: list[str],
    message: str,
    environ: Mapping[str, str] | None = None,
) -> None:
    if not any(_value(name, environ) for name in names):
        issues.append(message)


def _require_https_url(
    name: str,
    issues: list[str],
    *,
    allow_localhost: bool = False,
    environ: Mapping[str, str] | None = None,
) -> None:
    raw = _value(name, environ)
    if not raw:
        issues.append(f"{name} is required")
        return
    lower = raw.lower()
    if not lower.startswith("https://"):
        issues.append(f"{name} must be an https:// URL")
    if not allow_localhost and ("localhost" in lower or "127.0.0.1" in lower):
        issues.append(f"{name} must not point to localhost")


def _reject_dev_secret(
    name: str,
    issues: list[str],
    *,
    min_length: int = 32,
    environ: Mapping[str, str] | None = None,
) -> None:
    raw = _value(name, environ)
    if not raw:
        issues.append(f"{name} is required")
        return
    if raw.lower() in DEV_SECRET_VALUES:
        issues.append(f"{name} is still using a development fallback")
    if len(raw) < min_length:
        issues.append(f"{name} must be at least {min_length} characters")


def _reject_test_key(name: str, prefixes: tuple[str, ...], issues: list[str], environ=None) -> None:
    raw = _value(name, environ)
    if raw and raw.lower().startswith(prefixes):
        issues.append(f"{name} is a test/sandbox key")


def collect_runtime_config_issues(config, environ: Mapping[str, str] | None = None) -> list[str]:
    """Return deploy-blocking runtime configuration issues."""
    env = environ or os.environ
    issues: list[str] = []
    production = bool(getattr(config, "PRODUCTION", False))

    _reject_dev_secret("SECRET_KEY", issues, environ=env)
    _reject_dev_secret("JWT_SECRET_KEY", issues, environ=env)

    for name in ("DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME", "REDIS_URL"):
        _missing(name, issues, env)

    if not _value("ALLOWED_ORIGINS", env) and not _value("FRONTEND_URL", env):
        issues.append("ALLOWED_ORIGINS or FRONTEND_URL is required")
    if _value("ALLOWED_ORIGINS", env).strip() == "*":
        issues.append("ALLOWED_ORIGINS must not be '*'")

    # Personal wallets default to Bell MFB; community wallets default to SafeHaven.
    personal_provider = _value("PERSONAL_PAYMENT_PROVIDER", env) or "bell_mfb"
    community_provider = _value("COMMUNITY_PAYMENT_PROVIDER", env) or "safehaven"
    providers = {personal_provider.lower(), community_provider.lower()}

    if "bell_mfb" in providers:
        for name in ("BELL_MFB_CLIENT_ID", "BELL_MFB_CLIENT_SECRET", "BELL_MFB_BASE_URL"):
            _missing(name, issues, env)
        if production and any(
            token in _value("BELL_MFB_BASE_URL", env).lower()
            for token in ("localhost", "sandbox", "staging", "test")
        ):
            issues.append("BELL_MFB_BASE_URL must point to the live production host")

    if "safehaven" in providers:
        for name in (
            "SAFEHAVEN_BASE_URL",
            "SAFEHAVEN_OAUTH_APP_CLIENT_ID",
            "SAFEHAVEN_CLIENT_ID",
            "SAFEHAVEN_USER_ID",
            "SAFEHAVEN_PRIVATE_KEY_PEM",
            "SAFEHAVEN_SETTLEMENT_ACCOUNT_NUMBER",
            "SAFEHAVEN_SETTLEMENT_ACCOUNT_BANK_CODE",
            "SAFEHAVEN_WEBHOOK_SECRET",
        ):
            _missing(name, issues, env)
        _missing_any(
            ("SAFEHAVEN_COMPANY_URL", "SAFEHAVEN_OAUTH_ISSUER"),
            issues,
            "SAFEHAVEN_COMPANY_URL or SAFEHAVEN_OAUTH_ISSUER is required",
            env,
        )
        _require_https_url("SAFEHAVEN_CALLBACK_URL", issues, environ=env)
        if production and any(
            token in _value("SAFEHAVEN_BASE_URL", env).lower()
            for token in ("localhost", "sandbox", "staging", "test")
        ):
            issues.append("SAFEHAVEN_BASE_URL must point to the live production host")

    if _bool("USE_MOCK_PROVIDER", False, env):
        issues.append("USE_MOCK_PROVIDER must be false")
    if not (_value("IDCHECK_PUBLIC_KEY", env) or _value("PAYSTACK_SECRET_KEY", env)):
        issues.append("IDCHECK_PUBLIC_KEY or PAYSTACK_SECRET_KEY is required")
    _reject_test_key("IDCHECK_PUBLIC_KEY", ("pk_test_", "test_"), issues, env)
    _reject_test_key("PAYSTACK_SECRET_KEY", ("sk_test_", "test_"), issues, env)

    if not _bool("SMS_ENABLED", False, env):
        issues.append("SMS_ENABLED must be true")
    for name in ("TERMII_API_KEY", "TERMII_SENDER_ID"):
        _missing(name, issues, env)

    if not _bool("ENABLE_PUSH_NOTIFICATIONS", False, env):
        issues.append("ENABLE_PUSH_NOTIFICATIONS must be true")
    if not _bool("FCM_ENABLED", True, env):
        issues.append("FCM_ENABLED must be true")
    _missing("FIREBASE_CREDENTIALS", issues, env)
    firebase_path = _value("FIREBASE_CREDENTIALS", env)
    if firebase_path and not Path(firebase_path).exists():
        issues.append("FIREBASE_CREDENTIALS must point to a mounted credentials file")

    if (_value("COMMUNITY_MEDIA_PROVIDER", env) or "cloudinary").lower() == "cloudinary":
        for name in ("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"):
            _missing(name, issues, env)

    return issues


def assert_runtime_config_ready(config, environ: Mapping[str, str] | None = None) -> None:
    issues = collect_runtime_config_issues(config, environ=environ)
    if issues:
        formatted = "\n - ".join(issues)
        raise RuntimeConfigError(f"Runtime configuration is not production-ready:\n - {formatted}")
