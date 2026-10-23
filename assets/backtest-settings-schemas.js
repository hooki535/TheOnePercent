/* Adapted from user-provided tool-schemas.js: settings definitions, not a chart engine. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.BacktestSettingsSchemas=api;})(typeof window==="object"?window:globalThis,function(){
const SCHEMAS=Object.create(null);
/* tool-schemas.js
 * Settings schemas for EVERY drawing tool and indicator, for drawing-settings-dialog.js.
 *   import './tool-schemas.js';   // registers everything into SCHEMAS
 *   openDrawingSettings({ tool: 'parallelchannel', ... });   // drawings
 *   openDrawingSettings({ tool: 'ind:rsi', props: indicator.props, ... }); // indicators
 * Every schema gets `defaults` derived from each field's `def`, so Template > Reset works.
 */


/* ---------- field builders ---------- */
const L = (key, label, color, width = 1, dash = 'solid', toggle = false) =>
  ({ type: 'line', key, label, toggle, def: { on: true, color, width, dash } });
const CK = (key, label, def = false) => ({ type: 'check', key, label, def });
const N = (key, label, def, min, max, step) => ({ type: 'number', key, label, def, min, max, step });
const SEL = (key, label, options, def = options[0]) => ({ type: 'select', key, label, options, def });
const COL = (key, label, def) => ({ type: 'color', key, label, def });
const FILL = (key, label, color, opacity = 0.2, withColor = true) =>
  ({ type: 'fill', key, label, color: withColor, def: { on: true, color, opacity } });
const TXT = (key, label, def = '') => ({ type: 'text', key, label, def });
const FONT = (key, label, color = '#d1d4dc', size = 12) =>
  ({ type: 'font', key, label, def: { color, size, bold: false, italic: false } });
const H = (label) => ({ type: 'heading', label });
const LV = (key, rows) => ({ type: 'levels', key, def: rows.map(([v, c, on]) => ({ v, c, on: !!on })) });

const set = (o, p, v) => { const k = p.split('.'); const l = k.pop(); k.reduce((a, x) => (a[x] ??= {}), o)[l] = v; };
const defaultsOf = (...groups) => {
  const d = {};
  groups.flat().filter(Boolean).forEach((f) => f.def !== undefined && set(d, f.key, JSON.parse(JSON.stringify(f.def))));
  return d;
};

/* register a schema: tool(key, title, {style, inputs, text, pointLabels}) */
function reg(key, title, { style = [], inputs, text, pointLabels } = {}) {
  SCHEMAS[key] = { title, style, inputs, text, pointLabels,
    defaults: defaultsOf(style, inputs, text) };
}

/* ---------- shared groups ---------- */
const EXT = [CK('extendLeft', 'Extend left'), CK('extendRight', 'Extend right')];
const ARROWS = [CK('arrowStart', 'Arrow at start'), CK('arrowEnd', 'Arrow at end')];
const LABELS_PS = [CK('showPrice', 'Show price labels'), CK('showStats', 'Show stats (pips, %, bars)')];
const LABEL_TEXT = [TXT('text', 'Text'), FONT('textFont', 'Text style')];
const BOX = (c) => [L('line', 'Border', c, 1), FILL('background', 'Background', c, 0.2)];

const FIB_RET = [[0, '#787b86', 1], [0.236, '#f23645', 0], [0.382, '#ff9800', 0], [0.5, '#4caf50', 1], [0.618, '#089981', 0],
  [0.786, '#00bcd4', 0], [1, '#787b86', 1], [1.618, '#2962ff', 0], [2.618, '#f23645', 0], [3.618, '#9c27b0', 0],
  [4.236, '#e91e63', 0], [1.272, '#ff9800', 0]];
const FIB_TIME = [[0, '#787b86', 1], [1, '#2962ff', 1], [2, '#089981', 1], [3, '#4caf50', 1], [5, '#ff9800', 1],
  [8, '#f23645', 1], [13, '#9c27b0', 1], [21, '#e91e63', 1], [34, '#00bcd4', 1]];
const FIB_FAN = [[0.382, '#ff9800', 1], [0.5, '#4caf50', 1], [0.618, '#089981', 1]];
const GANN_FAN = [[1, '#f23645', 1], [2, '#ff9800', 1], [3, '#4caf50', 1], [4, '#089981', 1], [8, '#2962ff', 1]];
const PITCH = [[0.25, '#ff9800', 0], [0.382, '#4caf50', 0], [0.5, '#089981', 1], [0.618, '#00bcd4', 0],
  [0.75, '#2962ff', 0], [0.88, '#9c27b0', 0], [1, '#787b86', 1]];

