# Trade review workspace

Opening a saved trade now shows an expanded review dialog with paired entry/exit evidence, an execution table, plan and reflections, trade result, and context. Missing screenshots stay explicitly empty and offer editing; saved images expand into a native modal viewer. Escape closes that viewer before closing the review. Previous/Next follows the currently filtered trades.

Editing and cancelling return to the same review. The original `review` remains separate from optional additive `whatWentWell` and `nextTime` fields. CSV includes those fields while supporting older files. Exit notes are now editable; existing unknown fields and exit metadata are preserved. Storage keys, cloud integration, chart source, and financial calculations are unchanged.

Review status distinguishes open, partially closed, closed, and invalid exit/size data. Partial trades do not display realised R. Money totals remain unavailable without compatible recorded currency units; per-record calculation units are available in a labelled disclosure. The UI discloses the recorded-stop basis and missing exit timestamps.

Validation: Node suite covers open/partial/closed states, malformed exits, zero values, escaping, legacy records, attachments, and reflection CSV round trips. Browser QA uses isolated sample records for editing, exit notes, paired uploads, image expansion/Escape, cancelling, and filtered navigation. Signed-in cloud writes and mobile viewport testing were not repeated.
