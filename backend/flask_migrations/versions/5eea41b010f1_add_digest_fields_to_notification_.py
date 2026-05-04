"""add digest fields to notification_preferences

Revision ID: 5eea41b010f1
Revises: b5c244fec99e
Create Date: 2026-05-04 23:12:35.921882

"""
from alembic import op
import sqlalchemy as sa


revision = '5eea41b010f1'
down_revision = 'b5c244fec99e'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('notification_preferences', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'digest_frequency',
                sa.String(length=8),
                nullable=False,
                server_default=sa.text("'off'"),
            )
        )
        batch_op.add_column(sa.Column('last_digest_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('notification_preferences', schema=None) as batch_op:
        batch_op.drop_column('last_digest_at')
        batch_op.drop_column('digest_frequency')
