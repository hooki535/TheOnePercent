/* TheOnePercent — instrument reference and currency conversion
   -------------------------------------------------------------------
   Every calculator needs the same three facts about an instrument, and
   every one of them is wrong somewhere if each screen keeps its own copy:

     pip         the price move the market calls one pip or one tick
     contract    units in one standard lot or one contract
     unitValue   quote-currency money per 1.00 of price move, per unit

   That third field is the one most retail calculators get wrong. For a
   forex pair one unit of the base currency moves one unit of the quote
   currency, so unitValue is 1 and the size is carried by `contract`. For
   an index future the contract is one, and the multiplier lives in
   unitValue (Nasdaq 100 futures: 20 dollars a point). Keeping the two
   separate is what makes a single formula correct for both.

   Prices and FX rates here are INDICATIVE and static. Anything that
   displays them must show the Demo badge — see Instruments.DEMO_NOTE.
   When a live feed arrives it replaces `price` and `usdPerUnit` only;
   no formula and no screen changes.
   ------------------------------------------------------------------- */

window.Instruments = (() => {
  "use strict";

  const DEMO_NOTE =
    "Prices and conversion rates are indicative demo values, not a live feed. " +
    "Sizes, pip values and margins are still computed exactly — only the rate " +
    "they are converted at is a placeholder you can overwrite.";

  /* ---------------------------------------------------------- currencies
     One table, quoted as US dollars per one unit of the currency. Every
     conversion in the product goes through it, so a pair we do not list
     still converts correctly via the dollar. */

  const CURRENCIES = [
    { code: "USD", name: "US dollar", usdPerUnit: 1, dp: 2 },
    { code: "EUR", name: "Euro", usdPerUnit: 1.0842, dp: 2 },
    { code: "GBP", name: "Pound sterling", usdPerUnit: 1.2731, dp: 2 },
    { code: "JPY", name: "Japanese yen", usdPerUnit: 1 / 157.42, dp: 0 },
    { code: "CHF", name: "Swiss franc", usdPerUnit: 1 / 0.8974, dp: 2 },
    { code: "CAD", name: "Canadian dollar", usdPerUnit: 1 / 1.3668, dp: 2 },
    { code: "AUD", name: "Australian dollar", usdPerUnit: 0.6642, dp: 2 },
    { code: "NZD", name: "New Zealand dollar", usdPerUnit: 0.6098, dp: 2 },
    { code: "UGX", name: "Ugandan shilling", usdPerUnit: 1 / 3760, dp: 0 },
    { code: "KES", name: "Kenyan shilling", usdPerUnit: 1 / 129.2, dp: 0 },
    { code: "TZS", name: "Tanzanian shilling", usdPerUnit: 1 / 2610, dp: 0 },
    { code: "RWF", name: "Rwandan franc", usdPerUnit: 1 / 1315, dp: 0 },
    { code: "NGN", name: "Nigerian naira", usdPerUnit: 1 / 1540, dp: 0 },
    { code: "ZAR", name: "South African rand", usdPerUnit: 1 / 18.12, dp: 2 },
    { code: "GHS", name: "Ghanaian cedi", usdPerUnit: 1 / 15.1, dp: 2 },
  ];

  const byCode = {};
  CURRENCIES.forEach((c) => {
    byCode[c.code] = c;
  });

  function usdPerUnit(code) {
    const c = byCode[String(code || "").toUpperCase()];
    return c ? c.usdPerUnit : null;
  }

  /* amount of `from` expressed in `to`. Returns null rather than the
     original number when a currency is unknown, because silently not
     converting money is the worst failure available here. */
  function convert(amount, from, to) {
    const a = usdPerUnit(from);
    const b = usdPerUnit(to);
    if (!Number.isFinite(amount) || !a || !b) return null;
    return (amount * a) / b;
  }

  function rate(from, to) {
    const a = usdPerUnit(from);
    const b = usdPerUnit(to);
    return a && b ? a / b : null;
  }

  function decimals(code) {
    const c = byCode[String(code || "").toUpperCase()];
    return c ? c.dp : 2;
  }

  /* ---------------------------------------------------------- instruments */

  const INSTRUMENTS = [
    /* forex majors — pip is the fourth decimal, or the second on a yen pair */
    { symbol: "EURUSD", name: "Euro / US dollar", market: "Forex", base: "EUR", quote: "USD", price: 1.0842, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },
    { symbol: "GBPUSD", name: "Pound / US dollar", market: "Forex", base: "GBP", quote: "USD", price: 1.2731, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },
    { symbol: "USDJPY", name: "US dollar / yen", market: "Forex", base: "USD", quote: "JPY", price: 157.42, dp: 3, pip: 0.01, contract: 100000, unitValue: 1 },
    { symbol: "USDCHF", name: "US dollar / franc", market: "Forex", base: "USD", quote: "CHF", price: 0.8974, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },
    { symbol: "USDCAD", name: "US dollar / Canadian dollar", market: "Forex", base: "USD", quote: "CAD", price: 1.3668, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },
    { symbol: "AUDUSD", name: "Australian dollar / US dollar", market: "Forex", base: "AUD", quote: "USD", price: 0.6642, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },
    { symbol: "NZDUSD", name: "New Zealand dollar / US dollar", market: "Forex", base: "NZD", quote: "USD", price: 0.6098, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },
    { symbol: "EURJPY", name: "Euro / yen", market: "Forex", base: "EUR", quote: "JPY", price: 170.66, dp: 3, pip: 0.01, contract: 100000, unitValue: 1 },
    { symbol: "GBPJPY", name: "Pound / yen", market: "Forex", base: "GBP", quote: "JPY", price: 200.41, dp: 3, pip: 0.01, contract: 100000, unitValue: 1 },
    { symbol: "EURGBP", name: "Euro / pound", market: "Forex", base: "EUR", quote: "GBP", price: 0.8516, dp: 5, pip: 0.0001, contract: 100000, unitValue: 1 },

    /* East African pairs. Quoted at the bank rather than a broker, so the
       spread is wide and the pip is a whole point on the shilling pairs —
       both facts the charts screen shows rather than hides. These are here
       because the product is built in Kampala and a trader here checks
       USDUGX before anything on this list. */
    { symbol: "USDUGX", name: "US dollar / Ugandan shilling", market: "Forex", base: "USD", quote: "UGX", price: 3760, dp: 1, pip: 1, contract: 100000, unitValue: 1 },
    { symbol: "USDKES", name: "US dollar / Kenyan shilling", market: "Forex", base: "USD", quote: "KES", price: 129.2, dp: 2, pip: 0.01, contract: 100000, unitValue: 1 },
    { symbol: "USDZAR", name: "US dollar / South African rand", market: "Forex", base: "USD", quote: "ZAR", price: 18.12, dp: 4, pip: 0.0001, contract: 100000, unitValue: 1 },

    /* metals — one lot of spot gold is 100 ounces, silver 5,000 */
    { symbol: "XAUUSD", name: "Gold spot", market: "Commodities", base: "XAU", quote: "USD", price: 2341.5, dp: 2, pip: 0.1, contract: 100, unitValue: 1 },
    { symbol: "XAGUSD", name: "Silver spot", market: "Commodities", base: "XAG", quote: "USD", price: 27.86, dp: 3, pip: 0.01, contract: 5000, unitValue: 1 },

    /* crypto — sized in coins, so the contract is one */
    { symbol: "BTCUSD", name: "Bitcoin", market: "Crypto", base: "BTC", quote: "USD", price: 64218, dp: 1, pip: 1, contract: 1, unitValue: 1 },
    { symbol: "ETHUSD", name: "Ethereum", market: "Crypto", base: "ETH", quote: "USD", price: 3418.4, dp: 2, pip: 0.1, contract: 1, unitValue: 1 },
    { symbol: "SOLUSD", name: "Solana", market: "Crypto", base: "SOL", quote: "USD", price: 146.3, dp: 2, pip: 0.01, contract: 1, unitValue: 1 },

    /* index CFDs — one unit is one index point */
    { symbol: "US500", name: "S&P 500 index", market: "Indices", base: "US500", quote: "USD", price: 5431.6, dp: 1, pip: 0.1, contract: 1, unitValue: 1 },
    { symbol: "US30", name: "Dow 30 index", market: "Indices", base: "US30", quote: "USD", price: 38942, dp: 1, pip: 1, contract: 1, unitValue: 1 },
    { symbol: "DE40", name: "DAX 40 index", market: "Indices", base: "DE40", quote: "EUR", price: 18412, dp: 1, pip: 1, contract: 1, unitValue: 1 },
    { symbol: "NAS100", name: "US tech 100 index", market: "Indices", base: "NAS100", quote: "USD", price: 19846, dp: 1, pip: 1, contract: 1, unitValue: 1 },
    { symbol: "DXY", name: "US dollar index", market: "Indices", base: "DXY", quote: "USD", price: 104.32, dp: 2, pip: 0.01, contract: 1, unitValue: 100 },

    /* futures — the multiplier is the whole point, so it lives in unitValue */
    { symbol: "NQ1!", name: "Nasdaq 100 futures", market: "Futures", base: "NQ", quote: "USD", price: 19884, dp: 2, pip: 0.25, contract: 1, unitValue: 20 },
    { symbol: "ES1!", name: "S&P 500 futures", market: "Futures", base: "ES", quote: "USD", price: 5438.25, dp: 2, pip: 0.25, contract: 1, unitValue: 50 },
    { symbol: "CL1!", name: "Crude oil futures", market: "Futures", base: "CL", quote: "USD", price: 78.42, dp: 2, pip: 0.01, contract: 1, unitValue: 1000 },
    { symbol: "GC1!", name: "Gold futures", market: "Futures", base: "GC", quote: "USD", price: 2352.7, dp: 1, pip: 0.1, contract: 1, unitValue: 100 },
  ];

  /* Cross rates are DERIVED, never typed. A hand-written EURJPY price
     disagrees with EUR-via-dollar-via-JPY by about a pip, and then the
     pip-value card and the currency converter quietly answer differently
     on the same screen. Any instrument whose base and quote are both in
     the currency table gets its price from the table, so the two can
     never drift. */
  INSTRUMENTS.forEach((i) => {
    const r = rate(i.base, i.quote);
    if (r) i.price = Number(r.toFixed(i.dp));
  });

  const bySymbol = {};
  INSTRUMENTS.forEach((i) => {
    bySymbol[i.symbol] = i;
  });

  function find(symbol) {
    return bySymbol[String(symbol || "").toUpperCase().trim()] || null;
  }

  /* Typical retail leverage, used only as the default in the margin
     calculator. The user can type any number over it. */
  const LEVERAGE = [
    { label: "1:1 — cash", value: 1 },
    { label: "1:5", value: 5 },
    { label: "1:10", value: 10 },
    { label: "1:20", value: 20 },
    { label: "1:30", value: 30 },
    { label: "1:50", value: 50 },
    { label: "1:100", value: 100 },
    { label: "1:200", value: 200 },
    { label: "1:500", value: 500 },
  ];

  /* ---------------------------------------------------------- maths
     One formula set, used by every card on the calculators screen.
     All of it is expressed per UNIT, then multiplied — that is why the
     same three lines size a yen pair, a bitcoin position and an
     e-mini contract without a single special case. */

  /* The rate that turns quote-currency money into account money.

     The table is the fallback, not the first answer. When the traded pair
     itself contains the account currency, the trade's own price is the
     honest rate: sizing USDJPY at 157.00 on a dollar account must convert
     yen at 157.00, not at whatever the reference table last said. That is
     exactly what a broker calculator does, and it is the difference
     between agreeing with it to 2dp and being a quarter of a percent out. */
  function fxToAccount(inst, acct, price) {
    if (!inst) return null;
    const account = String(acct || "").toUpperCase();
    if (!account) return null;
    if (inst.quote === account) return 1;
    if (inst.base === account && Number.isFinite(price) && price > 0) return 1 / price;
    return rate(inst.quote, account);
  }

  /* quote-currency money for a 1-unit position moving `move` in price */
  function moneyPerUnit(inst, move) {
    if (!inst || !Number.isFinite(move)) return null;
    return move * inst.unitValue;
  }

  /* what one pip of one lot is worth, in the quote currency */
  function pipValuePerLot(inst) {
    if (!inst) return null;
    return inst.pip * inst.unitValue * inst.contract;
  }

  /* distance between two prices, counted in pips */
  function pips(inst, a, b) {
    if (!inst || !Number.isFinite(a) || !Number.isFinite(b)) return null;
    return Math.abs(a - b) / inst.pip;
  }

  /* The position-size answer. `riskMoney` is in the account currency;
     everything internal is quote currency; the result comes back in both
     so no screen has to convert anything itself. */
  function positionSize(opts) {
    const inst = opts.instrument;
    const entry = opts.entry;
    const stop = opts.stop;
    const riskMoney = opts.riskMoney;
    const acct = opts.accountCurrency;
    const fx =
      Number.isFinite(opts.fxOverride) && opts.fxOverride > 0
        ? opts.fxOverride
        : fxToAccount(inst, acct, entry);

    if (!inst || !Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(riskMoney) || !fx) return null;
    const stopDistance = Math.abs(entry - stop);
    if (stopDistance <= 0) return null;

    const riskQuote = riskMoney / fx;            /* account money in quote terms */
    const riskPerUnitQuote = stopDistance * inst.unitValue;
    const units = riskQuote / riskPerUnitQuote;
    const lots = units / inst.contract;
    const notionalQuote = units * entry * inst.unitValue;

    return {
      fx,
      stopDistance,
      stopPips: stopDistance / inst.pip,
      units,
      lots,
      riskQuote,
      pipValueQuote: pipValuePerLot(inst) * lots,
      pipValueAccount: pipValuePerLot(inst) * lots * fx,
      notionalQuote,
      notionalAccount: notionalQuote * fx,
    };
  }

  /* Money a given size makes or loses moving from `from` to `to`. Signed
     by direction, in the account currency, net of fees. */
  function outcome(opts) {
    const inst = opts.instrument;
    const units = opts.units;
    const fx =
      Number.isFinite(opts.fxOverride) && opts.fxOverride > 0
        ? opts.fxOverride
        : fxToAccount(inst, opts.accountCurrency, opts.from);
    if (!inst || !Number.isFinite(units) || !Number.isFinite(opts.from) || !Number.isFinite(opts.to) || !fx) return null;
    const dir = opts.side === "Short" ? -1 : 1;
    const gross = (opts.to - opts.from) * dir * units * inst.unitValue * fx;
    return gross - (Number.isFinite(opts.fees) ? opts.fees : 0);
  }

  return {
    DEMO_NOTE,
    CURRENCIES,
    INSTRUMENTS,
    LEVERAGE,
    find,
    convert,
    rate,
    fxToAccount,
    decimals,
    usdPerUnit,
    moneyPerUnit,
    pipValuePerLot,
    pips,
    positionSize,
    outcome,
  };
})();
