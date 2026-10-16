const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const storeSource = fs.readFileSync(path.join(root, "assets/store.js"), "utf8");
const chartsSource = fs.readFileSync(path.join(root, "assets/charts.js"), "utf8");
const dashboardSource = fs.readFileSync(path.join(root, "assets/dashboard.js"), "utf8");
const journalSource = fs.readFileSync(path.join(root, "assets/journal.js"), "utf8");
const settingsSource = fs.readFileSync(path.join(root, "assets/settings.js"), "utf8");
const dashboardHtml = fs.readFileSync(path.join(root, "pages/dashboard.html"), "utf8");

function loadStore(seed = []) {
  const data = new Map([["onepercent:trades", JSON.stringify(seed)]]);
  const localStorage = {
    getItem: (k) => data.has(k) ? data.get(k) : null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  const listeners = {};
  const window = {
    localStorage,
    addEventListener: (k, fn) => { listeners[k] = fn; },
    dispatchEvent: () => true,
  };
  const context = { window, CustomEvent: function CustomEvent() {}, console, Date, Intl, Math, JSON, Map, Set, Number, String, Object, Array, parseFloat };
  vm.runInNewContext(storeSource, context, { filename: "assets/store.js" });
  return { Store: window.Store, data };
}

function trade(overrides = {}) {
  return {
    id: "t1", date: "2026-10-16", account: "A", symbol: "EURUSD",
    side: "Long", entry: 100, stop: 90, size: 1, contractValue: 1,
    fees: 0, exits: [{ price: 110, size: 1 }],
    ...overrides,
  };
}

test("invalid entry never fabricates closed-trade P/L or R", () => {
  const { Store } = loadStore();
  for (const entry of [undefined, null, "", " ", "nope", "100bad"]) {
    const c = Store.compute(trade({ entry }));
    assert.equal(c.open, false);
    assert.equal(c.netPL, null);
    assert.equal(c.grossPL, null);
    assert.equal(c.r, null);
    assert.equal(c.result, "Unavailable");
  }
});

test("numeric zero remains a valid entry", () => {
  const { Store } = loadStore();
  const c = Store.compute(trade({ entry: 0, stop: -10, exits: [{ price: 10, size: 1 }] }));
  assert.equal(c.netPL, 10);
  assert.equal(c.result, "Win");
});

test("partial then final closure uses each exit once and remaining size for exposure", () => {
  const { Store } = loadStore();
  const partial = trade({ size: 2, exits: [{ price: 110, size: 1 }] });
  const open = Store.openRisk([partial], { balance: 1000 });
  assert.equal(open.n, 1);
  assert.equal(open.rows[0].remainingSize, 1);
  assert.equal(open.rows[0].openRiskMoney, 10);
  assert.equal(open.riskMoney, null);
  const closed = { ...partial, exits: [...partial.exits, { price: 120, size: 1 }] };
  const s = Store.stats([closed], {});
  assert.equal(s.closed, 1);
  assert.equal(s.eligiblePL, 1);
  assert.equal(s.eligibleR + s.rUnavailable, s.closed);
  assert.equal(Store.compute(closed).netPL, 30);
  assert.equal(s.netPL, null);
});

test("old open position remains in account-wide exposure outside performance dates", () => {
  const { Store } = loadStore();
  const oldOpen = trade({ date: "2026-01-01", exits: [], size: 1, account: "A" });
  const recentCohort = [];
  const exposure = Store.openRisk([oldOpen], { balance: 1000 });
  assert.equal(exposure.n, 1);
  assert.equal(Store.stats(recentCohort, {}).closed, 0);
});

test("equivalent Dashboard and Journal cohorts agree on eligible trade metrics", () => {
  const { Store } = loadStore();
  const cohort = [trade({ id: "a" }), trade({ id: "b", entry: 100, exits: [{ price: 90, size: 1 }] })];
  const dashboard = Store.stats(cohort, {});
  const journal = Store.stats(cohort, {});
  assert.equal(dashboard.winRate, journal.winRate);
  assert.equal(dashboard.averageR, journal.averageR);
  assert.equal(dashboard.eligiblePL, journal.eligiblePL);
  assert.equal(dashboard.netPL, null);
  assert.match(dashboardSource, /Store\.stats\(trades, settings\(\)\)/);
  assert.match(journalSource, /Store\.stats\(rows\.map\(\(r\) => r\.t\), settings\(\)\)/);
});

test("known guardrail breach takes precedence over unavailable daily assessment", () => {
  const { Store } = loadStore();
  const today = new Date(2026, 9, 16, 12);
  const rows = [
    trade({ id: "incomplete", entry: null, date: "2026-10-16" }),
  ];
  const g = Store.guardrails(rows, { maxTradesPerDay: 1, maxDailyLossPct: 3, coolOffAfterLosses: 0 }, today);
  assert.equal(g.dailyLossStatus, "unavailable");
  assert.equal(g.assessmentStatus, "breached");
  assert.ok(g.breaches.some((x) => x.kind === "tradeCount"));
  assert.ok(g.unavailableReasons.length > 0);
});

test("calculations do not alter persisted synthetic records", () => {
  const stored = [trade({ id: "persisted" })];
  const { Store, data } = loadStore(stored);
  const before = data.get("onepercent:trades");
  Store.compute(stored[0]);
  Store.stats(stored, {});
  Store.guardrails(stored, { maxDailyLossPct: 3, maxTradesPerDay: 5, coolOffAfterLosses: 3 }, new Date(2026, 9, 16));
  assert.equal(data.get("onepercent:trades"), before);
});

test("Charts day-risk presentation preserves zero, known values, uncertainty, and breaches", () => {
  const match = chartsSource.match(/function chartsDayRiskAssessment\([\s\S]*?\n}/);
  assert.ok(match, "Charts presentation helper is present in the actual candidate source");
  const context = {};
  vm.runInNewContext(match[0], context);
  const assess = context.chartsDayRiskAssessment;
  assert.deepEqual(JSON.parse(JSON.stringify(assess(0, 1.25, 3))), { status: "assessed", totalPct: 1.25, capPct: 3, breaches: [] });
  assert.equal(assess(0.75, 1.25, 3).totalPct, 2);
  const unknown = assess(null, 1.25, 3);
  assert.equal(unknown.status, "unavailable");
  assert.equal(unknown.totalPct, null);
  assert.equal(assess(null, 1.25, 3, [{ kind: "tradeCount" }]).status, "breached");
  assert.match(chartsSource, /day:\s*dayAssessment\.totalPct/);
  assert.doesNotMatch(chartsSource, /R\.dayUsed\s*\|\|\s*0/);
  assert.match(chartsSource, /Day risk if filled<\/span><b>\$\{c\.day === null \? "Unavailable"/);
  assert.match(chartsSource, /<div class="ro"><span>Risk<\/span>/);
});

test("root presentation separates account exposure and performance, and labels unavailable aggregates", () => {
  assert.match(dashboardSource, /function accountTrades\(\)/);
  assert.match(dashboardSource, /Store\.openRisk\(accountTrades\(\), settings\(\)\)/);
  assert.match(dashboardSource, /compatible units are not recorded/);
  assert.match(dashboardSource, /stats\.realizedCurve/);
  assert.match(journalSource, /Net P\/L of fully closed trades/);
  assert.match(journalSource, /Cohort uses journal date because close timestamps are absent/);
  assert.match(settingsSource, /g\.netToday === null \? "Unavailable"/);
  assert.match(settingsSource, /netPL_calculation_units/);
  assert.doesNotMatch(chartsSource, /You can still take it|Nothing is blocked/);
  assert.match(dashboardSource, /g\.breaches\.map[\s\S]*g\.unavailableReasons\.map/);
  assert.match(journalSource, /g\.breaches\.map[\s\S]*g\.unavailableReasons\.map/);
  assert.match(dashboardHtml, /Current exposure includes all open positions/);
  assert.match(dashboardHtml, /Performance uses journal dates because close timestamps are not stored/);
});
