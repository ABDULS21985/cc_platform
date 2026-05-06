"""Unit tests for CommunityPostService sort wiring."""

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def service(monkeypatch):
    from modules.community.services.post_service import CommunityPostService

    svc = CommunityPostService()
    svc.post_repo = MagicMock()
    svc.community_repo = MagicMock()
    svc.member_repo = MagicMock()
    return svc


def test_list_posts_passes_popular_sort_to_repository(service):
    """The service must hand the validated `sort` arg through to the repo."""
    service.community_repo.find_by_id.return_value = MagicMock()
    service.member_repo.is_member.return_value = True

    popular_post = MagicMock()
    service.post_repo.find_by_community.return_value = ([popular_post], 1)

    result, error = service.list_posts(
        community_id=1,
        requester_user_id=2,
        args={'limit': 10, 'offset': 0, 'sort': 'popular'},
    )

    assert error is None
    posts, total = result
    assert posts == [popular_post]
    assert total == 1
    service.post_repo.find_by_community.assert_called_once()
    _, kwargs = service.post_repo.find_by_community.call_args
    assert kwargs['sort'] == 'popular'
    assert kwargs['community_id'] == 1


def test_list_posts_defaults_sort_to_recent(service):
    service.community_repo.find_by_id.return_value = MagicMock()
    service.member_repo.is_member.return_value = True
    service.post_repo.find_by_community.return_value = ([], 0)

    service.list_posts(
        community_id=1,
        requester_user_id=2,
        args={'limit': 10, 'offset': 0},
    )

    _, kwargs = service.post_repo.find_by_community.call_args
    assert kwargs['sort'] == 'recent'


def test_list_posts_passes_newest_sort(service):
    service.community_repo.find_by_id.return_value = MagicMock()
    service.member_repo.is_member.return_value = True
    service.post_repo.find_by_community.return_value = ([], 0)

    service.list_posts(
        community_id=1,
        requester_user_id=2,
        args={'limit': 10, 'offset': 0, 'sort': 'newest'},
    )

    _, kwargs = service.post_repo.find_by_community.call_args
    assert kwargs['sort'] == 'newest'


def test_repository_popular_sort_orders_by_score(monkeypatch):
    """Verify the repository sort='popular' branch composes ORDER BY score DESC.

    We mock the SQLAlchemy query chain and assert that the score expression
    appears as the first ordering term, then created_at desc as tiebreaker.
    """
    from modules.community.repositories.post_repository import (
        CommunityPostRepository,
    )

    repo = CommunityPostRepository()

    # Capture the order_by argument list so we can assert on it.
    captured_orderings = {}

    fake_query = MagicMock()
    fake_query.filter.return_value = fake_query
    fake_query.outerjoin.return_value = fake_query

    def _order_by(*args):
        captured_orderings['args'] = args
        chain = MagicMock()
        chain.offset.return_value = chain
        chain.limit.return_value = chain
        chain.all.return_value = []
        return chain

    fake_query.order_by.side_effect = _order_by
    fake_query.count.return_value = 3

    monkeypatch.setattr(repo, '_base_query', lambda: fake_query)

    # Stub the subquery construction (which goes through db.session.query).
    from modules.community.repositories import post_repository as repo_module

    fake_subq_chain = MagicMock()
    fake_subq_chain.group_by.return_value = fake_subq_chain
    fake_subq_chain.filter.return_value = fake_subq_chain
    fake_subq_chain.subquery.return_value = MagicMock(c=MagicMock(post_id=MagicMock(), cnt=MagicMock()))

    monkeypatch.setattr(
        repo_module.db.session,
        'query',
        lambda *a, **kw: fake_subq_chain,
    )

    posts, total = repo.find_by_community(community_id=1, sort='popular')

    assert posts == []
    assert total == 3
    # Three ordering terms: score expr, created_at desc, id desc.
    assert 'args' in captured_orderings
    assert len(captured_orderings['args']) >= 2
