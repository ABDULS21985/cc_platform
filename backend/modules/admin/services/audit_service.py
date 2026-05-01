from typing import Any, Dict, Optional

from flask import has_request_context, request

from modules.admin.models.audit_log import AdminAuditLog
from modules.auth_v2.extensions import db


class AdminAuditService:
    def log(
        self,
        *,
        actor_user_id: Optional[int],
        action: str,
        target_type: str,
        target_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> AdminAuditLog:
        ip_address = None
        user_agent = None
        if has_request_context():
            ip_address = request.headers.get("X-Forwarded-For") or request.remote_addr
            user_agent = request.headers.get("User-Agent")

        entry = AdminAuditLog(
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            metadata_json=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.session.add(entry)
        db.session.commit()
        return entry

