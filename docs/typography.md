# Readable interface typography

Increase the website's former 8–13px labels and controls to a consistent readable scale: 12px for secondary captions, 13px for supporting information, 14–15px for primary controls and navigation, and 15–16px for body text. Preserve large display text and icon dimensions. Dashboard section headings are 19px and its main desktop heading is 30px.

Apply the scale to shared pages, homepage, Dashboard, Journal, Academy, account screens and chart panels/settings. Canvas-rendered chart labels have a separate 12px minimum; saved drawing text sizes remain user-controlled. Font shorthand declarations and inline Journal form styles use the same scale. This follows the user's TradingView reference for readability without changing browser zoom.

Validation: 136 existing tests pass; JavaScript syntax and whitespace checks pass. Desktop browser review covered the Dashboard, homepage, chart axes/watchlist and chart settings. Existing responsive breakpoints remain in place; physical mobile devices were not tested for this change. Trading calculations, candle sources, account data and authentication were not changed.
