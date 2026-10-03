/* The1% Academy — Trading Psychology Masterclass (full course) */
(() => {
  /* Equity curve for lesson ps1: 50 trades, 20 wins at +2R, 30 losses at
     -1R, with a six-loss streak in the middle. Expectancy +0.2R. */
  const SEQ = "WLLWLWLLWLWLLLLLLWWLWLLWLWLWLLWLWLLWWLWLLWLWLLWLWL";
  const eq = [[0, 0]];
  let r = 0;
  SEQ.split("").forEach((c, i) => {
    r += c === "W" ? 2 : -1;
    eq.push([i + 1, r]);
  });

  /* Prospect-theory value curve for ps5 (losses weigh ~2.25x). */
  const vf = [];
  for (let x = -10; x <= 10; x += 0.5) vf.push([x, x >= 0 ? Math.pow(x, 0.88) : -2.25 * Math.pow(-x, 0.88)]);

  /* ps6: the same 30 trades at a fixed 1% versus risk that grows after
     each win (overconfidence) up to 5%. Wins pay 2R. */
  const SEQ6 = "WWWWWWWLLLLLLLLLLWLLWLLWLWLLWL";
  const fixed = [[0, 100]];
  const hot = [[0, 100]];
  let a = 100, b = 100, risk = 1;
  SEQ6.split("").forEach((c, i) => {
    const w = c === "W";
    a *= 1 + (w ? 0.02 : -0.01);
    b *= 1 + (w ? (2 * risk) / 100 : -risk / 100);
    risk = w ? Math.min(5, risk + 1) : risk;
    fixed.push([i + 1, +a.toFixed(2)]);
    hot.push([i + 1, +b.toFixed(2)]);
  });

  Academy.register("psychology", {
    hours: 4,
    outcomes: [
      "Think in probabilities: judge decisions by process, not by one outcome.",
      "Recognise fear, greed, FOMO and revenge in your body before they reach the order ticket.",
      "Use circuit breakers and if-then plans to stop a bad trade becoming a bad day.",
      "Build a pre-market, in-trade and post-session routine you can keep for a career.",
    ],
    lessons: [
      {
        id: "ps1",
        module: "The probability mindset",
        title: "Why psychology is the real edge",
        minutes: 9,
        summary: "A profitable strategy still loses often. The trader who cannot handle the losing streaks will abandon it right before it pays.",
        sections: [
          {
            h: "Every trade is one of many",
            p: [
              "A strategy that wins 40% of the time at 2R per win and 1R per loss has a positive expectancy of +0.2R per trade. Over 100 trades, that is +20R. It will also, almost certainly, produce streaks of five, six or seven losses in a row.",
              "The chart below is a realistic sequence of 50 trades from exactly that strategy. Look at the middle: six losses in a row. Most traders quit there, change strategy, or double their size to 'win it back'. The system was working the whole time.",
            ],
            fig: {
              type: "line",
              title: "50 trades, 40% win rate, +2R wins, -1R losses",
              tag: "Equity in R",
              series: [{ pts: eq, kind: "brand", fill: true, label: "+" + r + "R" }],
              zero: 0,
              marks: [{ at: [17, eq[17][1]], text: "Six losses in a row", kind: "down", pos: "below" }],
              xLabels: [[0, "Trade 0"], [25, "25"], [50, "50"]],
              yLabel: "R",
              caption: "The losing streak is not a malfunction. It is part of the edge. Your job is to still be following the plan on trade 18.",
            },
          },
          {
            h: "Decisions versus outcomes",
            ul: [
              "A good decision can lose money. A bad decision can make money. One trade tells you almost nothing.",
              "Judge each trade by whether you followed your plan, not by whether it won.",
              "Judge your strategy by a sample of at least 30 to 50 trades, not by this week.",
            ],
            note: "At The1% we score every trade twice: the result in R, and a process score for whether you followed the plan. Over time, the process score predicts the results.",
          },
        ],
        takeaways: [
          "Positive-expectancy strategies still produce long losing streaks.",
          "Judge trades by process, strategies by samples.",
          "The psychological edge is being able to keep executing through normal variance.",
        ],
        mistakes: [
          "Changing strategy after four or five losses.",
          "Calling a trade good because it won, even though it broke your rules.",
          "Raising size to recover losses quickly.",
        ],
        psych: "Write this somewhere you can see it: 'I am trading the next 100 trades, not the next one.'",
        practice: "Take your last 20 trades. Score each one 1 (followed plan) or 0 (did not). Compare the average R of the 1s and the 0s.",
        apply: { label: "Add a process score to your journal", href: "journal.html", why: "Tag every trade as 'plan followed' or 'plan broken'. The dashboard will separate the results." },
      },
      {
        id: "ps2",
        module: "The probability mindset",
        title: "Fear and greed: the emotional cycle",
        minutes: 8,
        summary: "The two emotions that drive markets also drive your decisions. They peak at the worst possible moments: greed at the top, fear at the bottom.",
        sections: [
          {
            h: "The cycle",
            fig: {
              type: "line",
              title: "The emotional cycle of a market move",
              tag: "Diagram",
              series: [{ pts: [[0, 30], [1, 42], [2, 58], [3, 72], [4, 84], [5, 74], [5.8, 62], [6.5, 48], [7.3, 30], [8, 16], [8.8, 20], [9.5, 28], [10, 36]], kind: "brand" }],
              yMin: 0, yMax: 100,
              marks: [
                { at: [1, 42], text: "Optimism", pos: "below" },
                { at: [2, 58], text: "Excitement", anchor: "end" },
                { at: [4, 84], text: "Euphoria: max risk", kind: "down" },
                { at: [5.8, 62], text: "Denial", anchor: "start" },
                { at: [6.5, 48], text: "Fear", anchor: "start" },
                { at: [7.3, 30], text: "Panic", anchor: "start" },
                { at: [8, 16], text: "Capitulation: max opportunity", kind: "up", pos: "below" },
                { at: [10, 36], text: "Hope", anchor: "end" },
              ],
              caption: "Traders feel safest buying near euphoria and most afraid buying near capitulation. That is exactly backwards.",
            },
          },
          {
            h: "What fear and greed look like in a trade",
            ul: [
              "Fear: skipping valid setups after a loss, closing winners too early, moving stops too tight.",
              "Greed: oversizing after wins, removing targets, adding to positions without a plan, trading more often.",
              "Both: making decisions during the trade that were not in the plan before it.",
            ],
          },
          {
            h: "The antidote",
            p: [
              "You cannot switch emotions off. You can move decisions to a time when emotions are quiet: before the market opens. Entry, stop, target and size are decided in advance, and the live trade is only execution.",
            ],
            note: "If you feel a strong emotion during a trade, that is a signal to follow the plan more strictly, not to improvise.",
          },
        ],
        takeaways: [
          "Greed peaks at tops, fear peaks at bottoms.",
          "Fear cuts winners and skips trades; greed oversizes and overtrades.",
          "Make decisions before the trade, when emotions are quiet.",
        ],
        mistakes: [
          "Trusting a strong feeling as a signal.",
          "Deciding size after seeing a big move.",
          "Closing a trade early 'to be safe' when the plan says hold.",
        ],
        psych: "Name the emotion out loud: 'I feel greedy right now.' Naming an emotion measurably reduces its grip.",
        practice: "For your next 10 trades, write one word for your emotion at entry and one at exit. Look for patterns.",
        apply: { label: "Log emotions with every trade", href: "journal.html", why: "The journal already records emotion. After 20 trades the dashboard shows your results by emotion." },
      },
      {
        id: "ps3",
        module: "The four account killers",
        title: "FOMO and chasing",
        minutes: 8,
        summary: "The fear of missing out makes you enter late, with a wide stop, at the worst price. Missing a trade costs nothing. Chasing one usually costs 1R.",
        sections: [
          {
            h: "Anatomy of a chased trade",
            fig: {
              title: "Planned entry versus FOMO entry",
              tag: "Comparison",
              n: 34, seed: 44, vol: 0.55,
              path: [[0, 104], [6, 101.5], [7, 101.8], [8, 101.4], [14, 110], [17, 112.6], [23, 108.2], [28, 109.8], [33, 108.6]],
              overlays: [
                { zone: [7, null, 101.1, 102], kind: "demand", label: "Planned: wait for the zone", labelPos: "below" },
                { hline: 112.4, from: 16, kind: "down", label: "FOMO entry" },
                { ring: [17, 112.6], kind: "down" },
                { label: "After 5 green candles", at: [17, 112.8], pos: "left", kind: "down" },
              ],
              caption: "The chase entry is at the top of the move, with no structure to put a stop behind. The pullback turns it into a loss.",
            },
          },
          {
            h: "Why FOMO happens",
            ul: [
              "Big moves are visible and social. Other traders post their wins.",
              "Your brain treats a missed gain like a loss, and losses hurt about twice as much as gains feel good.",
              "Boredom: after hours of waiting, any move feels like an opportunity.",
            ],
          },
          {
            h: "Rules that stop chasing",
            ul: [
              "No entry without a pre-marked level. If it was not on the chart before the move, it is not a setup.",
              "If price is more than 1R away from your planned entry, the trade is missed. Let it go.",
              "Keep a missed-trades list. It proves there will always be another setup.",
            ],
            note: "The market is open about 120 hours a week. There is no last trade.",
          },
        ],
        takeaways: [
          "Chased entries have the worst prices and the weakest stops.",
          "A missed trade is 0R. A chased trade is often -1R.",
          "Only trade levels you marked before the move.",
        ],
        mistakes: [
          "Entering after a run of big candles in one direction.",
          "Using a tiny stop on a chase entry to 'make the size work'.",
          "Following social media calls without your own plan.",
        ],
        psych: "When you feel FOMO, stand up. Physical distance for two minutes is often enough for the urge to pass.",
        practice: "Keep a missed-trades list for two weeks. For each one, record what would have happened if you had chased it.",
        apply: { label: "Check the chase with the calculator", href: "calculators.html", why: "Put the chase entry and a structural stop into the calculator. The size it gives you is usually the answer." },
      },
      {
        id: "ps4",
        module: "The four account killers",
        title: "Revenge trading and tilt",
        minutes: 9,
        summary: "One loss is a cost of business. The trades you take to win it back are what destroy accounts. Build circuit breakers before you need them.",
        sections: [
          {
            h: "How one loss becomes a disaster",
            fig: {
              type: "bars",
              title: "A revenge-trading day",
              tag: "Losses in R",
              max: 7.5,
              items: [
                { label: "Trade 1 (planned)", value: 1, text: "-1.0R", kind: "down" },
                { label: "Trade 2 (1.5x size)", value: 1.5, text: "-1.5R", kind: "down" },
                { label: "Trade 3 (no setup, 2x)", value: 2, text: "-2.0R", kind: "down" },
                { label: "Trade 4 ('get it back')", value: 3, text: "-3.0R", kind: "down" },
                { label: "Day total", value: 7.5, text: "-7.5R", kind: "warn" },
              ],
              caption: "The planned loss was 1R. The emotional response to it cost 6.5R more.",
            },
          },
          {
            h: "Recognising tilt",
            ul: [
              "Physical: faster heartbeat, tight jaw, leaning toward the screen.",
              "Mental: 'the market owes me', 'just one more', 'this has to turn'.",
              "Behavioural: bigger size, faster entries, skipping the checklist, trading unfamiliar markets.",
            ],
          },
          {
            h: "Circuit breakers",
            fig: {
              type: "flow",
              title: "The1% circuit breaker",
              tag: "Protocol",
              perRow: 5,
              steps: ["Loss taken", "Hands off the mouse", "Walk away for 15 minutes", "Journal the trigger", "Return only if rails allow"],
            },
            ul: [
              "Daily loss limit: stop trading at -3R (or -3%) for the day. No exceptions.",
              "Cool-off after two or three losses in a row.",
              "Maximum trades per day, set in your plan.",
            ],
            note: "The1% journal has these rails built in. Set them in Settings and the app warns you before the next trade.",
          },
        ],
        takeaways: [
          "The first loss is a cost; revenge trades are the disaster.",
          "Learn your personal tilt signals: body, thoughts, behaviour.",
          "Circuit breakers must be set in advance and never negotiated live.",
        ],
        mistakes: [
          "Increasing size after a loss.",
          "Trading a different market to 'find' a trade.",
          "Setting a daily limit and then moving it.",
        ],
        psych: "Write an if-then plan: 'If I lose two trades in a row, then I close the platform and walk for 15 minutes.' If-then plans are far more effective than intentions.",
        practice: "Write your three circuit breakers and your personal tilt signs. Put them on paper next to your screen.",
        apply: { label: "Set your daily rails", href: "settings.html", why: "Set the daily loss limit, trade cap and cool-off in Settings so the journal can enforce them." },
      },
      {
        id: "ps5",
        module: "The four account killers",
        title: "Loss aversion: cutting winners, holding losers",
        minutes: 9,
        summary: "Losses hurt about twice as much as equal gains feel good. That single bias makes traders take profits too early and let losses run.",
        sections: [
          {
            h: "The asymmetry",
            fig: {
              type: "line",
              title: "How gains and losses feel",
              tag: "Diagram",
              series: [{ pts: vf, kind: "brand" }],
              zero: 0,
              marks: [
                { at: [6, Math.pow(6, 0.88)], text: "A gain feels good", kind: "up", anchor: "end" },
                { at: [-6, -2.25 * Math.pow(6, 0.88)], text: "The same loss feels about twice as bad", kind: "down", anchor: "start", pos: "below" },
              ],
              xLabels: [[-10, "Loss"], [0, "0"], [10, "Gain"]],
              caption: "Behavioural research on loss aversion suggests a loss weighs roughly twice as heavily as an equal gain.",
            },
          },
          {
            h: "What it does to your results",
            p: [
              "To avoid the pain of a winner turning into a loser, you close winners early. To avoid the pain of taking a loss, you hold losers and hope. The result is small wins and big losses, which can make even a 60% win rate lose money.",
            ],
            fig: {
              type: "bars",
              title: "Same strategy, two traders",
              tag: "Average R",
              max: 1.6,
              items: [
                { label: "Disciplined: avg win", value: 1.6, text: "+1.6R", kind: "up" },
                { label: "Disciplined: avg loss", value: 1, text: "-1.0R", kind: "down" },
                { label: "Loss-averse: avg win", value: 0.8, text: "+0.8R", kind: "up" },
                { label: "Loss-averse: avg loss", value: 1.5, text: "-1.5R", kind: "down" },
              ],
              caption: "At a 55% win rate the disciplined trader makes +0.43R per trade. The loss-averse trader loses -0.24R per trade.",
            },
          },
          {
            h: "Fixes",
            ul: [
              "Set the target and stop before entry, and let one of them be hit.",
              "Use partial profits at a fixed R (for example 2R) so the urge to close early has a planned outlet.",
              "Track your average win and average loss in R every week.",
            ],
          },
        ],
        takeaways: [
          "Losses feel about twice as bad as equal gains.",
          "Loss aversion causes small wins and big losses.",
          "Pre-set stops, targets and partials neutralise it.",
        ],
        mistakes: [
          "Moving the stop away when price approaches it.",
          "Closing at +0.5R 'because it might come back'.",
          "Averaging down into a losing position without a plan.",
        ],
        psych: "Before closing a trade early, ask: 'Is this in my plan, or is this pain avoidance?'",
        practice: "Calculate your average win and average loss in R for your last 30 trades. If the loss is larger than the win, this lesson is your leak.",
        apply: { label: "See your average win and loss", href: "dashboard.html", why: "The dashboard shows your average R by outcome. It is the fastest way to see loss aversion in your own numbers." },
      },
      {
        id: "ps6",
        module: "Confidence and consistency",
        title: "Winning streaks and overconfidence",
        minutes: 8,
        summary: "Winning streaks feel like skill. Raising risk because of them is how many traders give back months of gains in one week.",
        sections: [
          {
            h: "The streak trap",
            fig: {
              type: "line",
              title: "The same 30 trades: fixed 1% risk versus risk that grows with confidence",
              tag: "Account %",
              series: [
                { pts: fixed, kind: "up" },
                { pts: hot, kind: "down" },
              ],
              marks: [{ at: [7, hot[7][1]], text: "Seven wins in a row, risk now 5%", kind: "down", anchor: "start" }, { at: [11, hot[11][1]], text: "Risk grows after wins: -41% from peak", kind: "down", anchor: "start" }, { at: [5, fixed[5][1]], text: "Fixed 1%", kind: "up", pos: "below", anchor: "start" }],
              xLabels: [[0, "Trade 0"], [15, "15"], [30, "30"]],
              caption: "Same trades, same win rate. Raising risk after the hot streak turned a normal losing run into a 41% drawdown. At a fixed 1% the worst drawdown was under 10%, and the account still finished ahead.",
            },
          },
          {
            h: "Signs of overconfidence",
            ul: [
              "Skipping the checklist because 'I can see it'.",
              "Trading bigger or more often after a good week.",
              "Taking setups outside your plan because you feel in form.",
            ],
          },
          {
            h: "Rules for raising risk",
            ul: [
              "Raise risk only on a schedule, based on a sample (for example after 50 trades with positive expectancy).",
              "Raise in small steps, for example from 1% to 1.25%.",
              "Drop back immediately after a set drawdown.",
            ],
          },
        ],
        takeaways: [
          "Streaks are normal variance, not proof of new skill.",
          "Never raise risk because of how you feel.",
          "Raise risk on a schedule, in small steps, and step down fast.",
        ],
        mistakes: [
          "Doubling size after a great week.",
          "Loosening rules when winning.",
          "Believing the next loss will not come.",
        ],
        psych: "After a big win, the best trade is often no trade. Take the rest of the day off and let the excitement settle.",
        practice: "Write your risk-scaling rules: when you may raise risk, by how much, and when you must lower it.",
        apply: { label: "Model a streak in the simulator", href: "calculators.html#sim", why: "Run your win rate through the P&L simulator and look at the worst streaks it produces." },
      },
      {
        id: "ps7",
        module: "Confidence and consistency",
        title: "The routine that protects you",
        minutes: 10,
        summary: "Discipline is not willpower. It is a routine that makes the right action the default. Build one for before, during and after every session.",
        sections: [
          {
            h: "The1% daily routine",
            fig: {
              type: "flow",
              title: "Before, during and after the session",
              tag: "Routine",
              perRow: 4,
              steps: [
                "Check sleep, mood and stress (1 to 5)",
                "Read the calendar for high-impact news",
                "Mark levels and write the plan",
                "Set alerts, not screen time",
                "Execute only planned setups",
                "Log each trade with emotion",
                "Stop at rails or end of window",
                "Review: one lesson, one change",
              ],
            },
          },
          {
            h: "Readiness check",
            p: [
              "Before trading, rate your sleep, mood and stress from 1 to 5. If any score is 1 or 2, trade at half size or not at all. You would not drive tired; do not trade tired either.",
            ],
          },
          {
            h: "The weekly review",
            ul: [
              "What was my process score this week?",
              "Which rule did I break most often, and what triggered it?",
              "What is the one change for next week? Only one.",
            ],
            note: "Use the weekly review worksheet in the resource library. It is designed to fit in 20 minutes.",
          },
        ],
        takeaways: [
          "Routines beat willpower.",
          "Check readiness before you trade, and reduce size when you are not.",
          "Review weekly and make one change at a time.",
        ],
        mistakes: [
          "Opening charts without a plan and 'seeing what happens'.",
          "Skipping the review after a winning week.",
          "Trying to fix ten things at once.",
        ],
        psych: "Consistency is built on boring days. The routine matters most on the days you least want to follow it.",
        practice: "Follow the eight-step routine for ten trading days. Tick each step. Then compare your process score with the ten days before.",
        apply: { label: "Download the weekly review", href: "learn.html#library", why: "The weekly review worksheet turns this lesson into a 20-minute habit." },
      },
    ],
    quiz: [
      { q: "A strategy wins 40% of trades at +2R and loses 1R otherwise. Its expectancy per trade is…", options: ["-0.2R", "0R", "+0.2R", "+0.8R"], a: 2, why: "0.4 × 2 − 0.6 × 1 = +0.2R.", lesson: "ps1" },
      { q: "The best way to judge a single trade is by…", options: ["Whether it won", "Whether you followed your plan", "How it felt", "What others did"], a: 1, why: "Outcomes of single trades are noisy. Process is what you control.", lesson: "ps1" },
      { q: "In the emotional cycle, the point of maximum financial risk is…", options: ["Capitulation", "Euphoria", "Hope", "Despondency"], a: 1, why: "Euphoria comes at the top, when buying feels safest.", lesson: "ps2" },
      { q: "The best time to decide entry, stop, target and size is…", options: ["During the trade", "Before the trade, when emotions are quiet", "After the trade", "When the news comes out"], a: 1, why: "Moving decisions before the trade removes emotion from them.", lesson: "ps2" },
      { q: "Price has moved 2R past your planned entry. What does The1% rule say?", options: ["Chase with a tighter stop", "The trade is missed; let it go", "Double the size", "Enter with no stop"], a: 1, why: "If price is more than 1R away from the planned entry, the trade is missed.", lesson: "ps3" },
      { q: "In the revenge-trading example, the planned loss was 1R. The day ended at…", options: ["-1R", "-3R", "-7.5R", "+1R"], a: 2, why: "The emotional follow-up trades added 6.5R of losses.", lesson: "ps4" },
      { q: "Which is a circuit breaker?", options: ["Increasing size after a loss", "A daily loss limit set in advance", "Trading a new market", "Removing your stop"], a: 1, why: "A pre-set daily loss limit stops the spiral.", lesson: "ps4" },
      { q: "Loss aversion typically causes traders to…", options: ["Let winners run and cut losers", "Cut winners early and hold losers", "Trade less", "Use smaller size"], a: 1, why: "Avoiding the pain of loss leads to small wins and big losses.", lesson: "ps5" },
      { q: "After seven wins in a row, you should…", options: ["Double your risk", "Keep risk the same unless your written scaling rules say otherwise", "Stop using stops", "Trade more markets"], a: 1, why: "Streaks are variance. Risk changes only on a schedule.", lesson: "ps6" },
      { q: "Your readiness check shows sleep at 2 out of 5. The routine says…", options: ["Trade normally", "Trade at half size or not at all", "Trade double to finish early", "Skip the stop-loss"], a: 1, why: "Low readiness means reduced size or no trading.", lesson: "ps7" },
    ],
  });
})();
