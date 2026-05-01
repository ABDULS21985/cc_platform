"""Expand users role check constraint for platform staff roles

Revision ID: 013_expand_users_role_constraint
Revises: 012_admin_audit_logs
Create Date: 2026-04-27 13:35:00.000000

This migration is idempotent. It replaces users_role_check to include
platform staff roles used by admin portal access control.
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "013_expand_users_role_constraint"
down_revision = "012_admin_audit_logs"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check")
    op.execute(
        """
        ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (
            role IN (
                'user',
                'admin',
                'super_admin',
                'support',
                'moderator',
                'finance',
                'ops'
            )
        )
        """
    )


def downgrade():
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check")
    op.execute(
        """
        ALTER TABLE users
        ADD CONSTRAINT users_role_check
        CHECK (role IN ('user', 'admin'))
        """
    )
