"""Application settings, sourced from environment variables with dev-friendly defaults.

For production, override at minimum: SECRET_KEY, DATABASE_URL, and the SMTP_* vars.
"""
import os


def _bool(name: str, default: str) -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    # --- Security / JWT ---
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-insecure-secret-change-me-in-production-please")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MIN: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MIN", "15"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # --- Database ---
    # Dev default: SQLite file. Production: set DATABASE_URL to a Postgres DSN, e.g.
    #   postgresql+psycopg://user:pass@host:5432/tradingmaster
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./tradingmaster.db")

    # --- Auth behaviour ---
    REQUIRE_VERIFICATION: bool = _bool("REQUIRE_VERIFICATION", "true")
    VERIFY_TOKEN_EXPIRE_H: int = int(os.getenv("VERIFY_TOKEN_EXPIRE_H", "24"))
    RESET_TOKEN_EXPIRE_MIN: int = int(os.getenv("RESET_TOKEN_EXPIRE_MIN", "30"))

    # In dev we return verification / reset links directly in API responses and log the
    # "email" to the console so you can test without a real SMTP server. Turn OFF in prod.
    DEV_EXPOSE_TOKENS: bool = _bool("DEV_EXPOSE_TOKENS", "true")

    # --- URLs ---
    # Where the frontend lives; used to build verification / reset links.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    # --- Email (SMTP). If SMTP_HOST is empty, emails are logged to console/file instead. ---
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "AI Trading Master <no-reply@aitradingmaster.local>")
    SMTP_TLS: bool = _bool("SMTP_TLS", "true")

    # --- Google OAuth (future) ---
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")


settings = Settings()
