---
name: client-safe-deliverable
description: Turn an internal pricing model or memo — the one with cost, margin, floors, and deal strategy visible — into a clean client-facing version that shows only tiers, prices, and value. ALWAYS use this skill when Farhan says "make a client-safe version", "strip the internal numbers", "a version I can send to [client]", "sanitize this for the client", "remove the cost/margin", "client-facing version of this model", or "the version for [client] to send their board/customer". This produces a SEPARATE, sanitized artifact and leak-scans it before delivery — one leftover cost cell or margin comment is a failure. Never edits the internal file in place.
---

# Client-Safe Deliverable

Farhan builds internal models the way he needs to think — cost, margin, the floor, the lever mechanics, the competitor-undercut logic all visible, because that's what lets him make the call. Then the client needs a version that shows only what *they* get: the tiers, the prices, the value. Doing that strip by hand is where accidents happen — a hidden column survives, a cell comment mentions margin, a formula still references the cost cell, and internal economics walk out the door in a file the client can inspect. This skill does the strip reliably and, crucially, verifies it before anything ships.

The stakes are asymmetric: a client-safe file that's missing a tier is a quick fix. A client-safe file that leaks your cost basis or margin is unrecoverable once sent. So when in doubt, cut it.

## The redline — strip every internal element

- Cost / COGS, in any cell, label, or note
- Margin and margin % (gross, contribution, blended — all of it)
- The floor, and any "never below $X" / cost-basis language
- Lever mechanics and discount ceilings (the *how the discount is built* logic)
- Competitor-undercut logic framed as internal strategy ("undercut TeamSnap, never the offshore $6")
- Deal-desk give-get / concession internals
- Any Farhan-only commentary or strategic aside
- Any hidden sheet, hidden row/column, cell comment, or formula that references a cost/margin cell — these are the ones that leak silently

## Keep and reframe

Keep the tiers, the list prices, the packaging, and what the client actually gets. Then reframe: numbers that were justified *internally by cost* get presented *externally by value*. The client should see why the price is worth it to them, never the economics underneath it. Same price, different justification.

## Steps

1. **Load the internal artifact.** Spreadsheet → use the `xlsx` skill. Memo/doc → read it directly. **Never work in place** — copy to a new file clearly named as the client-safe version (e.g. `<Client>_Pricing_CLIENT-SAFE.xlsx`). The internal original stays untouched.
2. **Map every internal element** against the redline above. For a spreadsheet, that means walking *every* tab including hidden ones, checking cell comments, and tracing which formulas reference cost/margin cells — not just deleting the visible "cost" column.
3. **Produce the client-safe version** in the format the client expects (xlsx → xlsx, memo → a clean doc via the `docx` skill). Remove the internals, add the value framing, keep the structure the client needs to act.
4. **Leak scan — this is the point of the skill, not an optional last step.** Search the finished output for: `cost`, `COGS`, `margin`, `floor`, and the actual cost/margin *numbers* themselves; any hidden sheet, row, or column; any cell comment; and any formula that still resolves through a cost cell. For spreadsheets, flatten or rebuild formulas that would expose an internal value when a client clicks the cell. Only ship when the scan comes back clean. If anything is ambiguous, cut it.
5. **Deliver and (optionally) file.** Send the client-safe file to Farhan. If it belongs with a deal, hand it to `deal-filer` labeled clearly as the CLIENT-SAFE version so it never gets confused with the internal model.

## Hard rules

- Never ship without running the leak scan. A clean-looking surface is not a clean file — the leaks hide in hidden columns, comments, and formula traces.
- Internal and client-safe are always two separate files. Never sanitize the original in place; Farhan still needs his economics.
- Match the client's expected format — a board-ready deck, a one-tab price sheet, a short doc — don't hand over your working model with columns deleted.
- When in doubt, cut it. A missing detail is recoverable; a leaked margin is not.
