"""
Polls Dukascopy's free tick feed via the dukascopy-python library and keeps
the most recent quote for each subscribed symbol in memory, so a Flask
request never blocks on a network round trip to Dukascopy.

Important context for whoever reads this later: Dukascopy has no public
real-time streaming API for retail use. This is the same historical tick
warehouse the desktop JForex platform reads from — dukascopy-python just
downloads slices of it. Ticks generally show up somewhere between under a
second and a few seconds after they print, so "poll every 5 seconds" means
"check for anything newer every 5 seconds", not a guaranteed live-to-the-
millisecond feed. It's plenty for a dashboard or a journal; don't route
real orders off it.
"""

import logging
import threading
import time
from datetime import datetime, timedelta, timezone

import dukascopy_python

log = logging.getLogger("dukascopy_feed")
from dukascopy_python.instruments import (
    INSTRUMENT_FX_MAJORS_EUR_USD,
    INSTRUMENT_FX_MAJORS_GBP_USD,
    INSTRUMENT_FX_MAJORS_USD_JPY,
    INSTRUMENT_FX_MAJORS_USD_CHF,
    INSTRUMENT_FX_MAJORS_USD_CAD,
    INSTRUMENT_FX_MAJORS_AUD_USD,
    INSTRUMENT_FX_MAJORS_NZD_USD,
    INSTRUMENT_FX_CROSSES_EUR_JPY,
    INSTRUMENT_FX_CROSSES_GBP_JPY,
    INSTRUMENT_FX_CROSSES_EUR_GBP,
    INSTRUMENT_FX_METALS_XAU_USD,
    INSTRUMENT_FX_METALS_XAG_USD,
    INSTRUMENT_VCCY_BTC_USD,
    INSTRUMENT_VCCY_ETH_USD,
)

# Symbols TheOnePercent already knows about (assets/feed.js / instruments.js)
# mapped to the dukascopy-python instrument constants that carry them.
# Anything NOT in this table — indices, futures, SOLUSD, the local-bank
# pairs (USDUGX/USDKES/USDZAR) — has no free Dukascopy feed, so the
# frontend just keeps generating those symbols synthetically forever.
SYMBOL_MAP = {
    "EURUSD": INSTRUMENT_FX_MAJORS_EUR_USD,
    "GBPUSD": INSTRUMENT_FX_MAJORS_GBP_USD,
    "USDJPY": INSTRUMENT_FX_MAJORS_USD_JPY,
    "USDCHF": INSTRUMENT_FX_MAJORS_USD_CHF,
    "USDCAD": INSTRUMENT_FX_MAJORS_USD_CAD,
    "AUDUSD": INSTRUMENT_FX_MAJORS_AUD_USD,
    "NZDUSD": INSTRUMENT_FX_MAJORS_NZD_USD,
    "EURJPY": INSTRUMENT_FX_CROSSES_EUR_JPY,
    "GBPJPY": INSTRUMENT_FX_CROSSES_GBP_JPY,
    "EURGBP": INSTRUMENT_FX_CROSSES_EUR_GBP,
    "XAUUSD": INSTRUMENT_FX_METALS_XAU_USD,
    "XAGUSD": INSTRUMENT_FX_METALS_XAG_USD,
    "BTCUSD": INSTRUMENT_VCCY_BTC_USD,
    "ETHUSD": INSTRUMENT_VCCY_ETH_USD,
}


