"""Add community post comments and reactions

Revision ID: 021_community_post_social
Revises: 020_device_tokens
Create Date: 2026-05-06 15:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = '021_community_post_social'
down_revision = '020_device_tokens'
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    if not table_exists('community_post_comments'):
        op.create_table(
            'community_post_comments',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('post_id', sa.Integer(), sa.ForeignKey('community_posts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('author_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('body', sa.Text(), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('edited_at', sa.DateTime(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_community_post_comments_post_id', 'community_post_comments', ['post_id'])
        op.create_index('ix_community_post_comments_author_user_id', 'community_post_comments', ['author_user_id'])
        op.create_index('ix_community_post_comments_status', 'community_post_comments', ['status'])
        op.create_index('ix_community_post_comments_created_at', 'community_post_comments', ['created_at'])

    if not table_exists('community_post_reactions'):
        op.create_table(
            'community_post_reactions',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('post_id', sa.Integer(), sa.ForeignKey('community_posts.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('reaction_type', sa.String(length=20), nullable=False, server_default='like'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('post_id', 'user_id', 'reaction_type', name='uq_community_post_reaction_user_type'),
        )
        op.create_index('ix_community_post_reactions_post_id', 'community_post_reactions', ['post_id'])
        op.create_index('ix_community_post_reactions_user_id', 'community_post_reactions', ['user_id'])
        op.create_index('ix_community_post_reactions_reaction_type', 'community_post_reactions', ['reaction_type'])
        op.create_index('ix_community_post_reactions_created_at', 'community_post_reactions', ['created_at'])


def downgrade():
    if table_exists('community_post_reactions'):
        op.drop_index('ix_community_post_reactions_created_at', table_name='community_post_reactions')
        op.drop_index('ix_community_post_reactions_reaction_type', table_name='community_post_reactions')
        op.drop_index('ix_community_post_reactions_user_id', table_name='community_post_reactions')
        op.drop_index('ix_community_post_reactions_post_id', table_name='community_post_reactions')
        op.drop_table('community_post_reactions')

    if table_exists('community_post_comments'):
        op.drop_index('ix_community_post_comments_created_at', table_name='community_post_comments')
        op.drop_index('ix_community_post_comments_status', table_name='community_post_comments')
        op.drop_index('ix_community_post_comments_author_user_id', table_name='community_post_comments')
        op.drop_index('ix_community_post_comments_post_id', table_name='community_post_comments')
        op.drop_table('community_post_comments')
