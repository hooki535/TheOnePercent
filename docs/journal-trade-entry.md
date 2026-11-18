# Journal trade-entry workspace

The existing Journal form now opens as a centered, responsive dialog with section navigation, a persistent save footer, and a live position summary. Partial exits and remaining-position closure reuse the original calculations and validation.

The existing `shot` field remains the entry screenshot. The optional `exitShot` field is additive; legacy accounts, trade IDs, unknown record fields, chart state, and exit notes remain intact when editing. Both screenshots are resized, have independent remove actions, and are discarded together only if the existing local quota recovery requires it. Image processing is guarded against late callbacks affecting a different record, and saving waits for uploads to finish processing.

Money risk stays unavailable where currency compatibility is absent. Recorded-unit calculations remain available in an explicitly labelled disclosure. Existing persistence keys and cloud integration are unchanged; the preview page uses isolated in-memory sample trades.

Validation: Node suite; browser checks of existing-trade editing, partial and final exits, entry/exit upload, saving and reopening both images, and missing-emotion preservation. Account cloud writes require a separate signed-in check.
