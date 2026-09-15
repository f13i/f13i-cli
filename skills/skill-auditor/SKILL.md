---
name: skill-auditor
description: Audit Farhan's skill library for dead weight, trigger collisions, obsolete workarounds, and missing leverage. ALWAYS use when he says "audit my skills", "what should I kill", "review my skills", "are my skills any good", "what should I automate next", "where am I wasting time", or "find me leverage". Replaces the older leverage-finder skill — it both finds new automation opportunities AND removes dead ones, because a library that only grows is the actual problem. Do NOT use for the weekly registry reconciliation; that's weekly-system-review.
---

# Skill Auditor

Audits the library itself. Two jobs, deliberately fused: find what's missing,
and remove what's rotting. Splitting these was the old mistake — a skill that
only proposes new skills makes the library worse over time.

## Bias

**Removal is cheaper than addition.** A dead skill costs trigger ambiguity,
review time, and false confidence that something is handled. A missing skill
costs manual work you already tolerate. When the audit is a close call, remove.

Target library size is roughly 12-15 active skills. Past that, trigger collisions
start firing the wrong one and Farhan stops trusting any of them.

## Sequence

### 1. Inventory
- List everything in `/mnt/skills/user/` (runtime) and `20-agents/skills/` (source).
- Flag any runtime skill with no authored copy. These are unversioned and
  unrecoverable. Standing defect until every skill has a vault copy.
- Cross-reference `00-index/02-agent-registry.md` for run status.

### 2. Trigger collision scan
For each pair of skills, compare description trigger phrases. Flag any pair
sharing a phrase or where a plausible user sentence matches both. Known clusters
to check every run:
- pricing-proposal-builder / pricing-calculator-builder / pricingsaas-report-builder
- business-doc-update / weekly-brain-sync
- cold-email / bulk-cold-email

For each collision, propose either an explicit "Do NOT use when..." line in both
descriptions, or a merge.

### 3. Rot scan
Flag any skill that:
- routes output through `/mnt/user-data/outputs/` for manual copy when direct
  Obsidian write is available — obsolete workaround
- **hardcodes tool parameter names.** Signatures drift and the skill then fails
  silently. This killed outbound-sync v1 for months. Grep every skill for
  literal tool params and flag them; correct pattern is a `tool_search` preflight.
- **calls a live-data MCP (Granola, Gmail, Calendar, Linear, Slack, Apify) but has
  no `## Preflight` section and no stated failure behaviour.** The preflight is
  what makes drift loud; without it the skill returns confident output with a leg
  missing. Grep: a skill naming any of those sources must also name what it does
  when one of them fails.
- depends on a known-flaky MCP with no documented fallback
- claims to auto-trigger but shows no run evidence — auto-trigger claims that
  don't fire are worse than no claim, they create false confidence
- costs money per run (Apify, paid APIs) and is COLD
- hasn't run in 60+ days

### 4. Leverage scan
Read recent sessions for manual work Farhan did by hand that recurs. For each
candidate, estimate frequency, minutes per occurrence, and build effort. Only
surface candidates clearing ~30 min/month saved. Dedupe hard against existing
skills — the most common false positive is proposing a skill that already exists
but is COLD. If it exists and is cold, that's a scheduling finding, not a
new-skill finding.

### 5. Verdicts
Every skill gets exactly one: KEEP / FIX (with the specific defect) /
MERGE (into what) / ARCHIVE.

## Output

A table of all skills with verdicts, then:
- Kill list — archive and merge candidates, with reasons
- Defect list — obsolete workarounds, hardcoded params, missing fallbacks, ranked
- Leverage list — at most 3 new-skill candidates, ranked, with the explicit note
  that at most one should be built before the next audit

Never end with an unranked list of everything that could be done. Rank, or the
audit becomes another backlog.

Log the run to `20-agents/RUN-LOG.md`.

## Cadence

Monthly. More often and there isn't enough new evidence to audit.
