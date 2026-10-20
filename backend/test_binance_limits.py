"""Cooldown timing must respect the provider's full retry window."""
import unittest
from urllib.error import HTTPError
from unittest.mock import patch

from binance_limits import BinanceCooldown


class BinanceCooldownTests(unittest.TestCase):
    def test_fractional_remaining_time_and_expiry(self):
        cooldown = BinanceCooldown()
        with patch("binance_limits.time.monotonic", return_value=100):
            self.assertEqual(cooldown.record(HTTPError("", 429, "", {"Retry-After": "2"}, None)), 2)
        with patch("binance_limits.time.monotonic", return_value=101.9):
            self.assertEqual(cooldown.remaining(), 1)
        with patch("binance_limits.time.monotonic", return_value=102):
            self.assertEqual(cooldown.remaining(), 0)

    def test_later_response_does_not_shorten_existing_cooldown(self):
        cooldown = BinanceCooldown()
        with patch("binance_limits.time.monotonic", return_value=100):
            cooldown.record(HTTPError("", 418, "", {"Retry-After": "120"}, None))
        with patch("binance_limits.time.monotonic", return_value=110):
            self.assertEqual(cooldown.record(HTTPError("", 429, "", {"Retry-After": "5"}, None)), 110)

    def test_missing_or_invalid_retry_after_uses_default(self):
        for headers in (None, {}, {"Retry-After": "invalid"}):
            with self.subTest(headers=headers):
                cooldown = BinanceCooldown()
                with patch("binance_limits.time.monotonic", return_value=100):
                    self.assertEqual(cooldown.record(HTTPError("", 429, "", headers, None)), 60)


if __name__ == "__main__":
    unittest.main()
