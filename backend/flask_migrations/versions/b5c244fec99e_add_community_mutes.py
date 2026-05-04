"""add community_mutes

Revision ID: b5c244fec99e
Revises: 84a5518c1064
Create Date: 2026-05-04 23:01:34.964262

"""
from alembic import op
import sqlalchemy as sa


revision = 'b5c244fec99e'
down_revision = '84a5518c1064'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'community_mutes',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('community_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'community_id'),
    )


def downgrade():
    op.drop_table('community_mutes')
