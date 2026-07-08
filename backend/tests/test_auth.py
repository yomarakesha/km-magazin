def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"password": "nope"})
    assert r.status_code == 401


def test_login_ok_sets_session_cookie(client):
    r = client.post("/api/auth/login", json={"password": "test-password"})
    assert r.status_code == 200
    assert "km_admin" in r.cookies


def test_me_requires_session(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_with_session(client):
    client.post("/api/auth/login", json={"password": "test-password"})
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json() == {"authenticated": True}


def test_admin_api_requires_session(client):
    assert client.get("/api/admin/shop/orders").status_code == 401
