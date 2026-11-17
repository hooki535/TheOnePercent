# Dashboard workspace

The Dashboard is rebuilt around the reviewed light-theme design: an original brand header, fixed workspace navigation, four account summaries, tabbed performance, risk discipline, recent entries and a session checklist. Dark theme uses the existing theme preference. On narrow screens the navigation becomes a compact horizontal row and panels stack.

## Data and interactions

- Account and journal-date filters recompute journal analytics through Store. Account reconciliation runs before rendering when cloud updates remove an account label.
- Open exposure always includes all opening dates in the selected account. Daily guardrails assess all accounts, explicitly labelled in the risk panel.
- Shared sizing balance is not presented as account equity. No mixed-unit P/L, risk total, drawdown or curve is invented. Per-record calculation units remain labelled, and R metrics disclose recorded-stop eligibility.
- Overview, R multiples and Drawdown tabs support arrow keys, Home and End. The checklist is visit-only and can be reset; it does not change the journal or imply cloud persistence.
- Market shortcuts open Charts with a supported overview source parameter; no sample prices are shown on this page.
- Signed-in account metadata can supply an HTTPS avatar. Guests see login actions, with no sample identity.

## Design preview

`pages/dashboard-preview.html` is an explicitly labelled empty-state preview. It omits the authentication client and installs an empty read-only Store driver before rendering. It never loads account trades or writes journal records. `pages/dashboard.html` retains the actual account guard and cloud integration.

## Validation

136 Node tests pass, including dashboard initialization, tabs/checklist, account/date exposure separation, account removal reconciliation and read-only preview isolation. Browser QA covered empty-state rendering, performance tabs including keyboard navigation, period selection, checklist/reset and both themes. The real Dashboard sign-in guard was observed redirecting to login. Authenticated cloud hydration, account-avatar rendering and physical mobile devices were not retested in this change.
