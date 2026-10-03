# TheOnePercent · Phase 1 (revised)

This supersedes `TheOnePercent-Phase-1-Roadmap.pdf` where the two disagree. The
PDF got the screens right. What it was missing was everything underneath them:
a data model, a market-data source, a theme, and an honest split between the
loop that must ship and the surfaces that can follow it.

---

## 1. What changed and why

### 1.1 Phase 1 is now 1A and 1B

The PDF's own closing page admits the risk: "building all twelve surfaces to
sixty percent instead of the loop to a hundred percent." That is not a risk to
watch, it is a plan to write down. So it is written down.

**Phase 1A — the loop that has to close.** Cover page, auth, onboarding,
journal, calculators, dashboard, settings. A stranger lands, signs up, sizes a
position, logs the trade, and sees the truth about it. Nothing here is optional,
because removing any one of them breaks the loop.

**Phase 1B — the surfaces that make it a product.** Charts and Market Watch,
market context (news, calendar, sentiment), Learn, leaderboard. Each one is
valuable and each one can arrive a week late without the product being broken.

### 1.2 There is now a data layer, and it is swappable

The PDF describes email verification, a persistent journal and a leaderboard —
none of which a static front end can actually do. Rather than choose between
"fake it forever" and "stop and build a backend", every screen talks to one
module, `assets/store.js`, which exposes a driver interface:

```
Store.trades.list()  .save(t)  .remove(id)
Store.profile.get()  .patch(p)
Store.settings.get() .patch(p)  .clear()
```

Today the driver is `local` (browser storage, with an in-memory fallback for
sandboxed frames). Later, a `rest` driver with the same five methods points at a
real API and no screen changes. This is the single most important structural
decision in the revision: it is what stops Phase 1 from being a demo that has to
be rewritten.

**Honest labelling until the backend exists.** Sign-up says the account is local
to this browser. The verification screen does not pretend an email was sent.
The leaderboard ships in 1B, after the backend, because a leaderboard with one
device and no server is theatre.

### 1.3 Charts: hand-rolled after all — reversed

**This section has been reversed. Read the reasoning, not just the conclusion.**

