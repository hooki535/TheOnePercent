"""Shared-history contract tests; no provider credentials or network used."""
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from fastapi.testclient import TestClient
from fastapi import FastAPI
import backtesting as history

app = FastAPI()
app.include_router(history.router)
client = TestClient(app)


class SharedBacktestingTests(unittest.TestCase):
    def setUp(self):
        history._cache.clear()
        history._cooldown_until = 0
        history._requests.clear()
        self.enterContext(patch.dict(os.environ, {"TWELVE_DATA_API_KEY": "not-a-real-key", "TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED": "true"}))

    @staticmethod
    def payload(count=65):
        return {"meta": {"symbol": "EUR/USD"}, "values": [
            {"datetime": datetime.fromtimestamp(1700000000+i*3600, timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
             "open": "1", "high": "2", "low": "0.5", "close": "1.5"} for i in range(count)]}

    def test_unconfigured_preview_is_explicit_and_never_calls_provider(self):
        with patch.dict(os.environ, {"TWELVE_DATA_API_KEY": ""}), patch.object(history, "_get_json") as fetch:
            response = client.get("/api/backtesting/catalog")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["status"], "not_configured")
            self.assertEqual(client.get("/api/backtesting/candles?symbol=EUR/USD").status_code, 503)
            fetch.assert_not_called()

    def test_public_display_gate_is_required(self):
        with patch.dict(os.environ, {"TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED": "false"}):
            self.assertFalse(history.enabled())

    @patch.object(history, "_get_json")
    def test_catalog_search_pagination_and_cache(self, fetch):
        fetch.return_value = {"data": [{"symbol": "EUR/USD"}, {"symbol": "GBP/JPY"}, {"symbol": "BAD"}]}
        first = client.get("/api/backtesting/catalog?limit=1").json()
        self.assertEqual(first["total"], 2)
        self.assertTrue(first["has_more"])
        self.assertEqual(client.get("/api/backtesting/catalog?q=JPY").json()["data"][0]["quote_asset"], "JPY")
        self.assertEqual(fetch.call_count, 1)

    @patch.object(history, "forex_catalog", return_value=[{"symbol": "EUR/USD"}])
    @patch.object(history, "_get_json")
    def test_closed_bars_caching_and_server_side_key(self, fetch, _):
        fetch.return_value = self.payload()
        with patch.object(history.time, "time", return_value=1700000000+64*3600+100):
            first = client.get("/api/backtesting/candles?symbol=EUR/USD&interval=1H&limit=100")
            self.assertEqual(first.status_code, 200, first.text)
            self.assertEqual(len(first.json()["candles"]), 64)
            self.assertTrue(first.json()["closed_only"])
            self.assertNotIn("not-a-real-key", first.text)
            self.assertIn("apikey=not-a-real-key", fetch.call_args.args[0])
            client.get("/api/backtesting/candles?symbol=EUR/USD&interval=1H&limit=100")
            self.assertEqual(fetch.call_count, 1)

    @patch.object(history, "forex_catalog", return_value=[{"symbol": "EUR/USD"}])
    @patch.object(history, "_get_json")
    def test_invalid_ohlc_duplicates_and_wrong_pair_are_rejected(self, fetch, _):
        wrong = self.payload();wrong["meta"]["symbol"] = "GBP/USD"
        duplicate = self.payload();duplicate["values"][1] = duplicate["values"][0]
        invalid = self.payload();invalid["values"][0]["high"] = "nan"
        for body in (wrong, duplicate, invalid):
            history._cache.clear();fetch.return_value = body
            self.assertEqual(client.get("/api/backtesting/candles?symbol=EUR/USD").status_code, 502)

    @patch.object(history, "forex_catalog", return_value=[{"symbol": "EUR/USD"}])
    @patch.object(history, "_get_json")
    def test_missing_history_future_dates_and_unknown_symbols(self, fetch, _):
        fetch.return_value = self.payload(20)
        self.assertEqual(client.get("/api/backtesting/candles?symbol=EUR/USD").status_code, 404)
        self.assertEqual(client.get("/api/backtesting/candles?symbol=EUR/USD&end=2999-01-01T00:00").status_code, 422)
        self.assertEqual(client.get("/api/backtesting/candles?symbol=EUR/USD&end=2026-02-30T00:00").status_code, 422)
        self.assertEqual(client.get("/api/backtesting/candles?symbol=EUR/USD&limit=5001").status_code, 422)
        self.assertEqual(client.get("/api/backtesting/candles?symbol=GBP/JPY").status_code, 404)

    @patch.object(history, "_get_json")
    def test_rate_limit_does_not_expose_key_or_repeat_requests(self, fetch):
        fetch.return_value = {"status": "error", "code": 429, "message": "secret url not-a-real-key"}
        first = client.get("/api/backtesting/catalog")
        self.assertEqual(first.status_code, 503)
        self.assertEqual(first.headers["retry-after"], "60")
        self.assertNotIn("not-a-real-key", first.text)
        self.assertEqual(client.get("/api/backtesting/catalog").status_code, 503)
        self.assertEqual(fetch.call_count, 1)
