"""
Community Module Constants
Centralized status values and constants to avoid magic strings.

Usage:
    from modules.community.constants import CommunityStatus, MemberRole
    
    if community.status == CommunityStatus.ACTIVE:
        ...
"""
from enum import Enum


class CommunityStatus(str, Enum):
    """Community status values"""
    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    CLOSED = 'closed'
    
    @classmethod
    def values(cls) -> list:
        """Return all valid values as a list"""
        return [e.value for e in cls]


class CommunityVisibility(str, Enum):
    """Community visibility values"""
    PUBLIC = 'public'
    PRIVATE = 'private'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class MemberRole(str, Enum):
    """Community member roles"""
    OWNER = 'owner'
    ADMIN = 'admin'
    MEMBER = 'member'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class MemberStatus(str, Enum):
    """Community member status values"""
    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    LEFT = 'left'
    PENDING_PAYMENT = 'pending_payment'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class BillType(str, Enum):
    """Bill types"""
    FIXED = 'fixed'
    FREE_WILL = 'free_will'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class BillStatus(str, Enum):
    """Bill status values"""
    DRAFT = 'draft'
    ACTIVE = 'active'
    CLOSED = 'closed'
    SETTLED = 'settled'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class BillSessionStatus(str, Enum):
    """Recurring bill session status values."""
    ACTIVE = 'active'
    CLOSED = 'closed'
    SETTLED = 'settled'

    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class RecurrenceType(str, Enum):
    """Bill recurrence types"""
    WEEKLY = 'weekly'
    MONTHLY = 'monthly'
    YEARLY = 'yearly'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class WalletStatus(str, Enum):
    """Community wallet status values"""
    PENDING = 'pending'
    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    CLOSED = 'closed'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class CommunityPostType(str, Enum):
    """Community post type values."""

    POST = 'post'
    ANNOUNCEMENT = 'announcement'

    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class CommunityPostStatus(str, Enum):
    """Community post status values."""

    ACTIVE = 'active'
    DELETED = 'deleted'
    HIDDEN = 'hidden'

    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class InviteStatus(str, Enum):
    """Invite status values"""
    ACTIVE = 'active'
    EXPIRED = 'expired'
    REVOKED = 'revoked'
    
    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class InstitutionRole(str, Enum):
    """Institution membership roles."""

    OWNER = 'owner'
    ADMIN = 'admin'
    MEMBER = 'member'

    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class InstitutionStatus(str, Enum):
    """Institution status values."""

    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    CLOSED = 'closed'

    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]


class OrganizationStatus(str, Enum):
    """Organization status values."""

    ACTIVE = 'active'
    SUSPENDED = 'suspended'
    CLOSED = 'closed'

    @classmethod
    def values(cls) -> list:
        return [e.value for e in cls]
