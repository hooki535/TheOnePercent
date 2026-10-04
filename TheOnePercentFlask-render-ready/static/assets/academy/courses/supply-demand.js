/* The1% Academy — Supply & Demand Masterclass (full course) */
Academy.register("supply-demand", {
  hours: 4,
  outcomes: [
    "Explain why supply and demand zones form, in terms of real unfilled orders.",
    "Identify the four formations (RBR, DBR, RBD, DBD) on any chart.",
    "Draw a zone with a precise proximal and distal line, and grade its quality.",
    "Plan a complete zone trade: entry type, stop, target and management.",
  ],
  lessons: [
    {
      id: "sd1",
      module: "The logic of zones",
      title: "Why supply and demand zones exist",
      minutes: 8,
      summary: "Price moves because orders are imbalanced. A zone is the footprint of an imbalance that was so large it could not all be filled at once.",
      sections: [
        {
          h: "Price is an auction",
          p: [
            "At every moment, buyers and sellers are negotiating. When buy orders outweigh sell orders at a price, price must rise to find more sellers. When sell orders dominate, price must fall to find more buyers. That imbalance is what we call demand or supply.",
            "Large participants such as banks and funds cannot fill their full size at one price without moving the market. They fill part of the order, price runs away, and the rest of the order stays unfilled. When price returns to that area, the remaining orders are still there, and price often reacts.",
          ],
          fig: {
            title: "Drop, base, rally: a demand zone forms, then gets retested",
            tag: "Diagram",
            n: 37, seed: 4, vol: 0.6,
            path: [[0, 112], [8, 104], [9, 104.3], [10, 103.8], [11, 104.2], [12, 104], [18, 113], [24, 110], [28, 104.9], [36, 111.5]],
            wicks: [[28, 104.4]],
            overlays: [
              { zone: [9, null, 103.5, 104.6], kind: "demand", label: "Demand zone: unfilled buy orders", labelPos: "below" },
              { label: "Base", at: [10, 105.4], kind: "muted" },
              { label: "Explosive rally", at: [15, 109.5], pos: "left", kind: "up" },
              { label: "Return and reaction", at: [28, 106], pos: "right", kind: "up" },
              { ring: [28, 104.4], kind: "up" },
            ],
            caption: "The base is where the big orders were placed. The explosive rally shows they were not all filled. The return is the opportunity.",
          },
        },
        {
          h: "Zones versus support and resistance",
          ul: [
            "Support and resistance come from repeated touches. Zones come from one decisive departure.",
            "A support level gets weaker every time it is tested. A zone is strongest the first time price returns.",
            "Support is a line where price stopped. A zone is an area where orders are still waiting.",
          ],
          note: "A zone is a hypothesis about unfilled orders, not a guarantee. That is why every zone trade has a stop.",
        },
        {
          h: "On a real chart: a demand zone that got retested",
          p: [
            "EURUSD 4H in April 2025. Price paused briefly between 1.0884 and 1.0927, then launched more than 200 pips. When it came back into that pause on 7 and 8 April, buyers were waiting, and the next leg took price above 1.14."
          ],
          fig: {
            type: "shot",
            src: "sd-demand-eurusd",
            title: "Base, departure, return, reaction",
            caption: "The strength of the move away is what tells you orders were left behind.",
            meta: "EURUSD · 4H · Apr 2025",
            alt: "EURUSD 4 hour chart with a demand zone and its retest in April 2025"
          }
        },
      ],
      takeaways: [
        "Zones are the footprint of order imbalances too large to fill at once.",
        "The stronger the move away from a base, the more orders were likely left behind.",
        "Zones are strongest on the first return, the opposite of classic support.",
      ],
      mistakes: [
        "Drawing a zone at every small pause in price.",
        "Treating a zone as a wall that cannot break.",
        "Confusing a heavily tested support line with a fresh demand zone.",
      ],
      psych: "A zone gives you a place to wait. Waiting at a prepared level is the opposite of chasing, and it is how professionals trade.",
      practice: "On a daily chart, find three places where price left a tight base with an explosive move. Mark them and note whether price has returned yet.",
      apply: { label: "Mark a zone on the chart", href: "charts.html", why: "Use the rectangle tool to draw your first demand zone and save it to the journal as a planned trade." },
    },
    {
      id: "sd2",
      module: "The logic of zones",
      title: "The four formations: RBR, DBR, RBD, DBD",
      minutes: 9,
      summary: "Every zone is one of four shapes, named by the move into the base and the move out of it. Two are demand, two are supply.",
      sections: [
        {
          h: "Demand: rally-base-rally and drop-base-rally",
          p: [
            "Drop-base-rally (DBR) is a reversal zone: price falls, pauses, then rallies hard. Rally-base-rally (RBR) is a continuation zone: price rises, pauses, then keeps rising. Both leave unfilled buy orders in the base.",
          ],
          fig: {
            title: "DBR (reversal) and RBR (continuation) demand zones",
            tag: "Diagram",
            n: 44, seed: 12, vol: 0.6,
            path: [[0, 110], [6, 103], [7, 103.4], [8, 102.9], [9, 103.2], [14, 109], [15, 108.8], [16, 109.2], [17, 108.9], [23, 116], [30, 112], [36, 109.7], [43, 114.5]],
            wicks: [[36, 109.3]],
            overlays: [
              { zone: [7, null, 102.6, 103.6], kind: "demand", label: "DBR" },
              { zone: [15, null, 108.6, 109.4], kind: "demand", label: "RBR" },
              { ring: [36, 109.3], kind: "up" },
            ],
            caption: "Price returns to the RBR zone first because it is closer. The DBR below remains fresh.",
          },
        },
        {
          h: "Supply: rally-base-drop and drop-base-drop",
          p: [
            "Rally-base-drop (RBD) is a reversal supply zone. Drop-base-drop (DBD) is a continuation supply zone. Both leave unfilled sell orders behind.",
          ],
          fig: {
            title: "RBD (reversal) and DBD (continuation) supply zones",
            tag: "Diagram",
            n: 44, seed: 14, vol: 0.6,
            path: [[0, 100], [6, 107], [7, 106.6], [8, 107.1], [9, 106.8], [14, 101], [15, 101.2], [16, 100.8], [17, 101.1], [23, 94], [30, 98], [36, 100.4], [43, 95.5]],
            wicks: [[36, 100.8]],
            overlays: [
              { zone: [7, null, 106.4, 107.4], kind: "supply", label: "RBD" },
              { zone: [15, null, 100.6, 101.4], kind: "supply", label: "DBD" },
              { ring: [36, 100.8], kind: "down" },
            ],
            caption: "The mirror image. Continuation zones (DBD) often give the higher-probability trades because they agree with the trend.",
          },
        },
        {
          h: "Which is better?",
          ul: [
            "Continuation zones (RBR, DBD) trade with the trend, so they tend to have higher win rates.",
            "Reversal zones (DBR, RBD) can offer larger moves but need a higher-timeframe reason to reverse.",
            "In both cases, the quality of the departure matters more than the name.",
          ],
        },
        {
          h: "On a real chart: drop-base-drop supply",
          p: [
            "Bitcoin in August 2024. Price fell, paused around 64,600 to 66,800, and then fell hard to 49,000. Three weeks later price rallied back into that pause and was rejected almost to the dollar, before dropping again to 52,600."
          ],
          fig: {
            type: "shot",
            src: "sd-supply-btc",
            title: "The pause before the drop became supply",
            caption: "DBD is a continuation zone: it agrees with the trend that created it.",
            meta: "BTCUSD · 1D · Aug 2024",
            alt: "Bitcoin daily chart with a supply zone and retest in August 2024"
          }
        },
      ],
      takeaways: [
        "Demand: DBR (reversal) and RBR (continuation). Supply: RBD (reversal) and DBD (continuation).",
        "Name a zone by the move in and the move out.",
        "Continuation zones agree with the trend and are usually the safer choice.",
      ],
      mistakes: [
        "Trading reversal zones against a strong higher-timeframe trend without confirmation.",
        "Forgetting that a zone behind price (already passed) can become the target of a later move.",
        "Labelling a zone without checking the departure.",
      ],
      psych: "Learning names can make you feel like you have an edge. The name is vocabulary. The edge is grading and patience, which come next.",
      practice: "Find two examples of each formation on a 4H chart. Screenshot all eight and label them.",
      apply: { label: "Save zone screenshots to the journal", href: "journal.html", why: "Build your own reference library of the four formations from real charts." },
    },
    {
      id: "sd3",
      module: "Drawing and grading",
      title: "Drawing a zone correctly",
      minutes: 8,
      summary: "Two lines define every zone: the proximal line (nearest to current price) and the distal line (furthest away). Draw them the same way every time.",
      sections: [
        {
          h: "The rule",
          ul: [
            "Identify the base: the small-bodied candles between the move in and the move out. Usually one to six candles.",
            "Demand: proximal line at the highest body of the base; distal line at the lowest wick of the base or the departure candle.",
            "Supply: proximal line at the lowest body of the base; distal line at the highest wick.",
          ],
          fig: {
            title: "Proximal and distal lines of a demand zone",
            tag: "Close-up",
            n: 31, seed: 9, vol: 0.5,
            path: [[0, 110], [5, 104.1], [6, 104.4], [7, 103.9], [8, 104.3], [12, 111], [20, 108], [25, 104.9], [30, 110]],
            wicks: [[7, 103.3]],
            overlays: [
              { zone: [6, null, 103.3, 104.45], kind: "demand" },
              { hline: 104.45, from: 6, kind: "brand", label: "Proximal", dash: false },
              { hline: 103.3, from: 6, kind: "down", label: "Distal" },
              { label: "Base", at: [7, 102.8], pos: "below", kind: "muted" },
            ],
            caption: "Entries use the proximal line. Stops go beyond the distal line, plus a buffer for spread.",
          },
        },
        {
          h: "Zone width",
          p: [
            "If a zone is too wide, the stop becomes too large and the position size too small to be worth it. If a zone is very wide on the 4H, drop to the 1H inside it and look for a refined, tighter base within the same area.",
          ],
          note: "A useful check: if the zone width is more than about a third of the daily average range, refine it.",
        },
      ],
      takeaways: [
        "Proximal = nearest edge (entry side). Distal = far edge (stop side).",
        "Demand: highest base body to lowest wick. Supply: lowest base body to highest wick.",
        "Refine wide zones on a lower timeframe.",
      ],
      mistakes: [
        "Including the big departure candles in the zone, making it far too wide.",
        "Using the base wick for the proximal line, which makes entries too early.",
        "Placing the stop exactly on the distal line, with no buffer for spread and slippage.",
      ],
      psych: "Precise lines remove decisions from the moment of the trade. The less you decide live, the less emotion gets involved.",
      practice: "Redraw every zone you marked in the last lesson using the proximal and distal rule. Measure each zone's width in pips or points.",
      apply: { label: "Measure the zone risk", href: "calculators.html", why: "Use proximal as entry and distal plus buffer as stop, and see what position size 1% gives you." },
    },
    {
      id: "sd4",
      module: "Drawing and grading",
      title: "Grading zones: which ones to trade",
      minutes: 10,
      summary: "Most zones fail. The ones that hold share five features. Score every zone before you trade it, and trade only the top grades.",
      sections: [
        {
          h: "Strength of departure",
          p: [
            "The single most important factor. A zone where price left explosively, with large candles and no overlap, shows a big imbalance. A zone that price left slowly, with overlapping candles, shows a small one.",
          ],
          fig: {
            title: "Strong versus weak departure",
            tag: "Comparison",
            n: 41, seed: 3, vol: 0.5,
            path: [[0, 108], [5, 102], [6, 102.3], [7, 101.9], [10, 110], [16, 107], [20, 104.9], [21, 105.2], [22, 104.9], [23, 105.1], [34, 108.5], [40, 107.2]],
            overlays: [
              { zone: [6, null, 101.5, 102.4], kind: "demand", label: "A: explosive departure (high grade)", labelPos: "below" },
              { zone: [21, null, 104.6, 105.3], kind: "brand", label: "B: slow grind away (low grade)", labelPos: "below" },
            ],
            caption: "Zone A left in three candles. Zone B took eleven. A holds more unfilled orders.",
          },
        },
        {
          h: "The1% zone scorecard",
          ul: [
            "Departure: explosive (2), moderate (1), weak (0).",
            "Freshness: never retested (2), tested once (1), tested more (0).",
            "Time at base: 1 to 3 candles (2), 4 to 6 (1), more (0).",
            "Trend alignment: with the higher-timeframe trend (2), neutral (1), against (0).",
            "Room: at least 3R to the opposing zone (2), 2R (1), less (0).",
          ],
          fig: {
            type: "bars",
            title: "Example: scoring a 4H demand zone",
            tag: "Scorecard",
            max: 2,
            items: [
              { label: "Departure", value: 2, text: "2 / 2", kind: "up" },
              { label: "Freshness", value: 2, text: "2 / 2", kind: "up" },
              { label: "Time at base", value: 1, text: "1 / 2", kind: "brand" },
              { label: "Trend alignment", value: 2, text: "2 / 2", kind: "up" },
              { label: "Room to target", value: 1, text: "1 / 2", kind: "brand" },
            ],
            caption: "Total 8 / 10. The1% rule of thumb: trade 8 and above, watch 6 to 7, ignore anything lower.",
          },
        },
        {
          h: "Why freshness matters",
          p: [
            "Each time price returns to a zone, some of the remaining orders get filled. After two or three visits, there may be nothing left. The first return is the one with the most orders waiting.",
          ],
        },
      ],
      takeaways: [
        "Departure strength is the most important factor.",
        "Fresh zones hold better than tested ones.",
        "Score every zone out of 10; trade only 8 and above.",
      ],
      mistakes: [
        "Trading every zone you draw instead of only the best ones.",
        "Ignoring trend alignment because the zone 'looks perfect'.",
        "Trading a zone with no room to a target.",
      ],
      psych: "A scorecard is a pre-commitment device. It stops you from grading a zone higher just because you are bored and want to trade.",
      practice: "Score ten zones with the scorecard. After they play out, compare the results of zones that scored 8+ with the rest.",
      apply: { label: "Tag your trades by zone score", href: "journal.html", why: "Add the score as a tag. After 30 trades, the journal will tell you whether your high-grade zones actually perform better." },
    },
    {
      id: "sd5",
      module: "Executing zone trades",
      title: "Entries: limit order or confirmation",
      minutes: 9,
      summary: "There are two professional ways to enter a zone. Each has a cost. Pick one per setup type and stick with it.",
      sections: [
        {
          h: "Two entry methods",
          ul: [
            "Limit entry (set and forget): a limit order at the proximal line. Best price and tightest stop, but you will be filled on zones that fail too.",
            "Confirmation entry: wait for price to enter the zone and show a reaction, such as a bullish engulfing candle or a lower-timeframe CHoCH. Fewer losers, but a worse price and some missed trades.",
          ],
          fig: {
            title: "The same zone, two entries",
            tag: "Comparison",
            n: 37, seed: 19, vol: 0.5,
            path: [[0, 112], [6, 104], [7, 104.3], [8, 103.8], [13, 112], [21, 108], [26, 104.6], [27, 104.1], [28, 105.6], [36, 110.5]],
            set: [[27, 104.6, 104.7, 103.9, 104.1], [28, 104.1, 105.8, 103.95, 105.6]],
            overlays: [
              { zone: [7, null, 103.4, 104.5], kind: "demand" },
              { hline: 104.5, from: 16, to: 26, kind: "brand", label: "Limit entry 104.5", labelPos: "below" },
              { hline: 105.6, from: 22, to: 36, kind: "up", label: "Confirmation 105.6" },
              { label: "Engulfing", at: [28, 103.9], pos: "below", kind: "up" },
            ],
            caption: "The confirmation entry is 1.1 points worse, but it only triggers after buyers have shown up.",
          },
        },
        {
          h: "Choosing",
          p: [
            "Use limit entries for high-grade continuation zones in a clear trend. Use confirmation entries for reversal zones and for zones against the short-term momentum. Whatever you choose, write it in your plan so you do not decide based on how you feel that day.",
          ],
          note: "Never widen the stop to make a confirmation entry fit. If the confirmation candle makes the stop too big, the trade is off.",
        },
      ],
      takeaways: [
        "Limit entry: best price, more losing trades.",
        "Confirmation entry: fewer losers, worse price and more missed trades.",
        "Choose by setup type, in advance, not by feel.",
      ],
      mistakes: [
        "Switching methods trade by trade depending on mood.",
        "Chasing price after missing a limit entry.",
        "Taking a confirmation candle that forms far outside the zone.",
      ],
      psych: "Missed trades hurt, and the pain pushes traders to chase. A missed trade costs 0R. A chased trade often costs 1R. Record missed trades in the journal to see that they are not losses.",
      practice: "Backtest 20 zone retests with both methods. Compare win rate, average R and the number of missed trades.",
      apply: { label: "Compare both methods in the simulator", href: "calculators.html#sim", why: "Enter the results of both methods into the P&L simulator to see which gives the higher expectancy for you." },
    },
    {
      id: "sd6",
      module: "Executing zone trades",
      title: "Stops, targets and management",
      minutes: 9,
      summary: "The zone gives you the entry and the stop. The opposing zone gives you the target. The maths decides whether you take the trade at all.",
      sections: [
        {
          h: "The complete trade",
          fig: {
            title: "Short from supply, target the opposing demand",
            tag: "Worked example",
            n: 41, seed: 27, vol: 0.55,
            path: [[0, 100], [6, 95.5], [7, 95.2], [8, 95.6], [12, 103], [13, 102.8], [14, 103.2], [19, 97], [26, 100], [31, 102.7], [40, 96.3]],
            overlays: [
              { zone: [7, null, 94.8, 95.8], kind: "demand", label: "Opposing demand", labelPos: "below" },
              { zone: [13, null, 102.5, 103.6], kind: "supply", label: "Supply" },
              { hline: 104, from: 25, to: 40, kind: "down", label: "Stop 104.0" },
              { hline: 102.5, from: 25, to: 40, kind: "brand", label: "Entry 102.5", dash: false },
              { hline: 96, from: 25, to: 40, kind: "up", label: "Target 96.0" },
            ],
            caption: "Risk 1.5 points (entry to stop). Reward 6.5 points (entry to target just before demand). That is 4.3R.",
          },
        },
        {
          h: "Stops",
          ul: [
            "Place the stop beyond the distal line plus a buffer of the spread and a little volatility.",
            "If price closes beyond the distal line, the zone has failed. Accept it.",
            "Never move a stop further away. Only move it closer, and only for a structural reason.",
          ],
        },
        {
          h: "Targets and management",
          ul: [
            "First target: just in front of the nearest opposing zone or swing point.",
            "Take partial profit at 2R, and move the stop to break-even only after a new swing forms in your favour.",
            "If there is less than 2R of room to the opposing zone, skip the trade.",
          ],
          note: "Exit in front of the opposing zone, not inside it. The orders waiting there are the reason price will turn.",
        },
      ],
      takeaways: [
        "Stop beyond distal + buffer. Target in front of the opposing zone.",
        "At least 2R of room, or no trade.",
        "A close through the distal line means the zone has failed.",
      ],
      mistakes: [
        "Setting targets at arbitrary round numbers instead of opposing zones.",
        "Holding through the opposing zone hoping for more.",
        "Moving the stop wider when price approaches it.",
      ],
      psych: "The urge to move a stop is fear pretending to be analysis. Write the stop before the entry and treat it as a contract with yourself.",
      practice: "Plan five zone trades on paper with entry, stop, target and R. Only take the ones with 2R or more.",
      apply: { label: "Log the planned trade", href: "journal.html", why: "Save the plan before entry. The journal will compare what you planned with what you did." },
    },
    {
      id: "sd7",
      module: "Executing zone trades",
      title: "Multi-timeframe zones and the full routine",
      minutes: 10,
      summary: "Higher-timeframe zones decide direction. Lower-timeframe zones decide timing. Combine them into a routine you can repeat every day.",
      sections: [
        {
          h: "Location: premium and discount",
          p: [
            "Look at the higher-timeframe range. Buying is best in the lower half (discount), selling in the upper half (premium). A demand zone in premium is weaker than the same zone in discount, because more buyers are already committed.",
          ],
        },
        {
          h: "The1% zone routine",
          fig: {
            type: "flow",
            title: "From daily bias to entry",
            tag: "Routine",
            perRow: 3,
            steps: [
              "Daily: trend and premium or discount",
              "4H: find fresh zones with the trend",
              "Grade each zone, keep 8/10 and above",
              "1H: refine the zone if it is too wide",
              "Entry: limit or confirmation, as per plan",
              "Stop beyond distal, target opposing zone",
            ],
          },
        },
        {
          h: "Nested zones",
          p: [
            "The best setups often have a lower-timeframe zone sitting inside a higher-timeframe zone. The higher-timeframe zone gives the reason; the lower-timeframe zone gives a tighter entry and a smaller stop, which means a larger position for the same 1% risk.",
          ],
        },
      ],
      takeaways: [
        "Buy demand in discount, sell supply in premium.",
        "Higher timeframe for direction, lower timeframe for timing.",
        "A zone inside a zone gives the tightest, best-reasoned entries.",
      ],
      mistakes: [
        "Trading lower-timeframe zones against a higher-timeframe zone.",
        "Skipping the grading step because the routine feels slow.",
        "Refining so far down that the zone no longer reflects real orders.",
      ],
      psych: "A written routine turns trading from a series of emotional decisions into a checklist. On bad days the checklist is what keeps you safe.",
      practice: "Run the full six-step routine every morning for one week on two instruments. Log every zone that passes the grade, whether you trade it or not.",
      apply: { label: "Use the pre-trade checklist", href: "learn.html#library", why: "Download the pre-trade checklist and add the zone scorecard to it." },
    },
  ],
  quiz: [
    { q: "Why do supply and demand zones form?", options: ["Because of moving averages", "Large orders cannot be filled at once, so some remain unfilled at the base", "Because candles are green or red", "Because brokers set them"], a: 1, why: "Zones are the footprint of order imbalances that were too large to fill at one price.", lesson: "sd1" },
    { q: "Unlike classic support, a demand zone is usually strongest…", options: ["After five tests", "On the first return", "Only on Mondays", "When it is very wide"], a: 1, why: "Each return fills some of the remaining orders. The first return has the most waiting.", lesson: "sd1" },
    { q: "Price rallies, pauses, then keeps rallying. The zone is…", options: ["DBR", "RBD", "RBR", "DBD"], a: 2, why: "Rally-base-rally is a continuation demand zone.", lesson: "sd2" },
    { q: "Rally-base-drop (RBD) creates…", options: ["A continuation demand zone", "A reversal supply zone", "A continuation supply zone", "No zone"], a: 1, why: "Price rallied into the base and dropped out of it: reversal supply.", lesson: "sd2" },
    { q: "For a demand zone, the proximal line is drawn at…", options: ["The lowest wick", "The highest body of the base", "The top of the departure candle", "A round number"], a: 1, why: "Proximal = nearest edge to price = the highest body of the base.", lesson: "sd3" },
    { q: "The most important factor when grading a zone is…", options: ["Its colour", "The strength of the departure", "How many times it was tested", "The day of the week"], a: 1, why: "An explosive departure signals a large imbalance and more unfilled orders.", lesson: "sd4" },
    { q: "Using The1% scorecard, a zone scoring 6/10 should be…", options: ["Traded with double size", "Watched but not traded", "Traded with a wider stop", "Deleted from the chart"], a: 1, why: "Trade 8 and above, watch 6 to 7, ignore anything lower.", lesson: "sd4" },
    { q: "The main cost of a confirmation entry is…", options: ["A larger stop and a worse price", "More losing trades", "It is not allowed on forex", "No cost"], a: 0, why: "Confirmation gives a worse price and misses some trades, in exchange for fewer losers.", lesson: "sd5" },
    { q: "Where should the target of a zone trade usually go?", options: ["Inside the opposing zone", "Just in front of the opposing zone or swing", "At any round number", "There should be no target"], a: 1, why: "Exit in front of the orders that will turn price.", lesson: "sd6" },
    { q: "A demand zone in the premium half of the higher-timeframe range is…", options: ["Stronger than one in discount", "Weaker than one in discount", "The same", "A supply zone"], a: 1, why: "Buying is best in discount; a zone in premium has less edge.", lesson: "sd7" },
  ],
});
