"""Pure contract checks for the normalized Binance Spot kline stream."""
import asyncio
import json
import unittest

from binance_stream import BinanceStreamHub, normalize_kline


class BinanceStreamContractTests(unittest.TestCase):
    def setUp(self):
        self.event = {
            "e": "kline", "E": 1720000000500, "s": "BTCUSDT",
            "k": {"t": 1720000000000, "s": "BTCUSDT", "i": "1h",
                  "o": "60000", "h": "60500", "l": "59000", "c": "60100",
                  "v": "12.5", "x": False},
        }

    def test_normalizes_exchange_timestamps_and_provenance(self):
        result = normalize_kline(self.event, "BTCUSDT", "1h")
        self.assertEqual(result["source"], "Binance spot")
        self.assertEqual(result["market"], "spot")
        self.assertEqual(result["symbol"], "BTCUSDT")
        self.assertEqual(result["interval"], "1h")
        self.assertEqual(result["event_time"], 1720000000)
        self.assertEqual(result["candle"], {
            "t": 1720000000, "o": 60000.0, "h": 60500.0,
            "l": 59000.0, "c": 60100.0, "v": 12.5,
        })

    def test_rejects_symbol_interval_and_ohlc_mismatches(self):
        with self.assertRaisesRegex(ValueError, "symbol"):
            normalize_kline(self.event, "ETHUSDT", "1h")
        with self.assertRaisesRegex(ValueError, "interval"):
            normalize_kline(self.event, "BTCUSDT", "15m")
        invalid = {**self.event, "k": {**self.event["k"], "h": "58000"}}
        with self.assertRaisesRegex(ValueError, "OHLCV"):
            normalize_kline(invalid, "BTCUSDT", "1h")

    def test_ignores_non_kline_events(self):
        self.assertIsNone(normalize_kline({"e": "trade"}, "BTCUSDT", "1h"))

    def test_fans_out_one_upstream_stream_to_matching_subscribers(self):
        async def run():
            event = json.dumps(self.event)
            connects = []

            class FakeSocket:
                def __init__(self):
                    self.sent = False
                    self.block = asyncio.Event()

                async def __aenter__(self):
                    return self

                async def __aexit__(self, *_):
                    return False

                def __aiter__(self):
                    return self

                async def __anext__(self):
                    if not self.sent:
                        self.sent = True
                        return event
                    await self.block.wait()
                    raise StopAsyncIteration

            class Factory:
                def __call__(self, url, **kwargs):
                    connects.append((url, kwargs))
                    return FakeSocket()

            hub = BinanceStreamHub(connect_factory=Factory())
            first = await hub.subscribe("BTCUSDT", "1H", "1h")
            second = await hub.subscribe("BTCUSDT", "1H", "1h")

            async def receive_candle(queue):
                while True:
                    item = await asyncio.wait_for(queue.get(), timeout=1)
                    if item.get("type") == "candle":
                        return item

            a, b = await asyncio.gather(receive_candle(first), receive_candle(second))
            self.assertEqual(len(connects), 1)
            self.assertIn("btcusdt@kline_1h", connects[0][0])
            self.assertEqual(a["interval"], "1H")
            self.assertEqual(a["provider_interval"], "1h")
            self.assertEqual(a, b)
            await hub.unsubscribe("BTCUSDT", "1H", "1h", first)
            await hub.unsubscribe("BTCUSDT", "1H", "1h", second)

        asyncio.run(run())


if __name__ == "__main__":
    unittest.main()
