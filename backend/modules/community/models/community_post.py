"""
Community Post Models
Persistence models for community feed posts and explicit mentions.
"""
from typing import Any, Dict, List, Optional

from sqlalchemy import UniqueConstraint, func

from modules.auth_v2.extensions import db


class CommunityPost(db.Model):
    """Community post created by an active community member."""

    __tablename__ = 'community_posts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    community_id = db.Column(
        db.Integer,
        db.ForeignKey('communities.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    author_user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    body = db.Column(db.Text, nullable=True)
    media_urls = db.Column(db.JSON, nullable=True)
    post_type = db.Column(db.String(20), nullable=False, default='post', index=True)
    status = db.Column(db.String(20), nullable=False, default='active', index=True)
    is_pinned = db.Column(db.Boolean, nullable=False, default=False)
    comments_enabled = db.Column(db.Boolean, nullable=False, default=True)
    edited_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    community = db.relationship('Community', back_populates='posts', foreign_keys=[community_id])
    author = db.relationship('User', foreign_keys=[author_user_id], backref='community_posts')
    mentions = db.relationship(
        'CommunityPostMention',
        back_populates='post',
        cascade='all, delete-orphan',
        lazy='selectin',
    )

    def __repr__(self) -> str:
        return f"<CommunityPost(id={self.id}, community_id={self.community_id}, author_user_id={self.author_user_id})>"

    def to_dict(
        self,
        include_author: bool = True,
        include_mentions: bool = True,
    ) -> Dict[str, Any]:
        media_urls = self.media_urls if isinstance(self.media_urls, list) else []
        data = {
            'id': self.id,
            'community_id': self.community_id,
            'author_user_id': self.author_user_id,
            'body': self.body,
            'media_urls': media_urls,
            'post_type': self.post_type,
            'status': self.status,
            'is_pinned': self.is_pinned,
            'comments_enabled': self.comments_enabled,
            'edited_at': self.edited_at.isoformat() if self.edited_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'mention_count': len(self.mentions or []),
        }

        if include_author and self.author:
            data['author'] = {
                'id': self.author.id,
                'firstname': self.author.firstname,
                'lastname': self.author.lastname,
                'full_name': self.author.full_name,
                'profile_photo': self.author.profile_photo,
            }

        if include_mentions:
            data['mentions'] = [mention.to_dict() for mention in self.mentions]
            data['mentioned_user_ids'] = [mention.mentioned_user_id for mention in self.mentions]

        return data


class CommunityPostMention(db.Model):
    """Explicit user mentions attached to a community post."""

    __tablename__ = 'community_post_mentions'
    __table_args__ = (
        UniqueConstraint('post_id', 'mentioned_user_id', name='uq_community_post_mention_user'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(
        db.Integer,
        db.ForeignKey('community_posts.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    mentioned_user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False)

    post = db.relationship('CommunityPost', back_populates='mentions', foreign_keys=[post_id])
    mentioned_user = db.relationship('User', foreign_keys=[mentioned_user_id])

    def __repr__(self) -> str:
        return f"<CommunityPostMention(post_id={self.post_id}, mentioned_user_id={self.mentioned_user_id})>"

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            'id': self.id,
            'post_id': self.post_id,
            'mentioned_user_id': self.mentioned_user_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

        if self.mentioned_user:
            data['user'] = {
                'id': self.mentioned_user.id,
                'firstname': self.mentioned_user.firstname,
                'lastname': self.mentioned_user.lastname,
                'full_name': self.mentioned_user.full_name,
                'profile_photo': self.mentioned_user.profile_photo,
            }

        return data
