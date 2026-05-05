"""add last_seen_at to users

Revision ID: f730654c8e9d
Revises: 5eea41b010f1
Create Date: 2026-05-05 01:37:54.005900

"""
from alembic import op
import sqlalchemy as sa


revision = 'f730654c8e9d'
down_revision = '5eea41b010f1'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('last_seen_at', sa.DateTime(), nullable=True))
        batch_op.create_index(batch_op.f('ix_users_last_seen_at'), ['last_seen_at'], unique=False)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_last_seen_at'))
        batch_op.drop_column('last_seen_at')
