/* The1% Academy — Fair Value Gap & Imbalance Masterclass (full course) */
Academy.register("fvg", {
  hours: 3,
  outcomes: [
    "Identify a fair value gap from three candles, exactly, on any timeframe.",
    "Explain why imbalances are often revisited, and when they are not.",
    "Recognise inversion gaps, implied gaps and balanced price ranges.",
    "Plan an FVG entry with consequent encroachment, a structural stop and a liquidity target.",
  ],
  lessons: [
    {
      id: "fv1",
      module: "Imbalance",
      title: "The three-candle gap",
      minutes: 9,
      summary: "A fair value gap (FVG) is a price range that one fast candle crossed without the candles either side overlapping it. It marks where price moved so quickly that only one side got filled.",
      sections: [
        {
          h: "The definition, exactly",
          ul: [
            "Take three consecutive candles. Call them 1, 2 and 3.",
            "Bullish FVG: candle 2 is a strong up candle, and candle 3's low is above candle 1's high. The gap is from candle 1's high up to candle 3's low.",
            "Bearish FVG: candle 2 is a strong down candle, and candle 3's high is below candle 1's low. The gap is from candle 3's high up to candle 1's low.",
            "If the wicks of candles 1 and 3 overlap, there is no FVG, however big candle 2 is.",
          ],
          fig: {
            type: "flow",
            title: "Checking a bullish FVG",
            tag: "Rule",
            perRow: 3,
            steps: ["Find a large up candle (candle 2)", "Mark candle 1's high", "Mark candle 3's low", "Is candle 3's low above candle 1's high?", "Yes: the space between is the FVG", "No: no gap, move on"],
          },
        },
        {
          h: "On a real chart: EURUSD, March 2025",
          p: [
            "On 4 March 2025 EURUSD's high was 1.06304. On 5 March a single day rallied almost 170 pips, a German spending announcement driving the euro. On 6 March the low was 1.07712. Candle 3's low sat 141 pips above candle 1's high, so the gap is 1.06304 to 1.07712.",
          ],
          fig: {
            type: "shot",
            src: "fvg-bull-eurusd",
            title: "A bullish FVG and the return to it",
            tag: "Real chart",
            caption: "The gap is drawn wick to wick, not body to body. On 26 March price came back into the top of it (low 1.07411), then rallied to above 1.11 in early April.",
            meta: "EURUSD · 1D · Mar 2025",
            alt: "EURUSD daily chart with a bullish fair value gap from 1.06304 to 1.07712",
          },
        },
      ],
      takeaways: [
        "An FVG needs three candles and a real gap between candle 1 and candle 3.",
        "Bullish: candle 1 high to candle 3 low. Bearish: candle 3 high to candle 1 low.",
        "Draw it from wicks, not bodies.",
      ],
      mistakes: [
        "Calling any big candle an FVG without checking the wicks.",
        "Drawing the gap from candle bodies.",
        "Marking dozens of tiny gaps on the 1-minute chart.",
      ],
      psych: "Precise definitions stop you seeing what you want to see. Either candle 3 clears candle 1 or it does not.",
      practice: "On the EURUSD daily chart, find five large candles from the last three months and check each one against the definition. Count how many are real FVGs.",
      apply: { label: "Find gaps on the chart", href: "charts.html", why: "Open the daily chart and mark every valid FVG from the last month." },
    },
    {
      id: "fv2",
      module: "Imbalance",
      title: "Why gaps get revisited",
      minutes: 8,
      summary: "Inside an FVG, trading was one-sided. Orders that wanted to trade there were never filled. Price often returns to offer them that chance, which is why gaps act like magnets and like zones.",
      sections: [
        {
          h: "The logic",
          p: [
            "When a candle moves fast enough to leave a gap, buyers (in a bullish gap) were paying up with no sellers in the way. Participants who wanted to buy at better prices inside that range missed out. When price drifts back, they act, and that buying tends to hold the gap as support.",
            "At the same time, the gap is a range where price was never 'agreed'. Markets tend to rebalance these areas before continuing, so a gap above or below price is also a possible target.",
          ],
        },
        {
          h: "When gaps do not get filled",
          ul: [
            "In very strong trends, gaps on the trend's side can stay open for weeks or never fill.",
            "Price often only fills part of a gap: the top part of a bullish gap, or the midpoint.",
            "A gap against the higher-timeframe trend is much weaker than a gap with it.",
          ],
          note: "Do not treat 'gaps must fill' as a law. Treat an FVG as an area where a reaction is more likely, and demand confirmation.",
        },
        {
          h: "Which gaps matter",
          ul: [
            "Gaps created by displacement: candle 2 is clearly larger than recent candles.",
            "Gaps that also broke structure (a BOS or CHoCH).",
            "Gaps on the 4H and daily, which carry more orders than 5-minute gaps.",
            "Unfilled gaps. Once price has traded all the way through a gap, it has done its job.",
          ],
        },
      ],
      takeaways: [
        "FVGs mark one-sided trading and unfilled orders.",
        "They can act as support or resistance, and as targets.",
        "Displacement, structure and timeframe decide which gaps matter.",
      ],
      mistakes: [
        "Believing every gap must be filled completely.",
        "Trading gaps against the higher-timeframe trend.",
        "Keeping gaps on the chart after price has traded through them.",
      ],
      psych: "An FVG gives a precise-looking zone, which feels like certainty. It is still a probability. Size it like one.",
      practice: "On the 4H chart, mark every unfilled FVG within 2% of current price. Next week, record which ones reacted and which were ignored.",
      apply: { label: "Journal the reactions", href: "journal.html", why: "Record FVG reactions for two weeks to learn how your market treats them." },
    },
    {
      id: "fv3",
      module: "Types",
      title: "Bullish and bearish FVGs in context",
      minutes: 9,
      summary: "The same pattern works in both directions. A bearish FVG in a downtrend is resistance on the way back up. The strongest gaps are created by the move that breaks structure.",
      sections: [
        {
          h: "On a real chart: a bearish FVG on bitcoin",
          p: [
            "On 19 January 2026 bitcoin's low was 92,089. On 20 January a heavy down day dropped more than 4,000 dollars. On 21 January the high was only 90,430. That left a bearish FVG between 90,430 and 92,089.",
            "On 23 January price rallied up into the gap, reached 91,100, and closed back near 89,500. The next leg lower took bitcoin to around 60,000 by 6 February.",
          ],
          fig: {
            type: "shot",
            src: "fvg-bear-btc",
            title: "Bearish FVG, retest, continuation",
            tag: "Real chart",
            caption: "The retest stalled just below the gap's midpoint. Sellers who missed the first drop used the gap to sell.",
            meta: "BTCUSD · 1D · Jan to Feb 2026",
            alt: "Bitcoin daily chart with a bearish fair value gap between 90,430 and 92,089 retested on 23 January 2026",
          },
        },
        {
          h: "Context decides",
          ul: [
            "In an uptrend, trade bullish gaps as support. Treat bearish gaps as targets to be filled, not as places to short.",
            "In a downtrend, the reverse.",
            "After a CHoCH, the gap left by the displacement that caused it is often the best entry into the new direction.",
          ],
        },
      ],
      takeaways: [
        "Bearish FVG: candle 3 high to candle 1 low, acting as resistance.",
        "Trade gaps in the direction of the trend or of a fresh CHoCH.",
        "The displacement that breaks structure leaves the most useful gaps.",
      ],
      mistakes: [
        "Shorting every bearish gap in an uptrend.",
        "Ignoring that the gap sits inside a bigger opposing zone.",
        "Expecting the full gap to fill before entering.",
      ],
      psych: "The best gap trades feel uncomfortable: you are selling into a bounce or buying into a dip. Rules help you act when instinct says wait.",
      practice: "Find the displacement candle behind the last three CHoCHs on the 4H chart of your market. Did each leave an FVG? Did price return to it?",
      apply: { label: "Review market structure", href: "learn.html#mc/market-structure", why: "The Market Structure Masterclass shows how to spot the BOS and CHoCH that give gaps their meaning." },
    },
    {
      id: "fv4",
      module: "Types",
      title: "Inversion gaps and implied gaps",
      minutes: 9,
      summary: "When price closes straight through an FVG, the gap has failed. That failed gap often flips role: an inversion FVG. And some imbalances hide inside wicks with no visible gap at all.",
      sections: [
        {
          h: "Inversion FVG (IFVG)",
          p: [
            "A bullish FVG should act as support. If a candle closes below the whole gap instead, buyers who defended it are now trapped. When price comes back up to the gap, they sell to get out, and it acts as resistance. The failed bullish gap has inverted into a bearish one.",
          ],
          fig: {
            type: "flow",
            title: "How a gap inverts",
            tag: "Sequence",
            perRow: 3,
            steps: ["Bullish FVG forms", "Price returns but closes below the entire gap", "Buyers in the gap are trapped", "Price rallies back to the gap", "Trapped buyers sell at break-even", "The old support now acts as resistance"],
          },
          note: "The close matters. A wick through the gap is a test; a body closing beyond it is a failure.",
        },
        {
          h: "Implied FVG",
          p: [
            "Sometimes the wicks of candles 1 and 3 overlap slightly, so there is no gap by the strict rule, yet candle 2 is a huge body with small wicks. The imbalance is 'implied' inside the overlap. A common method is to mark the midpoints of the two wicks that overlap the big body and treat the space between them as the implied gap.",
            "Implied gaps are weaker than true gaps. Use them only with other confluence, such as an order block or a higher-timeframe level.",
          ],
        },
      ],
      takeaways: [
        "A gap closed through on a candle body has failed and can invert.",
        "Inversion FVGs act in the opposite direction to the original gap.",
        "Implied FVGs are imbalances hidden inside overlapping wicks; they need confluence.",
      ],
      mistakes: [
        "Continuing to buy a bullish gap after price closed below it.",
        "Calling a wick through the gap an inversion.",
        "Trading implied gaps on their own.",
      ],
      psych: "Letting go of a level you trusted is hard. The inversion rule turns a painful failure into a new, defined trade idea.",
      practice: "Find one gap that failed on the 1H chart this month. Mark where it was closed through and check whether it acted as the opposite role on the return.",
      apply: { label: "Record an inversion", href: "journal.html", why: "Log inversion setups separately so you can compare them with normal gap entries." },
    },
    {
      id: "fv5",
      module: "Types",
      title: "The balanced price range",
      minutes: 7,
      summary: "When a bullish gap and a bearish gap overlap, the overlapping area is a balanced price range (BPR). Price has moved through it fast in both directions, and it often acts as a strong reaction zone.",
      sections: [
        {
          h: "How a BPR forms",
          ul: [
            "Price drops fast and leaves a bearish FVG.",
            "Shortly after, price rallies fast back through the same area and leaves a bullish FVG.",
            "Where the two gaps overlap is the BPR.",
            "The later move tells you its direction: here, bullish, so the BPR acts as support.",
          ],
        },
        {
          h: "Why it matters",
          p: [
            "Both sides left unfilled orders in the same small range. A BPR is usually narrower than either gap, which gives a tighter stop, and it often sits right at the turning point of a sweep and reversal.",
          ],
          note: "A BPR is a refinement, not a new setup. Look for it inside a zone you already wanted to trade.",
        },
      ],
      takeaways: [
        "BPR = overlap of a bullish and a bearish FVG.",
        "The most recent displacement sets its direction.",
        "Use it to refine entries inside existing zones.",
      ],
      mistakes: [
        "Trading a BPR against the higher-timeframe trend.",
        "Calling two gaps far apart a BPR.",
        "Hunting for BPRs on every small timeframe.",
      ],
      psych: "Refinements are tempting because they make stops smaller. They also make you miss trades. Decide in advance whether you refine or take the full zone.",
      practice: "After the next sweep-and-reversal on your market, check whether the down move and the up move left overlapping gaps.",
      apply: { label: "Continue with Liquidity", href: "learn.html#mc/liquidity", why: "BPRs often form at sweeps. The Liquidity Masterclass shows where to look." },
    },
    {
      id: "fv6",
      module: "Execution",
      title: "Consequent encroachment and the full plan",
      minutes: 10,
      summary: "The 50% level of a gap is called consequent encroachment (CE). It gives a precise entry. Combined with an order block, a structural stop and a liquidity target, it makes a complete trade plan.",
      sections: [
        {
          h: "Consequent encroachment",
          p: [
            "CE is the midpoint: (top + bottom) / 2. For the EURUSD gap from 1.06304 to 1.07712, CE was 1.07008. Price only reached 1.07411 on the retest, so a limit at CE would have missed the trade. For the bitcoin gap, CE was about 91,260; the retest reached 91,100, just short.",
            "This is the real trade-off. Deeper entries give better reward-to-risk but get filled less often. Entries at the gap's near edge get filled more often with a wider stop.",
          ],
          fig: {
            type: "bars",
            title: "Where to enter inside a gap",
            tag: "Trade-off",
            max: 3,
            items: [
              { label: "Near edge", value: 3, text: "Most fills", kind: "brand" },
              { label: "CE (50%)", value: 2, text: "Balanced", kind: "up" },
              { label: "Far edge", value: 1, text: "Fewest fills", kind: "warn" },
            ],
            caption: "The near edge fills most often but needs the widest stop. The far edge gives the best price and is missed most often. CE sits between them.",
          },
        },
        {
          h: "FVG with an order block",
          p: [
            "Displacement usually starts from an order block and leaves an FVG right above it (bullish) or below it (bearish). When price returns, the gap is tested first, then the order block. Many traders enter at the gap and place the stop beyond the order block.",
          ],
          fig: {
            type: "shot",
            src: "ob-bull-gold",
            title: "Order block under the displacement",
            tag: "Real chart",
            caption: "The rally from the block around 3,991 to 4,017 broke structure. The stop for any entry in the zone belongs below the block.",
            meta: "XAUUSD · 4H · Nov 2025",
            alt: "Gold 4 hour chart with a bullish order block and its retest",
          },
        },
        {
          h: "The full plan",
          fig: {
            type: "flow",
            title: "The1% FVG plan",
            tag: "Checklist",
            perRow: 3,
            steps: ["Higher-timeframe bias", "Displacement breaks structure and leaves an FVG", "Limit at the near edge or CE", "Stop beyond the order block or swing", "Target the next liquidity pool", "Skip if reward-to-risk is below 2R"],
          },
        },
      ],
      takeaways: [
        "CE = midpoint of the gap, a common precise entry.",
        "Deeper entries improve R but miss more trades.",
        "Stop beyond the order block or swing; target liquidity.",
      ],
      mistakes: [
        "Placing the stop just beyond the gap, inside the order block.",
        "Changing the entry level after seeing the price approach.",
        "Taking an FVG entry with no liquidity target.",
      ],
      psych: "Missing a trade by a few pips hurts. Pick your entry rule and review it over 30 trades, not after one miss.",
      practice: "Backtest 20 FVGs on your market. Record whether a limit at the near edge, at CE, and at the far edge would have filled, and the result for each.",
      apply: { label: "Size the entry", href: "calculators.html", why: "Use the position size calculator with the stop beyond the order block." },
    },
  ],
  quiz: [
    { q: "A bullish FVG exists when…", options: ["Candle 2 is green", "Candle 3's low is above candle 1's high", "Candle 1 and 3 overlap", "Volume is high"], a: 1, why: "The gap is the space between candle 1's high and candle 3's low.", lesson: "fv1" },
    { q: "A bearish FVG is drawn from…", options: ["Candle 1 high to candle 3 low", "Candle 3 high to candle 1 low", "Candle 2 open to close", "The body of candle 2"], a: 1, why: "For bearish gaps, the space runs from candle 3's high up to candle 1's low.", lesson: "fv1" },
    { q: "Candle 2 is huge, but candles 1 and 3 overlap. This is…", options: ["A strong FVG", "Not a true FVG", "An inversion FVG", "A BPR"], a: 1, why: "Without a gap between candles 1 and 3, there is no FVG. It may be an implied gap at most.", lesson: "fv4" },
    { q: "Why are FVGs often revisited?", options: ["Brokers force it", "Trading there was one-sided and orders went unfilled", "Indicators predict it", "They never are"], a: 1, why: "Unfilled orders inside the gap attract price back.", lesson: "fv2" },
    { q: "Which gap is most significant?", options: ["A 1-minute gap against the trend", "A daily gap from displacement that broke structure", "A gap already traded through", "Any gap"], a: 1, why: "Displacement, structure and timeframe give the gap weight.", lesson: "fv2" },
    { q: "A bullish FVG is closed through by a candle body. On the return it is likely to act as…", options: ["Support", "Resistance", "Nothing", "A target only"], a: 1, why: "A failed bullish gap can invert into resistance.", lesson: "fv4" },
    { q: "A balanced price range is…", options: ["Any range-bound market", "The overlap of a bullish and a bearish FVG", "The spread", "The Asian session range"], a: 1, why: "It is where opposite gaps overlap.", lesson: "fv5" },
    { q: "Consequent encroachment is…", options: ["The top of the gap", "The 50% midpoint of the gap", "The stop level", "The candle close"], a: 1, why: "CE is the gap's midpoint.", lesson: "fv6" },
    { q: "A gap runs from 1.2000 to 1.2040. CE is…", options: ["1.2010", "1.2020", "1.2030", "1.2040"], a: 1, why: "(1.2000 + 1.2040) / 2 = 1.2020.", lesson: "fv6" },
    { q: "In an FVG plus order block entry, the stop belongs…", options: ["Just beyond the gap", "Beyond the order block or swing", "At CE", "At the target"], a: 1, why: "The idea is wrong only if the order block fails.", lesson: "fv6" },
  ],
});
