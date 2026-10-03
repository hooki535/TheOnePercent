/* TheOnePercent — curriculum
   -------------------------------------------------------------------
   Content only. No DOM, no storage, no gating logic — learn.js owns all
   three. Keeping the syllabus in one flat data file is what makes it
   editable by someone who is not a programmer, and what lets the shell
   search index every lesson without importing the Learn screen.

   Shape
     Curriculum.blocks    ordered path blocks, each one ending in a quiz gate
     Curriculum.lessons   ordered lessons, each tagged with its block
     Curriculum.quizzes   blockId -> 10 questions, each naming its lesson
     Curriculum.resources the library: templates and checklists, generated
                          client-side as real files (never a fake PDF link)
     Curriculum.glossary  term -> plain-English definition, used for the
                          dotted-underline tooltips inside lesson bodies

   Lesson fields
     id, block, title, minutes, summary
     sections  [{ h, p:[...], ul:[...], note }]
     examples  { Forex|Crypto|Futures|Indices: { title, steps:[...] } }
       Only the markets a user picked during onboarding are shown, which
       is the roadmap's "one worked example per market the user selected".
     terms     glossary keys to link inside this lesson
     apply     { label, href, why } — the lesson ends in a tool, not a quiz.
       This is the closing of the loop: read it, then go do it.
   ------------------------------------------------------------------- */