The original call was to use
[Lightweight Charts](https://tradingview.github.io/lightweight-charts/) and
keep only the toolbar, the drawing overlay and the **Save to journal** button as
ours. The argument was sound in the abstract: hand-building candlesticks,
Fibonacci, zones, indicators and a volume pane is a month of work.

Then the month of work already existed. `assets/charts-engine.js` is a complete
canvas engine, and the things it does are precisely the things this product is
for, not the things a generic charting library is for:

- **The position tool.** Drag entry, stop and target on the chart and the size
  comes back through `Instruments.positionSize` against the real account
  balance and risk rule. This is the whole reason the page exists. Lightweight
  Charts has no primitive for it — it would be a separate overlay canvas kept
  in sync with someone else's scale, which is the hand-rolled work again with a
  coordination bug attached.
- **Bar replay.** Step the chart forward one bar at a time to rehearse a setup.
- **Volume profile** over the visible range.
- **A drawing layer** with 21 tools that hit-tests, selects and edits.

Porting to Lightweight Charts would mean deleting four features to gain a
dependency. So: the engine stays ours. What was taken from the original call is
the discipline behind it — no invented data, one source of prices, one source of
position sizing.

The existing canvas sparklines stay, unchanged, for the same reason as before.

### 1.4 Market data: simulated now, real behind one interface

All quotes come from `Feed` (`assets/feed.js`), which streams deterministic,
realistic prices and carries a visible **Demo data** badge wherever it is
displayed. Swapping in a real provider is one module, and the badge is the
promise that we will never quietly show fake prices as real ones. The PDF's
"visible refresh time and a graceful failure state" is kept, and now has
something to be true about.

`Feed` is the single price source for the whole app:

| Member | Returns |
| --- | --- |
| `Feed.list()` | every tradeable symbol, from `Instruments.INSTRUMENTS` |
| `Feed.history(sym, iv)` | 620 OHLCV bars, seeded so they never change between reloads |
| `Feed.quote(sym)` / `Feed.last(sym)` | current price and change |
| `Feed.spark(sym, n)` | a short close series for sparklines |
| `Feed.subscribe(fn)` | tick stream; returns its own unsubscribe |
| `Feed.badge({compact})` | the **Demo data** chip, so no screen can forget it |
| `Feed.pause()` / `resume()` / `isLive` | stop ticking when a tab is hidden |

Series are anchored so the last close equals the instrument's price in
`Instruments`, which is why a size calculated on the charts page matches one
calculated in the calculators. `assets/shell.js` still carries its own `QUOTES`
array for the right rail — that is the last remaining second price source and
should read from `Feed` next.

### 1.5 Dark first

Traders sit in front of these screens for hours, at night, next to a broker
terminal that is already dark. TradingView is dark by default for a reason.
Dark is now the default theme, light is a first-class toggle in the rail, and
every colour is a token so neither theme is a second-class citizen.

### 1.6 Onboarding asks a third question

Every calculator reads account balance, account currency and default risk
percent. The PDF buried all three in Settings, which means the calculators are
broken on day one for anyone who never opens Settings. Onboarding is now three
questions: markets, experience, and **starting balance plus default risk**.

### 1.7 The discipline score drops win rate

The PDF's formula is risk adherence 40, win rate 30, journaling consistency 30 —
and then says the point is to not reward luck. Win rate *is* partly luck, and it
actively punishes the correct low-win-rate, high-R strategies the lessons teach.
Revised:

| Component | Weight | Why |
| --- | --- | --- |
| Risk adherence | 40% | Share of trades inside the user's own risk rule. |
| Risk consistency | 25% | Low variance in risk per trade. Punishes revenge sizing. |
| Journaling consistency | 25% | Days logged against days traded. |
| Plan adherence | 10% | Trades where the stop was honoured, self-reported. |

Profit and loss is still excluded. Win rate is still shown on the dashboard,
where it is information, and kept out of the ranking, where it is noise. A
minimum of twenty logged trades is required to appear at all, which is the
cheapest anti-gaming rule available.

### 1.8 The journal spec grew the fields that make R correct

Without these, every R multiple the dashboard shows is wrong:

- **Fees and commissions** per trade, subtracted before R is computed.
- **Partial exits** — one trade, several exits, a weighted average result.
- **Trade currency vs account currency**, so a JPY pair reports in UGX.
- **Multiple accounts** (demo and live at minimum), filterable everywhere.
- **CSV import** from a broker statement, because nobody retypes six months.

### 1.9 A global filter bar on the dashboard

Stat cards over "all trades ever" are close to meaningless. The dashboard gets
one persistent filter — date range and account — that every widget reads.

### 1.10 Things the PDF did not mention at all

- **Command palette.** `Ctrl/⌘ K` already focuses search; it becomes a real
  palette that can jump to a symbol, a tool, or a lesson, plus `/` to search
  and `N` to log a trade. This is most of what makes a terminal feel fast.
- **Loading, empty and error states as a first-class item**, not just the one
  dashboard empty state.
- **Instrumentation.** A handful of events — signed up, onboarded, first trade
  logged, second session — because "does the loop close" is a measurable
  question and we should not guess at it.
- **Legal surface.** A persistent risk disclaimer, "not financial advice" on
  sentiment and news, and the DOB age gate actually enforced rather than
  collected.
- **Accessibility in the definition of done.** Keyboard reachable, visible
  focus, WCAG AA contrast — including the up/down greens and reds, which fail
  contrast in almost every trading product ever shipped.

---

## 2. Build order

Steps 1–8 are complete, plus the pre-trade checklist below. Step 9 (market
context) is next.

| # | Step | State |
| --- | --- | --- |
| 1 | Cover page, shell, navigation, right rail | done |
| 2 | Sign-up, login, onboarding | done |
| 3 | Theme system, data layer, simulated feed | done |
| 4 | Journal — log, filters, detail drawer, import | done |
| 5 | Calculators and converters | done |
| 6 | **Dashboard widgets over real journal data** | done |
| 7 | Settings — account, risk rules, guardrails, profile, data | done |
| 8 | **Charts and Market Watch** | done |
| 9 | Market context — news, calendar, sentiment | 1B |
| 10 | Learn — lesson paths and resource library | 1B |
| 11 | Backend (`rest` driver), real accounts and verification | 1B |
| 12 | Leaderboard | 1B, after the backend |

The journal comes before the dashboard because the dashboard is a view over
journal data. The calculators come before the dashboard because they are
self-contained and immediately useful. That part of the PDF was right.

---

## 3. Definition of done

**Phase 1A**

- A new user goes from cover page to a logged, reviewed trade in one sitting,
  unaided.
- Dashboard numbers are derived from journal entries and are arithmetically
  correct, including fees and partial exits.
- Position size, pip value and margin agree with a broker's own calculator to
  two decimal places.
- Every screen is usable at 375px. Mobile is not a Phase 2 concern in this
  market.
- Every screen works in both themes.
- Any simulated data carries a Demo badge.
- Keyboard reachable, visible focus, AA contrast.

**Phase 1B** adds: charts end in a journal entry, context panels degrade
gracefully when a feed fails, lessons gate at eighty percent, and the
leaderboard shows handles only with the formula printed on the page.

---

## 3d. Calculators: one at a time

The calculators screen shipped as eight panels stacked down one page, two to
a row. Every one of them worked, and the screen was still wrong: whichever
calculator you came for was below the fold, and the two-column grid kept a
calculator you were not using in your eyeline while you typed into one you
were.

It is now a dropdown — grouped into "before you enter", "what it would
mean" and "quick conversions" — showing one calculator at a time, with a
line under it saying in plain words what that calculator answers, because a
list of eight nouns does not tell a beginner which one they need. Arrows
step through them for when you do not know what you are looking for.

The choice lives in the URL fragment, which costs nothing and pays for
itself three times: the back button behaves, `calculators.html#mg` is a
link straight to margin, and every existing deep link into this page still
lands on a visible panel instead of a hidden one. It is deliberately not
saved to settings — a UI preference is not account data, and writing one on
every click would fire a change event across every open screen for nothing.

The demo-rates badge now hides itself on the compounding calculator, which
is the one view on the page that uses no rates at all.

## 3c. Added beyond the original plan: leak detection

The roadmap asked for dashboard widgets over journal data. Widgets were the
easy half. The screen as specified — net P/L, expectancy, win rate, a curve —
is entirely descriptive: it says what happened and nothing about what to
change, and a trader opening it every morning is asking the second question.

So the dashboard now leads with **what is costing you money**, and the
engine behind it (`Store.leaks()`) separates two kinds of claim:

| | Rules | Patterns |
| --- | --- | --- |
| What it is | A rule the user set, broken | A statistical claim about the future |
| Sample gate | none — one occurrence counts | 3 in the subset, 6 closed in the journal |
| Priced as | exact arithmetic (excess risk, R past the stop, P&L of the extra entries) | subset expectancy minus the expectancy of the rest of the journal |
| Shown as | red left edge, "Rule broken" | neutral edge, sample size printed on the card |

Rules detected: sizing above the risk rule, a loss past 1.15R (the stop
moved), a trade logged with no stop at all, entries past the daily trade
limit. Patterns detected: entries taken within ninety minutes of closing a
loss, and the worst session, state of mind, setup, day and instrument.

Three honesty rules are built in and should not be relaxed:

1. A pattern is measured against the rest of the journal, never against
   zero. A losing session inside a losing month is not a leak.
2. Every pattern carries its sample size on the card, without exception.
3. A finding only appears if removing it would have helped. Two cuts over
   exactly the same trades are deduped — that is one finding said twice.

The panel also names the best setup and the best session. A screen that
only lists faults gets opened once and never again.

**Open risk** was added alongside it, and it is the only forward-looking
number on the site: what is at stake right now if every open stop is hit,
measured against the daily loss rail, so a three percent day is visible
before it happens. Positions with no stop are counted separately, never
silently as zero.

The equity curve got a cursor readout — balance, change and date per point
— because a line without numbers is decoration.

Deliberately **not** built: a setup/session/day grouping toggle on the
dashboard. The journal's insights tables already do that, and the
dashboard's job here is diagnosis, not a second copy of the breakdown.

## 3b. Added beyond the original plan: guardrails

The plan graded trades **after** they were closed. A discipline score of 62 tells
a trader what they already know — the money is gone. The rule that would have
saved the money has to be checked *before* the next entry, so `Store.guardrails()`
reads the journal for today and answers a different question: should there be
another trade at all?

Three rails, all of them the user's own numbers, all of them set in Settings:

| Rail | Setting | Default |
| --- | --- | --- |
| Daily loss stop | `maxDailyLossPct` | 3% of balance |
| Trades per day | `maxTradesPerDay` | 3 |
| Cool-off after losses in a row | `coolOffAfterLosses` | 3 |

Any rail set to `0` is switched off. "Today" is the local calendar day, not UTC —
a Kampala trader's day does not end at 3am. When a rail is broken the journal and
the dashboard show a banner naming the rule and what it is protecting; nothing is
ever *blocked*, because a tool that locks a trader out gets closed and the trade
goes in the broker anyway, unlogged. The point is that the trade is taken
knowingly. With warnings switched off the breach is still computed and flagged
`muted`, so Settings can tell the user the rule is broken and nothing is saying so.

`minRR` moved out of the code and into Settings at the same time: the discipline
score used to award its planned-R:R marks against a hard-coded 1.5.

---

## 4. Out of scope, unchanged

Broker connections, live orders, copy trading, backtesting, signal selling,
social features beyond the leaderboard, payments, native apps, AI trade
analysis. All deliberate. The last one stays out until there is journal data
worth analysing, which is precisely the point of shipping the journal first.

---

## 5. Architecture notes

```
index.html              cover page (logged out)
pages/
  sign-up.html          account creation
  login.html
  onboarding.html       markets → experience → balance & risk
  dashboard.html        feedback surface
  journal.html          trade log
  calculators.html      sizing, risk, margin, P&L, converters
  settings.html         account, risk rules, guardrails, profile, data
  charts.html           chart, drawing tools, position tool, market watch
assets/
  theme.js              sets data-theme before first paint (no flash)
  shell.css  shell.js   tokens, chrome, top nav, right rail, palette
  store.js              data layer — local driver today, rest driver later
  instruments.js        instrument + currency reference, all sizing maths
                        (demo prices and rates, carries the Demo badge)
  feed.js               the only price source — bars, quotes, ticks, badge
  charts-engine.js      canvas renderer, indicators, drawing hit-testing
  charts.js             charts page wiring — panel, watchlist, alerts, save
  <page>.css/.js        page-specific
docs/PHASE-1.md         this file
```

Conventions: every colour is a token, every page sets `data-page` and
`data-depth` on `<body>` and includes `shell.js` last, and no screen touches
browser storage directly — it goes through `Store`.

**The canvas cannot read a stylesheet.** `charts-engine.js` picks colours with
`css('--name')` at draw time, which means the chart needs every colour it uses
to exist as a custom property. `assets/charts.css` opens with a `:root` block
that maps the engine's short names onto the shell tokens (`--txt2` → `--muted`,
`--dn` → `--down`, `--grid` → a mix of `--line`, and so on). That block is the
entire contract between the two files. Add a `css('--x')` call to the engine and
the alias has to be added there, or the chart draws with an empty string and the
shape silently disappears. Aliases resolve to literal colours rather than
`color-mix()` results, because canvas colour parsing is stricter than CSS is.

