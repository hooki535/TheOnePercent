const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('all inspector panes switch when the optional action dock is absent', () => {
  const source = fs.readFileSync('assets/charts.js', 'utf8');
  const fn = source.match(/function switchTab\(name\) \{[\s\S]*?\n\}/)[0];
  const names = ['position', 'watchlist', 'objects', 'data', 'journal', 'alerts'];
  const element = (key, value) => ({ dataset: { [key]: value }, classList: { toggle(_, active) { this.active = active; } } });
  const tabs = names.map(name => element('tab', name));
  const panes = names.map(name => element('pane', name));
  const document = { body: { dataset: {} } };
  const paints = [];
  const context = vm.createContext({
    document, state: { watchView: 'list' },
    $$: selector => selector === '.tab' ? tabs : selector === '.tabpane' ? panes : [],
    paintWorkspaceData() { paints.push('data'); },
    paintObjects() { paints.push('objects'); },
    switchWatchView(view, persist) { paints.push([view, persist]); },
  });
  vm.runInContext(fn, context);
  for (const name of names) {
    context.switchTab(name);
    assert.equal(document.body.dataset.workspaceTab, name);
    assert.deepEqual(tabs.filter(t => t.classList.active).map(t => t.dataset.tab), [name]);
    assert.deepEqual(panes.filter(p => p.classList.active).map(p => p.dataset.pane), [name]);
  }
  assert.deepEqual(paints, [['list', false], 'objects', 'data']);
});
