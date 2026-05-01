"""Add transaction tracking fields: signed_amount, balance_before, balance_after, metadata

Revision ID: 006_transaction_tracking
Revises: status_constraints_005
Create Date: 2026-02-22

This migration adds standard transaction tracking fields:
- signed_amount: Signed amount (positive for credit, negative for debit)
- balance_before: Wallet balance before this transaction
- balance_after: Wallet balance after this transaction  
- metadata: JSONB field for flexible transaction context (if not already exists)

These fields follow standard accounting/fintech practices for transaction auditing.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '006_transaction_tracking'
down_revision = '005status_constraints'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in the table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    """
    Add transaction tracking fields to wallet_transactions table.
    
    Uses column_exists() check for idempotency - safe to run multiple times.
    """
    
    # Add signed_amount column (positive for credit, negative for debit)
    if not column_exists('wallet_transactions', 'signed_amount'):
        op.add_column(
            'wallet_transactions',
            sa.Column('signed_amount', sa.Numeric(15, 2), nullable=True)
        )
    
    # Add balance_before column
    if not column_exists('wallet_transactions', 'balance_before'):
        op.add_column(
            'wallet_transactions',
            sa.Column('balance_before', sa.Numeric(15, 2), nullable=True)
        )
    
    # Add balance_after column
    if not column_exists('wallet_transactions', 'balance_after'):
        op.add_column(
            'wallet_transactions',
            sa.Column('balance_after', sa.Numeric(15, 2), nullable=True)
        )
    
    # Add metadata column (JSONB) if not already present
    # Note: This may already exist from 001cleanslate migration
    if not column_exists('wallet_transactions', 'metadata'):
        op.add_column(
            'wallet_transactions',
            sa.Column('metadata', postgresql.JSONB(), nullable=True)
        )
    
    # Backfill signed_amount for existing transactions based on type
    # Credit = positive, Debit = negative
    op.execute("""
        UPDATE wallet_transactions 
        SET signed_amount = CASE 
            WHEN type = 'credit' THEN ABS(net_amount)
            WHEN type = 'debit' THEN -ABS(net_amount)
            ELSE net_amount
        END
        WHERE signed_amount IS NULL
    """)


def downgrade():
    """
    Remove transaction tracking fields.
    """
    # Drop columns in reverse order
    if column_exists('wallet_transactions', 'balance_after'):
        op.drop_column('wallet_transactions', 'balance_after')
    
    if column_exists('wallet_transactions', 'balance_before'):
        op.drop_column('wallet_transactions', 'balance_before')
    
    if column_exists('wallet_transactions', 'signed_amount'):
        op.drop_column('wallet_transactions', 'signed_amount')
    
    # Note: We don't drop metadata as it may have been created by 001cleanslate
