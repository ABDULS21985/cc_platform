"""Add user transaction PIN fields

Revision ID: 015_add_user_transaction_pin
Revises: 014_fix_wallet_tx_status_check
Create Date: 2026-04-29 11:45:00.000000

Adds transaction PIN fields to the users table for authorizing money-moving actions.
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "015_add_user_transaction_pin"
down_revision = "014_fix_wallet_tx_status_check"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("transaction_pin_hash", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("pin_failed_attempts", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("pin_locked_until", sa.DateTime(), nullable=True))
    op.add_column("users", sa.Column("pin_updated_at", sa.DateTime(), nullable=True))

    # Drop the server default now that existing rows are backfilled.
    op.alter_column("users", "pin_failed_attempts", server_default=None)


def downgrade():
    op.drop_column("users", "pin_updated_at")
    op.drop_column("users", "pin_locked_until")
    op.drop_column("users", "pin_failed_attempts")
    op.drop_column("users", "transaction_pin_hash")