class DukascopyPoller:
    """Background thread that refreshes a symbol -> quote cache every
    `interval_seconds`, using a short rolling tick window per symbol."""

    def __init__(
        self,
        symbols=None,
        interval_seconds=5,
        lookback_minutes=3,
        on_quote=None,
        on_frame=None,
        prune_every_rounds=0,
        prune_fn=None,
    ):
        self.symbols = [s for s in (symbols or SYMBOL_MAP) if s in SYMBOL_MAP]
        self.interval_seconds = interval_seconds
        self.lookback_minutes = lookback_minutes
        # Called with the fresh quote dict after every successful poll —
        # this is how db.insert_quote gets wired in from app.py, kept
        # optional so the poller has no hard dependency on the database
        # (and tests can run it with no callback at all).
        self.on_quote = on_quote
        self.on_frame = on_frame
        self.prune_every_rounds = prune_every_rounds
        self.prune_fn = prune_fn
        self._cache = {}
        self._fail_streak = {}
        self._lock = threading.Lock()
        self._thread = None
        self._running = False
        self._rounds = 0
        self.started_at = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._running = True
        self.started_at = time.time()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        log.info("poller started for %d symbols, every %ss", len(self.symbols), self.interval_seconds)

    def stop(self):
        self._running = False

    def latest(self, symbol=None):
        with self._lock:
            if symbol:
                return self._cache.get(symbol.upper())
            return dict(self._cache)

    def status(self):
        """A snapshot for /api/health: is the thread alive, how long has
        it run, and which symbols are currently failing."""
        with self._lock:
            failing = {s: n for s, n in self._fail_streak.items() if n > 0}
        return {
            "running": bool(self._thread and self._thread.is_alive()),
            "started_at": self.started_at,
            "uptime_seconds": (time.time() - self.started_at) if self.started_at else None,
            "symbols_tracked": len(self.symbols),
            "symbols_failing": failing,
            "rounds_completed": self._rounds,
        }

    def _run(self):
        while self._running:
            round_start = time.time()
            for sym in self.symbols:
                try:
                    self._poll_one(sym)
                    with self._lock:
                        self._fail_streak[sym] = 0
                except Exception as exc:
                    # One bad/slow symbol should never take the whole
                    # poller down — keep serving whatever was cached last
                    # and just note the error against that symbol.
                    with self._lock:
                        streak = self._fail_streak.get(sym, 0) + 1
                        self._fail_streak[sym] = streak
                        prev = self._cache.get(sym, {"symbol": sym})
                        prev["error"] = str(exc)
                        self._cache[sym] = prev
                    if streak == 1 or streak % 12 == 0:
                        # Log the first failure immediately, then only
                        # every ~minute after that — a symbol that's down
                        # for an hour shouldn't write an hour of log lines.
                        log.warning("poll failed for %s (streak=%d): %s", sym, streak, exc)
            self._rounds += 1
            if self.prune_fn and self.prune_every_rounds and self._rounds % self.prune_every_rounds == 0:
                try:
                    self.prune_fn()
                except Exception as exc:
                    log.warning("history prune failed: %s", exc)
            elapsed = time.time() - round_start
            time.sleep(max(0.5, self.interval_seconds - elapsed))

    def _poll_one(self, sym):
        end = datetime.now(timezone.utc)
        start = end - timedelta(minutes=self.lookback_minutes)
        df = dukascopy_python.fetch(
            instrument=SYMBOL_MAP[sym],
            interval=dukascopy_python.INTERVAL_TICK,
            offer_side=dukascopy_python.OFFER_SIDE_BID,
            start=start,
            end=end,
            max_retries=1,
        )
        if df is None or df.empty:
            return
        if self.on_frame:
            try:
                self.on_frame(sym, df)
            except Exception as exc:
                log.warning("on_frame callback failed for %s: %s", sym, exc)
        row = df.iloc[-1]
        bid = float(row["bidPrice"])
        ask = float(row["askPrice"]) if "askPrice" in row else bid
        ts = row.name
        quote = {
            "symbol": sym,
            "bid": bid,
            "ask": ask,
            "price": (bid + ask) / 2,
            "time": ts.isoformat() if hasattr(ts, "isoformat") else str(ts),
            "source": "dukascopy",
        }
        with self._lock:
            self._cache[sym] = quote
        if self.on_quote:
            try:
                self.on_quote(quote)
            except Exception as exc:
                log.warning("on_quote callback failed for %s: %s", sym, exc)
