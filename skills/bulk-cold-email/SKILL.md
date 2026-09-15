---
name: bulk-cold-email
description: >
  Run Farhan's f13i bulk cold email machine against a list of companies — score,
  research, draft, grade, and verify in batches of 50. ALWAYS use this skill when
  Farhan says "run the cold email machine", "process this prospect list", "batch
  outreach", "score and email these companies", "run cold email on this CSV", or
  pastes a company list and asks for cold emails at scale. Also trigger when he
  uploads a CSV of companies and wants to generate outreach. This skill runs five
  phases: ICP scoring → optional warm signal check → hook research → email drafting
  → inbox verification. Default batch size is 50. Warm signal check is SKIPPED by
  default — only enable if Farhan explicitly says "check for warm signals" or "I may
  have context on some of these."
---

# Bulk Cold Email Machine

Five-phase pipeline for scoring and emailing a large list of companies. Default
flow: Score → Hook → Draft → Verify. Warm signal check is opt-in only.

---

## Farhan's Context (always active)

**Who he is:** Pricing consultant, f13i. Priced 11 products at Grafana Labs including
Grafana Assistant AI — $1M ARR in 30 days, 15.2% free-to-paid conversion, built with
no competitive anchor.

**ICP:** Series A-B SaaS companies — especially those embedding AI into their product
who don't know how to price it.

**Single CTA:** $5,000 Pricing Audit. Every email ends with a 30-minute call ask.

**Voice rules:**
- Contractions always
- No hedging ("I think", "might", "perhaps")
- No consulting jargon
- No "I" to open
- Short sentences, varied length
- Practitioner tone, not vendor tone

**Email structure:**
```
Subject: [3-6 words, specific to their situation]

[One specific observation — 1 sentence]
[So-what for their business — 1-2 sentences]
[Credibility anchor — Grafana AI or relevant experience — 1 sentence]
[Ask: 30-min audit intro call, no strings — 1 sentence]

Everyone's got a pricing opinion. Almost nobody has pricing data.
f13i.com | cal.com/farhan-m | me@f13i.com
```

**Grading rubric (grade as the recipient):**
| Grade | Criteria |
|-------|----------|
| A+ | Specific non-obvious insight + clear credibility + low-friction ask. Would reply. |
| A | Strong but one element slightly generic or slightly long |
| B+ | Good insight, minor hedging or weak subject line |
| B | Sendable but needs one fix |
| Below B | Do NOT show. Fix until B+ or above, then re-grade. |

**Hook decision tree (pick ONE):**
| Hook | When to Use |
|------|-------------|
| Bug | Obvious pricing problem on their site — wrong model, confusing tiers, missing packaging |
| Left on table | Clear revenue gap — underpricing a segment or feature |
| Competitive gap | Their pricing vs. competitors reveals a strategic blind spot |
| AI pricing | AI in product that's unpriced, credit-based without explanation, or buried |

---

## ICP Scoring

| Score | Criteria |
|-------|----------|
| 3 — Strong | Series A-B SaaS, AI in product, or visible pricing problem, or hiring pricing/PMM/growth |
| 2 — Possible | SaaS, stage unknown or later, no strong signal — flag for manual review |
| 1 — Skip | Pre-revenue, non-SaaS, enterprise-only, agency, education, bootstrapped with no visible product |

**Funding signals (self-reported, use as a signal not gospel):**
- Seed / $1M–$10M → likely ICP, score accordingly
- Bootstrapped / $0 / pre-seed → lower priority unless product is clearly strong
- $30M+ → may be too late stage, default to score 2 unless clear pricing problem

---

## Session Startup (run once per Cowork session)

Before processing any batch:
1. Load brain.md and business.md from the Obsidian vault for pipeline context (or invoke the `load-f13i-docs` skill to load the whole brain)
   - brain.md: `obsidian_get_note` at `10-brain/03-brain.md` (format: content)
   - business.md: `obsidian_get_note` at `10-brain/02-business.md` (format: content)
