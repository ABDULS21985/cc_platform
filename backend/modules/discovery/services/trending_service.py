"""Trending topic computation from recent community posts."""
import re
from collections import Counter
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

from modules.community.models.community import Community
from modules.community.models.community_post import CommunityPost

HASHTAG_RE = re.compile(r'#([A-Za-z][\w-]{1,31})')

# Category guesses based on tag keywords (best-effort labelling).
CATEGORY_HINTS = {
    'Real estate': {'estate', 'dues', 'rent', 'lease', 'apartment', 'service-charge'},
    'Events': {'event', 'meetup', 'marathon', 'gala', 'agm', 'conference'},
    'Finance': {'crypto', 'savings', 'co-op', 'coop', 'wallet', 'tithe', 'invest'},
    'Technology': {'design', 'dev', 'tech', 'ai', 'product', 'startup'},
    'Sports': {'run', 'runners', 'marathon', 'gym', 'fitness', 'football'},
    'Education': {'class', 'academy', 'lecture', 'reading', 'curriculum'},
}


def _category_for(tag: str) -> str:
    t = tag.lower()
    for label, hints in CATEGORY_HINTS.items():
        if any(h in t for h in hints):
            return label
    return 'Community'


class TrendingService:
    def list(self, limit: int = 5, lookback_days: int = 14) -> Tuple[Dict[str, Any], int]:
        cutoff_recent = datetime.utcnow() - timedelta(days=lookback_days)
        cutoff_prior = datetime.utcnow() - timedelta(days=lookback_days * 2)

        # Collect post bodies in the recent window.
        recent_posts = (
            CommunityPost.query.filter(CommunityPost.created_at >= cutoff_recent)
            .with_entities(CommunityPost.id, CommunityPost.body, CommunityPost.community_id, CommunityPost.created_at)
            .all()
        )
        # Same for the prior window (used to compute velocity).
        prior_posts = (
            CommunityPost.query.filter(
                CommunityPost.created_at >= cutoff_prior,
                CommunityPost.created_at < cutoff_recent,
            )
            .with_entities(CommunityPost.body)
            .all()
        )

        recent_counter: Counter = Counter()
        prior_counter: Counter = Counter()
        community_for_tag: Dict[str, set] = {}

        for _id, body, community_id, _ts in recent_posts:
            if not body:
                continue
            for raw in HASHTAG_RE.findall(body):
                tag = raw.lower()
                recent_counter[tag] += 1
                community_for_tag.setdefault(tag, set()).add(community_id)
        for (body,) in prior_posts:
            if not body:
                continue
            for raw in HASHTAG_RE.findall(body):
                prior_counter[raw.lower()] += 1

        topics: List[Dict[str, Any]] = []
        for tag, count in recent_counter.most_common(limit):
            prior = prior_counter.get(tag, 0)
            # Velocity heuristic.
            if count >= 50:
                velocity = 'hot'
            elif prior == 0 and count >= 5:
                velocity = 'rising'
            elif prior > 0 and count >= prior * 1.5:
                velocity = 'rising'
            else:
                velocity = 'steady'

            topics.append(
                {
                    'tag': tag,
                    'category': _category_for(tag),
                    'posts': count,
                    'velocity': velocity,
                    'community_ids': sorted(community_for_tag.get(tag, set())),
                }
            )

        # If there are no hashtags yet (very early days), return an empty list
        # so the frontend can fall back to its seed data.
        return {'topics': topics}, 200

    def list_for_user(self, user_id: int, limit: int = 5) -> Tuple[Dict[str, Any], int]:
        # Same as list() for now — could later weight by joined communities.
        return self.list(limit=limit)
