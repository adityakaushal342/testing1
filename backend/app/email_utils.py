"""Email delivery.

If SMTP_HOST is configured, real emails are sent via SMTP. Otherwise (dev default),
the message is printed to the console and appended to backend/sent_emails.log so you
can test verification / reset flows without a mail server.
"""
import datetime
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path

from .config import settings

_LOG_FILE = Path(__file__).resolve().parent.parent / "sent_emails.log"


def build_link(purpose: str, token: str) -> str:
    """Build the link the user clicks. `purpose` is 'verify' or 'reset'.

    Points at the auth page (auth.html), which reads ?mode & ?token and calls the API.
    """
    mode = "verify" if purpose == "verify" else "reset"
    return f"{settings.FRONTEND_URL.rstrip('/')}/auth.html?mode={mode}&token={token}"


def send_email(to: str, subject: str, body: str) -> None:
    if settings.SMTP_HOST:
        _send_smtp(to, subject, body)
    else:
        _log_email(to, subject, body)


def _send_smtp(to: str, subject: str, body: str) -> None:
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    if settings.SMTP_TLS:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls(context=context)
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
    else:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)


def _log_email(to: str, subject: str, body: str) -> None:
    stamp = datetime.datetime.utcnow().isoformat()
    entry = (
        f"\n{'=' * 70}\n[{stamp}] EMAIL (dev mode — not actually sent)\n"
        f"To: {to}\nSubject: {subject}\n{'-' * 70}\n{body}\n{'=' * 70}\n"
    )
    print(entry)
    try:
        with open(_LOG_FILE, "a", encoding="utf-8") as fh:
            fh.write(entry)
    except OSError:
        pass
