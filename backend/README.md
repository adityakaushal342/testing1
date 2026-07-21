# AI Trading Master — Auth Backend (FastAPI)

Secure authentication service: **Register, Login, Email Verification, Forgot/Reset
Password, JWT (access + rotating refresh), Logout, and a Google-login stub (future).**

Runs with **zero setup** on SQLite in dev; switch to PostgreSQL + SMTP with env vars.

## Features

| Feature | Endpoint |
|---|---|
| Register | `POST /auth/register` |
| Email verification | `POST /auth/verify-email` · `POST /auth/resend-verification` |
| Login (JWT) | `POST /auth/login` |
| Current user | `GET /auth/me` (Bearer token) |
| Refresh token (rotation) | `POST /auth/refresh` |
| Logout (revoke refresh) | `POST /auth/logout` |
| Forgot password | `POST /auth/forgot-password` |
| Reset password | `POST /auth/reset-password` |
| Google login (future) | `GET /auth/google/login` → 501 |

### Security
- Passwords hashed with **bcrypt** (never stored in plaintext).
- **JWT access tokens** (short-lived, 15 min) + **opaque refresh tokens** stored only as
  SHA-256 hashes, with **rotation** on refresh and **revocation** on logout / password reset.
- Email verification & reset tokens are single-use, time-limited, and stored hashed.
- Generic responses on forgot-password / resend to avoid **email enumeration**.
- Role-based access (`user` / `admin`) via `require_role(...)`.

## Users table (as specified)
`id` (UUID) · `name` · `email` (unique) · `password_hash` · `role` · `created_at`
(plus `is_verified`, `is_active`). See `app/models.py`.

## Quick start

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# (optional) seed demo accounts
python seed.py
#   admin@aitradingmaster.com / Admin@12345   (admin)
#   demo@aitradingmaster.com  / Demo@12345    (user)

# run everything (API + frontend served together)
uvicorn app.main:app --reload
```

One server now serves the whole product at **http://localhost:8000**:

| URL | What |
|---|---|
| `/` | Landing page (`index.html`) |
| `/auth.html` | **Real** Login / Register / Verify / Forgot / Reset (talks to the API) |
| `/app.html` | Demo trading app |
| `/docs` | Interactive Swagger UI |
| `/auth/*` | The auth API |

Because the frontend is same-origin with the API, there are no CORS issues and
verification / reset email links resolve to the real page. Open **`/auth.html`**,
register, click **"Verify my email now"** (shown in dev mode), then log in.

> The same `/auth/*` API is what a future **Flutter mobile app** or **Next.js**
> frontend will call — this backend is the shared foundation for web and mobile.

## Try it (curl)

```bash
# 1. Register (dev mode returns the verification link)
curl -s localhost:8000/auth/register -H 'content-type: application/json' \
  -d '{"name":"Ali","email":"ali@example.com","password":"Str0ng@Pass1"}'

# 2. Verify with the dev_token from the previous response
curl -s localhost:8000/auth/verify-email -H 'content-type: application/json' \
  -d '{"token":"PASTE_DEV_TOKEN"}'

# 3. Login -> access_token + refresh_token
curl -s localhost:8000/auth/login -H 'content-type: application/json' \
  -d '{"email":"ali@example.com","password":"Str0ng@Pass1"}'

# 4. Call a protected route
curl -s localhost:8000/auth/me -H 'authorization: Bearer ACCESS_TOKEN'
```

## Test

```bash
python smoke_test.py    # 25 end-to-end assertions across the whole flow
```

## Configuration

Copy `.env.example` → `.env`. All values have safe dev defaults. For production set at
least `SECRET_KEY`, `DATABASE_URL` (Postgres), `DEV_EXPOSE_TOKENS=false`, and the `SMTP_*`
vars. In dev (no SMTP configured) emails are printed to the console and appended to
`sent_emails.log`, and verification/reset links are returned in the API response.

## Notes / next steps
- Dev creates tables automatically. For production use **Alembic** migrations.
- Add rate limiting (e.g. slowapi / gateway) on `/auth/login`, `/auth/forgot-password`.
- Google OAuth: wire `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` into `/auth/google/login`.
- Frontend (Next.js): store the access token in memory and the refresh token in an
  httpOnly cookie; call `/auth/refresh` on 401.
