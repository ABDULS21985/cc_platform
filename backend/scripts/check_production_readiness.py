#!/usr/bin/env python3
"""Fail-fast runtime configuration checker for staging/prod deploys."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from config import Config  # noqa: E402
from modules.core.production_readiness import collect_runtime_config_issues  # noqa: E402


def main() -> int:
    issues = collect_runtime_config_issues(Config)
    if issues:
        print("Production readiness check failed:")
        for issue in issues:
            print(f" - {issue}")
        return 1

    print("Production readiness check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
