---
name: pricingsaas-report-builder
description: "Generate analysis-first HTML pricing intelligence briefs using PricingSaaS MCP tools, enriched with Granola meeting notes and Obsidian vault docs. MANDATORY TRIGGERS - Use when user asks to create a pricing report, pricing brief, pricing analysis, competitive pricing comparison, or any SaaS pricing deliverable as a formatted HTML report. Trigger keywords: \"pricing report\", \"pricing brief\", \"pricing intel\", \"generate report\", \"build report\", \"pricing analysis report\", \"competitive analysis report\", \"pricing trends report\". Also trigger when user wants a shareable HTML pricing output for a specific company. Do NOT use for quick conversational pricing lookups or pricing-research-deepdive workflows - this skill produces polished self-contained HTML briefs."
---

---
name: pricingsaas-report-builder
description: >
  Generate analysis-first HTML pricing intelligence briefs using PricingSaaS MCP tools, enriched with Granola meeting notes and Obsidian vault docs. MANDATORY TRIGGERS - Use when user asks to create a pricing report, pricing brief, pricing analysis, competitive pricing comparison, or any SaaS pricing deliverable as a formatted HTML report. Trigger keywords: "pricing report", "pricing brief", "pricing intel", "generate report", "build report", "pricing analysis report", "competitive analysis report", "pricing trends report". Also trigger when user wants a shareable HTML pricing output for a specific company. Do NOT use for quick conversational pricing lookups or pricing-research-deepdive workflows - this skill produces polished self-contained HTML briefs.
---

# Pricing Intelligence Brief Generator

## Purpose
Generate a professional, self-contained HTML pricing intelligence brief for a single SaaS company. The audience is the person responsible for pricing at the target company (or their leadership). The goal is to deliver immediate analytical value that earns a conversation — not to recap what they already know about their own pricing.

**Design principle: Don't tell them what they did. Tell them what it means and what they're missing.**

The brief leads with strategic analysis and competitive positioning. The detailed pricing history moves to an appendix — it's there for credibility and reference, but it's not the headline. Every section should create a question in the reader's mind that only a conversation can answer.

## Step 0: Ask the User Which Company

Before doing any research, use the AskUserQuestion tool to find out which company the report should cover. Ask:

**"Which company would you like a pricing brief on?"**
(free text — the user types a company name, e.g., "Notion", "Stripe", "HubSpot")

If the user already specified a company in their original message, skip this step.

## Step 1: Research — Gather All the Data

Once you know the company, collect five categories of data: **current pricing**, **history**, **competitive intel**, **pricing knowledge**, and **internal context**.

### 1a. Find the Company Slug
Use `search_companies` with the company name. If the company has multiple tracked pages (e.g., separate API pricing and platform pricing), note all slugs — you may want to cover them separately in the report.

If the target company isn't tracked in PricingSaaS, fall back to fetching the public pricing page directly (web_fetch). Do not mention this absence anywhere in the report body — it's tool plumbing, not client value.

### 1b. Current Pricing Snapshot
Use `get_company_details` for each slug. This gives you:
- Current plans, prices, billing intervals
- Add-ons, usage metrics, discounts
- Whether they have freemium, trials, contact-us pricing
- Available historical versions

This feeds the compressed pricing snapshot and frames competitive analysis.

### 1c. Historical Pricing Evolution
Use `get_company_history` (with `discovery_only: false`) for the slug. This returns the full timeline of pricing changes — plan additions, price increases, packaging restructures, feature gating changes.

Then use `fetch_diffs` for the most significant periods to get detailed before/after data. Focus on periods with major changes (price increases/decreases, plan restructures, new plan launches). Each diff costs 1 credit, so be selective — prioritize the 3-5 most impactful periods.

**Important:** You still need this data — it fuels the strategic observations. But it lives in the appendix, not the lead.

### 1d. Competitive Intelligence
Use `search_companies_advanced` to find 2-4 comparable companies in the same space. Then use `get_company_details` on those competitors to build a comparison picture:
- Compare plan structures side by side
- Compare pricing models (flat vs. usage-based vs. credit-based)
- Note who has freemium, who requires sales contact, who offers trials
- Compare billing flexibility (monthly vs. annual discounts)
- Identify where the target company sits relative to competitors (premium, mid-market, value)
- Look for blind spots: where is the target company exposed? Where do they have leverage they might not be using?

