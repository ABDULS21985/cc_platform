"""Add missing user verification fields

Revision ID: 028_user_verification_fields
Revises: 027_wallet_beneficiaries
Create Date: 2026-05-17 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '028_user_verification_fields'
down_revision = '027_wallet_beneficiaries'
branch_labels = None
depends_on = None


def _table_columns(table_name):
    inspector = sa.inspect(op.get_bind())
    return {column['name'] for column in inspector.get_columns(table_name)}


def _table_indexes(table_name):
    inspector = sa.inspect(op.get_bind())
    return {index['name'] for index in inspector.get_indexes(table_name)}


def _table_unique_constraints(table_name):
    inspector = sa.inspect(op.get_bind())
    return {constraint['name'] for constraint in inspector.get_unique_constraints(table_name)}


def upgrade():
    columns = _table_columns('user_verifications')

    with op.batch_alter_table('user_verifications', schema=None) as batch_op:
        if 'verification_number_encrypted' not in columns:
            batch_op.add_column(sa.Column('verification_number_encrypted', sa.Text(), nullable=True))
        if 'verification_number_hash' not in columns:
            batch_op.add_column(sa.Column('verification_number_hash', sa.String(length=64), nullable=True))
        if 'bell_mfb_client_id' not in columns:
            batch_op.add_column(sa.Column('bell_mfb_client_id', sa.String(length=100), nullable=True))
        if 'bell_mfb_external_reference' not in columns:
            batch_op.add_column(sa.Column('bell_mfb_external_reference', sa.String(length=100), nullable=True))
        if 'task_id' not in columns:
            batch_op.add_column(sa.Column('task_id', sa.String(length=255), nullable=True))

    op.execute(
        "UPDATE user_verifications "
        "SET verification_number_encrypted = '' "
        "WHERE verification_number_encrypted IS NULL"
    )
    op.execute(
        "UPDATE user_verifications "
        "SET verification_number_hash = '' "
        "WHERE verification_number_hash IS NULL"
    )

    with op.batch_alter_table('user_verifications', schema=None) as batch_op:
        batch_op.alter_column(
            'verification_number_encrypted',
            existing_type=sa.Text(),
            nullable=False,
        )
        batch_op.alter_column(
            'verification_number_hash',
            existing_type=sa.String(length=64),
            nullable=False,
        )

    indexes = _table_indexes('user_verifications')
    unique_constraints = _table_unique_constraints('user_verifications')

    if 'ix_user_verifications_verification_number_hash' not in indexes:
        op.create_index(
            'ix_user_verifications_verification_number_hash',
            'user_verifications',
            ['verification_number_hash'],
            unique=False,
        )
    if 'ix_user_verifications_task_id' not in indexes:
        op.create_index(
            'ix_user_verifications_task_id',
            'user_verifications',
            ['task_id'],
            unique=False,
        )
    if 'uq_user_verifications_bell_mfb_client_id' not in unique_constraints:
        op.create_unique_constraint(
            'uq_user_verifications_bell_mfb_client_id',
            'user_verifications',
            ['bell_mfb_client_id'],
        )
    if 'uq_user_verifications_bell_mfb_external_reference' not in unique_constraints:
        op.create_unique_constraint(
            'uq_user_verifications_bell_mfb_external_reference',
            'user_verifications',
            ['bell_mfb_external_reference'],
        )


def downgrade():
    columns = _table_columns('user_verifications')
    indexes = _table_indexes('user_verifications')
    unique_constraints = _table_unique_constraints('user_verifications')

    if 'uq_user_verifications_bell_mfb_external_reference' in unique_constraints:
        op.drop_constraint(
            'uq_user_verifications_bell_mfb_external_reference',
            'user_verifications',
            type_='unique',
        )
    if 'uq_user_verifications_bell_mfb_client_id' in unique_constraints:
        op.drop_constraint(
            'uq_user_verifications_bell_mfb_client_id',
            'user_verifications',
            type_='unique',
        )
    if 'ix_user_verifications_task_id' in indexes:
        op.drop_index('ix_user_verifications_task_id', table_name='user_verifications')
    if 'ix_user_verifications_verification_number_hash' in indexes:
        op.drop_index('ix_user_verifications_verification_number_hash', table_name='user_verifications')

    with op.batch_alter_table('user_verifications', schema=None) as batch_op:
        if 'task_id' in columns:
            batch_op.drop_column('task_id')
        if 'bell_mfb_external_reference' in columns:
            batch_op.drop_column('bell_mfb_external_reference')
        if 'bell_mfb_client_id' in columns:
            batch_op.drop_column('bell_mfb_client_id')
        if 'verification_number_hash' in columns:
            batch_op.drop_column('verification_number_hash')
        if 'verification_number_encrypted' in columns:
            batch_op.drop_column('verification_number_encrypted')