const FIB_STYLE = (rows, extra = []) => [
  L('trend', 'Trend line', '#787b86', 1, 'dashed', true),
  L('levelsLine', 'Levels line', '#787b86', 1),
  ...EXT, LV('levels', rows), ...extra,
  FILL('background', 'Background', '#2962ff', 0.12, false),
  CK('showPrices', 'Show prices', true), CK('showLevels', 'Show levels', true),
  SEL('labelSide', 'Labels', ['left', 'right', 'center']), CK('reverse', 'Reverse'),
];

/* =====================================================================
 * DRAWING TOOLS
 * ===================================================================== */

/* -- Lines -- */
reg('trendline', 'Trend line', { style: [L('line', 'Line', '#2962ff', 2), ...EXT, ...ARROWS, ...LABELS_PS], text: LABEL_TEXT });
reg('ray', 'Ray', { style: [L('line', 'Line', '#2962ff', 2), CK('extendLeft', 'Extend left'), ...LABELS_PS], text: LABEL_TEXT });
reg('infoline', 'Info line', { style: [L('line', 'Line', '#2962ff', 2), ...EXT, CK('showPrice', 'Show price range', true), CK('showBars', 'Show bars', true), CK('showTime', 'Show time', true), CK('showAngle', 'Show angle', true)] });
reg('extendedline', 'Extended line', { style: [L('line', 'Line', '#2962ff', 2), ...LABELS_PS], text: LABEL_TEXT });
reg('trendangle', 'Trend angle', { style: [L('line', 'Line', '#2962ff', 2), L('angleLine', 'Angle line', '#787b86', 1, 'dashed'), CK('showAngle', 'Show angle', true)] });
reg('horizontalline', 'Horizontal line', { style: [L('line', 'Line', '#2962ff', 1), CK('showPrice', 'Show price label', true)], text: LABEL_TEXT, pointLabels: ['Price'] });
reg('horizontalray', 'Horizontal ray', { style: [L('line', 'Line', '#2962ff', 1), CK('showPrice', 'Show price label', true)], text: LABEL_TEXT });
reg('verticalline', 'Vertical line', { style: [L('line', 'Line', '#2962ff', 1)], text: LABEL_TEXT, pointLabels: ['Time'] });
reg('crossline', 'Cross line', { style: [L('line', 'Line', '#2962ff', 1), CK('showPrice', 'Show price label', true), CK('showTime', 'Show time label', true)] });

/* -- Channels -- */
reg('parallelchannel', 'Parallel channel', { style: [L('line', 'Lines', '#2962ff', 2), L('middle', 'Middle line', '#787b86', 1, 'dashed', true), FILL('background', 'Background', '#2962ff', 0.1), ...EXT], pointLabels: ['Start', 'End', 'Channel width'] });
reg('regressiontrend', 'Regression trend', { style: [L('base', 'Base line', '#2962ff', 1, 'dashed', true), L('up', 'Upper line', '#2962ff', 1), L('down', 'Lower line', '#2962ff', 1), N('upDev', 'Upper deviation', 2, 0, 10, 0.1), N('downDev', 'Lower deviation', -2, -10, 0, 0.1), FILL('background', 'Background', '#2962ff', 0.1), ...EXT, SEL('source', 'Source', ['close', 'open', 'high', 'low', 'hl2'])] });
reg('flattopbottom', 'Flat top/bottom', { style: [L('line', 'Lines', '#2962ff', 2), FILL('background', 'Background', '#2962ff', 0.1), ...EXT] });
reg('disjointchannel', 'Disjoint channel', { style: [L('line', 'Lines', '#2962ff', 2), FILL('background', 'Background', '#2962ff', 0.1), ...EXT] });

/* -- Pitchforks -- */
for (const [k, t] of [['pitchfork', 'Pitchfork'], ['schiffpitchfork', 'Schiff pitchfork'], ['modifiedschiff', 'Modified Schiff pitchfork'], ['insidepitchfork', 'Inside pitchfork']]) {
  reg(k, t, { style: [L('median', 'Median line', '#f23645', 2), L('trend', 'Trend line', '#787b86', 1, 'dashed', true), L('levelsLine', 'Levels line', '#787b86', 1), LV('levels', PITCH), FILL('background', 'Background', '#2962ff', 0.1, false), ...EXT], pointLabels: ['Point 1 (start)', 'Point 2', 'Point 3'] });
}

