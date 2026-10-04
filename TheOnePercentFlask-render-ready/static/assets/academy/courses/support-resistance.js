/* The1% Academy — Support & Resistance Masterclass (full course) */
Academy.register("support-resistance", {
  hours: 4,
  outcomes: [
    "Explain why levels exist: memory, unfilled orders and the traders who remember a price.",
    "Draw levels as zones from reactions, not as thin lines through wicks.",
    "Recognise role reversal and trade the break-and-retest with a defined stop.",
    "Grade a level's strength and recognise when a level is about to fail.",
  ],
  lessons: [
    {
      id: "sr1",
      module: "Levels",
      title: "What makes a level",
      minutes: 8,
      summary: "Support is a price where buying has repeatedly beaten selling. Resistance is where selling has beaten buying. Levels exist because traders remember prices, and because orders are left there.",
      sections: [
        {
          h: "Why price remembers",
          p: [
            "When price turns sharply at a level, three groups of traders are created. Those who bought there and are in profit want to buy more if it comes back. Those who sold there and are losing want to get out at break-even. Those who missed it want a second chance. All three place orders near the same price.",
            "That cluster of intentions is why a level often works the second time. It is also why a level eventually breaks: each test uses up some of those orders.",
          ],
          fig: {
            type: "flow",
            title: "Where the orders at a level come from",
            tag: "Mechanism",
            perRow: 3,
            steps: ["Price reverses hard at 1.0800", "Winners want to add on a return", "Losers want to exit at break-even", "Latecomers want a second chance", "All place orders near 1.0800", "The level reacts again, or finally breaks"],
          },
        },
        {
          h: "Levels worth marking",
          ul: [
            "Swing highs and lows where price reversed with force.",
            "Areas price reacted to more than once, from either side.",
            "Previous day, week and month highs and lows.",
            "Round numbers: 1.1000 on EURUSD, 3,000 on gold, 100,000 on bitcoin.",
            "The edges of a range that held for weeks.",
          ],
          note: "If you have more than four or five levels on a chart, you have noise. Keep the ones where price clearly turned.",
        },
      ],
      takeaways: [
        "Levels are prices where many traders have unfinished business.",
        "Each test uses up orders; levels weaken with use.",
        "Mark only levels with a clear, forceful reaction.",
      ],
      mistakes: [
        "Drawing a line at every small wiggle.",
        "Marking levels on a 5-minute chart and ignoring the daily.",
        "Assuming a level will hold forever.",
      ],
      psych: "A chart full of lines gives you a reason to take any trade. Fewer levels means fewer, better decisions.",
      practice: "On the EURUSD daily chart, mark only the three most obvious levels from the last six months. Compare with what you would have marked before this lesson.",
      apply: { label: "Mark levels on the chart", href: "charts.html", why: "Open the daily chart and draw your three levels before you look at any lower timeframe." },
    },
    {
      id: "sr2",
      module: "Levels",
      title: "Zones, not lines",
      minutes: 9,
      summary: "Price does not respect a level to the pip. Draw a zone that covers where the reaction really happened, and you stop being shaken out by a few pips of noise.",
      sections: [
        {
          h: "How to draw a zone",
          ul: [
            "Start on the higher timeframe (daily or 4H).",
            "Find the reaction candles: the bodies and wicks where price turned.",
            "Draw from the extreme wick to the closest body edge that shares the reaction.",
            "If a zone is wider than about one daily ATR, it is too wide. Narrow it to the densest part.",
          ],
        },
        {
          h: "On a real chart: range edges as zones",
          p: [
            "EURUSD from July to November 2025 is a good example. The top of the range was not a single price; sellers appeared anywhere between roughly 1.1730 and 1.1790. The bottom held between about 1.1400 and 1.1500. A line at one exact price would have been broken again and again by wicks.",
          ],
          fig: {
            type: "shot",
            src: "sr-range-eurusd",
            title: "Range edges drawn as zones",
            tag: "Real chart",
            caption: "Zones absorb normal noise. The middle of the range, around 1.1594, offered no edge in either direction.",
            meta: "EURUSD · 1D · Jul to Nov 2025",
            alt: "EURUSD daily chart with resistance and support zones marking a range",
          },
        },
        {
          h: "Round numbers",
          p: [
            "Big round numbers act as levels because people place orders there: take-profits, limit orders and option strikes cluster at 1.1000, 1.2000, 2,000 or 3,000. They are not magic, but they add weight when they line up with a structural level.",
          ],
        },
      ],
      takeaways: [
        "A level is a zone, usually from wick extreme to the nearest body edge.",
        "Keep zones narrower than about one daily ATR.",
        "Round numbers add weight when they agree with structure.",
      ],
      mistakes: [
        "Stops placed exactly on the line, inside the zone.",
        "Zones so wide they cover half the chart.",
        "Treating every round number as a level by itself.",
      ],
      psych: "A zone forces you to accept that you cannot know the exact turning price. That acceptance is the start of trading probabilities.",
      practice: "Redraw your three levels from the last lesson as zones. Check that each is narrower than the daily ATR.",
      apply: { label: "Check the daily ATR", href: "charts.html", why: "Add ATR(14) on the daily chart and compare it with the width of your zones." },
    },
    {
      id: "sr3",
      module: "Role reversal",
      title: "Broken resistance becomes support",
      minutes: 9,
      summary: "When price breaks decisively through resistance, that level often becomes support on the way back. This is called role reversal, and the retest is one of the cleanest entries in price action.",
      sections: [
        {
          h: "Why levels flip",
          p: [
            "Traders who sold at resistance are now losing after the break. When price returns to their entry, many buy back to exit at break-even. Traders who missed the breakout see the retest as their chance to buy. Both groups add buying at the old resistance.",
          ],
        },
        {
          h: "On a real chart: gold in 2025",
          p: [
            "Gold failed twice near 2,955 to 2,974 in February 2025. On 13 March it closed above the zone. On 7 April, in a sharp sell-off, price came back down to 2,970 and held almost to the dollar. Two weeks later it traded above 3,500.",
          ],
          fig: {
            type: "shot",
            src: "sr-flip-gold",
            title: "Resistance, break, retest as support",
            tag: "Real chart",
            caption: "The break needed a daily close above the zone. The retest gave a clear place for the stop: below the zone.",
            meta: "XAUUSD · 1D · Feb to Apr 2025",
            alt: "Gold daily chart where resistance near 2,970 was broken and then held as support",
          },
        },
      ],
      takeaways: [
        "Broken resistance tends to act as support, and broken support as resistance.",
        "A decisive close through the level is the first requirement.",
        "The retest gives a defined stop beyond the zone.",
      ],
      mistakes: [
        "Calling a wick through the level a break.",
        "Buying the breakout candle itself, far from the level.",
        "Placing the stop inside the zone instead of beyond it.",
      ],
      psych: "The retest often comes during scary price action. That fear is part of why it works: most traders will not buy there.",
      practice: "Find two role reversals on the gold or EURUSD daily chart in the last year. Note how far price came back and whether it closed back inside the zone.",
      apply: { label: "Log a retest idea", href: "journal.html", why: "Write down the next role-reversal retest you see, before it happens, and review the outcome." },
    },
    {
      id: "sr4",
      module: "Strength",
      title: "Grading a level",
      minutes: 8,
      summary: "Not all levels are equal. Score each one on how price left it, how often it has been tested, and how it fits the bigger picture.",
      sections: [
        {
          h: "The1% level score",
          ul: [
            "Reaction: did price leave the level with force (big candles, several ATR)? +2",
            "Timeframe: is it visible on the daily or weekly? +2",
            "Freshness: tested fewer than three times? +1",
            "Confluence: round number, previous day or week high or low, or a zone from another method? +1",
            "Trend: does trading it put you with the higher-timeframe trend? +2",
          ],
          fig: {
            type: "bars",
            title: "How to use the score",
            tag: "Out of 8",
            max: 8,
            items: [
              { label: "6 to 8 points", value: 7, text: "Trade", kind: "up" },
              { label: "4 to 5 points", value: 4.5, text: "Confirm", kind: "brand" },
              { label: "0 to 3 points", value: 2, text: "Skip", kind: "down" },
            ],
            caption: "6 to 8: an A-grade level, trade it. 4 to 5: trade only with a confirmation candle. 0 to 3: skip it.",
          },
        },
        {
          h: "Touches: help first, then hurt",
          p: [
            "A second clear touch confirms a level. After the third or fourth, each test uses up the resting orders, and the level becomes more likely to break. Levels that price keeps pressing against, with smaller and smaller bounces, are usually about to fail.",
          ],
          note: "Rising lows pressing into flat resistance is a classic sign of a coming break upwards. Falling highs into flat support is the reverse.",
        },
      ],
      takeaways: [
        "Score levels on reaction, timeframe, freshness, confluence and trend.",
        "Two touches confirm; many touches weaken.",
        "Pressing with smaller bounces warns of a break.",
      ],
      mistakes: [
        "Believing more touches always means stronger.",
        "Trading a 15-minute level against the daily trend.",
        "Skipping the score because the setup 'looks obvious'.",
      ],
      psych: "A score removes the story. You stop trading levels because you like them and start trading them because they qualify.",
      practice: "Score the three zones on your EURUSD chart. Keep only the ones with 6 or more.",
      apply: { label: "Add the score to your journal", href: "journal.html", why: "Record the level score with each trade to see which grades actually pay." },
    },
    {
      id: "sr5",
      module: "Trading levels",
      title: "Bounce, break and retest",
      minutes: 10,
      summary: "There are two ways to trade a level: fade it (the bounce) or trade through it (the break and retest). Each has its own entry, stop and conditions.",
      sections: [
        {
          h: "The bounce",
          ul: [
            "Context: a range, or a pullback in a trend back to a level.",
            "Trigger: a rejection candle at the zone, such as a hammer, pin bar or engulfing.",
            "Stop: beyond the zone and the rejection wick.",
            "Target: the opposite side of the range, or the last swing in the trend direction.",
          ],
          fig: {
            type: "shot",
            src: "cs-engulf-eurusd",
            title: "A bounce at support",
            tag: "Real chart",
            caption: "A bullish engulfing candle at support. The stop goes under the low of the pattern, below the zone.",
            meta: "EURUSD · 1D · Aug 2024",
            alt: "EURUSD daily chart with a bullish engulfing bounce from support",
          },
        },
        {
          h: "The break and retest",
          ul: [
            "Context: a level that price has pressed repeatedly, in the direction of the higher-timeframe trend.",
            "Trigger: a candle closes decisively beyond the zone.",
            "Entry: on the first return to the zone, ideally with a rejection candle from the other side.",
            "Stop: back inside the zone, beyond the retest wick.",
          ],
          note: "If price breaks and never retests, let it go. Chasing the breakout candle gives you the worst price and the widest stop.",
        },
      ],
      takeaways: [
        "Bounce: fade the level with a rejection candle, stop beyond the zone.",
        "Break and retest: wait for the close through, enter on the return.",
        "Missing a trade is cheaper than chasing it.",
      ],
      mistakes: [
        "Fading a level in a strong trend that is clearly heading through it.",
        "Entering a breakout before the candle closes.",
        "Using the same stop distance on both methods.",
      ],
      psych: "Choose your method before price reaches the level. Deciding in the moment turns every level into a coin flip.",
      practice: "For each of your A-grade levels, write down now whether you would trade the bounce or the break, and why.",
      apply: { label: "Size it first", href: "calculators.html", why: "Use the position size calculator with the zone-based stop before you place the order." },
    },
    {
      id: "sr6",
      module: "Trading levels",
      title: "Fakeouts and failed levels",
      minutes: 9,
      summary: "Many breaks are traps. A fakeout pokes through a level, triggers breakout orders and stops, then reverses. Learning to spot them protects you and gives a setup of its own.",
      sections: [
        {
          h: "How a fakeout looks",
          ul: [
            "Price trades through the level, often quickly, around a news release or session open.",
            "The candle closes back inside the level, leaving a long wick beyond it.",
            "The next candles fail to get back through.",
            "Price often travels to the opposite side of the range.",
          ],
          fig: {
            type: "shot",
            src: "liq-eqh-gold",
            title: "Equal highs, a poke above, then a collapse",
            tag: "Real chart",
            caption: "The obvious resistance was traded through by a few dollars and immediately rejected. Breakout buyers became trapped sellers.",
            meta: "XAUUSD · 1D · Jul to Aug 2021",
            alt: "Gold daily chart showing a false break above equal highs followed by a sharp drop",
          },
        },
        {
          h: "Protecting yourself",
          ul: [
            "Wait for the candle close before calling a break.",
            "Be wary of breaks during low-liquidity hours or straight into news.",
            "Prefer breaks that follow pressure (rising lows into resistance) over breaks that come out of nowhere.",
          ],
          note: "The Liquidity Masterclass treats fakeouts as liquidity sweeps and shows how to trade them deliberately.",
        },
      ],
      takeaways: [
        "A fakeout breaks the level intrabar but closes back inside.",
        "Candle closes and context separate breaks from traps.",
        "A failed break is information, often pointing to the other side of the range.",
      ],
      mistakes: [
        "Entering breakouts on the first tick through the level.",
        "Holding a failed breakout, hoping it will come back.",
        "Assuming every wick through a level is a fakeout.",
      ],
      psych: "Being caught in a fakeout feels personal. It is not. It is the most common trap in the market, and a closed candle is the cheapest protection.",
      practice: "Find three fakeouts on the daily chart of any instrument you trade. For each, note what the next five candles did.",
      apply: { label: "Continue with Liquidity", href: "learn.html#mc/liquidity", why: "Learn to trade the sweep deliberately instead of being trapped by it." },
    },
  ],
  quiz: [
    { q: "Why do levels often work more than once?", options: ["Brokers defend them", "Traders leave orders near prices they remember", "Indicators force it", "They never do"], a: 1, why: "Winners, losers and latecomers all place orders near the same price.", lesson: "sr1" },
    { q: "How should a support level be drawn?", options: ["As a single line through the lowest wick", "As a zone from wick extreme to the nearest body edge", "As a moving average", "On the 1-minute chart"], a: 1, why: "Zones absorb normal noise around the reaction.", lesson: "sr2" },
    { q: "A zone is wider than two daily ATRs. You should…", options: ["Use it as is", "Narrow it to the densest part of the reaction", "Double your size", "Remove your stop"], a: 1, why: "Keep zones narrower than about one daily ATR.", lesson: "sr2" },
    { q: "Role reversal means…", options: ["Price never returns to a level", "Broken resistance tends to act as support", "Buyers and sellers swap brokers", "The trend always reverses"], a: 1, why: "Once broken, the old level often holds from the other side.", lesson: "sr3" },
    { q: "What confirms a break of resistance?", options: ["A wick above it", "A candle close decisively above it", "A news headline", "A tick above it"], a: 1, why: "The close shows acceptance above the level.", lesson: "sr3" },
    { q: "Which adds most to a level's score?", options: ["It appears only on the 5-minute chart", "A forceful reaction visible on the daily", "Ten previous touches", "A random round number alone"], a: 1, why: "Reaction strength and timeframe carry the most weight.", lesson: "sr4" },
    { q: "Price makes smaller and smaller bounces from the same support. This usually signals…", options: ["Stronger support", "A coming break of support", "Nothing", "A bullish reversal"], a: 1, why: "Each test uses up orders; weakening bounces warn of a break.", lesson: "sr4" },
    { q: "In a break and retest, where does the stop go?", options: ["On the breakout candle's high", "Back inside the zone, beyond the retest wick", "At a round number", "No stop is needed"], a: 1, why: "If price closes back through the zone, the idea is wrong.", lesson: "sr5" },
    { q: "A candle trades above resistance and closes back below it with a long upper wick. This is most likely…", options: ["A confirmed breakout", "A fakeout", "A gap", "A trend continuation"], a: 1, why: "Through and back inside on the close is a failed break.", lesson: "sr6" },
    { q: "Which break is more trustworthy?", options: ["One after rising lows pressing into resistance", "One during the quietest hour", "One straight into a major news release", "One with no candle close"], a: 0, why: "Pressure before the break shows real demand behind it.", lesson: "sr6" },
  ],
});
