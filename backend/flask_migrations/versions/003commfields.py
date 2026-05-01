"""
Migration: Add community fields to wallet_transactions
Adds community_id, bill_id, bill_session_id, payment_intent_id, transaction_type for community billing integration.

Revision ID: 003commfields
Revises: 002commtables
Create Date: 2024-01-01 00:00:00.000000

This migration is IDEMPOTENT - skips columns that already exist.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '003commfields'
down_revision = '002commtables'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    # Skip if columns already exist (created by 001cleanslate)
    if column_exists('wallet_transactions', 'community_id'):
        return  # Columns already exist, skip this migration
    
    # Add new columns to wallet_transactions
    with op.batch_alter_table('wallet_transactions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('community_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('bill_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('bill_session_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('payment_intent_id', sa.String(100), nullable=True))
        batch_op.add_column(sa.Column('transaction_type', sa.String(50), nullable=True))
        
        # Create indexes for foreign keys
        batch_op.create_index('ix_wallet_transactions_community_id', ['community_id'])
        batch_op.create_index('ix_wallet_transactions_bill_id', ['bill_id'])
        batch_op.create_index('ix_wallet_transactions_bill_session_id', ['bill_session_id'])
        batch_op.create_index('ix_wallet_transactions_payment_intent_id', ['payment_intent_id'])
        
        # Create foreign key constraints
        batch_op.create_foreign_key('fk_wallet_transactions_community_id', 'communities', ['community_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_wallet_transactions_bill_id', 'bills', ['bill_id'], ['id'], ondelete='SET NULL')
        batch_op.create_foreign_key('fk_wallet_transactions_bill_session_id', 'bill_sessions', ['bill_session_id'], ['id'], ondelete='SET NULL')


def downgrade():
    # Remove columns and constraints
    with op.batch_alter_table('wallet_transactions', schema=None) as batch_op:
        batch_op.drop_constraint('fk_wallet_transactions_bill_session_id', type_='foreignkey')
        batch_op.drop_constraint('fk_wallet_transactions_bill_id', type_='foreignkey')
        batch_op.drop_constraint('fk_wallet_transactions_community_id', type_='foreignkey')
        
        batch_op.drop_index('ix_wallet_transactions_payment_intent_id')
        batch_op.drop_index('ix_wallet_transactions_bill_session_id')
        batch_op.drop_index('ix_wallet_transactions_bill_id')
        batch_op.drop_index('ix_wallet_transactions_community_id')
        
        batch_op.drop_column('transaction_type')
        batch_op.drop_column('payment_intent_id')
        batch_op.drop_column('bill_session_id')
        batch_op.drop_column('bill_id')
        batch_op.drop_column('community_id')
