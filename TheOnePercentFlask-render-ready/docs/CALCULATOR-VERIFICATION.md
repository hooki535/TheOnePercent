# Calculator verification

Phase 1's definition of done says position size, pip value and margin must
agree with a broker's own calculator to two decimal places. This is the check
that claim now rests on.

`tests/calculators.test.js` loads `assets/instruments.js` into a bare VM — no
DOM, no page, no `Store` — and compares every answer against the formula a
broker calculator uses, written out by hand rather than copied from the code:

```
size in lots = risk money / (stop in pips x pip value per lot in account currency)
```

The product does not use that formula. It works per unit and multiplies, which
is what lets one code path size a yen pair, an ounce of gold, a bitcoin and an
e-mini contract with no special cases. Getting the same number out of two
different formulas is the point of the test. Each case also carries a
**back-check**: take the size the calculator returned, move price from entry to
stop, and confirm the loss is the money that was asked for. A size that
back-checks to the requested risk is correct whatever route produced it.

**55 checks, 0 failing.** Run it with:

```
node tests/calculators.test.js
```

## What is covered

| Area | Cases |
| --- | --- |
| Pip / tick value per lot or contract | EURUSD 10.00, USDJPY 1000 JPY, gold 10.00, silver 50.00, NQ 5.00, ES 12.50, CL 10.00 |
| Position size, quote = account | EURUSD, XAUUSD, BTCUSD, NQ1! |
| Position size, account is the base | USDJPY — converts at the trade's own price |
| Position size, neither currency is the account | EURGBP, GBPJPY, DE40 (EUR-quoted index on a dollar account) |
| Position size, non-dollar account | EURUSD on a EUR account |
| Margin | EURUSD, USDJPY, XAUUSD, GBPUSD at 1:30, NQ1! |
| Profit and loss | long, short, fees deducted, yen conversion, futures multiplier |
| Currency conversion | USD→UGX, EUR→JPY→EUR round trip, every table rate against its pair's price |
| Degenerate input | stop equal to entry, unknown symbol, unknown currency — all return null, never a wrong number |

## What the check found

**1. Cross-rate drift — fixed.** `EURJPY` was listed at 170.66 while the
currency table implied 170.6748 (EUR→USD→JPY), and `EURGBP` was out by about a
sixth of a pip. Small, and exactly the kind of thing that makes the pip-value
card and the currency converter disagree on the same screen. Cross prices are
now **derived** from the currency table at load — any instrument whose base and
quote both appear in the table takes its price from it — so a hand-typed cross
can never drift again.

**2. Break-even converted at the wrong price — fixed.** The break-even card
converted its pip value at the reference table price instead of the entry the
user typed. On a yen pair that is a real difference, and it made break-even the
only card that disagreed with position size about the same pip. It now converts
at the entered entry, like every other card.

**3. One "failure" that was not one.** GBPJPY at a 1.00 stop looked wrong until
you remember a yen pair's pip is the second decimal, so that is 100 pips, not
50. The calculator was right and the hand-written expectation was wrong. It is
recorded here because it is precisely the mistake a user will make, and it is
an argument for the stop distance being shown in pips next to the price.

## Known limitations, stated rather than hidden

- **Futures margin is leverage-based, not exchange initial margin.** A real NQ
  contract has a fixed initial margin set by the exchange (tens of thousands of
  dollars), not notional divided by leverage. The number the card gives for
  `NQ1!`, `ES1!`, `CL1!` and `GC1!` is arithmetically correct for the leverage
  chosen and is not what a futures broker will hold. Fixing it properly needs a
  per-contract margin field, which belongs with the live feed in Phase 1B.
- **Prices and FX rates are indicative static demo values.** Every screen that
  shows them carries the Demo badge. The *formulas* are exact; only the rate
  they convert at is a placeholder, and it is editable.
- **Pip conventions on gold and indices vary by broker.** This product treats
  0.10 as one pip on spot gold and 0.10 of an index point on the S&P CFD. Some
  brokers call 0.01 a pip on gold, which makes their pip value a tenth of this
  one for the same position — the position size is unaffected, because the
  money and the stop distance in price do not change.
- **Stocks are not modelled.** Onboarding offers "Stocks & indices"; only index
  CFDs and index futures are in the instrument table.

## Why the numbers can be trusted where they can

The whole product has one copy of the three facts a calculator needs — the pip,
the contract size, and the money per 1.00 of price move per unit — in
`assets/instruments.js`. Nothing else in the codebase defines them. So every
figure on the calculators screen, every R multiple in the journal, every
dashboard statistic and every worked example in the Learn lessons is computed
from the same table this test checks.
