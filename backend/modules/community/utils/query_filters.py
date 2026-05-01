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


class MemberFilter(BaseFilter):
    """Filter for CommunityMember list queries."""

    def apply(self) -> "MemberFilter":
        args = self._args

        if status := args.get("status"):
            self._query = self._query.filter_by(status=status)

        if role := args.get("role"):
            self._query = self._query.filter_by(role=role)

        return self


class BillFilter(BaseFilter):
    """Filter for Bill list queries."""

    def apply(self) -> "BillFilter":
        args = self._args

        if status := args.get("status"):
            self._query = self._query.filter_by(status=status)

        return self
