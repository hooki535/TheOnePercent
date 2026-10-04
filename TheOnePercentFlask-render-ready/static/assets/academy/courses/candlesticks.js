/* The1% Academy — Candlestick Masterclass (full course) */
Academy.register("candlesticks", {
  hours: 4,
  outcomes: [
    "Read any candle as a short story of the auction: who opened, who pushed, who won the close.",
    "Recognise the core single-candle signals: pin bars, hammers, shooting stars, dojis and marubozu.",
    "Recognise the core multi-candle signals: engulfing, inside and outside bars, morning and evening stars.",
    "Grade a candle signal by its location, so you only act on patterns that appear at a level with the trend.",
  ],
  lessons: [
    {
      id: "cs1",
      module: "Anatomy",
      title: "Reading a candle: body, wick and range",
      minutes: 8,
      summary: "Every candle records four prices. Together they tell you who controlled the period and who was rejected.",
      sections: [
        {
          h: "Four prices, one picture",
          p: [
            "A candle shows the open, high, low and close for one period. The body is the distance between the open and the close. The wicks (also called shadows) show how far price travelled beyond the body before it was pushed back.",
            "A green (bullish) candle closed above its open. A red (bearish) candle closed below its open. The colour tells you the result of the period; the wicks tell you what happened along the way.",
          ],
          fig: {
            title: "Anatomy of bullish and bearish candles",
            tag: "Diagram",
            n: 11, h: 250, only: true,
            path: [[0, 100], [8, 100]],
            set: [
              [2, 99, 104.2, 97.4, 103.2],
              [4, 103, 104, 97.2, 98],
              [6, 100, 106.5, 99.6, 100.6],
              [8, 102.5, 103, 96, 102.2],
            ],
            overlays: [
              { label: "Close", at: [1.5, 103.2], pos: "left", kind: "up" },
              { label: "Open", at: [1.5, 99], pos: "left", kind: "up" },
              { label: "High", at: [2.5, 104.2], pos: "right", kind: "muted" },
              { label: "Low", at: [2.5, 97.4], pos: "right", kind: "muted" },
              { label: "Bullish", at: [2, 96.4], pos: "below", kind: "muted" },
              { label: "Bearish", at: [4, 96.2], pos: "below", kind: "muted" },
              { label: "Long upper wick", at: [6, 107], kind: "down" },
              { label: "Long lower wick", at: [8, 95], pos: "below", kind: "up" },
            ],
            caption: "The body is the result. The wick is the rejection. A long wick shows that one side pushed and was overpowered before the close.",
          },
        },
        {
          h: "What the shape tells you",
          ul: [
            "Large body, small wicks: one side was in control from open to close.",
            "Small body, long wicks: both sides fought and neither won clearly.",
            "Long lower wick: sellers pushed down and buyers rejected the low.",
            "Long upper wick: buyers pushed up and sellers rejected the high.",
            "Range (high minus low) compared with recent candles tells you whether the period was calm or violent.",
          ],
          note: "A candle is a summary of one period, not a prediction. It only becomes a signal when it appears in the right place.",
        },
      ],
      takeaways: [
        "Body = who won the period. Wick = who was rejected.",
        "Compare every candle with its neighbours; size is relative.",
        "Timeframe matters: a daily candle holds far more information than a 1-minute candle.",
      ],
      mistakes: [
        "Reading a candle before it has closed.",
        "Judging a candle in isolation, without the ones before it.",
        "Treating colour as the whole story and ignoring the wicks.",
      ],
      psych: "Waiting for the close is the first discipline every trader learns. A candle that looks like a hammer at minute 40 can be a full red bar at minute 60.",
      practice: "Open a daily chart and describe the last ten candles in one sentence each: who controlled the period and who was rejected.",
      apply: { label: "Open the charts", href: "charts.html", why: "Switch between the 1H and daily timeframe and watch how one daily candle is built from many smaller ones." },
    },
    {
      id: "cs2",
      module: "Single-candle signals",
      title: "Pin bars, hammers and shooting stars",
      minutes: 9,
      summary: "A pin bar has a long wick and a small body. It shows a strong rejection of one price area, and it is the most useful single candle to know.",
      sections: [
        {
          h: "The rules of a pin bar",
          ul: [
            "The wick is at least two thirds of the total range.",
            "The body sits in the top or bottom third of the range.",
            "The wick sticks out beyond the recent candles: it tested a price nobody else reached.",
            "A bullish pin (hammer) has the long wick below. A bearish pin (shooting star) has the long wick above.",
          ],
        },
        {
          h: "A hammer at a demand zone",
          p: [
            "The pin bar is strongest when its wick pierces a level you had already marked, such as a demand zone or a swing low, and the body closes back above it. The wick shows that orders at the level were real.",
          ],
          fig: {
            title: "Hammer rejects a demand zone, then price rallies",
            tag: "Worked example",
            n: 30, seed: 21, vol: 0.5,
            path: [[0, 112], [6, 108], [8, 109], [14, 103.4], [15, 104.4], [22, 110], [29, 113]],
            set: [[15, 103.6, 104.7, 101.6, 104.4]],
            overlays: [
              { zone: [2, null, 102.2, 103.4], kind: "demand", label: "Demand zone marked in advance" },
              { ring: [15, 101.6], kind: "up" },
              { label: "Hammer: wick pierces, body closes above", at: [15, 100.4], pos: "below", kind: "up" },
              { hline: 101.3, from: 15, to: 22, kind: "down", label: "Stop below wick", labelPos: "below" },
            ],
            caption: "The wick tested the zone and was rejected within one candle. The stop goes below the wick, where the idea is proved wrong.",
          },
        },
        {
          h: "How to trade it",
          p: [
            "Aggressive entry: at the close of the pin bar. Conservative entry: a limit order at the 50% level of the pin's range, which gives a better price and a smaller stop but may not fill. In both cases the stop goes a few pips beyond the tip of the wick.",
          ],
          note: "A pin bar in the middle of nowhere is just a candle with a long wick. Location is what turns it into a signal.",
        },
        {
          h: "On a real chart: a hammer that held",
          p: [
            "AUDUSD on 5 August 2024. A fast sell-off traded down to 0.6357, then buyers pushed price all the way back to close near the open. The long lower wick is the footprint of that rejection.",
            "Notice where the stop belongs: below the wick, not below the body. If price trades back through 0.6357, the rejection has failed and the idea is wrong."
          ],
          fig: {
            type: "shot",
            src: "cs-hammer-audusd",
            title: "Hammer after a sell-off, then a rally",
            caption: "The hammer's low became the invalidation point for the whole recovery that followed.",
            meta: "AUDUSD · 1D · Aug 2024",
            alt: "AUDUSD daily chart with a hammer candle on 5 August 2024 followed by a rally"
          }
        },
        {
          h: "On a real chart: a shooting star at the high",
          p: [
            "GBPUSD on 17 September 2025. Price spiked to 1.3725, sellers slammed it back, and the day closed near its open with a long upper wick. The next day closed below the star's low, which is the trigger most traders wait for."
          ],
          fig: {
            type: "shot",
            src: "cs-star-gbpusd",
            title: "Shooting star, then a close below its low",
            caption: "The star alone is a warning. The close below its low is the confirmation.",
            meta: "GBPUSD · 1D · Sep 2025",
            alt: "GBPUSD daily chart with a shooting star on 17 September 2025"
          }
        },
      ],
      takeaways: [
        "Wick at least two thirds of the range, body at one end.",
        "Best when the wick pierces a pre-marked level and closes back inside.",
        "Stop beyond the wick tip; entry at the close or at the 50% level.",
      ],
      mistakes: [
        "Trading every long wick, including those in the middle of a range.",
        "Placing the stop inside the wick, where normal noise will hit it.",
        "Trading a pin against a strong higher-timeframe trend without any other reason.",
      ],
      psych: "The wick is fear and greed made visible: one side panicked in, the other side absorbed it. You want to be on the side that absorbed it.",
      practice: "Find ten pin bars on a 4H chart. Mark which ones formed at a level you could have drawn in advance. Compare what happened next.",
      apply: { label: "Size the pin bar trade", href: "calculators.html", why: "Enter the distance from entry to the wick tip as your stop and let the calculator give you the lot size at 1% risk." },
    },
    {
      id: "cs3",
      module: "Single-candle signals",
      title: "Dojis and marubozu: indecision and conviction",
      minutes: 8,
      summary: "A doji shows a balanced auction. A marubozu shows one side in total control. Both mean the most when they break a pattern of the candles before them.",
      sections: [
        {
          h: "The doji",
          p: [
            "A doji opens and closes at nearly the same price. Buyers and sellers ended the period level. After a strong trend, a doji means the side that was winning has stopped winning. That is a warning, not a reversal signal on its own.",
          ],
          fig: {
            title: "A doji at resistance after a strong rally",
            tag: "Diagram",
            n: 30, seed: 5, vol: 0.5,
            path: [[0, 101], [12, 110.6], [13, 110.6], [20, 105], [29, 102]],
            set: [[13, 110.6, 112, 109.2, 110.65]],
            overlays: [
              { hline: 111.2, from: 3, kind: "down", label: "Old resistance" },
              { ring: [13, 110.6], kind: "warn" },
              { label: "Doji: the rally stalls", at: [13, 112.6], pos: "left", kind: "warn" },
              { label: "Next candle confirms", at: [17, 109.4], pos: "right", kind: "down" },
            ],
            caption: "The doji alone only says buying pressure has paused. The bearish candle that follows is what confirms sellers have taken over.",
          },
        },
        {
          h: "The marubozu",
          p: [
            "A marubozu has a full body and almost no wicks: it opened at one extreme and closed at the other. It is the footprint of conviction. A bullish marubozu leaving a base is exactly the kind of departure that creates a strong demand zone.",
          ],
          ul: [
            "Marubozu breaking a level: the break is more likely to hold.",
            "Marubozu leaving a base: the base is a high-grade zone.",
            "Marubozu into a level, after a long trend: often the final push before exhaustion. Check the next candle.",
          ],
        },
        {
          h: "On a real chart: a doji after a fall",
          p: [
            "EURUSD in January 2025. After a steady decline, 13 January printed a doji: a large range but almost no net change. Sellers were still active, but they could no longer push price to a lower close.",
            "The doji by itself is not a buy signal. The strong bullish candle the next day is what turned indecision into a tradable shift."
          ],
          fig: {
            type: "shot",
            src: "cs-doji-eurusd",
            title: "Doji, then a confirmation candle",
            caption: "Wait for the candle after the doji. Indecision needs a winner.",
            meta: "EURUSD · 1D · Jan 2025",
            alt: "EURUSD daily chart with a doji on 13 January 2025"
          }
        },
      ],
      takeaways: [
        "Doji = balance. After a trend, it warns that momentum has stopped.",
        "Marubozu = conviction. It confirms breaks and grades zones.",
        "Always wait for the next candle before acting on a doji.",
      ],
      mistakes: [
        "Selling every doji in an uptrend.",
        "Chasing a marubozu after it has already travelled far from any level.",
        "Ignoring that on low timeframes, dojis are common and mean little.",
      ],
      psych: "Indecision on the chart often causes indecision in the trader. A doji is a reason to prepare your plan, not a reason to click.",
      practice: "Find five dojis after a strong trend on the daily chart. Record how often the next candle confirmed a reversal and how often the trend simply continued.",
      apply: { label: "Journal the result", href: "journal.html", why: "Tag trades by candle signal so you can see which ones actually work for you." },
    },
    {
      id: "cs4",
      module: "Multi-candle signals",
      title: "Engulfing, inside and outside bars",
      minutes: 10,
      summary: "Two-candle patterns show a shift in control between one period and the next. The engulfing bar is the strongest; the inside bar is the quiet before a move.",
      sections: [
        {
          h: "The engulfing bar",
          p: [
            "A bullish engulfing bar opens at or below the previous close and closes above the previous open. Its body completely covers the body of the red candle before it. In one period, buyers erased everything sellers did in the last period and more.",
          ],
          fig: {
            title: "Bullish engulfing at a higher low",
            tag: "Worked example",
            n: 30, seed: 33, vol: 0.5,
            path: [[0, 101], [8, 108], [13, 104.4], [14, 104.1], [15, 106.4], [22, 110.4], [29, 112.6]],
            set: [[14, 104.8, 105, 103.6, 104.1], [15, 103.9, 106.7, 103.7, 106.4]],
            overlays: [
              { zone: [14, 16, 103.6, 105], kind: "demand" },
              { label: "Engulfing: body covers the prior body", at: [16, 103.4], pos: "right", kind: "up" },
              { hline: 103.3, from: 12, to: 16, kind: "down" },
              { label: "Higher low", at: [13, 105.6], pos: "left", kind: "muted" },
            ],
            caption: "The stop (dashed) goes below both candles. The engulfing bar formed at a higher low in an uptrend. Trend, location and signal all agree, which is when a candle pattern is worth trading.",
          },
        },
        {
          h: "Inside and outside bars",
          ul: [
            "Inside bar: its whole range sits inside the previous candle (the mother bar). It shows compression. Traders place orders just beyond the mother bar's high and low and let the market choose a side.",
            "Outside bar: its range covers the whole previous candle, high and low. If it also closes strongly, it behaves like an engulfing bar. If it closes in the middle, it shows volatility without direction.",
            "Inside bars with the trend, at a level, are the cleanest. Inside bars in the middle of a choppy range often break both ways.",
          ],
          note: "Candle names come from shape. Their meaning comes from where they appear. An engulfing bar into resistance is far weaker than the same bar off support.",
        },
        {
          h: "On a real chart: bullish engulfing at support",
          p: [
            "EURUSD on 1 and 2 August 2024. A red day into the late-June support near 1.0778 was followed by a green day that opened at the low and closed well above the previous open. Location plus pattern: that is what made it worth trading."
          ],
          fig: {
            type: "shot",
            src: "cs-engulf-eurusd",
            title: "Bullish engulfing at a known support",
            caption: "The same pattern in the middle of a range would mean far less.",
            meta: "EURUSD · 1D · Aug 2024",
            alt: "EURUSD daily chart with a bullish engulfing pattern at support on 2 August 2024"
          }
        },
      ],
      takeaways: [
        "Engulfing = full transfer of control in one period.",
        "Inside bar = compression; trade the break of the mother bar.",
        "Outside bars need a strong close to mean anything.",
      ],
      mistakes: [
        "Counting a pattern where only the wicks, not the bodies, are engulfed.",
        "Trading inside-bar breaks in a choppy range.",
        "Using a pattern's stop but ignoring the nearest opposing level as a target.",
      ],
      psych: "An engulfing bar feels urgent. The urge to enter immediately is the same urge that makes traders chase. Check the level first, then enter.",
      practice: "Backtest 20 engulfing bars on one pair: 10 at a marked level and 10 in the middle of price. Record the result of each in R.",
      apply: { label: "Backtest in the journal", href: "journal.html", why: "Log each backtest as a paper trade with the tag 'engulfing' so the journal can compare the two groups." },
    },
    {
      id: "cs5",
      module: "Multi-candle signals",
      title: "Morning and evening stars",
      minutes: 8,
      summary: "Three-candle reversals show the full turn: a strong move, a pause, then a strong move the other way.",
      sections: [
        {
          h: "The evening star",
          p: [
            "Candle one: a strong bullish candle continues the trend. Candle two: a small-bodied candle (often a doji) that shows buying has stalled. Candle three: a strong bearish candle that closes deep into the body of candle one. The morning star is the mirror image at a low.",
          ],
          fig: {
            title: "Evening star at a supply zone",
            tag: "Diagram",
            n: 30, seed: 17, vol: 0.5,
            path: [[0, 100], [11, 107.6], [12, 110], [13, 110.2], [14, 107.2], [21, 104], [29, 101]],
            set: [[12, 107.7, 110.2, 107.5, 110], [13, 110.1, 111.2, 109.7, 110.2], [14, 110, 110.1, 107, 107.2]],
            overlays: [
              { zone: [1, null, 110, 111.6], kind: "supply", label: "Supply zone" },
              { label: "1", at: [12, 106.8], pos: "below", kind: "muted" },
              { label: "2", at: [13, 108.9], pos: "below", kind: "muted" },
              { label: "3", at: [14, 106.3], pos: "below", kind: "muted" },
              { label: "Close deep into candle 1", at: [16, 109.2], pos: "right", kind: "down" },
            ],
            caption: "The third candle closes below the midpoint of the first. That is the confirmation: sellers have not just stopped the rally, they have reversed it.",
          },
        },
        {
          h: "What makes a strong star",
          ul: [
            "The pattern forms at a level you marked in advance.",
            "Candle three closes beyond the midpoint of candle one.",
            "The middle candle is small; the smaller it is, the clearer the pause.",
            "Volume or range expands on candle three.",
          ],
        },
      ],
      takeaways: [
        "Three candles: trend, pause, reversal.",
        "Candle three must close beyond the midpoint of candle one.",
        "Stop beyond the extreme of the middle candle.",
      ],
      mistakes: [
        "Entering on candle two, before the reversal candle exists.",
        "Accepting a weak third candle that barely moves.",
        "Ignoring the higher-timeframe trend.",
      ],
      psych: "Three-candle patterns reward patience twice: you wait for the level, then you wait for the third candle to close.",
      practice: "Find five morning or evening stars on the daily chart of a major index. For each, note whether it formed at a level and what the maximum move was in R.",
      apply: { label: "Set an alert at your level", href: "charts.html", why: "Set price alerts at the zones you marked so you only look for stars when price is actually there." },
    },
    {
      id: "cs6",
      module: "Context",
      title: "Context first: The1% candle checklist",
      minutes: 9,
      summary: "A candle pattern is the last piece of evidence, not the first. The checklist makes sure trend and location are right before the candle matters.",
      sections: [
        {
          h: "Location beats pattern",
          p: [
            "The same engulfing bar means very different things in different places. Off a fresh demand zone in an uptrend, it confirms a planned trade. In the middle of a range, it is noise. Into a supply zone, against the trend, it is often a trap.",
          ],
          fig: {
            type: "bars",
            title: "How to weight a candle signal",
            tag: "The1% scoring",
            max: 4,
            labelW: 250,
            items: [
              { label: "Higher timeframe agrees", value: 3, text: "+3", kind: "up" },
              { label: "At a pre-marked level", value: 4, text: "+4", kind: "up" },
              { label: "Clean signal (rules met)", value: 2, text: "+2", kind: "brand" },
              { label: "Room to the next level (2R+)", value: 1, text: "+1", kind: "brand" },
            ],
            caption: "Score out of 10. Trade 7 and above. Notice that the pattern itself is only worth 2 points: context carries the rest.",
          },
        },
        {
          h: "The1% candle checklist",
          fig: {
            type: "flow",
            title: "Before any candle-based entry",
            tag: "Checklist",
            perRow: 3,
            steps: [
              "Trend: what is the higher timeframe doing?",
              "Level: is price at a zone I marked earlier?",
              "Close: has the signal candle closed?",
              "Rules: does it meet every rule of the pattern?",
              "Room: is there 2R to the next level?",
              "Size: stop beyond the wick, risk 1%",
            ],
          },
        },
      ],
      takeaways: [
        "Trend and location decide whether a pattern matters.",
        "The candle is confirmation of a plan, not the plan itself.",
        "Score every signal; skip anything below 7.",
      ],
      mistakes: [
        "Learning 40 pattern names and none of the context.",
        "Scanning for patterns first and inventing a reason afterwards.",
        "Skipping the room-to-target check.",
      ],
      psych: "A checklist protects you from your own excitement. When a pattern looks perfect, the checklist is what asks whether it is in the right place.",
      practice: "Print the checklist. For the next 20 candle signals you see, score each one before you look at what happened next.",
      apply: { label: "Use the pre-trade checklist", href: "learn.html#library", why: "Add the candle checklist to your pre-trade routine." },
    },
  ],
  quiz: [
    { q: "A candle's body shows…", options: ["The highest price reached", "The distance between the open and the close", "The volume traded", "The spread"], a: 1, why: "The body runs from open to close. Wicks show the extremes.", lesson: "cs1" },
    { q: "A long lower wick means…", options: ["Sellers controlled the close", "Price was pushed down and buyers rejected the low", "The market was closed", "Nothing without volume"], a: 1, why: "The wick shows a push that was overpowered before the close.", lesson: "cs1" },
    { q: "In a valid pin bar, the wick should be at least…", options: ["One tenth of the range", "Half of the body", "Two thirds of the total range", "Equal to the previous candle"], a: 2, why: "A long wick relative to the whole range is the defining feature.", lesson: "cs2" },
    { q: "Where does the stop go on a hammer trade?", options: ["Inside the wick", "A few pips beyond the tip of the wick", "At the open", "No stop is needed"], a: 1, why: "The tip of the wick is where the rejection is proved wrong.", lesson: "cs2" },
    { q: "A doji after a strong rally is best treated as…", options: ["A sell signal on its own", "A warning that momentum has paused; wait for the next candle", "A buy signal", "Irrelevant"], a: 1, why: "A doji shows balance. Confirmation comes from the next candle.", lesson: "cs3" },
    { q: "A bullish marubozu leaving a base suggests…", options: ["A weak zone", "A strong departure and a high-grade zone", "A range", "A reversal down"], a: 1, why: "Full-body candles show conviction, which grades the base highly.", lesson: "cs3" },
    { q: "A bullish engulfing bar must…", options: ["Have a longer upper wick", "Have a body that covers the previous candle's body", "Be followed by a doji", "Form on Monday"], a: 1, why: "The body must fully engulf the prior body.", lesson: "cs4" },
    { q: "An inside bar is traded by…", options: ["Buying immediately", "Placing orders beyond the mother bar's high and low", "Selling the close", "Ignoring it"], a: 1, why: "The inside bar shows compression; the break of the mother bar gives direction.", lesson: "cs4" },
    { q: "In an evening star, the third candle should…", options: ["Be a doji", "Close beyond the midpoint of the first candle", "Be bullish", "Have no wicks"], a: 1, why: "A deep close into candle one confirms the reversal.", lesson: "cs5" },
    { q: "Using The1% checklist, what matters most?", options: ["The pattern's name", "Trend and location", "Candle colour", "How many patterns you know"], a: 1, why: "Context carries most of the score; the pattern confirms.", lesson: "cs6" },
  ],
});
