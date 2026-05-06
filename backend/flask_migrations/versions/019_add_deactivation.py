"""add deactivated_at + pii_scrubbed_at to users

Revision ID: 019_deactivation
Revises: 018_pref_channels
Create Date: 2026-05-06 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '019_deactivation'
down_revision = '018_pref_channels'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('deactivated_at', sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_deactivated_at'), ['deactivated_at'], unique=False)
        batch_op.add_column(sa.Column('pii_scrubbed_at', sa.DateTime(), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('pii_scrubbed_at')
        batch_op.drop_index(batch_op.f('ix_users_deactivated_at'))
        batch_op.drop_column('deactivated_at')
