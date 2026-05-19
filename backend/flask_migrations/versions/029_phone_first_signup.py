"""Support phone-first signup

Revision ID: 029_phone_first_signup
Revises: 028_user_verification_fields
Create Date: 2026-05-17 21:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '029_phone_first_signup'
down_revision = '028_user_verification_fields'
branch_labels = None
depends_on = None


def _index_names(table_name):
    inspector = sa.inspect(op.get_bind())
    return {index['name'] for index in inspector.get_indexes(table_name)}


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column(
            'email',
            existing_type=sa.String(length=255),
            nullable=True,
        )

    if 'ix_users_phone_number' not in _index_names('users'):
        op.create_index('ix_users_phone_number', 'users', ['phone_number'], unique=False)


def downgrade():
    if 'ix_users_phone_number' in _index_names('users'):
        op.drop_index('ix_users_phone_number', table_name='users')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column(
            'email',
            existing_type=sa.String(length=255),
            nullable=False,
        )
