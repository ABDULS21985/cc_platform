"""add per-channel toggles to notification_preferences

Revision ID: 018_pref_channels
Revises: 017_subscriptions
Create Date: 2026-05-06 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '018_pref_channels'
down_revision = '017_subscriptions'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('notification_preferences', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'channel_email',
                sa.Boolean(),
                nullable=False,
                server_default=sa.text('true'),
            )
        )
        batch_op.add_column(
            sa.Column(
                'channel_sms',
                sa.Boolean(),
                nullable=False,
                server_default=sa.text('false'),
            )
        )
        batch_op.add_column(
            sa.Column(
                'channel_push',
                sa.Boolean(),
                nullable=False,
                server_default=sa.text('false'),
            )
        )


def downgrade():
    with op.batch_alter_table('notification_preferences', schema=None) as batch_op:
        batch_op.drop_column('channel_push')
        batch_op.drop_column('channel_sms')
        batch_op.drop_column('channel_email')
