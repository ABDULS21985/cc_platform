"""Unit tests for the PATCH /posts/comments/<id> endpoint."""

from unittest.mock import MagicMock

import pytest
from flask import Flask

from modules.community.resources import post_resource as resource_module


@pytest.fixture(scope='module')
def app():
    return Flask(__name__)


def _patch_with_user(app, comment_id, body='updated', user_id=42):
    """Invoke the PATCH MethodView bypassing token decorator."""
    current_user = MagicMock(id=user_id)
    with app.test_request_context(
        f'/api/v2/community/posts/comments/{comment_id}',
        method='PATCH',
        json={'body': body},
    ):
        # Call the underlying patch method directly so we bypass
        # token_required and Smorest's @arguments unwrapping.
        return resource_module.CommunityPostCommentResource().patch(
            {'body': body},
            comment_id,
            current_user=current_user,
        )


def test_patch_comment_success(monkeypatch, app):
    monkeypatch.setattr(
        resource_module.post_service,
        'update_comment',
        lambda comment_id, user_id, body: ({'id': comment_id, 'body': body}, None),
    )

    response, status = _patch_with_user(app, comment_id=10, body='new body')

    assert status == 200
    assert response['success'] is True
    assert response['data']['id'] == 10
    assert response['data']['body'] == 'new body'


def test_patch_comment_404_when_missing(monkeypatch, app):
    monkeypatch.setattr(
        resource_module.post_service,
        'update_comment',
        lambda comment_id, user_id, body: (None, 'Comment not found'),
    )

    response, status = _patch_with_user(app, comment_id=999)

    assert status == 404
    assert response['success'] is False
    assert response['error'] == 'not_found'


def test_patch_comment_403_when_not_author(monkeypatch, app):
    monkeypatch.setattr(
        resource_module.post_service,
        'update_comment',
        lambda comment_id, user_id, body: (None, 'Not authorized to update this comment'),
    )

    response, status = _patch_with_user(app, comment_id=10)

    assert status == 403
    assert response['success'] is False
    assert response['error'] == 'forbidden'


def test_patch_comment_400_for_other_validation(monkeypatch, app):
    monkeypatch.setattr(
        resource_module.post_service,
        'update_comment',
        lambda comment_id, user_id, body: (None, 'Comment must contain body text'),
    )

    response, status = _patch_with_user(app, comment_id=10, body='')

    assert status == 400
    assert response['success'] is False
    assert response['error'] == 'comment_update_failed'


def test_update_comment_service_403_for_non_author(monkeypatch):
    """The service-layer authorization check rejects non-author updates."""
    from modules.community.services.post_service import CommunityPostService

    svc = CommunityPostService()
    svc.post_repo = MagicMock()
    svc.member_repo = MagicMock()

    comment = MagicMock(
        author_user_id=99,
        status='active',
        post=MagicMock(status='active', community_id=1),
    )
    svc.post_repo.find_comment_by_id.return_value = comment

    result, error = svc.update_comment(comment_id=5, user_id=42, body='hi')

    assert result is None
    assert error == 'Not authorized to update this comment'
