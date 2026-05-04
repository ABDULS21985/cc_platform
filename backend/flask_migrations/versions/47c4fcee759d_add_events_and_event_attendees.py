"""add events and event_attendees

Revision ID: 47c4fcee759d
Revises: 35de39b3299e
Create Date: 2026-05-04 21:14:11.512664

"""
from alembic import op
import sqlalchemy as sa


revision = '47c4fcee759d'
down_revision = '35de39b3299e'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('community_id', sa.Integer(), nullable=True),
        sa.Column('creator_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(length=64), nullable=True),
        sa.Column('starts_at', sa.DateTime(), nullable=False),
        sa.Column('ends_at', sa.DateTime(), nullable=True),
        sa.Column('duration_label', sa.String(length=64), nullable=True),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('is_online', sa.Boolean(), nullable=False),
        sa.Column('is_private', sa.Boolean(), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('ticket_price', sa.String(length=64), nullable=True),
        sa.Column('cover_image', sa.String(length=512), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['community_id'], ['communities.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_events_community_id'), ['community_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_creator_id'), ['creator_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_starts_at'), ['starts_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_is_private'), ['is_private'], unique=False)
        batch_op.create_index(batch_op.f('ix_events_created_at'), ['created_at'], unique=False)

    op.create_table(
        'event_attendees',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('event_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('cancelled', sa.Boolean(), nullable=False),
        sa.Column('joined_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['event_id'], ['events.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('event_id', 'user_id', name='uq_event_attendees_event_user'),
    )
    with op.batch_alter_table('event_attendees', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_event_attendees_event_id'), ['event_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_event_attendees_user_id'), ['user_id'], unique=False)


def downgrade():
    with op.batch_alter_table('event_attendees', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_event_attendees_user_id'))
        batch_op.drop_index(batch_op.f('ix_event_attendees_event_id'))
    op.drop_table('event_attendees')

    with op.batch_alter_table('events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_events_created_at'))
        batch_op.drop_index(batch_op.f('ix_events_is_private'))
        batch_op.drop_index(batch_op.f('ix_events_starts_at'))
        batch_op.drop_index(batch_op.f('ix_events_creator_id'))
        batch_op.drop_index(batch_op.f('ix_events_community_id'))
    op.drop_table('events')