/* -- Fibonacci -- */
reg('fibretracement', 'Fib retracement', { style: FIB_STYLE(FIB_RET) });
reg('fibextension', 'Trend-based fib extension', { style: FIB_STYLE(FIB_RET.map(([v, c, on]) => [v, c, on]).concat([[1.272, '#ff9800', 1]])), pointLabels: ['Point 1', 'Point 2', 'Point 3'] });
reg('fibchannel', 'Fib channel', { style: FIB_STYLE(FIB_RET) });
reg('fibtimezone', 'Fib time zone', { style: [L('levelsLine', 'Lines', '#2962ff', 1), LV('levels', FIB_TIME), FILL('background', 'Background', '#2962ff', 0.05, false), CK('showLabels', 'Show labels', true), SEL('labelSide', 'Labels', ['top', 'bottom'])] });
reg('fibfan', 'Fib speed resistance fan', { style: [L('trend', 'Trend line', '#787b86', 1, 'dashed', true), L('levelsLine', 'Fan lines', '#787b86', 1), LV('levels', FIB_FAN), FILL('background', 'Background', '#2962ff', 0.08, false), CK('showGrid', 'Show grid', true), CK('showLabels', 'Show labels', true)] });
reg('fibarc', 'Fib speed resistance arcs', { style: [L('trend', 'Trend line', '#787b86', 1, 'dashed', true), L('levelsLine', 'Arcs', '#787b86', 1), LV('levels', FIB_FAN), FILL('background', 'Background', '#2962ff', 0.08, false), CK('fullCircles', 'Full circles')] });
reg('fibcircles', 'Fib circles', { style: [L('trend', 'Trend line', '#787b86', 1, 'dashed', true), L('levelsLine', 'Circles', '#787b86', 1), LV('levels', FIB_RET.slice(0, 8)), FILL('background', 'Background', '#2962ff', 0.06, false)] });
reg('fibspiral', 'Fib spiral', { style: [L('line', 'Line', '#2962ff', 2), CK('counterclockwise', 'Counterclockwise')] });
reg('fibwedge', 'Fib wedge', { style: [L('trend', 'Trend line', '#787b86', 1, 'dashed', true), L('levelsLine', 'Levels line', '#787b86', 1), LV('levels', FIB_FAN), FILL('background', 'Background', '#2962ff', 0.08, false)] });

/* -- Gann -- */
reg('gannfan', 'Gann fan', { style: [L('levelsLine', 'Lines', '#787b86', 1), LV('levels', GANN_FAN), FILL('background', 'Background', '#2962ff', 0.06, false), CK('showLabels', 'Show labels', true), N('scaleRatio', 'Price/bar ratio', 1, 0.0001, 1000, 'any')] });
reg('gannbox', 'Gann box', { style: [L('levelsLine', 'Lines', '#787b86', 1), LV('levels', [[0, '#787b86', 1], [0.25, '#ff9800', 1], [0.382, '#4caf50', 1], [0.5, '#089981', 1], [0.618, '#00bcd4', 1], [0.75, '#2962ff', 1], [1, '#787b86', 1]]), FILL('background', 'Background', '#2962ff', 0.06, false), CK('showLabels', 'Show labels', true), CK('reverse', 'Reverse')] });
reg('gannsquare', 'Gann square', { style: [L('levelsLine', 'Lines', '#787b86', 1), FILL('background', 'Background', '#2962ff', 0.06, false), CK('showAngles', 'Show angles', true), CK('showLabels', 'Show labels', true), CK('reverse', 'Reverse')] });

/* -- Patterns -- */
for (const [k, t, pts] of [
  ['xabcd', 'XABCD pattern', ['X', 'A', 'B', 'C', 'D']],
  ['cypher', 'Cypher pattern', ['X', 'A', 'B', 'C', 'D']],
  ['abcd', 'ABCD pattern', ['A', 'B', 'C', 'D']],
  ['threedrives', 'Three drives pattern', ['Start', '1', '2', '3', '4', '5', '6']],
  ['headshoulders', 'Head and shoulders', ['Left shoulder', 'Neck 1', 'Head', 'Neck 2', 'Right shoulder']],
  ['trianglepattern', 'Triangle pattern', ['A', 'B', 'C', 'D']],
]) {
  reg(k, t, { style: [L('line', 'Lines', '#2962ff', 2), L('dashed', 'Ratio lines', '#787b86', 1, 'dashed'), FILL('background', 'Background', '#2962ff', 0.15), CK('showRatios', 'Show ratios', true), CK('showLabels', 'Show labels', true)], text: [FONT('labelFont', 'Label style')], pointLabels: pts });
}
reg('elliottimpulse', 'Elliott impulse wave (12345)', { style: [L('line', 'Lines', '#2962ff', 2), SEL('degree', 'Degree', ['Minute', 'Minor', 'Intermediate', 'Primary', 'Cycle', 'Supercycle'], 'Minor'), CK('showWave', 'Show wave labels', true)], text: [FONT('labelFont', 'Label style')] });
reg('elliottcorrection', 'Elliott correction wave (ABC)', { style: [L('line', 'Lines', '#f23645', 2), SEL('degree', 'Degree', ['Minute', 'Minor', 'Intermediate', 'Primary', 'Cycle', 'Supercycle'], 'Minor'), CK('showWave', 'Show wave labels', true)], text: [FONT('labelFont', 'Label style')] });

