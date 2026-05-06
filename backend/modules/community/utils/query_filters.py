"""
Community query filters.

These filters centralize query composition for list-style endpoints so
services can delegate filtering concerns to one utility module.
"""

from modules.core.filters import BaseFilter
from modules.community.constants import CommunityStatus, CommunityVisibility


class CommunityFilter(BaseFilter):
    """Filter for Community list queries."""

    def apply(self) -> "CommunityFilter":
        from modules.community.models.community import Community
        from modules.community.models.organization import Organization

        args = self._args

        # Always restrict to active communities.
        self._query = self._query.filter(
            Community.status == CommunityStatus.ACTIVE.value
        )

        # Full-text name search.
        if q := args.get("query"):
            self._query = self._query.filter(Community.name.ilike(f"%{q}%"))

        # Interest filter via M2M relationship.
        if interest_id := args.get("interest_id"):
            self._query = self._query.filter(
                Community.interests.any(id=interest_id)
            )

        # Visibility handling.
        has_scope = bool(args.get("organization_id") or args.get("institution_id"))
        visibility = args.get("visibility")

        if visibility:
            self._query = self._query.filter(Community.visibility == visibility)
        elif not has_scope:
            self._query = self._query.filter(
                Community.visibility == CommunityVisibility.PUBLIC.value
            )

        if organization_id := args.get("organization_id"):
            self._query = self._query.filter(
                Community.organization_id == organization_id
            )

        if institution_id := args.get("institution_id"):
            self._query = self._query.join(Community.organization).filter(
                Organization.institution_id == institution_id
            )

        return self

    def order_by_sort(self, sort: str) -> "CommunityFilter":
        """Apply an ORDER BY clause based on the validated `sort` param.

        Acceptable values: 'recent' | 'popular' | 'newest'. Anything else
        falls back to recent (id desc).
        """
        from modules.community.models.community import Community

        if sort == 'popular':
            self._query = self._query.order_by(
                Community.member_count.desc().nullslast(), Community.id.desc()
            )
        elif sort == 'newest':
            self._query = self._query.order_by(
                Community.created_at.desc().nullslast(), Community.id.desc()
            )
        else:  # 'recent' or fallback
            self._query = self._query.order_by(Community.id.desc())
        return self


class MemberFilter(BaseFilter):
    """Filter for CommunityMember list queries."""

    def apply(self) -> "MemberFilter":
        from modules.community.models.community_member import CommunityMember
        from modules.auth_v2.models.user import User
        from sqlalchemy import or_

        args = self._args

        # ``mentionable`` is a UX-level alias used by the @-autocomplete in
        # the post composer. It pins status to "active" regardless of any
        # caller-supplied status (we intentionally don't expose suspended /
        # left users to the mention picker).
        mentionable = bool(args.get("mentionable"))
        if mentionable:
            self._query = self._query.filter_by(status="active")
        elif status := args.get("status"):
            self._query = self._query.filter_by(status=status)

        if role := args.get("role"):
            self._query = self._query.filter_by(role=role)

        # Prefix search across firstname/lastname/email. We use ILIKE with a
        # trailing wildcard so the FE autocomplete behaves like a typical
        # mention picker — typing 'sa' → 'sam', 'sarah', 'sandra@…'.
        if q := args.get("q"):
            term = q.strip()
            if term:
                pattern = f"{term}%"
                self._query = self._query.join(
                    User, User.id == CommunityMember.user_id
                ).filter(
                    or_(
                        User.firstname.ilike(pattern),
                        User.lastname.ilike(pattern),
                        User.email.ilike(pattern),
                    )
                )

        return self


class BillFilter(BaseFilter):
    """Filter for Bill list queries."""

    def apply(self) -> "BillFilter":
        args = self._args

        if status := args.get("status"):
            self._query = self._query.filter_by(status=status)

        if expense_kind := args.get("expense_kind"):
            self._query = self._query.filter_by(expense_kind=expense_kind)

        return self
