"""add user_audit_events

Revision ID: 4d5f98b792e9
Revises: 47c4fcee759d
Create Date: 2026-05-04 21:20:09.992955

"""
from alembic import op
import sqlalchemy as sa


revision = '4d5f98b792e9'
down_revision = '47c4fcee759d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'user_audit_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('category', sa.String(length=32), nullable=False),
        sa.Column('severity', sa.String(length=16), nullable=False),
        sa.Column('action', sa.String(length=255), nullable=False),
        sa.Column('details', sa.Text(), nullable=False),
        sa.Column('actor', sa.String(length=120), nullable=False),
        sa.Column('target', sa.String(length=255), nullable=True),
        sa.Column('ip', sa.String(length=64), nullable=True),
        sa.Column('device', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('user_audit_events', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_user_audit_events_user_id'), ['user_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_audit_events_category'), ['category'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_audit_events_severity'), ['severity'], unique=False)
        batch_op.create_index(batch_op.f('ix_user_audit_events_created_at'), ['created_at'], unique=False)


def downgrade():
    with op.batch_alter_table('user_audit_events', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_user_audit_events_created_at'))
        batch_op.drop_index(batch_op.f('ix_user_audit_events_severity'))
        batch_op.drop_index(batch_op.f('ix_user_audit_events_category'))
        batch_op.drop_index(batch_op.f('ix_user_audit_events_user_id'))
    op.drop_table('user_audit_events')
