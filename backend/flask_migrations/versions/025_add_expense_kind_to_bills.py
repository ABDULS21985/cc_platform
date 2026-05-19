"""add expense_kind to bills

Revision ID: 026_bill_expense_kind
Revises: 025_subscription_exec_fields
Create Date: 2026-05-06 17:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '026_bill_expense_kind'
down_revision = '025_subscription_exec_fields'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('bills', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'expense_kind',
                sa.String(length=32),
                nullable=False,
                server_default='bill',
            )
        )
        batch_op.create_index(
            batch_op.f('ix_bills_expense_kind'),
            ['expense_kind'],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table('bills', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_bills_expense_kind'))
        batch_op.drop_column('expense_kind')
