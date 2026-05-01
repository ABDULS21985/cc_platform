"""Payment token store model for OAuth2 provider tokens (SafeHaven, etc.)."""
from datetime import datetime
from modules.auth_v2.extensions import db


class PaymentTokenStore(db.Model):
    """
    Stores OAuth2 access/refresh tokens for payment providers.
    
    Single row per provider - updated when tokens refresh.
    """
    __tablename__ = 'payment_token_store'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    
    # Provider identifier (e.g., 'safehaven')
    provider = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # OAuth2 tokens
    access_token = db.Column(db.Text, nullable=False)
    access_token_expiry = db.Column(db.Integer, nullable=False)  # Unix timestamp
    
    refresh_token = db.Column(db.Text, nullable=False)
    refresh_token_expiry = db.Column(db.Integer, nullable=False)  # Unix timestamp
    
    # Client assertion (JWT signed with private key)
    client_assertion = db.Column(db.Text, nullable=False)
    client_assertion_expiry = db.Column(db.Integer, nullable=False)  # Unix timestamp
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, 
        default=datetime.utcnow, 
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    def __repr__(self) -> str:
        return f"<PaymentTokenStore(provider='{self.provider}', updated={self.updated_at})>"
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "provider": self.provider,
            "access_token": self.access_token[:20] + "...",  # Truncate for security
            "access_token_expiry": self.access_token_expiry,
            "refresh_token_expiry": self.refresh_token_expiry,
            "client_assertion_expiry": self.client_assertion_expiry,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
