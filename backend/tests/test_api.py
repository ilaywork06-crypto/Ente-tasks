import base64
import os
import secrets

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["SECRET_KEY"] = "test"

import pyotp  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


def b64(n: int = 24) -> str:
    return base64.b64encode(secrets.token_bytes(n)).decode()


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    with TestClient(app) as c:
        yield c


def key_attrs():
    return {
        "kekSalt": b64(16),
        "opsLimit": 3,
        "memLimit": 268435456,
        "encryptedKey": b64(48),
        "keyDecryptionNonce": b64(),
        "masterKeyEncryptedWithRecoveryKey": b64(48),
        "masterKeyDecryptionNonce": b64(),
        "recoveryKeyEncryptedWithMasterKey": b64(48),
        "recoveryKeyDecryptionNonce": b64(),
    }


def signup(client, email="a@example.org", login_key="L" * 44):
    r = client.post(
        "/api/auth/signup",
        json={
            "email": email,
            "keyAttributes": key_attrs(),
            "loginKey": login_key,
            "recoveryAuthKey": "R" * 44,
        },
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_signup_login_and_data(client):
    token = signup(client)
    h = {"X-Auth-Token": token}
    assert client.get("/api/users/me", headers=h).json()["email"] == "a@example.org"

    # Unknown emails get decoy params, stable across calls.
    p1 = client.post("/api/auth/params", json={"email": "x@example.org"}).json()
    p2 = client.post("/api/auth/params", json={"email": "x@example.org"}).json()
    assert p1 == p2

    assert client.post("/api/auth/login", json={"email": "a@example.org", "loginKey": "nope"}).status_code == 401
    r = client.post("/api/auth/login", json={"email": "A@example.org", "loginKey": "L" * 44})
    assert r.status_code == 200 and r.json()["token"]

    lst = client.post(
        "/api/lists",
        headers=h,
        json={"encryptedKey": b64(), "keyDecryptionNonce": b64(), "encryptedData": b64(), "dataDecryptionNonce": b64()},
    ).json()
    task = client.post(
        "/api/tasks", headers=h, json={"listId": lst["id"], "encryptedData": b64(), "decryptionNonce": b64()}
    ).json()
    assert client.post(f"/api/tasks/{task['id']}/trash", headers=h).json()["isTrashed"]
    assert not client.post(f"/api/tasks/{task['id']}/restore", headers=h).json()["isTrashed"]

    # Another user can't see or touch it.
    other = {"X-Auth-Token": signup(client, "b@example.org")}
    assert client.get("/api/tasks", headers=other).json() == []
    assert client.post(f"/api/tasks/{task['id']}/trash", headers=other).status_code == 404

    client.post(f"/api/tasks/{task['id']}/trash", headers=h)
    client.post("/api/trash/empty", headers=h)
    assert client.get("/api/tasks", headers=h).json() == []


def test_two_factor_and_recovery(client):
    h = {"X-Auth-Token": signup(client)}
    secret = client.post("/api/users/me/two-factor/setup", headers=h).json()["secret"]
    code = pyotp.TOTP(secret).now()
    assert client.post("/api/users/me/two-factor/enable", headers=h, json={"code": code}).json()["twoFactorEnabled"]

    r = client.post("/api/auth/login", json={"email": "a@example.org", "loginKey": "L" * 44}).json()
    assert "token" not in r
    r = client.post(
        "/api/auth/two-factor/verify",
        json={"twoFactorSessionId": r["twoFactorSessionId"], "code": pyotp.TOTP(secret).now()},
    )
    assert r.status_code == 200 and r.json()["token"]

    new_pw = {k: v for k, v in key_attrs().items() if k in ("kekSalt", "opsLimit", "memLimit", "encryptedKey", "keyDecryptionNonce")}
    new_pw["loginKey"] = "N" * 44
    r = client.post("/api/auth/recover", json={"email": "a@example.org", "recoveryAuthKey": "bad", "newPassword": new_pw})
    assert r.status_code == 401
    r = client.post("/api/auth/recover", json={"email": "a@example.org", "recoveryAuthKey": "R" * 44, "newPassword": new_pw})
    assert r.status_code == 200
    # Old sessions are gone.
    assert client.get("/api/users/me", headers=h).status_code == 401
    assert client.post("/api/auth/login", json={"email": "a@example.org", "loginKey": "L" * 44}).status_code == 401