## 3e. Added beyond the original plan: the pre-trade checklist

Every leak the dashboard can name — oversized, stop overrun, revenge entry, one
trade too many — was a decision made in the minute before the entry. The
dashboard reports them after the money is gone. The checklist runs while it can
still change the outcome, and it is the only screen in the app that can.

It lives as the last fieldset in the trade form, titled **Before you enter**, and
is split deliberately.

**What the app already knows** is computed and re-checked on every keystroke, so
there is nothing to tick:

| Check | Passes when |
| --- | --- |
| A stop is set | `stop` is a number |
| The stop is on the losing side | long stop below entry, short stop above (only shown once a stop exists) |
| Inside your risk rule | `riskPct` ≤ `settings.riskPct` |
| Meets your minimum R:R | `plannedRR` ≥ `settings.minRR`; no target counts as unmet, because unknown reward is not the same as good reward |
| The setup is named | the setup select is no longer on its placeholder |
| The session is named | same |
| No guardrail breached today | `Store.guardrails()` reports no breach, or guardrails are muted |

**What only you can answer** is three things and no more, because a longer list
is a list people tick without reading:

- a one-line written reason, saved as `t.plan`
- "my stop is where the idea is wrong, not at the loss I can stomach"
- "this is my setup, not the last trade" — reworded to name the loss when the
  last closed trade lost

