/* The1% Academy — Risk Management Masterclass (full course) */
(() => {
  /* rm6: gain needed to recover from a drawdown, gain = d / (1 - d) */
  const rec = [];
  for (let d = 0; d <= 60; d += 5) rec.push([d, +((100 * d) / (100 - d)).toFixed(1)]);

  Academy.register("risk-management", {
    hours: 5,
    outcomes: [
      "Explain why professional traders risk around 1% per trade, using the maths of losing streaks.",
      "Calculate the correct position size for any account, instrument and stop distance.",
      "Place stops at structure, measure every trade in R, and know the win rate your strategy needs.",
      "Run daily rails and a drawdown plan that keep one bad week from becoming a blown account.",
    ],
    lessons: [
      {
        id: "rm1",
        module: "The rule",
        title: "Why 1%: the maths of survival",
        minutes: 9,
        summary: "Losing streaks are guaranteed. Your risk per trade decides whether a streak is an annoyance or the end of the account.",
        sections: [
          {
            h: "Streaks are normal",
            p: [
              "A strategy that wins 45% of the time will, over a few hundred trades, almost certainly hit eight or more losses in a row. That is not bad luck; it is what 45% means. The only question is how much of the account is left afterwards.",
            ],
            fig: {
              type: "bars",
              title: "Account left after 10 losses in a row",
              tag: "% of starting balance",
              max: 100,
              items: [
                { label: "Risk 1% per trade", value: 90.4, text: "90.4%", kind: "up" },
                { label: "Risk 2% per trade", value: 81.7, text: "81.7%", kind: "brand" },
                { label: "Risk 5% per trade", value: 59.9, text: "59.9%", kind: "warn" },
                { label: "Risk 10% per trade", value: 34.9, text: "34.9%", kind: "down" },
              ],
              caption: "At 1%, ten losses cost under 10%. At 10%, the same streak costs two thirds of the account, and the trader needs a 187% gain just to get back.",
            },
          },
          {
            h: "Risk of ruin",
            p: [
              "Risk of ruin is the chance of losing so much that you can no longer trade your plan. It rises very fast with risk per trade. Keeping risk small does not make you less profitable over time; it keeps you in the game long enough for your edge to show.",
            ],
            note: "The1% default: risk 1% of the account per trade. Newer traders and prop firm challenges often use 0.5%.",
          },
        ],
        takeaways: [
          "Losing streaks are a certainty, not a possibility.",
          "Risk per trade decides how deep a streak goes.",
          "1% per trade survives almost any normal streak.",
        ],
        mistakes: [
          "Raising risk to 'make it back faster'.",
          "Thinking a high win rate makes big risk safe.",
          "Measuring risk in lots instead of as a percent of the account.",
        ],
        psych: "Small risk is what makes calm possible. It is hard to follow a plan when one trade can decide your month.",
        practice: "Find your longest losing streak in the journal. Calculate what it would have cost at 1%, 2% and 5% risk.",
        apply: { label: "Set your risk rail", href: "journal.html", why: "Set your default risk per trade in the journal so every trade is checked against it." },
      },
      {
        id: "rm2",
        module: "The rule",
        title: "Position sizing for any market",
        minutes: 11,
        summary: "The lot size is the last thing you decide, not the first. It comes from your risk, your stop distance and the value of one unit of movement.",
        sections: [
          {
            h: "The formula",
            fig: {
              type: "flow",
              title: "From risk to position size",
              tag: "Formula",
              perRow: 4,
              steps: ["Money at risk: account × 1%", "Stop distance, read from the chart", "Value of one unit per lot", "Size: risk ÷ (stop × unit value)"],
            },
          },
          {
            h: "Two worked examples",
            ul: [
              "Forex: $5,000 account, 1% = $50. EUR/USD stop is 25 pips. One standard lot is worth about $10 per pip. Size = 50 ÷ (25 × 10) = 0.20 lots.",
              "Gold: same $50 risk. Stop is $4.00 away. One lot is 100 ounces, so a $4 move is $400 per lot. Size = 50 ÷ 400 = 0.125, rounded down to 0.12 lots.",
              "Always round down. Rounding up means risking more than you planned.",
            ],
            note: "Pip and point values change with the instrument and your account currency. Use the position size calculator rather than memorising them.",
          },
          {
            h: "The stop sets the size, not the other way round",
            p: [
              "Beginners pick a lot size they like and squeeze the stop to fit. Professionals put the stop where the idea is wrong and let the size shrink to fit. A wider stop simply means a smaller position; the money at risk stays the same.",
            ],
          },
        ],
        takeaways: [
          "Size = money at risk ÷ (stop distance × value per unit).",
          "Put the stop at structure first, then size.",
          "Round down, always.",
        ],
        mistakes: [
          "Using the same lot size on every trade.",
          "Tightening the stop to afford a bigger size.",
          "Forgetting that gold, indices and JPY pairs have different unit values.",
        ],
        psych: "When the size is calculated, not chosen, a loss is just the planned cost. That removes most of the sting.",
        practice: "Calculate the size for five of your recent trades using the formula, then check each with the calculator.",
        apply: { label: "Open the position size calculator", href: "calculators.html", why: "Enter your account, risk and stop to get the exact lot size for any instrument." },
      },
      {
        id: "rm3",
        module: "Stops and R",
        title: "Stops that respect structure",
        minutes: 9,
        summary: "A stop belongs where your trade idea is proved wrong, plus a buffer. Anywhere else, it is either too tight or pointlessly wide.",
        sections: [
          {
            h: "Structure stops versus comfort stops",
            p: [
              "A structure stop sits beyond the swing, zone or wick that your idea depends on. A comfort stop is a round number of pips chosen because it 'feels' right. Comfort stops tend to sit exactly where normal pullbacks reach.",
            ],
            fig: {
              title: "Tight comfort stop versus structure stop",
              tag: "Comparison",
              n: 32, seed: 61, vol: 0.5,
              path: [[0, 101], [7, 106], [11, 103.2], [13, 104.8], [16, 103.6], [17, 103.4], [24, 108.5], [31, 111]],
              wicks: [[17, 102.9]],
              overlays: [
                { hline: 103.8, from: 11, to: 24, kind: "warn", label: "Comfort stop (10 pips): hit" },
                { hline: 102.5, from: 11, to: 24, kind: "down", label: "Structure stop: below the higher low", labelPos: "below" },
                { ring: [17, 102.9], kind: "warn" },
              ],
              caption: "The pullback tagged the comfort stop and then rallied. The structure stop sat below the higher low and survived.",
            },
          },
          {
            h: "Volatility and buffers",
            ul: [
              "Add a buffer beyond the level: spread plus a small margin for noise.",
              "On volatile instruments, use a fraction of the average true range as the buffer.",
              "Never move a stop further away once the trade is live. You can only move it closer.",
            ],
          },
          {
            h: "On a real chart: tight stop versus structure stop",
            p: [
              "EURUSD 4H in April 2025, the demand retest from the supply and demand course. A stop placed a few pips under the entry was taken by one wick on 8 April. A stop below the whole zone survived, and the trade went on to gain more than 400 pips.",
              "The structure stop was wider, so the position had to be smaller. Same risk in money, very different outcome."
            ],
            fig: {
              type: "shot",
              src: "rm-stops-eurusd",
              title: "Same idea, two stops",
              caption: "Size the position from the stop, never the stop from the position.",
              meta: "EURUSD · 4H · Apr 2025",
              alt: "EURUSD 4 hour chart comparing a tight stop that was hit with a structure stop that held"
            }
          },
        ],
        takeaways: [
          "Stop where the idea is wrong, plus a buffer.",
          "Structure first, size second.",
          "Stops only move in your favour.",
        ],
        mistakes: [
          "Round-number comfort stops.",
          "Stops exactly on the level, with no buffer.",
          "Widening a stop to avoid a loss.",
        ],
        psych: "Moving a stop wider is hope disguised as analysis. Decide the stop before entry, when you are calm, and never touch it in the wrong direction.",
        practice: "Review your last ten losing trades. How many stops were at structure, and how many were comfort stops?",
        apply: { label: "Review in the journal", href: "journal.html", why: "Filter your losses and check each stop against the chart." },
      },
      {
        id: "rm4",
        module: "Stops and R",
        title: "R multiples and expectancy",
        minutes: 10,
        summary: "Measure every trade in R, the amount you risked. Then one number, expectancy, tells you whether your strategy makes money.",
        sections: [
          {
            h: "Thinking in R",
            p: [
              "If you risk $50 and make $100, that trade is +2R. If you lose the planned $50, it is -1R. Measuring in R removes account size from the picture, so you can compare trades, months and strategies fairly.",
              "Expectancy = (win rate × average win in R) − (loss rate × average loss in R). A strategy that wins 40% at +2R and loses 60% at -1R has an expectancy of 0.4 × 2 − 0.6 × 1 = +0.2R per trade.",
            ],
          },
          {
            h: "The win rate you actually need",
            fig: {
              type: "bars",
              title: "Break-even win rate by reward-to-risk",
              tag: "Before costs",
              max: 50,
              items: [
                { label: "1 : 1", value: 50, text: "50%", kind: "down" },
                { label: "1.5 : 1", value: 40, text: "40%", kind: "warn" },
                { label: "2 : 1", value: 33.3, text: "33.3%", kind: "brand" },
                { label: "3 : 1", value: 25, text: "25%", kind: "up" },
              ],
              caption: "Break-even win rate = 1 ÷ (1 + reward). At 3:1 you can lose three trades out of four and still break even.",
            },
            note: "Costs matter. Spread and commission reduce every win and increase every loss, so the real break-even win rate is a little higher.",
          },
          {
            h: "On a real chart: a 3R trade",
            p: [
              "Gold in late August 2025. A long from 3,372 after the higher low, stop at 3,310 below the low, target 3,558 just above the prior high. Risk 62 dollars per ounce to make 186: a 3R trade. It hit target within eight sessions.",
              "At 3R, you can be wrong on two trades out of three and still break even. That is why R, not win rate, is the number to track."
            ],
            fig: {
              type: "shot",
              src: "rm-position-gold",
              title: "Entry, stop and target in R",
              caption: "Risk box drawn with The1% position tool: red is 1R of risk, green is the reward.",
              meta: "XAUUSD · 1D · Sep 2025",
              alt: "Gold daily chart with a long position box showing a 3R target"
            }
          },
        ],
        takeaways: [
          "Record every trade in R.",
          "Expectancy tells you if the strategy works; one trade does not.",
          "Higher reward-to-risk lowers the win rate you need.",
        ],
        mistakes: [
          "Judging a strategy on a handful of trades.",
          "Chasing a high win rate with tiny targets.",
          "Ignoring costs in the calculation.",
        ],
        psych: "When you think in R, a single loss is just -1R in a long series. That is how you stop taking losses personally.",
        practice: "Calculate your expectancy from your last 30 trades in the journal. Is it positive after costs?",
        apply: { label: "See your expectancy", href: "journal.html", why: "The journal calculates your R and expectancy automatically once trades have a stop." },
      },
      {
        id: "rm5",
        module: "Rails",
        title: "Daily rails: loss limit, trade cap and cool-off",
        minutes: 8,
        summary: "Rails are rules that stop trading for you before emotion can. They turn a bad day into a small, planned loss.",
        sections: [
          {
            h: "The three rails",
            ul: [
              "Daily loss limit: stop trading for the day at -2R or -2% (half that on prop challenges).",
              "Trade cap: a maximum number of trades per day, for example three. Overtrading usually starts after the third trade.",
              "Cool-off: after any loss, 15 minutes away from the screen before the next decision.",
            ],
            fig: {
              type: "flow",
              title: "The1% rails protocol",
              tag: "Protocol",
              perRow: 5,
              steps: ["Loss taken", "Check the rails", "Rail hit? Stop for the day", "Not hit? 15-minute cool-off", "Return with a planned setup only"],
            },
          },
          {
            h: "Weekly and monthly limits",
            p: [
              "Add a weekly limit (for example -5R) and a monthly one (-8R). Hitting a larger limit means a review, not just a pause: reduce risk, go back to the journal, and find what changed.",
            ],
          },
        ],
        takeaways: [
          "Rails are decided in advance, not in the moment.",
          "Daily loss limit, trade cap and cool-off work together.",
          "Bigger limits trigger a review, not just a break.",
        ],
        mistakes: [
          "Setting rails and ignoring them 'just this once'.",
          "Setting the daily limit so wide it never triggers.",
          "Trading a new setup straight after a loss.",
        ],
        psych: "The moment you most want to keep trading is the moment the rail exists for. Rails are a promise to yourself, made when you were thinking clearly.",
        practice: "Write your daily, weekly and monthly limits. Put them where you can see them while you trade.",
        apply: { label: "Turn on guardrails", href: "journal.html", why: "Enable the journal guardrails so it warns you when you hit a rail." },
      },
      {
        id: "rm6",
        module: "Drawdown control",
        title: "Drawdown, recovery maths and step-down sizing",
        minutes: 10,
        summary: "Losses and recoveries are not symmetrical. The deeper the drawdown, the harder the climb back, which is why you cut size before it gets deep.",
        sections: [
          {
            h: "The recovery curve",
            fig: {
              type: "line",
              title: "Gain needed to recover from a drawdown",
              tag: "Percent",
              series: [{ pts: rec, kind: "down" }],
              yMin: 0, yMax: 160,
              marks: [
                { at: [10, rec[2][1]], text: "-10% needs +11%", kind: "up", pos: "below", anchor: "start" },
                { at: [30, rec[6][1]], text: "-30% needs +43%", kind: "warn", anchor: "end" },
                { at: [50, rec[10][1]], text: "-50% needs +100%", kind: "down", anchor: "end" },
              ],
              xLabels: [[0, "0% drawdown"], [30, "30%"], [60, "60%"]],
              caption: "A 50% loss needs a 100% gain to recover. Keeping drawdowns shallow is far easier than climbing out of deep ones.",
            },
          },
          {
            h: "Step-down sizing",
            ul: [
              "At -5% from the account peak: cut risk per trade in half (1% to 0.5%).",
              "At -10%: cut again to 0.25% and trade only A-grade setups.",
              "Return to normal risk only after recovering half of the drawdown.",
              "Never increase risk to recover faster.",
            ],
            note: "Step-down sizing makes the curve bend the right way: losses get smaller as the drawdown deepens, while your edge keeps working.",
          },
        ],
        takeaways: [
          "Losses and gains are not symmetrical.",
          "Cut risk as the drawdown deepens.",
          "Recover first, then return to normal size.",
        ],
        mistakes: [
          "Doubling risk to win it back.",
          "Measuring drawdown from the starting balance instead of the peak.",
          "Returning to full size after one good trade.",
        ],
        psych: "Drawdown is when fear and hope are loudest. A written step-down plan means you only have to follow it, not invent one under pressure.",
        practice: "Write your step-down plan with exact drawdown levels and risk per trade at each. Add it to your trading plan.",
        apply: { label: "Open the risk worksheet", href: "learn.html#mc/risk-management/read/risk-plan", why: "Fill in The1% Risk Plan Worksheet with your rails and step-down levels." },
      },
    ],
    quiz: [
      { q: "Why do professional traders risk around 1% per trade?", options: ["Brokers require it", "It keeps normal losing streaks survivable", "It guarantees profit", "It reduces spreads"], a: 1, why: "Small risk keeps drawdowns shallow during streaks.", lesson: "rm1" },
      { q: "After 10 losses in a row at 10% risk per trade, about how much of the account is left?", options: ["90%", "65%", "35%", "0%"], a: 2, why: "0.9 to the power of 10 is about 0.35.", lesson: "rm1" },
      { q: "$5,000 account, 1% risk, 25-pip stop, $10 per pip per lot. The size is…", options: ["2.0 lots", "0.5 lots", "0.2 lots", "0.02 lots"], a: 2, why: "50 ÷ (25 × 10) = 0.2 lots.", lesson: "rm2" },
      { q: "When the stop needs to be wider, you should…", options: ["Keep the same lot size", "Reduce the position size so the risk stays the same", "Skip the stop", "Double the risk"], a: 1, why: "The money at risk stays fixed; the size adjusts.", lesson: "rm2" },
      { q: "A structure stop goes…", options: ["At a round number of pips", "Beyond the level where the idea is proved wrong, plus a buffer", "At the entry", "Anywhere that feels safe"], a: 1, why: "The stop belongs where the idea fails.", lesson: "rm3" },
      { q: "Once a trade is live, a stop may…", options: ["Move further away", "Only move closer, in your favour", "Be removed", "Be doubled"], a: 1, why: "Widening a stop turns a planned loss into an unplanned one.", lesson: "rm3" },
      { q: "40% win rate, +2R wins, -1R losses. Expectancy is…", options: ["-0.2R", "0R", "+0.2R", "+0.8R"], a: 2, why: "0.4 × 2 − 0.6 × 1 = +0.2R.", lesson: "rm4" },
      { q: "At a 3:1 reward-to-risk, the break-even win rate is…", options: ["50%", "33%", "25%", "10%"], a: 2, why: "1 ÷ (1 + 3) = 25%.", lesson: "rm4" },
      { q: "Which is NOT one of The1% daily rails?", options: ["Daily loss limit", "Trade cap", "Cool-off after a loss", "Doubling size after a loss"], a: 3, why: "Doubling after a loss is revenge trading, the opposite of a rail.", lesson: "rm5" },
      { q: "A 50% drawdown needs what gain to recover?", options: ["50%", "75%", "100%", "150%"], a: 2, why: "Half the account must double to get back.", lesson: "rm6" },
    ],
  });
})();