/* -- Forecasting & position tools -- */
const POS = (c1, c2) => [
  N('accountSize', 'Account size', 10000, 0), N('riskPct', 'Risk %', 1, 0, 100, 0.1), N('lotSize', 'Lot size', 1, 0, 100000, 'any'),
  FILL('profit', 'Profit zone', c1, 0.2), FILL('loss', 'Stop zone', c2, 0.2),
  L('line', 'Lines', '#787b86', 1), CK('showStats', 'Show stats (R:R, risk $, qty)', true), CK('compact', 'Compact stats'),
];
reg('longposition', 'Long position', { style: POS('#089981', '#f23645'), pointLabels: ['Entry', 'Stop loss', 'Take profit'] });
reg('shortposition', 'Short position', { style: POS('#089981', '#f23645'), pointLabels: ['Entry', 'Stop loss', 'Take profit'] });
reg('forecast', 'Forecast', { style: [L('line', 'Line', '#2962ff', 2, 'dashed'), FILL('background', 'Background', '#2962ff', 0.1), CK('showStats', 'Show stats', true)] });
reg('barspattern', 'Bars pattern', { style: [SEL('mode', 'Mode', ['Bars', 'Line', 'Open-close', 'Line - HL']), CK('mirrored', 'Mirrored'), CK('flipped', 'Flipped'), COL('color', 'Color', '#2962ff')] });
reg('ghostfeed', 'Ghost feed', { style: [COL('upColor', 'Up color', '#089981'), COL('downColor', 'Down color', '#f23645'), N('opacity', 'Opacity', 0.5, 0, 1, 0.05)] });
reg('projection', 'Projection', { style: [L('line', 'Line', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.1)] });
reg('anchoredvwap', 'Anchored VWAP', { style: [L('line', 'VWAP', '#2962ff', 2), CK('bands', 'Bands', false), N('bandMult', 'Band multiplier', 1, 0.1, 10, 0.1), SEL('source', 'Source', ['hlc3', 'close', 'open', 'high', 'low', 'hl2', 'ohlc4'])], pointLabels: ['Anchor'] });
reg('volumeprofile', 'Fixed range volume profile', { style: [COL('upColor', 'Up volume', '#2962ff'), COL('downColor', 'Down volume', '#ff9800'), N('rows', 'Row count', 24, 5, 200), N('valueAreaPct', 'Value area %', 70, 1, 100), L('poc', 'Point of control', '#f23645', 1), CK('showValues', 'Show values'), SEL('placement', 'Placement', ['left', 'right'])] });

/* -- Measure -- */
reg('pricerange', 'Price range', { style: [L('line', 'Line', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.15), CK('showPips', 'Show pips', true), CK('showPercent', 'Show %', true)] });
reg('daterange', 'Date range', { style: [L('line', 'Line', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.15), CK('showBars', 'Show bars', true), CK('showTime', 'Show time', true)] });
reg('datepricerange', 'Date and price range', { style: [L('line', 'Line', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.15), CK('showPips', 'Show pips', true), CK('showPercent', 'Show %', true), CK('showBars', 'Show bars', true), CK('showTime', 'Show time', true)] });
reg('measure', 'Measure', { style: [FILL('upBackground', 'Up color', '#2962ff', 0.2), FILL('downBackground', 'Down color', '#f23645', 0.2), L('line', 'Line', '#787b86', 1, 'dashed')] });