The verdict stays quiet until there is an entry and a size to judge; being told
eight things are wrong before typing a character is nagging, not coaching.

**It does not block saving.** A checklist that refuses gets lied to, and nothing
here can stop an order at the broker anyway. Overriding costs a sentence
instead: the submit button becomes **Log it anyway**, a confirm names exactly
what is unmet, and the trade is saved carrying `t.unmet` — which the detail
drawer shows as *Taken off plan* and the CSV exports as an `offPlan` column.

Two things follow from that record, and they are the reason the gate is worth
obeying at all:

- `Store.leaks()` gained two cuts — trades taken with the checklist unmet, and
  trades with no reason written — both priced against the rest of the journal by
  the existing `versusRest()` machinery, never against zero. Identical subsets
  still dedupe, so if every off-plan trade is also an unplanned one you see it
  once.
- Editing a trade never rewrites its pre-trade record. A journal that lets you
  tidy up history is worth nothing.

On an existing trade the section relabels to **The plan behind it**: the checks
and the verdict come off, since grading a trade you already took teaches
nothing, but the reason stays editable because writing it down late still beats
leaving it blank.

`discipline()` weights were deliberately **not** changed. Folding the checklist
into the score would silently rewrite every past trade's grade.

---

## 3f. Learn: the path, gates and library

