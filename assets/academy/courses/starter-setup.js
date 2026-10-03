/* The1% Academy — Start Here: Broker, MT5 & Your First Setup (full course)
   The course every new trader takes first: choose a broker, open and verify
   an account, install MetaTrader 5 on PC and phone, log in, and place a
   first practice trade with a stop and a target. */
(() => {
  Academy.register("starter-setup", {
    hours: 3,
    outcomes: [
      "Know what to check before trusting a broker, and how Exness and other popular brokers compare.",
      "Open, verify and fund a broker account safely, starting on demo first.",
      "Install MetaTrader 5 on Windows, Mac, Android and iPhone and log in to your account.",
      "Set up clean charts and place, edit and close a trade with a stop loss and take profit.",
    ],
    lessons: [
      {
        id: "ss1",
        module: "Choosing a broker",
        title: "What a broker does and how to pick a safe one",
        minutes: 9,
        yt: "how to choose a forex broker for beginners regulation",
        summary: "Your broker holds your money and fills your trades. Regulation, withdrawals, costs and platform support matter far more than bonuses.",
        sections: [
          {
            h: "What a broker actually does",
            p: [
              "A broker gives you access to the market. You deposit money with them, they give you a trading account and a platform (usually MetaTrader 5), and every trade you place goes through them.",
              "Because they hold your money, the most important question is not how low the spread is. It is: will I get my money back when I ask for it?",
            ],
          },
          {
            h: "The broker checklist",
            ul: [
              "Regulation: look up the licence number on the regulator's own website (FCA, CySEC, FSCA, FSA Seychelles, CMA Kenya and so on). A name in the footer is not proof.",
              "Withdrawals: read real reviews about withdrawals, not deposits. Test with a small withdrawal early.",
              "Payment methods: mobile money, local bank, card or crypto that works in your country.",
              "Costs: spread, commission and swap on the instruments you actually trade (EURUSD, gold, indices).",
              "Platform: MetaTrader 5 support on desktop and mobile.",
              "Support: live chat that answers in minutes, in your language.",
            ],
            note: "Avoid anyone who manages your account for you, promises fixed monthly returns, or contacts you first on WhatsApp or Telegram. Those are the most common scams in retail trading.",
          },
          {
            h: "Popular brokers traders start with",
            p: [
              "Exness is widely used in Africa, Asia and the Middle East: instant withdrawals to mobile money and local banks in many countries, low minimum deposits, and MT4/MT5 support. Other well-known options include IC Markets, XM, Pepperstone, HFM (HotForex) and FBS, and Deriv for synthetic indices.",
              "None of these is a recommendation to deposit. Check which entity of the broker will hold your account in your country, and what that regulator protects.",
            ],
            note: "The1% does not take payment from any broker. Pick by the checklist, not by a sign-up bonus.",
          },
        ],
        takeaways: [
          "Regulation and smooth withdrawals come before low spreads.",
          "Verify the licence on the regulator's own website.",
          "Never give anyone else access to your account or your money.",
        ],
        mistakes: [
          "Choosing a broker because of a deposit bonus.",
          "Sending money to an 'account manager' who promised profits.",
          "Never testing a withdrawal until the account is large.",
        ],
        psych: "Excitement makes you want to start today. Ten minutes of checking a broker now saves you from losing everything to the wrong one.",
        practice: "Write down two brokers you are considering. For each, find the licence number and check it on the regulator's website. Note the minimum deposit and withdrawal methods for your country.",
        apply: { label: "Read the Trading Foundations course next", href: "learn.html#mc/trading-foundations", why: "Learn pips, lots and leverage before you trade real money." },
      },
      {
        id: "ss2",
        module: "Choosing a broker",
        title: "Account types: demo, standard and raw spread",
        minutes: 7,
        yt: "exness account types standard vs raw spread vs zero explained",
        summary: "Start on demo. When you go live, a standard account is simplest; raw spread or zero accounts suit traders who trade often and understand commission.",
        sections: [
          {
            h: "Demo versus live",
            p: [
              "A demo account uses pretend money on real prices. It is where you learn the platform, test your plan and make beginner mistakes for free.",
              "A live account uses real money. Fills, slippage and, above all, your emotions are different. Move to live with a small amount once you can follow your rules on demo for at least a month.",
            ],
          },
          {
            h: "Common live account types",
            ul: [
              "Standard: no commission, the cost is inside a slightly wider spread. Best for most beginners.",
              "Raw spread / ECN: very tight spreads plus a fixed commission per lot. Cheaper for frequent traders.",
              "Zero: near-zero spread on major pairs with commission. Similar idea to raw.",
              "Cent / micro: balances shown in cents, so very small trade sizes. Good for a first live month with tiny risk.",
            ],
          },
          {
            h: "Leverage: pick the setting, but control the risk",
            p: [
              "Brokers like Exness offer very high or even 'unlimited' leverage. Leverage only changes how much margin a trade needs; your real risk comes from your lot size and stop distance.",
              "A sensible beginner setting is 1:100 to 1:500, combined with risking 1% or less per trade. The Risk Management course shows the maths.",
            ],
            note: "High leverage is not free money. It just makes it possible to open trades far too large for your account.",
          },
        ],
        takeaways: [
          "Learn on demo first; move to a small live account when you follow rules consistently.",
          "Standard accounts are simplest; raw/zero accounts trade spread for commission.",
          "Lot size and stop distance set your risk, not the leverage number.",
        ],
        mistakes: [
          "Going live with your whole savings on day one.",
          "Choosing 'unlimited leverage' and then sizing up to match it.",
          "Comparing spreads without adding the commission.",
        ],
        psych: "Demo feels boring because nothing is at stake. That boredom is the point: build the habit before the money makes it hard.",
        practice: "Compare a standard and a raw account at your chosen broker on EURUSD: write down the spread plus commission for 1 lot on each.",
        apply: { label: "Open the position size calculator", href: "calculators.html", why: "See how lot size, not leverage, decides your risk." },
      },
      {
        id: "ss3",
        module: "Opening your account",
        title: "Register and verify your account (Exness example)",
        minutes: 10,
        yt: "how to create and verify exness account step by step",
        summary: "Sign up in the broker's Personal Area, verify your identity and address (KYC), turn on two-step security, and create a demo and a real MT5 trading account.",
        sections: [
          {
            h: "Step by step",
            fig: {
              type: "flow",
              title: "Opening a broker account",
              tag: "Steps",
              perRow: 3,
              steps: ["Register with email and country", "Confirm email and phone", "Upload ID (passport or national ID)", "Upload proof of address", "Create MT5 demo and real accounts", "Note login, password and server"],
            },
          },
          {
            h: "Inside the Personal Area",
            ul: [
              "Register on the broker's official website or app. Type the address yourself; do not use links from strangers.",
              "Complete your profile with your real name exactly as on your ID, or withdrawals will be blocked later.",
              "Verification (KYC): a clear photo of your national ID or passport, then a recent utility bill or bank statement showing your address.",
              "Security: set a strong unique password and turn on two-step verification.",
              "Create a trading account: choose MT5, the account type (start with demo or standard), currency (USD) and leverage, and set a trading password.",
            ],
          },
          {
            h: "The three details you must save",
            p: [
              "Every MT5 account has a login number, a trading password and a server name (for example Exness-MT5Trial or Exness-MT5Real8). You need all three to log in on any device. The broker shows them in the account details.",
            ],
            note: "Your Personal Area password and your MT5 trading password are different. Keep both private; nobody legitimate will ask for them.",
          },
        ],
        takeaways: [
          "Use your real details so withdrawals are never blocked.",
          "Turn on two-step verification immediately.",
          "Save login, password and server for every MT5 account.",
        ],
        mistakes: [
          "Signing up through a stranger's link that gives them control or rebates on your account.",
          "Mixing up the Personal Area password with the MT5 password.",
          "Not writing down which server the account is on.",
        ],
        psych: "Admin feels like a distraction from 'real' trading. Treat it as the first test of whether you can follow a process.",
        practice: "Create one MT5 demo account at your broker and write its login, server and leverage in a safe place.",
        apply: { label: "Set up your trading journal", href: "journal.html", why: "Record your account details and starting balance." },
      },
      {
        id: "ss4",
        module: "Opening your account",
        title: "Deposits and withdrawals done safely",
        minutes: 6,
        yt: "exness deposit and withdrawal mobile money tutorial",
        summary: "Fund only from accounts in your own name, start small, and test a withdrawal early so you know the money comes back.",
        sections: [
          {
            h: "Depositing",
            ul: [
              "Use a method in your own name: mobile money (MTN, Airtel, M-Pesa), local bank, card or crypto, depending on your country.",
              "Deposit an amount you can afford to lose completely while learning.",
              "Transfer funds from the Personal Area wallet to the specific trading account if your broker uses a wallet.",
            ],
          },
          {
            h: "Withdrawing",
            ul: [
              "Close or reduce trades first so the money is free margin.",
              "Most brokers send withdrawals back by the same method you deposited with.",
              "Make a small test withdrawal in your first week.",
            ],
            note: "If a 'manager' asks you to pay a fee or tax before you can withdraw, it is a scam. Real brokers never ask for that.",
          },
        ],
        takeaways: [
          "Only use payment methods in your own name.",
          "Start with money you can afford to lose.",
          "Test a withdrawal early.",
        ],
        mistakes: [
          "Depositing more after losses to 'win it back'.",
          "Paying 'release fees' to get money out.",
        ],
        psych: "The urge to top up after a loss is the most expensive feeling in trading. Decide your total learning budget now, in writing.",
        practice: "Write your learning budget: the total you will deposit in the next three months, no matter what.",
        apply: { label: "Open the risk calculator", href: "calculators.html", why: "Turn your budget into a safe risk per trade." },
      },
      {
        id: "ss5",
        module: "MetaTrader 5 on PC and Mac",
        title: "Download, install and log in to MT5 on a computer",
        minutes: 9,
        yt: "how to download install metatrader 5 on pc and login to broker account",
        summary: "Install MT5 from the broker or MetaQuotes, then File → Login to Trade Account using your login, password and server.",
        sections: [
          {
            h: "Installing",
            ul: [
              "Windows: download MT5 from your broker's site or metatrader5.com and run the installer.",
              "Mac: download the macOS version from metatrader5.com, or use the broker's web terminal in the browser.",
              "Web: most brokers also offer MT5 WebTerminal, which needs no install.",
            ],
          },
          {
            h: "Logging in",
            fig: {
              type: "flow",
              title: "Connecting MT5 to your account",
              tag: "Steps",
              perRow: 3,
              steps: ["Open MT5", "File → Login to Trade Account", "Enter login number", "Enter trading password", "Choose the exact server", "Check the connection bar in the corner"],
            },
            note: "If your server is missing, use File → Open an Account, type the broker name (for example Exness) and pick the server from the list, then cancel and log in.",
          },
          {
            h: "Your first look around",
            ul: [
              "Market Watch: the list of symbols and live prices. Right-click → Show All to see every instrument.",
              "Navigator: your accounts, indicators and expert advisors.",
              "Toolbox: Trade (open positions), History, and Journal (connection messages).",
              "Bottom right: the connection status. A red 'No connection' means the login or server is wrong.",
            ],
          },
        ],
        takeaways: [
          "Log in with login + trading password + exact server.",
          "Market Watch, Navigator and Toolbox are the three panels you use every day.",
          "Check the connection status before trusting any prices.",
        ],
        mistakes: [
          "Choosing a similar-looking server name.",
          "Using the Personal Area password instead of the trading password.",
          "Downloading MT5 from unofficial sites.",
        ],
        psych: "A platform you know well is calmer to trade on. Spend an hour clicking around on demo before you ever risk money.",
        practice: "Install MT5 on your computer, log in to your demo account, and add EURUSD, XAUUSD and US30 (or your markets) to Market Watch.",
        apply: { label: "Open the charts page", href: "charts.html", why: "Compare MT5 with the The1% chart tools." },
      },
      {
        id: "ss6",
        module: "MetaTrader 5 on PC and Mac",
        title: "Set up clean charts and templates",
        minutes: 8,
        yt: "mt5 chart setup tutorial candlesticks colors template",
        summary: "Switch to candlesticks, pick readable colours, remove clutter, and save a template so every chart opens the same way.",
        sections: [
          {
            h: "The clean chart routine",
            ul: [
              "Right-click the chart → Properties (F8): choose candlesticks, a plain background and clear up/down colours. Turn off the grid.",
              "Timeframe buttons along the toolbar: M15, H1, H4, D1 are where most beginners should start.",
              "Turn on 'Show Ask line' so you see the real buying price as well as the bid.",
              "Right-click → Template → Save Template, and name it 'default' so new charts open with it.",
              "Window → Tile or arrange four charts (D1, H4, H1, M15) and save it as a profile.",
            ],
          },
          {
            h: "Drawing tools you will use",
            p: ["Horizontal lines and rectangles for levels and zones, trendlines, and the Fibonacci tool. Keep it simple: if you cannot read the chart in five seconds, remove something."],
          },
        ],
        takeaways: [
          "Candlesticks, no grid, clear colours, Ask line on.",
          "Save a template and a profile so setup is one click.",
          "Fewer drawings and indicators make clearer decisions.",
        ],
        mistakes: ["Loading ten indicators before learning to read price.", "Forgetting the Ask line and wondering why a buy stop triggered early."],
        psych: "A cluttered chart gives you a reason for any trade you already wanted to take. A clean chart forces honesty.",
        practice: "Build and save a template and a four-chart profile on your demo account.",
        apply: { label: "Start the Candlestick course", href: "learn.html#mc/candlesticks", why: "Now that the chart shows candles, learn to read them." },
      },
      {
        id: "ss7",
        module: "MetaTrader 5 on your phone",
        title: "MT5 on Android and iPhone",
        minutes: 8,
        yt: "how to use mt5 mobile app beginners login exness android iphone",
        summary: "Install MetaTrader 5 from Google Play or the App Store, add your account with the exact server, and learn Quotes, Chart, Trade and History.",
        sections: [
          {
            h: "Install and log in",
            fig: {
              type: "flow",
              title: "MT5 on your phone",
              tag: "Steps",
              perRow: 3,
              steps: ["Install MetaTrader 5 by MetaQuotes", "Settings → New Account", "Search your broker (e.g. Exness)", "Pick the exact server", "Enter login and trading password", "Sign in and check Quotes"],
            },
            note: "Only install the app published by MetaQuotes Ltd. Fake copies exist.",
          },
          {
            h: "The four tabs",
            ul: [
              "Quotes: your symbol list. Tap + to add symbols.",
              "Chart: tap the screen for the crosshair; rotate the phone for a wider view; tap 'f' for indicators.",
              "Trade: open positions, balance, equity and free margin.",
              "History: closed trades and deposits.",
            ],
          },
          {
            h: "Phone trading rules",
            p: ["Phones are perfect for checking and managing trades, and dangerous for impulsive entries. Do your analysis on a computer where you can, and always set the stop loss on the phone before you press Buy or Sell."],
          },
        ],
        takeaways: [
          "Use the official MetaQuotes app and the exact server.",
          "Quotes, Chart, Trade and History are the four tabs.",
          "Use the phone to manage trades, not to chase them.",
        ],
        mistakes: ["Opening trades from bed or in a taxi without a plan.", "Installing a copycat app and typing your password into it."],
        psych: "The phone makes the market available every minute. Turn off price alerts that tempt you and keep only the alerts from your plan.",
        practice: "Log in to your demo account on your phone and set an alert at a level you marked on your computer.",
        apply: { label: "Open the dashboard", href: "dashboard.html", why: "Your plan and stats live here, not in the phone app." },
      },
      {
        id: "ss8",
        module: "Your first trade",
        title: "Place, edit and close a trade with stop and target",
        minutes: 10,
        yt: "how to place buy sell trade with stop loss and take profit on mt5",
        summary: "Use New Order to choose volume, set a stop loss and take profit, then modify or close the trade from the Trade tab. Practise on demo.",
        sections: [
          {
            h: "Market orders",
            ul: [
              "Click New Order (or F9), choose the symbol and the volume (lot size).",
              "Type your Stop Loss and Take Profit prices before clicking Buy or Sell.",
              "Buy fills at the Ask price; Sell fills at the Bid price.",
            ],
          },
          {
            h: "Pending orders",
            ul: [
              "Buy Limit: buy lower than the current price (on a pullback).",
              "Sell Limit: sell higher than the current price.",
              "Buy Stop: buy higher than the current price (breakout).",
              "Sell Stop: sell lower than the current price.",
            ],
          },
          {
            h: "Managing the trade",
            p: [
              "Double-click the trade in the Toolbox → Trade tab (or tap and hold on mobile) to modify the stop and target or close the trade. You can also drag the SL/TP lines on the chart.",
              "Before opening, calculate the lot size so the stop loses only 1% of your account. The The1% position size calculator does this for you.",
            ],
            note: "Never open a trade without a stop loss. One trade without a stop can undo months of work.",
          },
        ],
        takeaways: [
          "Set SL and TP before you click Buy or Sell.",
          "Limit orders wait for a better price; stop orders wait for a breakout.",
          "Size every trade from the stop distance.",
        ],
        mistakes: ["Using the default 1.00 lot on a small account.", "Confusing Buy Limit with Buy Stop.", "Moving the stop further away when price comes near it."],
        psych: "Your first live trade will feel huge. Make it small enough that the result does not matter, so you can focus on doing every step right.",
        practice: "On demo, place one market order and one pending order, each with SL and TP, then modify and close them. Log both in your journal.",
        apply: { label: "Open the position size calculator", href: "calculators.html", why: "Calculate the lot size for your first practice trade." },
      },
    ],
    quiz: [
      { q: "What is the most important thing to check before choosing a broker?", options: ["The size of the deposit bonus", "Regulation and a record of paying withdrawals", "How many indicators the platform has", "Whether influencers use it"], a: 1, why: "The broker holds your money, so safety and withdrawals come first.", lesson: "ss1" },
      { q: "Someone on WhatsApp offers to trade your account for fixed monthly profits. You should…", options: ["Accept if they show screenshots", "Give them your MT5 password only", "Refuse; it is a common scam", "Pay a small fee first to test"], a: 2, why: "Legitimate traders do not manage strangers' accounts for guaranteed returns.", lesson: "ss1" },
      { q: "A beginner should start on…", options: ["A large live account", "A demo account", "Unlimited leverage", "A raw account with 10 lots"], a: 1, why: "Demo lets you learn the platform and your plan without risking money.", lesson: "ss2" },
      { q: "What actually decides how much money you risk on a trade?", options: ["The leverage setting", "Lot size and stop loss distance", "The account currency", "The broker's server"], a: 1, why: "Leverage affects margin; lot size times stop distance sets the loss.", lesson: "ss2" },
      { q: "To log in to MT5 you need…", options: ["Email and Personal Area password", "Login number, trading password and server", "Only your phone number", "Your ID number"], a: 1, why: "Those three details identify and unlock the trading account.", lesson: "ss3" },
      { q: "If a 'manager' says you must pay a fee before withdrawing, it is…", options: ["Normal tax", "A scam", "A broker rule", "A verification step"], a: 1, why: "Real brokers never ask for release fees.", lesson: "ss4" },
      { q: "MT5 shows 'No connection' in the corner. The most likely cause is…", options: ["The market is trending", "Wrong login, password or server", "Too many indicators", "Low balance"], a: 1, why: "Connection fails when the credentials or server do not match.", lesson: "ss5" },
      { q: "Why save a chart template?", options: ["It improves your win rate", "So every chart opens with the same clean setup", "The broker requires it", "It lowers spreads"], a: 1, why: "Templates save time and keep charts consistent.", lesson: "ss6" },
      { q: "Which MT5 mobile app should you install?", options: ["Any app called MT5", "The one published by MetaQuotes Ltd", "One sent by a friend as a file", "A paid copy"], a: 1, why: "Copycat apps can steal your login details.", lesson: "ss7" },
      { q: "You want to buy only if price breaks above a level. Which order?", options: ["Buy Limit", "Sell Stop", "Buy Stop", "Sell Limit"], a: 2, why: "A Buy Stop sits above the current price and triggers on a breakout.", lesson: "ss8" },
    ],
  });
})();
