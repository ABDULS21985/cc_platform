"""add subscriptions table (subscriptions + standing_instructions)

Revision ID: 017_subscriptions
Revises: 016_auth_sessions
Create Date: 2026-05-06 09:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '017_subscriptions'
down_revision = '016_auth_sessions'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'subscriptions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False, server_default='subscription'),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('amount', sa.Numeric(20, 2), nullable=False),
        sa.Column('currency', sa.String(length=8), nullable=False, server_default='NGN'),
        sa.Column('cadence', sa.String(length=16), nullable=False, server_default='monthly'),
        sa.Column('next_charge_at', sa.DateTime(), nullable=True),
        sa.Column('last_charged_at', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False, server_default='active'),
        sa.Column('counterparty_type', sa.String(length=32), nullable=True),
        sa.Column('counterparty_id', sa.Integer(), nullable=True),
        sa.Column('source_bill_id', sa.Integer(), nullable=True),
        sa.Column('destination_account_number', sa.String(length=20), nullable=True),
        sa.Column('destination_bank_code', sa.String(length=20), nullable=True),
        sa.Column('destination_account_name', sa.String(length=200), nullable=True),
        sa.Column('pin_required', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('CURRENT_TIMESTAMP'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(),
            server_default=sa.text('CURRENT_TIMESTAMP'),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])
    op.create_index('ix_subscriptions_kind', 'subscriptions', ['kind'])
    op.create_index('ix_subscriptions_status', 'subscriptions', ['status'])
    op.create_index('ix_subscriptions_next_charge_at', 'subscriptions', ['next_charge_at'])
    op.create_index('ix_subscriptions_source_bill_id', 'subscriptions', ['source_bill_id'])


def downgrade():
    op.drop_index('ix_subscriptions_source_bill_id', table_name='subscriptions')
    op.drop_index('ix_subscriptions_next_charge_at', table_name='subscriptions')
    op.drop_index('ix_subscriptions_status', table_name='subscriptions')
    op.drop_index('ix_subscriptions_kind', table_name='subscriptions')
    op.drop_index('ix_subscriptions_user_id', table_name='subscriptions')
    op.drop_table('subscriptions')