The Learn module adds twenty-four ordered lessons across four blocks, with
lessons unlocked in sequence and an 80% quiz gate between blocks. Each gate
allows two attempts followed by a 30-minute cooldown, and missed questions
link back to the lesson that explains them. Progress, notes, quiz results and
the five-box review deck persist through `Store.learn`.

The page also provides market-filtered worked examples, apply links into the
product, generated Markdown/CSV resources, a searchable glossary, and deep
links for the path, library, glossary, lessons and quizzes. The shared shell
loads the curriculum before indexing search results so these entries are
available from every page.

## 3g. Added beyond the original plan: the charts page

The PDF asked for a chart with indicators, drawing tools and a watchlist. What
shipped is that, plus the four things below — each because the chart is where a
trade is decided, and a decision surface that cannot finish the decision is
decoration.

**The position tool.** Drag three levels on the chart — entry, stop, target —
and the Position tab answers with a size, in lots, from
`Instruments.positionSize` against the balance and risk rule in `Store.settings`.
Not a second sizing implementation: the same function the calculators call, so
the two screens cannot disagree. The readouts alongside it are the ones that
decide whether to take the trade at all — R multiple after costs, stop distance
in pips, spread and commission as a share of the risk, and the day's risk if
this one fills against the `maxDailyLossPct` cap.

**Save to journal.** The button the whole page exists for. It writes a draft
through `Store.draft.set` and hands off to the journal form, carrying the
symbol, side, all three prices, the size, the note typed under the chart, a
JPEG of the chart as drawn, and `chartState` — the symbol, interval, studies and
drawings as data, so the setup can be searched and reopened later rather than
only looked at. The journal form recognises `source: 'charts'` and says where the
entry came from.

**Bar replay.** Step forward one bar at a time over historical data to rehearse
a setup before risking anything on it.

