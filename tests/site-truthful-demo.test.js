const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const home = fs.readFileSync("index.html", "utf8");
const chartsPage = fs.readFileSync("pages/charts.html", "utf8");
const charts = fs.readFileSync("assets/charts.js", "utf8");
const chartEngine = fs.readFileSync("assets/charts-engine.js", "utf8");

test("homepage labels its preview snapshot and distinguishes missing real data", () => {
  const script = fs.readFileSync("assets/home.js", "utf8");
  assert.match(home, /Illustrative data/);
  assert.match(home, /Preview data/);
  assert.match(home, /Sample prices, events and articles are clearly labelled/);
  assert.match(script, /No verified quote available/);
  assert.match(script, /No verified history is available/);
  assert.doesNotMatch(home, /Live market ticker|Live preview|updated just now/);
});

test("static calendar, news and ideas remain labelled examples", () => {
  assert.match(home, /Sample events/);
  assert.match(home, /No live schedule or release values are connected/);
  assert.match(home, /Example editorials/);
  assert.match(home, /A live news provider is not connected/);
  assert.match(home, /Educational examples/);
  assert.match(home, /Community publishing will be designed separately/);
  assert.doesNotMatch(home, /pages\/markets\.html/);
});

test("chart details and tour are available on demand without auto-opening", () => {
  assert.match(chartsPage, /id="showTourBtn"/);
  assert.match(charts, /\$\("#showTourBtn"\)\.onclick = \(\) => show\("#tour"\)/);
  assert.match(chartEngine, /data-act="details"/);
  assert.match(chartEngine, /this\.legExpanded = !this\.legExpanded/);
  assert.doesNotMatch(charts, /chartsTourSeen|setTimeout\(\(\) => \{\s*const t = \$\("#tour"\)/);
});
