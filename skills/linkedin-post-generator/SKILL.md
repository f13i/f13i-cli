---
name: linkedin-post-generator
description: >
  Generate LinkedIn posts for Farhan Manjiyani (f13i pricing consultancy) on SaaS pricing topics. MANDATORY TRIGGERS — use this skill whenever Farhan asks to write, draft, generate, or create LinkedIn posts about pricing. Trigger keywords: "linkedin post", "write a post", "draft a post", "generate posts", "content for linkedin", "pricing post", "post about [pricing topic]". Also trigger when Farhan says "I want to post about X" or asks to turn a meeting insight into content. This skill produces Farhan's voice specifically — do NOT use for generic LinkedIn post writing for other people.
---

# LinkedIn Post Generator — Farhan Manjiyani / f13i

## Purpose

Generate LinkedIn posts that position Farhan as a pricing practitioner — not a consultant pitching services. Posts share real insight from real experience. They do not mention f13i, consulting, or availability. They sound like a senior pricing person who has opinions and shares them.

**The goal of every post**: A founder or operator reads it and thinks "this person actually gets it." Not "this is advice." Not "this is a pitch."

---

## Step 1: Load Voice and Context

Before writing anything, load:

1. **Voice doc** — read `10-brain/voice/01-voice-doc.md` via `obsidian_get_note` (format: content)
2. **Edit checklist** — read `10-brain/voice/05-edit-checklist.md` via `obsidian_get_note` (format: content)

If Farhan hasn't specified a topic, also load:
3. **Writing.md** — read `10-brain/05-writing.md` via `obsidian_get_note` (format: content) to check for staged topics

---

## Step 2: Pull a Real Company Example via PricingSaaS MCP

Every post should be anchored to a **real, named company with a real pricing decision** — not a vague "some companies do X." This is what separates the post from generic thought leadership.

### How to find the example:

**If Farhan gives a topic or company** → search PricingSaaS first, then pick the most relevant pricing change from that company or a direct competitor.

**If Farhan gives no specific company** → infer from the topic what kind of company to look for, then search.

### PricingSaaS lookup sequence:

```
1. search_companies(query="[company or category]")
   → Get the slug

2. get_company_history(slug, discovery_only=true)
   → Find the most interesting/recent pricing change

3. fetch_diffs(slug, period)
   → Get the exact before/after details for that change
   → Only fetch if the change sounds specific and relevant — costs 1 credit
```

### What makes a good example:

- **Specific**: Named company, named change, real price or structure delta
- **Recent**: Prefer changes in the last 12 months — feels current
- **Counterintuitive or telling**: A change that reveals something about strategy, not just "they raised prices"
- **Relatable**: A decision a founder or pricing lead would recognize from their own world

### Example types that work well in posts:

| Change type | Why it works |
|---|---|
| Metric swap (per-seat → per-outcome) | Reveals a belief about where value lives |
| Plan collapse (5 tiers → 3) | Signals they admitted complexity was a problem |
| Credit → predictable unit | Signals they heard the "customer hostile" feedback |
| Price increase with repackaging | Shows they understand value framing |
| Free tier removal | Usually signals PLG motion isn't working |
| Enterprise-only gating of a feature | Shows where they think expansion lives |

### Intercom Fin example (for reference — already used in Post 5):

Intercom changed Fin's pricing metric from "per resolution" to "per outcome" — where outcome is defined as a resolution OR a successful procedure handoff. This matters because it shows them broadening the definition of value to cover their new Fin Procedures product. Don't reuse this exact example — find fresh ones.

---

## Step 3: Pull Meeting Context via Granola (Optional but Strong)

If the topic connects to a recent conversation Farhan had — a client call, a pricing office hours session, an IPN talk — pull that context.

```
query_granola_meetings(query="[topic keyword]")
```

Look for:
- A specific thing someone said that crystallizes the problem
- A moment where Farhan explained something in a way that landed
- A question someone asked that revealed a gap in their thinking

If something strong comes back, use it as the opening observation or the "this is what made me think about this" moment. Don't quote people by name unless they're public figures (Manny Medina at a public session = fine; a client call = paraphrase only).

---

## Step 4: Choose the Format

Before writing, decide which format this post should be. **Pure frameworks are the lowest-performing format** (avg engagement score 3.8 across 51 posts analyzed). Default away from frameworks whenever possible.

| Format | Avg Score | When to use |
|---|---|---|
| **Personal story** | 43.3 | Something happening in Farhan's actual life right now (family, a tool he's using, a moment of realization) + connection to his work. Don't force the connection — the baby-feeding post worked because it was genuine. Ask Farhan what's going on in his life if no angle is obvious. |
| **Current events + take** | 22.0 | A real pricing move in the market (raised prices, killed a plan, changed a metric) + what it reveals about strategy. Anthropic $20, Codium/Cursor, Clay are strong examples of this format working. |
| **Client case study** | 18.0 | A real scenario from Farhan's work — with a **named pattern** (see voice rules). Specific enough that readers see themselves in it. The named pattern is what makes it memorable and shareable. |
| **Framework** | 3.8 | Only when the insight genuinely can't be grounded in a story or company example. Even then, anchor with a type-specific scenario ("a founder doing X") rather than generic attribution. |

**Cadence rule**: If Farhan's last 2 posts were frameworks, this one should be a different format. Ask what's happening in his life or work if a personal story angle isn't obvious.

---

## Step 5: Write the Post

### Structure (Ruben Hassid method, adapted for Farhan's voice):

```
LINE 1:  Pattern interrupt — short, specific, counterintuitive
LINE 2:  One line that earns the next read (blank line after)

BODY:    The real insight. What actually happens vs. what people think.
         Specific. A real example with the company named.
         The mechanism, not just the observation.

CLOSE:   One sentence that lands the point.
         CTA optional — see CTA rules below.
```

