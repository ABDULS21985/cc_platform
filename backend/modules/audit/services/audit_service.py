"""User audit log service."""
import logging
from typing import Any, Dict, Optional, Tuple

from modules.audit.models.audit_event import (
    AUDIT_CATEGORIES,
    AUDIT_SEVERITIES,
)
from modules.audit.repositories.audit_repository import AuditRepository

logger = logging.getLogger(__name__)


class AuditService:
    def __init__(self):
        self.repo = AuditRepository()

    def record(
        self,
        user_id: int,
        action: str,
        details: str = '',
        category: str = 'system',
        severity: str = 'info',
        actor: str = 'You',
        target: Optional[str] = None,
        ip: Optional[str] = None,
        device: Optional[str] = None,
    ):
        if category not in AUDIT_CATEGORIES:
            category = 'system'
        if severity not in AUDIT_SEVERITIES:
            severity = 'info'
        try:
            return self.repo.create(
                user_id=user_id,
                category=category,
                severity=severity,
                action=action,
                details=details or '',
                actor=actor or 'You',
                target=target,
                ip=ip,
                device=device,
            )
        except Exception as exc:
            logger.warning('Failed to record audit event for user %s: %s', user_id, exc)
            return None

    def list(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
        category: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], int]:
        items, total = self.repo.list_for_user(
            user_id,
            limit=limit,
            offset=offset,
            category=category if category in AUDIT_CATEGORIES else None,
            severity=severity if severity in AUDIT_SEVERITIES else None,
        )
        return {
            'events': [e.to_dict() for e in items],
            'pagination': {'total': total, 'limit': limit, 'offset': offset},
        }, 200
