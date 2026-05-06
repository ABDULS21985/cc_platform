"""add auth_sessions table for login history

Revision ID: 016_auth_sessions
Revises: f730654c8e9d
Create Date: 2026-05-06 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '016_auth_sessions'
down_revision = 'f730654c8e9d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'auth_sessions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('jwt_jti', sa.String(length=64), nullable=True),
        sa.Column('device_label', sa.String(length=120), nullable=True),
        sa.Column('browser', sa.String(length=80), nullable=True),
        sa.Column('os', sa.String(length=80), nullable=True),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.Column('location', sa.String(length=120), nullable=True),
        sa.Column('user_agent_raw', sa.String(length=512), nullable=True),
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
    op.create_index('ix_auth_sessions_user_id', 'auth_sessions', ['user_id'])
    op.create_index('ix_auth_sessions_jwt_jti', 'auth_sessions', ['jwt_jti'])
    op.create_index('ix_auth_sessions_revoked_at', 'auth_sessions', ['revoked_at'])


def downgrade():
    op.drop_index('ix_auth_sessions_revoked_at', table_name='auth_sessions')
    op.drop_index('ix_auth_sessions_jwt_jti', table_name='auth_sessions')
    op.drop_index('ix_auth_sessions_user_id', table_name='auth_sessions')
    op.drop_table('auth_sessions')