**Workspaces and multi-chart layouts.** Up to four charts at once, and named
workspaces persisted in `Store.settings.chartsWorkspaces`, because comparing a
pair against the dollar index is a two-chart question.

### Honesty rules the page holds itself to

- **No invented statistics.** The win-rate-by-hour pane computes from
  `Store.trades`. Below five trades it says so and shows nothing, rather than
  drawing a shape out of noise. The coaching lines under the position readouts
  are derived from the numbers on screen and the user's own logged history — if
  there is no history for that symbol, the line says there is no history for
  that symbol.
- **Every price is badged.** `Feed.badge()` is in the toolbar, always.
- **An indicator pane that cannot be given 56px is not drawn**, and the legend
  says how many were dropped. A 12px RSI is not a reading.
- **Alerts persist** (`Store.settings.chartsAlerts`) and their hint says plainly
  that they only fire while the page is open.

### Sizes between phone and desktop

The page was checked at 375px and at 1440px and the sizes in between were
assumed to interpolate. They did not:

- **A short window squashed the price pane into a ribbon.** The pane budget had
  a 90px floor, so at 500px of viewport height the candles got about 100px while
  Volume and RSI kept their full 56px each. The floor is now 170px — in a short
  window the indicator panes give up their space first, which is the right
  order, since the price is the reason the page exists.
- **The Data Window covered the chart.** It hid below 460px of chart width, but
  it floats over the candles and needs far more room than that to be worth its
  space. The gate is now 760px.
- **The panel's sub-values pushed the layout sideways.** `.ro` rows now wrap.
- **Under 640px of height** the legend's study chips and the note bar's caption
  are hidden — both are redundant (the studies are named in the panel, the note
  box has its own placeholder) and the chart gets the pixels.

### Two contrast bugs this turned up

- `body[data-page="charts"] .btn` was unscoped, and `.btn` is the shell's global
  button class — so the charts page repainted the shared nav's buttons `--muted`.
  "Sign up" was brand-grey on brand-blue: **1.09:1**. The charts button rules are
  now scoped to the chart's own containers. This was a charts-page regression, not
  the shell-wide bug it was first reported as.
- With that fixed the button was white on brand, which is 3.77:1 in the dark
  theme — still under AA, because the dark theme lifts the brand to `#5b78ff`.
  Dark `--on-brand` is now `#0b1020` (5.03:1), and new `--on-up` / `--on-down`
  tokens do the same job for the direction buttons. Every filled control now
  measures at or above 4.5:1 in both themes.

### Screenshots and the storage quota

A chart screenshot is about 50KB of base64 and `localStorage` holds roughly 5MB,
so a heavy journal can fill it. The old `writeKey` caught the quota error, kept
the value in memory and returned — which meant the trade looked saved and was
gone on the next reload. Now a failed write retries once with the `shot` fields
stripped, so:

1. The trade, its levels, its size and its `chartState` always persist.
2. The pictures are what gets dropped, never the record.
3. `Store.imagesShed()` goes true and the journal says so in the save toast,
   pointing at CSV export and clearing old entries.

Verified by filling `localStorage` to its limit and saving a trade with a 60KB
screenshot: the entry persisted, the image did not, and nothing was lost
silently.

### Accessibility and small screens

- Every toolbar action has a text label. The icon-only glyph row from the
  prototype became a labelled **More** menu; the drawing rail keeps icons but
  every tool has a title and an accessible name.
- At 640px and below the toolbar wraps to two rows so the selected interval
  stays visible, the study chips hide (their values are printed on each pane's
  title line anyway), and the drawing rail moves to the bottom edge where a
  thumb can reach it. The panel becomes a bottom sheet.
- Axis numbers, pane bounds and indicator levels use `--muted`, not `--faint`:
  they are read, not glanced at, and `--faint` on the chart surface sat under
  the 4.5:1 the rest of the app holds itself to.

### East African pairs

`USDUGX`, `USDKES` and `USDZAR` were added to `Instruments` alongside `NAS100`
and `DXY`. A Ugandan trader opening a chart for the first time should find their
own currency in the symbol list.

## Terminal parity

