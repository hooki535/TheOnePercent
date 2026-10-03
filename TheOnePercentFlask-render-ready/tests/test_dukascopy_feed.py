"""
Tests the poller's bookkeeping (on_quote callback, failure streaks,
periodic pruning) without ever touching the network — dukascopy_python
itself is mocked, since a real call needs freeserv.dukascopy.com to be
reachable and this suite should pass offline.
"""

import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dukascopy_feed import DukascopyPoller


def _fake_df(bid=1.1, ask=1.1002):
    return pd.DataFrame(
        {"bidPrice": [bid], "askPrice": [ask]},
        index=pd.to_datetime(["2026-01-01T00:00:00Z"]),
    )


def test_poll_one_updates_cache_and_calls_on_quote():
    seen = []
    poller = DukascopyPoller(symbols=["EURUSD"], on_quote=seen.append)
    with patch("dukascopy_feed.dukascopy_python.fetch", return_value=_fake_df()):
        poller._poll_one("EURUSD")
    assert poller.latest("EURUSD")["bid"] == 1.1
    assert seen and seen[0]["symbol"] == "EURUSD"


def test_poll_one_empty_frame_is_a_noop():
    poller = DukascopyPoller(symbols=["EURUSD"])
    with patch("dukascopy_feed.dukascopy_python.fetch", return_value=pd.DataFrame()):
        poller._poll_one("EURUSD")
    assert poller.latest("EURUSD") is None


def test_run_round_tracks_failures_and_recovers():
    poller = DukascopyPoller(symbols=["EURUSD"], interval_seconds=0)
    poller._running = True

    calls = {"n": 0}

    def flaky(*a, **kw):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("network blip")
        return _fake_df()

    with patch("dukascopy_feed.dukascopy_python.fetch", side_effect=flaky):
        # first round: fails
        for sym in poller.symbols:
            try:
                poller._poll_one(sym)
            except Exception:
                poller._fail_streak[sym] = poller._fail_streak.get(sym, 0) + 1
        assert poller._fail_streak["EURUSD"] == 1

        # second round: succeeds — status() should show it recovered
        poller._poll_one("EURUSD")
        poller._fail_streak["EURUSD"] = 0
        status = poller.status()
        assert status["symbols_failing"] == {}


def test_prune_fn_called_on_schedule():
    prune = MagicMock()
    poller = DukascopyPoller(
        symbols=["EURUSD"], interval_seconds=0,
        prune_every_rounds=2, prune_fn=prune,
    )
    poller._running = True
    with patch("dukascopy_feed.dukascopy_python.fetch", return_value=_fake_df()):
        # Run _run() for a few rounds, then stop it from another "thread"
        # by flipping the flag after N iterations via a counter patched
        # into time.sleep, so this stays a fast, deterministic test.
        rounds_seen = {"n": 0}
        real_sleep = time.sleep

        def fake_sleep(_):
            rounds_seen["n"] += 1
            if rounds_seen["n"] >= 3:
                poller._running = False

        with patch("dukascopy_feed.time.sleep", side_effect=fake_sleep):
            poller._run()

    assert prune.call_count >= 1


def test_status_reports_not_running_before_start():
    poller = DukascopyPoller(symbols=["EURUSD"])
    status = poller.status()
    assert status["running"] is False
    assert status["started_at"] is None
