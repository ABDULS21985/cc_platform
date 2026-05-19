"""add subscription execution failure tracking

Revision ID: 025_subscription_exec_fields
Revises: 024_notification_community_id
Create Date: 2026-05-06 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '025_subscription_exec_fields'
down_revision = '024_notification_community_id'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'subscriptions',
        sa.Column('failure_count', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column('subscriptions', sa.Column('last_failure_at', sa.DateTime(), nullable=True))
    op.add_column('subscriptions', sa.Column('last_failure_reason', sa.Text(), nullable=True))
    op.add_column('subscriptions', sa.Column('last_execution_reference', sa.String(length=120), nullable=True))


def downgrade():
    op.drop_column('subscriptions', 'last_execution_reference')
    op.drop_column('subscriptions', 'last_failure_reason')
    op.drop_column('subscriptions', 'last_failure_at')
    op.drop_column('subscriptions', 'failure_count')
