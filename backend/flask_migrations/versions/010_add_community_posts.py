"""Add community post and explicit mention tables

Revision ID: 010_community_posts
Revises: 009_comm_profile_pic
Create Date: 2026-04-25 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '010_community_posts'
down_revision = '009_comm_profile_pic'
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    if not table_exists('community_posts'):
        op.create_table(
            'community_posts',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('community_id', sa.Integer(), sa.ForeignKey('communities.id', ondelete='CASCADE'), nullable=False),
            sa.Column('author_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('body', sa.Text(), nullable=True),
            sa.Column('media_urls', sa.JSON(), nullable=True),
            sa.Column('post_type', sa.String(length=20), nullable=False, server_default='post'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('comments_enabled', sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column('edited_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_community_posts_community_id', 'community_posts', ['community_id'])
        op.create_index('ix_community_posts_author_user_id', 'community_posts', ['author_user_id'])
        op.create_index('ix_community_posts_post_type', 'community_posts', ['post_type'])
        op.create_index('ix_community_posts_status', 'community_posts', ['status'])
        op.create_index('ix_community_posts_created_at', 'community_posts', ['created_at'])

    if not table_exists('community_post_mentions'):
        op.create_table(
            'community_post_mentions',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('post_id', sa.Integer(), sa.ForeignKey('community_posts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('mentioned_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('post_id', 'mentioned_user_id', name='uq_community_post_mention_user'),
        )
        op.create_index('ix_community_post_mentions_post_id', 'community_post_mentions', ['post_id'])
        op.create_index('ix_community_post_mentions_mentioned_user_id', 'community_post_mentions', ['mentioned_user_id'])


def downgrade():
    if table_exists('community_post_mentions'):
        op.drop_index('ix_community_post_mentions_mentioned_user_id', table_name='community_post_mentions')
        op.drop_index('ix_community_post_mentions_post_id', table_name='community_post_mentions')
        op.drop_table('community_post_mentions')

    if table_exists('community_posts'):
        op.drop_index('ix_community_posts_created_at', table_name='community_posts')
        op.drop_index('ix_community_posts_status', table_name='community_posts')
        op.drop_index('ix_community_posts_post_type', table_name='community_posts')
        op.drop_index('ix_community_posts_author_user_id', table_name='community_posts')
        op.drop_index('ix_community_posts_community_id', table_name='community_posts')
        op.drop_table('community_posts')