const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const railSource = fs.readFileSync("assets/charts-rail.js", "utf8");
const terminalCss = fs.readFileSync("assets/charts-terminal.css", "utf8");

class Element {
  constructor(rect = {}) {
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.offsetHeight = 360;
    this._rect = { left: 0, right: 44, top: 120, ...rect };
  }
  getBoundingClientRect() { return this._rect; }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    return child;
  }
  querySelector(selector) {
    if (selector === "#rfly") return this.children.find((child) => child.id === "rfly") || null;
    if (selector.startsWith("[data-grp-open=")) {
      const id = selector.match(/"([^"]+)"/)?.[1];
      return this.groups.get(id) || null;
    }
    return null;
  }
  querySelectorAll() { return []; }
  set innerHTML(html) {
    this.html = html;
    this.children = [];
    this.groups = new Map();
    for (const match of html.matchAll(/data-grp-open="([^"]+)"/g)) {
      this.groups.set(match[1], new Element({ top: 146, right: 44 }));
    }
    if (html.includes('id="rfly"')) {
      const flyout = new Element();
      flyout.id = "rfly";
      flyout.parentNode = this;
      this.children.push(flyout);
    }
  }
}

function renderAt(width) {
  const rail = new Element({ top: width <= 900 ? 700 : 120, right: 44 });
  const body = new Element();
  const document = {
    body,
    activeElement: null,
    querySelector: (selector) => selector === "#crail" ? rail : null,
    querySelectorAll: () => [],
    getElementById: (id) => id === "rfly" ? body.children.find((child) => child.id === "rfly") || rail.querySelector("#rfly") : null,
    addEventListener() {},
  };
  const window = { innerWidth: width, innerHeight: 900, addEventListener() {} };
  const context = {
    document,
    window,
    state: { tool: "cursor", look: { cursor: "cross" }, magnet: false, trades: false },
    DRAW: {},
    Store: { settings: { get: () => ({}), patch() {} } },
    toast() {},
    draw() {},
    charts: [],
    console,
  };
  vm.runInNewContext(railSource, context);
  vm.runInNewContext('railOpen = "lines"; renderRail()', context);
  return { rail, body, html: rail.html };
}

test("all drawing groups render into an unclipped desktop palette", () => {
  const { rail, body, html } = renderAt(1440);
  const palette = body.children.find((child) => child.id === "rfly");
  assert.ok(palette, "the menu is moved outside the scrollable rail");
  assert.equal(palette.style.position, "fixed");
  assert.equal(palette.style.left, "44px");
  assert.equal(palette.style.width, "294px");
  assert.match(html, /data-grp-open="lines"/);
  assert.match(html, /data-grp-open="fib"/);
  assert.match(html, /data-grp-open="patterns"/);
  assert.match(html, /data-grp-open="shapes"/);
  assert.match(terminalCss, /\.fly-r\.on[\s\S]*box-shadow: inset 2px 0 var\(--term-accent\)/);
  assert.equal(rail.children.length, 0, "the palette is not trapped inside the scroll area");
});

test("drawing palette opens above the horizontal rail on mobile", () => {
  const { body } = renderAt(375);
  const palette = body.children.find((child) => child.id === "rfly");
  assert.ok(palette);
  assert.equal(palette.style.left, "8px");
  assert.equal(palette.style.right, "8px");
  assert.equal(palette.style.bottom, "208px");
  assert.equal(palette.style.top, "auto");
});
