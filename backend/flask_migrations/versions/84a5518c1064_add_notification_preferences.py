"""add notification_preferences

Revision ID: 84a5518c1064
Revises: 4d5f98b792e9
Create Date: 2026-05-04 22:20:29.677311

"""
from alembic import op
import sqlalchemy as sa


revision = '84a5518c1064'
down_revision = '4d5f98b792e9'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'notification_preferences',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('money_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('bills_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('communities_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('events_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('security_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('system_enabled', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id'),
    )


def downgrade():
    op.drop_table('notification_preferences')
