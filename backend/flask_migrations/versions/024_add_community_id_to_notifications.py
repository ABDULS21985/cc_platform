"""add community_id to notifications

Revision ID: 024_notification_community_id
Revises: 023_standing_instruction_fields
Create Date: 2026-05-06 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '024_notification_community_id'
down_revision = '023_standing_instruction_fields'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('community_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_notifications_community_id_communities',
            'communities',
            ['community_id'],
            ['id'],
            ondelete='CASCADE',
        )
        batch_op.create_index(
            batch_op.f('ix_notifications_community_id'),
            ['community_id'],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_community_id'))
        batch_op.drop_constraint(
            'fk_notifications_community_id_communities',
            type_='foreignkey',
        )
        batch_op.drop_column('community_id')
