"""Add correct check constraints for community status fields

Revision ID: 005status_constraints
Revises: fix001_wallet_cols
Create Date: 2026-01-27 20:30:00.000000

This migration is IDEMPOTENT - safe to run on both fresh and existing databases.
It adds CHECK constraints for status fields with correct values.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '005status_constraints'
down_revision = 'fix001_wallet_cols'
branch_labels = None
depends_on = None


def constraint_exists(table_name: str, constraint_name: str) -> bool:
    """Check if a constraint exists on a table."""
    bind = op.get_bind()
    inspector = inspect(bind)
    constraints = inspector.get_check_constraints(table_name)
    return any(c['name'] == constraint_name for c in constraints)


def upgrade():
    """
    Add CHECK constraints for status fields.
    
    This migration:
    1. Drops any existing incorrect constraints (if they exist)
    2. Adds new constraints with correct status values
    
    All operations use IF EXISTS/IF NOT EXISTS patterns for idempotency.
    """
    
    # ========== COMMUNITIES TABLE ==========
    # Drop any legacy constraint (idempotent - won't fail if doesn't exist)
    op.execute('ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_status_check')
    
    # Add correct constraint for community status
    op.execute("""
        ALTER TABLE communities 
        ADD CONSTRAINT communities_status_check 
        CHECK (status IN ('active', 'suspended', 'closed'))
    """)
    
    # Add constraint for community visibility
    op.execute('ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_visibility_check')
    op.execute("""
        ALTER TABLE communities 
        ADD CONSTRAINT communities_visibility_check 
        CHECK (visibility IN ('public', 'private'))
    """)
    
    # Add constraint for invite_status
    op.execute('ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_invite_status_check')
    op.execute("""
        ALTER TABLE communities 
        ADD CONSTRAINT communities_invite_status_check 
        CHECK (invite_status IN ('active', 'expired', 'revoked'))
    """)
    
    # ========== COMMUNITY_MEMBERS TABLE ==========
    op.execute('ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_role_check')
    op.execute("""
        ALTER TABLE community_members 
        ADD CONSTRAINT community_members_role_check 
        CHECK (role IN ('owner', 'admin', 'member'))
    """)
    
    op.execute('ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_status_check')
    op.execute("""
        ALTER TABLE community_members 
        ADD CONSTRAINT community_members_status_check 
        CHECK (status IN ('active', 'suspended', 'left', 'pending_payment'))
    """)
    
    # ========== COMMUNITY_WALLETS TABLE ==========
    op.execute('ALTER TABLE community_wallets DROP CONSTRAINT IF EXISTS community_wallets_status_check')
    op.execute("""
        ALTER TABLE community_wallets 
        ADD CONSTRAINT community_wallets_status_check 
        CHECK (status IN ('pending', 'active', 'suspended', 'closed'))
    """)
    
    # ========== BILLS TABLE ==========
    op.execute('ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_type_check')
    op.execute("""
        ALTER TABLE bills 
        ADD CONSTRAINT bills_type_check 
        CHECK (type IN ('fixed', 'free_will'))
    """)
    
    op.execute('ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check')
    op.execute("""
        ALTER TABLE bills 
        ADD CONSTRAINT bills_status_check 
        CHECK (status IN ('draft', 'active', 'closed', 'settled'))
    """)
    
    op.execute('ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_recurrence_type_check')
    op.execute("""
        ALTER TABLE bills 
        ADD CONSTRAINT bills_recurrence_type_check 
        CHECK (recurrence_type IS NULL OR recurrence_type IN ('weekly', 'monthly', 'yearly'))
    """)
    
    # ========== BILL_SESSIONS TABLE ==========
    op.execute('ALTER TABLE bill_sessions DROP CONSTRAINT IF EXISTS bill_sessions_status_check')
    op.execute("""
        ALTER TABLE bill_sessions 
        ADD CONSTRAINT bill_sessions_status_check 
        CHECK (status IN ('active', 'closed', 'settled'))
    """)


def downgrade():
    """Remove all check constraints added by this migration."""
    
    # Communities
    op.execute('ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_status_check')
    op.execute('ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_visibility_check')
    op.execute('ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_invite_status_check')
    
    # Community Members
    op.execute('ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_role_check')
    op.execute('ALTER TABLE community_members DROP CONSTRAINT IF EXISTS community_members_status_check')
    
    # Community Wallets
    op.execute('ALTER TABLE community_wallets DROP CONSTRAINT IF EXISTS community_wallets_status_check')
    
    # Bills
    op.execute('ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_type_check')
    op.execute('ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_status_check')
    op.execute('ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_recurrence_type_check')
    
    # Bill Sessions
    op.execute('ALTER TABLE bill_sessions DROP CONSTRAINT IF EXISTS bill_sessions_status_check')
