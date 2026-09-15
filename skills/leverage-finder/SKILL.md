---
name: leverage-finder
description: Mine Farhan's own Cowork chat history for repeated manual work and propose new skills that would give him more leverage. ALWAYS use this skill when Farhan says "find me leverage", "what should I turn into a skill", "review my chats for skill ideas", "where am I wasting time", "suggest new skills", "audit my workflows", or "what should I automate next". Also trigger when he asks Claude to look across his recent sessions and recommend automations, or at the end of a heavy working week when he wants to compound his setup. This skill reads session transcripts + f13i docs, dedups against skills he already has, ranks opportunities by leverage, and auto-scaffolds the top pick.
---

# Leverage Finder

Farhan runs a solo pricing consultancy (f13i) and lives inside Cowork. Every repeated request he types by hand is a skill he hasn't built yet. This skill turns his own chat history into a ranked backlog of automations, then builds the best one on the spot.

The core insight: the highest-leverage skills aren't invented top-down, they're *observed* — they're the workflows Farhan already does over and over, manually, across many sessions. Your job is to find those, prove they recur, make sure he doesn't already have a skill for them, and hand him the one worth building most.

## What "leverage" means here

Not every repeated task is worth a skill. Weight opportunities by:

- **Frequency** — how many separate sessions show this same intent? Recurrence is the strongest signal. A workflow done 6 times beats a slick idea done once.
- **Manual toil** — how much back-and-forth, re-explaining, copy-paste, or correction happened each time? High-friction tasks compound.
- **Consistency of shape** — does the task follow the same steps each time (good skill candidate) or is it different every time (bad candidate, leave it flexible)?
- **Strategic fit** — does automating it free Farhan for the work only he can do (selling, advising clients, thinking) rather than plumbing?

A great recommendation is high on all four. Score each 1–5 and lead with the composite.

## Workflow

Do these in order. Don't skip the dedup step — recommending something he already has burns trust fast.

### 1. Read the chat history

Use `mcp__session_info__list_sessions` (pass `limit: 100` or higher) to get the full recent picture. Session **titles are your cheapest signal** — repeated or near-duplicate titles ("Granola linear sync" ×6, "Cloudline proposal followup" ×6) instantly reveal recurring workflows.

Then use `mcp__session_info__read_transcript` on a representative sample — for each recurring cluster, read 1–2 transcripts to understand what actually happened: what did Farhan ask for, how many turns did it take, where did he correct Claude, what got produced. You don't need to read every session; read enough to characterize each cluster. Prioritize:

- Clusters with 3+ similar titles (proven recurrence)
- Long sessions (many turns often = manual toil)
- Sessions where the title suggests a workflow, not a one-off question

### 2. Load business context

Read Farhan's f13i docs so recommendations are grounded in his actual business, not generic productivity advice. Invoke the `load-f13i-docs` skill, or read the vault docs directly via the obsidian tools (`obsidian_get_note`, format: content) at `10-brain/03-brain.md`, `10-brain/02-business.md`, `10-brain/04-workflows.md`, `10-brain/01-accomplishments.md`. This tells you his priorities, his pipeline, his existing manual processes, and the voice/format his outputs need to match. A recommendation that references a real client or a documented workflow lands far harder than a generic one.

### 3. Dedup against what he already has

Before proposing anything, enumerate his installed skills. Check the `<available_skills>` list in context and/or call `mcp__skills__list_skills`. Farhan already has a deep custom set (cold-email, call-prep, weekly-brain-sync, linkedin-post-generator, coaching-call-update, ci-pricing-job-scraper, pricingsaas-report-builder, tax-audit, and more).

For each candidate workflow, classify it as one of:

- **NEW** — no existing skill covers this. Highest value.
- **IMPROVE** — a skill exists but the transcripts show it underperforming, undertriggering, or being worked around manually. Propose the specific fix, not a rebuild.
- **COVERED** — already handled well. Drop it silently; don't pad the report with things he has.

