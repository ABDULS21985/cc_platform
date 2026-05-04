"""Audit event repository."""
from typing import List, Optional, Tuple

from sqlalchemy import desc

from modules.auth_v2.extensions import db
from modules.audit.models.audit_event import AuditEvent


class AuditRepository:
    def create(self, **kwargs) -> AuditEvent:
        event = AuditEvent(**kwargs)
        db.session.add(event)
        db.session.commit()
        return event

    def list_for_user(
        self,
        user_id: int,
        limit: int = 100,
        offset: int = 0,
        category: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> Tuple[List[AuditEvent], int]:
        query = AuditEvent.query.filter_by(user_id=user_id)
        if category:
            query = query.filter_by(category=category)
        if severity:
            query = query.filter_by(severity=severity)
        total = query.count()
        items = (
            query.order_by(desc(AuditEvent.created_at)).offset(offset).limit(limit).all()
        )
        return items, total
