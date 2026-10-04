/* The1% Academy — Day Trading Masterclass (full course) */
Academy.register("day-trading", {
  hours: 5,
  outcomes: [
    "Plan your trading day around the Asian, London and New York sessions in East Africa Time.",
    "Form a daily bias from the higher timeframe before the session opens.",
    "Calculate floor pivots and the central pivot range, and use them with the previous day's levels.",
    "Execute three intraday setups and manage them with partials, trailing stops and a flat-by-close rule.",
  ],
  lessons: [
    {
      id: "dt1",
      module: "Preparation",
      title: "The day trader's clock",
      minutes: 9,
      summary: "A day trader opens and closes positions within the same day. The day has a rhythm: a quiet Asian session, a London open that sets the direction, and a New York session that often decides the day's range.",
      sections: [
        {
          h: "Sessions in UTC and EAT",
          p: ["East Africa Time is UTC+3 all year. The times below are approximate forex session hours; the busiest parts are the first two or three hours of London and the London and New York overlap."],
          ul: [
            "Asia (Tokyo, Sydney): 00:00 to 07:00 UTC, which is 03:00 to 10:00 EAT. Usually a narrow range on EUR and GBP pairs.",
            "London: 07:00 to 12:00 UTC for the main move, 10:00 to 15:00 EAT. Volume jumps; the Asian range is often broken.",
            "New York: 13:00 to 20:00 UTC, 16:00 to 23:00 EAT. US data is released at 12:30 or 13:30 UTC (15:30 or 16:30 EAT) depending on US daylight saving.",
            "Overlap: roughly 12:00 to 16:00 UTC, 15:00 to 19:00 EAT. The most liquid hours of the day.",
          ],
          fig: {
            type: "shot",
            src: "dt-sessions-eurusd",
            title: "One trading day, three sessions",
            tag: "Real chart",
            caption: "EURUSD on 19 August 2026. Asia held a 19-pip range. London broke above it. New York extended the move by another 75 pips. Times on the chart are UTC; add 3 hours for EAT.",
            meta: "EURUSD · 1H · 19 Aug 2026",
            alt: "EURUSD hourly chart shaded by Asian, London and New York sessions with pivot levels",
          },
        },
        {
          h: "Choosing your hours",
          p: [
            "You do not need to trade all day. From Kampala or Nairobi, the London open (10:00 EAT) and the New York open (16:00 to 17:00 EAT) fit around a working day better than almost anywhere else in the world. Pick one window of two to three hours and trade only that window.",
          ],
          note: "Most bad day trades are taken in the quiet hours out of boredom. Your window is when you trade; outside it you only plan and review.",
        },
      ],
      takeaways: [
        "EAT = UTC+3; London opens around 10:00 EAT, New York around 16:00 EAT.",
        "Asia often builds a range; London and New York break and extend it.",
        "Trade one fixed window, not the whole day.",
      ],
      mistakes: [
        "Trading EURUSD in the middle of the Asian session and wondering why nothing moves.",
        "Forgetting that US daylight saving shifts New York data times by an hour in EAT.",
        "Staying at the screen for ten hours and trading out of fatigue.",
      ],
      psych: "A fixed window turns trading into a job with hours, not an itch you scratch all day. That structure is protection.",
      practice: "Write your trading window in EAT and set two phone alarms: one 30 minutes before it to prepare, one at its end to stop.",
      apply: { label: "Record your window", href: "journal.html", why: "Note your trading window in the journal and tag each trade with the session it was taken in." },
    },
    {
      id: "dt2",
      module: "Preparation",
      title: "Daily bias",
      minutes: 9,
      summary: "Before the session opens, decide which direction you favour today and what would change your mind. A bias is not a prediction; it is a filter that removes half the trades you might take.",
      sections: [
        {
          h: "Building a bias in ten minutes",
          fig: {
            type: "flow",
            title: "The1% bias routine",
            tag: "Routine",
            perRow: 3,
            steps: ["Daily chart: trend and last swing", "Where is price vs the previous day's high and low?", "Nearest higher-timeframe zone above and below", "Which liquidity pool is the draw?", "Bias: long, short or no trade", "Invalidation: what price flips it"],
          },
        },
        {
          h: "Using the previous day",
          ul: [
            "Previous day high (PDH) and low (PDL) are the most watched intraday levels. Stops cluster just beyond them.",
            "Opening above the previous day's range with a bullish daily trend supports a long bias.",
            "A sweep of PDH that closes back inside the range often reverses the day.",
            "If price opens inside a large previous-day range with no trend, 'no trade' is a valid bias.",
          ],
          note: "Write the bias and its invalidation level before the session. If price crosses that level, the bias is gone: you stand aside, you do not argue.",
        },
      ],
      takeaways: [
        "Bias comes from the higher timeframe and the previous day.",
        "Every bias has an invalidation level.",
        "'No trade' is a legitimate bias.",
      ],
      mistakes: [
        "Forming the bias from the last 15 minutes of price.",
        "Holding a bias after its invalidation level breaks.",
        "Taking both long and short trades on the same idea in one day.",
      ],
      psych: "The bias protects you from your own reactions. When price jumps, you already know which direction you are allowed to trade.",
      practice: "For the next five days, write your bias and invalidation before your window opens. At the end of the day, mark it right, wrong or no trade.",
      apply: { label: "Write it in the journal", href: "journal.html", why: "Add the bias as a note on each day so you can review its accuracy weekly." },
    },
    {
      id: "dt3",
      module: "Preparation",
      title: "Key levels: pivots and the central pivot range",
      minutes: 12,
      summary: "Floor pivots turn yesterday's high, low and close into today's reference levels. Many day traders watch them, which is part of why they work. The central pivot range adds a quick read on whether the day may trend or range.",
      sections: [
        {
          h: "The formulas",
          ul: [
            "Pivot P = (High + Low + Close) / 3 of the previous day.",
            "R1 = 2P - Low. S1 = 2P - High.",
            "R2 = P + (High - Low). S2 = P - (High - Low).",
            "R3 = High + 2 x (P - Low). S3 = Low - 2 x (High - P).",
            "Central pivot range: BC = (High + Low) / 2, TC = 2P - BC. If TC comes out below BC, just swap them.",
          ],
        },
        {
          h: "A worked example, EURUSD 18 to 19 August 2026",
          p: [
            "On 18 August (UTC day) EURUSD's high was 1.15915, low 1.15714, close 1.15794. So P = 1.15808, R1 = 1.15902, R2 = 1.16009, S1 = 1.15700, S2 = 1.15607. BC = 1.15815 and TC = 1.15801: the central range was only about 1.4 pips wide.",
            "On 19 August price stayed above P after the London open, broke R1 and R2, and New York extended to 1.16809, far beyond R2.",
          ],
          fig: {
            type: "shot",
            src: "tf-pips-eurusd",
            title: "The New York extension on 19 August",
            tag: "Real chart",
            caption: "From 1.16063 at 13:00 UTC (16:00 EAT) to 1.16809 by 15:00 UTC: 74.6 pips in two hours, all above R2.",
            meta: "EURUSD · 1H · 19 Aug 2026",
            alt: "EURUSD hourly chart with a measured 74.6 pip move during the New York session",
          },
        },
        {
          h: "Reading pivots",
          ul: [
            "Price holding above P: buyers are in control for the day. Below P: sellers.",
            "A narrow central pivot range after a quiet day often comes before a trending day, as it did here. A wide range often comes before a sideways day.",
            "R1 and S1 are the most common first targets and reaction points. R3 and S3 are reached only on strong trend days.",
            "Levels that line up with PDH, PDL, round numbers or a higher-timeframe zone carry more weight.",
          ],
          note: "Pivots are reference points, not signals. Use them for targets and for where to be careful, and take entries from price action at those levels.",
        },
      ],
      takeaways: [
        "P = (H + L + C) / 3; R1 = 2P - L; S1 = 2P - H; R2 and S2 add and subtract the range.",
        "Above P favours longs; below P favours shorts.",
        "A narrow central pivot range often precedes a trend day.",
      ],
      mistakes: [
        "Calculating pivots from a daily candle that closes at a different time from your broker's.",
        "Treating every pivot level as a reversal point.",
        "Ignoring pivots from the higher timeframe (weekly) that sit nearby.",
      ],
      psych: "Pre-calculated levels mean you are never surprised by where price reacts. You planned for it before the session began.",
      practice: "Calculate tomorrow's P, R1, R2, S1, S2 and CPR by hand for your market from today's high, low and close. Check them against your platform's pivot indicator.",
      apply: { label: "Plot pivots on the chart", href: "charts.html", why: "Draw your calculated levels and compare them with the price action in your window." },
    },
    {
      id: "dt4",
      module: "Preparation",
      title: "The economic calendar",
      minutes: 7,
      summary: "Scheduled news can move a market more in one minute than in the previous six hours. Day traders plan around the calendar: when to trade, when to stand aside, and when spreads will widen.",
      sections: [
        {
          h: "High-impact events to know",
          ul: [
            "US Non-Farm Payrolls: first Friday of the month, 15:30 or 16:30 EAT.",
            "US CPI inflation, monthly, at the same time of day.",
            "Central bank rate decisions: the Fed (usually 21:00 or 22:00 EAT), the ECB and the Bank of England, plus their press conferences.",
            "For gold, any US data that moves yields and the dollar.",
          ],
        },
        {
          h: "A simple news rule",
          ul: [
            "No new trades from 15 minutes before to 15 minutes after a high-impact release on your market.",
            "Close or reduce open day trades before the event, or accept that your stop may slip.",
            "After the release, let the first 5 to 15 minutes form a range, then trade the break or the rejection of it using your normal rules.",
          ],
          note: "Check the calendar each morning at the same time you set your bias. A bias formed without looking at the calendar is incomplete.",
        },
      ],
      takeaways: [
        "Know the high-impact events and their times in EAT.",
        "Stand aside around releases; spreads and slippage spike.",
        "Trade the reaction with normal rules, not the headline.",
      ],
      mistakes: [
        "Holding a tight-stop scalp into Non-Farm Payrolls.",
        "Trading the first second of a release.",
        "Forgetting daylight-saving shifts in release times.",
      ],
      psych: "News trading feels exciting because it is fast. Speed is the enemy of a process that relies on waiting for your setup.",
      practice: "List this week's high-impact events for your market in EAT and block them in your calendar.",
      apply: { label: "Open your dashboard", href: "dashboard.html", why: "Start each session from the dashboard with this week's events written down beside you." },
    },
    {
      id: "dt5",
      module: "Setups",
      title: "Three intraday setups",
      minutes: 12,
      summary: "Three setups cover most good day trades: the open drive, the pullback in a trend day, and the reversal at an extreme. Each needs a bias, a level and a trigger.",
      sections: [
        {
          h: "1. The open drive",
          ul: [
            "Context: price breaks the Asian range at the London open, or the morning range at the New York open, in the bias direction.",
            "Trigger: a 15-minute or 1-hour candle closes beyond the range with a strong body.",
            "Stop: back inside the range, beyond the middle or the opposite edge.",
            "Target: R1 or S1, then R2 or S2, or PDH or PDL.",
          ],
        },
        {
          h: "2. The pullback on a trend day",
          ul: [
            "Context: price is trending away from the pivot and holding above (or below) it.",
            "Trigger: a pullback to the broken level (the Asian high, R1, or a fresh intraday FVG) with a rejection candle.",
            "Stop: beyond the pullback low (or high).",
            "Target: the next pivot level or the session high.",
          ],
          note: "On 19 August 2026, EURUSD broke the Asian high of 1.15929 at 07:00 UTC, held above R2 (1.16009) through the London session, and New York drove the next leg. Both an open drive and a pullback entry had clear stops.",
        },
        {
          h: "3. Reversal at an extreme",
          ul: [
            "Context: price has already travelled more than the average daily range, or reached R3 or S3, a previous-day level or a higher-timeframe zone.",
            "Trigger: a liquidity sweep beyond the level and a lower-timeframe CHoCH back inside.",
            "Stop: beyond the sweep wick.",
            "Target: the pivot P or the session midpoint. Reversals are counter-trend, so take smaller targets.",
          ],
        },
      ],
      takeaways: [
        "Open drive: break of the early range with the bias.",
        "Pullback: re-entry at the broken level on a trend day.",
        "Reversal: sweep and CHoCH at an extreme; smaller targets.",
      ],
      mistakes: [
        "Trading reversals on a strong trend day because 'it has gone too far'.",
        "Entering open drives before the candle closes.",
        "Using the same target on a trend day and a range day.",
      ],
      psych: "Master one setup first. Three half-learned setups give you three ways to justify a bad trade.",
      practice: "Replay the last ten days of your market in your window. Label each day as open drive, pullback, reversal or no setup.",
      apply: { label: "Backtest in the simulator", href: "calculators.html#sim", why: "Use the simulator to see what your win rate and R do to the account over 100 trades." },
    },
    {
      id: "dt6",
      module: "Management",
      title: "Partials, trailing and flat by close",
      minutes: 10,
      summary: "Day trading ends each day flat. Management rules decide how much of a good move you keep and how much a bad day can cost you.",
      sections: [
        {
          h: "Taking partials and trailing",
          ul: [
            "Take half off at 1R or at the first pivot level, and move the stop to break-even.",
            "Trail the rest behind each new 15-minute or 1-hour swing, or behind the last broken pivot level.",
            "Close the remainder at the final target, or at the end of your window.",
          ],
          fig: {
            type: "bars",
            title: "One trade, three management plans",
            tag: "Result in R",
            max: 3,
            items: [
              { label: "All out at 3R", value: 3, text: "+3.0R or -1R", kind: "brand" },
              { label: "Half 1R, half 3R", value: 2, text: "+2.0R or 0R", kind: "up" },
              { label: "Half 1R, half at BE", value: 0.5, text: "+0.5R", kind: "warn" },
            ],
            caption: "BE = the rest stopped at break-even. Partials lower the best outcome but turn many losers into scratches. Choose one plan and keep it for at least 30 trades.",
          },
        },
        {
          h: "Flat by close and the daily stop",
          ul: [
            "All day trades are closed before the end of your window, or at the latest before the daily rollover (about 00:00 EAT).",
            "Daily loss limit: stop trading after 2R to 3R of losses in a day, or after two losing trades in a row.",
            "Daily profit rule: after a strong day, reduce size or stop. Giving back a good day is a common way to ruin a week.",
          ],
          note: "Holding a losing day trade overnight 'to see if it comes back' turns a day trade into an unplanned swing trade with the wrong size.",
        },
      ],
      takeaways: [
        "Partial at 1R and break-even stop is a simple, robust plan.",
        "Close everything by the end of your window.",
        "A daily loss limit protects the account and your head.",
      ],
      mistakes: [
        "Moving the stop to break-even too early and being stopped by noise.",
        "Holding day trades overnight when they are losing.",
        "Trading on after hitting the daily loss limit.",
      ],
      psych: "The flat-by-close rule gives every day a clean ending. You sleep without open risk and start tomorrow without yesterday's baggage.",
      practice: "Write your management plan and daily loss limit on the same page as your bias routine. Review both every Sunday.",
      apply: { label: "Set your daily limit", href: "journal.html", why: "Write your daily loss limit in the journal and mark any day you broke it during your weekly review." },
    },
  ],
  quiz: [
    { q: "London opens at about 07:00 UTC. In East Africa Time that is…", options: ["07:00", "10:00", "13:00", "04:00"], a: 1, why: "EAT is UTC+3.", lesson: "dt1" },
    { q: "Which hours are usually the most liquid for EURUSD?", options: ["The middle of the Asian session", "The London and New York overlap", "Saturday", "Just after rollover"], a: 1, why: "The overlap, roughly 15:00 to 19:00 EAT, has the most participants.", lesson: "dt1" },
    { q: "A daily bias should always include…", options: ["A profit target in money", "An invalidation level", "Five indicators", "A news headline"], a: 1, why: "A bias without invalidation cannot be managed.", lesson: "dt2" },
    { q: "Previous day: High 1.2100, Low 1.2000, Close 1.2050. The pivot P is…", options: ["1.2050", "1.2075", "1.2025", "1.2100"], a: 0, why: "(1.2100 + 1.2000 + 1.2050) / 3 = 1.2050.", lesson: "dt3" },
    { q: "Using the same numbers, R1 is…", options: ["1.2100", "1.2150", "1.2000", "1.2200"], a: 0, why: "R1 = 2P - Low = 2.4100 - 1.2000 = 1.2100.", lesson: "dt3" },
    { q: "A very narrow central pivot range often comes before…", options: ["A quiet, sideways day", "A trending day", "A market holiday", "A widening spread"], a: 1, why: "Narrow CPR after a compressed day often precedes expansion.", lesson: "dt3" },
    { q: "What is a sensible rule around a high-impact release?", options: ["Double size for the spike", "No new trades 15 minutes either side", "Remove stops so spread cannot hit them", "Trade the first second"], a: 1, why: "Spreads and slippage spike around releases.", lesson: "dt4" },
    { q: "An open drive is…", options: ["A break of the early session range in the bias direction", "A trade opened at rollover", "A reversal at R3", "A position held overnight"], a: 0, why: "It trades the break of the opening range with the bias.", lesson: "dt5" },
    { q: "In a reversal at an extreme, the stop goes…", options: ["At the pivot", "Beyond the sweep wick", "At break-even immediately", "No stop"], a: 1, why: "If price trades back beyond the sweep, the reversal failed.", lesson: "dt5" },
    { q: "You have lost 3R today, your daily limit. What now?", options: ["One more trade to win it back", "Stop trading for the day", "Double size", "Switch to a different market"], a: 1, why: "The daily limit exists for exactly this moment.", lesson: "dt6" },
  ],
});
