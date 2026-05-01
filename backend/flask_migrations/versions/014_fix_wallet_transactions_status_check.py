"""Fix wallet_transactions status check constraint

Revision ID: 014_fix_wallet_tx_status_check
Revises: 013_expand_users_role_constraint
Create Date: 2026-04-28 08:56:00.000000

Some databases have a legacy `wallet_transactions_status_check` constraint that
does not include `successful`, even though the codebase uses it widely.

This migration is IDEMPOTENT and expands allowed values to cover both legacy
and current statuses.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "014_fix_wallet_tx_status_check"
down_revision = "013_expand_users_role_constraint"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check")
    op.execute(
        """
        ALTER TABLE wallet_transactions
        ADD CONSTRAINT wallet_transactions_status_check
        CHECK (status IN ('pending', 'successful', 'completed', 'failed', 'reversed'))
        """
    )


def downgrade():
    # Best-effort rollback to a conservative, commonly-used set.
    op.execute("ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_status_check")
    op.execute(
        """
        ALTER TABLE wallet_transactions
        ADD CONSTRAINT wallet_transactions_status_check
        CHECK (status IN ('pending', 'completed', 'failed'))
        """
    )

