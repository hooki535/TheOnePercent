/* The1% Academy — Liquidity Masterclass (full course) */
Academy.register("liquidity", {
  hours: 4,
  outcomes: [
    "Explain liquidity as resting orders, and why large players need it to fill.",
    "Find where stops cluster: equal highs and lows, swing points, session extremes.",
    "Tell a liquidity sweep from a genuine breakout using closes and follow-through.",
    "Trade the sweep-and-shift model, and place your own stops where they are harder to hunt.",
  ],
  lessons: [
    {
      id: "lq1",
      module: "What liquidity is",
      title: "Liquidity is resting orders",
      minutes: 8,
      summary: "Liquidity is not money in the market. It is orders waiting at a price. Price moves toward liquidity because that is where the other side of big trades is.",
      sections: [
        {
          h: "Two meanings of the word",
          p: [
            "In general finance, a liquid market is one where you can buy or sell a lot without moving the price much. EURUSD during the London and New York overlap is very liquid; an exotic pair at 3am is not.",
            "In chart reading, liquidity means pools of resting orders at specific prices: stop-losses, breakout entry orders and limit orders. These pools sit in predictable places, and price is repeatedly drawn to them.",
          ],
        },
        {
          h: "Why big players need your stops",
          p: [
            "To buy a large position, an institution needs a large number of sellers. A cluster of sell-stop orders below an obvious low is exactly that: when price reaches it, those stops trigger into market sell orders, and the large buyer can fill against them.",
          ],
          fig: {
            type: "flow",
            title: "How a stop cluster becomes fuel",
            tag: "Mechanism",
            perRow: 3,
            steps: [
              "Retail buys the obvious double bottom",
              "Their sell stops rest just below it",
              "A large buyer needs many sellers",
              "Price trades into the stops, which fire",
              "The large buyer fills against them",
              "Price reverses away from the low",
            ],
          },
          note: "This is not a conspiracy. It is how auctions work: price travels to where orders are, because that is where trades can happen.",
        },
      ],
      takeaways: [
        "Chart liquidity = clusters of resting orders at specific prices.",
        "Stops become market orders when triggered, supplying the other side for large traders.",
        "Price moves toward liquidity because that is where volume can be traded.",
      ],
      mistakes: [
        "Thinking liquidity means 'money flowing in'.",
        "Believing someone is targeting your account personally.",
        "Placing stops exactly where everyone else does.",
      ],
      psych: "Understanding why stops get hit turns frustration into information. A hit stop at an obvious level is data about where liquidity was, not proof the market is against you.",
      practice: "Open a 1H chart and mark every obvious place where you think retail stops are resting. Check over the next week how many get traded through.",
      apply: { label: "Review your stop placements", href: "journal.html", why: "Filter your journal for stopped-out trades and check how many stops sat exactly at an obvious high or low." },
    },
    {
      id: "lq2",
      module: "What liquidity is",
      title: "Where liquidity pools form",
      minutes: 9,
      summary: "Liquidity collects wherever many traders make the same decision. Learn the six places it sits and you will see them on every chart.",
      sections: [
        {
          h: "The six pools",
          ul: [
            "Equal highs and equal lows: double tops and bottoms stack stops in one tight place.",
            "Obvious swing highs and lows: the textbook stop placement.",
            "Trendlines: stops sit just beyond a well-respected trendline.",
            "Session highs and lows: Asian range, previous day, previous week.",
            "Round numbers: 1.1000, 2,000 on gold, 60,000 on bitcoin.",
            "Range extremes: stops of range traders sit just outside the range.",
          ],
          fig: {
            title: "Equal highs and equal lows: stacked liquidity",
            tag: "Diagram",
            n: 42, seed: 6, vol: 0.6,
            path: [[0, 100], [6, 108], [10, 104], [16, 108.05], [21, 103.6], [26, 105.5], [31, 103.65], [36, 106], [41, 104.5]],
            overlays: [
              { hline: 108.4, kind: "down", label: "Buy-side pool", from: 6 },
              { hline: 103.3, kind: "up", label: "Sell-side pool", from: 21 },
              { label: "Equal highs", at: [11, 109], kind: "down" },
              { label: "Equal lows", at: [26, 102.6], pos: "below", kind: "up" },
            ],
            caption: "Two touches at the same price look like strong resistance and support. To an experienced trader they look like stacked stops.",
          },
        },
        {
          h: "Why equal highs are a magnet",
          p: [
            "Every trader who shorts the double top puts a stop just above it. Every breakout trader places a buy-stop just above it. Both are buy orders at the same price. That concentration is why equal highs so often get taken out before price turns.",
          ],
          note: "The cleaner and more obvious the level, the more liquidity rests behind it.",
        },
        {
          h: "On a real chart: equal highs swept",
          p: [
            "Gold in July and August 2021. Two highs at almost the same price, 1,835 and 1,833, built an obvious ceiling with buy stops above it. On 4 August price poked just above, filled those orders and closed back below. Within three sessions gold had fallen more than 150 dollars."
          ],
          fig: {
            type: "shot",
            src: "liq-eqh-gold",
            title: "Equal highs, a sweep, then the real move",
            caption: "Equal highs look like resistance to most traders. To a large seller, they look like fuel.",
            meta: "XAUUSD · 1D · Jul to Aug 2021",
            alt: "Gold daily chart with equal highs swept on 4 August 2021 followed by a sharp fall"
          }
        },
      ],
      takeaways: [
        "Liquidity sits where many traders make the same decision.",
        "Equal highs and lows are the densest pools.",
        "Obvious levels attract price because of the orders behind them.",
      ],
      mistakes: [
        "Treating equal highs as strong resistance to short against.",
        "Ignoring previous-day and session highs and lows.",
        "Missing round numbers on gold, indices and crypto.",
      ],
      psych: "The level that feels safest is often the most crowded. Learning to be suspicious of 'perfect' levels is a mindset shift, not just a technique.",
      practice: "Each morning, mark the previous day high and low, the Asian range and any equal highs or lows. Note which ones get taken during London and New York.",
      apply: { label: "Mark pools on the chart", href: "charts.html", why: "Draw horizontal lines at each pool and label them BSL or SSL." },
    },
    {
      id: "lq3",
      module: "Reading the draw",
      title: "Buy-side, sell-side and the draw on liquidity",
      minutes: 9,
      summary: "Liquidity above price is buy-side. Liquidity below is sell-side. The one price is most likely to reach next is the draw on liquidity, and it gives you a target.",
      sections: [
        {
          h: "Definitions",
          ul: [
            "Buy-side liquidity (BSL): buy orders resting above highs. Short sellers' stops and breakout buy-stops.",
            "Sell-side liquidity (SSL): sell orders resting below lows. Long traders' stops and breakdown sell-stops.",
            "Draw on liquidity: the pool price is most likely to target next.",
          ],
          fig: {
            title: "Which pool is price drawn to?",
            tag: "Diagram",
            n: 43, seed: 15, vol: 0.6,
            path: [[0, 104], [5, 112], [11, 106], [16, 100], [22, 105], [27, 108], [32, 104.5], [37, 107.5], [42, 106.5]],
            overlays: [
              { hline: 112.5, from: 5, kind: "down", label: "BSL" },
              { hline: 99.6, from: 16, kind: "up", label: "SSL" },
              { arrow: [[42, 107.3], [42, 111.6]], kind: "brand" },
              { label: "Higher lows point to BSL", at: [30, 110], kind: "brand" },
            ],
            caption: "Price is making higher lows under an untouched high. The draw is buy-side liquidity at 112.5.",
          },
        },
        {
          h: "How to choose the draw",
          ul: [
            "Follow the higher-timeframe trend: in an uptrend, BSL above is the natural draw.",
            "Untouched pools pull harder than pools already taken.",
            "Closer pools are usually reached first, then the next one.",
            "After one pool is swept, the opposite pool often becomes the next draw.",
          ],
          note: "The draw gives you a target before you have an entry. Plan the destination first, then look for a way to get on board.",
        },
      ],
      takeaways: [
        "BSL above highs, SSL below lows.",
        "The draw on liquidity is the next pool price is likely to reach.",
        "Use the draw as your target, and the trend to choose it.",
      ],
      mistakes: [
        "Mixing up BSL and SSL: buy-side is above, sell-side is below.",
        "Picking a draw against the higher-timeframe trend without a reason.",
        "Targeting a pool that has already been swept.",
      ],
      psych: "Having a destination in mind makes you calmer during the trade. Pullbacks stop feeling like threats when you know where price is going and why.",
      practice: "For five instruments, mark the nearest BSL and SSL and write down which you think is the draw. Check in two days.",
      apply: { label: "Use the draw as your target", href: "calculators.html", why: "Put the pool price in as your target and check the R multiple before you plan an entry." },
    },
    {
      id: "lq4",
      module: "Reading the draw",
      title: "The sweep versus the breakout",
      minutes: 10,
      summary: "When price trades through a pool, one of two things happens: it rejects (a sweep) or it holds (a breakout). The candle close tells you which.",
      sections: [
        {
          h: "The liquidity sweep",
          p: [
            "A sweep is a quick move through a pool that fails to hold. The wick goes beyond the level, the stops fire, and the candle closes back inside. The orders that needed filling have been filled, and price reverses.",
          ],
          fig: {
            title: "Sweep: wick above the equal highs, close back below",
            tag: "Diagram",
            n: 42, seed: 22, vol: 0.55,
            path: [[0, 100], [6, 106], [11, 102], [17, 106], [22, 103], [28, 105.8]],
            set: [[29, 105.8, 107.3, 105.0, 105.1]],
            overlays: [
              { hline: 106.3, from: 6, to: 35, kind: "down", label: "Equal highs" },
              { ring: [29, 107.3], kind: "warn" },
              { label: "Close back inside = sweep", at: [29, 107.3], pos: "right", kind: "warn" },
            ],
            caption: "The wick takes the buy-side liquidity, the close rejects the level, and price falls away from it.",
          },
        },
        {
          h: "The genuine breakout",
          fig: {
            title: "Breakout: closes above, holds and retests",
            tag: "Diagram",
            n: 41, seed: 23, vol: 0.55,
            path: [[0, 100], [6, 106], [11, 102], [17, 106], [22, 103.5], [28, 105.8], [30, 107.8], [33, 106.7], [40, 111.5]],
            overlays: [
              { hline: 106.3, from: 6, kind: "muted", label: "Old highs" },
              { label: "Retest holds", at: [33, 106.1], pos: "below", kind: "up" },
            ],
            caption: "Bodies close above the level, price comes back to test it from above, and buyers defend it.",
          },
        },
        {
          h: "Checklist: sweep or breakout?",
          ul: [
            "Close: a sweep closes back inside; a breakout closes beyond and stays there.",
            "Speed: sweeps are fast and sharp; breakouts often build before they go.",
            "Follow-through: after a sweep price moves strongly the other way; after a breakout it retests and continues.",
            "Context: a sweep at a higher-timeframe zone against the trend is the classic reversal.",
          ],
        },
        {
          h: "On a real chart: a sell-side sweep and reclaim",
          p: [
            "Bitcoin in January 2025. Lows near 91,300 on 30 December and 9 January stacked sell stops. On 13 January price broke under to 89,260, triggered them, then closed back above the lows. A week later it was at 109,000. A real breakdown would have closed below and stayed there."
          ],
          fig: {
            type: "shot",
            src: "liq-eql-btc",
            title: "Sweep below equal lows, then a rally",
            caption: "The close is the tell: below and back inside is a sweep, below and holding is a breakout.",
            meta: "BTCUSD · 1D · Jan 2025",
            alt: "Bitcoin daily chart with equal lows swept on 13 January 2025"
          }
        },
      ],
      takeaways: [
        "Sweep = through the level and closed back inside. Breakout = closed beyond and held.",
        "Wait for the candle close before deciding.",
        "Sweeps at higher-timeframe zones are the strongest reversal signals.",
      ],
      mistakes: [
        "Buying the first wick above a level and being the liquidity yourself.",
        "Calling a sweep before the candle has closed.",
        "Fading every breakout because 'it is probably a sweep'.",
      ],
      psych: "Breakouts trigger FOMO and sweeps trigger panic. Both are resolved the same way: wait for the close. The close is information; the wick is emotion.",
      practice: "Collect ten sweeps and ten breakouts from the same instrument. Compare candle closes and what happened in the next five candles.",
      apply: { label: "Replay sweeps bar by bar", href: "charts.html", why: "Use bar replay to practise calling sweep or breakout at the candle close, without seeing what comes next." },
    },
    {
      id: "lq5",
      module: "Trading liquidity",
      title: "The sweep-and-shift entry model",
      minutes: 11,
      summary: "The most reliable liquidity trade: a pool is swept, structure shifts the other way, and you enter the pullback with a stop beyond the sweep.",
      sections: [
        {
          h: "The model",
          ul: [
            "1. Price sweeps a clear pool (for example equal lows) into a higher-timeframe level.",
            "2. Structure shifts: price closes above the last lower high. That is a CHoCH.",
            "3. Enter on the pullback after the shift, into the zone or imbalance that caused it.",
            "4. Stop beyond the sweep wick. Target the opposite pool.",
          ],
          fig: {
            title: "Sell-side sweep, change of character, pullback entry",
            tag: "Worked example",
            n: 42, seed: 31, vol: 0.55,
            path: [[0, 110], [6, 104], [10, 107], [16, 103.9], [20, 106.4], [25, 104.3], [26, 103.6], [30, 107], [34, 105.3], [41, 110.5]],
            wicks: [[26, 102.8]],
            overlays: [
              { hline: 103.85, from: 6, to: 30, kind: "up", label: "SSL (equal lows)" },
              { ring: [26, 102.8], kind: "warn" },
              { seg: [[20, 106.4], [29, 106.4]], kind: "up", label: "CHoCH" },
              { hline: 105.3, from: 32, to: 41, kind: "brand", label: "Entry 105.3", dash: false },
              { hline: 102.5, from: 32, to: 41, kind: "down", label: "Stop 102.5" },
              { hline: 110, from: 0, to: 41, kind: "up", label: "Target 110 (BSL)" },
            ],
            caption: "Risk 2.8, reward 4.7: about 1.7R to the first pool, with the option to hold for the next.",
          },
        },
        {
          h: "Filters that raise the win rate",
          ul: [
            "The sweep happens at a higher-timeframe demand or supply zone.",
            "The sweep happens during an active session (London or New York), not in the dead hours.",
            "The shift is made by strong candles, not a slow drift.",
            "There is clear liquidity on the other side to target.",
          ],
          note: "If the stop beyond the sweep wick makes the trade less than 1.5R to the target, skip it or refine the entry on a lower timeframe.",
        },
      ],
      takeaways: [
        "Sweep → CHoCH → pullback → entry.",
        "Stop beyond the sweep wick, target the opposite pool.",
        "Location and session filter out most low-quality sweeps.",
      ],
      mistakes: [
        "Entering on the sweep candle itself before structure shifts.",
        "Putting the stop inside the sweep wick, where it is the next liquidity.",
        "Taking the model in the middle of a range with no higher-timeframe level.",
      ],
      psych: "The sweep feels like the trend is about to break down further. The model asks you to wait for proof before acting, which trains patience under pressure.",
      practice: "Backtest the model on 30 examples on one instrument during London and New York. Record win rate and average R.",
      apply: { label: "Record your backtest in the simulator", href: "calculators.html#sim", why: "Enter your win rate and average win and loss to see the expectancy of the model for your market." },
    },
    {
      id: "lq6",
      module: "Trading liquidity",
      title: "Session liquidity and protecting your own stops",
      minutes: 9,
      summary: "The trading day has a rhythm: the Asian session builds a range, London often sweeps one side of it, New York continues or reverses. Know the clock in East Africa Time.",
      sections: [
        {
          h: "The daily liquidity rhythm",
          fig: {
            title: "Asian range, London sweep, New York continuation",
            tag: "Diagram",
            n: 48, seed: 40, vol: 0.5,
            path: [[0, 101], [3, 101.9], [6, 100.5], [9, 101.8], [12, 100.4], [15, 101.2], [17, 99.6], [20, 101], [26, 103.5], [30, 102.8], [36, 105], [47, 104.2]],
            wicks: [[17, 99.1]],
            overlays: [
              { zone: [0, 15, 100.2, 102.05], kind: "brand", label: "Asian range" },
              { ring: [17, 99.1], kind: "warn" },
              { label: "London sweeps the Asian low", at: [17, 99.1], pos: "right", kind: "warn" },
              { label: "New York continues", at: [36, 105.3], kind: "up" },
            ],
            caption: "One common pattern, not a rule. The Asian range stores liquidity on both sides for London to take.",
          },
        },
        {
          h: "The clock in East Africa Time (EAT, UTC+3)",
          ul: [
            "Asian session: roughly 03:00 to 12:00 EAT. Often a range.",
            "London open: about 10:00 to 11:00 EAT, depending on daylight saving. The most common time for a sweep of the Asian range.",
            "New York: forex activity picks up from about 15:00 EAT, and the US stock market opens at 16:30 EAT (17:30 in the northern winter). The London–New York overlap is the most liquid window of the day.",
          ],
          note: "Check the session cheat sheet in the resource library for exact times, since the UK and US change their clocks and East Africa does not.",
        },
        {
          h: "Protecting your own stops",
          ul: [
            "Do not place stops exactly at equal highs or lows. Place them beyond the structure that would actually invalidate the idea.",
            "Add a buffer of the spread plus a little volatility (for example a fraction of the ATR).",
            "If the correct stop makes the position too small, reduce size. Never tighten the stop into the obvious pool.",
          ],
        },
        {
          h: "On a real chart: one day of sessions",
          p: [
            "EURUSD on 19 August 2026, times in UTC. Asia built a tight range. London broke above it and through the daily R1 and R2 pivots, and New York extended the move by another 70 pips. The Asian range high became the level that defined the day."
          ],
          fig: {
            type: "shot",
            src: "dt-sessions-eurusd",
            title: "Asian range, London break, New York expansion",
            caption: "Pivots shown are the standard floor pivots calculated from the previous day.",
            meta: "EURUSD · 1H · 19 Aug 2026",
            alt: "EURUSD hourly chart with Asia, London and New York sessions shaded and daily pivots"
          }
        },
      ],
      takeaways: [
        "Asia builds the range, London often sweeps it, New York continues or reverses.",
        "Know the session times in East Africa Time, including daylight saving shifts.",
        "Place stops beyond real invalidation, never on the obvious pool.",
      ],
      mistakes: [
        "Trading the Asian range breakout in the first minutes of London without waiting for the close.",
        "Using the same session times all year and ignoring clock changes.",
        "Tightening stops into obvious liquidity to get a bigger size.",
      ],
      psych: "Knowing the daily rhythm reduces the need to be in front of the screen all day. Trade the windows that matter, then step away.",
      practice: "For two weeks, mark the Asian range each day and record which side London takes first, and what New York does next.",
      apply: { label: "Open the session cheat sheet", href: "learn.html#library", why: "Download the East Africa Time session sheet from the resource library and pin it next to your screen." },
    },
  ],
  quiz: [
    { q: "On a chart, 'liquidity' most precisely means…", options: ["The total money in the market", "Clusters of resting orders at specific prices", "The spread", "Trading volume on a single candle"], a: 1, why: "In chart reading, liquidity means pools of resting orders such as stops and limit orders.", lesson: "lq1" },
    { q: "Why do large players need stop clusters?", options: ["To punish retail traders", "Triggered stops supply the opposite orders they need to fill large size", "Because brokers require it", "They do not"], a: 1, why: "A triggered sell stop becomes a market sell, which a large buyer can fill against.", lesson: "lq1" },
    { q: "Which is the densest liquidity pool?", options: ["The middle of a candle", "Equal highs or equal lows", "A moving average", "A random price"], a: 1, why: "Equal highs and lows stack many traders' stops at one price.", lesson: "lq2" },
    { q: "Buy-side liquidity (BSL) rests…", options: ["Below lows", "Above highs", "At the open", "Inside candle bodies"], a: 1, why: "Buy orders (short stops and breakout buy-stops) sit above highs.", lesson: "lq3" },
    { q: "The draw on liquidity is…", options: ["The pool price is most likely to target next", "The last candle's close", "A type of indicator", "The spread at the open"], a: 0, why: "It is the next pool price is likely to reach, and it gives you a target.", lesson: "lq3" },
    { q: "A candle wicks above equal highs and closes back below them. This is most likely…", options: ["A breakout", "A liquidity sweep", "A gap", "Nothing"], a: 1, why: "Through the level and closed back inside = sweep.", lesson: "lq4" },
    { q: "When should you decide whether a move through a level is a sweep or a breakout?", options: ["On the first tick through the level", "At the candle close", "Before the level is reached", "After the next day"], a: 1, why: "The close shows whether price accepted or rejected the level.", lesson: "lq4" },
    { q: "In the sweep-and-shift model, where does the stop go?", options: ["At the equal lows", "Beyond the sweep wick", "At break-even", "At a round number"], a: 1, why: "Beyond the sweep wick is where the idea is invalidated.", lesson: "lq5" },
    { q: "Which filter most improves the sweep-and-shift model?", options: ["Trading it in the dead hours", "A sweep at a higher-timeframe zone during an active session", "Using a larger size", "Skipping the CHoCH"], a: 1, why: "Location and session filter out most low-quality sweeps.", lesson: "lq5" },
    { q: "The correct stop makes your position too small. What should you do?", options: ["Move the stop to the obvious low", "Reduce size or skip the trade", "Remove the stop", "Double the risk"], a: 1, why: "Never tighten the stop into obvious liquidity; reduce size instead.", lesson: "lq6" },
  ],
});
