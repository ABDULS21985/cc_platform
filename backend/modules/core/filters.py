"""
Base Filter System

Provides a clean, composable SQLAlchemy query filter pattern for all modules.
Inspired by Django FilterSet but adapted for Flask-SQLAlchemy — no magic,
just Python classes that own query composition.

Pattern
-------
1. Resource parses query params via Marshmallow schema (validates + coerces).
2. Service creates a filter object backed by the initial model query.
3. Repository method calls filter.apply() then paginate() to get (items, total).

Usage
-----
    class MyFilter(BaseFilter):
        def apply(self) -> 'MyFilter':
            if q := self._args.get('name'):
                self._query = self._query.filter(
                    MyModel.name.ilike(f'%{q}%')
                )
            return self

    # In repository:
    f = MyFilter(MyModel.query.filter_by(owner_id=owner_id), args)
    items, total = f.apply().order(MyModel.created_at.desc()).paginate(limit, offset)
"""

from dataclasses import dataclass
from typing import Any, List, Tuple


@dataclass
class PaginationParams:
    """
    Standard pagination parameters extracted from validated Marshmallow args.

    Usage
    -----
        pagination = PaginationParams.from_args(args)
        items, total = repo.find_filtered(f, **pagination.to_dict())
    """

    limit: int = 20
    offset: int = 0

    @classmethod
    def from_args(cls, args: dict, default_limit: int = 20) -> "PaginationParams":
        return cls(
            limit=min(int(args.get("limit", default_limit)), 100),
            offset=max(int(args.get("offset", 0)), 0),
        )

    @property
    def page(self) -> int:
        """1-based page number derived from offset/limit."""
        return (self.offset // self.limit) + 1 if self.limit else 1

    def to_dict(self) -> dict:
        return {"limit": self.limit, "offset": self.offset}

    def pagination_response(self, total: int) -> dict:
        """Return a standard pagination block suitable for API responses."""
        return {
            "total": total,
            "limit": self.limit,
            "offset": self.offset,
            "has_more": (self.offset + self.limit) < total,
        }


class BaseFilter:
    """
    SQLAlchemy query filter builder.

    Subclasses override ``apply()`` to chain filter conditions onto
    ``self._query``.  Call ``paginate()`` to run COUNT + SELECT in two
    round-trips and return ``(items, total)``.

    The initial query passed to the constructor should already be scoped
    to the relevant parent resource (e.g. filtered by community_id, wallet_id)
    so that filter classes stay focused on *additional* conditions only.
    """

    def __init__(self, query: Any, args: dict) -> None:
        """
        Args:
            query: Starting SQLAlchemy query object.
            args:  Validated dict from a Marshmallow schema (not raw request.args).
        """
        self._query = query
        self._args = args

    # ------------------------------------------------------------------
    # Override in subclasses
    # ------------------------------------------------------------------

    def apply(self) -> "BaseFilter":
        """Apply filter conditions to self._query.  Must return self."""
        return self

    # ------------------------------------------------------------------
    # Built-in helpers (usable by subclasses and callers)
    # ------------------------------------------------------------------

    def order(self, *clauses) -> "BaseFilter":
        """Apply ORDER BY clauses and return self for chaining."""
        self._query = self._query.order_by(*clauses)
        return self

    def paginate(self, limit: int = 20, offset: int = 0) -> Tuple[List, int]:
        """
        Return ``(items, total_count)`` with pagination applied.

        COUNT is always run on the unsliced query so the frontend always
        receives an accurate total even when offset > 0.
        """
        total = self._query.count()
        items = self._query.limit(limit).offset(offset).all()
        return items, total

    @property
    def query(self):
        """Expose the current SQLAlchemy query for external composition."""
        return self._query
