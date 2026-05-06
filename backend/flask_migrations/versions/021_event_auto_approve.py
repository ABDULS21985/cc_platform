"""add event auto approve setting

Revision ID: 021_event_auto_approve
Revises: 020_device_tokens
Create Date: 2026-05-06 12:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '021_event_auto_approve'
down_revision = '020_device_tokens'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'auto_approve_members',
                sa.Boolean(),
                server_default=sa.text('false'),
                nullable=False,
            )
        )


def downgrade():
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_column('auto_approve_members')
