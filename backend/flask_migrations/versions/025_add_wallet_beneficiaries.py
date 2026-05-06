"""add wallet beneficiaries

Revision ID: 027_wallet_beneficiaries
Revises: 026_bill_expense_kind
Create Date: 2026-05-06 18:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '027_wallet_beneficiaries'
down_revision = '026_bill_expense_kind'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'wallet_beneficiaries',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('account_number', sa.String(length=20), nullable=False),
        sa.Column('account_name', sa.String(length=255), nullable=False),
        sa.Column('bank_code', sa.String(length=20), nullable=False),
        sa.Column('bank_name', sa.String(length=100), nullable=False),
        sa.Column('nickname', sa.String(length=100), nullable=True),
        sa.Column('is_favorite', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint(
            'user_id',
            'account_number',
            'bank_code',
            name='uq_wallet_beneficiary_user_account_bank',
        ),
    )
    op.create_index('ix_wallet_beneficiaries_user_id', 'wallet_beneficiaries', ['user_id'])


def downgrade():
    op.drop_index('ix_wallet_beneficiaries_user_id', table_name='wallet_beneficiaries')
    op.drop_table('wallet_beneficiaries')
