# TheOnePercent — Flask edition

Same site, same design, same client-side logic — served by Flask, with
a real backend behind it: a Dukascopy poller, a SQLite history of
everything it's fetched, config via environment variables, structured
logging, and a health endpoint.

## Run it

```
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000. Copy `.env.example` to `.env` if you
want to override any default (poll interval, DB path, port, etc).

## Tests

```
pip install -r requirements-dev.txt
pytest
```

31 tests, all offline — the Dukascopy poller and network calls are
mocked, so the suite doesn't depend on Dukascopy's servers being
reachable. `tests/test_api.py` covers every page/API route,
`tests/test_db.py` covers the SQLite layer directly, and
`tests/test_dukascopy_feed.py` covers the poller's callback/retry/
pruning logic.

## Structure

```
app.py                  # app factory: config, logging, DB init, poller, blueprints
config.py               # all settings, env-var driven with working defaults
db.py                   # SQLite quote-history store (stdlib sqlite3, no ORM)
dukascopy_feed.py        # the background poller
blueprints/
  pages.py              # one route per screen
  api.py                # /api/quote, /api/quotes, /api/history, /api/symbols, /api/health
templates/               # byte-identical to the original .html files except path rewrites
static/                  # assets/, styles.css, app.js — untouched from the static site
tests/
```

## What changed vs. the static version

- Every `pages/*.html` file became `templates/pages/*.html`, and
  `index.html` became `templates/index.html`, each served by its own
  route in `blueprints/pages.py`. The only edits inside these files are
  path rewrites — `assets/foo.js` became
  `{{ url_for('static', filename='assets/foo.js') }}`, links between
  pages became `{{ url_for('pages.dashboard') }}`-style calls. Nothing
  else in the markup moved.
- `assets/` became `static/assets/`, untouched byte-for-byte except
  `feed.js`'s `LIVE_API` constant (now a relative `/api/quotes`, same
  origin) and the routing fixes described below.
- **The in-app nav is built at runtime by `shell.js`**, and several
  other scripts (`auth.js`, `onboarding.js`, `signup.js`, `settings.js`,
  `dashboard.js`, `journal.js`, `calculators.js`, `charts.js`,
  `lessons.js`) redirect via their own hardcoded path strings. Those
  were written for the old `pages/*.html` layout and are now the flat
  Flask routes (`/dashboard`, `/settings#guardrails`, etc.) — same
  destinations, same behavior, just the corrected paths.
- `pages/markets.html` was already a dead link in the original static
  site (no such file existed) — left as a literal 404, same as before.
- **Charts now render via TradingView Lightweight Charts** for the
  candle/bar types in the default (linear, non-inverted) price scale —
  see `static/assets/vendor/lightweight-charts.standalone.production.js`
  and the `lwcSupported`/`ensureLWC`/`syncLWC` methods on the `Chart`
  class in `charts-engine.js`. It's a second, non-interactive layer
  behind the existing canvas: panning, zooming, price-axis drag-scale,
  the drawing layer, the position tool, and bar replay are all
  untouched and still compute everything through `bars()`/`scale()`
  exactly as before. Line/area/baseline/step, hollow candles, and the
  log/percent/inverted scale modes still use the original hand-drawn
  renderer — see the comment on `LWC_KIND` in `charts-engine.js` for
  why those specific cases stay as they were.
- **A real backend now sits behind the frontend**: `dukascopy_feed.py`
  writes every successfully polled quote into a SQLite database
  (`db.py`) instead of only holding the latest tick in memory, so
  history survives a restart. `config.py` reads settings from the
  environment (poll interval, DB path, log level, host/port — see
  `.env.example`) instead of anything being hardcoded. `app.py` is now
  an app factory that wires config → logging → DB → poller → blueprints,
  with `GET /api/health` reporting whether the poller thread is alive,
  which symbols are currently failing, and how much history is stored.

## Routes

| Route          | Template                     |
|----------------|-------------------------------|
| `/`            | `templates/index.html`        |
| `/dashboard`   | `templates/pages/dashboard.html` |
| `/charts`      | `templates/pages/charts.html` |
| `/journal`     | `templates/pages/journal.html` |
| `/calculators` | `templates/pages/calculators.html` |
| `/learn`       | `templates/pages/learn.html` |
| `/login`       | `templates/pages/login.html` |
| `/onboarding`  | `templates/pages/onboarding.html` |
| `/settings`    | `templates/pages/settings.html` |
| `/sign-up`     | `templates/pages/sign-up.html` |
| `GET /api/quotes` | latest cached quote per symbol |
| `GET /api/quote/<symbol>` | latest cached quote for one symbol |
| `GET /api/history/<symbol>?limit=500` | persisted tick history from SQLite |
| `GET /api/candles/<symbol>/<timeframe>?limit=620` | real Dukascopy OHLC candles |
| `GET /api/stream/<symbol>/<timeframe>` | live forming-candle SSE stream |
| `GET /api/symbols` | which symbols have a live Dukascopy feed |
| `GET /api/health` | poller status + DB stats, 200 or 503 |

## Note on the live feed

The chart data is now real Dukascopy data. Historical candles are fetched from
Dukascopy's aggregated feed and normalised by `candle_engine.py`; intervals that
are not directly supplied are built from a suitable lower timeframe or ticks.
The forming candle is maintained from the poller's recent tick window and sent
to the browser over Server-Sent Events. Lightweight Charts receives historical
data with `setData()` and updates the forming candle with `series.update()`.

The current free-feed mapping covers FX majors/crosses, metals, BTC and ETH.
Indices, futures, SOLUSD and the local-bank pairs are **not** silently replaced
with synthetic market prices anymore; the candle API reports that the symbol is
not available from the configured Dukascopy mapping.

Dukascopy's public historical feed is a market-data source, not a broker
execution connection. This project remains read-only and should not be used as
a latency-sensitive order-execution feed.

See `REAL-DATA.md` for the architecture and endpoints.

## Deploy to Render

This repository includes a Render Blueprint at `render.yaml` and a production WSGI entry point at `wsgi.py`.

Render's Python deployment uses a production Gunicorn server rather than Flask's development server. The configured command is:

```bash
gunicorn --workers 1 --threads 8 --timeout 0 --bind 0.0.0.0:$PORT wsgi:app
```

The single Gunicorn worker is intentional: the Dukascopy poller and live candle book are in-process objects, so multiple workers would create separate pollers/caches. Eight threads allow the SSE stream to remain open without blocking ordinary HTTP requests.

### Deploy

1. Put this project in a GitHub repository.
2. In Render, choose **New → Blueprint** and select the repository.
3. Render detects `render.yaml` and creates the `theonepercent-flask` web service.
4. The Blueprint generates `SECRET_KEY` automatically.
5. After deployment, open:

```text
https://YOUR-SERVICE.onrender.com/charts
```

Health check:

```text
https://YOUR-SERVICE.onrender.com/api/health
```

The service uses `/tmp/data.db` because Render Free instances have an ephemeral filesystem. The database is therefore only a runtime cache/history window and should not be treated as permanent storage.

### Important for Dukascopy

The Render Free configuration deliberately polls every 15 seconds rather than every 5 seconds. This reduces outbound traffic while still allowing the live-candle/SSE path to be tested. Increase the polling frequency only after confirming the deployment works and keeping the service's external traffic reasonable.

### Environment variables

`render.yaml` configures:

- `PYTHON_VERSION=3.12`
- `FLASK_DEBUG=false`
- generated `SECRET_KEY`
- `HOST=0.0.0.0`
- `POLL_INTERVAL_SECONDS=15`
- `POLL_LOOKBACK_MINUTES=3`
- `CANDLE_HISTORY_BARS=620`
- `HISTORY_RETENTION_HOURS=72`
- `DB_PATH=/tmp/data.db`
- `LOG_LEVEL=INFO`

For local development, continue using `.env` based on `.env.example`.