### 1e. Pricing Knowledge & Strategy Context
Use `search_pricing_knowledge` with queries relevant to the company's industry and pricing model. For example:
- "usage-based pricing best practices" if they use metered billing
- "freemium conversion strategies" if they have a free tier
- "per-seat pricing SaaS" if they charge per user
- "[industry] SaaS pricing trends" for sector-specific context

Run 2-3 knowledge queries to gather strategic frameworks and best practices.

### 1f. Internal Context — Meeting Notes (Granola)
Search Granola for any meetings where the target company was discussed. Use `query_granola_meetings` with the company name as the query. If hits come back, pull transcripts using `get_meeting_transcript` for the most relevant meetings.

Look for:
- Prior conversations about this company's pricing with clients or prospects
- Your own observations or analysis shared during calls
- Client feedback, objections, or questions about this company's pricing
- Any strategic context discussed in discovery or consulting calls

If Granola returns nothing, skip and move on. Don't force it.

### 1g. Internal Context — Documents (Obsidian vault)
Search the Obsidian vault for any existing notes related to the target company. Use `obsidian_search_notes` (mode: `text`) with the company name as the query. Internal context now lives in the vault: deal files at `30-deals/<client>/index.md` (plus sibling artifacts in the same folder), and brain docs in `10-brain/`.

Look for:
- Prior pricing analyses, teardowns, or audits
- Proposals or pitch decks that reference this company
- Notes, memos, or competitive research docs
- Any WTP research or customer feedback data involving this company

If relevant notes are found, use `obsidian_get_note` (format: content) to pull their content. Focus on extracting proprietary analysis and insights — the stuff that makes the brief uniquely valuable beyond what PricingSaaS data alone provides.

If nothing relevant turns up, skip and move on.

## Step 2: Organize the Data

### For the TL;DR:
- Lead with the competitive threat or market shift the reader needs to see — NOT a recap of their pricing history. The reader already knows what they changed. Your job is to show them what's changed *around* them.
- 2-3 sentences max. Frame it as "here's what your competitive landscape looks like right now and where you're exposed" — not "here's what your pricing says about your strategy." The first framing adds new information; the second just interprets what they already know.
- The reader should finish the TL;DR thinking "this person sees the board" — not "this person read my changelog."
- Never use presumptuous language about their decisions: no "bleeding money," "eroded trust," "hasn't found equilibrium," "confused customers." Frame challenges as competitive shifts or market dynamics that create new questions worth exploring. They're smart people making informed trade-offs — write like you believe that.

### For the Competitive Positioning (the hook):
- Build a comparison matrix focused on where the target company is exposed or has untapped leverage
- Identify 2-3 pointed observations that reframe how they think about their position
- Don't just list differences — interpret them. "You're 15% higher than X on H100s, but your per-second billing eliminates idle cost — that's a positioning story you might not be telling clearly enough"

### For Strategic Observations (the reason to call):
- **Order by information novelty.** Lead with observations the reader genuinely can't see from inside their own company — competitive gaps, market data, bundling trends, external signals. Push observations that interpret the reader's own decisions (pricing history analysis) to later positions. The reader already has an internal narrative for why they made their changes; lead with things that challenge or expand that narrative.
- Synthesize across history, competitive data, knowledge, and internal context
- Each observation should be specific and opinionated — not generic framework talk
- End each observation with an implicit question the reader will want to explore further
- **Frame iteration as positive.** When a company has changed pricing frequently, that's a team that tests and adapts — not one that "can't find equilibrium." Companies that iterate on pricing are exactly the ones who'd value a pricing partner. Write accordingly.
- **Include peer signals from Grafana or other relevant experience** where they strengthen an observation. A sentence like "We faced a similar dynamic at Grafana when the product expanded faster than the packaging" makes the observation feel practitioner-grounded, not armchair analysis.
- This is where internal context from Granola/vault is most valuable — real-world client feedback and prior analysis make observations feel grounded rather than theoretical

### For Opportunities & Questions (the soft CTA):
- 2-3 specific things you'd explore if advising them
- **Each opportunity must include a testable next step** — not just "this is a gap" but "here's what you'd test and why it's relatively low-risk." The reader should be able to picture running the experiment, not just acknowledging the problem.
- Where possible, include specific numbers or thresholds (e.g., suggested tier breakpoints, volume discount curves, conversion benchmarks) that demonstrate depth beyond "you should look at this."
- Show enough to demonstrate expertise, not enough to give away the whole playbook
- These should feel like the start of a conversation, not the end of an analysis

