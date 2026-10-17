const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const feedSource = fs.readFileSync(path.join(__dirname, "../assets/feed.js"), "utf8");
const exnessInstrument = {
  provider: "exness_mt5", venue: "Exness-MT5Trial", exchange: "Exness Technologies Ltd",
  market: "forex", symbol: "EURUSDm", provider_symbol: "EURUSDm",
  name: "Euro vs US Dollar", availability: "historical_only", digits: 5,
  price_tick: 0.00001, base_asset: "EUR", quote_asset: "USD",
};

function createFeed({ local = true } = {}) {
  const requests = [];
  const savedSettings = { chartsCatalogSymbols: [], chartsDataMode: "real" };
  const window = {
    THEONEPERCENT_LOCAL_MT5: local,
    THEONEPERCENT_MARKET_API: local ? "http://localhost:8765" : "https://theonepercent-market-api.onrender.com",
    Instruments: { INSTRUMENTS: [], find: () => null },
    Store: { settings: { get: () => savedSettings, patch: (changes) => Object.assign(savedSettings, changes) } },
    fetch: null,
  };
  const fetch = async (url) => {
    requests.push(String(url));
    if (!String(url).startsWith("http://localhost:8765/")) throw new Error("External request attempted in test");
    if (String(url).includes("/api/instruments")) {
      return { ok: true, json: async () => ({ data: [exnessInstrument], total: 1, has_more: false }) };
    }
    if (String(url).includes("/api/candles?symbol=EURUSDm&interval=1m")) {
      return { ok: true, json: async () => ({
        provider: "exness_mt5", market: "broker_cfd", symbol: "EURUSDm",
        provider_symbol: "EURUSDm", source: "Exness MT5 · Exness-MT5Trial",
        candles: [{ t: 100, o: 1.1, h: 1.2, l: 1.0, c: 1.15, v: 8 }],
      }) };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  window.fetch = fetch;
  const sandbox = {
    window, Store: window.Store, Instruments: window.Instruments, location: local
      ? { hostname: "localhost", port: "8765", protocol: "http:" }
      : { hostname: "hooki535.github.io", port: "", protocol: "https:" },
    fetch, URLSearchParams, setInterval: () => 1, clearInterval: () => {},
    addEventListener: () => {}, Date, Math, Number, String, Object, Array, Set, Map,
    Error, console,
  };
  vm.runInNewContext(feedSource, sandbox, { filename: "assets/feed.js" });
  return { Feed: window.Feed, requests, savedSettings };
}

test("local mode discovers exact Exness symbols and loads local broker candles only", async () => {
  const { Feed, requests, savedSettings } = createFeed();
  const page = await Feed.searchCatalog("EURUSDm", 50, 0, "forex");
  assert.equal(page.data[0].provider, "exness_mt5");
  const shaped = Feed.registerCatalogInstrument(page.data[0], true);
  assert.equal(shaped.providerSymbol, "EURUSDm");
  assert.equal(shaped.instrument, null);
  assert.equal(Feed.symbol("EURUSDM").provider, "exness_mt5");
  assert.equal(savedSettings.chartsCatalogSymbols[0].symbol, "EURUSDM");

  Feed.loadHistory("EURUSDM", "1m");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(requests.map((url) => new URL(url).pathname), [
    "/api/instruments", "/api/candles",
  ]);
  assert.equal(new URL(requests[1]).searchParams.get("symbol"), "EURUSDm");
  assert.equal(new URL(requests[1]).searchParams.get("interval"), "1m");
  assert.equal(Feed.isHistorical("EURUSDM", "1m"), true);
  assert.match(Feed.historicalSource("EURUSDM", "1m"), /Exness MT5/);
});

test("local mode has no quote polling and cannot fall through to public providers", async () => {
  const { Feed, requests } = createFeed();
  await Feed.searchCatalog("", 50, 0, "");
  assert.equal(requests.length, 1);
  assert.ok(requests.every((url) => url.startsWith("http://localhost:8765/")));
});

test("non-local pages reject persisted Exness listings", () => {
  const { Feed } = createFeed({ local: false });
  assert.equal(Feed.registerCatalogInstrument(exnessInstrument), null);
});
