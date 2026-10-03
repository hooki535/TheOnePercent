/* The1% Academy — Market Structure Masterclass (full course) */
Academy.register("market-structure", {
  hours: 3,
  outcomes: [
    "Mark swing highs and lows the same way every time, on any market and timeframe.",
    "Tell a trend from a range in under a minute, and know which one you are trading.",
    "Recognise a break of structure (BOS) and a change of character (CHoCH) as they happen.",
    "Take a structured pullback entry with a stop and target defined by the chart itself.",
  ],
  lessons: [
    {
      id: "ms1",
      module: "Reading swings",
      title: "Swing highs and swing lows",
      minutes: 8,
      summary: "Every structure tool in this academy is built from one thing: the turning points of price. Mark them consistently and the rest follows.",
      sections: [
        {
          h: "What a swing point is",
          p: [
            "A swing high is a peak with lower highs on both sides of it. A swing low is a trough with higher lows on both sides. That is all. They are the places where one side of the market stopped winning and the other side took over for a while.",
            "At The1% we use a simple, repeatable rule so two traders marking the same chart get the same answer: a swing point needs at least two candles on each side that do not exceed it. Fewer than that and you are marking noise.",
          ],
          fig: {
            title: "Swing highs (SH) and swing lows (SL) in an uptrend",
            tag: "Diagram",
            n: 40, seed: 11, vol: 0.8,
            path: [[0, 100], [6, 106], [10, 103], [17, 111], [21, 107.5], [28, 116], [32, 112], [39, 121]],
            overlays: [
              { poly: [[0, 100], [6, 106], [10, 103], [17, 111], [21, 107.5], [28, 116], [32, 112], [39, 121]], kind: "brand", dash: true },
              { label: "SH", at: [6, 106.6], kind: "down" },
              { label: "SH", at: [17, 111.6], kind: "down" },
              { label: "SH", at: [28, 116.6], kind: "down" },
              { label: "SL", at: [10, 102.4], pos: "below", kind: "up" },
              { label: "SL", at: [21, 106.9], pos: "below", kind: "up" },
              { label: "SL", at: [32, 111.4], pos: "below", kind: "up" },
            ],
            caption: "The dashed line joins the swing points. Everything in between is detail; the swings are the story.",
          },
        },
        {
          h: "Wicks or bodies?",
          p: [
            "Mark swings at the wick extremes. The wick is where price actually traded, and it is where stops were sitting. Bodies tell you where the candle closed, which matters for confirmation, but the map is drawn with wicks.",
          ],
          note: "Pick one timeframe to define your structure and mark it before you look anywhere else. Structure that changes every time you switch timeframe is not structure, it is mood.",
        },
        {
          h: "Major and minor swings",
          ul: [
            "Major swings are the obvious turning points you would see from across the room. They define the trend.",
            "Minor swings are the small wiggles inside a leg. They matter for entries on a lower timeframe, not for bias.",
            "When in doubt, zoom out one timeframe: a major swing there is the one to respect here.",
          ],
        },
      ],
      takeaways: [
        "Swing high: a peak with at least two lower highs on each side. Swing low: the mirror image.",
        "Mark swings with wicks, confirm breaks with closes.",
        "Define structure on one timeframe first, then use lower timeframes only for timing.",
      ],
      mistakes: [
        "Marking every small wiggle as a swing, so the chart looks like a trend and a range at the same time.",
        "Changing the swing points after the fact to fit the trade you already want.",
        "Mixing timeframes: a 5-minute swing low is not support for a daily trade.",
      ],
      psych: "Marking swings before you have a position is the first discipline habit. Once you are in a trade, your brain starts seeing the swings that agree with you.",
      practice: "Open any daily chart. Mark the last six swing highs and six swing lows using the two-candle rule. Then ask a friend or The1% community to mark the same chart and compare.",
      apply: { label: "Mark swings on your The1% chart", href: "charts.html", why: "Use the drawing tools to mark SH and SL on a live instrument, then save the screenshot to your journal." },
    },
    {
      id: "ms2",
      module: "Reading swings",
      title: "Trends and ranges",
      minutes: 8,
      summary: "Markets do only three things: go up, go down, or go sideways. Knowing which one you are in decides which setups are allowed.",
      sections: [
        {
          h: "The definitions",
          ul: [
            "Uptrend: higher highs (HH) and higher lows (HL). Buyers keep winning each exchange.",
            "Downtrend: lower highs (LH) and lower lows (LL). Sellers keep winning.",
            "Range: highs and lows repeat at roughly the same prices. Neither side can push through.",
          ],
          p: [
            "Markets spend a large part of their time ranging. Traders who only know how to trade trends lose money in ranges, and traders who only fade extremes get run over in trends. Your first job on any chart is to name the environment.",
          ],
        },
        {
          h: "What a range looks like",
          fig: {
            title: "A range: repeated highs and lows, no progress",
            tag: "Diagram",
            n: 40, seed: 5, vol: 0.7,
            path: [[0, 100.4], [5, 106], [11, 100.5], [17, 105.8], [23, 100.2], [29, 106.1], [35, 100.4], [39, 103]],
            overlays: [
              { hline: 106.4, kind: "down", label: "Range high" },
              { hline: 100, kind: "up", label: "Range low" },
              { label: "Middle of range = no trade zone", at: [20, 103.2], kind: "muted" },
            ],
            caption: "Buy near the bottom, sell near the top, and do nothing in the middle. A range trader's edge is location.",
          },
        },
        {
          h: "Transitions",
          p: [
            "Trends end in one of two ways: they roll into a range, or they reverse. Both begin with the same warning sign: the trend fails to make a new extreme. An uptrend that prints a lower high has not reversed yet, but it has stopped proving itself.",
          ],
          note: "When the environment is unclear, the correct position size is zero. Waiting is a position.",
        },
      ],
      takeaways: [
        "HH + HL = uptrend. LH + LL = downtrend. Repeating highs and lows = range.",
        "In a trend, trade pullbacks in the trend direction. In a range, trade the edges.",
        "A failure to make a new extreme is the first sign a trend is tiring.",
      ],
      mistakes: [
        "Using trend-following entries inside a range and getting stopped at both edges.",
        "Calling a trend over because of one big candle against it.",
        "Trading the middle of a range, where the reward is smallest and the noise is largest.",
      ],
      psych: "Most traders want to be in a trade. Labelling the environment first gives you a reason to wait, which is often the most profitable decision on the chart.",
      practice: "Take five instruments you trade. For each one write down: trend up, trend down, or range, on the daily and the 4H. Revisit tomorrow and see which ones changed.",
      apply: { label: "Label the environment in your journal", href: "journal.html", why: "Tag each trade with the environment you believed you were in. After twenty trades, the dashboard will show which environment pays you." },
    },
    {
      id: "ms3",
      module: "Breaks and shifts",
      title: "Break of structure (BOS)",
      minutes: 9,
      summary: "A break of structure is the trend proving itself again. It is also the event that tells you where the next pullback entry will come from.",
      sections: [
        {
          h: "Definition",
          p: [
            "In an uptrend, a break of structure (BOS) happens when price closes above the most recent swing high. In a downtrend, it is a close below the most recent swing low. It confirms the trend is still in control.",
            "We require a candle close beyond the level, not just a wick. Wicks through a level are often liquidity sweeps, which you will study in the Liquidity Masterclass. Closes show acceptance.",
          ],
          fig: {
            title: "Bullish breaks of structure",
            tag: "Diagram",
            n: 40, seed: 21, vol: 0.8,
            path: [[0, 100], [6, 106], [10, 102.5], [15, 109], [19, 105.5], [25, 113], [29, 109.5], [35, 117], [39, 115]],
            overlays: [
              { seg: [[6, 106], [13, 106]], kind: "up", label: "BOS" },
              { seg: [[15, 109], [22, 109]], kind: "up", label: "BOS" },
              { seg: [[25, 113], [32, 113]], kind: "up", label: "BOS" },
              { label: "HL", at: [10, 101.9], pos: "below", kind: "up" },
              { label: "HL", at: [19, 104.9], pos: "below", kind: "up" },
              { label: "HL", at: [29, 108.9], pos: "below", kind: "up" },
            ],
            caption: "Each BOS closes above the previous swing high. Each creates a new higher low to trade from.",
          },
        },
        {
          h: "Why BOS matters for entries",
          ul: [
            "The BOS tells you the trend direction is still valid.",
            "The swing low that created the BOS becomes your protected low: the level that must hold for the trend to stay intact.",
            "Your stop belongs beyond the protected low, never in the middle of the leg.",
          ],
        },
        {
          h: "Strong and weak breaks",
          p: [
            "A strong break has large candle bodies, closes far beyond the level and leaves little overlap behind it. A weak break barely closes through and stalls. Strong breaks tend to lead to cleaner pullbacks; weak breaks often get reclaimed.",
          ],
          note: "Count the candles: a break made by one or two decisive candles says more than a break made by ten grinding ones.",
        },
      ],
      takeaways: [
        "BOS = a close beyond the last swing point in the trend direction.",
        "Every BOS creates a protected swing on the other side. That is where stops go.",
        "Judge the quality of the break: body size, distance and speed.",
      ],
      mistakes: [
        "Treating a wick through the level as a BOS.",
        "Buying the breakout candle itself instead of waiting for the pullback it creates.",
        "Forgetting to move the protected low after each new BOS.",
      ],
      psych: "Breakouts trigger FOMO. The BOS is information, not an order. Write down where the pullback entry would be, then wait for price to come to you.",
      practice: "On a 4H chart, mark three consecutive BOS events and the protected low each one created. Note how far price pulled back after each break.",
      apply: { label: "Size a trade from the protected low", href: "calculators.html", why: "Put your entry and a stop just beyond the protected low into the position size calculator and see what size 1% allows." },
    },
    {
      id: "ms4",
      module: "Breaks and shifts",
      title: "Change of character (CHoCH)",
      minutes: 9,
      summary: "A change of character is the first break against the trend. It does not guarantee a reversal, but it ends the trend's right to your trust.",
      sections: [
        {
          h: "Definition",
          p: [
            "In an uptrend, a change of character (CHoCH) happens when price closes below the most recent higher low: the protected low. In a downtrend, it is a close above the most recent lower high.",
            "A BOS continues the story. A CHoCH says the story may be changing. The next swing then tells you whether a new trend has begun: a lower high followed by a new lower low confirms it.",
          ],
          fig: {
            title: "From uptrend to downtrend: CHoCH, then BOS",
            tag: "Diagram",
            n: 43, seed: 33, vol: 0.8,
            path: [[0, 100], [6, 107], [10, 103.5], [16, 111], [20, 106.5], [25, 113], [31, 104], [35, 108.5], [42, 99]],
            overlays: [
              { label: "HH", at: [25, 113.6], kind: "up" },
              { label: "HL", at: [20, 105.9], pos: "below", kind: "up" },
              { seg: [[20, 106.5], [29, 106.5]], kind: "down", label: "CHoCH" },
              { label: "LH", at: [35, 109.1], kind: "down" },
              { seg: [[31, 104], [38, 104]], kind: "down", label: "BOS" },
            ],
            caption: "The CHoCH breaks the protected higher low. The lower high and the next BOS lower confirm the new downtrend.",
          },
        },
        {
          h: "What to do when you see one",
          ul: [
            "If you hold a position with the old trend: tighten management, take partials, or exit. The reason for the trade has weakened.",
            "Do not flip to the other side immediately. Wait for the lower high (or higher low) to form.",
            "Look left: a CHoCH that happens at a higher-timeframe supply or demand zone is far more meaningful than one in the middle of nowhere.",
          ],
        },
        {
          h: "False CHoCH",
          p: [
            "Sometimes price breaks the protected low, sweeps the stops below it, and then resumes the original trend. That is why confirmation from the next swing matters, and why the location of the CHoCH matters more than the CHoCH itself.",
          ],
        },
      ],
      takeaways: [
        "CHoCH = the first close against the trend through the protected swing.",
        "A CHoCH is a warning; the next lower high or higher low is the confirmation.",
        "Location is everything: a CHoCH at a higher-timeframe zone carries weight.",
      ],
      mistakes: [
        "Reversing your position on the first CHoCH without waiting for the new swing.",
        "Ignoring a CHoCH because you are emotionally attached to your trade.",
        "Calling every pullback a CHoCH because the protected low was marked on the wrong timeframe.",
      ],
      psych: "The hardest CHoCH to accept is the one against a trade you are in. Decide before entry what CHoCH would make you exit, and write it in the journal.",
      practice: "Find three trend reversals on the daily chart of any market. For each one mark the CHoCH, the confirming swing and the first BOS in the new direction.",
      apply: { label: "Replay a reversal bar by bar", href: "charts.html", why: "Use bar replay on the charts page to step through a reversal and mark the CHoCH the moment it prints, without seeing the future." },
    },
    {
      id: "ms5",
      module: "Structure across timeframes",
      title: "Internal and external structure",
      minutes: 10,
      summary: "A downtrend on the 15-minute chart can be nothing more than a pullback inside a daily uptrend. Knowing which structure you are looking at prevents most bad trades.",
      sections: [
        {
          h: "Two layers of the same chart",
          p: [
            "External structure is the major swing high and swing low of the current leg. Internal structure is the smaller series of swings inside it. A pullback in an uptrend is internally bearish while externally still bullish.",
          ],
          fig: {
            title: "Internal down-structure inside an external uptrend",
            tag: "Diagram",
            n: 45, seed: 8, vol: 0.7,
            path: [[0, 108], [8, 120], [14, 114], [18, 116.5], [22, 111], [26, 113.5], [31, 106], [37, 113], [44, 124]],
            overlays: [
              { hline: 120.3, kind: "down", label: "External high" },
              { hline: 105.6, kind: "up", label: "External low" , from: 31},
              { poly: [[8, 120], [14, 114], [18, 116.5], [22, 111], [26, 113.5], [31, 106]], kind: "brand", dash: true },
              { label: "Internal lower highs", at: [22, 118.5], kind: "brand" },
              { label: "Pullback ends, trend resumes", at: [37, 112.4], pos: "below", kind: "up" },
            ],
            caption: "The internal swings form lower highs and lower lows, but the external trend is intact until the external low breaks.",
          },
        },
        {
          h: "A three-timeframe routine",
          ul: [
            "Higher timeframe (daily or 4H): external structure and bias. Which way is the trend and where is the protected swing?",
            "Middle timeframe (1H): the current leg. Is price pulling back or pushing?",
            "Lower timeframe (15m or 5m): internal structure for timing. Wait for the internal CHoCH back in the direction of the higher-timeframe trend.",
          ],
          note: "A useful ratio between timeframes is about 4 to 6: daily to 4H, 4H to 1H, 1H to 15m.",
        },
        {
          h: "The internal CHoCH entry",
          p: [
            "The cleanest structure entry combines both layers: the higher timeframe is bullish, price pulls back (internal bearish), and then the lower timeframe prints a CHoCH back to the upside. That internal CHoCH is the signal that the pullback is ending.",
          ],
        },
      ],
      takeaways: [
        "External structure = the major swings. Internal structure = the swings inside the current leg.",
        "A pullback is internal counter-trend structure; it does not end the external trend.",
        "Use the higher timeframe for bias and the lower timeframe for the entry trigger.",
      ],
      mistakes: [
        "Shorting a lower-timeframe downtrend straight into a higher-timeframe uptrend.",
        "Using too many timeframes and never agreeing with yourself.",
        "Taking the lower-timeframe entry before price reaches a higher-timeframe level.",
      ],
      psych: "Timeframe hopping is a form of looking for permission. Fix your three timeframes in your trading plan and stop there.",
      practice: "Choose one instrument. Write the external trend on the daily, the current leg on the 1H, and the internal structure on the 15m. Repeat for five days.",
      apply: { label: "Write your timeframe stack into your plan", href: "learn.html#library", why: "Download the trading plan template and fill in the three timeframes you will use, and what each one is for." },
    },
    {
      id: "ms6",
      module: "Structure across timeframes",
      title: "Trading with structure: the pullback entry",
      minutes: 10,
      summary: "Put it all together into one repeatable trade: trend confirmed by BOS, pullback to the broken level, entry, stop beyond the protected swing, target at the next structure point.",
      sections: [
        {
          h: "The setup, step by step",
          ul: [
            "1. The higher timeframe shows an uptrend with a recent BOS.",
            "2. Price pulls back toward the broken swing high (now support) or the higher low.",
            "3. The lower timeframe shows the pullback ending: an internal CHoCH or a rejection candle.",
            "4. Enter. Stop beyond the pullback low or the protected low. Target the recent high first, then the next extension.",
          ],
          fig: {
            title: "Pullback entry after a break of structure",
            tag: "Worked example",
            n: 41, seed: 17, vol: 0.7,
            path: [[0, 100], [7, 106], [11, 102.5], [18, 110], [23, 106.2], [27, 106.9], [36, 116], [40, 114.5]],
            wicks: [[23, 105.7]],
            overlays: [
              { seg: [[7, 106], [14, 106]], kind: "up", label: "BOS" },
              { hline: 106.4, from: 22, to: 40, kind: "brand", label: "Entry 106.4", dash: false },
              { hline: 104.6, from: 22, to: 40, kind: "down", label: "Stop 104.6" },
              { hline: 110, from: 18, to: 40, kind: "up", label: "Target 1: 110 (2R)" },
              { hline: 113.6, from: 22, to: 40, kind: "up", label: "Target 2: 113.6 (4R)" },
              { ring: [23, 105.7], kind: "brand" },
            ],
            caption: "Risk 1.8 points to make 3.6 at the first target and 7.2 at the second. The chart defines every number.",
          },
        },
        {
          h: "Management",
          p: [
            "Take part of the position off at the first target (the recent high). Move the stop to break-even only after price has made a new higher low above your entry, not simply because you are nervous. Let the remainder run to the next structure target.",
          ],
        },
        {
          h: "When not to take it",
          ul: [
            "The pullback breaks the protected low: structure has changed, the setup is void.",
            "A major news release is due during the trade.",
            "The first target gives less than 1.5R. The trade is not worth the risk.",
          ],
        },
      ],
      takeaways: [
        "Trend (BOS) → pullback → lower-timeframe trigger → entry.",
        "Stops go beyond structure. Targets go at structure.",
        "If the reward to the first target is under 1.5R, skip it.",
      ],
      mistakes: [
        "Entering at the top of the leg instead of waiting for the pullback.",
        "Placing the stop at a round number instead of beyond the swing.",
        "Moving to break-even too early and getting stopped before the move.",
      ],
      psych: "The pullback always feels like the trend is ending. That discomfort is the reason the entry is good. Trust the structure you marked before the pullback started.",
      practice: "Backtest this exact setup on 20 examples of one instrument. Record entry, stop, target, outcome in R. Compute the average.",
      apply: { label: "Check the trade before you take it", href: "calculators.html", why: "Run entry, stop and target through the calculators to confirm the size and the R multiple before you place the order." },
    },
  ],
  quiz: [
    { q: "What defines a swing high using The1% two-candle rule?", options: ["The highest candle of the day", "A peak with at least two lower highs on each side", "Any candle with a long upper wick", "A candle that closes above the moving average"], a: 1, why: "A swing high needs at least two candles on each side that do not exceed it.", lesson: "ms1" },
    { q: "Swing points are marked at…", options: ["Candle bodies", "Wick extremes", "The opening price", "Moving average crossovers"], a: 1, why: "Wicks show where price actually traded. Closes are used for confirmation of breaks.", lesson: "ms1" },
    { q: "Higher highs and higher lows describe…", options: ["A range", "A downtrend", "An uptrend", "A reversal"], a: 2, why: "HH + HL = uptrend.", lesson: "ms2" },
    { q: "In a range, the worst place to open a trade is…", options: ["Near the range low", "Near the range high", "In the middle of the range", "After a clean break and retest"], a: 2, why: "The middle offers the least reward and the most noise.", lesson: "ms2" },
    { q: "A bullish break of structure (BOS) is confirmed by…", options: ["A wick above the last swing high", "A candle close above the last swing high", "An RSI reading above 70", "Any green candle"], a: 1, why: "A close shows acceptance above the level. A wick alone may be a sweep.", lesson: "ms3" },
    { q: "After a bullish BOS, the swing low that created it becomes…", options: ["The protected low", "The take-profit", "Irrelevant", "A supply zone"], a: 0, why: "The protected low must hold for the trend to stay valid, so stops belong beyond it.", lesson: "ms3" },
    { q: "In an uptrend, a change of character (CHoCH) is…", options: ["A close above the last high", "A close below the protected higher low", "Any red candle", "A doji at the high"], a: 1, why: "A CHoCH is the first close against the trend through the protected swing.", lesson: "ms4" },
    { q: "What confirms a new downtrend after a CHoCH?", options: ["Nothing, the CHoCH is enough", "A lower high followed by a break to a new lower low", "A higher high", "A news release"], a: 1, why: "The CHoCH is a warning; the new lower high and the next BOS lower confirm it.", lesson: "ms4" },
    { q: "A 15-minute downtrend inside a daily uptrend is best described as…", options: ["A confirmed daily reversal", "Internal bearish structure within external bullish structure", "A range", "A breakout"], a: 1, why: "It is a pullback until the external low breaks.", lesson: "ms5" },
    { q: "In the pullback entry, you should skip the trade when…", options: ["The first target offers less than 1.5R", "The trend is up", "The pullback is to the broken high", "The stop is beyond the swing"], a: 0, why: "Low reward to the first structure target makes the trade not worth the risk.", lesson: "ms6" },
  ],
});
