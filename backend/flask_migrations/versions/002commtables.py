"""Create remaining community module tables

Revision ID: 002commtables
Revises: 001cleanslate
Create Date: 2026-01-06 15:14:00.000000

This migration is IDEMPOTENT - skips tables that already exist.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

revision = '002commtables'
down_revision = '001cleanslate'
branch_labels = None
depends_on = None


def table_exists(table_name):
    """Check if a table exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    """Create remaining community module tables (skips if already exist)"""
    
    # Table: community_wallets
    if table_exists('community_wallets'):
        return  # All tables were created by 001cleanslate, skip this migration
    
    op.create_table(
        'community_wallets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('community_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('account_name', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('bell_mfb_client_id', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('community_id'),
        sa.UniqueConstraint('account_number'),
        sa.UniqueConstraint('bell_mfb_client_id'),
        sa.Index('ix_community_wallets_community_id', 'community_id'),
        sa.Index('ix_community_wallets_account_number', 'account_number'),
        sa.Index('ix_community_wallets_bell_mfb_client_id', 'bell_mfb_client_id'),
    )
    
    # Table: interests
    op.create_table(
        'interests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('slug'),
        sa.Index('ix_interests_name', 'name'),
        sa.Index('ix_interests_slug', 'slug'),
    )
    
    # Table: community_interests (association table)
    op.create_table(
        'community_interests',
        sa.Column('community_id', sa.Integer(), nullable=False),
        sa.Column('interest_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['interest_id'], ['interests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('community_id', 'interest_id'),
        sa.Index('ix_community_interests_community_id', 'community_id'),
        sa.Index('ix_community_interests_interest_id', 'interest_id'),
    )
    
    # Table: bills
    op.create_table(
        'bills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('community_id', sa.Integer(), nullable=False),
        sa.Column('creator_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('min_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('is_recurring', sa.Boolean(), nullable=False),
        sa.Column('recurrence_type', sa.String(length=20), nullable=True),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('collected_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_bills_community_id', 'community_id'),
        sa.Index('ix_bills_creator_id', 'creator_id'),
        sa.Index('ix_bills_title', 'title'),
        sa.Index('ix_bills_type', 'type'),
        sa.Index('ix_bills_status', 'status'),
    )
    
    # Table: bill_sessions
    op.create_table(
        'bill_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bill_id', sa.Integer(), nullable=False),
        sa.Column('session_number', sa.Integer(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('due_date', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('collected_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('target_amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['bill_id'], ['bills.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_bill_sessions_bill_id', 'bill_id'),
        sa.Index('ix_bill_sessions_status', 'status'),
    )


def downgrade():
    """Drop community module tables"""
    op.drop_table('bill_sessions')
    op.drop_table('bills')
    op.drop_table('community_interests')
    op.drop_table('interests')
    op.drop_table('community_wallets')