window.Curriculum = (() => {
  "use strict";

  const blocks = [
    {
      id: "foundations",
      level: "Beginner",
      title: "Foundations",
      blurb:
        "What you are actually doing when you place a trade, who is on the other side, and the vocabulary the rest of the path assumes.",
      outcome: "You can read a quote, price a one-lot move, and say what leverage does to your account.",
    },
    {
      id: "risk",
      level: "Beginner",
      title: "Risk first",
      blurb:
        "The block that saves accounts. Sizing from the stop, R multiples, expectancy, drawdown maths, and the daily rails that stop a bad day becoming a bad month.",
      outcome: "You can size any trade in under thirty seconds and explain why the size is that number.",
    },
    {
      id: "market",
      level: "Intermediate",
      title: "Reading the market",
      blurb:
        "Structure, levels, sessions, momentum and scheduled events — the context that turns a setup into a decision with a reason behind it.",
      outcome: "You can mark a chart's structure, name the session you trade, and plan around the calendar instead of into it.",
    },
    {
      id: "system",
      level: "Advanced",
      title: "Build a system",
      blurb:
        "A setup defined tightly enough to test, a written plan, a journal that changes behaviour, and the statistics that find your leak.",
      outcome: "You have a written plan, a defined edge, and a monthly review that produces one change, not ten.",
    },
  ];

  /* ------------------------------------------------------------ lessons */

  const lessons = [
    /* ---------------------------------------------- 1 · Foundations */
    {
      id: "f1",
      block: "foundations",
      title: "What you are actually doing",
      minutes: 7,
      summary:
        "A trade is a transfer, not a creation. Knowing who is on the other side changes how you size and how long you expect to wait.",
      sections: [
        {
          h: "The mechanics, plainly",
          p: [
            "You are agreeing a price now for something whose price will change. Nothing is produced. Your profit is someone else's loss, minus the costs both of you paid to participate. That single sentence explains why most retail accounts lose: the costs are certain and the edge is not.",
          ],
        },
        {
          h: "Who is on the other side",
          ul: [
            "Market makers, who profit from the spread and want volume, not direction.",
            "Institutions hedging real exposure — an importer buying dollars does not care about your chart.",
            "Algorithms reacting in microseconds to data you read in minutes.",
            "Other retail traders, which is the only group you can realistically out-prepare.",
          ],
          note:
            "You are not going to be faster or better informed. The only durable retail edges are selectivity, sizing and consistency — which is exactly what this path teaches and what the journal measures.",
        },
        {
          h: "Costs are the first thing to beat",
          p: [
            "Spread, commission, swap or funding, and slippage. A strategy that is right 55% of the time can still lose money if the average win does not clear those four. Before any setup is judged, its costs have to be written into the expectancy.",
          ],
        },
      ],
      examples: {
        Forex: {
          title: "EURUSD, one standard lot",
          steps: [
            "Spread 0.8 pips. One pip on 1.00 lot is about $10, so entry costs about $8 before price moves.",
            "Hold overnight and swap is charged or paid depending on the rate differential.",
            "You need roughly 1 pip in your favour just to break even.",
          ],
        },
        Crypto: {
          title: "BTCUSD perpetual",
          steps: [
            "Taker fee 0.05% each way — $50 round trip on a $50,000 position.",
            "Funding is paid every eight hours; a crowded long side pays shorts.",
            "Your break-even move is the fees plus funding, not zero.",
          ],
        },
        Futures: {
          title: "One MES contract",
          steps: [
            "Commission about $1.20 round trip, plus exchange fees.",
            "One tick on MES is $1.25, so costs are about one tick.",
            "No swap, but rollover every quarter matters for anything held.",
          ],
        },
        Indices: {
          title: "US500 cash CFD",
          steps: [
            "Spread widens outside cash hours — the same setup costs more at 3am Kampala time.",
            "Overnight financing is charged on the full notional, not your margin.",
            "Dividend adjustments hit index shorts on ex-dates.",
          ],
        },
      },
      terms: ["spread", "slippage", "swap", "notional"],
      apply: {
        label: "Price your costs in the P&L simulator",
        href: "/calculators#sim",
        why: "Put your real spread and commission in once and see what a typical win has to clear.",
      },
    },
    {
      id: "f2",
      block: "foundations",
      title: "The four markets, and how they differ",
      minutes: 8,
      summary:
        "Forex, crypto, futures and indices behave differently in hours, volatility and cost. Most beginners lose by applying forex habits to crypto size.",
      sections: [
        {
          h: "What actually changes between them",
          ul: [
            "Hours: forex runs 24/5 in sessions, crypto 24/7 with no close, futures and indices have defined pit and cash hours.",
            "Volatility: a 1% day is big in EURUSD and ordinary in BTCUSD. Volatility, not preference, sets your stop distance.",
            "Contract units: lots, coins, contracts and index points are not interchangeable. Size is always computed, never reused.",
            "Cost structure: spread and swap in forex, fees and funding in crypto, commission and ticks in futures.",
          ],
        },
        {
          h: "Choose few, and choose on purpose",
          p: [
            "Two or three instruments you watch daily beats twenty you sample. Familiarity with how one thing moves — its usual range, its session, its reaction to news — is itself an edge, and it is the only one available early.",
          ],
        },
        {
          h: "The trap",
          p: [
            "Traders copy stop distances across markets. A 20-pip stop is reasonable on EURUSD intraday and meaningless on BTCUSD, where 20 dollars is noise. Stops belong to the instrument's volatility, and position size adapts to keep risk constant.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Typical daily range", steps: ["EURUSD moves roughly 60–90 pips a day.", "A sensible intraday stop is often 15–30 pips.", "Sizing changes, risk stays 1%."] },
        Crypto: { title: "Typical daily range", steps: ["BTCUSD commonly moves 2–4% a day.", "An intraday stop is often 0.8–1.5%.", "Same 1% risk, far smaller position in notional terms than a beginner expects."] },
        Futures: { title: "Contract granularity", steps: ["ES is five times MES — the same idea, five times the risk.", "If one MES is too much risk, the trade is too big, not the contract wrong.", "Micros exist precisely so sizing can stay honest on a small account."] },
        Indices: { title: "Gaps", steps: ["Cash indices gap over weekends and after earnings-heavy sessions.", "A stop does not protect you through a gap.", "Hold over a gap only if the gapped loss is still acceptable."] },
      },
      terms: ["pip", "lot", "tick", "volatility"],
      apply: {
        label: "Check a lot against units",
        href: "/calculators#conv",
        why: "Convert lots to units for each instrument you trade so the numbers stop being abstract.",
      },
    },
    {
      id: "f3",
      block: "foundations",
      title: "Quotes, spread, lots and contracts",
      minutes: 7,
      summary:
        "Bid, ask, pip, point, lot, contract size. Get these six right and every calculator on this site becomes obvious.",
      sections: [
        {
          h: "The quote",
          p: [
            "Two prices: the bid, where you can sell, and the ask, where you can buy. The gap is the spread and it is a cost you pay at entry. Buys open at the ask and close at the bid, which is why a position shows a small loss the instant it opens.",
          ],
        },
        {
          h: "Pips, points and ticks",
          ul: [
            "A pip is the fourth decimal in most pairs, the second in JPY pairs.",
            "A point is one tenth of a pip — brokers quote five decimals to charge fractional spreads.",
            "A tick is the smallest price step of a futures contract, and its money value is fixed by the exchange.",
          ],
        },
        {
          h: "Size units",
          p: [
            "A standard forex lot is 100,000 units of the base currency; mini is 10,000; micro is 1,000. Value per pip scales with that. In futures, size is contracts and the contract specifies the multiplier. In crypto, size is simply coins, and notional is coins times price.",
          ],
          note: "Every sizing error traces back to confusing one of these units with another. When in doubt, compute the money value of one full point of movement.",
        },
      ],
      examples: {
        Forex: { title: "Pip value", steps: ["1.00 lot EURUSD: 1 pip = $10.", "0.10 lot: 1 pip = $1.", "0.01 lot: 1 pip = $0.10 — so a 30-pip stop risks $3."] },
        Crypto: { title: "Notional", steps: ["0.05 BTC at 64,000 is 3,200 notional.", "A 1% adverse move is $32.", "Position size is derived from that, not chosen first."] },
        Futures: { title: "Tick money", steps: ["MES: 1 point = $5, 1 tick (0.25) = $1.25.", "A 10-point stop on one MES risks $50.", "On ES the same stop risks $500."] },
        Indices: { title: "Per-point value", steps: ["US500 CFD often prices $1 per point per unit.", "A 15-point stop on 2 units risks $30.", "Confirm the multiplier with your broker — they differ."] },
      },
      terms: ["bid", "ask", "spread", "pip", "point", "tick", "lot"],
      apply: {
        label: "Open the pip value calculator",
        href: "/calculators#pv",
        why: "Compute pip value for your instruments in your account currency once, and write the numbers down.",
      },
    },
    {
      id: "f4",
      block: "foundations",
      title: "Orders, fills and slippage",
      minutes: 6,
      summary:
        "Market, limit, stop and stop-limit. Which one you choose decides whether you get the price you planned or the price that is available.",
      sections: [
        {
          h: "The four you need",
          ul: [
            "Market — fills now at whatever is available. Certainty of fill, no certainty of price.",
            "Limit — fills at your price or better, or not at all. Certainty of price, no certainty of fill.",
            "Stop — becomes a market order when touched. Used to exit, and to enter breakouts.",
            "Stop-limit — becomes a limit order when touched, so it will not fill through a gap. Protects price, risks no exit.",
          ],
        },
        {
          h: "Slippage is not a bug",
          p: [
            "When the book is thin — news releases, the Sunday open, the last minute of a session — the next available price can be far from the last printed one. A stop-loss is a request, not a guarantee. This is why the position size, not the stop, is your real risk control.",
          ],
        },
        {
          h: "Bracket everything",
          p: [
            "Enter with the stop and target attached in the same action. If you plan to add them after the fill, the one time you forget will be the trade that decides your month.",
          ],
        },
      ],
      examples: {
        Forex: { title: "News slippage", steps: ["A 30-pip stop over a rate decision can fill 60 pips away.", "Halve size or stand aside for the release.", "The calendar tab in the right rail tells you which minute this is."] },
        Crypto: { title: "Thin books", steps: ["Altcoin stops routinely slip on wicks.", "Use stop-limit only if you will manage a missed exit manually.", "Otherwise accept slippage and size smaller."] },
        Futures: { title: "Rollover", steps: ["Liquidity moves to the next contract days before expiry.", "Trading the old contract means wider spreads.", "Check volume, not just the chart."] },
        Indices: { title: "Weekend gap", steps: ["A Friday-close position can open Monday past the stop.", "Stop-limit will simply not fill there.", "Size such that a gap through the stop is survivable."] },
      },
      terms: ["slippage", "bracket", "liquidity"],
      apply: {
        label: "Log a trade with entry, stop and target together",
        href: "/journal?new=1",
        why: "The trade form refuses to compute R without a stop, which is the habit being built.",
      },
    },
    {
      id: "f5",
      block: "foundations",
      title: "Leverage and margin, without the hype",
      minutes: 8,
      summary:
        "Leverage does not increase risk. Position size does. Leverage only decides whether the broker will let you hold the size you already chose.",
      sections: [
        {
          h: "Two separate questions",
          p: [
            "How much can I lose if I am wrong? That is stop distance times size — your risk. How much cash must the broker hold to let me open it? That is margin. Beginners conflate them and then use 1:500 leverage as permission to take a 20% risk.",
          ],
        },
        {
          h: "Margin call and stop-out",
          ul: [
            "Equity is balance plus open profit and loss.",
            "Margin level is equity divided by used margin. Below the broker's threshold, positions are closed for you, worst first.",
            "Being stopped out by margin is a sizing failure, always. A correctly sized position never reaches it.",
          ],
        },
        {
          h: "The useful way to think about it",
          p: [
            "Choose the size from your stop and your 1% rule. Then check margin to confirm the broker allows it. If margin is the binding constraint, the trade is too large for the account regardless of what the leverage allows.",
          ],
          note: "High leverage is a broker feature. Low risk per trade is a trader decision. They are unrelated, and only the second one keeps you solvent.",
        },
      ],
      examples: {
        Forex: { title: "Margin at 1:100", steps: ["0.10 lot EURUSD ≈ 10,000 notional.", "Margin required ≈ $100.", "Risk with a 25-pip stop ≈ $25 — a different and much smaller number."] },
        Crypto: { title: "Isolated vs cross", steps: ["Isolated caps the loss at the position's margin.", "Cross can consume the whole balance.", "Use isolated until sizing is automatic."] },
        Futures: { title: "Day vs overnight margin", steps: ["Day margin can be a tenth of overnight margin.", "Holding a position past the cut needs the full amount.", "Know the time, or get liquidated at it."] },
        Indices: { title: "Financing", steps: ["Margin is small, financing is charged on full notional.", "A held index long bleeds daily.", "Factor it into multi-day targets."] },
      },
      terms: ["leverage", "margin", "equity", "stop-out", "notional"],
      apply: {
        label: "Check margin before you size",
        href: "/calculators#mg",
        why: "Confirm the position your risk rule allows is one the broker will actually let you open.",
      },
    },
    {
      id: "f6",
      block: "foundations",
      title: "Why one percent",
      minutes: 7,
      summary:
        "The name of the product is the thesis. One percent per trade is not timidity — it is the size at which a normal losing streak cannot end you.",
      sections: [
        {
          h: "The arithmetic of streaks",
          p: [
            "A strategy that wins 45% of the time will, over a few hundred trades, throw a run of eight losses. At 1% risk that is an 8% drawdown — annoying. At 10% risk it is a 57% drawdown, and recovering from 57% needs a 133% gain.",
          ],
        },
        {
          h: "Losses and gains are asymmetric",
          ul: [
            "Down 10% needs +11.1% to recover.",
            "Down 25% needs +33.3%.",
            "Down 50% needs +100%.",
            "Down 75% needs +300%, which is why blown accounts are rarely recovered — they are refunded.",
          ],
        },
        {
          h: "What the one percent buys",
          p: [
            "Emotional room. At 1% a loss is information; at 10% it is a threat, and threatened people revenge-trade. Every behavioural leak the dashboard can detect is downstream of being sized too large.",
          ],
          note: "One percent is the default, not a law. New traders should start at 0.5% until twenty trades are logged and the process is boring.",
        },
      ],
      examples: {
        Forex: { title: "1% of $2,000", steps: ["Risk budget $20 per trade.", "30-pip stop on EURUSD → 0.06 lots.", "Eight losses in a row costs $154, not the account."] },
        Crypto: { title: "1% of $2,000", steps: ["Risk budget $20.", "1.2% stop on BTC → about $1,660 notional.", "Which is 0.026 BTC at 64,000 — far less than most beginners take."] },
        Futures: { title: "The honest answer", steps: ["One MES with a 10-point stop risks $50.", "On a $2,000 account that is 2.5% — above the rule.", "So either the stop is tighter or the account is too small for the instrument."] },
        Indices: { title: "Scaling down", steps: ["$20 risk, 15-point stop, $1/point → 1.3 units.", "Round down, never up.", "Rounding up is how a rule quietly becomes a suggestion."] },
      },
      terms: ["drawdown", "risk of ruin", "expectancy"],
      apply: {
        label: "See what 1% compounds to",
        href: "/calculators#cp",
        why: "Run your own balance and win rate — the compounding view is the argument for patience.",
      },
    },

    /* ---------------------------------------------------- 2 · Risk first */
    {
      id: "r1",
      block: "risk",
      title: "Sizing from the stop",
      minutes: 9,
      summary:
        "There is exactly one correct order of operations: level first, stop second, size third. Choosing size first is the most expensive habit in retail trading.",
      sections: [
        {
          h: "The formula",
          p: [
            "Size = (balance × risk%) ÷ (stop distance × value per unit of distance). Every calculator on this site is that one line, dressed for a specific instrument.",
          ],
        },
        {
          h: "Why the order matters",
          ul: [
            "Pick the size first and the stop gets moved to fit the size — which puts it where your tolerance is, not where the idea is wrong.",
            "Pick the stop first and size becomes arithmetic. No emotion is involved, which is the point.",
            "Wider stop means smaller position, not more risk. Traders who resist a wide stop are really resisting a small position.",
          ],
        },
        {
          h: "Round down, always",
          p: [
            "0.067 lots becomes 0.06, not 0.07. The rule is one-directional so that drift can only ever reduce risk. Small asymmetries like this are the whole discipline in miniature.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Worked", steps: ["$5,000 balance, 1% = $50 risk.", "Entry 1.0850, stop 1.0820 → 30 pips.", "$50 ÷ (30 × $10 per lot-pip) = 0.16 lots."] },
        Crypto: { title: "Worked", steps: ["$5,000, 1% = $50.", "Entry 64,000, stop 63,200 → $800 per coin.", "$50 ÷ 800 = 0.0625 BTC."] },
        Futures: { title: "Worked", steps: ["$5,000, 1% = $50.", "MES stop 10 points = $50 per contract.", "Exactly one contract — and zero room to add."] },
        Indices: { title: "Worked", steps: ["$5,000, 1% = $50.", "Stop 20 points at $1 per point per unit.", "2.5 units → round down to 2."] },
      },
      terms: ["risk per trade", "position size"],
      apply: {
        label: "Size a real trade now",
        href: "/calculators#ps",
        why: "It pre-fills your balance, currency and risk rule, then pushes the result straight into a journal entry.",
      },
    },
    {
      id: "r2",
      block: "risk",
      title: "Where a stop actually belongs",
      minutes: 8,
      summary:
        "A stop marks the price at which your idea is wrong. Not the loss you can stomach, and not a round number of pips.",
      sections: [
        {
          h: "Invalidation, not tolerance",
          p: [
            "Write the reason for the trade in one sentence. The stop goes at the price that makes that sentence false — beyond the swing low, outside the range, back inside the broken level. If you cannot name what would prove you wrong, you do not have a trade, you have a hope.",
          ],
        },
        {
          h: "Give it room for noise",
          ul: [
            "Place it beyond the level, not exactly on it — spread, wicks and stop hunts live in that gap.",
            "A volatility measure such as ATR is a sane buffer: level plus a fraction of the day's usual range.",
            "If the resulting stop makes the position uncomfortably small, the trade is fine and your size expectation was wrong.",
          ],
        },
        {
          h: "Moving stops",
          p: [
            "To break-even or in profit: allowed, and ideally by a written rule. Wider, away from price, to avoid being stopped: never. The journal detects this as a loss past 1.15R and prices it, because it is the single most expensive habit it can see.",
          ],
          note: "A stop moved away once will be moved away again. It is the only rule on this list with no legitimate exception.",
        },
      ],
      examples: {
        Forex: { title: "Structure stop", steps: ["Long a pullback to 1.0840, swing low 1.0826.", "Stop 1.0820 — six pips beyond the low.", "Not 1.0830 because it looked neater."] },
        Crypto: { title: "Volatility stop", steps: ["Daily ATR 1,800 on BTC.", "Intraday stop of 0.5 ATR ≈ 900 points.", "Size accordingly and stop complaining about the size."] },
        Futures: { title: "Session low", steps: ["Stop beyond the overnight low, plus two ticks.", "Round numbers cluster orders; avoid resting exactly there.", "Two ticks is cheap insurance."] },
        Indices: { title: "Range break", steps: ["Short the failed break of a range high.", "Stop above the wick high, not the body.", "If the wick is retaken, the idea is dead."] },
      },
      terms: ["invalidation", "ATR", "stop hunt"],
      apply: {
        label: "Review your stop overruns",
        href: "/dashboard#leaks",
        why: "The leak panel prices every loss that ran past its stop. Look at the number before arguing with the rule.",
      },
    },
    {
      id: "r3",
      block: "risk",
      title: "R multiples: the only comparable unit",
      minutes: 7,
      summary:
        "Money makes trades incomparable. R makes a $12 scalp and a $900 swing the same size of decision.",
      sections: [
        {
          h: "Definition",
          p: [
            "1R is the money you planned to lose if the stop was hit. A result of +2.4R means you made 2.4 times your risk. Because R normalises for size, a journal in R is a record of decisions rather than a record of account size.",
          ],
        },
        {
          h: "What it lets you do",
          ul: [
            "Compare last month's trades with this month's after your balance changed.",
            "Compare a crypto trade with a forex trade honestly.",
            "State an edge in one number: average R per trade.",
            "Spot stop overruns instantly — a loss should never be worse than about -1R.",
          ],
        },
        {
          h: "Fees belong inside R",
          p: [
            "Net R subtracts commissions and funding. A scalping strategy that looks like +0.2R per trade gross is frequently negative net, and the difference is exactly what the broker earns from you.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Computing R", steps: ["Risk $50, closed +$120, fees $4.", "Net $116 ÷ 50 = +2.32R.", "That is the number the journal stores."] },
        Crypto: { title: "Funding drag", steps: ["Risk $50, gross +$60, funding -$11.", "Net +0.98R, not +1.2R.", "Held longs are quietly taxed."] },
        Futures: { title: "Round trip", steps: ["Risk $50, +12 points on MES = $60.", "Less $2.40 commission → +1.15R.", "Small numbers matter at high frequency."] },
        Indices: { title: "Partial exits", steps: ["Half out at +1R, rest at +3R.", "Weighted result +2R.", "The journal computes this from the exit legs."] },
      },
      terms: ["R multiple", "expectancy", "net R"],
      apply: {
        label: "Check your planned R:R before entry",
        href: "/calculators#rr",
        why: "If the planned R:R is under your minimum, the trade fails the pre-trade checklist for a reason.",
      },
    },
    {
      id: "r4",
      block: "risk",
      title: "Expectancy, win rate and profit factor",
      minutes: 9,
      summary:
        "Win rate alone tells you almost nothing. Expectancy tells you whether to keep trading, and profit factor tells you how much shock the edge can absorb.",
      sections: [
        {
          h: "The three numbers",
          ul: [
            "Expectancy = average R per trade. Positive means the process pays; negative means volume makes it worse.",
            "Profit factor = gross profit ÷ gross loss. Above 1.0 is profitable; above 1.5 is robust; above 3.0 on a small sample is usually a data error or a fluke.",
            "Win rate = share of trades that won. Useful for knowing what a normal streak feels like, useless as a target.",
          ],
        },
        {
          h: "Win rate and R trade off",
          p: [
            "A 30% win rate at +3R average is excellent. An 80% win rate at +0.2R against -1R losers is a slow bleed. Chasing a high win rate pushes traders to cut winners early and hold losers — the exact inversion of an edge. This is why the discipline score on this site deliberately excludes win rate.",
          ],
        },
        {
          h: "Sample size",
          p: [
            "Thirty trades is a hint. A hundred is an opinion. Three hundred is evidence. Every statistic on the dashboard prints its sample size for this reason, and no pattern is reported from fewer than three occurrences.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Expectancy worked", steps: ["40 trades: 16 wins averaging +2.1R, 24 losses averaging -0.95R.", "(16×2.1 − 24×0.95) ÷ 40 = +0.27R per trade.", "At 1% risk that is about +0.27% per trade before costs."] },
        Crypto: { title: "High win rate trap", steps: ["85% wins at +0.3R, 15% losses at -2.5R.", "Expectancy = 0.255 − 0.375 = -0.12R.", "Losing strategy that feels like winning."] },
        Futures: { title: "Profit factor", steps: ["Gross profit $4,200, gross loss $2,700.", "PF 1.56 — healthy.", "One outlier win can inflate this; check without the best trade."] },
        Indices: { title: "Sample honesty", steps: ["Nine trades, +1.9R average.", "Not an edge yet, a start.", "Do not raise size on nine trades."] },
      },
      terms: ["expectancy", "profit factor", "win rate", "sample size"],
      apply: {
        label: "Read your own expectancy",
        href: "/dashboard",
        why: "The stat cards compute it from your logged trades, fees and partial exits included.",
      },
    },
    {
      id: "r5",
      block: "risk",
      title: "Drawdown, ruin and recovery maths",
      minutes: 8,
      summary:
        "Most blown accounts are a drawdown problem, not a strategy problem. Knowing your expected worst run in advance is what stops you quitting a working system.",
      sections: [
        {
          h: "Expected worst streak",
          p: [
            "At a 45% win rate, a run of eight losses appears within roughly two hundred trades. It is not bad luck, it is the distribution. Decide now what that streak costs at your risk level, and whether you will still be trading the system at the end of it.",
          ],
        },
        {
          h: "Risk of ruin",
          ul: [
            "Fixed 1% risk with a positive expectancy: ruin is effectively zero, drawdowns are shallow and recoverable.",
            "Fixed 5%: a 12-loss streak takes 46% off the account.",
            "Fixed 10% plus a losing streak: mathematically terminal, regardless of how good the entries were.",
          ],
        },
        {
          h: "Two kinds of drawdown",
          p: [
            "Equity drawdown is the money. Psychological drawdown is the number of days you have felt behind — it is usually longer, and it is what actually causes people to abandon a system two weeks before it recovers. The dashboard draws the drawdown band underneath the equity curve so both are read together.",
          ],
          note: "Write your maximum tolerable drawdown into the plan, and halve size when it is reached rather than stopping. Halving keeps you in the sample.",
        },
      ],
      examples: {
        Forex: { title: "Streak cost", steps: ["1% risk, 8 losses → -7.7%.", "Needs +8.4% to recover.", "About 31 trades at +0.27R expectancy."] },
        Crypto: { title: "Volatility cluster", steps: ["Crypto losses arrive in bunches.", "The same 8-loss run can happen in three days.", "Daily loss rails exist for exactly this."] },
        Futures: { title: "Fixed contract problem", steps: ["Trading one contract regardless of balance means risk% rises as the account falls.", "That is anti-Martingale in reverse.", "Recompute size every week."] },
        Indices: { title: "Recovery table", steps: ["-10% needs +11.1%.", "-20% needs +25%.", "-40% needs +66.7%."] },
      },
      terms: ["drawdown", "risk of ruin", "equity curve"],
      apply: {
        label: "Look at your drawdown band",
        href: "/dashboard#equity",
        why: "The band under the curve is the number your plan has to survive, not the peak.",
      },
    },
    {
      id: "r6",
      block: "risk",
      title: "Daily rails: loss stop, trade cap, cool-off",
      minutes: 7,
      summary:
        "Per-trade risk does not stop a bad day. Three daily limits do, and they are the settings this product checks before your next entry rather than after it.",
      sections: [
        {
          h: "The three rails",
          ul: [
            "Daily loss stop — a percentage of balance, default 3%. Hit it and the day is over; the equity is still there tomorrow.",
            "Trades per day — default 3. Caps the volume that revenge trading needs in order to do real damage.",
            "Cool-off after consecutive losses — default 3. A pause, not a ban, because the state of mind after three losses is measurably worse.",
          ],
        },
        {
          h: "Why nothing is blocked",
          p: [
            "A tool that locks a trader out gets closed, and the trade is placed at the broker anyway — unlogged, which is worse, because now it is invisible to the review. This product warns, names the rule, and records that the trade was taken knowingly.",
          ],
        },
        {
          h: "Local day, not UTC",
          p: [
            "Your trading day ends when your day ends. The rails use your local calendar day, which matters a great deal in Kampala where a UTC cutoff would land at 3am.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Rail in action", steps: ["Two -1R losses at 1% risk = -2%.", "A third loss would breach a 3% stop.", "The journal banners the rule before the entry is saved."] },
        Crypto: { title: "Weekend drift", steps: ["No close means no natural stop to the session.", "The trade cap becomes the session boundary.", "Set it deliberately low for 24/7 markets."] },
        Futures: { title: "Prop firm rules", steps: ["Funded accounts impose daily loss limits externally.", "Set yours tighter than theirs.", "Breaching theirs ends the account, not the day."] },
        Indices: { title: "Event days", steps: ["On CPI or FOMC days, halve the trade cap.", "One planned trade beats four reactive ones.", "The calendar in the right rail flags them."] },
      },
      terms: ["daily loss stop", "cool-off", "guardrail"],
      apply: {
        label: "Set your rails in settings",
        href: "/settings#guardrails",
        why: "Defaults are a guess. Your numbers should come from your own worst day.",
      },
    },

    /* ---------------------------------------- 3 · Reading the market */
    {
      id: "m1",
      block: "market",
      title: "Structure: trend, range, and the transition",
      minutes: 9,
      summary:
        "Price does two things — it trends or it ranges. Almost every losing setup is the right tactic applied to the wrong one of those two.",
      sections: [
        {
          h: "Reading structure without indicators",
          ul: [
            "Uptrend: higher highs and higher lows. Pullbacks are opportunities, breakdowns are warnings.",
            "Downtrend: lower highs and lower lows. Rallies are chances to sell, not evidence of a bottom.",
            "Range: highs and lows repeating between two levels. The edges are the trade; the middle is noise.",
          ],
        },
        {
          h: "The transition is where money is lost",
          p: [
            "Trends end as ranges and ranges end as trends, and both transitions look like the thing they no longer are. The tell is a failed continuation: a higher high that immediately loses the previous high, or a range break that closes back inside. Treat the failure as information rather than as an insult.",
          ],
        },
        {
          h: "One timeframe up, one down",
          p: [
            "Mark structure on a timeframe above the one you trade for direction, and use the one below only for entry timing. Three timeframes is context; six is a way of finding whatever answer you already wanted.",
          ],
          note:
            "Write the structure read into the journal plan field before entry. When the review shows your losses cluster in ranges, you will have the evidence to only take trends.",
        },
      ],
      examples: {
        Forex: { title: "Pullback in trend", steps: ["H4 makes higher highs and lows.", "M15 pullback into the last breakout level.", "Entry on the reclaim, stop beyond the pullback low."] },
        Crypto: { title: "Range edges", steps: ["BTC held 61k–65k for a week.", "Buy the swept low, sell the swept high.", "Stand aside in the middle — that is where the fees live."] },
        Futures: { title: "Failed break", steps: ["ES breaks the overnight high, closes back under.", "That is a short signal, not a broken long.", "Stop above the failed high."] },
        Indices: { title: "Transition", steps: ["US500 stops making higher lows.", "Treat pullback longs as lower probability immediately.", "Wait for a new range to define itself."] },
      },
      terms: ["higher high", "swing low", "range", "timeframe"],
      apply: {
        label: "Tag your trades by structure",
        href: "/journal",
        why: "Use the setup tags — trend, range, reversal — so the insights table can tell you which one actually pays you.",
      },
    },
    {
      id: "m2",
      block: "market",
      title: "Levels, liquidity and why stops cluster",
      minutes: 8,
      summary:
        "A level matters because orders rest there. That is also why price so often trades just through it before reversing.",
      sections: [
        {
          h: "What makes a level real",
          ul: [
            "It was reacted to more than once, and recently.",
            "It is visible to everyone: a session high, a prior day close, a round number, a range edge.",
            "Something happened there — a gap, a news candle, an obvious rejection wick.",
          ],
        },
        {
          h: "Stop clusters and sweeps",
          p: [
            "Retail stops sit immediately beyond obvious levels, which makes that pocket the cheapest liquidity in the market. Price reaching for it is ordinary mechanics, not conspiracy. Place stops beyond the pocket, and treat a sweep that immediately reverses as a setup in its own right.",
          ],
        },
        {
          h: "Fewer lines",
          p: [
            "Three levels you would defend in an argument beat fifteen drawn in hope. If every part of the chart is a level, no part of it is.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Round numbers", steps: ["1.1000 attracts orders and stops.", "Do not rest a stop at 1.0999.", "Use 1.0985 and size down to keep risk constant."] },
        Crypto: { title: "Liquidation wicks", steps: ["Leveraged liquidations produce violent wicks through obvious lows.", "A limit entry there fills well if you survive the wick.", "That survival is a sizing question."] },
        Futures: { title: "Prior day levels", steps: ["Prior high, low and settlement are the three lines most participants watch.", "Start every session with just those.", "Add nothing until they fail to explain the day."] },
        Indices: { title: "Gap fills", steps: ["Opening gaps fill often enough to be a level, not a rule.", "Trade toward the fill with a stop beyond the gap edge.", "Log it as its own setup so it can be measured."] },
      },
      terms: ["liquidity", "stop hunt", "sweep", "support", "resistance"],
      apply: {
        label: "Write the day's three levels in your notes",
        href: "/journal?new=1",
        why: "The analysis notes widget exists so the bias is written before the first trade, not rationalised after it.",
      },
    },
    {
      id: "m3",
      block: "market",
      title: "Sessions, volatility and the clock",
      minutes: 7,
      summary:
        "The same setup has a different win rate at 9am London and 9pm Tokyo. Time of day is a variable, and for most traders it is the biggest one they ignore.",
      sections: [
        {
          h: "The four sessions",
          ul: [
            "Sydney and Tokyo: ranges, thinner books, respect for levels, wider spreads on crosses.",
            "London: the largest forex volume, the day range often set here, trends actually trend.",
            "London–New York overlap: peak liquidity and peak volatility, best for breakouts.",
            "Late New York: liquidity drains, reversals on thin volume, the worst time for a breakout trade.",
          ],
        },
        {
          h: "Trade the session you are awake for",
          p: [
            "In East Africa the London open lands mid-morning and the overlap sits in the afternoon — which is a genuinely good hand. The mistake is trading the New York close at midnight on a work night and then blaming the strategy.",
          ],
        },
        {
          h: "Measure it, do not assume it",
          p: [
            "The journal stores the session on every trade and the dashboard breaks results down by it. Two months of honest logging usually finds one session quietly funding all the others.",
          ],
          note: "The session clock in the right rail shows all four in your timezone with a countdown to the next open. Press T.",
        },
      ],
      examples: {
        Forex: { title: "London open", steps: ["10:00 EAT is the London open.", "The Asia range is the reference the break trades against.", "Mark it before the bell."] },
        Crypto: { title: "No session, still patterns", steps: ["Crypto has no close but does have volume rhythm.", "US hours still carry the most participation.", "Weekend moves reverse more often than they continue."] },
        Futures: { title: "Cash open", steps: ["16:30 EAT is the US cash open.", "The first thirty minutes set the day range in most sessions.", "Many systems simply skip it."] },
        Indices: { title: "Overlap", steps: ["15:00–19:00 EAT is peak volatility.", "Breakouts work better here than at any other time.", "So do stop hunts."] },
      },
      terms: ["session", "overlap", "volatility"],
      apply: {
        label: "Check your session breakdown",
        href: "/dashboard#by-setup",
        why: "If one session is negative across twenty trades, you have found a free improvement: stop trading it.",
      },
    },
    {
      id: "m4",
      block: "market",
      title: "Candles and momentum, without indicator soup",
      minutes: 8,
      summary:
        "Two or three tools used consistently beat nine tuned until they agree. Candles are the raw data; indicators are summaries of it.",
      sections: [
        {
          h: "What a candle tells you",
          ul: [
            "Body direction and size: who won the period, and by how much.",
            "Wicks: prices that were rejected. A long lower wick at support is sellers failing.",
            "Where the close sits in the range — closes near an extreme carry more information than the pattern name.",
            "Context: the same hammer is a signal at a level and noise in the middle of a range.",
          ],
        },
        {
          h: "Indicators, and their honest role",
          p: [
            "A moving average is a trend filter. RSI is an extension gauge, not an overbought sell signal — in a strong trend it stays extended for weeks. Volume confirms participation. That is a sufficient toolkit; most of the rest repeats one of those three with different smoothing.",
          ],
        },
        {
          h: "Divergence and other stories",
          p: [
            "Momentum divergence is a warning about a trend's fuel, not a reversal signal on its own. Traded alone it is a reliable way to sell strength for two months.",
          ],
          note: "Rule for this path: an indicator has to survive the journal. If trades tagged with it are not better than trades without it after thirty samples, take it off the chart.",
        },
      ],
      examples: {
        Forex: { title: "Rejection at level", steps: ["Long lower wick into 1.0820 support, close near the high.", "Entry above the candle, stop under the wick.", "Confluence with structure, not with four oscillators."] },
        Crypto: { title: "Volume check", steps: ["A breakout on falling volume usually fails.", "Wait for the retest instead of the break.", "Log both variants separately."] },
        Futures: { title: "Trend filter", steps: ["Only long above session VWAP or a 20-EMA.", "One rule, applied without exception.", "Measure it, keep it or kill it."] },
        Indices: { title: "Extension", steps: ["RSI 78 in a strong uptrend is strength, not a short.", "Use it to skip late entries, not to reverse.", "The journal will show which use paid."] },
      },
      terms: ["candle", "wick", "RSI", "moving average", "divergence", "VWAP"],
      apply: {
        label: "Attach a marked-up chart to your next entry",
        href: "/journal?new=1",
        why: "A screenshot with your levels drawn is the only way a review can tell a good read from a lucky one.",
      },
    },
    {
      id: "m5",
      block: "market",
      title: "Scheduled events: trade around them, not through them",
      minutes: 8,
      summary:
        "Rate decisions, CPI and NFP move price more than any pattern on your chart, on a timetable published weeks in advance. There is no excuse for being surprised.",
      sections: [
        {
          h: "What the calendar tells you",
          ul: [
            "Time, in your timezone, so the release is a diary item rather than an ambush.",
            "Impact rating — one to three bars. Three-bar events widen spreads and gap price.",
            "Forecast versus previous: the market is already positioned for the forecast, so the reaction is to the surprise, not the number.",
          ],
        },
        {
          h: "Three legitimate responses",
          p: [
            "Flatten and stand aside. Halve size and widen the stop for the volatility. Or wait for the release and trade the reaction once spreads normalise, usually fifteen to thirty minutes later. Holding a normal-sized position into a three-bar release with a tight stop is not one of the three.",
          ],
        },
        {
          h: "The asymmetry that catches people",
          p: [
            "During a release your stop can slip badly, while your target fills at exactly the price you asked. The distribution is against you in both directions, which is why size, not cleverness, is the answer.",
          ],
          note: "Press C for today's calendar without leaving your chart. The pre-trade checklist also flags an imminent high-impact event before you save the entry.",
        },
      ],
      examples: {
        Forex: { title: "NFP", steps: ["First Friday, 15:30 EAT.", "Flat before, reassess after the first fifteen minutes.", "The first candle range is often the day range."] },
        Crypto: { title: "Macro sensitivity", steps: ["Crypto reacts to CPI and FOMC too.", "Funding spikes around them.", "Treat them as event days, not normal days."] },
        Futures: { title: "Inventories and auctions", steps: ["Energy inventories move oil at a fixed time weekly.", "Index futures react to Treasury auctions.", "Know the schedule for what you trade."] },
        Indices: { title: "Earnings", steps: ["Mega-cap earnings move the whole index after hours.", "An index long over earnings is a bet on one company.", "Size it as such or close it."] },
      },
      terms: ["CPI", "NFP", "FOMC", "impact rating", "slippage"],
      apply: {
        label: "Download the event playbook",
        href: "/learn#library",
        why: "Until the context panels ship, the playbook covers what to do for each of the big five releases.",
      },
    },
    {
      id: "m6",
      block: "market",
      title: "Correlation and hidden concentration",
      minutes: 7,
      summary:
        "Four trades at 1% each can be one trade at 4%. Correlation is how a disciplined sizing rule still produces an undisciplined day.",
      sections: [
        {
          h: "The same bet, wearing four hats",
          ul: [
            "EURUSD, GBPUSD and AUDUSD long is one short-dollar position.",
            "BTC and most large-cap alts move together in a risk-off move; the diversification is imaginary.",
            "US500 and Nasdaq long plus short USDJPY is one risk-on bet.",
            "Gold, silver and AUD often share a driver.",
          ],
        },
        {
          h: "Budget risk per theme",
          p: [
            "Cap total risk on correlated positions at your per-trade limit, or at most twice it. The cleanest rule: one theme, one unit of risk, split across however many instruments express it.",
          ],
        },
        {
          h: "Open risk is the number that matters",
          p: [
            "The dashboard open-risk figure adds up what is at stake right now if every open stop is hit, and measures it against the daily loss rail — so a 4% correlated day is visible before it happens rather than afterwards. Positions with no stop are counted separately and never as zero.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Dollar basket", steps: ["Three 1% longs against USD.", "Real exposure 3% on one driver.", "Take the best chart, skip the other two."] },
        Crypto: { title: "Beta", steps: ["Alts carry BTC beta above 1.", "Two alt longs plus a BTC long is a leveraged BTC long.", "Size the basket, not the line."] },
        Futures: { title: "Index family", steps: ["ES, NQ and YM are not three ideas.", "Choose the one with the cleanest structure.", "Halve size if you must hold two."] },
        Indices: { title: "Sector weight", steps: ["Nasdaq is concentrated in a handful of names.", "An index trade can be a single-stock trade in disguise.", "Check the weights once, remember them."] },
      },
      terms: ["correlation", "open risk", "beta", "theme risk"],
      apply: {
        label: "Check your open risk",
        href: "/dashboard#panel-open",
        why: "It is the only forward-looking number on the site. Look at it before adding a fourth position.",
      },
    },

    /* ------------------------------------------- 4 · Build a system */
    {
      id: "s1",
      block: "system",
      title: "A setup defined tightly enough to test",
      minutes: 9,
      summary:
        "I buy pullbacks in an uptrend is not a setup. If two people cannot look at the same chart and agree whether it triggered, it cannot be measured.",
      sections: [
        {
          h: "The six parts of a defined setup",
          ul: [
            "Market and timeframe — which instruments, which chart, which session.",
            "Context filter — the structural condition that must already be true.",
            "Trigger — the specific, observable event that puts you in.",
            "Invalidation — where the stop goes, stated as a rule rather than a distance.",
            "Exit — target rule, partial rule, and the time-based exit if it goes nowhere.",
            "Exclusions — when you do not take it: event days, first thirty minutes, after two losses.",
          ],
        },
        {
          h: "The two-person test",
          p: [
            "Hand the definition to someone else with fifty charts. If their trigger list matches yours, the setup is objective enough to produce statistics. If it does not, your journal is recording moods with prices attached.",
          ],
        },
        {
          h: "One setup at a time",
          p: [
            "Thirty samples of one setup is knowledge. Five samples each of six setups is noise you will interpret as knowledge. Add the second setup only when the first has a number attached to it.",
          ],
          note: "Use the journal setup tag exactly as written in your definition. Free-text drift — pullback, PB, pull back — quietly splits one sample into three.",
        },
      ],
      examples: {
        Forex: { title: "Written out", steps: ["EURUSD, M15, London session only.", "Context: H4 higher highs and lows. Trigger: M15 close back above the broken level after a pullback.", "Stop beyond the pullback low, half off at 1R, target 2R, out at 12:00 if flat."] },
        Crypto: { title: "Written out", steps: ["BTCUSD, H1, any session.", "Context: above the weekly open. Trigger: sweep of the prior day low then an H1 reclaim.", "Stop under the sweep wick, target prior day high."] },
        Futures: { title: "Written out", steps: ["MES, M5, first two hours of cash.", "Context: open above prior settlement. Trigger: pullback to VWAP holding on two closes.", "Stop 1.5 points under VWAP, target the session high."] },
        Indices: { title: "Written out", steps: ["US500, M30.", "Context: gap up under 0.4%. Trigger: failure to fill within the first hour.", "Stop at the gap low, target 1.5R, no trade on CPI or FOMC days."] },
      },
      terms: ["setup", "trigger", "context filter", "backtest"],
      apply: {
        label: "Download the setup definition sheet",
        href: "/learn#library",
        why: "One page, six fields. Fill it in for your main setup before your next trade.",
      },
    },
    {
      id: "s2",
      block: "system",
      title: "The written trading plan",
      minutes: 8,
      summary:
        "A plan is not motivation. It is a set of decisions made while calm, so that the version of you that is losing money does not get to make them.",
      sections: [
        {
          h: "What the plan must contain",
          ul: [
            "Account: balance, currency, risk per trade, daily loss stop, trade cap, cool-off rule.",
            "Markets and sessions you will trade — and the ones you will not.",
            "Your setups, in the six-part format, with their exclusions.",
            "Management rules: when the stop moves, what comes off at 1R, how a runner is trailed.",
            "Review cadence: daily note, weekly read, monthly change. One change per month.",
            "Escalation and de-escalation: what has to be true to raise risk, and what forces you to halve it.",
          ],
        },
        {
          h: "Rules, not intentions",
          p: [
            "Be more patient cannot be obeyed or broken. No entries in the first fifteen minutes of the cash open can be checked in one glance at a timestamp — and the journal can then price what breaking it cost.",
          ],
        },
        {
          h: "Version it",
          p: [
            "Date every change and write the one sentence of evidence that caused it. A plan that changes after every loss is not a plan; a plan that never changes is not learning. The distinction is whether a change cites a sample.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Escalation rule", steps: ["Raise risk from 0.5% to 1% after 30 logged trades with positive expectancy.", "Halve it after a 6% drawdown.", "Both numbers written before either happens."] },
        Crypto: { title: "Exclusion rule", steps: ["No new longs when funding is extremely positive.", "Checkable, not vague.", "Tag it so it can be tested."] },
        Futures: { title: "Hard stop time", steps: ["Flat by 22:00 EAT regardless of position.", "Sleep is part of the system.", "Log the exit as time-based, not as a loss."] },
        Indices: { title: "Event rule", steps: ["No index trades in the ten minutes before CPI.", "One rule, zero judgement required.", "The journal shows whether you kept it."] },
      },
      terms: ["trading plan", "escalation", "process rule"],
      apply: {
        label: "Use the trading plan template",
        href: "/learn#library",
        why: "Fill the template, then set the same numbers in settings so the app can hold you to them.",
      },
    },
    {
      id: "s3",
      block: "system",
      title: "Journaling that changes behaviour",
      minutes: 9,
      summary:
        "A journal that only stores profit and loss teaches nothing. Risk, emotion, plan and the pre-trade record are what make it a diagnostic instrument.",
      sections: [
        {
          h: "The fields that do the work",
          ul: [
            "Risk in percent — without it nothing is comparable and R cannot be computed.",
            "Emotion at entry — the field that surfaces the revenge pattern no equity curve can show.",
            "Setup and session tags — the axes every breakdown is built on.",
            "The written reason, one line, before entry. Trades with no reason are a measurable category here, and they underperform.",
            "Fees and partial exits, so R is arithmetically true rather than roughly true.",
            "A screenshot with your levels drawn, because memory rewrites charts.",
          ],
        },
        {
          h: "Log the plan before the result exists",
          p: [
            "Anything written after the exit is contaminated by knowing the outcome. This product records the pre-trade checklist at save time and never rewrites it on edit — a journal you can tidy up is worth nothing.",
          ],
        },
        {
          h: "Two sentences beat two paragraphs",
          p: [
            "What did I see, and did I follow my rule. A long review form gets abandoned in a week, and a habit that stops is worse than a small one that continues.",
          ],
          note: "The dashboard activity heatmap tracks days logged against days traded. The streak is not decoration — journaling consistency is 25% of the discipline score.",
        },
      ],
      examples: {
        Forex: { title: "A good entry note", steps: ["Long 1.0845, H4 uptrend, M15 reclaim of 1.0840, stop 1.0820, 2R target.", "One line, checkable later.", "Emotion: calm."] },
        Crypto: { title: "A bad entry note", steps: ["Looked bullish.", "Unfalsifiable, so unusable.", "The leak engine tracks trades like this as a category of their own."] },
        Futures: { title: "Partial exits", steps: ["Two contracts, one off at 1R, one at 3R.", "Log both legs; the weighted result is +2R.", "Approximating this corrupts every statistic downstream."] },
        Indices: { title: "CSV import", steps: ["Import the broker statement for history.", "Then add risk, emotion and reason by hand for recent trades.", "Nobody retypes six months."] },
      },
      terms: ["journal", "emotion tag", "discipline score", "off plan"],
      apply: {
        label: "Open the journal",
        href: "/journal",
        why: "If you have fewer than twenty logged trades, this is the only lesson on the path that matters today.",
      },
    },
    {
      id: "s4",
      block: "system",
      title: "Reading your own statistics: finding the leak",
      minutes: 10,
      summary:
        "The review is not a scoreboard. It is a search for the one change with the largest arithmetic effect — and then only that change.",
      sections: [
        {
          h: "Rules versus patterns",
          p: [
            "A broken rule needs no sample size: one oversized position is a fact, and its excess cost can be priced exactly. A pattern is a claim about the future and needs a sample — at least three occurrences here, and six closed trades in the journal, with the sample size printed on the card.",
          ],
        },
        {
          h: "Three honesty rules",
          ul: [
            "Measure a subset against the rest of the journal, never against zero. A losing session inside a losing month is not a leak.",
            "Print the sample size every time, without exception.",
            "Only report a finding if removing it would have helped — and dedupe two cuts covering the same trades, because that is one finding said twice.",
          ],
        },
        {
          h: "One change a month",
          p: [
            "Change six things and you cannot attribute the result to any of them. Change one, log thirty trades, then judge. This is slow, and it is the only method that produces knowledge rather than opinion.",
          ],
          note: "The dashboard already runs this analysis: oversizing, stops overrun, missing stops, trades past the daily cap, revenge entries within ninety minutes of a loss, plus your worst session, state of mind, setup, day and instrument — and your best ones, because a screen that only lists faults gets opened once.",
        },
      ],
      examples: {
        Forex: { title: "A priced rule break", steps: ["Four trades sized above the risk rule.", "Excess risk cost 2.1R versus sizing correctly.", "That is a rule, not a theory — fix it this week."] },
        Crypto: { title: "A pattern with a sample", steps: ["Seven entries within ninety minutes of a loss.", "Expectancy -0.8R against +0.3R for the rest.", "The cool-off rail goes on."] },
        Futures: { title: "Best setup", steps: ["VWAP pullbacks +0.9R over 22 trades.", "Everything else roughly flat.", "The change is subtraction: stop taking the rest."] },
        Indices: { title: "A weak sample", steps: ["Three Monday losses.", "Below the evidence bar; note it, do not act on it.", "Revisit at ten Mondays."] },
      },
      terms: ["leak", "versus rest", "sample size", "expectancy"],
      apply: {
        label: "Run the leak panel",
        href: "/dashboard#leaks",
        why: "Pick the single most expensive finding and write it as a rule in settings. That is the month's work.",
      },
    },
    {
      id: "s5",
      block: "system",
      title: "Scaling: partials, adds, and raising risk",
      minutes: 8,
      summary:
        "Partial exits, pyramiding and risk escalation are the three ways a working system is quietly turned into a losing one.",
      sections: [
        {
          h: "Partial exits honestly",
          p: [
            "Taking half off at 1R raises the win rate and lowers expectancy for most trend systems, because the profit lives in the tail you just cut. It is a valid choice — for volatility tolerance, not for returns. Make it a rule, apply it to every trade, and measure both variants before deciding.",
          ],
        },
        {
          h: "Adding to winners",
          ul: [
            "Only ever after the first position is at break-even or better, with its stop moved up.",
            "Total open risk must still be inside one unit of risk. Adding at full size is just a second trade with a worse entry.",
            "Never add to a loser. Averaging down converts a defined loss into an undefined one, and it is the mechanism behind almost every catastrophic retail account.",
          ],
        },
        {
          h: "Raising risk",
          p: [
            "Escalate on evidence, not on confidence: a written trigger such as a hundred logged trades with positive expectancy and drawdown inside plan. And write the de-escalation first — the rule that halves size at a defined drawdown — because that is the one you will need sooner.",
          ],
        },
      ],
      examples: {
        Forex: { title: "Partial rule", steps: ["Half off at 1R, stop to break-even, trail the rest.", "The same rule on every trade for thirty trades.", "Then compare against holding full to target."] },
        Crypto: { title: "Pyramiding", steps: ["First add only after 1R and the stop is at entry.", "The add is half the original size.", "Combined risk never exceeds 1%."] },
        Futures: { title: "Contract ladder", steps: ["One contract until 100 trades are logged.", "Two only if expectancy is positive and drawdown is inside plan.", "Back to one after a 6% drawdown."] },
        Indices: { title: "Averaging down", steps: ["The one rule with no exception: never.", "If the level is better now, that is a new trade with a new stop.", "And it still gets sized from scratch."] },
      },
      terms: ["partial exit", "pyramiding", "averaging down", "escalation"],
      apply: {
        label: "Log partial exits properly",
        href: "/journal",
        why: "The journal supports multiple exit legs and computes the weighted result, which is the only way to compare the two variants.",
      },
    },
    {
      id: "s6",
      block: "system",
      title: "Tilt, boredom and the rules that survive them",
      minutes: 9,
      summary:
        "Discipline is not willpower. It is an environment arranged so that the wrong trade takes more effort than the right one.",
      sections: [
        {
          h: "The four states that cost money",
          ul: [
            "Revenge, after a loss: the urge to recover it immediately, on any instrument. Countered by the cool-off rail.",
            "Euphoria, after a run of wins: sizing up exactly when the sample says nothing has changed. Countered by a fixed risk percent.",
            "Boredom, in a quiet session: taking a trade because you are present, not because it triggered. Countered by the trade cap and a written setup.",
            "Fear of missing out, in a fast move: entering late with a wide stop and no plan. Countered by a rule against entering past a defined extension.",
          ],
        },
        {
          h: "Make the good path the cheap one",
          p: [
            "Pre-write the day's levels. Keep the sizing calculator open. Use the pre-trade checklist. Close the platform when the cap is reached. Each is a friction placed in front of the impulsive action and removed from the correct one.",
          ],
        },
        {
          h: "Grade process, not outcome",
          p: [
            "A losing trade taken exactly to plan is a good trade; a winning trade taken on impulse is a bad one that happened to pay. The per-trade discipline score is built on this, and it is the only reason a leaderboard is worth existing — it ranks risk adherence, risk consistency, journaling and plan adherence, and never profit.",
          ],
          note: "Emotion is a field in the journal because it is data. Two months of it usually reveals that one state accounts for most of the damage, and that state has a rail available.",
        },
      ],
      examples: {
        Forex: { title: "Revenge, measured", steps: ["Entries within 90 minutes of a loss: -0.8R expectancy.", "Rest of journal: +0.3R.", "Turn the cool-off rail on and the leak closes."] },
        Crypto: { title: "24/7 boredom", steps: ["No close means no natural stopping point.", "Set trading hours for yourself and log the session.", "Trades outside them get tagged and measured."] },
        Futures: { title: "Euphoria", steps: ["Four wins is not evidence.", "Size stays fixed until the escalation trigger is met.", "Written in advance, so there is nothing to decide."] },
        Indices: { title: "FOMO", steps: ["No entry more than 1 ATR past the level.", "Checkable, unambiguous.", "The trades it blocks were the worst ones."] },
      },
      terms: ["tilt", "FOMO", "cool-off", "discipline score", "process rule"],
      apply: {
        label: "Turn on your guardrails",
        href: "/settings#guardrails",
        why: "Nothing is ever blocked — the rails warn, name the rule, and record that the trade was taken knowingly.",
      },
    },
  ];


  /* ------------------------------------------------------------ quizzes
     Ten questions per gate, two attempts, then a cooldown — the roadmap's
     rule, kept. Every question names the lesson that covered it, so a
     wrong answer links back to the exact place rather than to the block.
     `why` is shown after grading, because a quiz that only says "wrong"
     teaches less than the lesson it came from. */

  const quizzes = {
    foundations: [
      { id: "q-f-1", lesson: "f1", q: "Before price moves at all, a new position usually shows a small loss. Why?", a: ["The broker charges a fee per minute", "You buy at the ask and the position is valued at the bid", "Leverage interest accrues instantly", "Prices always dip after an entry"], correct: 1, why: "Buys open at the ask and mark against the bid, so the spread appears as an immediate paper loss." },
      { id: "q-f-2", lesson: "f1", q: "Which of these is the most realistic durable edge for a retail trader?", a: ["Faster execution than institutions", "Better information than the market", "Selectivity, sizing and consistency", "Higher leverage"], correct: 2, why: "You will not win on speed or information. Selectivity, sizing and consistency are the retail edges, and all three are measurable." },
      { id: "q-f-3", lesson: "f2", q: "You use a 20-pip stop on EURUSD. What is the correct stop for BTCUSD?", a: ["Also 20 pips", "20 dollars", "Whatever the instrument's volatility and your level require", "Half, because crypto is riskier"], correct: 2, why: "Stop distance belongs to the instrument's volatility and the invalidation level. Size then adapts to keep risk constant." },
      { id: "q-f-4", lesson: "f3", q: "One pip on 0.10 lots of EURUSD is worth approximately:", a: ["$10", "$1", "$0.10", "$100"], correct: 1, why: "A standard lot is about $10 per pip, so 0.10 lots is about $1 per pip." },
      { id: "q-f-5", lesson: "f3", q: "A tick is:", a: ["One tenth of a pip", "The smallest price increment of a contract, with a fixed money value", "Any one-second price update", "The spread at the open"], correct: 1, why: "In futures the exchange defines the tick size and its money value — MES moves in 0.25 point ticks worth $1.25." },
      { id: "q-f-6", lesson: "f4", q: "You need certainty of price and can accept not being filled. Which order?", a: ["Market", "Limit", "Stop", "Trailing stop"], correct: 1, why: "A limit fills at your price or better, or not at all. A market order is the opposite trade-off." },
      { id: "q-f-7", lesson: "f4", q: "A stop-loss order guarantees your maximum loss.", a: ["True, that is its purpose", "False — it becomes a market order and can slip, so size is the real control", "True, if it is set at a round number", "False, but only in crypto"], correct: 1, why: "Through a gap or a thin book a stop fills at the next available price. Position size is what actually bounds the damage." },
      { id: "q-f-8", lesson: "f5", q: "Raising leverage from 1:30 to 1:500 changes:", a: ["Your risk per trade", "The margin the broker holds, not your risk", "Your stop distance", "Your expectancy"], correct: 1, why: "Risk is stop distance times size. Leverage only decides whether the broker will let you hold that size." },
      { id: "q-f-9", lesson: "f6", q: "After a 50% drawdown, the gain needed to get back to break-even is:", a: ["50%", "75%", "100%", "150%"], correct: 2, why: "Halving then doubling. Losses and gains are asymmetric, which is the whole argument for small risk per trade." },
      { id: "q-f-10", lesson: "f6", q: "Eight consecutive losses at 1% risk costs roughly:", a: ["0.8%", "8%", "18%", "57%"], correct: 1, why: "About 7.7% compounded — uncomfortable but fully recoverable, which is the point of the rule." },
    ],
    risk: [
      { id: "q-r-1", lesson: "r1", q: "What is the correct order of operations?", a: ["Size, then stop, then level", "Level, then stop, then size", "Stop, then size, then level", "Whichever the platform defaults to"], correct: 1, why: "Level first, stop where the idea is wrong, and size becomes arithmetic instead of emotion." },
      { id: "q-r-2", lesson: "r1", q: "$4,000 account, 1% risk, 40-pip stop on EURUSD. Position size?", a: ["0.10 lots", "0.40 lots", "1.00 lots", "0.04 lots"], correct: 0, why: "$40 risk divided by (40 pips x $10 per lot-pip) = 0.10 lots." },
      { id: "q-r-3", lesson: "r1", q: "The calculator returns 0.078 lots. You should trade:", a: ["0.08 lots", "0.07 lots", "0.10 lots for a round number", "Either, it is immaterial"], correct: 1, why: "Always round down. The rule is one-directional so drift can only ever reduce risk." },
      { id: "q-r-4", lesson: "r2", q: "A stop belongs:", a: ["At the loss you can emotionally tolerate", "At a fixed number of pips for consistency", "At the price that proves the trade idea wrong", "Just inside the nearest round number"], correct: 2, why: "Invalidation, not tolerance. If you cannot name what would prove you wrong, there is no trade." },
      { id: "q-r-5", lesson: "r2", q: "Price approaches your stop and you widen it. What has happened to your risk?", a: ["Unchanged, the size is the same", "Reduced, because the trade has more room", "It has become undefined, and the journal prices it as a stop overrun", "Improved, if the level still holds"], correct: 2, why: "Widening converts a defined loss into an open-ended one. The leak engine detects it as a loss past 1.15R." },
      { id: "q-r-6", lesson: "r3", q: "You risked $80 and netted $200 after fees. The result in R is:", a: ["+1.2R", "+2.5R", "+2.0R", "+0.4R"], correct: 1, why: "200 divided by 80 is 2.5R. R normalises for size so trades across months and markets are comparable." },
      { id: "q-r-7", lesson: "r4", q: "Which set describes a profitable process?", a: ["85% win rate, +0.3R wins, -2.5R losses", "30% win rate, +3R wins, -1R losses", "60% win rate, +0.4R wins, -1R losses", "50% win rate, +0.9R wins, -1R losses"], correct: 1, why: "0.3 x 3 minus 0.7 x 1 = +0.2R. The others are negative — high win rates hide bleeding expectancy." },
      { id: "q-r-8", lesson: "r4", q: "Why does this product's discipline score exclude win rate?", a: ["It is hard to compute", "It is partly luck, and it punishes correct low-win-rate, high-R strategies", "Users dislike it", "It duplicates profit factor"], correct: 1, why: "Win rate is shown on the dashboard, where it is information, and kept out of the ranking, where it is noise." },
      { id: "q-r-9", lesson: "r5", q: "Most blown accounts are best described as:", a: ["A strategy problem", "A drawdown and sizing problem", "A platform problem", "A market-conditions problem"], correct: 1, why: "Positive-expectancy systems still kill accounts when risk per trade is large enough for a normal streak to be terminal." },
      { id: "q-r-10", lesson: "r6", q: "Your daily loss stop is breached. What does this product do?", a: ["Blocks further trades", "Closes open positions", "Warns, names the rule, and records that the next trade was taken knowingly", "Nothing until tomorrow"], correct: 2, why: "A tool that locks you out gets closed and the trade goes in at the broker unlogged — which is worse, because it becomes invisible." },
    ],
    market: [
      { id: "q-m-1", lesson: "m1", q: "Price makes a higher high, then immediately trades back below the previous high. This is best read as:", a: ["Confirmation of the uptrend", "A failed continuation, and a warning about structure", "Irrelevant noise", "A reason to add to longs"], correct: 1, why: "Failed continuations are the earliest tell of a transition from trend to range." },
      { id: "q-m-2", lesson: "m1", q: "In a clean range, the highest-quality trades are:", a: ["In the middle, where volume is highest", "At the edges, against the failed break", "On every break of the midpoint", "Only on the second break"], correct: 1, why: "The edges are the trade; the middle is where fees accumulate without an edge." },
      { id: "q-m-3", lesson: "m2", q: "Why does price so often trade just beyond an obvious level before reversing?", a: ["Brokers hunt individual stops", "Resting stop orders there are the cheapest available liquidity", "Random chance, always", "Algorithms are required to test levels"], correct: 1, why: "Clustered stops are liquidity. Place yours beyond the pocket and size down to keep risk constant." },
      { id: "q-m-4", lesson: "m2", q: "How many levels should a clean chart usually carry?", a: ["As many as you can identify", "A few you could defend in an argument", "One per indicator", "At least ten, for confluence"], correct: 1, why: "If every part of the chart is a level, no part of it is." },
      { id: "q-m-5", lesson: "m3", q: "Which window usually carries peak liquidity and volatility?", a: ["Sydney open", "Tokyo mid-session", "The London–New York overlap", "The last hour of New York"], correct: 2, why: "The overlap is where breakouts work best, and where stop hunts are most active." },
      { id: "q-m-6", lesson: "m3", q: "Your journal shows one session is negative across twenty trades. The correct action is:", a: ["Trade it larger to recover", "Ignore it, sessions are random", "Stop trading that session", "Change strategy entirely"], correct: 2, why: "Subtraction is the cheapest improvement available, and it needs no new skill." },
      { id: "q-m-7", lesson: "m4", q: "RSI reading 78 during a strong uptrend is best used to:", a: ["Short the extension", "Skip a late entry", "Double the position", "Ignore the trend read"], correct: 1, why: "RSI is an extension gauge. In strong trends it stays extended for weeks — it filters late entries, it does not signal reversals." },
      { id: "q-m-8", lesson: "m4", q: "What is the test for keeping an indicator on your chart?", a: ["It looks clean", "Trades tagged with it beat trades without it after about thirty samples", "A well-known trader uses it", "It agrees with your other indicators"], correct: 1, why: "An indicator has to survive the journal. Otherwise it is decoration with a settings menu." },
      { id: "q-m-9", lesson: "m5", q: "Which is NOT one of the three legitimate responses to a three-bar event?", a: ["Flatten and stand aside", "Halve size and widen the stop", "Wait and trade the reaction after spreads normalise", "Hold normal size with a tight stop"], correct: 3, why: "During a release stops slip while targets fill exactly. Size, not cleverness, is the answer." },
      { id: "q-m-10", lesson: "m6", q: "Long EURUSD, GBPUSD and AUDUSD at 1% each is really:", a: ["Three diversified 1% trades", "One short-dollar position risking about 3%", "A hedged basket", "Safer than one 1% trade"], correct: 1, why: "Correlation is how a disciplined per-trade rule still produces an undisciplined day. Budget risk per theme." },
    ],
    system: [
      { id: "q-s-1", lesson: "s1", q: "What is missing from \u201cI buy pullbacks in an uptrend\u201d?", a: ["Nothing, it is sufficient", "An observable trigger, an invalidation rule, an exit rule and exclusions", "A profit target only", "An indicator"], correct: 1, why: "If two people cannot agree whether it triggered, it cannot produce statistics." },
      { id: "q-s-2", lesson: "s1", q: "How many setups should a new trader run at once?", a: ["One, until it has thirty samples", "Three, for diversification", "As many as trigger", "Six, one per market"], correct: 0, why: "Thirty samples of one setup is knowledge. Five samples each of six setups is noise you will mistake for knowledge." },
      { id: "q-s-3", lesson: "s2", q: "Which of these is a usable plan rule?", a: ["Be more patient", "Stop overtrading", "No entries in the first fifteen minutes of the cash open", "Trade better setups"], correct: 2, why: "A rule has to be checkable from the record. Intentions cannot be obeyed or broken, so they cannot be measured." },
      { id: "q-s-4", lesson: "s2", q: "A plan change is justified when:", a: ["The last trade lost", "It cites a sample of evidence, and is dated", "A new indicator is released", "The month was flat"], correct: 1, why: "Changing after every loss is not a plan; never changing is not learning. The difference is whether the change cites a sample." },
      { id: "q-s-5", lesson: "s3", q: "Why is the emotion field mandatory?", a: ["It personalises the interface", "It surfaces patterns such as revenge entries that no equity curve can show", "It is required for tax records", "It improves the win rate directly"], correct: 1, why: "Emotion is data. Two months of it usually shows one state causing most of the damage — and that state has a rail available." },
      { id: "q-s-6", lesson: "s3", q: "Editing an old trade lets you improve its pre-trade checklist record.", a: ["True, accuracy matters", "False — the pre-trade record is never rewritten on edit", "True, if within 24 hours", "False, but only for closed trades"], correct: 1, why: "A journal that lets you tidy up history is worth nothing." },
      { id: "q-s-7", lesson: "s4", q: "A pattern in your journal must be measured against:", a: ["Zero", "The rest of the journal", "Last month only", "A public benchmark"], correct: 1, why: "A losing session inside a losing month is not a leak. Subsets are always compared against the rest." },
      { id: "q-s-8", lesson: "s4", q: "How many changes should come out of a monthly review?", a: ["One", "Three to five", "As many as the data suggests", "None, stay the course"], correct: 0, why: "Change six things and no result can be attributed to any of them." },
      { id: "q-s-9", lesson: "s5", q: "Adding to a losing position is acceptable when:", a: ["The level is still valid", "You reduce the original size first", "Never — it converts a defined loss into an undefined one", "The trend is strong"], correct: 2, why: "Averaging down is the mechanism behind almost every catastrophic retail account." },
      { id: "q-s-10", lesson: "s6", q: "A losing trade taken exactly to plan should be graded:", a: ["Badly, it lost money", "Well — process is what is graded, and the discipline score is built on it", "Neutrally, pending the next trade", "By its R multiple alone"], correct: 1, why: "A winning trade taken on impulse is a bad trade that happened to pay. Grading outcomes teaches luck." },
    ],
  };

  /* ---------------------------------------------------------- resources
     Real files, generated in the browser from the text held here. A
     library of links to PDFs that do not exist would be the one dishonest
     surface on the site; markdown and CSV open everywhere, including on a
     phone, and cost nothing to keep in sync with the lessons. */

  const resources = [
    {
      id: "plan",
      title: "Trading plan template",
      kind: "Template",
      file: "trading-plan.md",
      blurb: "The six sections a plan needs, with prompts. Fill it in, then mirror the numbers into settings so the app can hold you to them.",
      lesson: "s2",
      body: [
        "# Trading plan",
        "Version 1 · date:",
        "",
        "## 1. Account and risk",
        "- Balance and currency:",
        "- Risk per trade (%):",
        "- Daily loss stop (%):",
        "- Maximum trades per day:",
        "- Cool-off after N consecutive losses:",
        "- Minimum planned R:R:",
        "- Maximum tolerable drawdown, and what I do when it is reached:",
        "",
        "## 2. Markets and sessions",
        "- Instruments I trade:",
        "- Sessions I trade (local time):",
        "- Instruments and sessions I do not trade:",
        "",
        "## 3. Setups (one block each)",
        "- Name:",
        "- Market and timeframe:",
        "- Context filter (what must already be true):",
        "- Trigger (observable event):",
        "- Invalidation (where the stop goes, as a rule):",
        "- Exit (target, partials, time stop):",
        "- Exclusions (when I do not take it):",
        "",
        "## 4. Management rules",
        "- When the stop moves, and to where:",
        "- What comes off at 1R:",
        "- How a runner is trailed:",
        "- What forces an exit regardless of price:",
        "",
        "## 5. Review cadence",
        "- Daily: log every trade, one-line note.",
        "- Weekly: read the leak panel, make no changes.",
        "- Monthly: one change, with the sample that justifies it.",
        "",
        "## 6. Escalation and de-escalation",
        "- I raise risk when:",
        "- I halve risk when:",
        "",
        "Signed: ____________________   Date: __________",
      ],
    },
    {
      id: "pretrade",
      title: "Pre-trade checklist",
      kind: "Checklist",
      file: "pre-trade-checklist.md",
      blurb: "The printable version of the checks the trade form runs — for the days you are trading from a phone or a platform that is not this one.",
      lesson: "r2",
      body: [
        "# Before you enter",
        "",
        "## What the numbers must say",
        "- [ ] A stop is set, at a price that proves the idea wrong.",
        "- [ ] The stop is on the losing side of entry.",
        "- [ ] Risk is inside my rule (____%), computed from the stop.",
        "- [ ] Planned R:R meets my minimum (____). No target counts as unmet.",
        "- [ ] Size was rounded down, not up.",
        "- [ ] Margin is available and the position is not margin-constrained.",
        "- [ ] Open risk across all positions is still inside one theme's budget.",
        "- [ ] No guardrail breached today (loss stop, trade cap, cool-off).",
        "- [ ] No three-bar event inside the next 30 minutes.",
        "",
        "## What only you can answer",
        "- [ ] I can write the reason in one line: ______________________________",
        "- [ ] My stop is where the idea is wrong, not at the loss I can stomach.",
        "- [ ] This is my setup, not a reaction to the last trade.",
        "",
        "If anything is unmet and you take it anyway, write down which one and why.",
        "Then log it as off-plan. The record is the point.",
      ],
    },
    {
      id: "sizing",
      title: "Position sizing quick card",
      kind: "Cheat sheet",
      file: "sizing-card.md",
      blurb: "One formula, four markets, worked both ways — for when you are away from the calculator.",
      lesson: "r1",
      body: [
        "# Sizing quick card",
        "",
        "Size = (Balance x Risk%) / (Stop distance x value per unit of distance)",
        "Always round DOWN.",
        "",
        "## Forex",
        "Value per pip per standard lot is about $10 on USD-quoted pairs.",
        "Lots = risk money / (stop in pips x 10)",
        "Example: $50 risk, 25-pip stop -> 50 / 250 = 0.20 lots",
        "",
        "## Crypto",
        "Coins = risk money / (entry - stop)",
        "Example: $50 risk, entry 64,000, stop 63,200 -> 50 / 800 = 0.0625 BTC",
        "",
        "## Futures",
        "Contracts = risk money / (stop in points x point value)",
        "MES point value $5; ES $50; MNQ $2; NQ $20.",
        "Example: $50 risk, 10-point MES stop -> 50 / 50 = 1 contract",
        "",
        "## Indices (CFD)",
        "Units = risk money / (stop in points x per-point value per unit)",
        "Example: $50 risk, 20-point stop, $1 per point -> 2.5 -> trade 2",
        "",
        "## Recovery table (why one percent)",
        "-10% needs +11.1% · -20% needs +25% · -30% needs +42.9%",
        "-40% needs +66.7% · -50% needs +100% · -75% needs +300%",
      ],
    },
    {
      id: "setup",
      title: "Setup definition sheet",
      kind: "Template",
      file: "setup-definition.md",
      blurb: "Six fields. If someone else cannot reproduce your trigger list from this page, the setup cannot be measured yet.",
      lesson: "s1",
      body: [
        "# Setup definition",
        "",
        "Name:",
        "Market(s) and timeframe:",
        "Session(s):",
        "",
        "## 1. Context filter — what must already be true",
        "",
        "## 2. Trigger — the observable event that puts me in",
        "",
        "## 3. Invalidation — where the stop goes, stated as a rule",
        "",
        "## 4. Exit — target rule, partial rule, time stop",
        "",
        "## 5. Exclusions — when I do not take it",
        "",
        "## 6. Expected shape",
        "- Expected win rate:",
        "- Expected average win (R):",
        "- Expected average loss (R):",
        "- Therefore expectancy:",
        "- Samples logged so far:",
        "",
        "The two-person test: hand this page and fifty charts to someone else.",
        "If their trigger list does not match yours, tighten sections 1 and 2.",
      ],
    },
    {
      id: "journal-csv",
      title: "Journal import template",
      kind: "CSV",
      file: "journal-template.csv",
      blurb: "The columns the journal CSV import expects, with one example row. Fill it from a broker statement instead of retyping months.",
      lesson: "s3",
      body: [
        "date,symbol,market,side,setup,session,entry,stop,target,size,exitPrice,exitSize,fees,emotion,riskPct,plan,review,account",
        "2026-09-18T10:15,EURUSD,Forex,Long,Pullback,London,1.0845,1.0820,1.0895,0.20,1.0893,0.20,1.20,Calm,1,\"H4 uptrend, M15 reclaim of 1.0840\",\"Followed the plan, exited at target\",Demo account",
      ],
    },
    {
      id: "sessions",
      title: "Session cheat sheet (East Africa Time)",
      kind: "Cheat sheet",
      file: "sessions-eat.md",
      blurb: "The four sessions, their overlaps and their character, already converted to EAT — so the clock is not a conversion exercise mid-trade.",
      lesson: "m3",
      body: [
        "# Sessions in East Africa Time (UTC+3)",
        "",
        "| Session | Open | Close | Character |",
        "| --- | --- | --- | --- |",
        "| Sydney | 01:00 | 10:00 | Thin, ranges, wide crosses |",
        "| Tokyo | 03:00 | 12:00 | Range-bound, respects levels |",
        "| London | 10:00 | 19:00 | Largest forex volume, day range often set |",
        "| New York | 16:00 | 01:00 | Data-driven, trends extend |",
        "",
        "## The windows that matter",
        "- Tokyo-London overlap 10:00-12:00: the Asia range break.",
        "- London-New York overlap 16:00-19:00: peak liquidity and volatility.",
        "- US cash open 16:30: the first 30 minutes often set the day range.",
        "- After 22:00: liquidity drains. The worst window for breakout trades.",
        "",
        "Daylight saving shifts London and New York by an hour twice a year.",
        "Kampala does not change, so check the clock in the right rail (press T).",
      ],
    },
    {
      id: "events",
      title: "Event playbook: the big five releases",
      kind: "Playbook",
      file: "event-playbook.md",
      blurb: "What each high-impact release actually is, what it moves, and the three legitimate responses to it.",
      lesson: "m5",
      body: [
        "# Event playbook",
        "",
        "Three legitimate responses to any three-bar event:",
        "1. Flatten and stand aside.",
        "2. Halve size and widen the stop for the volatility.",
        "3. Wait 15-30 minutes and trade the reaction once spreads normalise.",
        "",
        "## Central bank rate decision (FOMC, ECB, BoE)",
        "Moves everything. The statement and press conference matter more than the rate.",
        "Expect two moves: one on the number, one reversing it on the tone.",
        "",
        "## CPI / inflation",
        "Currently the single largest scheduled mover for indices and the dollar.",
        "The reaction is to the surprise versus forecast, not to the level.",
        "",
        "## Employment (NFP, unemployment rate)",
        "First Friday, 15:30 EAT. The first candle range is often the day range.",
        "Revisions to prior months routinely reverse the initial move.",
        "",
        "## GDP",
        "A slower mover. It matters most when it changes the rate expectation.",
        "",
        "## Energy inventories",
        "Weekly, moves oil and energy-linked currencies such as CAD and NOK.",
        "",
        "Rule of thumb: if you cannot name what the market is positioned for,",
        "you are not trading the event — you are inside it.",
      ],
    },
    {
      id: "weekly",
      title: "Weekly review worksheet",
      kind: "Worksheet",
      file: "weekly-review.md",
      blurb: "Fifteen minutes, seven questions, no changes allowed. Reading without acting is what keeps the sample intact.",
      lesson: "s4",
      body: [
        "# Weekly review — week ending ______",
        "",
        "1. Trades taken: ____  Logged: ____  (if these differ, fix that first)",
        "2. Expectancy this week (R per trade): ____  Journal to date: ____",
        "3. Rules broken, and the priced cost of each:",
        "4. Trades taken off plan (checklist unmet): ____ of ____",
        "5. Best session and setup this week:",
        "6. Worst session and setup, with sample size:",
        "7. One sentence: what did I do well that had nothing to do with the result?",
        "",
        "No changes this week. Note candidates for the monthly review below.",
        "Candidate changes:",
      ],
    },
    {
      id: "monthly",
      title: "Monthly review and one-change worksheet",
      kind: "Worksheet",
      file: "monthly-review.md",
      blurb: "The review that is allowed to change something — exactly one thing, with the sample that justifies it written next to it.",
      lesson: "s4",
      body: [
        "# Monthly review — month ______",
        "",
        "## The numbers",
        "- Trades: ____  Expectancy: ____R  Profit factor: ____",
        "- Max drawdown: ____%  Days logged / days traded: ____ / ____",
        "- Discipline score: ____  Risk adherence: ____%",
        "",
        "## The leak panel",
        "- Most expensive rule broken, and its cost in R:",
        "- Most expensive pattern, its cost, and its sample size:",
        "- Best setup and best session:",
        "",
        "## The one change",
        "- Change:",
        "- Evidence (subset, sample size, expectancy versus the rest):",
        "- How I will know in 30 trades whether it worked:",
        "",
        "## Everything I am deliberately not changing this month",
        "",
        "Plan version bumped to ____ on ____.",
      ],
    },
    {
      id: "rmath",
      title: "Risk and expectancy reference",
      kind: "Reference",
      file: "risk-math.md",
      blurb: "Every formula this path uses on one page: R, expectancy, profit factor, streak probability and the recovery table.",
      lesson: "r4",
      body: [
        "# Risk and expectancy reference",
        "",
        "Risk money = balance x risk%",
        "Size = risk money / (stop distance x value per unit of distance)",
        "R = net profit or loss / risk money   (net = after fees and funding)",
        "Expectancy (R per trade) = (win% x avg win R) - (loss% x avg loss R)",
        "Profit factor = gross profit / gross loss",
        "Break-even win rate = 1 / (1 + reward-to-risk)",
        "  at 2R: 33.3% · at 3R: 25% · at 1R: 50% · at 0.5R: 66.7%",
        "Probability of N losses in a row = (1 - win rate)^N",
        "  at a 45% win rate: five in a row 5.0%, eight in a row 0.8% per sequence,",
        "  which is near-certain to occur somewhere in a few hundred trades.",
        "Recovery needed after a drawdown D = D / (1 - D)",
        "  -10% -> +11.1% · -25% -> +33.3% · -50% -> +100% · -75% -> +300%",
        "Kelly fraction (an upper bound, not a target) = W - (1 - W) / R",
        "  Use a small fraction of it. Full Kelly assumes your edge is known exactly.",
        "Sample size: thirty is a hint, a hundred an opinion, three hundred evidence.",
      ],
    },
  ];

  /* ---------------------------------------------------------- glossary
     Terms named by a lesson get a dotted underline and a tooltip in the
     reader, and the whole list is searchable at learn.html#glossary.
     Plain English, one sentence, no circular definitions. */

  const glossary = {
    ask: "The price at which you can buy right now. Buys open here.",
    bid: "The price at which you can sell right now. Buys are marked against it.",
    spread: "The gap between bid and ask — a cost paid at entry, not a fee line on a statement.",
    slippage: "The difference between the price you expected and the price you got, largest when the book is thin.",
    swap: "Overnight interest charged or paid on a leveraged forex position, from the rate differential.",
    notional: "The full face value of a position, as opposed to the margin held against it.",
    pip: "The fourth decimal in most currency pairs, the second in JPY pairs.",
    point: "One tenth of a pip on a five-decimal quote; also one whole index or futures unit, depending on the market.",
    tick: "The smallest price increment of a futures contract, with a money value fixed by the exchange.",
    lot: "A forex size unit: standard 100,000 units of base currency, mini 10,000, micro 1,000.",
    leverage: "The ratio that decides how little margin the broker needs to hold your position. It does not set your risk.",
    margin: "The cash the broker holds against an open position.",
    equity: "Balance plus open profit and loss — the number margin level is measured against.",
    "stop-out": "Automatic closure of positions when margin level falls below the broker's threshold.",
    volatility: "How much an instrument typically moves in a period. It sets stop distance; size then keeps risk constant.",
    ATR: "Average True Range — the average size of a period's move, used as a volatility-aware stop buffer.",
    bracket: "Entering with the stop and target attached in the same action.",
    liquidity: "Resting orders available to trade against. Thin liquidity is where slippage and wicks live.",
    "stop hunt": "Price reaching into the pocket of clustered stops beyond an obvious level, then reversing.",
    sweep: "A quick push through a prior high or low that takes the stops resting there and immediately reverses.",
    support: "A level below price where buyers have reacted more than once.",
    resistance: "A level above price where sellers have reacted more than once.",
    "higher high": "A swing high above the previous swing high — half the definition of an uptrend.",
    "swing low": "A local low with higher lows on both sides; the structural reference for a long's stop.",
    range: "Price repeating between two levels, where the edges are the trade and the middle is noise.",
    timeframe: "The candle period of a chart. Read structure one above the one you trade, time entries one below.",
    candle: "One period's open, high, low and close drawn as a body and two wicks.",
    wick: "The thin line above or below a candle body — prices that were reached and rejected.",
    RSI: "A momentum oscillator measuring extension. In strong trends it stays extended; it is not a reversal signal.",
    "moving average": "A smoothed average price, used as a trend filter rather than as a signal.",
    divergence: "Price making a new extreme while momentum does not — a warning about fuel, not a reversal trigger.",
    VWAP: "Volume-weighted average price for the session; a common intraday reference for value.",
    session: "One of the four trading windows — Sydney, Tokyo, London, New York — each with its own character.",
    overlap: "When two sessions are open together. The London-New York overlap carries peak liquidity.",
    CPI: "Consumer price index — the inflation release that currently moves indices and the dollar most.",
    NFP: "US non-farm payrolls, released the first Friday of the month at 15:30 EAT.",
    FOMC: "The US Federal Reserve's rate-setting committee; its statement and press conference move everything.",
    "impact rating": "The calendar's one-to-three-bar estimate of how much an event usually moves price.",
    "risk per trade": "Stop distance times size, expressed as a percentage of balance. One percent by default here.",
    "position size": "How much of an instrument you hold — always computed from the stop, never chosen first.",
    invalidation: "The price that proves the trade idea wrong. Where the stop belongs.",
    "R multiple": "A result expressed in units of the risk taken. +2R means twice what you were risking.",
    "net R": "R after fees, commissions and funding — the only version that is true.",
    expectancy: "Average R per trade. Positive means volume helps you; negative means volume hurts you faster.",
    "profit factor": "Gross profit divided by gross loss. Above 1.5 is robust; above 3 on a small sample is usually a fluke.",
    "win rate": "Share of trades that won. Useful for knowing what a normal streak feels like, useless as a target.",
    "sample size": "How many trades a claim rests on. Thirty is a hint, a hundred an opinion, three hundred evidence.",
    drawdown: "The fall from an equity peak, in percent — the number a plan actually has to survive.",
    "risk of ruin": "The probability that a losing streak ends the account. Small at 1% risk, near-certain at 10%.",
    "equity curve": "Account balance over time. Read with its drawdown band, never alone.",
    "daily loss stop": "A percentage of balance that ends the trading day when reached. Default 3% here.",
    "cool-off": "A mandatory pause after a set number of consecutive losses. Default three.",
    guardrail: "A daily limit checked before the next entry rather than reported after it.",
    correlation: "How closely two instruments move together. High correlation turns several small trades into one large one.",
    "open risk": "What is at stake right now if every open stop is hit, measured against the daily loss rail.",
    beta: "How much an instrument moves relative to its benchmark — most alts have a beta above 1 to BTC.",
    "theme risk": "Total risk taken on one underlying driver, however many instruments express it.",
    setup: "A repeatable trade idea defined tightly enough that two people would agree it triggered.",
    trigger: "The specific observable event that puts you in the trade.",
    "context filter": "The structural condition that must already be true before a trigger counts.",
    backtest: "Testing a defined setup against historical data. Impossible without an objective definition.",
    "trading plan": "Decisions made while calm and written down, so the losing version of you cannot make them.",
    escalation: "A written rule for raising risk on evidence — and its mirror, halving risk on drawdown.",
    "process rule": "A rule checkable from the record, like a timestamp, rather than an intention like patience.",
    journal: "The record of decisions — risk, emotion, plan and result — that every statistic here is derived from.",
    "emotion tag": "The state of mind recorded at entry; the field that surfaces revenge patterns.",
    "discipline score": "Risk adherence 40%, risk consistency 25%, journaling 25%, plan adherence 10%. Profit is excluded.",
    "off plan": "A trade saved with pre-trade checks unmet. Recorded permanently and measured as its own category.",
    leak: "A priced, repeatable way your own behaviour costs you money, found by comparing a subset against the rest.",
    "versus rest": "Measuring a subset of trades against the rest of the journal instead of against zero.",
    "partial exit": "Closing part of a position and leaving the remainder to run. Raises win rate, usually lowers expectancy.",
    pyramiding: "Adding to a winning position, only within one unit of total risk.",
    "averaging down": "Adding to a loser. Converts a defined loss into an undefined one. Never.",
    tilt: "Trading from emotion rather than the plan, most often after a loss.",
    FOMO: "Entering late into a fast move because it is moving, with no plan and a wide stop.",
  };

  /* Lookup helpers the Learn screen and the shell search both use. */
  function lesson(id) {
    return lessons.find((l) => l.id === id) || null;
  }
  function block(id) {
    return blocks.find((b) => b.id === id) || null;
  }
  function lessonsIn(blockId) {
    return lessons.filter((l) => l.block === blockId);
  }
  function question(id) {
    for (const key in quizzes) {
      const hit = quizzes[key].find((q) => q.id === id);
      if (hit) return hit;
    }
    return null;
  }
  const totalMinutes = lessons.reduce((a, l) => a + l.minutes, 0);

  return {
    blocks,
    lessons,
    quizzes,
    resources,
    glossary,
    lesson,
    block,
    lessonsIn,
    question,
    totalMinutes,
    PASS_MARK: 0.8,
    ATTEMPTS: 2,
    COOLDOWN_MIN: 30,
  };
})();
