const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("assets/feed.js", "utf8");

function candle(t, close) {
  return { t, o: close - 2, h: close + 4, l: close - 5, c: close, v: 10 };
}

function harness() {
  let now = 1720000000000;
  const requests = [];
  const sockets = [];
  const timers = [];
  const batches = [
    [candle(1719990000, 60010), candle(1719993600, 60020)],
    [candle(1719990000, 60110), candle(1719993600, 60120)],
  ];
  const instrument = { symbol: "BTCUSD", name: "Bitcoin", market: "Crypto", base: "BTC", quote: "USD", price: 60000, dp: 2, pip: .01, contract: 1, unitValue: 1 };
  const fetch = (url) => {
    requests.push(String(url));
    if (String(url).endsWith("/api/quotes")) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (String(url).includes("/api/candles/")) {
      const rows = batches.shift() || [candle(1719990000, 60210), candle(1719993600, 60220)];
      const response = {
        symbol: "BTCUSDT", provider_symbol: "BTCUSDT", source: "Binance spot", market: "spot", interval: "1H",
        candles: rows, retrieved_at: new Date(now).toISOString(),
      };
      return Promise.resolve({ ok: true, json: () => Promise.resolve(response) });
    }
    throw new Error("Unexpected URL: " + url);
  };
  class TestWebSocket {
    constructor(url) { this.url = url; this.readyState = 0; sockets.push(this); }
    close() { this.readyState = 3; this.onclose?.({}); }
  }
  const window = {
    THEONEPERCENT_MARKET_API: "https://market-api.example",
    WebSocket: TestWebSocket,
    Instruments: {
      find: (symbol) => symbol === "BTCUSD" || symbol === "EURUSD" ? Object.assign({}, instrument, { symbol }) : null,
      INSTRUMENTS: [instrument],
    },
  };
  const context = {
    window, location: { protocol: "https:" }, fetch, URLSearchParams, console,
    Date: class TestDate extends Date { static now() { return now; } },
    setInterval: () => 1, clearInterval: () => {},
    setTimeout: (fn, delay) => { const timer = { fn, delay, cleared: false }; timers.push(timer); return timer; },
    clearTimeout: (timer) => { if (timer) timer.cleared = true; },
  };
  vm.runInNewContext(source, context, { filename: "assets/feed.js" });
  return {
    feed: window.Feed, sockets, requests, timers,
    advance(ms) { now += ms; },
    async settle() { await new Promise((resolve) => setImmediate(resolve)); },
  };
}

test("exact Binance spot stream updates real candles and exposes connection and stale status", async () => {
  const h = harness();
  h.feed.history("BTCUSDT", "1H");
  await h.settle();
  h.feed.watchSeries([{ symbol: "BTCUSDT", interval: "1H" }]);
  assert.equal(h.sockets.length, 1);
  assert.match(h.sockets[0].url, /\/api\/stream\/BTCUSDT\/1H$/);
  h.sockets[0].readyState = 1;
  h.sockets[0].onopen();
  h.sockets[0].onmessage({ data: JSON.stringify({
    type: "candle", symbol: "BTCUSDT", provider_symbol: "BTCUSDT", source: "Binance spot",
    market: "spot", interval: "1H", candle: candle(1719993600, 60333),
  }) });
  assert.equal(h.feed.history("BTCUSDT", "1H").at(-1).c, 60333);
  assert.match(h.feed.badge({ symbol: "BTCUSDT", interval: "1H" }), /stream connected/);
  h.advance(16000);
  assert.match(h.feed.badge({ symbol: "BTCUSDT", interval: "1H" }), /stream stale/);
  assert.equal(h.feed.quote("BTCUSDT"), null, "a 1H candle must not invent a 15m quote");
  h.feed.watchSeries([]);
});

test("reconnect refreshes the latest REST history before applying buffered stream updates", async () => {
  const h = harness();
  h.feed.history("BTCUSDT", "1H");
  await h.settle();
  h.feed.watchSeries([{ symbol: "BTCUSDT", interval: "1H" }]);
  const first = h.sockets[0];
  first.readyState = 1;
  first.onopen();
  first.readyState = 3;
  first.onclose();
  const retry = h.timers.find((timer) => !timer.cleared);
  assert.ok(retry);
  retry.fn();
  const second = h.sockets[1];
  const requestsBeforeReconnect = h.requests.length;
  second.readyState = 1;
  second.onopen();
  second.onmessage({ data: JSON.stringify({
    type: "candle", symbol: "BTCUSDT", provider_symbol: "BTCUSDT", source: "Binance spot",
    market: "spot", interval: "1H", candle: candle(1719993600, 60444),
  }) });
  await h.settle();
  assert.ok(h.requests.length > requestsBeforeReconnect, "reconnect opens a history backfill request");
  assert.equal(h.feed.history("BTCUSDT", "1H").at(-1).c, 60444);
  assert.match(h.feed.badge({ symbol: "BTCUSDT", interval: "1H" }), /stream connected/);
  h.feed.watchSeries([]);
});

test("unsupported intervals and non-Binance instruments do not open Binance streams", () => {
  const h = harness();
  h.feed.watchSeries([{ symbol: "EURUSD", interval: "1H" }, { symbol: "BTCUSDT", interval: "2m" }]);
  assert.equal(h.sockets.length, 0);
});
