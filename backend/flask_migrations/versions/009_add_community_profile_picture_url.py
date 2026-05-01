"""Add profile_picture_url column to communities

Revision ID: 009_comm_profile_pic
Revises: 008_org_institution_nullable
Create Date: 2026-04-24 14:15:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '009_comm_profile_pic'
down_revision = '008_org_institution_nullable'
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    """Check if a column exists in a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    cols = [c['name'] for c in inspector.get_columns(table_name)]
    return column_name in cols


def upgrade():
    if not column_exists('communities', 'profile_picture_url'):
        with op.batch_alter_table('communities') as batch_op:
            batch_op.add_column(sa.Column('profile_picture_url', sa.String(length=500), nullable=True))


def downgrade():
    if column_exists('communities', 'profile_picture_url'):
        with op.batch_alter_table('communities') as batch_op:
            batch_op.drop_column('profile_picture_url')
