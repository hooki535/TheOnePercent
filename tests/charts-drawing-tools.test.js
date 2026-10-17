const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const shapesSource = fs.readFileSync("assets/charts-shapes.js", "utf8");
const engineSource = fs.readFileSync("assets/charts-engine.js", "utf8");
const workspaceSource = fs.readFileSync("assets/charts.js", "utf8");
const railSource = fs.readFileSync("assets/charts-rail.js", "utf8");

function shapeContext() {
  const context = { DRAW: {} };
  vm.runInNewContext(shapesSource, context, { filename: "charts-shapes.js" });
  return context;
}

test("fib extension seeds an independent third anchor", () => {
  const context = shapeContext();
  const result = vm.runInNewContext(`(() => {
    const o = { t: "fibext", pts: [{ i: 0, p: 100 }, { i: 10, p: 110 }] };
    seedPts(o, o.pts[0], o.pts[1]);
    return o.pts;
  })()`, context);
  assert.equal(result.length, 3);
  assert.notDeepEqual(result[2], result[1]);
  assert.equal(result[2].i, 5.5);
  assert.equal(result[2].p, 105.5);
});

test("hit geometry follows later pattern legs and filled triangle interior", () => {
  const context = shapeContext();
  const nearestBlockStart = engineSource.indexOf("  nearest(p) {");
  const nearestBlockEnd = engineSource.indexOf("\n  dataWindow(d)", nearestBlockStart);
  assert.ok(nearestBlockStart >= 0 && nearestBlockEnd > nearestBlockStart);
  const method = engineSource.slice(nearestBlockStart, nearestBlockEnd);
  vm.runInNewContext(`class TestChart { ${method} }\nglobalThis.nearest = TestChart.prototype.nearest;`, context);

  const chart = {
    drw: [{ t: "xabcd", hidden: false, pts: [
      { i: 0, p: 0 }, { i: 10, p: 10 }, { i: 20, p: 0 }, { i: 30, p: 10 }, { i: 40, p: 0 },
    ] }],
    inChartBody: () => true,
    inPricePlot: () => true,
    x: (i) => i,
    y: (p) => p,
  };
  assert.equal(context.nearest.call(chart, { x: 35, y: 5 }), 0);
  chart.drw = [{ t: "ellipse", hidden: false, pts: [{ i: 0, p: 0 }, { i: 100, p: 40 }] }];
  assert.equal(context.nearest.call(chart, { x: 50, y: 20 }), 0);
  assert.equal(context.nearest.call(chart, { x: 0, y: 0 }), -1, "the unused bounding-box corner is not a hit");
  assert.equal(context.drawingPathHitDistance([
    { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 },
  ], 9, 1, true, true), 0);
});

test("ellipse hit testing follows the oval rather than its whole box", () => {
  const context = shapeContext();
  assert.equal(context.drawingEllipseHitDistance(0, 0, 100, 40, 50, 20), 0);
  assert.ok(context.drawingEllipseHitDistance(0, 0, 100, 40, -15, 20) > 5);
});

test("custom Fibonacci levels are normalized and old drawings retain defaults", () => {
  const context = shapeContext();
  const actual = context.drawingLevelsFor({ levels: ["0", "0.5", "0.5", "1.618", "bad", 11] });
  assert.deepEqual(Array.from(actual), [0, 0.5, 1.618]);
  const legacy = context.drawingLevelsFor({ t: "fib" }, [0, 0.236, 0.5, 0.618, 1]);
  assert.deepEqual(Array.from(legacy), [0, 0.236, 0.5, 0.618, 1]);
  assert.match(workspaceSource, /data-k="levels"/);
  assert.match(workspaceSource, /ensureDrawEditUndo\(\)/);
});

test("drawing history round-trips legacy type IDs and optional level settings", () => {
  const start = workspaceSource.indexOf("const undoStack = [],");
  const end = workspaceSource.indexOf("/* ═══", start);
  assert.ok(start >= 0 && end > start, "undo implementation markers are present");
  const state = {
    charts: [{ key: "BTCUSDT|5m", studies: [] }],
    drawings: { "BTCUSDT|5m": [
      { id: "old-1", t: "trend", pts: [{ i: 2, p: 100 }, { i: 5, p: 105 }] },
      { id: "fib-1", t: "fibext", pts: [{ i: 1, p: 99 }, { i: 8, p: 106 }, { i: 5, p: 102 }], levels: [0, 0.5, 1.618] },
    ] },
    layout: 1,
    pos: null,
    type: "candles",
  };
  const context = { state, buildGrid() {}, paintAll() {}, toast() {} };
  vm.runInNewContext(`${workspaceSource.slice(start, end)}\nglobalThis.history = { pushUndo, undo, redo };`, context);
  const before = JSON.stringify(state.drawings);
  context.history.pushUndo();
  state.drawings["BTCUSDT|5m"][0].pts[1].p = 999;
  state.drawings["BTCUSDT|5m"][1].levels = [0, 1];
  context.history.undo();
  assert.equal(JSON.stringify(state.drawings), before);
  context.history.redo();
  assert.equal(state.drawings["BTCUSDT|5m"][0].pts[1].p, 999);
  assert.deepEqual(Array.from(state.drawings["BTCUSDT|5m"][1].levels), [0, 1]);
  assert.equal(state.drawings["BTCUSDT|5m"][0].t, "trend");
});

