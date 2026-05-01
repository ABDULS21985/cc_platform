"""Invite Service
Manages invite-link lifecycle for communities.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from modules.auth_v2.extensions import db
from modules.community.repositories import CommunityRepository, MemberRepository
from modules.community.models.community_member import CommunityMember


class InviteService:
    """Service for invite link operations."""

    def __init__(self):
        self.community_repo = CommunityRepository()
        self.member_repo = MemberRepository()

    def _generate_token(self, length: int = 11) -> str:
        return secrets.token_urlsafe(length)[:length]

    def _validate_invite(self, community) -> Optional[str]:
        if not community:
            return 'Invite not found'
        if community.invite_status != 'active':
            return 'Invite is not active'
        if community.invite_expires_at and community.invite_expires_at < datetime.utcnow():
            return 'Invite has expired'
        if community.invite_max_uses is not None and community.invite_uses >= community.invite_max_uses:
            return 'Invite usage limit reached'
        if community.status not in ['active']:
            return 'Community is not active'
        return None

    def generate_invite(self, community_id: int, expires_in_days: Optional[int], max_uses: Optional[int], regenerate: bool = False) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        community = self.community_repo.find_by_id(community_id)
        if not community:
            return None, 'Community not found'

        # Build new token if regenerate or missing
        token = community.invite_code if (community.invite_code and not regenerate) else None
        if regenerate or not token:
            # Ensure uniqueness
            token = self._generate_token()
            while self.community_repo.find_by_invite_code(token):
                token = self._generate_token()

        expires_at = None
        if expires_in_days is not None:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        # Persist invite fields
        self.community_repo.update(community_id, {
            'invite_code': token,
            'invite_expires_at': expires_at,
            'invite_max_uses': max_uses,
            'invite_status': 'active',
        })
        db.session.commit()

        return {
            'invite_code': token,
            'expires_at': expires_at.isoformat() if expires_at else None,
            'max_uses': max_uses,
            'uses': community.invite_uses,
            'status': 'active'
        }, None

    def revoke_invite(self, community_id: int) -> Tuple[bool, Optional[str]]:
        community = self.community_repo.find_by_id(community_id)
        if not community:
            return False, 'Community not found'
        self.community_repo.update(community_id, {'invite_status': 'revoked'})
        db.session.commit()
        return True, None

    def get_invite_info(self, invite_code: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Get invite information for public display.
        
        Args:
            invite_code: The invite code to look up
            
        Returns:
            Tuple of (invite info dict, error message)
        """
        community = self.community_repo.find_by_invite_code(invite_code)
        error = self._validate_invite(community)
        if error:
            return None, error
        
        return {
            'community_id': community.id,
            'name': community.name,
            'description': community.description,
            'visibility': community.visibility,
            'member_cost': float(community.member_cost) if community.member_cost else 0.0,
            'member_count': community.member_count,
            'invite': {
                'code': community.invite_code,
                'expires_at': community.invite_expires_at.isoformat() if community.invite_expires_at else None,
                'max_uses': community.invite_max_uses,
                'uses': community.invite_uses,
                'status': community.invite_status,
            }
        }, None

    def preview_invite(self, invite_code: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        community = self.community_repo.find_by_invite_code(invite_code)
        error = self._validate_invite(community)
        if error:
            return None, error
        return {
            'community_id': community.id,
            'name': community.name,
            'description': community.description,
            'visibility': community.visibility,
            'member_cost': float(community.member_cost) if community.member_cost else 0.0,
            'invite': {
                'expires_at': community.invite_expires_at.isoformat() if community.invite_expires_at else None,
                'max_uses': community.invite_max_uses,
                'uses': community.invite_uses,
                'status': community.invite_status,
            }
        }, None

    def redeem_invite(self, invite_code: str, user_id: int) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        community = self.community_repo.find_by_invite_code(invite_code)
        error = self._validate_invite(community)
        if error:
            return None, error

        existing = self.member_repo.find_by_community_and_user(community.id, user_id)
        if existing and existing.status == 'active':
            return None, 'User already a member'
        if existing and existing.status == 'pending_payment' and float(community.member_cost) > 0:
            return {
                'payment_required': True,
                'amount': float(community.member_cost),
                'currency': 'NGN',
                'status': existing.status
            }, None

        if float(community.member_cost) <= 0:
            # Free join: activate membership immediately
            if existing:
                self.member_repo.update_status_by_community_and_user(community.id, user_id, 'active')
            else:
                self.member_repo.create({
                    'community_id': community.id,
                    'user_id': user_id,
                    'role': 'member',
                    'status': 'active'
                })
            self.community_repo.increment_member_count(community.id)
            self.community_repo.update(community.id, {'invite_uses': community.invite_uses + 1})
            # Auto revoke if max uses reached
            if community.invite_max_uses is not None and community.invite_uses + 1 >= community.invite_max_uses:
                self.community_repo.update(community.id, {'invite_status': 'revoked'})
            db.session.commit()
            return {'payment_required': False, 'joined': True}, None

        # Paid join: mark pending payment, do not increment uses yet
        if existing:
            self.member_repo.update_status_by_community_and_user(community.id, user_id, 'pending_payment')
        else:
            self.member_repo.create({
                'community_id': community.id,
                'user_id': user_id,
                'role': 'member',
                'status': 'pending_payment'
            })
        db.session.commit()
        return {
            'payment_required': True,
            'amount': float(community.member_cost),
            'currency': 'NGN',
            'status': 'pending_payment'
        }, None

    def activate_after_payment(self, invite_code: str, user_id: int) -> Tuple[bool, Optional[str]]:
        """Call from payment webhook to finalize membership and increment usage."""
        community = self.community_repo.find_by_invite_code(invite_code)
        if not community:
            return False, 'Community not found for invite'

        member = self.member_repo.find_by_community_and_user(community.id, user_id)
        if not member:
            return False, 'Member not found'

        self.member_repo.update_status_by_community_and_user(community.id, user_id, 'active')
        self.community_repo.increment_member_count(community.id)
        self.community_repo.update(community.id, {'invite_uses': community.invite_uses + 1})
        if community.invite_max_uses is not None and community.invite_uses + 1 >= community.invite_max_uses:
            self.community_repo.update(community.id, {'invite_status': 'revoked'})
        db.session.commit()
        return True, None