### CTA rules:

**Target: at least 4 posts per month should include a CTA.** Data shows CTAs drive 2-3x more comments. CTAs should feel like a natural invitation, not a pitch. Good CTAs:

- "Drop your pricing page in the comments."
- "What's your version of this?"
- "DM me if this is you."
- "What did you do when this happened?"

When NOT to use a CTA: posts that end on a strong declarative statement where a CTA would undercut the landing. When in doubt, include one.

### Voice rules (non-negotiable):

- **No "I" at the start of the post** — start with the observation, not the self
- **No consulting language** — never "as a consultant," "in my work with clients," "I help founders"
- **No vague attribution** — not "some companies" or "many founders." Name the company or describe a type specific enough to be recognizable
- **No -ing endings to close sentences** — not "showing," "revealing," "highlighting"
- **No triple structure** — not "X, Y, and Z" lists in the body. Pick one and go deep
- **No generic close** — not "the lesson here is," not "here's what I learned," not "food for thought"
- **Contractions always** — "you've," "it's," "they're," "I've"
- **Sentence variety** — mix short punchy lines with longer ones. Never three sentences the same length in a row
- **One tangent is fine** — a brief aside or parenthetical makes it feel human
- **End on the point, not the lesson** — state the thing, don't explain it back to the reader
- **Name the pattern** — every client case study should coin a term for what happened. "Renewal value engineering," "the discount anxiety reflex," "the demo reversal trap," "the credit confusion churn." Named patterns outperform unnamed ones because readers remember and share them

### Banned hook openers:

These openers pattern-match to generic LinkedIn content and should never be used:

- "Most companies..." — too broad, signals generic thought leadership
- "There's a..." — low-specificity setup, weak tension
- "There's a specific moment where..." — used twice already (May 11 and May 20), retired
- Long setup paragraphs before the insight — earn the read with the first line, not the third

### Grafana credibility rule:

Reference Grafana as past experience, not current role. "Years pricing infrastructure SaaS" or "pricing 11 products in observability" is fine. Never "at Grafana we" or anything that reads as current employer. Never mention f13i or consulting.

### Length:

- Target 150–250 words
- Max 300
- No headers, no bullets, no bold
- Plain paragraphs with blank lines between them

---

## Step 6: Add Hashtags

Add 5–7 hashtags at the end. Pick from the relevant set based on topic:

**Always include 1–2 of:**
`#SaaSPricing` `#PricingStrategy` `#B2BSaaS`

**Add topic-specific tags from:**
- Usage/consumption: `#UsageBasedPricing` `#ConsumptionPricing` `#PLG`
- AI products: `#AIProductPricing` `#AIStartups` `#AIMonetization`
- Packaging: `#Packaging` `#ProductLed` `#PricingDesign`
- Revenue/sales: `#RevOps` `#SalesStrategy` `#RevenueOperations`
- CS/renewal: `#CustomerSuccess` `#Renewals` `#ChurnPrevention`
- Research: `#PricingResearch` `#CustomerResearch`
- Founders: `#FounderAdvice` `#StartupGrowth` `#Monetization`
- Enterprise: `#EnterpriseB2B` `#SaaSMetrics` `#ValueRealization`

**Avoid:** Generic tags with no pricing audience (`#Leadership`, `#Business`, `#AI` alone)

---

## Step 7: Self-Edit Pass

Before delivering the post, run through:

- [ ] Does the first line make someone stop scrolling?
- [ ] Is there a real, named company with a real pricing decision?
- [ ] Is the insight something a founder could act on — not just nod at?
- [ ] Does it sound like Farhan, or does it sound like a LinkedIn post?
- [ ] Did I cut anything that started with "In conclusion," "The takeaway is," or "Food for thought"?
- [ ] No em dashes used more than once?
- [ ] No sentence starting with "I" as the very first word of the post?
- [ ] Under 300 words?
- [ ] Does the hook avoid "Most companies," "There's a," or "There's a specific moment where"?
- [ ] Is this the 5th+ post in a row without a CTA? If yes, add one.
- [ ] If this is a client case study, did I name the pattern?
- [ ] Is this a framework post when it could have been a story or case study instead?

---

## Step 8: Deliver

Present the post as plain text, ready to copy-paste. No preamble. No "here's your post!" Just the post.

Then offer: "Want me to update the file with this version?" — and if yes, update the `linkedin_posts_final.md` file at `/mnt/user-data/outputs/linkedin_posts_final.md` and re-upload to PricingSaaS CDN.

---

## Notes on Batch Mode

If Farhan asks for multiple posts at once (e.g., "write 10 posts"):

1. Run the PricingSaaS lookup once per post topic — find a distinct company example for each
2. Vary the post type across the batch: at minimum 1 personal story anchor, 1 current events post, 1 case study — don't fill a batch with all frameworks
3. Don't use the same company twice across a batch
4. Present all posts in sequence with `---` between them
5. Save to file and upload to CDN at the end

---

## Reference: Post Topic Bank

Staged topics from Farhan's content pipeline (check writing.md for current status):

1. Wrong question: what vs. how to charge
2. Discounting = packaging failure
3. 10% of users destroying margins (fair use)
4. Credits are customer-hostile
5. GPU pricing gets you commoditized ← Intercom Fin example used here
6. Most founders wait too long to raise prices
7. The hybrid model nobody talks about
8. WTP research is not a survey
9. Seat-to-usage transition kills from inside
10. Renewal value engineering panic

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Granola or Obsidian call, run `tool_search` for each ("granola meetings", "obsidian get note") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. A post sourced from an empty corpus read is a generic post in the wrong voice. A partial
result that says which leg died beats a clean-looking one that dropped a source.
