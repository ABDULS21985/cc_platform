"""add device_tokens table for FCM push registration

Revision ID: 020_device_tokens
Revises: 019_deactivation
Create Date: 2026-05-06 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '020_device_tokens'
down_revision = '019_deactivation'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'device_tokens',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('fcm_token', sa.Text(), nullable=False),
        sa.Column('platform', sa.String(length=16), nullable=False, server_default='web'),
        sa.Column(
            'last_seen_at',
            sa.DateTime(),
            server_default=sa.text('CURRENT_TIMESTAMP'),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(),
            server_default=sa.text('CURRENT_TIMESTAMP'),
            nullable=False,
        ),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_device_tokens_user_id', 'device_tokens', ['user_id'])
    op.create_index(
        'ix_device_tokens_user_revoked',
        'device_tokens',
        ['user_id', 'revoked_at'],
    )


def downgrade():
    op.drop_index('ix_device_tokens_user_revoked', table_name='device_tokens')
    op.drop_index('ix_device_tokens_user_id', table_name='device_tokens')
    op.drop_table('device_tokens')
