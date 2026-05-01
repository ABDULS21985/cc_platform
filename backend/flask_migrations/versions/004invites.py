"""
Add invite link fields to communities

Revision ID: 004invites
Revises: 003commfields
Create Date: 2026-01-08 00:00:00.000000

This migration is IDEMPOTENT - skips columns that already exist.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '004invites'
down_revision = '003commfields'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    # Skip if columns already exist
    if column_exists('communities', 'invite_code'):
        return  # Columns already exist, skip this migration
    
    with op.batch_alter_table('communities') as batch_op:
        batch_op.add_column(sa.Column('invite_code', sa.String(length=16), nullable=True))
        batch_op.add_column(sa.Column('invite_expires_at', sa.DateTime(), nullable=True))
        batch_op.add_column(sa.Column('invite_max_uses', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('invite_uses', sa.Integer(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('invite_status', sa.String(length=20), nullable=False, server_default='active'))
        batch_op.create_unique_constraint('uq_invite_code', ['invite_code'])
        batch_op.create_index('ix_invite_code', ['invite_code'])


def downgrade():
    with op.batch_alter_table('communities') as batch_op:
        batch_op.drop_index('ix_invite_code')
        batch_op.drop_constraint('uq_invite_code', type_='unique')
        batch_op.drop_column('invite_status')
        batch_op.drop_column('invite_uses')
        batch_op.drop_column('invite_max_uses')
        batch_op.drop_column('invite_expires_at')
        batch_op.drop_column('invite_code')