/* -- Shapes & brushes -- */
reg('brush', 'Brush', { style: [L('line', 'Line', '#2962ff', 3), N('smoothing', 'Smoothing', 5, 0, 20), SEL('capStyle', 'Line ends', ['round', 'square', 'butt'])] });
reg('highlighter', 'Highlighter', { style: [COL('color', 'Color', '#f7c244'), N('width', 'Width', 20, 5, 60), N('opacity', 'Opacity', 0.35, 0.05, 1, 0.05)] });
reg('rectangle', 'Rectangle', { style: [...BOX('#2962ff'), ...EXT], text: LABEL_TEXT });
reg('rotatedrectangle', 'Rotated rectangle', { style: BOX('#2962ff'), text: LABEL_TEXT });
reg('circle', 'Circle', { style: BOX('#2962ff'), text: LABEL_TEXT });
reg('ellipse', 'Ellipse', { style: BOX('#2962ff'), text: LABEL_TEXT });
reg('triangle', 'Triangle', { style: BOX('#2962ff'), text: LABEL_TEXT });
reg('polyline', 'Polyline', { style: [L('line', 'Line', '#2962ff', 2), FILL('background', 'Background', '#2962ff', 0.1)] });
reg('path', 'Path', { style: [L('line', 'Line', '#2962ff', 2), ...ARROWS] });
reg('arc', 'Arc', { style: BOX('#2962ff') });
reg('curve', 'Curve', { style: [L('line', 'Line', '#2962ff', 2), ...ARROWS, FILL('background', 'Background', '#2962ff', 0.1)] });

/* -- Arrows -- */
reg('arrow', 'Arrow', { style: [L('line', 'Line', '#2962ff', 2), CK('arrowEnd', 'Arrow head', true), ...LABELS_PS], text: LABEL_TEXT });
reg('arrowmarker', 'Arrow marker', { style: [COL('color', 'Color', '#2962ff'), FILL('background', 'Background', '#2962ff', 0.4)], text: LABEL_TEXT });
reg('arrowup', 'Arrow up', { style: [COL('color', 'Color', '#089981'), COL('border', 'Border', '#089981')], text: LABEL_TEXT });
reg('arrowdown', 'Arrow down', { style: [COL('color', 'Color', '#f23645'), COL('border', 'Border', '#f23645')], text: LABEL_TEXT });

/* -- Text, notes & annotations -- */
const TEXTBOX = [FONT('font', 'Text', '#ffffff', 14), TXT('text', 'Content'), FILL('background', 'Background', '#2a2e39', 0.9), L('line', 'Border', '#363a45', 1, 'solid', true), SEL('align', 'Alignment', ['left', 'center', 'right'], 'left'), CK('wrap', 'Wrap text', true)];
reg('text', 'Text', { style: TEXTBOX });
reg('anchoredtext', 'Anchored text', { style: TEXTBOX });
reg('note', 'Note', { style: [...TEXTBOX, COL('pinColor', 'Pin color', '#f7c244')] });
reg('pricenote', 'Price note', { style: [...TEXTBOX, L('leader', 'Leader line', '#787b86', 1, 'dashed')] });
reg('pin', 'Pin', { style: [COL('color', 'Color', '#f7c244'), TXT('text', 'Tooltip')] });
reg('callout', 'Callout', { style: TEXTBOX });
reg('comment', 'Comment', { style: TEXTBOX });
reg('pricelabel', 'Price label', { style: [FONT('font', 'Text', '#ffffff', 12), FILL('background', 'Background', '#2962ff', 1), L('line', 'Border', '#2962ff', 1, 'solid', true)] });
reg('signpost', 'Signpost', { style: [...TEXTBOX, L('pole', 'Pole', '#787b86', 1)] });
reg('flagmark', 'Flag mark', { style: [COL('color', 'Color', '#f23645')] });
reg('table', 'Table', { style: [FONT('font', 'Text', '#ffffff', 12), FILL('background', 'Background', '#1e222d', 0.9), L('line', 'Border', '#363a45', 1), N('rows', 'Rows', 3, 1, 20), N('cols', 'Columns', 3, 1, 10)] });
reg('image', 'Image', { style: [N('opacity', 'Opacity', 1, 0, 1, 0.05), L('line', 'Border', '#363a45', 1, 'solid', true), CK('keepRatio', 'Keep aspect ratio', true)] });

/* -- Icons & stickers -- */
reg('emoji', 'Emoji', { style: [N('size', 'Size', 32, 12, 200)] });
reg('sticker', 'Sticker', { style: [N('size', 'Size', 48, 12, 200)] });
reg('icon', 'Icon', { style: [COL('color', 'Color', '#f7c244'), N('size', 'Size', 32, 12, 200)] });

