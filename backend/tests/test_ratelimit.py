def test_login_rate_limited_after_5_attempts(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 429


def test_rate_limit_resets_between_tests(client):
    """The autouse fixture cleared the bucket the previous test filled."""
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
