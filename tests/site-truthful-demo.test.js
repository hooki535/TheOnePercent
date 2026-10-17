const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const home = fs.readFileSync("index.html", "utf8");
const chartsPage = fs.readFileSync("pages/charts.html", "utf8");
const charts = fs.readFileSync("assets/charts.js", "utf8");
const chartEngine = fs.readFileSync("assets/charts-engine.js", "utf8");

test("homepage identifies every changing quote as simulated sample data", () => {
  assert.match(home, /SIMULATED MARKET DATA/);
  assert.match(home, /not a live feed/);
  assert.match(home, /aria-label="Simulated market ticker"/);
  assert.match(home, /Synthetic demo candles/);
  assert.doesNotMatch(home, /Live market ticker|Live preview|Live snapshot|updated just now|Prices\s+refresh in place/);
});

test("static calendar and idea examples are not presented as current or community posts", () => {
  assert.match(home, /Sample calendar events/);
  assert.match(home, /not a current economic calendar/);
  assert.doesNotMatch(home, /pages\/markets\.html/);
  assert.match(home, /Illustrative trade examples/);
  assert.match(home, /not published community trades, recommendations, or live posts/);
  assert.doesNotMatch(home, /Achieng K\.|Simon P\.|Moses N\.|2h ago|5h ago/);
});

test("chart details and tour are available on demand without auto-opening", () => {
  assert.match(chartsPage, /id="showTourBtn"/);
  assert.match(charts, /\$\("#showTourBtn"\)\.onclick = \(\) => show\("#tour"\)/);
  assert.match(chartEngine, /data-act="details"/);
  assert.match(chartEngine, /this\.legExpanded = !this\.legExpanded/);
  assert.doesNotMatch(charts, /chartsTourSeen|setTimeout\(\(\) => \{\s*const t = \$\("#tour"\)/);
});