/* =====================================================================
 * INDICATORS  (use tool: 'ind:<id>')
 * ===================================================================== */
const SRC = ['close', 'open', 'high', 'low', 'hl2', 'hlc3', 'ohlc4'];
const MA_TYPE = ['SMA', 'EMA', 'WMA', 'RMA', 'VWMA'];
const ind = (id, title, { inputs = [], style = [] } = {}) =>
  reg('ind:' + id, title, { inputs: [...inputs, SEL('timeframe', 'Timeframe', ['Chart', '1m', '5m', '15m', '1h', '4h', '1D'], 'Chart')], style: [...style, CK('showLabels', 'Labels on price scale', true), CK('showValues', 'Values in status line', true)] });

const MA_INPUTS = [N('inputs.length', 'Length', 20, 1, 5000), SEL('inputs.source', 'Source', SRC), N('inputs.offset', 'Offset', 0, -500, 500)];
for (const [id, t, c] of [['sma', 'Moving Average (SMA)', '#2962ff'], ['ema', 'Moving Average Exponential', '#ff9800'], ['wma', 'Weighted Moving Average', '#9c27b0'], ['hma', 'Hull Moving Average', '#089981']]) {
  ind(id, t, { inputs: MA_INPUTS, style: [L('plot', 'Plot', c, 2)] });
}
ind('vwap', 'VWAP', { inputs: [SEL('inputs.anchor', 'Anchor period', ['Session', 'Week', 'Month', 'Year'], 'Session'), SEL('inputs.source', 'Source', SRC, 'hlc3'), CK('inputs.bands', 'Bands')], style: [L('plot', 'VWAP', '#2962ff', 2), L('upper', 'Upper band', '#089981', 1, 'solid', true), L('lower', 'Lower band', '#089981', 1, 'solid', true), FILL('background', 'Band fill', '#089981', 0.1)] });
ind('bollinger', 'Bollinger Bands', { inputs: [N('inputs.length', 'Length', 20, 1, 5000), SEL('inputs.maType', 'Basis MA type', MA_TYPE), SEL('inputs.source', 'Source', SRC), N('inputs.mult', 'StdDev', 2, 0.001, 50, 0.1), N('inputs.offset', 'Offset', 0, -500, 500)], style: [L('basis', 'Basis', '#ff9800', 1), L('upper', 'Upper', '#2962ff', 1), L('lower', 'Lower', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.1, false)] });
ind('keltner', 'Keltner Channels', { inputs: [N('inputs.length', 'Length', 20, 1, 5000), N('inputs.mult', 'Multiplier', 2, 0.1, 50, 0.1), N('inputs.atrLength', 'ATR length', 10, 1, 500), CK('inputs.useEma', 'Use exponential MA', true)], style: [L('basis', 'Basis', '#2962ff', 1), L('upper', 'Upper', '#2962ff', 1), L('lower', 'Lower', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.1, false)] });
ind('donchian', 'Donchian Channels', { inputs: [N('inputs.length', 'Length', 20, 1, 5000)], style: [L('basis', 'Basis', '#ff9800', 1), L('upper', 'Upper', '#2962ff', 1), L('lower', 'Lower', '#2962ff', 1), FILL('background', 'Background', '#2962ff', 0.1, false)] });
ind('supertrend', 'Supertrend', { inputs: [N('inputs.atrLength', 'ATR length', 10, 1, 500), N('inputs.factor', 'Factor', 3, 0.1, 50, 0.1)], style: [L('up', 'Up trend', '#089981', 2), L('down', 'Down trend', '#f23645', 2), FILL('background', 'Background', '#089981', 0.1, false)] });
ind('psar', 'Parabolic SAR', { inputs: [N('inputs.start', 'Start', 0.02, 0, 1, 0.01), N('inputs.increment', 'Increment', 0.02, 0, 1, 0.01), N('inputs.max', 'Maximum', 0.2, 0, 1, 0.01)], style: [COL('color', 'Color', '#2962ff'), N('size', 'Dot size', 2, 1, 6)] });
ind('ichimoku', 'Ichimoku Cloud', { inputs: [N('inputs.conversion', 'Conversion line', 9, 1, 500), N('inputs.base', 'Base line', 26, 1, 500), N('inputs.spanB', 'Leading span B', 52, 1, 500), N('inputs.displacement', 'Lagging span', 26, 1, 500)], style: [L('conversion', 'Conversion', '#2962ff', 1), L('base', 'Base', '#f23645', 1), L('lagging', 'Lagging span', '#089981', 1), L('spanA', 'Leading span A', '#4caf50', 1), L('spanB', 'Leading span B', '#f23645', 1), FILL('cloudUp', 'Bullish cloud', '#4caf50', 0.15), FILL('cloudDown', 'Bearish cloud', '#f23645', 0.15)] });
ind('rsi', 'Relative Strength Index', { inputs: [N('inputs.length', 'Length', 14, 1, 5000), SEL('inputs.source', 'Source', SRC), CK('inputs.smoothing', 'Smoothing MA', false), SEL('inputs.maType', 'Smoothing type', MA_TYPE), N('inputs.maLength', 'Smoothing length', 14, 1, 500)], style: [L('plot', 'RSI', '#7e57c2', 2), L('ma', 'Smoothing MA', '#f7c244', 1, 'solid', true), L('upper', 'Upper band', '#787b86', 1, 'dashed'), L('middle', 'Middle band', '#787b86', 1, 'dashed', true), L('lower', 'Lower band', '#787b86', 1, 'dashed'), N('upperValue', 'Upper value', 70, 0, 100), N('lowerValue', 'Lower value', 30, 0, 100), FILL('background', 'Background', '#7e57c2', 0.1)] });
ind('macd', 'MACD', { inputs: [N('inputs.fast', 'Fast length', 12, 1, 500), N('inputs.slow', 'Slow length', 26, 1, 500), N('inputs.signal', 'Signal smoothing', 9, 1, 500), SEL('inputs.source', 'Source', SRC), SEL('inputs.oscMa', 'Oscillator MA type', ['EMA', 'SMA']), SEL('inputs.signalMa', 'Signal MA type', ['EMA', 'SMA'])], style: [L('macd', 'MACD', '#2962ff', 2), L('signal', 'Signal', '#ff9800', 2), COL('histUpStrong', 'Histogram: above 0, rising', '#26a69a'), COL('histUpWeak', 'Histogram: above 0, falling', '#b2dfdb'), COL('histDownStrong', 'Histogram: below 0, falling', '#ef5350'), COL('histDownWeak', 'Histogram: below 0, rising', '#ffcdd2')] });
ind('stochastic', 'Stochastic', { inputs: [N('inputs.k', '%K length', 14, 1, 500), N('inputs.d', '%D smoothing', 3, 1, 500), N('inputs.smoothK', '%K smoothing', 1, 1, 500)], style: [L('k', '%K', '#2962ff', 1), L('d', '%D', '#ff9800', 1), L('upper', 'Upper band', '#787b86', 1, 'dashed'), L('lower', 'Lower band', '#787b86', 1, 'dashed'), FILL('background', 'Background', '#7e57c2', 0.1)] });
ind('cci', 'Commodity Channel Index', { inputs: [N('inputs.length', 'Length', 20, 1, 5000), SEL('inputs.source', 'Source', SRC, 'hlc3')], style: [L('plot', 'CCI', '#2962ff', 1), L('upper', 'Upper band', '#787b86', 1, 'dashed'), L('lower', 'Lower band', '#787b86', 1, 'dashed'), FILL('background', 'Background', '#2962ff', 0.1)] });
ind('atr', 'Average True Range', { inputs: [N('inputs.length', 'Length', 14, 1, 5000), SEL('inputs.smoothing', 'Smoothing', ['RMA', 'SMA', 'EMA', 'WMA'])], style: [L('plot', 'ATR', '#b71c1c', 1)] });
ind('adx', 'Average Directional Index', { inputs: [N('inputs.adxSmoothing', 'ADX smoothing', 14, 1, 500), N('inputs.diLength', 'DI length', 14, 1, 500)], style: [L('adx', 'ADX', '#f23645', 1), L('plusDi', '+DI', '#2962ff', 1), L('minusDi', '-DI', '#ff6d00', 1)] });
ind('volume', 'Volume', { inputs: [CK('inputs.colorByPrev', 'Color based on previous close', false)], style: [COL('up', 'Up volume', '#26a69a'), COL('down', 'Down volume', '#ef5350'), L('ma', 'Volume MA', '#2962ff', 1, 'solid', true), N('inputs.maLength', 'MA length', 20, 1, 500)] });
ind('obv', 'On Balance Volume', { inputs: [CK('inputs.smoothing', 'Smoothing', false), N('inputs.maLength', 'Smoothing length', 14, 1, 500)], style: [L('plot', 'OBV', '#2962ff', 1), L('ma', 'Smoothing MA', '#ff9800', 1, 'solid', true)] });
ind('pivotpoints', 'Pivot Points Standard', { inputs: [SEL('inputs.type', 'Type', ['Traditional', 'Fibonacci', 'Woodie', 'Classic', 'DeMark', 'Camarilla'], 'Traditional'), SEL('inputs.timeframe', 'Pivots timeframe', ['Auto', 'Daily', 'Weekly', 'Monthly'], 'Auto'), N('inputs.lookback', 'Number of pivots back', 15, 1, 100)], style: [L('p', 'P', '#ff9800', 1), L('r', 'Resistance (R1-R5)', '#f23645', 1), L('s', 'Support (S1-S5)', '#089981', 1), CK('showLabels', 'Show labels', true), CK('showPrices', 'Show prices', true)] });