### For the Appendix (pricing history):
- Sort all pricing events chronologically (newest to oldest)
- Group into quarters or meaningful periods
- Calculate period-over-period changes (% price increases/decreases)
- This section is comprehensive but clearly labeled as reference material

### For Internal Context (Granola + Obsidian vault):
- Pull out proprietary observations, client feedback, or prior analysis
- Weave into strategic observations and opportunities — never in a separate section
- Flag any prior work so the brief builds on it rather than starting from scratch

## Step 3: Generate the HTML Report

Read the template: `references/template.html` (relative to this skill's directory). Use it ONLY for CSS styles, visual design patterns, and HTML component examples (tables, badges, timeline items, cards). **DO NOT follow the template's section order.** The template was built for a different report structure. The section order below is the one you MUST follow — it overrides the template completely.

### CRITICAL: What NOT to do
- **DO NOT put the pricing history timeline in the main body.** It goes in the appendix at the very end, clearly labeled "Appendix." If you find yourself writing a "Pricing Evolution" or "Pricing History" section before the Competitive Positioning section, you are doing it wrong. Stop and restructure.
- **DO NOT create a standalone section for Granola or vault content.** No "Insider Intelligence" section. No "Meeting Notes" section. No "Internal Context" section. Granola/vault insights get woven into the TL;DR, Strategic Observations, and Opportunities sections as inline supporting evidence — like a sentence or two that adds color, not a headline or a card grid. If you find yourself creating a dedicated section with meeting details, metrics cards, or transcript excerpts, you are doing it wrong.
- **DO NOT use "Report" in the title.** It's "Pricing Intelligence Brief" — always.
- **DO NOT lead with data coverage tables or executive summaries that recap pricing changes.** The TL;DR is a strategic interpretation, not a summary of what changed.
- **DO NOT annotate individual timeline entries with insider context.** The timeline in the appendix is pure PricingSaaS data. Insider context belongs in the analysis sections (4, 5, 6) where it informs strategic interpretation.
- **DO NOT include a "Data Coverage" section.** Clients don't care whether PricingSaaS tracks the target company or where the plumbing data came from. It reads as tool plumbing, not analysis. If you find yourself writing "is not currently tracked in the PricingSaaS index" or "Submitting [URL] to PricingSaaS would enable..." — delete it.
- **DO NOT include a "Comparable Companies on PricingSaaS Pulse" section** (or anything similar — pill links, nav buttons, "view on Pulse" rows). A row of pills pointing to your data source is internal-tool navigation, not client value.
- **DO NOT hyperlink competitor names to pricingsaas.com/pulse/ pages** anywhere in the body, tables, observations, or appendix. Competitor names should be plain text. The client doesn't need a tour of your data source.
- **DO NOT include "PricingSaaS: not yet tracked" or similar tooling-status badges** in the TL;DR coverage row. Coverage badges should only reflect what the client cares about: source freshness, scope of competitive set, data provenance ("Source: public pricing pages" is fine).
- **DO NOT mention PricingSaaS by name anywhere in the report body.** The only acceptable mentions are (a) the small logo in the header as "Data via" and (b) an optional one-line footer credit. If the brief is being white-labeled for a consulting client (e.g., f13i), drop even those — the client is paying for analysis, not tool attribution.

### Report Sections — FOLLOW THIS EXACT ORDER (8 sections total):

1. **Header** — PricingSaaS logo on right (always use `https://res.cloudinary.com/dd6dkaan9/image/upload/v1749376304/logo1_hmycoq.svg`), small and labeled "Data via." Optional partner/consultancy logo on left (e.g., f13i logomark when white-labeled). Report title (e.g., "Modal Pricing Intelligence Brief") + subtitle + date. Use "Pricing Intelligence Brief" not "Pricing Intelligence Report" — it signals concision and value density.

2. **TL;DR** — Grey panel with black left border. 2-3 sentences max. Lead with the competitive landscape and where the reader is exposed — NOT a recap of their own pricing moves. The reader already lived through their pricing changes; what they can't easily see is how the competitive ground has shifted around them. The reader should finish this paragraph thinking "this person sees things I don't."

   **Good example** (Vertex Analytics — leads with competitive threat): "Vertex Analytics's consumption-based model is the cleanest pricing in product analytics — transparent, self-serve, and aligned to the right value metric. But the competitive ground is shifting fast: PostHog now bundles analytics, session replay, feature flags, experimentation, and surveys at $0 to start, while Amplitude is packaging experimentation and guides into a $49/mo flat-rate tier that covers 25M events. Vertex Analytics's Growth plan caps at 20M events with no self-serve path above that — creating a dead zone between Growth and Enterprise that competitors are already filling."

   **Bad example** (leads with history recap): "In 18 months, Vertex Analytics went from a simple flat-rate Growth plan at $20/mo to a fully consumption-based model at $0.28/1K events — but only after a 95% cut to the free tier that suggests the previous ceiling was bleeding money." ← The reader already knows this. It reads like a changelog, not an insight.

   Below the TL;DR text, show 2-4 small badges reflecting source provenance only — e.g., "Pricing verified: [company].com", "Competitive set: 5 platforms", "Source: public pricing pages". NEVER include tool-status badges like "PricingSaaS: not yet tracked". If internal context from Granola or the vault added meaningful color, weave it into the TL;DR text naturally — not into a badge.

3. **Current Pricing Snapshot (compressed)** — One clean table. Plans, prices, key limits. Minimal commentary. This earns credibility in 10 seconds — it proves you have the details right without belaboring them. The reader already knows their own pricing; this just confirms you do too. Adapt columns to match their pricing model (per-seat, per-unit, usage-based, etc.). If they have detailed rate cards (like GPU pricing), include a second compact table but keep it tight.

4. **Competitive Positioning** (THE HOOK — this is the section that earns the call)
   This is where the value starts. Not just "here's what competitors charge" but "here's where you're exposed and where you have leverage."

   - **Competitor overview table**: Target company alongside 2-4 competitors with plan names, starting prices, and pricing model. Competitor names are plain text — DO NOT hyperlink them to pricingsaas.com/pulse/ pages. Keep it scannable.
   - **2-3 pointed positioning observations**: Each one should reframe how they think about their competitive position. Not "you're cheaper than X" but "your per-second billing eliminates 30-60% of idle cost that hourly competitors can't match — that's a moat worth pricing into." These should make them think "huh, I hadn't framed it that way."
   - **Blind spots**: Where are they exposed? What are competitors doing that they're not? What's the risk they might not see?
   - **Untapped leverage**: Where do they have pricing power they're not using? What moats could they price into?

5. **Strategic Observations** (THE REASON TO CALL)
   3-4 numbered insights that synthesize across ALL data sources — history, competitive intel, pricing knowledge, and internal context (Granola/vault).

   **Ordering principle: lead with new information, not interpreted history.** The first 1-2 observations should be things the reader genuinely can't see from inside — competitive bundling trends, market shifts, external data points. Later observations can interpret the reader's own pricing moves, but even these should be framed through a competitive or market lens, not as criticism of past decisions.

   Each observation should be:
   - **Specific**: Grounded in actual data points, not generic frameworks
   - **Opinionated**: Take a position — but frame it as "here's the competitive context for what you're seeing" rather than "here's what you got wrong"
   - **Question-generating**: Each observation should leave the reader with an implicit "and here's the question that raises" — not spelled out, but felt. They should finish each point wanting to discuss it further.
   - **Respectful of iteration**: When a company has changed pricing frequently, frame it positively — "a team that tests and adapts" not "pricing that hasn't stabilized." Iteration is a signal of sophistication, not indecision. Write like you're talking to the person who made those calls.

   **Good example** (leads with external signal, frames positively): "The product surface has expanded significantly — Session Replay, Warehouse Connectors, Data Pipelines — but the packaging is still three plans. We faced a similar dynamic at Grafana when the product expanded faster than the packaging. The question isn't whether to restructure, but what to gate where — and in what order."

   **Bad example** (presumes failure): "Your startup credit grant swung from $25k → $50k → $25k in three quarters. That kind of volatility usually signals uncertainty about acquisition economics." ← Reads as criticism from someone who wasn't in the room. Better: frame what the data *suggests* as a question worth exploring, not a diagnosis.

   If Granola/vault surfaced proprietary insights (client feedback, prior analysis), this is where they add the most value — they make observations feel grounded in real-world experience. Peer signals from Grafana or relevant consulting work also belong here.

6. **Opportunities & Questions** (THE SOFT CTA)
   2-3 specific things you'd explore if you were advising them. Breadcrumbs — enough to show you know where to dig, not enough to give away the whole playbook. Each one should feel like the opening of a conversation, not the conclusion of an analysis.

   **Every opportunity must include a testable next step.** Don't just identify a gap — show what the test looks like and why it's low-risk to run. Include specific numbers where possible (tier breakpoints, discount curves, conversion benchmarks). The reader should be able to picture the experiment, not just nod at the problem.

   Format: A brief observation → what it means → what you'd test. Example: "Growth caps at 20M events with no self-serve path above. A team tracking 25-50M events/month — common in mid-market SaaS — has to call sales or look elsewhere. A self-serve tier at $0.20/1K events for 20-50M volume would capture that segment without cannibalizing Enterprise. This is the kind of test that's relatively low-risk to run — it only affects net-new customers above the current ceiling."

   Internal context from meetings and docs should heavily inform this section. Prior client objections, feedback, or questions are gold here.

7. **Appendix: Pricing History Timeline** — The full chronological timeline of pricing changes, clearly labeled as appendix/reference material. This section is comprehensive — include every significant pricing event found. It's here for credibility and for readers who want to go deep.

   Timeline items ordered newest-to-oldest. Each item shows:
   - Period label (e.g., "2025 Q4 — October to December")
   - Event title (what happened)
   - Details with specific prices in monospace, % changes in red/green

   Do NOT include "View diff on PricingSaaS" links or other links back to the data source — keep the appendix self-contained.

   Use `.gap-warning` blocks for any coverage gaps in the underlying data — but phrase the gap in terms of what's missing for the reader ("Pricing changes between 2024 Q2 and 2024 Q4 are not captured here"), NOT in terms of tracking status.

   The appendix may also include: worked examples from the target's pricing page, rate ladders, and a plain-text competitor pricing detail list (no hyperlinks).

8. **Footer** — Thin bar with author/source and date. Optional one-line "Data via PricingSaaS" credit on the right — drop it entirely when the brief is white-labeled for a consulting client.

### Key Design Principles
- **Self-Contained**: All CSS inline, no external dependencies (Google Fonts via `<link>` is acceptable for white-label themes)
- **Clean & Minimal**: Either white wrapper (default) or dark theme (for white-label clients like f13i). System fonts or brand fonts (Instrument Serif + Inter for f13i). No colored gradients beyond brand accents.
- **Company Logos**: Use Cloudinary-hosted logos from `get_company_details` where available — but only for the target company, never as nav-tile links to competitor Pulse pages.
- **Monospace Prices**: Use `.model-price` class for all dollar amounts
- **Price Changes**: Red for increases/decreases, green `.positive` for growth metrics
- **NO hyperlinks to PricingSaaS in body content.** Competitor names, prices, and observations are all plain text. The only link to PricingSaaS that's acceptable is the small "Data via" logo in the header.
- **Data Accuracy**: All prices come from PricingSaaS MCP tools (or direct web_fetch of the company's public pricing page when not tracked), never from memory.
- **Analysis First**: The competitive positioning and strategic observations are the star — they should be the longest sections in the brief. The pricing history timeline is supporting evidence in the appendix and appears AFTER all analysis sections. The brief should have exactly 8 sections in the order specified above. Sections 1-3 (Header, TL;DR, Snapshot) are ~20% of content. Sections 4-6 (Competitive Positioning, Strategic Observations, Opportunities) are ~60% of content. Sections 7-8 (Appendix, Footer) are ~20% of content. If the appendix is longer than the analysis sections combined, the brief is structured wrong.
- **Internal Context is Additive, NEVER Standalone**: Granola and vault context enriches the analysis — it never replaces PricingSaaS data AND it never gets its own section. No "Insider Intelligence" blocks, no meeting summary cards, no dedicated transcript sections. Internal insights appear as inline sentences within the TL;DR, Strategic Observations, and Opportunities sections — e.g., "In a recent conversation, their pricing lead flagged X as the core challenge" woven into a strategic observation. If internal sources contradict PricingSaaS data, flag the discrepancy rather than choosing one. The goal is a brief that reads like it was written by someone who's been in the room with clients, not just someone who pulled data from a tool — but without revealing the room itself as a separate exhibit.
- **Audience Awareness**: The reader is the person responsible for pricing — they made the decisions you're analyzing, or they report to someone who did. They already know what they changed and when. Don't recap their decisions back to them — show them the competitive context they can't easily see from inside.

   Every sentence in the first 6 sections should pass the **recipient-lens test**: "If I were the VP of Pricing at this company and received this from someone I don't know, would I find this sentence interesting — or would I skim past it?" Sentences that merely describe their own pricing changes fail this test. Sentences that reveal competitive dynamics, market shifts, or reframe their position in a way they hadn't considered pass it.

   **Anti-patterns to avoid:**
   - Presumptuous language about their decisions: "bleeding money," "eroded trust," "confused customers," "hasn't found equilibrium," "volatility signals uncertainty"
   - Leading the TL;DR with history instead of competitive context
   - Ordering observations by chronology instead of information novelty
   - Identifying gaps without testable next steps
   - Framing iteration as failure instead of sophistication
   - Tool-plumbing sections (Data Coverage, Pulse Links, "not yet tracked" badges) that read as internal infrastructure
   - Hyperlinking competitor names to pricingsaas.com — the client is the audience, not the data source

### White-Label Mode (e.g., f13i)
When the user asks for the brief to be branded as their own consulting deliverable (e.g., "brand this with f13i branding"), apply the following changes on top of the standard template:

- **Theme**: Dark theme — `#090909` bg, brand-accent orange (`#F97316` for f13i), `#D4D4D4` body text, `#fafafa` headings
- **Fonts**: Instrument Serif (headings, italic) + Inter (body) for f13i; otherwise use the consultancy's brand fonts
- **Header**: Consultancy logomark + tagline on the left ("f13i · Pricing you can confidently defend"). PricingSaaS shrinks to a small "Data via" credit on the right.
- **Author strip**: A thin band below the title with the consultant's name, firm, and one credibility line (e.g., "Prepared by Farhan Manjiyani · f13i Consulting · 11 products priced at Grafana Labs · $550M ARR")
- **Voice**: First-person ("I've found," "I'd examine first," "(At Grafana, every time we...)") replacing the neutral tool-voice. Lean into peer signals where they strengthen an observation.
- **CTA block** before the footer with a brand quote, a primary button (Cal.com / booking link), and a secondary button (email). For f13i: cal.com/farhan-m + me@f13i.com.
- **Footer**: Consultant name, firm, site link. Drop the PricingSaaS credit entirely — the client is paying for analysis, not tool attribution.

## Step 3.5: Recipient-Lens Review

Before finalizing, do a quick pass through the brief from the recipient's chair. For each of the first 6 sections, ask:

1. **TL;DR**: Does it lead with something they can't see from inside? Or does it just recap their own moves?
2. **Pricing Snapshot**: Accurate? Anything wrong that would undermine credibility?
3. **Competitive Positioning**: Are the observations genuinely reframing, or just restating price differences? Would the reader think "huh, I hadn't framed it that way"?
4. **Strategic Observations**: Are they ordered by information novelty (new info first)? Is any observation presumptuous about their decision-making? Does any observation frame iteration as failure?
5. **Opportunities**: Does each one include a testable next step? Or does it just identify a gap and stop?
6. **Plumbing audit**: Search the brief for any of these strings — if any are present, delete: "Data Coverage" section header, "Comparable Companies on PricingSaaS Pulse", "not yet tracked", "Submitting [URL] to PricingSaaS", competitor `<a href="https://pricingsaas.com/pulse/...">` hyperlinks. None of this belongs in a client-facing brief.

If any section fails its check, revise before saving. This step takes 60 seconds and is the difference between a B+ brief and an A+ one. The goal: the pricing lead reads this and forwards it to their team with "this is worth looking at."

## Step 4: Save and Share

1. Save as `.html` with a descriptive name to the outputs directory (e.g., `modal-pricing-brief-2026-03.html` or `infoaide-pricing-brief-f13i-2026-05.html` for white-labeled briefs).
2. Present the file to the user with a `computer://` link so they can open it locally.
3. Upload to share.pricingsaas.com using the `upload_report` MCP tool:
   - `filename`: the report filename with extension
   - `content`: the full HTML content as a string (NOT a file path — pass the actual text)
   - Returns a `public_url` — present this prominently as the shareable link.
4. Always upload unless the user specifically asks not to.
---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Granola, PricingSaaS, or Obsidian call, run `tool_search` for each ("granola meetings", "pricingsaas search", "obsidian get note") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. Never ship a report where a data source returned empty and the narrative filled the gap. A partial
result that says which leg died beats a clean-looking one that dropped a source.
