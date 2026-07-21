"""End-to-end smoke test of the auth flow using FastAPI's TestClient (in-memory SQLite).

Run:  python smoke_test.py
Exercises: register -> verify -> login -> me -> refresh(rotation) -> logout ->
forgot -> reset -> login-with-new-password, plus negative cases.
"""
import os
import tempfile

# Use a throwaway SQLite DB so we never touch the real one.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ["DEV_EXPOSE_TOKENS"] = "true"
os.environ["REQUIRE_VERIFICATION"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.database import init_db  # noqa: E402
from app.main import app  # noqa: E402

init_db()  # TestClient (without a context manager) doesn't run lifespan, so create tables here.
client = TestClient(app)
EMAIL = "tester@example.com"
PW = "Str0ng@Pass1"
NEW_PW = "N3w@Password9"
ok = 0


def check(name, cond):
    global ok
    assert cond, f"FAILED: {name}"
    ok += 1
    print(f"  ✓ {name}")


print("1) register")
r = client.post("/auth/register", json={"name": "Tester", "email": EMAIL, "password": PW})
check("register returns 201", r.status_code == 201)
verify_token = r.json()["dev_token"]
check("verification token exposed in dev", bool(verify_token))

print("2) duplicate register blocked")
r = client.post("/auth/register", json={"name": "Tester", "email": EMAIL, "password": PW})
check("duplicate email -> 409", r.status_code == 409)

print("3) login before verification blocked")
r = client.post("/auth/login", json={"email": EMAIL, "password": PW})
check("unverified login -> 403", r.status_code == 403)

print("4) verify email")
r = client.post("/auth/verify-email", json={"token": verify_token})
check("verify -> 200", r.status_code == 200)
r = client.post("/auth/verify-email", json={"token": verify_token})
check("token is single-use (reuse -> 400)", r.status_code == 400)

print("5) login")
r = client.post("/auth/login", json={"email": EMAIL, "password": PW})
check("login -> 200", r.status_code == 200)
tok = r.json()
access, refresh = tok["access_token"], tok["refresh_token"]
check("returns access + refresh", bool(access) and bool(refresh))
check("user payload has no password_hash", "password_hash" not in tok["user"])

print("6) wrong password rejected")
r = client.post("/auth/login", json={"email": EMAIL, "password": "wrong-pass"})
check("bad password -> 401", r.status_code == 401)

print("7) /me protected")
r = client.get("/auth/me", headers={"Authorization": f"Bearer {access}"})
check("me with token -> 200", r.status_code == 200 and r.json()["email"] == EMAIL)
r = client.get("/auth/me")
check("me without token -> 403", r.status_code == 403)
r = client.get("/auth/me", headers={"Authorization": "Bearer garbage"})
check("me with bad token -> 401", r.status_code == 401)

print("8) refresh rotation")
r = client.post("/auth/refresh", json={"refresh_token": refresh})
check("refresh -> 200", r.status_code == 200)
new_refresh = r.json()["refresh_token"]
check("new refresh differs", new_refresh != refresh)
r = client.post("/auth/refresh", json={"refresh_token": refresh})
check("old refresh revoked after rotation -> 401", r.status_code == 401)

print("9) logout revokes refresh")
r = client.post("/auth/logout", json={"refresh_token": new_refresh})
check("logout -> 200", r.status_code == 200)
r = client.post("/auth/refresh", json={"refresh_token": new_refresh})
check("refresh after logout -> 401", r.status_code == 401)

print("10) forgot + reset password")
r = client.post("/auth/forgot-password", json={"email": EMAIL})
check("forgot -> 200", r.status_code == 200)
reset_token = r.json()["dev_token"]
r = client.post("/auth/reset-password", json={"token": reset_token, "new_password": NEW_PW})
check("reset -> 200", r.status_code == 200)
r = client.post("/auth/login", json={"email": EMAIL, "password": PW})
check("old password rejected -> 401", r.status_code == 401)
r = client.post("/auth/login", json={"email": EMAIL, "password": NEW_PW})
check("new password works -> 200", r.status_code == 200)

print("11) forgot for unknown email is generic (no enumeration)")
r = client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
check("unknown email -> 200 generic", r.status_code == 200)

print("12) google login is a 'future' stub")
r = client.get("/auth/google/login")
check("google -> 501", r.status_code == 501)

print("13) validation")
r = client.post("/auth/register", json={"name": "X", "email": "not-an-email", "password": "short"})
check("bad input -> 422", r.status_code == 422)

print(f"\nALL {ok} CHECKS PASSED ✅")
os.unlink(_tmp.name)