The reference was TradingView's chart page, read from nine screenshots at the
1366×768 the user actually works at. What follows is what that comparison
turned up, and what was deliberately not copied.

### The drawing rail

Forty tools in eight groups — cursors, lines, Fibonacci, Gann, channels,
patterns, harmonics, shapes, annotations, measurement. Each group opens a flyout
rather than a flat scrolling column, because a rail of forty icons costs more to
read than it saves. Every one of them draws; none is a stub.

### Intervals

Twenty-nine intervals in five groups: seconds, minutes, hours, days, weeks,
months. Ticks were left out on purpose — there is no order flow behind this feed
to aggregate, and an interval that cannot mean what it says should not be on the
menu.

The chip row shows favourites only, and a custom interval can be typed (`7m`,
`8H`, `90m`, `2D`). The selected interval always shows even when it is not a
favourite, dashed to say so.

### Date ranges

Nine ranges along the bottom. A range changes the interval as well as the zoom
and says so in a toast, because 1Y of one-minute candles is 525,600 bars and
nobody wants that: each range targets roughly 160 candles and refuses a
combination that would show fewer than 24. YTD is real calendar time since
1 January, not 365 days divided by something.

### One clock

The bottom bar carries the chart's clock, and a toggle between UTC and local.
The axis labels, the data window and that clock all read the same source, so the
three cannot disagree. The choice persists through `Store.settings`.

### Bid, ask and spread

A legend row under the OHLC line: sell price, spread, buy price. The spread is
`S.spread` from the feed — the same number the position panel turns into
"spread and commission are 5.2% of the risk" — so the badge and that sentence
cannot drift. Half goes each side of the last close. The unit rides on the
number: pips on a pair, points on an index.

### The symbol card

Above the watchlist: the symbol, its market, a price large enough to read
across a room, the change, and a real day-range bar with a marker where the last
price falls between the session low and high. 2341.75 says nothing until you
know the day ran 2284.50 to 2342.23.

The watchlist below it is grouped by asset class in a fixed order. Headings
disappear when a sort is active, because FOREX above rows ordered by percentage
gain would misdescribe what governs the order.

### Full screen

Through the browser's own API, not a class that hides the page chrome — only the
real thing removes the operating system's furniture. The label is driven by
`fullscreenchange`, since Escape leaves full screen without ever reaching a
click handler.

### Two bugs the comparison uncovered

**Every dropdown on the chart toolbar was invisible.** `.ct-l` and `.ctoolbar`
both carry `overflow: hidden`, which they need or a long symbol name widens the
toolbar past the chart. A `.menu` positioned `absolute; top: 34px` below a 34px
toolbar falls entirely outside that box. The panels had layout and
`getComputedStyle` called them visible; they simply never painted. Bar replay,
saved workspaces, undo, redo, download a PNG, chart settings and the playbook
were unreachable by mouse. Fixed by making `.menu` `position: fixed` with a
`placeMenu()` that positions under the button, right-aligns where asked, clamps
to the viewport and shortens rather than flips a long menu.

**Every dialog on the page was invisible.** `shell.css` uses `.sheet` for the
mobile navigation drawer and parks it at `visibility: hidden` until a `.open`
class arrives. The charts page reuses that class name for its centred dialogs
and never adds `.open`. All ten — indicators and studies, chart settings,
keyboard shortcuts, saved workspaces, symbol search, alerts, Elliott waves, the
drawing editor, the command palette, ask-the-chart — opened to a blurred
backdrop and nothing else. Their markup was complete and `textContent` returned
the strings; only `innerText` came back empty. Two bugs were stacked here: the
menu that opened them never painted, and neither did they.

### Not copied

- **A news feed.** Every headline would have to be invented. The feed on this
  page is simulated and says so; fabricated news read as fact is a different
  and worse thing.
- **A community script marketplace.** There is no community and no script
  engine. An empty storefront is not a feature.
- **A stock screener.** Twenty-seven instruments do not need screening, and the
  page is for reading one chart well.
- **Tick intervals.** No order flow behind the feed.

### Panel, rail and export

