/* The1% Academy — Trading Foundations Masterclass (full course) */
(() => {
  /* tf5: account left after a 2% move against you, by leverage used */
  const lev = [1, 5, 10, 20, 50].map((x) => ({ label: "1:" + x + " effective", value: Math.max(0, 100 - 2 * x), text: Math.max(0, 100 - 2 * x) + "%", kind: x <= 5 ? "up" : x <= 10 ? "brand" : x <= 20 ? "warn" : "down" }));

  Academy.register("trading-foundations", {
    hours: 5,
    outcomes: [
      "Explain what a trade is, who takes the other side, and why most retail accounts lose.",
      "Read a quote: bid, ask, spread, base and quote currency, for forex, gold, indices and crypto.",
      "Convert any price move into pips or points, and any pip move into money for a given lot size.",
      "Explain leverage and margin honestly, and know what a margin call and a stop-out are before they happen to you.",
    ],
    lessons: [
      {
        id: "tf1",
        module: "How trading works",
        title: "What a trade actually is",
        minutes: 8,
        summary: "A trade is an agreement to exchange one thing for another at a price. You profit if the price moves in your favour by more than it cost you to get in and out.",
        sections: [
          {
            h: "Buying and selling are the same act",
            p: [
              "Every trade has two sides. When you buy EURUSD you are buying euros and selling dollars at the same time. When you sell gold you are selling ounces of gold and receiving dollars. There is always a buyer and a seller, and they agree on one price.",
              "Going long means you buy first and sell later, so you profit if price rises. Going short means you sell first and buy back later, so you profit if price falls. With CFDs and futures you can go short as easily as long; you do not need to own the asset first.",
            ],
            fig: {
              type: "flow",
              title: "The life of one trade",
              tag: "Mechanism",
              perRow: 3,
              steps: ["You have an idea: price will rise", "You decide where you are wrong (stop)", "You size the position from that stop", "You open: buy at the ask", "Price moves; you follow the plan", "You close: sell at the bid, at stop or target"],
            },
          },
          {
            h: "Who is on the other side",
            p: [
              "In retail forex and CFDs, your broker is your counterparty. Some brokers pass your order to liquidity providers (banks and market makers); others keep the risk themselves. In exchange-traded futures and stocks, your order meets another participant's order on the exchange.",
              "Either way, the other side is not stupid. They are banks, funds, market makers and other traders, most of them with more information and better tools. Your edge has to come from somewhere specific: a repeatable setup, patience, and risk control.",
            ],
            note: "If you cannot say in one sentence why your trade should work, you are not trading a setup. You are guessing.",
          },
          {
            h: "Why most accounts lose",
            ul: [
              "Too much size: one bad trade or one bad week wipes out months.",
              "No stop, or a stop that gets moved: small losses become account-ending losses.",
              "Costs ignored: spread, commission and swap quietly eat small-target strategies.",
              "No written plan, so every decision is made in the heat of the moment.",
              "Quitting a method after five losses, then starting another one.",
            ],
            note: "Broker regulators in Europe and the UK force brokers to publish the share of retail CFD accounts that lose money. It is usually between 60% and 80%. You are not trying to be average.",
          },
        ],
        takeaways: [
          "Long profits when price rises; short profits when price falls.",
          "Every trade has a counterparty with at least as much information as you.",
          "Accounts die from size, missing stops and costs, not from one wrong opinion.",
        ],
        mistakes: [
          "Believing you need to own an asset to sell it on a CFD platform.",
          "Treating the broker's demo results as proof the strategy works live.",
          "Opening a trade before deciding where it is wrong.",
        ],
        psych: "Beginners focus on being right. Professionals focus on what happens when they are wrong. Start with the second habit on day one and you skip years of pain.",
        practice: "Write down, in one sentence each, what long and short mean, and who takes the other side of your trades at your broker. Look it up in your broker's client agreement if you are not sure.",
        apply: { label: "Open the trading journal", href: "journal.html", why: "Set up your journal before your first trade, so every trade is recorded from the start." },
      },
      {
        id: "tf2",
        module: "How trading works",
        title: "Quotes, bid, ask and spread",
        minutes: 8,
        summary: "Every market shows two prices. You buy at the higher one and sell at the lower one. The gap between them is the spread, and you pay it on every trade.",
        sections: [
          {
            h: "Reading a quote",
            p: [
              "A forex pair is written BASE/QUOTE. EURUSD 1.1700 means one euro costs 1.1700 US dollars. If EURUSD rises, the euro is getting stronger against the dollar. USDJPY 150.00 means one dollar costs 150 yen.",
              "Gold (XAUUSD) is quoted in dollars per troy ounce. Indices such as US500 or NAS100 are quoted in points. Bitcoin (BTCUSD) is quoted in dollars per coin.",
            ],
          },
          {
            h: "Bid, ask and the spread",
            ul: [
              "Bid: the price you can sell at. It is the lower of the two.",
              "Ask (or offer): the price you can buy at. It is the higher of the two.",
              "Spread = ask minus bid. You start every trade down by the spread.",
              "Charts usually show the bid. Your long is filled at the ask, which is above the candle you see.",
            ],
            fig: {
              type: "flow",
              title: "Why a new trade starts slightly negative",
              tag: "Mechanism",
              perRow: 3,
              steps: ["Bid 1.17000 / Ask 1.17008", "You buy at 1.17008", "Your position is valued at the bid, 1.17000", "You are -0.8 pips immediately", "Price must rise 0.8 pips to break even", "Wider spread, bigger hurdle"],
            },
            note: "Spreads widen around news, at the daily rollover (17:00 New York time, which is 00:00 EAT in the northern summer and 01:00 EAT in winter) and on thin markets. A stop that is fine at 14:00 EAT can be hit by the spread alone at 00:05.",
          },
          {
            h: "Other costs",
            ul: [
              "Commission: some accounts charge a fixed fee per lot instead of, or on top of, a wider spread.",
              "Swap (financing): a daily credit or debit for holding a leveraged position overnight. Wednesday often charges three days to cover the weekend.",
              "Slippage: the difference between the price you wanted and the price you got, common on stops during fast markets.",
            ],
          },
        ],
        takeaways: [
          "Buy at the ask, sell at the bid; the spread is the gap.",
          "Charts show the bid, so longs are filled slightly above what you see.",
          "Spread, commission, swap and slippage are all real costs. Measure them.",
        ],
        mistakes: [
          "Placing a short's stop exactly at a high on the chart and being stopped by the spread.",
          "Scalping for 3 pips on an account that costs 1.5 pips round trip.",
          "Holding trades through rollover without checking the swap.",
        ],
        psych: "Costs feel small per trade, so they are easy to ignore. Over 200 trades a year they decide whether a thin edge is profitable at all.",
        practice: "Open your platform at three times today (morning, London open, rollover) and write down the EURUSD and XAUUSD spread each time.",
        apply: { label: "Check your costs in the calculators", href: "calculators.html", why: "Use the pip value calculator to see what your normal spread costs per lot in money." },
      },
      {
        id: "tf3",
        module: "Instruments",
        title: "What you can trade",
        minutes: 9,
        summary: "Forex, gold, indices, crypto and synthetic indices all trade on the same platforms, but they move differently. Start with one or two and learn their personality.",
        sections: [
          {
            h: "The main groups",
            ul: [
              "Major forex pairs: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD. Tight spreads, deep liquidity, driven by interest rates and economic data.",
              "Crosses: pairs without the dollar, such as EURGBP or GBPJPY. Wider spreads, often trend strongly.",
              "Gold (XAUUSD): moves several times more than EURUSD in percentage terms. Sensitive to US yields, the dollar and risk sentiment.",
              "Stock indices: US500, NAS100, US30, GER40. Trend with the economy and earnings, with sharp moves at the US cash open.",
              "Crypto: BTCUSD, ETHUSD. Trades every day including weekends, with large moves and wider spreads.",
              "Synthetic indices (for example Deriv's Volatility indices): generated by a random number process with fixed volatility, available 24/7. No news drives them, but they are not easier.",
            ],
          },
          {
            h: "Volatility is the difference that matters",
            p: [
              "The same chart pattern needs a different stop on different instruments. A 20-pip stop on EURUSD might be sensible; the same idea on gold might need 10 to 20 dollars, which is 100 to 200 pips in gold terms.",
              "Use the Average True Range (ATR) to compare. If EURUSD's daily ATR is 60 pips and gold's is 40 dollars, gold is not 'more pips'; it is a different animal that needs its own sizing.",
            ],
            note: "Pick one forex major and gold, or one index, and trade only those for your first three months. Knowing how one market behaves at 10:00 and 16:30 EAT is worth more than watching twenty.",
          },
          {
            h: "Trading hours in East Africa Time",
            ul: [
              "Forex and gold: Monday around 00:00 to Saturday around 00:00 EAT, almost continuously.",
              "Busiest forex hours: London open (10:00 to 11:00 EAT) and the London and New York overlap (15:00 to 19:00 EAT).",
              "US indices: most active from the US cash open, 16:30 EAT (17:30 in the northern winter).",
              "Crypto and synthetics: 24 hours, 7 days.",
            ],
          },
        ],
        takeaways: [
          "Different instruments have different volatility, costs and drivers.",
          "Compare instruments with ATR, not with pips.",
          "Specialise in one or two markets while you learn.",
        ],
        mistakes: [
          "Using the same stop in pips on EURUSD and gold.",
          "Trading exotic pairs with wide spreads because 'they move more'.",
          "Assuming synthetic indices are predictable because no news moves them.",
        ],
        psych: "New traders jump between markets hunting for the one that finally works. The market is rarely the problem; the process is.",
        practice: "Look up the 14-day ATR on the daily chart of EURUSD, XAUUSD and NAS100. Write down how many of your 'normal' stops fit inside one day's range on each.",
        apply: { label: "Open the charts", href: "charts.html", why: "Open the daily chart of each instrument and pick your two focus markets." },
      },
      {
        id: "tf4",
        module: "The units",
        title: "Pips, points, lots and pip value",
        minutes: 11,
        summary: "A pip is a unit of price. A lot is a unit of size. Pip value joins the two and turns a price move into money. Master this and position sizing becomes simple arithmetic.",
        sections: [
          {
            h: "Pips and points",
            ul: [
              "For most forex pairs a pip is the fourth decimal: 0.0001. EURUSD from 1.17000 to 1.17100 is 10 pips.",
              "For yen pairs a pip is the second decimal: 0.01. USDJPY from 150.00 to 150.50 is 50 pips.",
              "The fifth decimal (or third on yen) is a pipette: one tenth of a pip.",
              "Gold, indices and crypto are usually counted in dollars or points. Gold from 3,350.00 to 3,360.00 is a 10-dollar move.",
            ],
          },
          {
            h: "Lots",
            ul: [
              "Standard lot (1.00) = 100,000 units of the base currency.",
              "Mini lot (0.10) = 10,000 units.",
              "Micro lot (0.01) = 1,000 units.",
              "Gold: 1.00 lot is usually 100 ounces. Check your broker's contract specification; indices and crypto vary widely.",
            ],
          },
          {
            h: "Pip value: turning pips into money",
            p: [
              "For any pair quoted in US dollars (EURUSD, GBPUSD, AUDUSD), one pip on one standard lot is worth 10 dollars. A mini lot is 1 dollar per pip; a micro lot is 10 cents.",
              "On gold with 100 ounces per lot, every 1-dollar move is 100 dollars per lot, or 1 dollar per 0.01 lot.",
            ],
            fig: {
              type: "shot",
              src: "tf-pips-eurusd",
              title: "Measuring a move in pips and money",
              tag: "Real chart",
              caption: "From 1.16063 to 1.16809 is 0.00746, which is 74.6 pips. At 10 dollars per pip per standard lot, that is 746 dollars on 1.00 lot, 74.60 on 0.10 and 7.46 on 0.01.",
              meta: "EURUSD · 1H · 19 Aug 2026",
              alt: "EURUSD hourly chart with a measured move of 74.6 pips",
            },
            note: "For pairs not quoted in dollars, such as USDJPY or EURGBP, pip value changes with price. Let the calculator do it; the idea is identical.",
          },
          {
            h: "A worked example",
            p: [
              "You have a 1,000-dollar account and risk 1%, so 10 dollars. Your EURUSD stop is 20 pips away. Money per pip you can afford = 10 / 20 = 0.50 dollars per pip. At 10 dollars per pip per lot, that is 0.05 lots.",
              "If the stop were 40 pips, the same 10 dollars allows 0.25 dollars per pip, which is 0.025 lots. Wider stop, smaller position, same risk.",
            ],
          },
        ],
        takeaways: [
          "Pip = 0.0001 on most pairs, 0.01 on yen pairs.",
          "1.00 lot on a USD-quoted pair = 10 dollars per pip.",
          "Lot size = money at risk / (stop in pips x pip value per lot).",
        ],
        mistakes: [
          "Counting pipettes as pips and sizing ten times too big.",
          "Assuming gold's lot size matches your last broker's.",
          "Choosing the lot size first and then fitting a stop around it.",
        ],
        psych: "Once the arithmetic is automatic, a trade becomes a number you have already accepted. That is what makes it possible to sit through a trade calmly.",
        practice: "For a 500-dollar account at 1% risk, work out the lot size for a 15-pip, 30-pip and 60-pip EURUSD stop. Check your answers in the position size calculator.",
        apply: { label: "Open the position size calculator", href: "calculators.html", why: "Enter your account, risk and stop and confirm your hand calculations." },
      },
      {
        id: "tf5",
        module: "Leverage and margin",
        title: "What leverage really does",
        minutes: 10,
        summary: "Leverage lets you control a large position with a small deposit. It does not change how far price moves; it changes how much of your account that move is worth.",
        sections: [
          {
            h: "Margin is a deposit, not a cost",
            p: [
              "At 1:100 leverage, a position needs 1% of its value as margin. One standard lot of EURUSD at 1.1700 is worth 117,000 dollars, so it needs 1,170 dollars of margin. The margin is set aside while the trade is open and returned when you close.",
              "The broker's leverage figure is the maximum you are allowed. The leverage you actually use is position value divided by your account equity. That is the number that matters.",
            ],
          },
          {
            h: "Effective leverage and a 2% move",
            p: ["A 2% move is an ordinary week for gold and a busy week for EURUSD. Here is what it does to your account depending on how much leverage you actually use."],
            fig: {
              type: "bars",
              title: "Account left after a 2% move against you",
              tag: "By effective leverage",
              max: 100,
              items: lev,
              caption: "At 50x effective leverage a normal 2% move ends the account. Position size, set from your stop, is what keeps effective leverage sensible.",
            },
          },
          {
            h: "Margin calls and stop-outs",
            ul: [
              "Equity = balance plus or minus open profit and loss.",
              "Margin level = equity / used margin x 100%.",
              "Margin call: many brokers warn you at a margin level around 100%. You can no longer open trades.",
              "Stop-out: at a lower level, often 50% (it varies by broker), the broker starts closing your positions at market, largest loser first.",
              "A stop-out is not a strategy. If you ever get near one, your size was wrong.",
            ],
            note: "Size every trade from the stop and 1% risk and you will almost never see a margin call, whatever leverage the broker offers.",
          },
        ],
        takeaways: [
          "Margin is a deposit that is returned when the trade closes.",
          "Effective leverage = position value / equity.",
          "Margin calls and stop-outs are symptoms of oversizing.",
        ],
        mistakes: [
          "Choosing 1:1000 leverage and using all of it.",
          "Thinking free margin is money you can afford to lose.",
          "Adding to a losing trade to 'average down' until the stop-out does it for you.",
        ],
        psych: "High leverage feels like opportunity. It is really the speed at which a mistake reaches your account.",
        practice: "Find your broker's margin call and stop-out levels in the account terms. Then calculate your effective leverage on your last three trades.",
        apply: { label: "Review risk management", href: "learn.html#mc/risk-management", why: "The Risk Management Masterclass turns these numbers into daily rules." },
      },
      {
        id: "tf6",
        module: "Leverage and margin",
        title: "Choosing a broker and your first plan",
        minutes: 9,
        summary: "A broker holds your money and fills your orders. Choose one for regulation and execution, not bonuses. Then write a one-page plan before your first live trade.",
        sections: [
          {
            h: "What to check in a broker",
            ul: [
              "Regulation you can verify on the regulator's own website: for example the FCA (UK), CySEC (Cyprus), ASIC (Australia), or the Capital Markets Authority in Kenya and Uganda for local firms.",
              "Segregated client funds and negative balance protection.",
              "Typical spreads and commission on the instruments you will actually trade, at the hours you will trade them.",
              "Deposits and withdrawals that work in your country, including mobile money where offered, with clear fees and times.",
              "Avoid: guaranteed returns, deposit bonuses with withdrawal conditions, and 'account managers' who call you to trade more.",
            ],
          },
          {
            h: "A one-page starting plan",
            fig: {
              type: "flow",
              title: "The1% starter plan",
              tag: "Template",
              perRow: 3,
              steps: ["Markets: one forex major and gold", "Hours: London open or the overlap, in EAT", "Setup: one, written as rules", "Risk: 1% per trade, 3% per day max", "Records: every trade in the journal", "Review: every Sunday, 30 minutes"],
            },
            note: "Trade the demo for at least 50 trades with the plan unchanged, then go live with the smallest size your broker allows. The first goal of a live account is to follow the plan, not to make money.",
          },
        ],
        takeaways: [
          "Regulation, execution and withdrawals matter more than bonuses.",
          "A plan fits on one page: markets, hours, setup, risk, records, review.",
          "Demo first, then live at minimum size.",
        ],
        mistakes: [
          "Picking a broker because a friend or a signals group recommended it.",
          "Depositing money you need for rent or school fees.",
          "Changing the plan after every losing day.",
        ],
        psych: "Your first live trades will feel very different from demo, even at 0.01 lots. That feeling is the thing you are training; keep the size small until it fades.",
        practice: "Write your one-page plan using the six boxes above and save it where you will see it before every session.",
        apply: { label: "Set your rules in The1%", href: "journal.html", why: "Record your plan in the journal so each trade can be checked against it." },
      },
    ],
    quiz: [
      { q: "You go short EURUSD. You profit if…", options: ["EURUSD rises", "EURUSD falls", "The spread widens", "Swap is positive"], a: 1, why: "A short sells first and buys back lower.", lesson: "tf1" },
      { q: "Which is the price you buy at?", options: ["The bid", "The ask", "The mid", "The close"], a: 1, why: "You buy at the ask, the higher of the two prices.", lesson: "tf2" },
      { q: "Why is a new long trade slightly negative right after opening?", options: ["The broker charges a fee on the chart", "It was bought at the ask and is valued at the bid", "Leverage", "Swap is charged immediately"], a: 1, why: "The spread between ask and bid is the immediate cost.", lesson: "tf2" },
      { q: "EURUSD moves from 1.16500 to 1.16850. How many pips?", options: ["3.5", "35", "350", "0.35"], a: 1, why: "0.00350 divided by 0.0001 is 35 pips.", lesson: "tf4" },
      { q: "One standard lot on GBPUSD is worth about how much per pip?", options: ["1 dollar", "10 dollars", "100 dollars", "0.10 dollars"], a: 1, why: "On USD-quoted pairs, 1.00 lot = 10 dollars per pip.", lesson: "tf4" },
      { q: "Account 2,000 dollars, 1% risk, EURUSD stop 25 pips. Lot size?", options: ["0.08", "0.8", "0.25", "0.02"], a: 0, why: "20 dollars / 25 pips = 0.80 dollars per pip = 0.08 lots.", lesson: "tf4" },
      { q: "Gold moves from 3,400 to 3,380 with 0.05 lots open (100 oz per lot). The money change is…", options: ["20 dollars", "100 dollars", "200 dollars", "1,000 dollars"], a: 1, why: "0.05 lots = 5 oz; 5 x 20 dollars = 100 dollars.", lesson: "tf4" },
      { q: "Effective leverage is…", options: ["The maximum your broker allows", "Position value divided by equity", "Margin divided by balance", "Always 1:100"], a: 1, why: "What matters is the leverage you actually use.", lesson: "tf5" },
      { q: "A stop-out means…", options: ["Your stop-loss was hit", "The broker closes positions because margin level fell too low", "The market closed", "You withdrew funds"], a: 1, why: "It is the broker closing trades at a set margin level.", lesson: "tf5" },
      { q: "Which is the best sign of a trustworthy broker?", options: ["A large deposit bonus", "Regulation you can verify on the regulator's site", "Guaranteed monthly returns", "A manager who calls you daily"], a: 1, why: "Verify regulation directly; bonuses and guarantees are warning signs.", lesson: "tf6" },
    ],
  });
})();
