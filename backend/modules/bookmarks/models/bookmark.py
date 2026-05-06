"""Bookmark model — user-saved references to posts, events, etc."""
from sqlalchemy import func
from modules.auth_v2.extensions import db


BOOKMARK_KINDS = ('post', 'event', 'community', 'bill', 'transaction', 'member')


class Bookmark(db.Model):
    __tablename__ = 'bookmarks'
    __table_args__ = (
        db.UniqueConstraint('user_id', 'kind', 'target_ref', name='uq_bookmarks_user_target'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    kind = db.Column(db.String(32), nullable=False, index=True)
    target_ref = db.Column(db.String(255), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False, default='')
    source = db.Column(db.String(120), nullable=False, default='')
    href = db.Column(db.String(512), nullable=False, default='')
    amount = db.Column(db.String(64), nullable=True)
    community_id = db.Column(db.Integer, nullable=True, index=True)
    community_name = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, server_default=func.now(), nullable=False, index=True)
    updated_at = db.Column(db.DateTime, server_default=func.now(), onupdate=func.now())

    def to_dict(self) -> dict:
        community = None
        if self.community_id:
            community = {
                'id': str(self.community_id),
                'name': self.community_name or '',
            }
        return {
            'id': self.id,
            'user_id': self.user_id,
            'kind': self.kind,
            'target_ref': self.target_ref,
            'title': self.title,
            'description': self.description,
            'source': self.source,
            'href': self.href,
            'amount': self.amount,
            'community': community,
            'savedAt': self.created_at.isoformat() if self.created_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
