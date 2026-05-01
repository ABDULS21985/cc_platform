"""Make organization institution optional

Revision ID: 008_org_institution_nullable
Revises: 007_institution_org_hierarchy
Create Date: 2026-04-07 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008_org_institution_nullable'
down_revision = '007_institution_org_hierarchy'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column(
        'organizations',
        'institution_id',
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        'organizations',
        'institution_id',
        existing_type=sa.Integer(),
        nullable=False,
    )
