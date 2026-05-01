"""Fix: Add missing wallet_transactions columns

Revision ID: fix001_wallet_cols
Revises: 62f0fa86bc59
Create Date: 2026-01-24 12:20:00.000000

This migration fixes databases where wallet_transactions columns were not created.
Adds ALL columns defined in the WalletTransaction model.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = 'fix001_wallet_cols'
down_revision = '62f0fa86bc59'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def index_exists(table_name, index_name):
    """Check if an index exists on a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = [idx['name'] for idx in inspector.get_indexes(table_name)]
    return index_name in indexes


def fk_exists(table_name, fk_name):
    """Check if a foreign key constraint exists on a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    fks = [fk['name'] for fk in inspector.get_foreign_keys(table_name)]
    return fk_name in fks


def upgrade():
    """Add ALL missing columns to wallet_transactions based on the model."""
    
    # All columns from WalletTransaction model with (name, type, nullable, default)
    columns_to_add = [
        # Community-related foreign keys
        ('community_id', sa.Integer(), True, None),
        ('bill_id', sa.Integer(), True, None),
        ('bill_session_id', sa.Integer(), True, None),
        ('payment_intent_id', sa.String(100), True, None),
        ('transaction_type', sa.String(50), True, None),
        
        # Transaction references
        ('bell_mfb_session_id', sa.String(100), True, None),
        
        # Transaction details
        ('fee', sa.Numeric(15, 2), False, '0.00'),
        ('stamp_duty', sa.Numeric(15, 2), False, '0.00'),
        ('net_amount', sa.Numeric(15, 2), True, None),
        ('description', sa.Text(), True, None),
        
        # Source details (for credits)
        ('source_account_number', sa.String(50), True, None),
        ('source_account_name', sa.String(255), True, None),
        ('source_bank_code', sa.String(10), True, None),
        ('source_bank_name', sa.String(100), True, None),
        
        # Destination details (for debits)
        ('destination_account_number', sa.String(50), True, None),
        ('destination_account_name', sa.String(255), True, None),
        
        # Timestamps
        ('webhook_received_at', sa.DateTime(), True, None),
        ('completed_at', sa.DateTime(), True, None),
    ]
    
    for col_def in columns_to_add:
        col_name = col_def[0]
        col_type = col_def[1]
        nullable = col_def[2]
        default = col_def[3]
        
        if not column_exists('wallet_transactions', col_name):
            if default is not None:
                op.add_column('wallet_transactions', sa.Column(col_name, col_type, nullable=nullable, server_default=default))
            else:
                op.add_column('wallet_transactions', sa.Column(col_name, col_type, nullable=nullable))
    
    # Add indexes if they don't exist
    indexes_to_add = [
        ('ix_wallet_transactions_community_id', 'wallet_transactions', ['community_id']),
        ('ix_wallet_transactions_bill_id', 'wallet_transactions', ['bill_id']),
        ('ix_wallet_transactions_bill_session_id', 'wallet_transactions', ['bill_session_id']),
        ('ix_wallet_transactions_payment_intent_id', 'wallet_transactions', ['payment_intent_id']),
    ]
    
    for idx_name, table, columns in indexes_to_add:
        if not index_exists(table, idx_name):
            op.create_index(idx_name, table, columns)
    
    # Add foreign keys if they don't exist
    fks_to_add = [
        ('fk_wallet_transactions_community_id', 'wallet_transactions', 'communities', ['community_id'], ['id'], 'SET NULL'),
        ('fk_wallet_transactions_bill_id', 'wallet_transactions', 'bills', ['bill_id'], ['id'], 'SET NULL'),
        ('fk_wallet_transactions_bill_session_id', 'wallet_transactions', 'bill_sessions', ['bill_session_id'], ['id'], 'SET NULL'),
    ]
    
    for fk_name, table, ref_table, local_cols, ref_cols, ondelete in fks_to_add:
        if not fk_exists(table, fk_name):
            op.create_foreign_key(fk_name, table, ref_table, local_cols, ref_cols, ondelete=ondelete)


def downgrade():
    """This fix migration doesn't need a downgrade - columns should stay."""
    pass