test("tool rail exposes search, persisted keep mode and reorderable favorites", () => {
  const rail = fs.readFileSync("assets/charts-rail.js", "utf8");
  assert.match(rail, /data-tool-search/);
  assert.match(rail, /chartsKeepDrawing/);
  assert.match(rail, /chartsLastToolByGroup/);
  assert.match(rail, /ondrop/);
  assert.match(rail, /Alt\+ArrowUp/);
  assert.match(rail, /toggle\("keepDrawingMode"/);
});

test("searchable flyout filters tools and hides empty section labels", () => {
  const railSource = fs.readFileSync("assets/charts-rail.js", "utf8");
  const search = { value: "", oninput: null, closest: () => ({}) };
  const empty = { hidden: true };
  const row = (name) => ({
    dataset: { toolName: name }, hidden: false, nextElementSibling: null,
    matches: () => false,
  });
  const trend = row("trend line"), ray = row("ray"), channel = row("parallel channel");
  const label = (next) => ({ hidden: false, nextElementSibling: next, matches: (s) => s === "[data-section-label]" });
  const labelLines = label(trend), labelChannels = label(channel);
  trend.nextElementSibling = ray;
  ray.nextElementSibling = labelChannels;
  channel.nextElementSibling = null;
  const rows = [trend, ray, channel], labels = [labelLines, labelChannels];
  let activeElement = search;
  const listeners = {};
  const flyButtons = [
    { dataset: { fly: "trend" }, closest: () => trend, focus() { activeElement = this; } },
    { dataset: { fly: "ray" }, closest: () => ray, focus() { activeElement = this; } },
    { dataset: { fly: "channel" }, closest: () => channel, focus() { activeElement = this; } },
  ];
  const document = {
    querySelector: (selector) => selector === "#rfly [data-tool-search]" ? search : selector === "#rfly [data-tool-empty]" ? empty : null,
    querySelectorAll: (selector) => selector === "#rfly .fly-w" ? rows : selector === "#rfly [data-section-label]" ? labels : selector === "#rfly [data-fly]" ? flyButtons : [],
    get activeElement() { return activeElement; },
    set activeElement(value) { activeElement = value; },
    addEventListener: (type, handler) => { listeners[type] = handler; },
  };
  const context = {
    document, window: { addEventListener() {}, innerWidth: 1200, innerHeight: 900 },
    state: { tool: "cursor", look: { cursor: "cross" } }, DRAW: {}, Store: { settings: { get: () => ({}), patch() {} } },
    toast() {}, draw() {}, charts: [], console,
  };
  vm.runInNewContext(railSource, context);
  vm.runInNewContext('railOpen = "lines"', context);
  context.wireRail();
  search.value = "ray";
  search.oninput();
  assert.deepEqual(rows.map((item) => item.hidden), [true, false, true]);
  assert.deepEqual(labels.map((item) => item.hidden), [false, true]);
  assert.equal(empty.hidden, true);
  let prevented = false;
  listeners.keydown({ key: "ArrowDown", target: search, preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(document.activeElement, flyButtons[1], "keyboard navigation skips filtered-out tools");
  search.value = "no match";
  search.oninput();
  assert.ok(rows.every((item) => item.hidden));
  assert.ok(labels.every((item) => item.hidden));
  assert.equal(empty.hidden, false);
});

test("last-used tools and favorite order persist in chart settings", () => {
  const settings = {
    chartsFavTools: ["trend", "ray", "fib"],
    chartsLastToolByGroup: { lines: "ray" },
    chartsKeepDrawing: true,
  };
  const context = {
    document: { querySelector: () => null, addEventListener() {}, querySelectorAll: () => [] },
    window: { addEventListener() {}, innerWidth: 1200, innerHeight: 900 },
    state: { tool: "cursor", look: { cursor: "cross" } }, DRAW: {},
    Store: { settings: { get: () => settings, patch: (next) => Object.assign(settings, next) } },
    toast() {}, draw() {}, charts: [], console,
  };
  vm.runInNewContext(railSource, context);
  vm.runInNewContext(`loadFavs(); pickTool("ray"); reorderFavorite("trend", "fib");\n` +
    `globalThis.railState = { last: railPick.lines, favs: railFavs.slice(), keep: state.keepDrawingMode };`, context);
  assert.equal(context.railState.last, "ray");
  assert.deepEqual(Array.from(context.railState.favs), ["ray", "fib", "trend"]);
  assert.equal(context.railState.keep, true);
  assert.deepEqual(JSON.parse(JSON.stringify(settings.chartsLastToolByGroup)), {
    cursors: "cursor", lines: "ray", fib: "fib", patterns: "xabcd",
    shapes: "rect", notes: "text", measure: "measure", trade: "position",
  });
  assert.deepEqual(settings.chartsFavTools, ["ray", "fib", "trend"]);
});
