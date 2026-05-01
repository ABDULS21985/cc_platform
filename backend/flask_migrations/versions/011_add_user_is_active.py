"""Add is_active flag to users

Revision ID: 011_user_is_active
Revises: 010_community_posts
Create Date: 2026-04-27 11:55:00.000000

This migration is IDEMPOTENT - skips column if it already exists.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = "011_user_is_active"
down_revision = "010_community_posts"
branch_labels = None
depends_on = None


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col["name"] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    if not column_exists("users", "is_active"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.add_column(
                sa.Column(
                    "is_active",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.true(),
                )
            )


def downgrade():
    if column_exists("users", "is_active"):
        with op.batch_alter_table("users", schema=None) as batch_op:
            batch_op.drop_column("is_active")

