"""Contract tests for TheOnePercent's market-data API (no network needed)."""
import unittest
from io import BytesIO
from urllib.error import HTTPError
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from app import BASE_URL, app, cache
import app as market_api
from catalog import binance_catalog, stable_instrument_id
import catalog as market_catalog

client = TestClient(app)


class MarketDataContractTests(unittest.TestCase):
    def setUp(self):
        cache.clear()
        market_api.BINANCE_RETRY_UNTIL = 0.0
        market_catalog.BINANCE_RETRY_UNTIL = 0.0
        binance_catalog._rows = None
        binance_catalog._updated = 0.0
        binance_catalog._updated_at = None

    def test_health(self):
        response = client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_uses_binance_public_market_data_endpoint(self):
        self.assertEqual(BASE_URL, "https://data-api.binance.vision/api/v3")

    @patch("app.urlopen")
    def test_candle_provider_retries_an_official_host_after_http_403(self, open_url):
        response = MagicMock()
        response.__enter__.return_value = BytesIO(b'{"symbols":[]}')
        open_url.side_effect = [
            HTTPError(BASE_URL + "/exchangeInfo", 403, "Forbidden", {}, None),
            response,
        ]
        from app import provider_get
        self.assertEqual(provider_get("/exchangeInfo"), {"symbols": []})
        self.assertEqual(open_url.call_count, 2)
        self.assertIn("data-api.binance.vision", open_url.call_args_list[0].args[0].full_url)
        self.assertIn("api-gcp.binance.com", open_url.call_args_list[1].args[0].full_url)

    @patch("app.urlopen")
    def test_candle_provider_honors_binance_ip_ban_retry_after(self, open_url):
        open_url.side_effect = HTTPError(
            BASE_URL + "/klines", 418, "IP banned", {"Retry-After": "120"}, None,
        )
        from app import provider_get
        with self.assertRaises(HTTPException) as first:
            provider_get("/klines?symbol=BTCUSDT&interval=1h&limit=1")
        self.assertEqual(first.exception.status_code, 503)
        self.assertEqual(first.exception.headers["Retry-After"], "120")
        self.assertEqual(open_url.call_count, 1)
        with self.assertRaises(HTTPException) as second:
            provider_get("/klines?symbol=BTCUSDT&interval=1h&limit=1")
        self.assertEqual(second.exception.headers["Retry-After"], "120")
        self.assertEqual(open_url.call_count, 1, "do not send more requests during an IP ban")

    @patch("catalog._get_json")
    def test_catalog_retries_an_official_host_after_http_403(self, get_json):
        get_json.side_effect = [
            HTTPError("https://data-api.binance.vision/api/v3/exchangeInfo", 403, "Forbidden", {}, None),
            {"symbols": []},
        ]
        from catalog import _get_binance_json
        self.assertEqual(_get_binance_json("/exchangeInfo"), {"symbols": []})
        self.assertEqual(get_json.call_count, 2)
        self.assertIn("data-api.binance.vision", get_json.call_args_list[0].args[0])
        self.assertIn("api-gcp.binance.com", get_json.call_args_list[1].args[0])

    @patch("catalog._get_json")
    def test_catalog_honors_binance_ip_ban_retry_after(self, get_json):
        get_json.side_effect = HTTPError(
            "https://data-api.binance.vision/api/v3/exchangeInfo", 418, "IP banned", {"Retry-After": "120"}, None,
        )
        from catalog import _get_binance_json
        with self.assertRaises(HTTPError) as first:
            _get_binance_json("/exchangeInfo")
        self.assertEqual(first.exception.code, 418)
        self.assertEqual(get_json.call_count, 1)
        with self.assertRaises(RuntimeError):
            _get_binance_json("/exchangeInfo")
        self.assertEqual(get_json.call_count, 1, "do not retry catalog requests during an IP ban")

    def test_rejects_unsupported_instrument(self):
        response = client.get("/api/candles/ES1!/1H")
        self.assertEqual(response.status_code, 422)

    @patch("app.binance_catalog.list", return_value=([], 0.0))
    def test_rejects_symbol_that_is_not_in_the_binance_catalog(self, catalog):
        self.assertEqual(client.get("/api/candles/NOTAREALPAIR/1H").status_code, 422)
        catalog.assert_called_once_with()

    def test_rejects_unsupported_interval(self):
        response = client.get("/api/candles/BTCUSDT/1s")
        self.assertEqual(response.status_code, 422)

    def test_rejects_excessive_limit(self):
        response = client.get("/api/candles/BTCUSDT/1H?limit=1001")
        self.assertEqual(response.status_code, 422)

    @patch("app.provider_get")
    def test_spot_candles_preserve_provenance_and_seconds(self, provider):
        provider.return_value = [[1720000000000, "60000", "60500", "59000", "60100", "12.5"]]
        response = client.get("/api/candles/BTCUSDT/1H?limit=1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["source"], "Binance spot")
        self.assertEqual(data["market"], "spot")
        self.assertEqual(data["symbol"], "BTCUSDT")
        self.assertEqual(data["provider_symbol"], "BTCUSDT")
        self.assertEqual(data["candles"][0]["t"], 1720000000)
        self.assertEqual(data["candles"][0]["c"], 60100.0)

    @patch("app.provider_get")
    def test_rejects_invalid_provider_candle(self, provider):
        provider.return_value = [[1720000000000, "60000", "59000", "61000", "60100", "1"]]
        self.assertEqual(client.get("/api/candles/BTCUSDT/1H?limit=1").status_code, 502)

    @patch("app.provider_get")
    def test_exact_provider_symbol_keeps_correct_cache_identity(self, provider):
        provider.return_value = [[1720000000000, "60000", "60500", "59000", "60100", "12.5"]]
        usdt = client.get("/api/candles/BTCUSDT/1H?limit=1").json()
        self.assertEqual(usdt["symbol"], "BTCUSDT")
        self.assertEqual(provider.call_count, 1)

    @patch("app.provider_get")
    @patch("app.binance_catalog.list", return_value=([{"symbol": "DOGEUSDT"}], 0.0))
    def test_catalog_discovered_pairs_use_their_exact_provider_symbol(self, catalog, provider):
        provider.return_value = [[1720000000000, "0.10", "0.11", "0.09", "0.105", "120"]]
        response = client.get("/api/candles/DOGEUSDT/1H?limit=1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["symbol"], "DOGEUSDT")
        self.assertEqual(response.json()["provider_symbol"], "DOGEUSDT")
        self.assertEqual(response.json()["candles"][0]["c"], 0.105)
        catalog.assert_called_once_with()
        provider.assert_called_once()

    @patch("app.provider_get")
    def test_rejects_provider_error_object(self, provider):
        provider.return_value = {"code": -1121, "msg": "Invalid symbol"}
        self.assertEqual(client.get("/api/candles/BTCUSDT/1H?limit=1").status_code, 502)

    @patch("app.provider_get")
    def test_rejects_nonfinite_or_out_of_order_candles(self, provider):
        provider.return_value = [[1720000000000, "nan", "60500", "59000", "60100", "12.5"]]
        self.assertEqual(client.get("/api/candles/BTCUSDT/1H?limit=1").status_code, 502)
        provider.return_value = [
            [1720000000000, "60000", "60500", "59000", "60100", "12.5"],
            [1719990000000, "60000", "60500", "59000", "60100", "12.5"],
        ]
        self.assertEqual(client.get("/api/candles/BTCUSDT/1H?limit=2").status_code, 502)

    @patch("app.provider_get")
    def test_cache_headers_and_repeated_requests(self, provider):
        provider.return_value = [[1720000000000, "60000", "60500", "59000", "60100", "12.5"]]
        first = client.get("/api/candles/BTCUSDT/1H?limit=1")
        second = client.get("/api/candles/BTCUSDT/1H?limit=1")
        self.assertEqual(first.headers["x-market-cache"], "MISS")
        self.assertEqual(second.headers["x-market-cache"], "HIT")
        self.assertEqual(second.headers["cache-control"], "public, max-age=15")
        provider.assert_called_once()

    def test_quotes_are_not_fabricated(self):
        self.assertEqual(client.get("/api/quotes").json(), {})

    @patch("catalog._get_json")
    def test_full_binance_spot_catalog_is_searchable_and_paginated(self, get_json):
        get_json.return_value = {"symbols": [
            {"symbol": "BTCUSDT", "status": "TRADING", "isSpotTradingAllowed": True,
             "baseAsset": "BTC", "quoteAsset": "USDT", "filters": [
                 {"filterType": "PRICE_FILTER", "tickSize": "0.01"},
                 {"filterType": "LOT_SIZE", "stepSize": "0.00001", "minQty": "0.00001"}]},
            {"symbol": "ETHBTC", "status": "TRADING", "isSpotTradingAllowed": True,
             "baseAsset": "ETH", "quoteAsset": "BTC", "filters": []},
            {"symbol": "OLDUSDT", "status": "BREAK", "isSpotTradingAllowed": True,
             "baseAsset": "OLD", "quoteAsset": "USDT", "filters": []},
        ]}
        response = client.get("/api/instruments?q=btc&limit=1")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total"], 2)
        self.assertTrue(data["has_more"])
        row = data["data"][0]
        self.assertEqual(row["symbol"], "BTCUSDT")
        self.assertEqual(row["quote_asset"], "USDT")
        self.assertEqual(row["provider_symbol"], "BTCUSDT")
        self.assertEqual(row["availability"], "historical_only")
        self.assertEqual(row["price_tick"], "0.01")
        self.assertNotEqual(row["instrument_id"], stable_instrument_id("BINANCE_SPOT", "ETHBTC"))
        get_json.assert_called_once_with("https://data-api.binance.vision/api/v3/exchangeInfo")

    @patch("catalog._get_json")
    def test_catalog_excludes_nontrading_and_spot_disabled_symbols(self, get_json):
        get_json.return_value = {"symbols": [
            {"symbol": "TESTUSDT", "status": "TRADING", "isSpotTradingAllowed": False,
             "baseAsset": "TEST", "quoteAsset": "USDT", "filters": []},
        ]}
        data = client.get("/api/instruments?limit=100").json()
        self.assertEqual(data["total"], 0)

    def test_provider_status_does_not_claim_unconfigured_providers(self):
        response = client.get("/api/providers")
        self.assertEqual(response.status_code, 200)
        statuses = {row["provider"]: row for row in response.json()["data"]}
        self.assertEqual(statuses["binance"]["status"], "historical_and_streaming")
        self.assertTrue(statuses["binance"]["streaming"])
        self.assertEqual(statuses["twelve_data"]["status"], "requires_access")
        self.assertEqual(statuses["databento"]["status"], "requires_access")
        self.assertEqual(statuses["broker"]["status"], "unavailable")

    @patch.dict("os.environ", {"TWELVE_DATA_EXTERNAL_DISPLAY_APPROVED": "true"}, clear=True)
    def test_twelve_data_needs_server_side_key_even_if_rights_flag_is_set(self):
        response = client.get("/api/providers")
        statuses = {row["provider"]: row for row in response.json()["data"]}
        self.assertEqual(statuses["twelve_data"]["status"], "requires_access")


if __name__ == "__main__":
    unittest.main()
