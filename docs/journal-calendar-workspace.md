# Calendar-led Trading Journal

## Files and data

- `pages/journal.html` and `assets/journal-workspace.css` implement the reviewed calendar-led layout, modern navigation, summary cards, filters, weekly cards and selected-day review. The earlier Journal stylesheet still supports the existing entry and detail drawers.
- `assets/journal.js` wires all three views, shared filters, trade review, entry/editing, partial exits, CSV tools and the existing Store driver.
- `assets/journal-calendar.js` builds Monday-first month grids and weekly summaries from journal dates. Store.compute supplies each record's realised R and open/closed status.
- `pages/journal-preview.html` and `assets/journal-preview.js` provide clearly labelled example records in a separate in-memory driver. Preview edits never load or write account trades and reset on reload.

The existing `onepercent:trades`, settings, profile and draft storage keys and cloud mirror are retained. No database schema or authentication changes are required. Existing trade fields and per-exit notes survive form editing.

## Behaviour

The Journal opens on Calendar. Account, period, search, symbol, side, date, setup, result, market and emotion filters apply consistently to summaries, calendar, selected-day list, trade table and insights. Calendar previous/next navigation selects the first day and visibly changes the period to All time so the former period cannot hide the month being inspected. Today resets the current month and selects today.

Calendar cells support click and arrow-key selection. Journal tabs support arrow keys, Home and End. Review buttons open the original detail drawer and Edit trade opens its existing form. Modal focus is trapped until Escape or Close returns focus. Empty and filtered states remain explicit.

Month and week R totals include only fully closed records. If any closed record lacks valid R, the total is unavailable rather than silently incomplete. Open and partially closed positions count separately and have no realised R. Emotion coverage uses actual recorded labels, including open trades; absent labels remain unscored. Monetary totals stay unavailable because compatible currency units are not recorded. R metrics use recorded stops and journal dates rather than close timestamps.

Fixes: closing remaining size reads every exit row; form validation rejects blank/invalid exit legs, nonpositive exit sizes and sizes exceeding the position. Editing preserves account labels, unknown legacy fields, per-exit notes and absent emotions. Account options reconcile before rendering if cloud changes remove a label.

## Validation

144 Node tests pass. Added tests cover month/year and leap-day boundaries, daily and weekly R, partial exits, invalid R, journal-date periods, emotion coverage, isolated preview records and edit preservation. Desktop browser QA exercised sample review/edit/save, partial exit and remaining-size calculation (0.5 + 1.5 on a size-2 position), calendar/result updates, account preservation, untagged emotions, search/clear, month navigation/Today, mode switch, keyboard tabs and both themes. Account-cloud writes, screenshot uploads, CSV round trips and physical mobile devices were not retested; these existing flows remain present.
