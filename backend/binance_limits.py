"""Process-wide Binance REST cooldown shared by candles and catalog discovery."""
import math
import time
from threading import Lock


class BinanceCooldown:
    def __init__(self):
        self._until = 0.0
        self._lock = Lock()

    def remaining(self):
        with self._lock:
            return max(0, math.ceil(self._until - time.monotonic()))

    def record(self, error):
        try:
            delay = max(1, min(int(error.headers.get("Retry-After", "60")), 259200))
        except (AttributeError, TypeError, ValueError):
            delay = 60
        with self._lock:
            now = time.monotonic()
            # An in-flight response must never shorten an existing IP cooldown.
            self._until = max(self._until, now + delay)
            return max(0, math.ceil(self._until - now))


binance_cooldown = BinanceCooldown()
