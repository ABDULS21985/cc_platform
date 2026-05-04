"""HTTP smoke tests against the running backend.

These hit the live PM2 backend at localhost:8080 and verify the contract
of each new endpoint: shape of the response envelope, status codes, and
that a notification round-trip (POST → GET → mark-read → GET) works.

Skip the suite if the backend isn't reachable so CI runs that don't have
the server up don't fail spuriously.
"""

import json
import urllib.error
import urllib.request

import pytest

BASE = 'http://localhost:8080/api/v2'

EMAIL = 'shadrach.abdul@gmail.com'
PASSWORD = 'Secured$3211'


def _request(method: str, path: str, *, token=None, body=None):
    url = f"{BASE}{path}"
    data = None if body is None else json.dumps(body).encode()
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            payload = r.read().decode()
            return r.status, (json.loads(payload) if payload else {})
    except urllib.error.HTTPError as e:
        return e.code, (json.loads(e.read().decode() or '{}') or {})
    except (urllib.error.URLError, ConnectionError):
        pytest.skip('backend not reachable on localhost:8080')


@pytest.fixture(scope='module')
def token():
    status, data = _request(
        'POST', '/auth/login', body={'email': EMAIL, 'password': PASSWORD}
    )
    if status != 200:
        pytest.skip(f'unable to log in dev user: {status}')
    return data['data']['tokens']['access_token']


def test_unread_count_envelope(token):
    status, data = _request('GET', '/notifications/unread-count', token=token)
    assert status == 200
    assert data['success'] is True
    assert isinstance(data['data']['unread_count'], int)


def test_unread_by_category_returns_all_keys(token):
    status, data = _request('GET', '/notifications/unread-by-category', token=token)
    assert status == 200
    buckets = data['data']['unread_by_category']
    for key in ('money', 'bills', 'communities', 'events', 'security', 'system'):
        assert key in buckets and isinstance(buckets[key], int)
    assert isinstance(data['data']['total'], int)


def test_preferences_round_trip(token):
    # Defaults exist on read.
    s1, d1 = _request('GET', '/notifications/preferences', token=token)
    assert s1 == 200
    assert d1['data']['preferences']['security'] is True

    # Toggle bills off and back on, asserting persistence.
    s2, d2 = _request(
        'PUT', '/notifications/preferences',
        token=token, body={'bills': False},
    )
    assert s2 == 200
    assert d2['data']['preferences']['bills'] is False

    s3, _ = _request(
        'PUT', '/notifications/preferences',
        token=token, body={'bills': True},
    )
    assert s3 == 200


def test_community_mute_round_trip(token):
    # The community_mutes table FKs to communities — use a community the
    # dev account is actually a member of. Skip if none.
    s, d = _request('GET', '/community/joined?limit=1', token=token)
    if s != 200:
        pytest.skip(f'joined endpoint not 200: {s}')
    joined = d['data']['communities'] if isinstance(d.get('data'), dict) else []
    if not joined:
        pytest.skip('dev account has no joined communities')
    cid = joined[0]['id']

    s1, _ = _request('POST', f'/notifications/community-mutes/{cid}', token=token)
    assert s1 == 200
    s2, d2 = _request('GET', '/notifications/community-mutes', token=token)
    assert s2 == 200
    assert cid in d2['data']['community_ids']
    s3, _ = _request('DELETE', f'/notifications/community-mutes/{cid}', token=token)
    assert s3 == 200
    s4, d4 = _request('GET', '/notifications/community-mutes', token=token)
    assert cid not in d4['data']['community_ids']


def test_notification_create_then_mark_read(token):
    # The POST response is filtered through NotificationResponseSchema by
    # smorest and ends up empty, so we discover the new id via list().
    title = f'smoke-test-{__import__("time").time()}'
    s1, _ = _request(
        'POST', '/notifications/',
        token=token,
        body={'title': title, 'body': 'temporary',
              'category': 'system', 'source': 'tests'},
    )
    assert s1 == 201

    s2, d2 = _request('GET', '/notifications/?limit=10', token=token)
    assert s2 == 200
    found = next(
        (n for n in d2['data']['notifications'] if n['title'] == title),
        None,
    )
    assert found is not None, 'created notification not visible in list'

    s3, d3 = _request('PATCH', f'/notifications/{found["id"]}', token=token)
    assert s3 == 200
    assert d3['data']['notification']['is_read'] is True

    s4, _ = _request('DELETE', f'/notifications/{found["id"]}', token=token)
    assert s4 == 200


def test_muted_category_returns_skip_marker(token):
    # Mute money, attempt to send, assert the response shape.
    _request(
        'PUT', '/notifications/preferences',
        token=token, body={'money': False},
    )
    try:
        s, d = _request(
            'POST', '/notifications/',
            token=token,
            body={'title': 'should-skip', 'category': 'money', 'source': 't'},
        )
        assert s == 200
        assert d['data']['skipped'] is True
        assert d['data']['reason'] == 'category_muted'
    finally:
        _request(
            'PUT', '/notifications/preferences',
            token=token, body={'money': True},
        )


def test_audit_endpoint_responds(token):
    s, d = _request('GET', '/audit/?limit=3', token=token)
    assert s == 200
    assert isinstance(d['data']['events'], list)


def test_bookmarks_endpoint_responds(token):
    s, d = _request('GET', '/bookmarks/?limit=3', token=token)
    assert s == 200
    assert isinstance(d['data']['bookmarks'], list)


def test_events_endpoint_responds(token):
    s, d = _request('GET', '/events/?scope=upcoming&limit=3', token=token)
    assert s == 200
    assert isinstance(d['data']['events'], list)


def test_trending_endpoint_responds(token):
    s, d = _request('GET', '/discovery/trending?limit=3', token=token)
    assert s == 200
    assert isinstance(d['data']['topics'], list)