2. Check if any companies in the batch appear in the existing pipeline — flag and skip those
3. Check Granola for recent mentions of any company in the batch

---

## Phase 1: Score & Prioritize

For each company in the batch:
1. Visit their website (use URL provided)
2. Identify what they build — product category, who it serves
3. Check for AI embedded in their product
4. Check for a visible pricing page — note model (seats, usage, credits, flat, freemium)
5. Score 1/2/3 using ICP rubric
6. Write one sentence explaining the score

**Output table:**
| # | Company | Contact Name | Email | Website | What They Build | Has AI Product | Pricing Model | ICP Score | Score Reason |

Only Score-3 companies advance to Phase 3. Flag Score-2 for manual review. Drop Score-1.

---

## Phase 2: Warm Signal Check (CONDITIONAL — skip by default)

**Default: SKIP. Go straight to Phase 3.**

Only run if Farhan explicitly says:
- "check for warm signals"
- "I may have context on some of these"
- "run the full workflow"

If triggered, for each Score-3 company:
- Gmail: `from:[domain] OR to:[domain]`
- Calendar: search `[company] OR [contact]` last 6 months
- Granola: query `[company] OR [contact]`
- Vault: `obsidian_search_notes` for `[company]`

If warm signal found → flag WARM. Email must open with that specific interaction.
Override Phase 3 hook logic entirely for warm companies.

Output: Company | WARM/COLD | Warm Signal Detail (if applicable)

---

## Phase 3: Research & Hook Selection

For each Score-3 company:
1. Visit their pricing page (try /pricing, /plans, pricing link in nav)
2. Note: pricing model, tier count, price points if visible, AI features priced separately
3. Web search: `[company name] pricing` and `[contact name] [company]`
4. Select ONE hook: Bug / Left on table / Competitive gap / AI pricing
5. Write the hook as one sentence — specific enough the recipient knows you looked

**Output table:**
| Company | Contact | Pricing Page URL | Hook Type | Hook One-Liner |

---

## Phase 4: Draft Emails

For each company with a hook:
- Open with the hook one-liner (not "I")
- Apply all voice rules
- CTA: 30-min call to walk through a $5K Pricing Audit
- Grade using rubric. If below B+, revise until B+ or above. Never show below B+.

**Output format per email:**
```
---
Company: [Name]
Contact: [First] [Last]
Email: [address]
Hook Type: [Bug / Left on table / Competitive gap / AI pricing]
Grade: [A+ / A / B+]
Warm: [Yes / No]

Subject: [subject line]

[email body]
---
```

---

## Phase 5: Inbox Verification Flag

For each drafted email:
- Infer email format pattern from the address provided (first.last / firstlast / first / etc.)
- Flag shared inboxes (info@, hello@, contact@) as low-priority
- Recommend Hunter.io verification before sending for all

**Output table:**
| Company | Email | Format Pattern | Inbox Type (personal/shared) | Verify (Y/N) |

---

## Batch Instructions

- Default batch size: 50 companies
- Run across all batches sequentially — paste the next 50 each time
- Keep a running tally: total scored / total Score-3 / total warm / total drafted / total A+ / A / B+
- After all batches: output final priority send list sorted by Warm first → A+ cold → A cold → B+ cold

---

## CSV Column Reference

Expected columns from the clean prospect CSV:
- `first_name`
- `last_name`
- `email`
- `company`
- `website`
- `funding`

If the CSV has different column names, map them to these before running.

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Gmail, Calendar, Granola, or Obsidian call, run `tool_search` for each ("gmail search threads", "calendar list events", "granola meetings", "obsidian get note") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. Never send outreach off a batch where the warm-signal or prior-contact check silently returned nothing — a missing Gmail leg reads identical to a cold prospect. A partial
result that says which leg died beats a clean-looking one that dropped a source.
