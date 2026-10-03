"""
All the knobs, in one place, each with a default that matches what the
app has been doing all along — nothing here changes behavior unless you
set the environment variable. Reads a `.env` file if `python-dotenv` is
installed and one exists; otherwise falls back to real environment
variables, which is all that's required.
"""

import os

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass  # .env support is a nicety, not a dependency


def _bool(name, default):
    v = os.environ.get(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _int(name, default):
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


class Config:
    # Flask
    DEBUG = _bool("FLASK_DEBUG", True)
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-not-a-real-secret")
    HOST = os.environ.get("HOST", "127.0.0.1")
    PORT = _int("PORT", 5000)

    # Dukascopy poller
    POLL_INTERVAL_SECONDS = _int("POLL_INTERVAL_SECONDS", 5)
    POLL_LOOKBACK_MINUTES = _int("POLL_LOOKBACK_MINUTES", 3)
    CANDLE_HISTORY_BARS = _int("CANDLE_HISTORY_BARS", 620)

    # Quote history database (SQLite — stdlib, no extra dependency)
    DB_PATH = os.environ.get("DB_PATH", os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "data.db"
    ))
    # Ticks older than this are pruned on each write batch, so the
    # database stays a rolling window instead of growing forever.
    HISTORY_RETENTION_HOURS = _int("HISTORY_RETENTION_HOURS", 72)

    # Logging
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
