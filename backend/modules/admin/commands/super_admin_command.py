"""CLI command to bootstrap a platform super admin account."""

import os
import random
from datetime import datetime
from decimal import Decimal
from typing import Dict

import click

from modules.admin.models.audit_log import AdminAuditLog
from modules.auth_v2.extensions import db
from modules.auth_v2.models.user import User
from modules.auth_v2.services.password_service import PasswordService
from modules.wallet.models.wallet import Wallet
from modules.wallet.models.wallet_transaction import WalletTransaction


def _is_bootstrap_enabled() -> bool:
    """Read env gate for super-admin bootstrap command."""
    return str(os.getenv("ALLOW_SUPER_ADMIN_BOOTSTRAP", "false")).lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _is_dummy_seed_enabled() -> bool:
    """Read env gate for dummy-data seed command."""
    if str(os.getenv("ENV", "")).lower() == "production":
        return False
    return str(os.getenv("ALLOW_DUMMY_DATA_SEED", "false")).lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _seed_dummy_transactions(*, count: int = 50) -> Dict[str, str]:
    """
    Seed dummy WalletTransaction rows for local/dev environments.

    This is intended purely to populate the admin transactions ledger UI.
    """
    if not _is_dummy_seed_enabled():
        raise ValueError(
            "Dummy data seed is disabled. Set ALLOW_DUMMY_DATA_SEED=true (and ENV != production) to proceed."
        )

    wallets = Wallet.query.all()
    if not wallets:
        raise ValueError("No wallets found. Create some users/wallets first.")

    created = 0
    for _ in range(int(count)):
        wallet = random.choice(wallets)

        # DB constraint allows: deposit/withdrawal/transfer/payment
        txn_type = random.choice(["deposit", "withdrawal", "transfer", "payment"])
        amount = Decimal(str(random.randint(500, 50_000)))
        fee = Decimal("0.00")
        stamp_duty = Decimal("0.00")
        net_amount = amount - fee - stamp_duty
        # signed_amount is a convenience field; keep negative for outflows
        signed_amount = WalletTransaction.compute_signed_amount(
            net_amount,
            "debit" if txn_type in {"withdrawal", "transfer", "payment"} else "credit",
        )

        # Ensure we don't take wallet negative on outflow seeds.
        if txn_type in {"withdrawal", "transfer", "payment"}:
            wallet_balance = Decimal(str(wallet.balance or 0))
            if wallet_balance <= Decimal("0.00"):
                txn_type = "deposit"
                signed_amount = WalletTransaction.compute_signed_amount(net_amount, "credit")
            elif wallet_balance < net_amount:
                net_amount = wallet_balance
                amount = net_amount
                signed_amount = WalletTransaction.compute_signed_amount(net_amount, "debit")

        reference = WalletTransaction.generate_reference(prefix="DUM")
        # DB constraint allows: pending/completed/failed/reversed
        status = random.choices(["completed", "pending", "failed"], weights=[80, 10, 10], k=1)[0]
        now = datetime.utcnow()

        t = WalletTransaction(
            wallet_id=wallet.id,
            reference=reference,
            type=txn_type,
            amount=amount,
            fee=fee,
            stamp_duty=stamp_duty,
            net_amount=net_amount,
            signed_amount=signed_amount,
            description="Dummy seeded transaction",
            status=status,
            completed_at=now if status == "completed" else None,
            meta={"is_dummy": True, "seeded_by": "flask-cli:seed-dummy-transactions"},
        )

        # Balance snapshots + wallet balance mutation for successful seeds only
        wallet_balance_before = Decimal(str(wallet.balance or 0))
        t.set_balance_snapshot(wallet_balance_before)
        if status == "completed":
            wallet.balance = Decimal(str(t.balance_after or wallet_balance_before))

        db.session.add(t)
        created += 1

    db.session.add(
        AdminAuditLog(
            actor_user_id=None,
            action="system.seed.dummy_transactions",
            target_type="wallet_transactions",
            target_id=None,
            metadata={"count": created},
            ip_address=None,
            user_agent="flask-cli:seed-dummy-transactions",
        )
    )
    db.session.commit()

    return {"created": str(created)}


def bootstrap_super_admin(
    *,
    email: str,
    password: str,
    firstname: str,
    lastname: str,
    force: bool = False,
) -> Dict[str, str]:
    """Create or promote a user to super_admin with safety checks."""
    if not _is_bootstrap_enabled():
        raise ValueError(
            "Super-admin bootstrap is disabled. Set ALLOW_SUPER_ADMIN_BOOTSTRAP=true to proceed."
        )

    normalized_email = email.lower().strip()
    existing_super_admin_count = User.query.filter_by(role="super_admin").count()
    if existing_super_admin_count > 0 and not force:
        raise ValueError(
            "A super admin already exists. Re-run with --force to create/promote intentionally."
        )

    password_service = PasswordService()
    password_hash = password_service.hash_password(password)

    existing_user = User.query.filter(User.email == normalized_email).first()

    if existing_user:
        existing_user.firstname = firstname
        existing_user.lastname = lastname
        existing_user.password_hash = password_hash
        existing_user.role = "super_admin"
        existing_user.is_active = True
        existing_user.email_verified = True
        target_user = existing_user
        action = "promoted"
    else:
        target_user = User(
            email=normalized_email,
            firstname=firstname,
            lastname=lastname,
            password_hash=password_hash,
            role="super_admin",
            is_active=True,
            email_verified=True,
        )
        db.session.add(target_user)
        action = "created"

    db.session.flush()

    db.session.add(
        AdminAuditLog(
            actor_user_id=None,
            action="system.bootstrap.super_admin",
            target_type="user",
            target_id=str(target_user.id),
            metadata={"email": normalized_email, "mode": action, "force": force},
            ip_address=None,
            user_agent="flask-cli:create-super-admin",
        )
    )
    db.session.commit()

    return {
        "action": action,
        "user_id": str(target_user.id),
        "email": target_user.email,
    }


def register_admin_commands(app):
    """Register admin CLI commands on a Flask app instance."""

    @app.cli.command("create-super-admin")
    @click.option("--email", prompt=True, help="Admin email address")
    @click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True)
    @click.option("--firstname", prompt=True, help="First name")
    @click.option("--lastname", prompt=True, help="Last name")
    @click.option("--force", is_flag=True, default=False, help="Allow bootstrap even if super admin exists")
    def create_super_admin(email: str, password: str, firstname: str, lastname: str, force: bool):
        """Create or promote a user into super_admin role."""
        try:
            result = bootstrap_super_admin(
                email=email,
                password=password,
                firstname=firstname,
                lastname=lastname,
                force=force,
            )
            click.echo(
                f"Super admin {result['action']}: id={result['user_id']} email={result['email']}"
            )
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc
        except Exception as exc:
            db.session.rollback()
            raise click.ClickException(f"Failed to bootstrap super admin: {exc}") from exc

    @app.cli.command("seed-dummy-transactions")
    @click.option("--count", default=50, show_default=True, help="Number of dummy transactions to create")
    def seed_dummy_transactions(count: int):
        """Seed dummy wallet transactions (dev-only)."""
        try:
            result = _seed_dummy_transactions(count=int(count))
            click.echo(f"Dummy transactions created: {result['created']}")
        except ValueError as exc:
            raise click.ClickException(str(exc)) from exc
        except Exception as exc:
            db.session.rollback()
            raise click.ClickException(f"Failed to seed dummy transactions: {exc}") from exc
