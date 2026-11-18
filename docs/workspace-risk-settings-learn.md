# Risk tools, Settings and Learning Hub

This batch extends the established workspace navigation, original logo, type scale, light/dark tokens and responsive frame to three legacy pages. Existing calculator tools, settings IDs, course content, artwork, quiz gates, certificates and storage keys remain in place.

## Risk & Position Sizing

The main calculator now presents manual instrument/risk inputs, trade levels, editable contract/pip/point-value facts and lot step, with a position estimate beside the form. Fees are inside the risk budget. Volume rounds down to the entered step. Invalid levels, conversion rates, specifications or budgets disable chart/journal actions. Net R deducts fees from reward and divides by price-stop risk, matching Journal's existing basis. Reference prices/conversion rates remain labelled indicative; other calculator views remain accessible.

The chart action opens the instrument only and is labelled accordingly; it does not create a drawing or broker order. The Journal handoff carries units, fees and account-converted point value. Additive `manualSizing` metadata is preserved through the draft and later edits. Preview handoff uses a fragment into the isolated sample Journal instead of writing an account draft.

## Settings

Panels now group account sizing defaults and risk rules, guardrails, trading profile, appearance and data controls. Labels distinguish shared sizing balance from equity and report the active storage connection without obsolete 'backend coming later' claims. Existing confirmations, sign-in requirements and data controls are preserved. No destructive action was executed during QA.

## Learning Hub

The catalog, core path, resources and glossary share the new frame. Course covers and content remain intact. The core-path progress card is explicitly labelled separately from masterclass progress. The private preview package previously lacked Academy scripts and media; this batch includes those existing repository assets so course catalog/route/artwork requests resolve.

## Validation and limits

168 Node tests pass. Additional tests cover fees, rounding, manual specifications, invalid inputs, cross-currency conversion, short positioning, safe preview handoff, and preview data isolation. Browser QA used isolated examples: risk estimate and invalid-stop rejection, calculator tabs, fees and size transferred into the sample Journal; settings edited via keyboard with save feedback; course catalog search, library and glossary. Page asset references were checked against packaged files. Signed-in cloud persistence, complete course/quiz/certificate journeys, and mobile viewport behaviour were not retested.
