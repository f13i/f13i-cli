---
name: weekly-system-review
description: Run Farhan's weekly system review — reconcile the agent registry, kill or schedule cold skills, and promote exactly one skill from MANUAL to LIVE. ALWAYS use when Farhan says "weekly review", "run my system review", "review my agents", "what's dead", "system retro", or at the start of a week when he asks what to work on infrastructure-wise. Produces a diff against last week and a single promotion decision — never a build plan with more than one new thing in it.
---

# Weekly System Review

The control loop for the agent fleet. Runs against `00-index/02-agent-registry.md`,
which is the source of truth for what is alive. Without this review the registry
rots and every skill drifts to COLD.

## Hard constraint

**Exactly one promotion per run.** One skill moves MANUAL to LIVE. Not two.
If the review surfaces five good candidates, rank them and promote the top one.
The failure mode this skill exists to prevent is enthusiastic parallel building
followed by total abandonment — do not reproduce it.

Corollary: this skill is allowed to recommend killing many things at once.
Deletion doesn't carry maintenance cost. Creation does.

## Sequence

### 1. Load state
- Read `00-index/02-agent-registry.md` in full.
- Read `20-agents/RUN-LOG.md` — this is where agents record their own runs.
- Note every row where Last run is UNKNOWN or 30+ days stale.

### 2. Reconcile against reality
- Use the run log first; fall back to `recent_chats` for the past 7 days plus
  any Cowork sessions Farhan reports.
- For each skill that visibly ran, update Last run with the date.
- Never guess a date. If there's no evidence, it stays UNKNOWN — an honest
  UNKNOWN is the signal; a fabricated date destroys the whole instrument.

### 3. Verify infrastructure
Re-check the "Known infrastructure facts" block. Specifically:
- Obsidian MCP write access — attempt one real call, don't assume.
- Any MCP marked historically flaky (PricingSaaS, flights, Drive fetch).
- Whether skills-directory write access persists across sessions.
Update the block with today's date and what changed.

### 4. Produce the kill list
For every row COLD 30+ days, force one of three outcomes. No fourth option,
no "revisit later":
- SCHEDULE — it earns its keep, put it on a cadence this week
- MERGE — another skill already covers it, fold and retire
- ARCHIVE — move the file to `99-archive/`, strike the row

### 5. Promote one
Rank MANUAL candidates by (frequency x manual minutes saved) / build effort.
Take the top one. Define its cadence, its output path, and how Farhan will know
it ran. A promotion without an output path he actually looks at is not a promotion.

### 6. Write back
- Update the registry in place via `obsidian_write_note` with section targeting.
- Append the week's decisions to a `## Review log` section — date, promoted,
  killed, still-unknown count.
- Log this run to `20-agents/RUN-LOG.md`.

## Output format

Short. Five blocks, prose not bullets where prose reads better:

1. Diff since last week — what moved, what didn't
2. Still unknown — the count, and which ones only Farhan can answer
3. Kill list — table: skill, verdict, one-line reason
4. The one promotion — what, cadence, output path, why it beat the others
5. One question — the single thing blocking next week

## Tone

Farhan asked for honest feedback, not a status report that flatters the system.
If nothing moved, say nothing moved. If the registry has more UNKNOWNs than last
week, lead with that. A review that always finds progress is a review that isn't
measuring anything.

## Backlog integration

`00-index/03-system-backlog.md` is the list of what's owed. Read it in step 1
alongside the registry.

Each week:
- Move any completed item to the Closed table with a date. Never delete.
- Confirm the WIP limit holds — exactly one P3 BUILD item in flight.
- Report every BLOCKED item owned by `F`. These are the real bottleneck; a
  Claude-owned item can be done in-session, a Farhan-owned one waits forever
  unless it's surfaced every single week.
- If an item has been BLOCKED for 3 consecutive reviews, say so plainly and
  ask whether it should be WONTFIX. A backlog item that never moves is a
  decision nobody has made yet.
- P0 items are never deferred for a P3 build. Repairs before construction.

Do not add new items during the review unless something genuinely new was
discovered. The review's job is to close, not to accumulate.