/* Sessions: Asia / London / New York boxes */
ind('sessions', 'Sessions', {
  inputs: [SEL('inputs.timezone', 'Timezone', ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Africa/Kampala'], 'UTC'),
    TXT('inputs.asia', 'Asia (HHMM-HHMM)', '0000-0800'), TXT('inputs.london', 'London (HHMM-HHMM)', '0700-1600'), TXT('inputs.newyork', 'New York (HHMM-HHMM)', '1300-2200')],
  style: [FILL('asia', 'Asia', '#2962ff', 0.1), FILL('london', 'London', '#089981', 0.1), FILL('newyork', 'New York', '#ff9800', 0.1), CK('showLabels', 'Show session names', true), CK('showRange', 'Show high/low range', true)],
});

/* Day break lines + weekday names: the TradingView-style separators you asked for */
ind('daybreaklines', 'Day Break Lines', {
  inputs: [
    SEL('inputs.every', 'Draw a break line every', ['1 day', '2 days', 'Week', 'Month'], '1 day'),
    SEL('inputs.timezone', 'Day starts in timezone', ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Africa/Kampala'], 'America/New_York'),
    N('inputs.startHour', 'Day starts at hour (0-23)', 17, 0, 23),
    CK('inputs.hideWeekends', 'Hide Saturday and Sunday lines', true),
  ],
  style: [
    L('line', 'Break line', '#787b86', 1, 'dashed'),
    CK('showWeekday', 'Show weekday names', true),
    SEL('weekdayFormat', 'Weekday format', ['Mon', 'Monday', 'M'], 'Monday'),
    SEL('labelPosition', 'Label position', ['top', 'bottom', 'center'], 'top'),
    FONT('labelFont', 'Label style', '#868993', 11),
    CK('showDate', 'Show date', false),
    FILL('alternate', 'Alternate day shading', '#787b86', 0.04, false),
  ],
});
ind('weeklybreaks', 'Week Break Lines', { inputs: [SEL('inputs.weekStart', 'Week starts on', ['Sunday', 'Monday'], 'Sunday'), SEL('inputs.timezone', 'Timezone', ['UTC', 'America/New_York', 'Africa/Kampala'], 'America/New_York')], style: [L('line', 'Break line', '#787b86', 1, 'dashed'), CK('showWeek', 'Show week number', true)] });
ind('prevdayhl', 'Previous Day High/Low', { inputs: [SEL('inputs.timezone', 'Timezone', ['UTC', 'America/New_York'], 'America/New_York'), N('inputs.startHour', 'Day starts at hour', 17, 0, 23)], style: [L('high', 'Previous high', '#f23645', 1, 'dashed'), L('low', 'Previous low', '#089981', 1, 'dashed'), L('close', 'Previous close', '#787b86', 1, 'dotted', true), CK('showLabels', 'Show labels', true)] });
ind('openingrange', 'Opening Range', { inputs: [TXT('inputs.range', 'Range (HHMM-HHMM)', '1330-1400'), SEL('inputs.timezone', 'Timezone', ['UTC', 'America/New_York'], 'America/New_York')], style: [L('high', 'High', '#2962ff', 1), L('low', 'Low', '#2962ff', 1), FILL('background', 'Range fill', '#2962ff', 0.1), CK('extend', 'Extend to end of day', true)] });

/* ---------- helpers for the toolbar & registry ---------- */
const DRAWING_TOOLS = Object.keys(SCHEMAS).filter((k) => !k.startsWith('ind:'));
const INDICATORS = Object.keys(SCHEMAS).filter((k) => k.startsWith('ind:'));
const defaultsFor = (tool) => JSON.parse(JSON.stringify(SCHEMAS[tool].defaults));

return {SCHEMAS,DRAWING_TOOLS,INDICATORS,defaultsFor};
});
