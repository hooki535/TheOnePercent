const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("assets/feed.js", "utf8");
const chartSource = fs.readFileSync("assets/charts.js", "utf8");
const engineSource = fs.readFileSync("assets/charts-engine.js", "utf8");
const providerRows = [
  [1700000000000, "60000", "60200", "59900", "60100", "10"],
  [1700003600000, "60100", "60300", "60050", "60250", "12"],
  [1700007200000, "60250", "60400", "60200", "60350", "14"],
];

function candleBody() {
  return {
    symbol: "BTCUSDT",
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

async function startFeed(backendResponse, publicRows = providerRows) {
  const requests = [];
  let backendReply = backendResponse;
  let publicReply = publicRows;
  let now = 1700000000000;
  const instrument = {
    symbol: "BTCUSD", name: "Bitcoin", market: "Crypto", base: "BTC", quote: "USD",
    price: 60000, dp: 2, pip: 0.01, contract: 1, unitValue: 1,
  };
  const fetch = (url) => {
    requests.push(String(url));
    if (String(url).endsWith("/api/quotes"))
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    if (String(url).includes("/api/candles/")) return Promise.resolve(backendReply);
    if (String(url).startsWith("https://data-api.binance.vision/"))
      return Promise.resolve({ ok: Array.isArray(publicReply), status: 503, json: () => Promise.resolve(publicReply) });
    throw new Error("Unexpected market-data request: " + url);
  };
  const window = {
    THEONEPERCENT_MARKET_API: "https://market-api.example",
    fetch,
    Instruments: {
      find: (symbol) => symbol === "BTCUSD" || symbol === "EURUSD"
        ? Object.assign({}, instrument, { symbol }) : null,
      INSTRUMENTS: [instrument],
    },
  };
  const context = {
    window,
    location: { protocol: "https:" },
    Date: class TestDate extends Date { static now() { return now; } },
    fetch,
    URLSearchParams,
    setInterval: () => 1,
    clearInterval: () => {},
    console,
  };
  vm.runInNewContext(source, context, { filename: "assets/feed.js" });
  const feed = window.Feed;
  feed.history("BTCUSDT", "1H");
  await new Promise((resolve) => setImmediate(resolve));
  return {
    feed, requests,
    setPublicRows(rows) { publicReply = rows; },
    setBackendResponse(response) { backendReply = response; },
    advanceTime(ms) { now += ms; },
  };
}

test("uses real Binance candles directly when the configured proxy is unavailable", async () => {
  const { feed, requests } = await startFeed({ ok: false, status: 503 });

  assert.equal(feed.isHistorical("BTCUSDT", "1H"), true);
  assert.equal(feed.historicalSource("BTCUSDT", "1H"), "Binance spot (BTCUSDT)");
  assert.deepEqual(feed.history("BTCUSDT", "1H").map((bar) => bar.c), [60100, 60250, 60350]);
  assert.ok(requests.some((url) => url.includes("/api/candles/BTCUSDT/1H")));
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

  assert.equal(feed.isHistorical("BTCUSDT", "1H"), true);
  assert.deepEqual(feed.history("BTCUSDT", "1H").map((bar) => bar.c), [60100, 60250, 60350]);
  assert.equal(requests.some((url) => url.startsWith("https://data-api.binance.vision/")), false);
});

test("catalog metadata keeps provider symbol, venue, and quote asset exact", async () => {
  const { feed } = await startFeed({ ok: false, status: 503 });
  feed.registerCatalogInstrument({
    provider: "binance", venue: "BINANCE_SPOT", market: "crypto_spot",
    symbol: "BTCUSDT", provider_symbol: "BTCUSDT", base_asset: "BTC", quote_asset: "USDT",
    availability: "historical_only", price_tick: "0.01", quantity_step: "0.00001",
  });
  const symbol = feed.symbol("BTCUSDT");
  assert.equal(symbol.symbol, "BTCUSDT");
  assert.equal(symbol.providerSymbol, "BTCUSDT");
  assert.equal(symbol.venue, "Binance spot");
  assert.equal(symbol.quote, "USDT");
  assert.equal(symbol.spread, null);
});

test("catalog outage keeps only known exact Binance spot symbols searchable", async () => {
  const { feed } = await startFeed({ ok: false, status: 503 }, null);
  const initial = feed.symbol("BTCUSDT");
  assert.equal(initial.quote, "USDT");
  assert.equal(initial.px, null);
  assert.equal(initial.tick, null);
  assert.equal(initial.step, null);
  assert.ok(feed.list().some((item) => item.symbol === "BTCUSDT"));
  const page = await feed.searchCatalog("BTC", 50, 0, "crypto_spot");

  assert.equal(page.catalog_status, "partial_fallback");
  assert.match(page.catalog_warning, /not a complete catalog/i);
  assert.deepEqual(Array.from(page.data, (row) => row.symbol), ["BTCUSDT"]);
  const btc = feed.registerCatalogInstrument(page.data[0]);
  assert.equal(btc.symbol, "BTCUSDT");
  assert.equal(btc.providerSymbol, "BTCUSDT");
  assert.equal(btc.quote, "USDT");
  assert.equal(btc.px, null);
  assert.equal(btc.tick, null);
  assert.equal(btc.step, null);
  assert.equal(btc.spread, null);
  assert.deepEqual(Array.from(await feed.searchCatalog("bitcoin", 50, 0, "crypto_spot").then((result) => result.data), (row) => row.symbol), ["BTCUSDT"]);
});

test("catalog fallback does not substitute BTCUSDT under a BTCUSD identity", async () => {
  const { feed } = await startFeed({ ok: false, status: 503 }, null);
  const page = await feed.searchCatalog("BTC", 50, 0, "crypto_spot");
  feed.registerCatalogInstrument(page.data[0]);

  assert.equal(feed.symbol("BTCUSD").symbol, "BTCUSD");
  assert.equal(feed.symbol("BTCUSD").provider, undefined);
  assert.match(feed.badge({ symbol: "BTCUSD", interval: "1H" }), /try BTCUSDT/);
  assert.equal(feed.symbol("BTCUSDT").symbol, "BTCUSDT");
  assert.equal(feed.symbol("BTCUSDT").quote, "USDT");
});

test("failed candle requests respect retry delay, then recover without a page reload", async () => {
  const { feed, requests, setPublicRows, advanceTime } = await startFeed({ ok: false, status: 503 }, null);
  const publicRequestCount = () => requests.filter((url) => url.startsWith("https://data-api.binance.vision/")).length;
  const failedCount = publicRequestCount();
  assert.match(feed.badge({ symbol: "BTCUSDT", interval: "1H" }), /Binance request failed/);

  feed.history("BTCUSDT", "1H");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(publicRequestCount(), failedCount, "does not retry on every chart redraw during cooldown");

  advanceTime(60001);
  setPublicRows(providerRows);
  feed.history("BTCUSDT", "1H");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(feed.isHistorical("BTCUSDT", "1H"), true);
  assert.ok(publicRequestCount() > failedCount);
});

test("provider failure leaves charts unavailable until Demo mode is explicitly enabled", async () => {
  const { feed } = await startFeed({ ok: false, status: 503 }, null);

  assert.equal(feed.isDemoMode(), false);
  assert.deepEqual(Array.from(feed.history("BTCUSDT", "1H")), []);
  assert.match(feed.badge({ symbol: "BTCUSDT", interval: "1H" }), /Unavailable · Binance request failed/);

  feed.setDemoMode(true);
  assert.equal(feed.isDemoMode(), true);
  assert.equal(feed.history("EURUSD", "1H").length, feed.BARS);
  assert.match(feed.badge({ symbol: "EURUSD", interval: "1H" }), /Demo candles/);

  feed.setDemoMode(false);
  assert.equal(feed.history("EURUSD", "1H").length, 0);
});

test("chart labels distinguish historical spot data and never synthesize bid/ask quotes", () => {
  assert.match(engineSource, /Feed\.isHistorical\(this\.cfg\.sym, this\.cfg\.iv\)/);
  assert.match(engineSource, /Spot historical/);
  assert.match(engineSource, /Number\.isFinite\(quote\.bid\).*Number\.isFinite\(quote\.ask\)/s);
  assert.doesNotMatch(engineSource, /Live · Dukascopy/);
  assert.match(chartSource, /No provider candles are available for this symbol/);
  assert.match(chartSource, /partial_fallback/);
  assert.match(chartSource, /known Binance spot symbol/);
  assert.match(chartSource, /newChart\("BTCUSDT", "1H"\)/);
  assert.match(chartSource, /Crypto: \["BTCUSDT", "ETHUSDT", "SOLUSDT"\]/);
  assert.match(chartSource, /Verified specifications are unavailable/);
  assert.match(engineSource, /SYMBOLS\[S\]\.tick > 0 \? `  \$\{ticks\.toFixed/);
  assert.match(engineSource, /price units/);
  assert.match(engineSource, /Unavailable/);
  assert.doesNotMatch(engineSource, /Demo fallback/);
  assert.doesNotMatch(chartSource, /Demo fallback until the Flask feed is connected/);
});

