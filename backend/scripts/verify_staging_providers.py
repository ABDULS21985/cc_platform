#!/usr/bin/env python3
"""Smoke-check staging provider configuration.

Default mode performs non-billing checks only: required config, Redis ping,
SafeHaven JWT signing, Firebase credential loading, and client initialization.
Use --live to make outbound provider auth/health calls. SMS delivery is only
attempted when --send-sms-to is supplied.
"""
from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import Config  # noqa: E402
from modules.core.production_readiness import collect_runtime_config_issues  # noqa: E402


@dataclass
class Probe:
    name: str
    ok: bool
    detail: str


def _probe(name: str, fn) -> Probe:
    try:
        detail = fn() or "ok"
        return Probe(name, True, str(detail))
    except Exception as exc:
        return Probe(name, False, f"{type(exc).__name__}: {exc}")


def _redis_ping() -> str:
    import redis

    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL is not set")
    client = redis.StrictRedis.from_url(redis_url, socket_connect_timeout=5)
    client.ping()
    return "connected"


def _bell(live: bool) -> str:
    from modules.wallet.services.bell_mfb_service import BellMFBService

    service = BellMFBService()
    if live:
        service.generate_token()
        return "token generated"
    return "client initialized"


def _safehaven(live: bool) -> str:
    from modules.wallet.token_management.services.safehaven_auth_service import SafeHavenAuthService

    service = SafeHavenAuthService()
    assertion = service._create_client_assertion()
    if live:
        service._exchange_client_assertion(assertion)
        return "oauth token exchange succeeded"
    return "client assertion signed"


def _identity(live: bool) -> str:
    paystack_key = os.getenv("PAYSTACK_SECRET_KEY")
    idcheck_key = os.getenv("IDCHECK_PUBLIC_KEY")

    if paystack_key:
        if live:
            response = requests.get(
                "https://api.paystack.co/bank",
                headers={"Authorization": f"Bearer {paystack_key}"},
                params={"country": "nigeria", "perPage": 1},
                timeout=20,
            )
            response.raise_for_status()
            return "Paystack key accepted"
        return "Paystack key configured"

    if idcheck_key:
        mode = "test" if idcheck_key.lower().startswith(("pk_test_", "test_")) else "live"
        return f"IDCheck key configured ({mode}); BVN/NIN verification requires approved sample IDs"

    raise RuntimeError("Set IDCHECK_PUBLIC_KEY or PAYSTACK_SECRET_KEY")


def _termii(live: bool, send_sms_to: str | None) -> str:
    from modules.notifications.providers.termii_client import TermiiClient

    client = TermiiClient()
    if not client.enabled:
        raise RuntimeError("Termii is sandboxed; set SMS_ENABLED=true and TERMII_API_KEY")
    if live and send_sms_to:
        client.send_transactional(send_sms_to, "CCPay staging SMS smoke test.")
        return f"test SMS sent to {send_sms_to}"
    return "client enabled"


def _firebase() -> str:
    import firebase_admin
    from firebase_admin import credentials

    path = os.getenv("FIREBASE_CREDENTIALS") or Config.FIREBASE_CREDENTIALS
    if not path or not Path(path).exists():
        raise RuntimeError("FIREBASE_CREDENTIALS must point to a mounted file")
    if not firebase_admin._apps:
        firebase_admin.initialize_app(credentials.Certificate(path), name="ccpay-smoke")
    return "credentials loaded"


def _cloudinary(live: bool) -> str:
    import cloudinary
    import cloudinary.api

    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
    api_key = os.getenv("CLOUDINARY_API_KEY")
    api_secret = os.getenv("CLOUDINARY_API_SECRET")
    if not all([cloud_name, api_key, api_secret]):
        raise RuntimeError("Cloudinary credentials are incomplete")
    cloudinary.config(cloud_name=cloud_name, api_key=api_key, api_secret=api_secret)
    if live:
        cloudinary.api.ping()
        return "API ping succeeded"
    return "client configured"


def _callbacks() -> str:
    callback = os.getenv("SAFEHAVEN_CALLBACK_URL") or os.getenv("SAFEHEAVEN_CALLBACK_URL")
    if not callback or not callback.lower().startswith("https://"):
        raise RuntimeError("SAFEHAVEN_CALLBACK_URL must be an https:// URL")
    if "localhost" in callback.lower() or "127.0.0.1" in callback:
        raise RuntimeError("SAFEHAVEN_CALLBACK_URL must not point to localhost")
    if not os.getenv("SAFEHAVEN_WEBHOOK_SECRET"):
        raise RuntimeError("SAFEHAVEN_WEBHOOK_SECRET is required")
    return callback


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="make outbound provider calls")
    parser.add_argument("--send-sms-to", help="E.164 phone number for an actual SMS smoke test")
    args = parser.parse_args()

    static_issues = collect_runtime_config_issues(Config)
    probes = [
        Probe("static production-readiness config", not static_issues, "; ".join(static_issues) or "ok"),
        _probe("redis", _redis_ping),
        _probe("bell_mfb", lambda: _bell(args.live)),
        _probe("safehaven", lambda: _safehaven(args.live)),
        _probe("identity_provider", lambda: _identity(args.live)),
        _probe("termii_sms", lambda: _termii(args.live, args.send_sms_to)),
        _probe("firebase", _firebase),
        _probe("cloudinary", lambda: _cloudinary(args.live)),
        _probe("webhook_callback", _callbacks),
    ]

    for probe in probes:
        status = "PASS" if probe.ok else "FAIL"
        print(f"[{status}] {probe.name}: {probe.detail}")

    return 0 if all(probe.ok for probe in probes) else 1


if __name__ == "__main__":
    raise SystemExit(main())
