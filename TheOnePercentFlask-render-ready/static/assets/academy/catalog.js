/* ======================================================= academy/catalog.js
   The1% Academy — the masterclass catalog.

   Content only. Every course a trader needs, grouped into schools. A course
   listed here is enrollable from day one; its full lessons live in
   assets/academy/courses/<id>.js and register themselves with
   Academy.register(). A course with no registered lessons shows its
   syllabus and says honestly that lessons are in production — enrolling
   still works and keeps the learner's place for when they land.

   Module syntax (kept terse on purpose, so a non-programmer can edit it):
     "Module title: lesson one | lesson two | lesson three"
   ====================================================================== */

window.Academy = (() => {
  "use strict";

  const BRAND = "The1%";
  const PASS_MARK = 0.8;

  const schools = [
    { id: "foundations", title: "Foundations", img: "foundations", accent: "#5b78ff", blurb: "How markets, brokers and orders actually work, before a single setup." },
    { id: "price-action", title: "Price Action", img: "price-action", accent: "#2fbf71", blurb: "Read the chart itself: structure, levels, zones and candles in context." },
    { id: "smart-money", title: "Smart Money & Institutional", img: "smart-money", accent: "#8b6bff", blurb: "Liquidity, order blocks, imbalances and how large players move price." },
    { id: "psychology", title: "Trading Psychology", img: "psychology", accent: "#f0a43a", blurb: "The edge most traders never train: discipline, emotion and bias." },
    { id: "risk", title: "Risk & Money Management", img: "risk", accent: "#22b8a6", blurb: "Sizing, drawdown and survival maths. The school that keeps accounts alive." },
    { id: "indicators", title: "Technical Indicators", img: "indicators", accent: "#b07bff", blurb: "Moving averages to harmonics, used as evidence rather than as signals." },
    { id: "macro", title: "Fundamentals & Macro", img: "macro", accent: "#e0b54a", blurb: "Rates, inflation, central banks and the calendar that moves everything." },
    { id: "styles", title: "Trading Styles", img: "styles", accent: "#3fa7ff", blurb: "Scalping to position trading, and the session clock behind each." },
    { id: "markets", title: "Markets", img: "markets", accent: "#f2c14e", blurb: "Forex, gold, indices, crypto, stocks, options, futures and synthetics." },
    { id: "professional", title: "Strategy & Professional", img: "professional", accent: "#4cc38a", blurb: "Plans, backtests, journals, prop firms, automation and the business side." },
  ];

  const raw = [
    /* ---------------------------------------------------- Foundations */
    ["trading-foundations", "foundations", "Trading Foundations Masterclass", "Beginner", 5,
      "Markets, brokers, instruments, sessions, pips, lots, leverage and margin, from zero.",
      ["How trading works: what a trade is | who is on the other side | why most accounts lose",
       "Instruments: forex pairs | indices and stocks | crypto and commodities",
       "The units: pips, points and ticks | lots and contract size | pip value",
       "Leverage and margin: what leverage really does | margin calls and stop-outs | choosing a broker"]],
    ["candlesticks", "foundations", "Candlestick Masterclass", "Beginner", 4,
      "Candle anatomy, single and multi-candle patterns, and why context beats pattern names.",
      ["Anatomy: body, wick and range | what a candle says about the auction",
       "Single candles: pin bars and hammers | dojis | marubozu",
       "Multi-candle: engulfing | inside and outside bars | morning and evening star",
       "Context: patterns at levels | patterns against trend | building a candle checklist"]],
    ["chart-reading", "foundations", "Chart Reading & Timeframes Masterclass", "Beginner", 3,
      "Chart types, timeframe alignment and a clean top-down routine.",
      ["Chart types: line, bar and candle | Heikin Ashi and when not to use it",
       "Timeframes: what each timeframe is for | the 4-to-6 rule between frames",
       "Top-down analysis: monthly to entry | marking a chart in ten minutes"]],
    ["order-execution", "foundations", "Order Types & Execution Masterclass", "Beginner", 3,
      "Market, limit and stop orders, slippage, spreads and getting the price you planned.",
      ["Order types: market | limit | stop and stop-limit",
       "Costs: spread | commission and swap | slippage",
       "Execution quality: news fills | partial fills | reading your broker's statement"]],
    ["platforms", "foundations", "Trading Platforms Masterclass", "Beginner", 3,
      "MT4/MT5, TradingView and cTrader: setup, tools, templates and shortcuts.",
      ["MetaTrader: setup | order ticket | templates and profiles",
       "TradingView: layouts | drawing tools | alerts",
       "Workflow: watchlists | hotkeys | a clean workspace"]],

    /* --------------------------------------------------- Price action */
    ["market-structure", "price-action", "Market Structure Masterclass", "Beginner", 4,
      "Swing highs and lows, trends and ranges, BOS and CHoCH: the map every other course uses.", null],
    ["support-resistance", "price-action", "Support & Resistance Masterclass", "Beginner", 4,
      "Key levels, role reversal, zones versus lines, and round numbers.",
      ["Levels: what makes a level | zones, not lines | round numbers",
       "Role reversal: broken resistance as support | the retest",
       "Strength: touches, reactions and age | when levels fail",
       "Trading levels: bounce | break and retest | fakeouts"]],
    ["supply-demand", "price-action", "Supply & Demand Masterclass", "Intermediate", 5,
      "Build, grade and trade supply and demand zones with an entry, a stop and a target.", null],
    ["trendlines", "price-action", "Trendlines & Channels Masterclass", "Beginner", 3,
      "Drawing trendlines correctly, channel trading, breaks and retests.",
      ["Drawing: wicks or bodies | valid touches | adjusting lines",
       "Channels: parallel channels | trading the mid-line",
       "Breaks: trendline breaks | break and retest | false breaks"]],
    ["chart-patterns", "price-action", "Chart Patterns Masterclass", "Intermediate", 5,
      "Head and shoulders, double tops and bottoms, triangles, flags and wedges, with measured targets.",
      ["Reversal patterns: head and shoulders | double top and bottom | triple tops",
       "Continuation patterns: flags and pennants | triangles | rectangles",
       "Wedges: rising and falling | wedge breaks",
       "Execution: measured moves | pattern failure as a signal"]],
    ["pure-price-action", "price-action", "Pure Price Action Masterclass", "Intermediate", 5,
      "Trade with a naked chart: pin bars, engulfing bars, inside bars and confluence.",
      ["The naked chart: why remove indicators | the three questions",
       "Entry signals: pin bar | engulfing | inside bar breakout",
       "Confluence: level + structure + signal | scoring a setup",
       "Multi-timeframe price action: three-frame routine | common traps"]],

    /* ----------------------------------------------------- Smart money */
    ["liquidity", "smart-money", "Liquidity Masterclass", "Intermediate", 5,
      "Where stops rest, why price hunts them, and how to trade the sweep instead of being it.", null],
    ["order-blocks", "smart-money", "Order Blocks Masterclass", "Advanced", 4,
      "Valid versus invalid order blocks, mitigation, breakers and refinement.",
      ["Definition: what an order block is | the last opposite candle rule",
       "Validity: displacement | imbalance | break of structure",
       "Breakers and mitigation: breaker blocks | mitigation blocks",
       "Execution: refinement to lower timeframes | stop placement"]],
    ["fvg", "smart-money", "Fair Value Gap & Imbalance Masterclass", "Advanced", 3,
      "Three-candle inefficiencies, inversion gaps, and entries from imbalance.",
      ["Imbalance: the three-candle gap | why gaps get filled",
       "Types: bullish and bearish FVG | inversion FVG | balanced price range",
       "Execution: consequent encroachment | FVG with order blocks"]],
    ["smc-complete", "smart-money", "Smart Money Concepts (SMC) Complete Masterclass", "Advanced", 8,
      "The full SMC framework end to end: structure, liquidity, POIs and entries.",
      ["Structure: internal and external | BOS and CHoCH",
       "Liquidity: inducement | sweeps",
       "Points of interest: order blocks | FVGs | premium and discount",
       "Entries: confirmation models | lower-timeframe entries",
       "The SMC trading plan: checklist | case studies"]],
    ["ict-concepts", "smart-money", "ICT-Style Concepts Masterclass", "Advanced", 6,
      "Kill zones, optimal trade entry, Power of 3 and time-based models, explained plainly.",
      ["Time: kill zones in East Africa Time | the daily range",
       "Power of 3: accumulation | manipulation | distribution",
       "Entries: optimal trade entry | silver bullet window | judas swing",
       "Framework: daily bias | combining with liquidity"]],
    ["wyckoff", "smart-money", "Wyckoff Method Masterclass", "Advanced", 6,
      "Accumulation, distribution, springs and upthrusts: the original smart-money map.",
      ["Principles: the three laws | the composite operator",
       "Accumulation: phases A to E | the spring",
       "Distribution: phases | the upthrust after distribution",
       "Trading Wyckoff: entries | volume confirmation"]],
    ["volume-orderflow", "smart-money", "Volume & Order Flow Masterclass", "Advanced", 5,
      "Volume profile, VWAP, footprint charts, delta and market depth.",
      ["Volume basics: effort versus result | volume spikes",
       "Volume profile: POC | value area | low-volume nodes",
       "VWAP: anchored VWAP | VWAP bands",
       "Order flow: footprint | delta | absorption"]],
    ["market-maker-models", "smart-money", "Market Maker Models Masterclass", "Advanced", 4,
      "Buy and sell models: how a move is engineered from range to expansion.",
      ["The model: original consolidation | engineered liquidity",
       "Buy model | sell model",
       "Trading the model: the smart money reversal | targets"]],

    /* ------------------------------------------------------ Psychology */
    ["psychology", "psychology", "Trading Psychology Masterclass", "Beginner", 5,
      "Fear, greed, FOMO, revenge and the habits that let a good plan survive a bad day.", null],
    ["discipline", "psychology", "Discipline & Consistency Masterclass", "Intermediate", 4,
      "Routines, rules and habit design that make the right action the easy one.",
      ["Why discipline fails: willpower is a budget | rules versus goals",
       "Routines: pre-market | in-session | post-session",
       "Habit design: triggers | friction | streaks",
       "Consistency: process scorecards | the 100-trade commitment"]],
    ["emotional-control", "psychology", "Emotional Control Masterclass", "Intermediate", 4,
      "Revenge trading, tilt, stress and the circuit breakers that stop them.",
      ["The body first: stress response | recognising tilt early",
       "Circuit breakers: daily loss rails | the walk-away rule",
       "Techniques: box breathing | if-then plans | cooling-off",
       "Recovery: after a big loss | returning after a break"]],
    ["cognitive-biases", "psychology", "Cognitive Biases Masterclass", "Intermediate", 3,
      "Confirmation, recency, anchoring and loss aversion, and how each costs you money.",
      ["The biases: confirmation | recency | anchoring | loss aversion",
       "More biases: overconfidence | sunk cost | gambler's fallacy",
       "Debiasing: checklists | pre-mortems | the devil's advocate note"]],
    ["trader-mindset", "psychology", "Trader Mindset & Identity Masterclass", "Beginner", 3,
      "Money beliefs, probabilistic thinking and a long-term identity as a trader.",
      ["Identity: from gambler to operator | beliefs about money",
       "Probabilistic thinking: each trade is one of many | outcome versus decision",
       "Long-term thinking: career timelines | patience as a skill"]],
    ["handling-losses", "psychology", "Handling Losses & Drawdowns Masterclass", "Intermediate", 3,
      "Accepting losses, surviving drawdowns and rebuilding confidence with data.",
      ["Losses are costs: reframing | the loss budget",
       "Drawdowns: expected drawdown | when to cut size",
       "Rebuilding: the confidence ladder | returning to full size"]],
    ["peak-performance", "psychology", "Peak Performance Masterclass", "Advanced", 3,
      "Focus, sleep, health and burnout prevention for traders who want a career.",
      ["Focus: deep work sessions | screen fatigue",
       "Health: sleep | exercise | nutrition and caffeine",
       "Sustainability: burnout signs | balance and time off"]],

    /* ------------------------------------------------------------ Risk */
    ["risk-management", "risk", "Risk Management Masterclass", "Beginner", 5,
      "The 1% rule, stop placement, daily rails and drawdown control.",
      ["The rule: why 1% | risk of ruin",
       "Stops: structure stops | volatility stops | never moving a stop wider",
       "Rails: daily loss limit | trade cap | cool-off",
       "Drawdown control: step-down sizing | recovery maths"]],
    ["position-sizing", "risk", "Position Sizing Masterclass", "Beginner", 3,
      "Lot size calculations for any account, instrument and stop distance.",
      ["The formula: risk ÷ (stop × value per unit)",
       "By market: forex lots | index points | crypto units | futures contracts",
       "Edge cases: small accounts | JPY pairs and gold | rounding down"]],
    ["risk-reward", "risk", "Risk-to-Reward & Expectancy Masterclass", "Intermediate", 3,
      "R multiples, expectancy, win rate and why a 40% strategy can pay well.",
      ["R multiples: measuring in R | net of costs",
       "Expectancy: the formula | sample size",
       "Win rate versus payoff: break-even win rates | the high win rate trap"]],
    ["portfolio-risk", "risk", "Portfolio & Correlation Risk Masterclass", "Advanced", 3,
      "Hidden concentration, correlated positions and total open risk.",
      ["Correlation: currency correlation | index and crypto beta",
       "Open risk: total heat | capping correlated exposure",
       "Portfolio: diversification that actually diversifies"]],
    ["compounding", "risk", "Compounding & Account Growth Masterclass", "Intermediate", 3,
      "Realistic growth, withdrawals, scaling size and the maths of compounding.",
      ["The maths: compounding at 1% risk | realistic monthly returns",
       "Scaling: when to raise risk | fixed fractional sizing",
       "Withdrawals: paying yourself | growth versus income"]],

    /* ------------------------------------------------------ Indicators */
    ["moving-averages", "indicators", "Moving Averages Masterclass", "Beginner", 3,
      "SMA versus EMA, crossovers, dynamic support and trend filters.",
      ["Basics: SMA | EMA | which periods and why",
       "Uses: trend filter | dynamic support | crossovers",
       "Limits: lag | ranging markets"]],
    ["rsi-divergence", "indicators", "RSI & Divergence Masterclass", "Intermediate", 3,
      "Regular and hidden divergence, and the overbought/oversold myth.",
      ["RSI basics: calculation | ranges in trends",
       "Divergence: regular | hidden | failure swings",
       "Execution: divergence at levels | confirmation"]],
    ["macd-momentum", "indicators", "MACD & Momentum Masterclass", "Intermediate", 3,
      "MACD, histogram, stochastic and momentum as evidence of pressure.",
      ["MACD: lines | histogram | zero line",
       "Stochastic: settings | signals",
       "Momentum: momentum shifts | combining with structure"]],
    ["fibonacci", "indicators", "Fibonacci Masterclass", "Intermediate", 3,
      "Retracements, extensions, clusters and confluence.",
      ["Retracements: drawing correctly | the golden zone",
       "Extensions: targets | 1.272 and 1.618",
       "Confluence: fib clusters | fib with zones"]],
    ["volatility", "indicators", "Bollinger Bands & Volatility Masterclass", "Intermediate", 3,
      "Squeezes, ATR, and volatility-based stops and targets.",
      ["Bollinger Bands: bands | squeeze | walking the band",
       "ATR: reading ATR | ATR stops | ATR position sizing",
       "Regimes: expansion and contraction"]],
    ["elliott-wave", "indicators", "Elliott Wave Masterclass", "Advanced", 5,
      "Impulse and corrective waves, the rules, and practical wave counting.",
      ["Rules: impulse | the three rules | guidelines",
       "Corrections: zigzag | flat | triangle",
       "Practice: counting | alternates | invalidation"]],
    ["harmonics", "indicators", "Harmonic Patterns Masterclass", "Advanced", 4,
      "Gartley, Bat, Butterfly, Crab and Cypher with ratio rules.",
      ["Foundations: XABCD | ratio tolerance",
       "Patterns: Gartley | Bat | Butterfly | Crab | Cypher",
       "Execution: PRZ | stops and targets"]],

    /* ----------------------------------------------------------- Macro */
    ["fundamental-analysis", "macro", "Fundamental Analysis Masterclass", "Intermediate", 5,
      "Interest rates, inflation, GDP and employment, and how each moves price.",
      ["Drivers: interest rates | inflation | growth | employment",
       "Currencies: rate differentials | risk-on and risk-off",
       "Building a bias: the macro scorecard | weekly outlook"]],
    ["news-trading", "macro", "Economic Calendar & News Trading Masterclass", "Intermediate", 3,
      "NFP, CPI, FOMC: trading around high-impact news safely.",
      ["The calendar: impact levels | consensus and surprise",
       "The big releases: NFP | CPI | rate decisions",
       "Strategies: stand aside | fade the spike | post-news continuation"]],
    ["central-banks", "macro", "Central Banks Masterclass", "Advanced", 4,
      "Fed, ECB, BoE and BoJ policy, rate expectations and forward guidance.",
      ["Mandates: the Fed | ECB | BoE | BoJ",
       "Tools: rates | QE and QT | forward guidance",
       "Trading: rate expectations | statements and press conferences"]],
    ["intermarket", "macro", "Intermarket Analysis Masterclass", "Advanced", 3,
      "Bonds, the dollar, gold, oil and equities, and how they lead each other.",
      ["Relationships: bonds and currencies | dollar and gold | oil and CAD",
       "Equities and risk: indices and yen | crypto and risk",
       "Using it: confirmation | divergence as warning"]],
    ["sentiment", "macro", "Sentiment Analysis Masterclass", "Intermediate", 3,
      "COT reports, retail positioning and fear-and-greed measures.",
      ["COT: reading the report | extremes",
       "Retail positioning: contrarian signals",
       "Risk sentiment: VIX | fear and greed"]],

    /* ---------------------------------------------------------- Styles */
    ["scalping", "styles", "Scalping Masterclass", "Advanced", 4,
      "One-to-fifteen-minute trading: costs, execution and when scalping works.",
      ["The reality: costs versus edge | best sessions",
       "Setups: momentum | range fades | opening range",
       "Execution: hotkeys | stops | daily limits"]],
    ["day-trading", "styles", "Day Trading Masterclass", "Intermediate", 5,
      "Intraday structure, session opens, daily bias and flat-by-close discipline.",
      ["Preparation: daily bias | key levels | calendar",
       "Setups: open drive | pullback | reversal at extremes",
       "Management: partials | trailing | end of day"]],
    ["swing-trading", "styles", "Swing Trading Masterclass", "Intermediate", 5,
      "Multi-day trades on the 4H and daily: fewer trades, more patience.",
      ["Framework: daily structure | 4H entries",
       "Setups: pullbacks | breakouts | reversals",
       "Holding: overnight risk | swaps | weekend gaps"]],
    ["position-trading", "styles", "Position Trading Masterclass", "Advanced", 3,
      "Weeks-to-months trades built on macro themes and weekly structure.",
      ["Themes: macro drivers | weekly structure",
       "Management: wide stops | small size | adding",
       "Patience: holding through noise"]],
    ["session-trading", "styles", "Session Trading Masterclass", "Intermediate", 3,
      "Asian, London and New York behaviour in East Africa Time.",
      ["The sessions: Asia | London | New York | overlaps",
       "Patterns: Asian range | London breakout | New York reversal",
       "Your clock: sessions in EAT | choosing your hours"]],

    /* --------------------------------------------------------- Markets */
    ["forex", "markets", "Forex Masterclass", "Beginner", 5,
      "Majors, crosses, correlations, carry and what drives each currency.",
      ["The pairs: majors | crosses | exotics",
       "Drivers: each major currency's profile",
       "Techniques: correlations | carry | session behaviour"]],
    ["gold", "markets", "Gold (XAUUSD) Masterclass", "Intermediate", 4,
      "Gold's drivers, volatility, sizing and session behaviour.",
      ["Drivers: real yields | dollar | safe-haven flows",
       "Behaviour: volatility | sessions | news",
       "Execution: sizing gold correctly | stops"]],
    ["indices", "markets", "Indices Masterclass", "Intermediate", 4,
      "US30, NAS100 and SPX500: opens, earnings season and gaps.",
      ["The indices: composition | drivers",
       "Behaviour: the cash open | gaps | earnings season",
       "Execution: point value | sizing"]],
    ["crypto", "markets", "Crypto Trading Masterclass", "Intermediate", 5,
      "Spot and perpetual futures, funding, liquidations and on-chain basics.",
      ["Markets: spot | perpetuals | funding rates",
       "Risk: leverage and liquidation | exchange risk",
       "Analysis: on-chain basics | BTC dominance | weekends"]],
    ["stocks", "markets", "Stock Trading Masterclass", "Intermediate", 5,
      "Earnings, fundamentals, sector rotation and momentum stocks.",
      ["Fundamentals: earnings | valuation basics",
       "Technicals: base breakouts | relative strength",
       "Context: sectors | market regime"]],
    ["options", "markets", "Options Masterclass", "Advanced", 6,
      "Calls, puts, the Greeks and defined-risk strategies.",
      ["Basics: calls | puts | intrinsic and time value",
       "The Greeks: delta | theta | vega | gamma",
       "Strategies: covered calls | spreads | straddles"]],
    ["futures", "markets", "Futures & Commodities Masterclass", "Advanced", 4,
      "Contract specs, margin, rollover, and oil and agricultural markets.",
      ["Contracts: specs | micros | margin",
       "Rollover: expiry | contango and backwardation",
       "Commodities: oil | metals | agriculture"]],
    ["synthetics", "markets", "Synthetic Indices Masterclass", "Intermediate", 4,
      "Volatility, Boom/Crash and Step indices: how they are generated and how to size them.",
      ["What they are: random number generation | 24/7 markets",
       "The indices: Volatility | Boom and Crash | Step and Jump",
       "Risk: why sizing matters more here | realistic expectations"]],

    /* ---------------------------------------------------- Professional */
    ["trading-plan", "professional", "Trading Plan Masterclass", "Intermediate", 3,
      "Write a complete personal trading plan you will actually follow.",
      ["The plan: markets and hours | setups | risk rules",
       "Execution rules: entries | management | exits",
       "Review: weekly and monthly review loops"]],
    ["backtesting", "professional", "Backtesting Masterclass", "Intermediate", 4,
      "Manual and software backtesting, data collection and honest statistics.",
      ["Method: defining rules | sample size",
       "Manual backtesting: bar replay | recording",
       "Analysis: expectancy | drawdown | forward testing"]],
    ["journal", "professional", "Trading Journal Masterclass", "Beginner", 2,
      "Log, review and improve: the journal as a feedback machine.",
      ["What to log: numbers | screenshots | emotions",
       "Reviewing: tags | finding the leak",
       "Getting the most from your The1% journal"]],
    ["strategy-development", "professional", "Strategy Development Masterclass", "Advanced", 5,
      "Build, test and refine your own edge from idea to live trading.",
      ["Ideas: observation to hypothesis",
       "Testing: rules | backtest | forward test",
       "Refinement: one change at a time | avoiding curve fitting"]],
    ["performance-analytics", "professional", "Performance Analytics Masterclass", "Advanced", 3,
      "Win rate, profit factor, Sharpe ratio and reading your equity curve.",
      ["Metrics: win rate | profit factor | expectancy",
       "Risk-adjusted: Sharpe | max drawdown | recovery factor",
       "Diagnosis: by setup | by session | by emotion"]],
    ["prop-firm", "professional", "Prop Firm Masterclass", "Intermediate", 4,
      "Passing challenges, respecting the rules and scaling funded accounts.",
      ["The model: how prop firms make money | choosing a firm",
       "Rules: daily loss | max drawdown | consistency rules",
       "Passing: risk plan for a challenge | scaling"]],
    ["algo-trading", "professional", "Algorithmic Trading Masterclass", "Advanced", 6,
      "Expert Advisors, Pine Script and Python bots, from idea to deployment.",
      ["Foundations: turning rules into code",
       "Tools: Pine Script | MQL5 | Python",
       "Deployment: backtest | VPS | monitoring and risk"]],
    ["copy-trading", "professional", "Copy Trading & Signals Masterclass", "Intermediate", 2,
      "Evaluating signal providers, and becoming one responsibly.",
      ["Evaluating providers: verified track records | red flags",
       "Copy mechanics: sizing | slippage",
       "Becoming a provider: transparency | responsibility"]],
    ["trading-business", "professional", "Trading as a Business Masterclass", "Advanced", 3,
      "Record keeping, taxes, capital planning and going full-time.",
      ["The business: capital | runway | records",
       "Going full-time: readiness checklist",
       "Longevity: diversifying income | avoiding burnout"]],
  ];

  /* flagship courses carry their own cover art; the rest get a generated
     chart cover in their school's accent, so no two cards look the same */
  const COURSE_IMG = {
    "market-structure": "market-structure",
    "supply-demand": "supply-demand",
    liquidity: "smart-money",
    psychology: "psychology",
    candlesticks: "candlesticks",
    "order-blocks": "order-blocks",
    "risk-management": "risk-management",
  };

  /* Course PDFs. Every file here is an original The1% document, generated
     from the course itself by tools/workbook.html (see docs/PHASE-1.md 3h).
     They open in the in-app reader at #mc/<course>/read/<pdf id>. */
  const PDF_DIR = "../assets/academy/pdf/";
  const workbook = (id, title, pages, desc) => ({ id: "workbook", title, desc, pages, file: PDF_DIR + id + "-workbook.pdf", kind: "Workbook" });
  const PDFS = {
    "market-structure": [workbook("market-structure", "The1% Market Structure Workbook", 18, "Every lesson on one page: swing points, trends, BOS and CHoCH, internal and external structure, with the charts, takeaways and practice tasks.")],
    "supply-demand": [workbook("supply-demand", "The1% Supply & Demand Workbook", 19, "How zones form, the four formations, drawing proximal and distal lines, The1% zone scorecard and the full zone routine.")],
    liquidity: [workbook("liquidity", "The1% Liquidity Workbook", 18, "Buy-side and sell-side liquidity, equal highs and lows, the sweep versus the breakout, and the sweep-and-shift entry model.")],
    psychology: [workbook("psychology", "The1% Trading Psychology Workbook", 19, "Probability thinking, fear, greed and FOMO, revenge trading, the circuit breaker and a daily routine you can keep.")],
    candlesticks: [workbook("candlesticks", "The1% Candlestick Workbook", 18, "Candle anatomy, pin bars, dojis, marubozu, engulfing, inside bars and stars, plus The1% candle checklist.")],
    "order-blocks": [workbook("order-blocks", "The1% Order Blocks Workbook", 17, "Defining and validating order blocks, refinement and stops, breakers and mitigation blocks, and The1% entry model.")],
    "risk-management": [
      workbook("risk-management", "The1% Risk Management Workbook", 13, "Why 1%, position sizing, structure stops, R and expectancy, daily rails and step-down sizing, with worked examples."),
      { id: "risk-plan", title: "The1% Risk Plan Worksheet", desc: "A fill-in worksheet for your own rules: risk per trade, stops, news, rails, drawdown steps and a 10-trade commitment tracker.", pages: 3, file: PDF_DIR + "risk-plan-worksheet.pdf", kind: "Worksheet" },
    ],
  };
  const pdfs = (id) => PDFS[id] || [];

  /* Further reading: published books, listed by title and author only.
     They are recommendations to buy or borrow, not files we host. */
  const READING = {
    psychology: [
      ["Trading in the Zone", "Mark Douglas", "The classic on probabilistic thinking and accepting risk."],
      ["The Disciplined Trader", "Mark Douglas", "How beliefs and fear shape what you see on the chart."],
      ["Best Loser Wins", "Tom Hougaard", "A professional's view on losing well and scaling winners."],
      ["The Psychology of Money", "Morgan Housel", "Short essays on behaviour, greed and long-term thinking."],
      ["Atomic Habits", "James Clear", "Building the small daily routines this course asks for."],
    ],
    "market-structure": [
      ["Technical Analysis of the Financial Markets", "John J. Murphy", "The standard reference on trends, support and resistance."],
      ["Price Action Trading", "Bill Eykyn", "Reading bars and structure without indicators."],
    ],
    "supply-demand": [
      ["Markets in Profile", "James F. Dalton, Robert B. Dalton and Eric T. Jones", "Auction theory behind why zones and balance areas form."],
    ],
    candlesticks: [
      ["21 Candlesticks Every Trader Should Know", "Melvin Pasternak", "A compact guide to the core patterns."],
      ["Profitable Candlestick Trading", "Stephen W. Bigalow", "Pattern reliability and how to confirm signals."],
    ],
    "risk-management": [
      ["The Essentials of Trading", "John Forman", "Risk, money management and building a trading plan."],
      ["The New Market Wizards", "Jack D. Schwager", "Interviews with top traders; risk control comes up in almost every one."],
    ],
  };
  const reading = (id) => (READING[id] || []).map(([title, author, why]) => ({ title, author, why }));

  const courses = raw.map(([id, school, title, level, hours, tagline, modules]) => ({
    id,
    img: COURSE_IMG[id] || "",
    school,
    title,
    level,
    hours,
    tagline,
    syllabus: (modules || []).map((m) => {
      const i = m.indexOf(":");
      const t = i > 0 ? m.slice(0, i).trim() : m.trim();
      const ls = (i > 0 ? m.slice(i + 1) : "").split("|").map((s) => s.trim()).filter(Boolean);
      return { title: t, lessons: ls.length ? ls : [t] };
    }),
    content: null,
  }));

  const byId = {};
  courses.forEach((c) => (byId[c.id] = c));

  /* A full course registers itself: lessons, quiz, outcomes. The syllabus
     is then derived from the real lessons so the two can never disagree. */
  function register(id, content) {
    const c = byId[id];
    if (!c) return;
    c.content = content;
    const mods = [];
    content.lessons.forEach((l) => {
      let m = mods.find((x) => x.title === l.module);
      if (!m) mods.push((m = { title: l.module, lessons: [] }));
      m.lessons.push(l.title);
    });
    c.syllabus = mods;
    if (content.hours) c.hours = content.hours;
  }

  const course = (id) => byId[id] || null;
  const school = (id) => schools.find((s) => s.id === id) || null;
  const isLive = (c) => !!(c && c.content);
  const lessonCount = (c) => (c.content ? c.content.lessons.length : c.syllabus.reduce((a, m) => a + m.lessons.length, 0));

  /* flagship order for the "Start here" row */
  const featured = ["candlesticks", "market-structure", "risk-management", "psychology"];
  const deeper = ["supply-demand", "liquidity", "order-blocks"];

  return { BRAND, PASS_MARK, schools, courses, course, school, register, isLive, lessonCount, featured, deeper, pdfs, PDFS, reading };
})();
