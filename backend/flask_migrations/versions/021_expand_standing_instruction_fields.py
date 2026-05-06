"""expand standing instruction fields

Revision ID: 021_standing_instruction_fields
Revises: 020_device_tokens
Create Date: 2026-05-06 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '021_standing_instruction_fields'
down_revision = '020_device_tokens'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('subscriptions', sa.Column('start_at', sa.DateTime(), nullable=True))
    op.add_column('subscriptions', sa.Column('end_at', sa.DateTime(), nullable=True))
    op.add_column('subscriptions', sa.Column('split_member_name', sa.String(length=200), nullable=True))
    op.add_column('subscriptions', sa.Column('split_primary_amount', sa.Numeric(20, 2), nullable=True))
    op.add_column('subscriptions', sa.Column('split_secondary_amount', sa.Numeric(20, 2), nullable=True))


def downgrade():
    op.drop_column('subscriptions', 'split_secondary_amount')
    op.drop_column('subscriptions', 'split_primary_amount')
    op.drop_column('subscriptions', 'split_member_name')
    op.drop_column('subscriptions', 'end_at')
    op.drop_column('subscriptions', 'start_at')
