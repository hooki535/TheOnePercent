"""
Runs the real app, with two changes so it works offline and fast:
  - a tmp_path SQLite file instead of the real data.db
  - the DukascopyPoller replaced with a fake that never touches the
    network (its own poll loop is tested in test_dukascopy_feed.py)

    pip install -r requirements-dev.txt
    pytest
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import db as db_module
from dukascopy_feed import SYMBOL_MAP


class FakePoller:
    """Same shape as DukascopyPoller.latest()/status(), no thread, no
    network — so tests never depend on Dukascopy actually being up."""

    def __init__(self):
        self._cache = {
            "EURUSD": {
                "symbol": "EURUSD",
                "bid": 1.1000,
                "ask": 1.1002,
                "price": 1.1001,
                "time": "2026-01-01T00:00:00+00:00",
                "source": "dukascopy",
            }
        }

    def latest(self, symbol=None):
        if symbol:
            return self._cache.get(symbol.upper())
        return dict(self._cache)

    def status(self):
        return {
            "running": True,
            "started_at": 0,
            "uptime_seconds": 1.0,
            "symbols_tracked": len(SYMBOL_MAP),
            "symbols_failing": {},
            "rounds_completed": 1,
        }

    def start(self):
        pass

    def stop(self):
        pass


@pytest.fixture
def app(tmp_path, monkeypatch):
    import importlib

    db_path = tmp_path / "test.db"
    monkeypatch.setenv("DB_PATH", str(db_path))
    monkeypatch.setenv("FLASK_DEBUG", "false")

    # Config.* are class attributes read once at class-definition time,
    # so a plain re-import after setenv wouldn't see the new value on
    # the second and later tests (the module's already in sys.modules)
    # — reload it so each test's tmp_path actually takes effect.
    import config
    importlib.reload(config)

    # Patch the poller before app.py's module-level `app = create_app()`
    # runs (that happens on the reload() below), so no real thread ever
    # touches the network or the real data.db.
    import dukascopy_feed
    monkeypatch.setattr(dukascopy_feed, "DukascopyPoller", lambda **kw: FakePoller())

    import app as app_module
    importlib.reload(app_module)

    app_module.app.config.update(TESTING=True)
    return app_module.app


@pytest.fixture
def client(app):
    return app.test_client()


PAGE_ROUTES = [
    "/", "/dashboard", "/charts", "/journal", "/calculators",
    "/learn", "/login", "/onboarding", "/settings", "/sign-up",
]


@pytest.mark.parametrize("path", PAGE_ROUTES)
def test_pages_render(client, path):
    r = client.get(path)
    assert r.status_code == 200
    assert b"<html" in r.data.lower()


def test_static_assets_serve(client):
    r = client.get("/static/styles.css")
    assert r.status_code == 200
    r = client.get("/static/assets/feed.js")
    assert r.status_code == 200


def test_dead_link_still_404s(client):
    # pages/markets.html was already a dead link in the original static
    # site — confirming it still behaves the same way under Flask.
    r = client.get("/pages/markets.html")
    assert r.status_code == 404


def test_unknown_route_renders_error_page(client):
    r = client.get("/this-does-not-exist")
    assert r.status_code == 404
    assert b"Page not found" in r.data


def test_quote_known_symbol(client):
    r = client.get("/api/quote/eurusd")
    assert r.status_code == 200
    body = r.get_json()
    assert body["symbol"] == "EURUSD"
    assert body["bid"] == 1.1000


def test_quote_unknown_symbol_404s(client):
    r = client.get("/api/quote/zzzzzz")
    assert r.status_code == 404
    assert "error" in r.get_json()


def test_quotes_returns_cache(client):
    r = client.get("/api/quotes")
    assert r.status_code == 200
    assert "EURUSD" in r.get_json()


def test_symbols_lists_dukascopy_coverage(client):
    r = client.get("/api/symbols")
    assert r.status_code == 200
    live = r.get_json()["live"]
    assert "XAUUSD" in live
    assert "SOLUSD" not in live  # not on Dukascopy's free feed


def test_history_empty_then_populated(app, client):
    r = client.get("/api/history/EURUSD")
    assert r.status_code == 200
    assert r.get_json()["count"] == 0

    db_module.insert_quote(app.config["DB_PATH"], {
        "symbol": "EURUSD", "bid": 1.1, "ask": 1.1002, "price": 1.1001,
        "time": "2026-01-01T00:00:00+00:00", "source": "dukascopy",
    })
    r = client.get("/api/history/EURUSD")
    body = r.get_json()
    assert body["count"] == 1
    assert body["quotes"][0]["bid"] == 1.1


def test_history_unknown_symbol_404s(client):
    r = client.get("/api/history/ZZZZZZ")
    assert r.status_code == 404


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.get_json()
    assert body["ok"] is True
    assert body["poller"]["running"] is True
    assert body["db_ok"] is True
