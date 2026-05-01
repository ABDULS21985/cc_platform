"""Clean slate migration - drop legacy tables and create modular schema

Revision ID: 001cleanslate
Revises: None
Create Date: 2026-01-06 14:30:00.000000

This migration is IDEMPOTENT - safe to run on both fresh and existing databases.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy import inspect

# revision identifiers, used by Alembic.
revision = '001cleanslate'
down_revision = None
branch_labels = None
depends_on = None


def table_exists(table_name):
    """Check if a table exists in the database."""
    bind = op.get_bind()
    inspector = inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade():
    """
    Clean slate migration:
    1. Drop all LEGACY tables (outside modules)
    2. Create base modular tables: users, user_verifications, wallets, wallet_transactions
    3. Create new community module tables
    
    Uses table_exists() check for idempotency - safe for fresh and existing DBs.
    """
    
    # ========== DROP LEGACY TABLES (in correct order due to FKs) ==========
    legacy_tables_to_drop = [
        'community_campaigns', 'community_expense_payments', 'community_expenses',
        'community_donations', 'community_dues', 'community_payments', 'user_communities',
        'push_subscriptions', 'user_devices', 'user_interests', 'notification_preferences',
        'notifications', 'resource_purchases', 'resources', 'tickets', 'events',
        'posts', 'comments', 'likes', 'friendships', 'join_requests',
        'bvn_verifications', 'face_verifications', 'nin_verifications',
        'wallet_transfers', 'otp_codes',
    ]
    
    for table in legacy_tables_to_drop:
        op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
    
    # ========== 1. BASE TABLES (no foreign keys) ==========
    
    # Table: users
    if not table_exists('users'):
        op.create_table(
            'users',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('firebase_uid', sa.String(255), unique=True, nullable=True),
            sa.Column('email', sa.String(255), unique=True, nullable=False),
            sa.Column('password_hash', sa.String(255), nullable=True),
            sa.Column('firstname', sa.String(100), nullable=False, server_default=''),
            sa.Column('lastname', sa.String(100), nullable=False, server_default=''),
            sa.Column('date_of_birth', sa.String(50), nullable=True),
            sa.Column('phone_number', sa.String(20), nullable=True),
            sa.Column('nin', sa.String(50), nullable=True),
            sa.Column('bio', sa.Text(), nullable=True),
            sa.Column('profile_photo', sa.String(500), nullable=True),
            sa.Column('header_image', sa.String(500), nullable=True),
            sa.Column('role', sa.String(20), server_default='user', nullable=False),
            sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('bvn_verified', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('nin_verified', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('verification_status', sa.String(20), server_default='unverified', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )
        op.create_index('ix_users_email', 'users', ['email'])
        op.create_index('ix_users_firebase_uid', 'users', ['firebase_uid'])
    
    # Table: interests
    if not table_exists('interests'):
        op.create_table(
            'interests',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('name', sa.String(100), unique=True, nullable=False),
            sa.Column('slug', sa.String(100), unique=True, nullable=False),
        )
        op.create_index('ix_interests_slug', 'interests', ['slug'])
    
    # ========== 2. FIRST-LEVEL DEPENDENCIES ==========
    
    # Table: user_verifications
    if not table_exists('user_verifications'):
        op.create_table(
            'user_verifications',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('verification_type', sa.String(20), nullable=False),
            sa.Column('status', sa.String(20), server_default='not_started', nullable=False),
            sa.Column('provider_reference', sa.String(255), nullable=True),
            sa.Column('verified_at', sa.DateTime(), nullable=True),
            sa.Column('error_message', sa.Text(), nullable=True),
            sa.Column('metadata', postgresql.JSONB(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.UniqueConstraint('user_id', 'verification_type', name='uq_user_verification_type'),
        )
        op.create_index('ix_user_verifications_user_id', 'user_verifications', ['user_id'])
    
    # Table: wallets
    if not table_exists('wallets'):
        op.create_table(
            'wallets',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
            sa.Column('balance', sa.Numeric(15, 2), server_default='0.00', nullable=False),
            sa.Column('currency', sa.String(3), server_default='NGN', nullable=False),
            sa.Column('status', sa.String(20), server_default='active', nullable=False),
            sa.Column('account_number', sa.String(50), nullable=True),
            sa.Column('account_name', sa.String(255), nullable=True),
            sa.Column('bell_mfb_client_id', sa.String(255), nullable=True),
            sa.Column('bell_mfb_external_reference', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )
        op.create_index('ix_wallets_user_id', 'wallets', ['user_id'])
        op.create_index('ix_wallets_account_number', 'wallets', ['account_number'])
        op.create_index('ix_wallets_bell_mfb_client_id', 'wallets', ['bell_mfb_client_id'])
        op.create_index('ix_wallets_status', 'wallets', ['status'])
    
    # Table: communities
    if not table_exists('communities'):
        op.create_table(
            'communities',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('name', sa.String(255), nullable=False),
            sa.Column('slug', sa.String(255), unique=True, nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('banner_url', sa.String(500), nullable=True),
            sa.Column('visibility', sa.String(20), server_default='public', nullable=False),
            sa.Column('member_cost', sa.Numeric(15, 2), server_default='0.00', nullable=False),
            sa.Column('status', sa.String(20), server_default='active', nullable=False),
            sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('member_count', sa.Integer(), server_default='0', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_communities_slug', 'communities', ['slug'])
        op.create_index('ix_communities_created_by', 'communities', ['created_by'])
        op.create_index('ix_communities_status', 'communities', ['status'])
    
    # ========== 3. SECOND-LEVEL DEPENDENCIES ==========
    
    # Table: wallet_transactions
    if not table_exists('wallet_transactions'):
        op.create_table(
            'wallet_transactions',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('wallet_id', sa.Integer(), sa.ForeignKey('wallets.id', ondelete='CASCADE'), nullable=False),
            sa.Column('community_id', sa.Integer(), nullable=True),
            sa.Column('reference', sa.String(100), unique=True, nullable=False),
            sa.Column('bell_mfb_session_id', sa.String(100), nullable=True),
            sa.Column('bell_mfb_reference', sa.String(100), nullable=True),
            sa.Column('type', sa.String(20), nullable=False),
            sa.Column('transaction_type', sa.String(50), nullable=True),
            sa.Column('amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('fee', sa.Numeric(15, 2), server_default='0.00', nullable=True),
            sa.Column('net_amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.String(20), server_default='pending', nullable=False),
            sa.Column('metadata', postgresql.JSONB(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )
        op.create_index('ix_wallet_transactions_wallet_id', 'wallet_transactions', ['wallet_id'])
        op.create_index('ix_wallet_transactions_reference', 'wallet_transactions', ['reference'])
        op.create_index('ix_wallet_transactions_status', 'wallet_transactions', ['status'])
    
    # Table: community_members
    if not table_exists('community_members'):
        op.create_table(
            'community_members',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('community_id', sa.Integer(), sa.ForeignKey('communities.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('role', sa.String(20), nullable=False),
            sa.Column('status', sa.String(20), nullable=False),
            sa.Column('joined_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.UniqueConstraint('community_id', 'user_id', name='uq_community_user'),
        )
        op.create_index('ix_community_members_community_id', 'community_members', ['community_id'])
        op.create_index('ix_community_members_user_id', 'community_members', ['user_id'])
        op.create_index('ix_community_members_role', 'community_members', ['role'])
        op.create_index('ix_community_members_status', 'community_members', ['status'])
    
    # Table: community_wallets
    if not table_exists('community_wallets'):
        op.create_table(
            'community_wallets',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('community_id', sa.Integer(), sa.ForeignKey('communities.id', ondelete='CASCADE'), unique=True, nullable=False),
            sa.Column('balance', sa.Numeric(15, 2), server_default='0.00', nullable=False),
            sa.Column('currency', sa.String(3), server_default='NGN', nullable=False),
            sa.Column('account_number', sa.String(50), nullable=True, unique=True),
            sa.Column('account_name', sa.String(255), nullable=True),
            sa.Column('status', sa.String(20), server_default='active', nullable=False),
            sa.Column('bell_mfb_client_id', sa.String(100), nullable=True, unique=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_community_wallets_community_id', 'community_wallets', ['community_id'])
        op.create_index('ix_community_wallets_account_number', 'community_wallets', ['account_number'])
        op.create_index('ix_community_wallets_bell_mfb_client_id', 'community_wallets', ['bell_mfb_client_id'])
    
    # Table: bills
    if not table_exists('bills'):
        op.create_table(
            'bills',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('community_id', sa.Integer(), sa.ForeignKey('communities.id', ondelete='CASCADE'), nullable=False),
            sa.Column('creator_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('title', sa.String(255), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('type', sa.String(20), nullable=False),
            sa.Column('min_amount', sa.Numeric(15, 2), server_default='0.00', nullable=False),
            sa.Column('status', sa.String(20), server_default='active', nullable=False),
            sa.Column('is_recurring', sa.Boolean(), server_default='false', nullable=False),
            sa.Column('recurrence_type', sa.String(20), nullable=True),
            sa.Column('due_date', sa.DateTime(), nullable=False),
            sa.Column('collected_amount', sa.Numeric(15, 2), server_default='0.00', nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_bills_community_id', 'bills', ['community_id'])
        op.create_index('ix_bills_creator_id', 'bills', ['creator_id'])
        op.create_index('ix_bills_title', 'bills', ['title'])
        op.create_index('ix_bills_type', 'bills', ['type'])
        op.create_index('ix_bills_status', 'bills', ['status'])
    
    # ========== 4. THIRD-LEVEL DEPENDENCIES ==========
    
    # Table: bill_sessions
    if not table_exists('bill_sessions'):
        op.create_table(
            'bill_sessions',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('bill_id', sa.Integer(), sa.ForeignKey('bills.id', ondelete='CASCADE'), nullable=False),
            sa.Column('session_number', sa.Integer(), nullable=False),
            sa.Column('start_date', sa.DateTime(), nullable=False),
            sa.Column('due_date', sa.DateTime(), nullable=False),
            sa.Column('status', sa.String(20), server_default='active', nullable=False),
            sa.Column('collected_amount', sa.Numeric(15, 2), server_default='0.00', nullable=False),
            sa.Column('target_amount', sa.Numeric(15, 2), nullable=False),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
            sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        )
        op.create_index('ix_bill_sessions_bill_id', 'bill_sessions', ['bill_id'])
        op.create_index('ix_bill_sessions_status', 'bill_sessions', ['status'])
    
    # Table: community_interests (junction table)
    if not table_exists('community_interests'):
        op.create_table(
            'community_interests',
            sa.Column('community_id', sa.Integer(), sa.ForeignKey('communities.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('interest_id', sa.Integer(), sa.ForeignKey('interests.id', ondelete='CASCADE'), primary_key=True),
        )
        op.create_index('ix_community_interests_community_id', 'community_interests', ['community_id'])
        op.create_index('ix_community_interests_interest_id', 'community_interests', ['interest_id'])


def downgrade():
    """
    Drop all tables in reverse order (respecting foreign key dependencies).
    """
    tables_to_drop = [
        'community_interests',
        'bill_sessions',
        'bills',
        'community_wallets',
        'community_members',
        'wallet_transactions',
        'communities',
        'wallets',
        'user_verifications',
        'interests',
        'users',
    ]
    
    for table in tables_to_drop:
        op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
