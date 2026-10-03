"""
TheOnePercent — Flask edition.

Same design, same client-side logic (feed.js's price engine, store.js's
local state, every calculator/journal/lesson/chart script) — served by
Flask, with a small real backend behind it: a Dukascopy poller, a
SQLite history of everything it's fetched, structured logging, and a
health endpoint, all built from config.py rather than hardcoded.

    pip install -r requirements.txt
    python app.py                 # http://127.0.0.1:5000 by default
"""

import atexit
import logging

from flask import Flask, render_template, request

import db
from config import Config
from dukascopy_feed import DukascopyPoller, SYMBOL_MAP
from live_candles import LiveCandleBook
from candle_engine import CandleService


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    logging.basicConfig(
        level=app.config["LOG_LEVEL"],
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    log = logging.getLogger("app")

    db.init_db(app.config["DB_PATH"])
    log.info("database ready at %s", app.config["DB_PATH"])

    def persist(quote):
        db.insert_quote(app.config["DB_PATH"], quote)

    def prune():
        db.prune_old(app.config["DB_PATH"], app.config["HISTORY_RETENTION_HOURS"])

    live_book = LiveCandleBook()
    candle_service = CandleService(max_bars=app.config["CANDLE_HISTORY_BARS"])

    poller = DukascopyPoller(
        symbols=SYMBOL_MAP.keys(),
        interval_seconds=app.config["POLL_INTERVAL_SECONDS"],
        lookback_minutes=app.config["POLL_LOOKBACK_MINUTES"],
        on_quote=persist,
        on_frame=live_book.update_frame,
        # Once every 720 rounds at the default 5s interval is about once
        # an hour — the retention window is measured in hours, so it
        # doesn't need pruning any more often than that.
        prune_every_rounds=720,
        prune_fn=prune,
    )
    poller.start()
    app.extensions["dukascopy_poller"] = poller
    app.extensions["live_candles"] = live_book
    app.extensions["candle_service"] = candle_service
    atexit.register(poller.stop)

    from blueprints.pages import pages
    from blueprints.api import api

    app.register_blueprint(pages)
    app.register_blueprint(api)

    @app.errorhandler(404)
    def not_found(e):
        if _wants_json():
            return {"error": "not found"}, 404
        return render_template("error.html", code=404, title="Page not found",
                                message="That page doesn't exist — it may have moved."), 404

    @app.errorhandler(500)
    def server_error(e):
        log.exception("unhandled error")
        if _wants_json():
            return {"error": "internal server error"}, 500
        return render_template("error.html", code=500, title="Something broke",
                                message="That's on us — the error's been logged."), 500

    def _wants_json():
        return request.path.startswith("/api/")

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host=app.config["HOST"], port=app.config["PORT"], debug=app.config["DEBUG"])
