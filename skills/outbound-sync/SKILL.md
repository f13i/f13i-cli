---
name: outbound-sync
description: Sync Farhan's outbound pipeline from Gmail replies, Calendar meetings, and Granola transcripts, then log what changed into the relevant deal files under 30-deals/. Use when Farhan says "sync outbound", "what's changed", "what's new in my pipeline", "catch me up", or "run outbound sync". Do NOT auto-trigger at session start. Do NOT touch Linear. For filing artifacts you produced this session, use deal-filer instead — this skill logs signal that arrived, not work that was made.
---

# Outbound Sync

Reads inbound signal from three live sources, decides what moved, and writes it
into the deal files. Read-heavy, write-narrow: it only touches deal files where
something actually changed.

## What changed in v2 (2026-07-30)

v1 never ran. Three reasons, all fixed here:
- It claimed to auto-trigger at session start. No such hook exists — skills fire
  on relevance. Explicit triggers only now.
- It called `Gmail:gmail_search_messages`, `Gmail:gmail_read_thread`,
  `Google Calendar:gcal_list_events`, and `obsidian_get_note(path:)`. None of
  those signatures are real. See preflight below.
- It carried a hardcoded contact map that had already drifted (listed Alex Rivera
  at brightwave.io; the deal file says brightwave.ai). Deleted — `30-deals/` is the
  contact source of truth.

Also dropped: Linear. And do not read `90-scratch/daily/` — the daily-sync cron
that populates it has produced nothing since 2026-06-26. Query live.

## Preflight — do not skip

**Never hardcode tool parameter names in this file.** That is precisely what
killed v1: signatures drift, the skill silently breaks, and nothing reports it.

Before the first Gmail, Calendar, or Granola call, run `tool_search` for each
("gmail search threads", "calendar list events", "granola meetings") and use the
parameter names it returns. Tool names below are current as of 2026-07-30;
parameter schemas must be resolved at runtime.

If a source fails, note it and continue with the others. A partial sync that says
which leg failed beats a clean-looking sync missing a source.

## Sequence

### 1. Build the contact map from the vault
List `30-deals/` and read each deal's index file. Note the folder naming drift:
most use `00-INDEX.md`, but adri/, modal/, and suki/ use `index.md`. Handle both;
don't normalize.

From each, extract company, contact names, emails, current status/stage
frontmatter, and the date of the last `## Update —` block.

### 2. Gmail — replies and sends
`Gmail:search_threads`, then `Gmail:get_thread` on anything new.

Default window 7 days; 14 if Farhan says he's been away. Search the outreach
label, plus a targeted pass per contact domain for anyone the label misses.

Classify:
- Inbound reply — movement, read the thread, summarize the ask
- Farhan sent, no reply — still waiting, bump last-touched only
- Nothing 10+ days — yellow flag
- Nothing 21+ days — propose going dark, **ask before changing status**. Never
  auto-cancel a deal. Someone taking a three-week vacation is not a lost deal,
  and an unattended status change is unrecoverable context loss.

Skip bulk-batch sends (10+ identical-minute sends = the startup program list,
tracked separately).

### 3. Calendar — meetings
`Google Calendar:list_events`, past 7 days through next 14, America/Chicago.
Cross-reference attendee emails against the contact map.

Past meeting — enrich in step 4. Future meeting — note the date and flag for
call-prep. Unknown external attendee — surface as a possible new deal, don't
create the folder unprompted.

### 4. Granola — enrichment
Only for past meetings matched in step 3. `Granola:list_meetings` (f13i folder
5b432192-46a9-4389-865c-3701e9c4eb86), then `Granola:get_meetings` with an array
of IDs — batch them, one call. Pull the transcript only when the meeting summary
is too thin to name a next step.

Extract: what was discussed, commitments made, stated next step.

### 5. Write to deal files
For each deal where something changed, append and keep frontmatter in sync in the
same edit — a body-only update strands deal-status-sync, which reads frontmatter.
This is a logged lesson; don't relearn it.

```
## Update — YYYY-MM-DD (outbound-sync)
- Signal: <reply received / meeting held / went quiet N days>
- Context: <one or two lines from the thread or transcript>
- Next: <specific next move + date>
```

Then set `updated`, and status/stage only if the signal genuinely moved the deal.
If nothing moved, bump `updated` and leave the stage alone.

Tag the block `(outbound-sync)` so it's distinguishable from deal-filer entries.
Same file, different authors, different meaning.

### 6. Write the run log
Append one line to `20-agents/RUN-LOG.md` — every run, including no-change and
failed runs. This is what weekly-system-review reads to fill the registry's Last
run column. A run that isn't logged didn't happen.

```
| YYYY-MM-DD HH:MM | outbound-sync | OK / PARTIAL / FAIL | N deals updated | <failed leg, if any> |
```

### 7. Output
Short. Movement, needs action, coming up, possible new deals, and a one-line
health note if any source failed. No re-explaining what outbound is.

## Hard rules

1. Never auto-cancel or auto-downgrade a deal. Propose, then ask.
2. Append, never overwrite. History is the value.
3. Frontmatter and the newest body block must agree, written together.
4. Match existing folder capitalization exactly (Paywell).
5. Log the run even when nothing changed and even when it fails.
6. Don't create deal folders for unknown contacts — surface them instead.
