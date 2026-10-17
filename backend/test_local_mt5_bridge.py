"""Mocked contract tests for the optional local-only MT5 bridge."""
from __future__ import annotations

import contextlib
import io
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

MODULE_PATH = Path(__file__).with_name("local_mt5_bridge.py")
SPEC = importlib.util.spec_from_file_location("local_mt5_bridge_under_test", MODULE_PATH)
bridge = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(bridge)


class FakeMT5:
    TIMEFRAME_M1 = 1
    TIMEFRAME_M5 = 5

    def __init__(self, *, company="Exness Technologies Ltd", server="Exness-MT5Trial", rates=None):
        self.company = company
        self.server = server
        self.rates = rates if rates is not None else [
            {"time": 100, "open": 1.0, "high": 1.3, "low": 0.9, "close": 1.2, "tick_volume": 10},
            {"time": 160, "open": 1.2, "high": 1.4, "low": 1.1, "close": 1.3, "tick_volume": 12},
        ]

    def initialize(self):
        return True

    def terminal_info(self):
        return SimpleNamespace(company=self.company, server=self.server)

    def last_error(self):
        return (0, "ok")

    def symbols_get(self, symbol=None):
        symbols = [SimpleNamespace(
            name="EURUSDm", path="Forex\\Majors", description="Euro vs US Dollar",
            currency_base="EUR", currency_profit="USD", digits=5,
            trade_tick_size=0.00001, point=0.00001, volume_step=0.01,
        )]
        return [item for item in symbols if symbol is None or item.name == symbol]

    def copy_rates_from_pos(self, symbol, timeframe, start, count):
        self.request = (symbol, timeframe, start, count)
        return self.rates[:count]


class LocalMT5BridgeTests(unittest.TestCase):
    def setUp(self):
        self.fake = FakeMT5()
        self.patch = patch.object(bridge, "mt5", self.fake)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.client = TestClient(bridge.app, base_url="http://localhost:8765")

    def test_refuses_non_exness_terminal(self):
        self.fake.company = "MetaQuotes Software"
        self.fake.server = "Demo-Server"
        response = self.client.get("/api/instruments")
        self.assertEqual(response.status_code, 409)
        self.assertIn("not connected to an Exness server", response.json()["detail"])

    def test_catalog_is_exact_source_paginated_and_categorized(self):
        response = self.client.get("/api/instruments?q=EUR&market=forex&limit=1&offset=0")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["data"][0]["symbol"], "EURUSDm")
        self.assertEqual(body["data"][0]["provider"], "exness_mt5")
        self.assertEqual(body["data"][0]["venue"], "Exness-MT5Trial")
        self.assertEqual(body["data"][0]["instrument_type"], "broker_cfd")
        self.assertEqual(body["data"][0]["availability"], "historical_only")

    def test_candles_are_read_only_exact_and_ohlc_normalized(self):
        response = self.client.get("/api/candles?symbol=EURUSDm&interval=1m&limit=2")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["provider"], "exness_mt5")
        self.assertEqual(body["volume_type"], "tick_volume")
        self.assertEqual(body["candles"], [
            {"t": 100, "o": 1.0, "h": 1.3, "l": 0.9, "c": 1.2, "v": 10},
            {"t": 160, "o": 1.2, "h": 1.4, "l": 1.1, "c": 1.3, "v": 12},
        ])
        self.assertEqual(self.fake.request, ("EURUSDm", 1, 0, 2))
        self.assertEqual(response.headers["cache-control"], "no-store")

    def test_unknown_symbol_and_interval_are_not_guessed(self):
        self.assertEqual(self.client.get("/api/candles?symbol=EURUSD&interval=1m").status_code, 404)
        self.assertEqual(self.client.get("/api/candles?symbol=EURUSDm&interval=99m").status_code, 422)

    def test_invalid_candle_is_rejected(self):
        self.fake.rates = [{"time": 1, "open": 2, "high": 1, "low": 0.5, "close": 1, "tick_volume": 3}]
        response = self.client.get("/api/candles?symbol=EURUSDm&interval=1m")
        self.assertEqual(response.status_code, 502)
        self.assertIn("invalid candle", response.json()["detail"])

    def test_browser_page_isolated_from_cloud_and_external_hosts(self):
        response = self.client.get("/pages/charts.html")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("supabase-js", response.text)
        self.assertNotIn("assets/cloud.js", response.text)
        self.assertNotIn("fonts.googleapis.com", response.text)
        self.assertIn("securitypolicyviolation", response.text)
        self.assertIn("connect-src 'self'", response.headers["content-security-policy"])
        self.assertEqual(self.client.get("/backend/app.py").status_code, 404)

    def test_blocked_external_request_is_recorded(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            response = self.client.post("/__blocked", content=b'{"blockedURI":"https://example.invalid"}')
        self.assertEqual(response.status_code, 204)
        self.assertIn("CSP BLOCK (intentional local isolation)", output.getvalue())
        self.assertIn("https://example.invalid", output.getvalue())


if __name__ == "__main__":
    unittest.main()
