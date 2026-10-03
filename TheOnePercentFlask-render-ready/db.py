"""
A small SQLite-backed history of everything the Dukascopy poller has
fetched. Plain stdlib `sqlite3` rather than an ORM — this is one table
with one access pattern (append, read-recent, prune-old), which is
exactly the amount of database a hand-rolled wrapper handles fine
without pulling in SQLAlchemy for a project that otherwise has zero
Python dependencies beyond Flask and dukascopy-python itself.

Every quote the poller successfully fetches gets a row here, so:
  - the app has real history across restarts, not just "whatever's in
    the in-memory cache right now"
  - GET /api/history/<symbol> can answer with more than one point
  - the health endpoint can report when each symbol was last seen,
    not just whether the poller thread is technically alive

A `threading.Lock` serializes writes (SQLite handles one writer fine;
it's concurrent writers from multiple threads that need coordinating),
and every call opens its own short-lived connection rather than sharing
one across threads, which sidesteps sqlite3's "objects created in one
thread" restriction entirely.
"""

import sqlite3
import threading
import time

_write_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    bid REAL NOT NULL,
    ask REAL NOT NULL,
    price REAL NOT NULL,
    tick_time TEXT,
    fetched_at REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'dukascopy'
);
CREATE INDEX IF NOT EXISTS idx_quotes_symbol_fetched
    ON quotes (symbol, fetched_at);
"""


def _connect(db_path):
    conn = sqlite3.connect(db_path, timeout=5)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(db_path):
    with _write_lock:
        conn = _connect(db_path)
        try:
            conn.executescript(SCHEMA)
            conn.commit()
        finally:
            conn.close()


def insert_quote(db_path, quote):
    """quote: dict with symbol/bid/ask/price/time/source, as produced by
    DukascopyPoller._poll_one(). Silently a no-op on malformed input —
    a bad row should never take the poller down."""
    required = ("symbol", "bid", "ask", "price")
    if not all(k in quote for k in required):
        return
    with _write_lock:
        conn = _connect(db_path)
        try:
            conn.execute(
                "INSERT INTO quotes (symbol, bid, ask, price, tick_time, "
                "fetched_at, source) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (
                    quote["symbol"],
                    quote["bid"],
                    quote["ask"],
                    quote["price"],
                    quote.get("time"),
                    time.time(),
                    quote.get("source", "dukascopy"),
                ),
            )
            conn.commit()
        finally:
            conn.close()


def get_history(db_path, symbol, limit=500):
    """Most recent `limit` rows for a symbol, oldest first (chart-ready
    order) — a client that wants the latest point just reads the last
    element rather than the whole app re-sorting on every request."""
    conn = _connect(db_path)
    try:
        rows = conn.execute(
            "SELECT symbol, bid, ask, price, tick_time, fetched_at, source "
            "FROM quotes WHERE symbol = ? ORDER BY fetched_at DESC LIMIT ?",
            (symbol.upper(), max(1, min(limit, 5000))),
        ).fetchall()
    finally:
        conn.close()
    return [dict(r) for r in reversed(rows)]


def prune_old(db_path, retention_hours):
    cutoff = time.time() - retention_hours * 3600
    with _write_lock:
        conn = _connect(db_path)
        try:
            conn.execute("DELETE FROM quotes WHERE fetched_at < ?", (cutoff,))
            conn.commit()
        finally:
            conn.close()


def get_stats(db_path):
    """Per-symbol row count and most recent fetch, for /api/health."""
    conn = _connect(db_path)
    try:
        total = conn.execute("SELECT COUNT(*) AS n FROM quotes").fetchone()["n"]
        per_symbol = conn.execute(
            "SELECT symbol, COUNT(*) AS n, MAX(fetched_at) AS last_seen "
            "FROM quotes GROUP BY symbol ORDER BY symbol"
        ).fetchall()
    finally:
        conn.close()
    return {
        "total_rows": total,
        "symbols": [dict(r) for r in per_symbol],
    }
