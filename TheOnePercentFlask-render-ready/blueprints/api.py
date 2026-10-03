"""HTTP API for real Dukascopy quotes, historical candles and live updates."""

import json
import logging
import time

from flask import Blueprint, Response, current_app, jsonify, request, stream_with_context

import db
from candle_engine import CandleService
from dukascopy_feed import SYMBOL_MAP

api = Blueprint("api", __name__, url_prefix="/api")
log = logging.getLogger("api")


def _poller():
    return current_app.extensions["dukascopy_poller"]


def _candles():
    return current_app.extensions["candle_service"]


def _live():
    return current_app.extensions["live_candles"]


@api.get("/quote/<symbol>")
def quote(symbol):
    q = _poller().latest(symbol.upper())
    if not q:
        return jsonify({"error": f"no data yet for {symbol.upper()}"}), 404
    return jsonify(q)


@api.get("/quotes")
def quotes():
    return jsonify(_poller().latest())


@api.get("/candles/<symbol>/<timeframe>")
def candles(symbol, timeframe):
    symbol = symbol.upper()
    if symbol not in SYMBOL_MAP:
        return jsonify({"error": f"{symbol} has no Dukascopy feed"}), 404
    try:
        limit = int(request.args.get("limit", 620))
    except ValueError:
        limit = 620
    try:
        data = _candles().history(symbol, timeframe, limit=limit)
    except (ValueError, RuntimeError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        log.exception("candle fetch failed for %s %s", symbol, timeframe)
        return jsonify({"error": f"Dukascopy candle fetch failed: {exc}"}), 502
    return jsonify({
        "symbol": symbol,
        "timeframe": timeframe,
        "source": "dukascopy",
        "count": len(data),
        "candles": data,
    })


@api.get("/history/<symbol>")
def history(symbol):
    """Backward-compatible real tick-history endpoint."""
    symbol = symbol.upper()
    if symbol not in SYMBOL_MAP:
        return jsonify({"error": f"{symbol} has no Dukascopy feed"}), 404
    try:
        limit = int(request.args.get("limit", 500))
    except ValueError:
        limit = 500
    rows = db.get_history(current_app.config["DB_PATH"], symbol, limit=limit)
    return jsonify({"symbol": symbol, "count": len(rows), "quotes": rows})


@api.get("/stream/<symbol>/<timeframe>")
def stream(symbol, timeframe):
    symbol = symbol.upper()
    if symbol not in SYMBOL_MAP:
        return jsonify({"error": f"{symbol} has no Dukascopy feed"}), 404

    @stream_with_context
    def events():
        last_key = None
        # Send a heartbeat regularly so proxies/browser connections stay open.
        while True:
            candle = _live().latest(symbol, timeframe)
            if candle:
                key = (candle["t"], candle["o"], candle["h"], candle["l"], candle["c"])
                if key != last_key:
                    last_key = key
                    yield f"event: candle\ndata: {json.dumps(candle)}\n\n"
            yield ": heartbeat\n\n"
            time.sleep(1)

    return Response(
        events(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@api.get("/symbols")
def symbols():
    return jsonify({"live": sorted(SYMBOL_MAP.keys())})


@api.get("/health")
def health():
    status = _poller().status()
    try:
        stats = db.get_stats(current_app.config["DB_PATH"])
        db_ok = True
    except Exception as exc:
        log.warning("health check: db unavailable: %s", exc)
        stats, db_ok = None, False
    ok = status["running"] and db_ok
    body = {"ok": ok, "poller": status, "db_ok": db_ok, "history": stats}
    return jsonify(body), 200 if ok else 503
