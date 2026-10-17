const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("assets/feed.js", "utf8");
const providerRows = [
  [1700000000000, "60000", "60200", "59900", "60100", "10"],
  [1700003600000, "60100", "60300", "60050", "60250", "12"],
  [1700007200000, "60250", "60400", "60200", "60350", "14"],
];

function candleBody() {
  return {
    symbol: "BTCUSD",
    provider_symbol: "BTCUSDT",
    source: "Binance spot",
    market: "spot",
    interval: "1H",
    candles: providerRows.map((row) => ({
      t: row[0] / 1000,
      o: Number(row[1]),
      h: Number(row[2]),
      l: Number(row[3]),
      c: Number(row[4]),
      v: Number(row[5]),
    })),
  };
}

async function startFeed(backendResponse) {
  const requests = [];
  const instrument = {
    symbol: "BTCUSD", name: "Bitcoin", market: "Crypto", base: "BTC", quote: "USD",
    price: 60000, dp: 2, pip: 0.01, contract: 1, unitValue: 1,
  };
  const fetch = (url) => {
    requests.push(String(url));
    if (String(url).endsWith("/api/quotes"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (String(url).includes("/api/candles/")) return Promise.resolve(backendResponse);
    if (String(url).startsWith("https://data-api.binance.vision/"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(providerRows) });
    throw new Error("Unexpected market-data request: " + url);
  };
  const window = {
    THEONEPERCENT_MARKET_API: "https://market-api.example",
    fetch,
    Instruments: { find: () => instrument, INSTRUMENTS: [instrument] },
  };
  const context = {
    window,
    location: { protocol: "https:" },
    fetch,
    URLSearchParams,
    setInterval: () => 1,
    clearInterval: () => {},
    console,
  };
  vm.runInNewContext(source, context, { filename: "assets/feed.js" });
  const feed = window.Feed;
  feed.history("BTCUSD", "1H");
  await new Promise((resolve) => setImmediate(resolve));
  return { feed, requests };
}

test("uses real Binance candles directly when the configured proxy is unavailable", async () => {
  const { feed, requests } = await startFeed({ ok: false, status: 503 });

  assert.equal(feed.isHistorical("BTCUSD", "1H"), true);
  assert.equal(feed.historicalSource("BTCUSD", "1H"), "Binance spot (BTCUSDT)");
  assert.deepEqual(feed.history("BTCUSD", "1H").map((bar) => bar.c), [60100, 60250, 60350]);
  assert.ok(requests.some((url) => url.includes("/api/candles/BTCUSD/1H")));
  const directRequest = requests.find((url) => url.includes("data-api.binance.vision/api/v3/klines"));
  assert.ok(directRequest);
  assert.match(directRequest, /symbol=BTCUSDT/);
  assert.match(directRequest, /interval=1h/);
});

test("keeps the configured market API as the first source when it succeeds", async () => {
  const { feed, requests } = await startFeed({
    ok: true,
    json: () => Promise.resolve(candleBody()),
  });

  assert.equal(feed.isHistorical("BTCUSD", "1H"), true);
  assert.deepEqual(feed.history("BTCUSD", "1H").map((bar) => bar.c), [60100, 60250, 60350]);
  assert.equal(requests.some((url) => url.startsWith("https://data-api.binance.vision/")), false);
});

