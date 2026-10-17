const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("assets/charts-tv-view.js", "utf8");
const html = fs.readFileSync("pages/charts.html", "utf8");
const css = fs.readFileSync("assets/charts-terminal.css", "utf8");

function harness(search = "", theme = "dark") {
  class Element {
    constructor(tag = "div", id = "") {
      this.tagName = tag.toUpperCase();
      this.id = id;
      this.children = [];
      this.attributes = {};
      this.listeners = {};
      this.style = {};
      this.hidden = false;
      this.textContent = "";
      this.className = "";
      this.href = "";
      this.src = "";
      this.classList = {
        values: new Set(),
        add: name => this.classList.values.add(name),
        remove: name => this.classList.values.delete(name),
        contains: name => this.classList.values.has(name),
        toggle: (name, enabled) => enabled ? this.classList.values.add(name) : this.classList.values.delete(name),
      };
    }
    get firstChild() { return this.children[0] || null; }
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
    removeChild(child) { this.children = this.children.filter(item => item !== child); child.parentNode = null; return child; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    focus() {}
    querySelector(selector) {
      for (const child of this.children) {
        if (selector === "iframe" && child.tagName === "IFRAME") return child;
        const nested = child.querySelector(selector);
        if (nested) return nested;
      }
      return null;
    }
    click() { this.listeners.click?.({ preventDefault() {} }); }
  }
  const ids = ["customChartViewButton", "tradingViewChartButton", "customChartReturn", "tvChartRetry", "tvChartView", "tvChartMount", "tvChartStatus"];
  const elements = Object.fromEntries(ids.map(id => [id, new Element("div", id)]));
  const body = new Element("body");
  elements.tvChartView.hidden = true;
  const document = {
    body,
    documentElement: { getAttribute: () => theme },
    getElementById: id => elements[id] || null,
    createElement: tag => new Element(tag),
  };
  const timers = [];
  const window = {
    location: { search },
    Theme: { current: () => theme },
    setTimeout: callback => { timers.push(callback); return timers.length; },
    clearTimeout: () => {},
    requestAnimationFrame: callback => callback(),
    dispatchEvent: () => {},
    addEventListener: () => {},
  };
  vm.runInNewContext(source, { window, document, URLSearchParams, Event: function Event() {} });
  return { elements, body, timers };
}

test("custom chart remains the default and TradingView is loaded only when selected", () => {
  const { elements, body } = harness();
  assert.equal(elements.tvChartView.hidden, true);
  assert.equal(elements.tvChartMount.children.length, 0);
  elements.tradingViewChartButton.click();
  assert.equal(body.classList.contains("tv-chart-active"), true);
  assert.equal(elements.tvChartView.hidden, false);
  assert.equal(elements.customChartViewButton.attributes["aria-pressed"], "false");
  assert.equal(elements.tradingViewChartButton.attributes["aria-pressed"], "true");
  const container = elements.tvChartMount.children[0];
  const script = container.children.find(child => child.tagName === "SCRIPT");
  const config = JSON.parse(script.textContent);
  assert.equal(script.src, "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js");
  assert.equal(config.symbol, "FX_IDC:EURUSD");
  assert.equal(config.allow_symbol_change, true);
  assert.equal(config.hide_top_toolbar, false);
  assert.equal(config.hide_side_toolbar, false);
  assert.equal(config.interval, "60");
  assert.equal(config.theme, "dark");
  assert.equal(container.children[1].className, "tradingview-widget-copyright");
});

test("widget failure is explained and the custom chart return removes the embed", () => {
  const { elements, body } = harness();
  elements.tradingViewChartButton.click();
  const script = elements.tvChartMount.children[0].children.find(child => child.tagName === "SCRIPT");
  script.onerror();
  assert.match(elements.tvChartStatus.textContent, /could not load the embed/i);
  assert.equal(elements.tvChartRetry.hidden, false);
  elements.customChartReturn.click();
  assert.equal(body.classList.contains("tv-chart-active"), false);
  assert.equal(elements.tvChartView.hidden, true);
  assert.equal(elements.tvChartMount.children.length, 0);
  assert.equal(elements.tradingViewChartButton.attributes["aria-pressed"], "false");
});

test("widget uses the selected app theme and a shareable query opens the separate view", () => {
  const { elements, body } = harness("?view=tradingview", "light");
  assert.equal(body.classList.contains("tv-chart-active"), true);
  const script = elements.tvChartMount.children[0].children.find(child => child.tagName === "SCRIPT");
  const config = JSON.parse(script.textContent);
  assert.equal(config.theme, "light");
  assert.equal(config.backgroundColor, "#ffffff");
  assert.match(html, /id="grid" data-layout="1"/);
  assert.match(html, /id="tvChartView"[^>]*hidden/);
  assert.match(html, /charts-engine\.js/);
  assert.match(html, /This separate chart does not connect to TheOnePercent drawings, Journal, risk tools, or market-data backend/);
  assert.match(css, /\.tv-chart-active \.cshell \{ visibility: hidden; pointer-events: none; \}/);
  assert.match(css, /\.tv-chart-mount \.tradingview-widget-container__widget iframe/);
});
