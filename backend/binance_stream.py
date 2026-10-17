"""Validated Binance Spot kline stream with one upstream per series."""
from __future__ import annotations

import asyncio
import json
import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from urllib.parse import quote

from websockets.asyncio.client import connect

logger = logging.getLogger("theonepercent.binance_stream")
STREAM_BASE = "wss://stream.binance.com:443/ws"


def normalize_kline(message, expected_symbol: str, expected_interval: str):
    """Return a validated, provider-attributed candle or None for other events."""
    if not isinstance(message, dict) or message.get("e") != "kline":
        return None
    symbol = str(expected_symbol).upper()
    kline = message.get("k")
    if not isinstance(kline, dict):
        raise ValueError("Missing Binance kline payload")
    if str(message.get("s", "")).upper() != symbol or str(kline.get("s", "")).upper() != symbol:
        raise ValueError("Binance stream symbol did not match subscription")
    if str(kline.get("i", "")) != expected_interval:
        raise ValueError("Binance stream interval did not match subscription")
    try:
        opened = int(kline["t"])
        o, h, low, c, v = (float(kline[k]) for k in ("o", "h", "l", "c", "v"))
        event_time = int(message["E"])
    except (KeyError, TypeError, ValueError, OverflowError) as exc:
        raise ValueError("Invalid Binance kline values") from exc
    if (opened < 0 or event_time < 0 or not all(map(math.isfinite, (o, h, low, c, v)))
            or not (0 < low <= min(o, c) <= max(o, c) <= h) or v < 0):
        raise ValueError("Invalid Binance kline OHLCV")
    return {
        "type": "candle",
        "symbol": symbol,
        "provider_symbol": symbol,
        "source": "Binance spot",
        "market": "spot",
        "interval": expected_interval,
        "event_time": event_time // 1000,
        "closed": bool(kline.get("x")),
        "candle": {"t": opened // 1000, "o": o, "h": h, "l": low, "c": c, "v": v},
    }


@dataclass
class _Session:
    symbol: str
    interval: str
    provider_interval: str
    subscribers: set[asyncio.Queue] = field(default_factory=set)
    task: asyncio.Task | None = None
    state: str = "connecting"

    def status(self):
        return {"type": "status", "state": self.state, "source": "Binance spot",
                "market": "spot", "symbol": self.symbol,
                "provider_symbol": self.symbol, "interval": self.interval,
                "provider_interval": self.provider_interval,
                "updated_at": datetime.now(timezone.utc).isoformat()}


class BinanceStreamHub:
    """Fan out each exact symbol/interval feed to local websocket clients."""
    def __init__(self, connect_factory=connect):
        self._connect = connect_factory
        self._sessions: dict[tuple[str, str], _Session] = {}
        self._lock = asyncio.Lock()

    async def subscribe(self, symbol: str, interval: str, provider_interval: str):
        key = (symbol.upper(), interval)
        queue: asyncio.Queue = asyncio.Queue(maxsize=1)
        async with self._lock:
            session = self._sessions.get(key)
            if session is None:
                session = _Session(*key, provider_interval)
                self._sessions[key] = session
                session.task = asyncio.create_task(self._run(key, session))
            session.subscribers.add(queue)
            self._put_latest(queue, session.status())
        return queue

    async def unsubscribe(self, symbol: str, interval: str, provider_interval: str, queue: asyncio.Queue):
        key = (symbol.upper(), interval)
        async with self._lock:
            session = self._sessions.get(key)
            if session is None:
                return
            session.subscribers.discard(queue)
            if not session.subscribers:
                self._sessions.pop(key, None)
                if session.task and not session.task.done():
                    session.task.cancel()

    @staticmethod
    def _put_latest(queue: asyncio.Queue, item):
        if queue.full():
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                pass
        try:
            queue.put_nowait(item)
        except asyncio.QueueFull:
            pass

    def _broadcast(self, session: _Session, item):
        for queue in tuple(session.subscribers):
            self._put_latest(queue, item)

    async def _run(self, key, session: _Session):
        delay = 1
        stream = f"{session.symbol.lower()}@kline_{session.provider_interval}"
        url = f"{STREAM_BASE}/{quote(stream, safe='@_')}"
        try:
            while session.subscribers:
                session.state = "connecting"
                self._broadcast(session, session.status())
                try:
                    async with self._connect(url, open_timeout=8, ping_interval=20,
                                             ping_timeout=20, close_timeout=3, max_size=65536) as socket:
                        session.state = "connected"
                        self._broadcast(session, session.status())
                        delay = 1
                        async for raw in socket:
                            try:
                                parsed = json.loads(raw)
                                event = normalize_kline(parsed, session.symbol, session.provider_interval)
                            except (TypeError, ValueError, json.JSONDecodeError) as exc:
                                logger.warning("Discarded invalid Binance kline event (%s)", type(exc).__name__)
                                continue
                            if event:
                                event["provider_interval"] = session.provider_interval
                                event["interval"] = session.interval
                                self._broadcast(session, event)
                    if session.subscribers:
                        session.state = "reconnecting"
                        self._broadcast(session, session.status())
                        await asyncio.sleep(delay)
                        delay = min(delay * 2, 30)
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    if not session.subscribers:
                        break
                    session.state = "reconnecting"
                    self._broadcast(session, session.status())
                    logger.warning("Binance kline stream disconnected (%s); retrying in %ss",
                                   type(exc).__name__, delay)
                    await asyncio.sleep(delay)
                    delay = min(delay * 2, 30)
        except asyncio.CancelledError:
            pass
        finally:
            async with self._lock:
                if self._sessions.get(key) is session and not session.subscribers:
                    self._sessions.pop(key, None)


binance_streams = BinanceStreamHub()
