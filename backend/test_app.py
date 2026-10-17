"""Contract tests for TheOnePercent's market-data API (no network needed)."""
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from app import BASE_URL, app, cache

client = TestClient(app)


class MarketDataContractTests(unittest.TestCase):
    def setUp(self):
        cache.clear()

    def test_health(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_uses_binance_public_market_data_endpoint(self):
        self.assertEqual(BASE_URL, "https://data-api.binance.vision/api/v3")

    def test_rejects_unsupported_instrument(self):
        response = client.get("/api/candles/ES1!/1H")
        self.assertEqual(response.status_code, 422)

    def test_rejects_unsupported_interval(self):
        response = client.get("/api/candles/BTCUSD/1s")
        self.assertEqual(response.status_code, 422)

    def test_rejects_excessive_limit(self):
        response = client.get("/api/candles/BTCUSD/1H?limit=1001")
        self.assertEqual(response.status_code, 422)

    @patch("app.provider_get")
    def test_spot_candles_preserve_provenance_and_seconds(self, provider):
        provider.return_value = [[1720000000000, "60000", "60500", "59000", "60100", "12.5"]]
        response = client.get("/api/candles/BTCUSD/1H?limit=1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["source"], "Binance spot")
        self.assertEqual(data["market"], "spot")
        self.assertEqual(data["provider_symbol"], "BTCUSDT")
        self.assertEqual(data["candles"][0]["t"], 1720000000)
        self.assertEqual(data["candles"][0]["c"], 60100.0)

    @patch("app.provider_get")
    def test_rejects_invalid_provider_candle(self, provider):
        provider.return_value = [[1720000000000, "60000", "59000", "61000", "60100", "1"]]
        self.assertEqual(client.get("/api/candles/BTCUSD/1H?limit=1").status_code, 502)

    @patch("app.provider_get")
    def test_aliases_keep_correct_symbols_in_cache(self, provider):
        provider.return_value = [[1720000000000, "60000", "60500", "59000", "60100", "12.5"]]
        usd = client.get("/api/candles/BTCUSD/1H?limit=1").json()
        usdt = client.get("/api/candles/BTCUSDT/1H?limit=1").json()
        self.assertEqual(usd["symbol"], "BTCUSD")
        self.assertEqual(usdt["symbol"], "BTCUSDT")
        self.assertEqual(provider.call_count, 2)

    @patch("app.provider_get")
    def test_rejects_provider_error_object(self, provider):
        provider.return_value = {"code": -1121, "msg": "Invalid symbol"}
        self.assertEqual(client.get("/api/candles/BTCUSD/1H?limit=1").status_code, 502)

    @patch("app.provider_get")
    def test_rejects_nonfinite_or_out_of_order_candles(self, provider):
        provider.return_value = [[1720000000000, "nan", "60500", "59000", "60100", "12.5"]]
        self.assertEqual(client.get("/api/candles/BTCUSD/1H?limit=1").status_code, 502)
        provider.return_value = [
            [1720000000000, "60000", "60500", "59000", "60100", "12.5"],
            [1719990000000, "60000", "60500", "59000", "60100", "12.5"],
        ]
        self.assertEqual(client.get("/api/candles/BTCUSD/1H?limit=2").status_code, 502)

    @patch("app.provider_get")
    def test_cache_headers_and_repeated_requests(self, provider):
        provider.return_value = [[1720000000000, "60000", "60500", "59000", "60100", "12.5"]]
        first = client.get("/api/candles/BTCUSD/1H?limit=1")
        second = client.get("/api/candles/BTCUSD/1H?limit=1")
        self.assertEqual(first.headers["x-market-cache"], "MISS")
        self.assertEqual(second.headers["x-market-cache"], "HIT")
        self.assertEqual(second.headers["cache-control"], "public, max-age=15")
        provider.assert_called_once()

    def test_quotes_are_not_fabricated(self):
        self.assertEqual(client.get("/api/quotes").json(), {})


if __name__ == "__main__":
    unittest.main()
