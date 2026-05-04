"""Per-community notification mute (user_id × community_id).

A user can mute notifications from a specific community without muting the
whole `communities` category. Muting affects the community-targeted hooks
(new posts, role changes within that community, bills inside it, etc.) but
never affects security notifications.
"""
from sqlalchemy import func
from modules.auth_v2.extensions import db


class CommunityMute(db.Model):
    __tablename__ = 'community_mutes'

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        primary_key=True,
    )
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        primary_key=True,
    )
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)
