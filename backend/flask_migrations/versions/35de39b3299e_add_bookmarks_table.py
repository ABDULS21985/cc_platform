"""add bookmarks table

Revision ID: 35de39b3299e
Revises: a1af16ac6ca2
Create Date: 2026-05-04 21:07:56.808506

"""
from alembic import op
import sqlalchemy as sa


revision = '35de39b3299e'
down_revision = 'a1af16ac6ca2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'bookmarks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('target_ref', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('source', sa.String(length=120), nullable=False),
        sa.Column('href', sa.String(length=512), nullable=False),
        sa.Column('amount', sa.String(length=64), nullable=True),
        sa.Column('community_id', sa.Integer(), nullable=True),
        sa.Column('community_name', sa.String(length=120), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'kind', 'target_ref', name='uq_bookmarks_user_target'),
    )
    with op.batch_alter_table('bookmarks', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_bookmarks_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookmarks_kind'), ['kind'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookmarks_target_ref'), ['target_ref'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookmarks_community_id'), ['community_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_bookmarks_created_at'), ['created_at'], unique=False)


def downgrade():
    with op.batch_alter_table('bookmarks', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_bookmarks_created_at'))
        batch_op.drop_index(batch_op.f('ix_bookmarks_community_id'))
        batch_op.drop_index(batch_op.f('ix_bookmarks_target_ref'))
        batch_op.drop_index(batch_op.f('ix_bookmarks_kind'))
        batch_op.drop_index(batch_op.f('ix_bookmarks_user_id'))
    op.drop_table('bookmarks')