**The Watch tab is the watchlist.** A symbol card, the watchlist and the compare
chips used to stack in one pane, which on a 768px screen left the list as the
smallest part of its own tab. Three views behind a sticky segmented switcher
now — Watchlist, Details, Compare — each with the whole pane, the choice
remembered in `chartsWatchView`. Each paints only while it is the one showing.

**Details carries the contract spec.** Contract size, tick size, tick value,
smallest size, digits, market, venue — read from the same instrument table the
position panel and the calculators size from, so the three cannot disagree. A
field the table has no value for is omitted rather than estimated.

**Favourite drawing tools.** A star on any flyout row promotes that tool to its
own button at the top of the rail. Persisted in `chartsFavTools` and filtered
through the rail on load, so a tool dropped between releases vanishes from the
favourites rather than becoming a dead button.

**Snapshots are stamped.** A chart PNG leaves this app and gets posted in a
group chat, so it carries the logo and the words "Simulated prices" alongside
the symbol, interval and a UTC timestamp. That second part is not decoration: a
candlestick chart with a broker-looking price scale is exactly what people
screenshot and pass off as a live account. Drawn on a copy, above the time axis,
never on the canvas the user is still trading from.

**Search found nothing, twice over.** The nav sat at the same z-index as the
charts toolbar and lost the tie, so its results panel and its Markets menu were
painted behind the toolbar. Separately, the market half of the search index was
a five-entry demo array: twenty-two of the twenty-seven instruments, including
every shilling pair, were unsearchable. It reads `Instruments.INSTRUMENTS` now,
with `base` and `quote` in the haystack so a currency code finds its pairs.

## 3h. The1% Academy: masterclasses in Learn

Learn now opens on **Masterclasses** (`pages/learn.html#masterclasses`). The
original 24-lesson path stays under the "Core path" tab, unchanged.

- **Catalog** (`assets/academy/catalog.js`): 65 masterclasses in 10 schools
  (Foundations, Price Action, Smart Money & Institutional, Trading Psychology,
  Risk & Money Management, Technical Indicators, Fundamentals & Macro,
  Trading Styles, Markets, Strategy & Professional). Every course has a
  syllabus, level and hours, even before its lessons are written.
- **Full courses** (`assets/academy/courses/*.js`): Candlesticks, Market
  Structure, Risk Management, Trading Psychology, Supply & Demand,
  Liquidity and Order Blocks (7 courses, 44 lessons). Each lesson has chart
  figures, key takeaways, common mistakes, a psychology check, a practice
  task and a link into a platform tool. Each course ends with a 10-question
  quiz (80% to pass) and a printable The1% certificate.
- **Enroll for the course**: every course page and card has the button.
  Lessons unlock once enrolled. Courses still in production can be enrolled
  in now, so users are notified when they go live.
- **Charts** (`assets/academy/figures.js`): a small SVG engine for candles,
  lines, bars and process diagrams. Colours come from CSS tokens, so charts
  follow dark and light themes.
- **Progress** is stored under `onepercent:academy` via `Store.academy`
  (enrolled, done, quiz, last).
- **Adding a course**: create `assets/academy/courses/<id>.js`, call
  `Academy.register("<id>", { outcomes, lessons, quiz })`, and add the
  script tag to `pages/learn.html`. The catalog marks it live automatically.

- **Course PDFs** (`assets/academy/pdf/`): a The1% Workbook for every full
  course plus The1% Risk Plan Worksheet. Enrolled users read them in the
  in-app reader (`#mc/<id>/read/<pdf>`, rendered with PDF.js, falling back
  to the browser viewer) or download them. The PDFs are generated from the
  course files, so they always match the lessons: start a local server at
  the repo root (`python3 -m http.server 8800`) and run
  `node tools/build-pdfs.mjs` (needs Playwright and `pypdf`). Page counts
  live in `Academy.PDFS` in `catalog.js`.
- **Further reading**: each course lists published books by title and
  author only. We do not host or rebrand third-party books or courses.

All course text is original and branded The1%. External learning sites were
used for topic coverage only; no third-party names or text are included.
