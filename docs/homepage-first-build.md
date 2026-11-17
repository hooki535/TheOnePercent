# TheOnePercent full homepage review

Branch: `design/market-overview-first`. The public `main` branch is unchanged.
The homepage implementation now lives in root `index.html` and four isolated
assets (`home.css`, `home.js`, `home-data.js`, `home-map.js`). Existing Charts,
Journal, Dashboard, settings, cloud sync and history sources are preserved.
The earlier `pages/market-overview.html` remains a separate earlier review.

## Scope

The full scroll follows the latest homepage proposals: compact header and new
angular logo, photo-based preview profile, large market-summary line chart,
smaller market charts, world indices, crypto snapshot, ideas, studies, research
articles, stock movers, forex comparison, crypto and futures cards, macro map,
calendar, Academy, trading tools and complete footer. The watchlist remains
sticky on desktop and opens as a panel from the mobile utility rail.

Interactive chart periods, symbol search, watchlist add/remove, bookmarks,
article reading, calendar currency/impact filters, map indicators/countries,
profile photo upload/reset and themes are implemented. Existing product-page
links deliberately open the current public TheOnePercent pages.

## Data boundaries

Initial mode is a labelled illustrative snapshot dated 13 November 2026.
`home-data.js` contains these deterministic preview fixtures. Choosing real
mode explicitly uses the existing Feed module and market configuration;
unsupported data is unavailable rather than replaced with fixtures. Source
and freshness are labelled. This does not modify the private backtesting
archive, replace forex history, or connect new brokers or news providers.

Academy thumbnails are existing teaching images; the example articles state
that these are not current trade recommendations. News and calendar content
are examples and do not claim current releases. Country outlines use Natural
Earth through World Atlas; map values are explicitly illustrative.

## Persistence and account status

The new key `theonepercent:homepage-preview:v1` stores only review preferences,
favourites, bookmarks and a preview name/photo on this device. It does not
rename or migrate existing app keys. The profile menu says 'Preview profile'.
The portrait is a sample from the approved concept, replaceable by upload.
The profile UI does not claim to authenticate a trading account. Existing
account pages remain linked. Production account integration is a later step.

## Run and verify

Run `py -m http.server 8000` on Windows (or `python3 -m http.server 8000`)
from this repository and open `http://localhost:8000/`.
Run `node --test tests/*.test.js tests/*.test.cjs` for website checks.
Browser verification covered search, instrument and period selection,
watchlist persistence, saved ideas, profile photo upload/reset, theme changes,
calendar filtering, map metric selection, article reading, and real-mode
unavailable states. Responsive CSS includes layouts down to 320px; a physical
mobile-device session was not used for verification.