If a recurring cluster maps to an existing skill but he's clearly *not using it* (doing the work manually instead), that's a triggering/awareness problem — flag it as IMPROVE with a note about the description or trigger phrases.

**Watch for recurrence that's already automated.** Some repeated session titles ("Granola linear sync", "Cloudline proposal followup", "Daily brief") recur because they're **scheduled tasks running on a cadence**, not because Farhan re-does them by hand. Check `mcp__scheduled-tasks__list_scheduled_tasks` and read a transcript — if the session ran unattended and produced a clean `<run-summary>` with no back-and-forth, the toil is already gone. Classify those as COVERED. Genuine leverage gaps look different: many turns, Farhan re-explaining context, correcting output, copy-pasting between tools. Don't confuse "runs often" with "costs him time."

### 4. Rank and write the brief

Cluster the findings, score each, and produce the brief in the exact structure below. Rank by composite leverage score, NEW opportunities first where scores tie.

### 5. Auto-scaffold the top pick

After presenting the brief, immediately scaffold the #1 recommendation by invoking the `skill-creator` skill (or the `create-cowork-plugin` skill if it's better as a plugin). Draft a real, working first version of that skill's SKILL.md based on the transcripts you read — you already know the actual steps because you watched him do them by hand. Don't make him re-explain the workflow you just reverse-engineered. Package it and present the `.skill` file so he can install and try it the same session.

Only auto-scaffold ONE (the top pick). Offer to build the others on request rather than dumping five half-baked skills on him.

## Report structure

ALWAYS use this exact template:

```
# Leverage audit — <date>

Reviewed <N> sessions spanning <date range>. Found <X> recurring workflows; <Y> are not yet skills.

## Top recommendations

### 1. <skill-name> — <one-line what it does>
- **Seen in:** <N> sessions (<example titles>)
- **The toil:** <what Farhan does manually each time, from the transcripts>
- **Leverage score:** <composite>/5  (freq <n> · toil <n> · consistency <n> · fit <n>)
- **Status:** NEW / IMPROVE(<existing skill>)
- **What the skill would do:** <2–3 sentences>

### 2. ... (repeat, 3–6 total)

## Improve, don't rebuild
<Existing skills that transcripts show underperforming, with the specific fix>

## Watching (not yet worth a skill)
<Emerging patterns seen 1–2 times — flag so he can confirm if they recur>

## Building now
Scaffolding #<1> — <skill-name>. Deliverable below.
```

## Guidance and taste

- **Recurrence over cleverness.** Resist proposing an impressive skill you can imagine but that appears zero times in his history. This skill's whole edge is that it recommends from evidence. If you catch yourself inventing, stop and go back to the transcripts.
- **Read the corrections.** The most valuable signal in a transcript is where Farhan pushed back or re-did Claude's work. That friction is exactly what a skill should encode so it never happens again.
- **Name skills like his existing ones.** Short, verb-or-noun, lowercase-hyphenated, matching his set (`cold-email`, `call-prep`). The name should make the trigger obvious.
- **Be honest about thin evidence.** If something only showed up twice, say so and put it in "Watching," don't inflate it into a top rec. Farhan trusts the audit precisely because it won't oversell.
- **One build, not five.** The auto-scaffold is a single, genuinely-usable skill. Breadth in the brief, depth in the build.

## When re-run periodically

This skill compounds when run on a cadence (e.g. monthly). On re-runs, skip clusters you already turned into skills, note whether previously-recommended skills are now being used, and focus on *new* patterns since the last audit. Offer to schedule it if Farhan runs it more than once.

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Granola, Linear, or Obsidian call, run `tool_search` for each ("granola meetings", "linear list issues", "obsidian get note") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. A leverage recommendation built on a partial picture of where the time actually went is worse than none. A partial
result that says which leg died beats a clean-looking one that dropped a source.
