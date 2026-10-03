import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import db


def test_init_is_idempotent(tmp_path):
    p = str(tmp_path / "t.db")
    db.init_db(p)
    db.init_db(p)  # must not raise on a second call


def test_insert_and_get_history_ordering(tmp_path):
    p = str(tmp_path / "t.db")
    db.init_db(p)
    for i in range(3):
        db.insert_quote(p, {
            "symbol": "EURUSD", "bid": 1.1 + i * 0.0001, "ask": 1.1002,
            "price": 1.1001, "time": f"t{i}", "source": "dukascopy",
        })
        time.sleep(0.01)
    rows = db.get_history(p, "eurusd", limit=10)
    assert len(rows) == 3
    # oldest first
    assert rows[0]["bid"] < rows[1]["bid"] < rows[2]["bid"]


def test_get_history_respects_limit(tmp_path):
    p = str(tmp_path / "t.db")
    db.init_db(p)
    for i in range(10):
        db.insert_quote(p, {"symbol": "XAUUSD", "bid": i, "ask": i, "price": i})
    rows = db.get_history(p, "XAUUSD", limit=3)
    assert len(rows) == 3
    assert rows[-1]["bid"] == 9  # most recent is last


def test_insert_quote_ignores_malformed_rows(tmp_path):
    p = str(tmp_path / "t.db")
    db.init_db(p)
    db.insert_quote(p, {"symbol": "EURUSD"})  # missing bid/ask/price
    assert db.get_history(p, "EURUSD") == []


def test_prune_old_removes_stale_rows(tmp_path, monkeypatch):
    p = str(tmp_path / "t.db")
    db.init_db(p)
    db.insert_quote(p, {"symbol": "EURUSD", "bid": 1, "ask": 1, "price": 1})
    # everything currently in the table is "older than -1 hours from now"
    db.prune_old(p, retention_hours=-1)
    assert db.get_history(p, "EURUSD") == []


def test_get_stats_counts_rows_per_symbol(tmp_path):
    p = str(tmp_path / "t.db")
    db.init_db(p)
    db.insert_quote(p, {"symbol": "EURUSD", "bid": 1, "ask": 1, "price": 1})
    db.insert_quote(p, {"symbol": "EURUSD", "bid": 1, "ask": 1, "price": 1})
    db.insert_quote(p, {"symbol": "XAUUSD", "bid": 1, "ask": 1, "price": 1})
    stats = db.get_stats(p)
    assert stats["total_rows"] == 3
    by_symbol = {s["symbol"]: s["n"] for s in stats["symbols"]}
    assert by_symbol == {"EURUSD": 2, "XAUUSD": 1}
