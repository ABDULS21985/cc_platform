"""Add institution and organization hierarchy for communities.

Revision ID: 007_institution_org_hierarchy
Revises: 006_transaction_tracking
Create Date: 2026-03-28

This migration is idempotent and safe to rerun.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '007_institution_org_hierarchy'
down_revision = '006_transaction_tracking'
branch_labels = None
depends_on = None


def table_exists(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def column_exists(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    columns = [col['name'] for col in inspector.get_columns(table_name)]
    return column_name in columns


def upgrade():
    bind = op.get_bind()

    if not table_exists('institutions'):
        op.create_table(
            'institutions',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('created_by', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('slug', name='uq_institutions_slug'),
        )
        with op.batch_alter_table('institutions') as batch_op:
            batch_op.create_index('ix_institutions_name', ['name'], unique=False)
            batch_op.create_index('ix_institutions_slug', ['slug'], unique=True)
            batch_op.create_index('ix_institutions_status', ['status'], unique=False)
            batch_op.create_index('ix_institutions_created_by', ['created_by'], unique=False)

    if not table_exists('institution_members'):
        op.create_table(
            'institution_members',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('institution_id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('role', sa.String(length=20), nullable=False, server_default='member'),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('institution_id', 'user_id', name='uq_institution_user'),
        )
        with op.batch_alter_table('institution_members') as batch_op:
            batch_op.create_index('ix_institution_members_institution_id', ['institution_id'], unique=False)
            batch_op.create_index('ix_institution_members_user_id', ['user_id'], unique=False)
            batch_op.create_index('ix_institution_members_role', ['role'], unique=False)
            batch_op.create_index('ix_institution_members_status', ['status'], unique=False)

    if not table_exists('organizations'):
        op.create_table(
            'organizations',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('institution_id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(length=255), nullable=False),
            sa.Column('slug', sa.String(length=255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_default', sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
            sa.Column('created_by', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['institution_id'], ['institutions.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('slug', name='uq_organizations_slug'),
        )
        with op.batch_alter_table('organizations') as batch_op:
            batch_op.create_index('ix_organizations_institution_id', ['institution_id'], unique=False)
            batch_op.create_index('ix_organizations_name', ['name'], unique=False)
            batch_op.create_index('ix_organizations_slug', ['slug'], unique=True)
            batch_op.create_index('ix_organizations_status', ['status'], unique=False)
            batch_op.create_index('ix_organizations_created_by', ['created_by'], unique=False)
            batch_op.create_index('ix_organizations_is_default', ['is_default'], unique=False)

    if not column_exists('communities', 'organization_id'):
        with op.batch_alter_table('communities') as batch_op:
            batch_op.add_column(sa.Column('organization_id', sa.Integer(), nullable=True))
            batch_op.create_index('ix_communities_organization_id', ['organization_id'], unique=False)
            batch_op.create_foreign_key(
                'fk_communities_organization_id',
                'organizations',
                ['organization_id'],
                ['id'],
                ondelete='SET NULL',
            )

    # Backfill existing communities with a default per-user institution and organization.
    rows = bind.execute(
        sa.text(
            """
            SELECT DISTINCT c.created_by
            FROM communities c
            WHERE c.organization_id IS NULL
            """
        )
    ).fetchall()

    for row in rows:
        user_id = row[0]
        institution_slug = f'user-{user_id}-institution'

        institution_id = bind.execute(
            sa.text(
                """
                INSERT INTO institutions (name, slug, description, status, created_by)
                VALUES (:name, :slug, :description, 'active', :created_by)
                ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
                RETURNING id
                """
            ),
            {
                'name': f'User {user_id} Institution',
                'slug': institution_slug,
                'description': 'Auto-created personal institution',
                'created_by': user_id,
            },
        ).scalar()

        bind.execute(
            sa.text(
                """
                INSERT INTO institution_members (institution_id, user_id, role, status)
                VALUES (:institution_id, :user_id, 'owner', 'active')
                ON CONFLICT (institution_id, user_id) DO NOTHING
                """
            ),
            {'institution_id': institution_id, 'user_id': user_id},
        )

        organization_slug = f'user-{user_id}-organization-{institution_id}'
        organization_id = bind.execute(
            sa.text(
                """
                INSERT INTO organizations (institution_id, name, slug, description, is_default, status, created_by)
                VALUES (:institution_id, :name, :slug, :description, true, 'active', :created_by)
                ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
                RETURNING id
                """
            ),
            {
                'institution_id': institution_id,
                'name': f'User {user_id} Organization',
                'slug': organization_slug,
                'description': 'Auto-created default organization',
                'created_by': user_id,
            },
        ).scalar()

        bind.execute(
            sa.text(
                """
                UPDATE communities
                SET organization_id = :organization_id
                WHERE created_by = :created_by AND organization_id IS NULL
                """
            ),
            {'organization_id': organization_id, 'created_by': user_id},
        )


def downgrade():
    if column_exists('communities', 'organization_id'):
        with op.batch_alter_table('communities') as batch_op:
            batch_op.drop_constraint('fk_communities_organization_id', type_='foreignkey')
            batch_op.drop_index('ix_communities_organization_id')
            batch_op.drop_column('organization_id')

    if table_exists('institution_members'):
        op.drop_table('institution_members')

    if table_exists('organizations'):
        op.drop_table('organizations')

    if table_exists('institutions'):
        op.drop_table('institutions')
