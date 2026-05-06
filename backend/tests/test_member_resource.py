"""Unit tests for the member resource search/mentionable wiring."""

from unittest.mock import MagicMock

import pytest
from flask import Flask


@pytest.fixture(scope='module')
def app():
    return Flask(__name__)


def test_member_filter_q_param_filters_users(monkeypatch):
    """MemberFilter joins User and applies an ILIKE prefix filter on q."""
    from modules.community.utils.query_filters import MemberFilter

    fake_query = MagicMock()
    # The chain methods all return self so we can assert call ordering.
    fake_query.filter_by.return_value = fake_query
    fake_query.join.return_value = fake_query
    fake_query.filter.return_value = fake_query

    f = MemberFilter(fake_query, {'status': 'active', 'q': 'sa'})
    f.apply()

    fake_query.join.assert_called_once()
    fake_query.filter.assert_called()


def test_member_filter_mentionable_pins_status_to_active(monkeypatch):
    """`mentionable=true` overrides the status filter to 'active'."""
    from modules.community.utils.query_filters import MemberFilter

    captured_status = []

    fake_query = MagicMock()

    def _filter_by(**kwargs):
        if 'status' in kwargs:
            captured_status.append(kwargs['status'])
        return fake_query

    fake_query.filter_by.side_effect = _filter_by
    fake_query.join.return_value = fake_query
    fake_query.filter.return_value = fake_query

    # Even if caller passes status=suspended, mentionable=true overrides.
    f = MemberFilter(fake_query, {'status': 'suspended', 'mentionable': True})
    f.apply()

    assert captured_status == ['active']


def _unwrap(handler):
    """Peel decorators (token_required, Smorest @arguments, @response)."""
    inner = handler
    while hasattr(inner, '__wrapped__'):
        inner = inner.__wrapped__
    return inner


def test_members_resource_requires_active_membership(monkeypatch, app):
    """Non-members get 403 from the listing endpoint."""
    from modules.community.resources import member_resource as resource_module

    monkeypatch.setattr(
        resource_module.community_service,
        'get_community',
        lambda cid: (MagicMock(id=cid), None),
    )
    monkeypatch.setattr(
        resource_module.membership_service,
        'is_member',
        lambda cid, uid: False,
    )

    current_user = MagicMock(id=42)
    inner = _unwrap(resource_module.CommunityMembersResource.get)
    with app.test_request_context('/api/v2/community/1/members'):
        response, status = inner(
            resource_module.CommunityMembersResource(),
            {'limit': 50, 'offset': 0, 'status': 'active'},
            1,
            current_user=current_user,
        )

    assert status == 403
    assert response['success'] is False
    assert response['error'] == 'forbidden'


def test_members_resource_returns_payload_for_member(monkeypatch, app):
    """An active member receives the filtered payload and pagination meta.

    The resource also batches a posts-per-user count via a direct
    ``db.session.query(...).filter(...).group_by(...).all()`` call. We stub
    the chain so the test doesn't require a live SQLAlchemy app context.
    """
    from modules.community.resources import member_resource as resource_module
    from modules.auth_v2 import extensions as auth_extensions

    monkeypatch.setattr(
        resource_module.community_service,
        'get_community',
        lambda cid: (MagicMock(id=cid), None),
    )
    monkeypatch.setattr(
        resource_module.membership_service,
        'is_member',
        lambda cid, uid: True,
    )

    member = MagicMock(user_id=99)
    member.to_dict.return_value = {
        'id': 1,
        'user_id': 99,
        'community_id': 1,
        'role': 'member',
        'status': 'active',
        'user': {
            'id': 99,
            'firstname': 'Sam',
            'lastname': 'Smith',
            'email': 'sam@example.com',
        },
    }

    monkeypatch.setattr(
        resource_module.membership_service,
        'get_filtered_members',
        lambda community_id, args, limit, offset: ([member], 1),
    )

    # Stub the batched posts-count query.
    chain = MagicMock()
    chain.filter.return_value = chain
    chain.group_by.return_value = chain
    chain.all.return_value = [(99, 4)]
    monkeypatch.setattr(auth_extensions.db.session, 'query', lambda *a, **kw: chain)

    current_user = MagicMock(id=42)
    inner = _unwrap(resource_module.CommunityMembersResource.get)
    with app.test_request_context('/api/v2/community/1/members?q=sa&mentionable=true'):
        response, status = inner(
            resource_module.CommunityMembersResource(),
            {'limit': 50, 'offset': 0, 'q': 'sa', 'mentionable': True, 'status': 'active'},
            1,
            current_user=current_user,
        )

    assert status == 200
    assert response['success'] is True
    assert response['data']['pagination']['total'] == 1
    assert response['data']['pagination']['has_more'] is False
    assert response['data']['members'][0]['user']['firstname'] == 'Sam'
    # The batched posts_count gets attached to the user payload by the resource.
    assert response['data']['members'][0]['user']['posts_count'] == 4
