---
name: website-advisor
description: Mine Granola prospect conversations and competitive landscape to generate prioritized improvements for f13i.com. ALWAYS use this skill when Farhan says "website review", "improve my site", "what should I change on f13i.com", "run my website audit", "site improvements", "f13i.com feedback", "update my site based on calls", or any variation of wanting to improve his website using call insights or competitive intel. Also trigger when Farhan says "what are competitors doing" in context of his own website or positioning. This skill is designed to run weekly — it pulls Granola f13i folder meetings from the past 7 days, identifies patterns in objections/resonance/language, compares against 6 named competitors, and outputs a prioritized HTML improvement brief with copyable code snippets. Do NOT use for general website feedback on other people's sites.
---

# Website Advisor Skill

Pulls Granola prospect conversations from the f13i folder + competitive landscape to generate a prioritized improvement brief for f13i.com. Designed to run weekly. Output is an HTML brief with copy-ready code snippets and a ranked action list.

---

## Step 0: Load Farhan's Current Site & Docs

Read the current f13i docs from the Obsidian vault for positioning context (via `obsidian_get_note`, `format: content`) — or invoke the `load-f13i-docs` skill to load the whole brain at once:

| File | Vault path |
|------|-----------|
| brain.md | `10-brain/03-brain.md` |
| writing.md | `10-brain/05-writing.md` |
| business.md | `10-brain/02-business.md` |

Also fetch f13i.com live using `web_fetch`: `https://f13i.com`

From these, establish:
- Current hero copy, CTA, positioning statement
- What services/problems the site currently leads with
- Existing differentiators claimed

---

## Step 1: Pull Granola Meetings (Past 7 Days)

```
tool: Granola:list_meeting_folders
```
Identify the "f13i" folder.

```
tool: Granola:list_meetings
folder_id: [f13i folder ID]
after: [today minus 7 days]
```

Filter out immediately:
- your executive coach / coaching calls
- Internal ops meetings (anything without an external guest)

For each remaining meeting:
```
tool: Granola:get_meeting_transcript
meeting_id: [id]
```

If fewer than 2 meetings found, extend the lookback window to 14 days and note the extension. If still nothing, use the last 5 meetings regardless of date.

---

## Step 2: Extract Signal From Calls

For each transcript, mine four categories:

### 2A. What's Landing (Resonance Signals)
- Phrases Farhan used that generated positive reactions ("tell me more", follow-up questions, "that's exactly our problem")
- Services or angles that got immediate buy-in
- Analogies or framings that clicked
- Questions prospects asked that signal they're already sold on the category

### 2B. What's Not Landing (Friction Signals)
- Objections raised before understanding the offer ("what do you actually do?", "how is that different from X?")
- Moments where Farhan had to explain something the site should explain first
- Prospect confusion about scope, pricing, or fit
- Drop-offs in energy during the call

### 2C. Prospect Language (Exact Words)
- How prospects describe their problem (not Farhan's framing — theirs)
- Job titles, company contexts, phrases they use repeatedly
- What they say they've tried before
- What they say they wish they had

### 2D. Competitive Mentions
- Any competitors named by prospects
- How prospects frame the comparison
- What they say those competitors do better or worse

---

## Step 3: Competitive Landscape Scan

Research these 8 competitors via `web_fetch` — fetch their homepage and/or pricing page:

| Company | URL |
|---------|-----|
| Steero | `https://steero.com` |
| Aristotle | (search for "Aristotle pricing consultancy SaaS") |
| Paid | (search for "paid.com pricing consultancy") |
| Revomo | `https://revomo.io` |
| Velon | (search for "Velon pricing SaaS") |
| Mondrio | (search for "Mondrio pricing") |
| Lagotta | (search for "Lagotta pricing consultancy") |
| Currvo | (search for "Currvo pricing SaaS") |

For each competitor that resolves, extract:
- Hero headline / positioning statement
- Who they say their ICP is
- What they lead with (methodology, outcomes, credentials, tools)
- Their primary CTA
- Any social proof signals (logos, case studies, metrics)
- Pricing signals (if visible)

Use `web_search` for any that don't have obvious URLs. Skip gracefully if a site isn't findable — note it.

---

## Step 4: Synthesize Improvements

Cross-reference call signals against the live site against competitive landscape. Generate a ranked list of improvements in five categories:

### 4A. Copy Changes
- Hero headline: should it mirror prospect language? What exact words from calls should be in the first 10 words?
- Problem framing: does the site describe the pain the way prospects actually describe it?
- Service framing: what are prospects buying when they say yes? Does the site lead with that?

### 4B. Social Proof Gaps
- What proof points came up naturally in calls that the site is missing?
- Competitor proof patterns Farhan doesn't match (logos, metrics, testimonial formats)
- Anything Farhan said on calls that should be in a testimonial box or case study card

### 4C. Positioning Gaps
- Competitors who are eating the same ICP — where does f13i win that the site doesn't say?
- Any language patterns from calls that signal a positioning angle worth testing

### 4D. Structural/UX Changes
- Things prospects had to ask about that should be answered before the CTA
- Missing sections competitors have that seem to work
- CTA friction points

### 4E. Quick Wins
- Word swaps: one phrase that should become another based on prospect language
- A bullet the site is missing that appeared in every good conversation
- A line of copy that should move from buried to above the fold

---

## Step 5: Generate the Brief

Produce a self-contained HTML brief named `f13i-website-advisor-[YYYY-MM-DD].html` and save to `/mnt/user-data/outputs/`.

### Brief Structure

1. **Header** — f13i brand header (dark bg `#090909`, orange `#F97316` accent, Instrument Serif + Inter)
2. **This Week's Signals** — quick stats block: [N] meetings processed, [N] resonance signals, [N] friction signals, [N] competitors scanned
3. **Prospect Language Bank** — a styled block of exact phrases pulled from transcripts, sorted by how often similar phrasing appeared. This is quote-mining material Farhan can lift directly into copy.
4. **Ranked Improvements** — numbered 1–N by priority (impact × ease). Each improvement card has:
   - **What to change** (clear, specific)
   - **Why** (which call evidence + competitive gap drives it)
   - **Before / After** — current copy vs. proposed copy, or current state vs. proposed state
   - **Effort** — S / M / L (S = edit one line; M = new section or reorder; L = new page or structural change)
   - For any S or M copy change: include the full HTML snippet, ready to paste
5. **Competitive Snapshot** — comparison table of how f13i.com's positioning stacks up against the 8 competitors on: ICP clarity, hero headline strength, social proof, CTA clarity, methodology transparency
6. **Archived Signals** — raw notes section (collapsible) with all call excerpts and competitive details for reference. Everything needed to re-run or audit.

### Design Rules
- Dark theme: `#090909` bg, `#F97316` accents, `#D4D4D4` body, `#fafafa` headings
- Fonts: `Instrument Serif` (headings) + `Inter` (body) via Google Fonts
- Self-contained — all CSS inline, no external JS dependencies
- Collapsible sections for the archived raw data
- Mobile-readable (single column below 768px)
- Code snippets in `<pre><code>` blocks with copy button (pure JS, no libraries)

---

## Step 6: Present & Schedule

```
tool: present_files
paths: [/mnt/user-data/outputs/f13i-website-advisor-[YYYY-MM-DD].html]
```

Open with a summary block:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEBSITE ADVISOR — [Date]
[N] meetings mined · [N] competitors scanned
[N] improvements ranked
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then in 3–4 bullets, name the top 3 priority changes and why, before handing off the file.

After presenting, offer: "Once you've accepted any changes, say 'deploy to Netlify' and I'll run the deploy skill — it handles versioning, file checks, and the full deploy folder."

---

## Rules

- **Prospect language > Farhan's language** — the whole point is to surface what prospects say, not echo existing copy
- **Evidence-anchored improvements only** — every recommendation must trace back to a call signal or a competitive gap. No generic website advice.
- **No improvements without copy** — every S or M effort item must include the ready-to-use HTML/copy. L items get a clear spec, not a vague suggestion.
- **Competitive data is directional** — if a competitor site doesn't load or has minimal content, skip it and note it rather than guessing
- **Skill is additive** — each weekly run should flag new signals (from new calls) vs. patterns that have appeared before. If the same friction signal appeared in 3 consecutive weeks, escalate its priority.
- **Weekly cadence** — designed to run every Thursday or Friday, covering calls from the preceding 7 days
- **Full deploy folder awareness** — any HTML snippet generated must be consistent with the full f13i deploy stack: index.html, fair-use.html, pricing-problem.html, resources.html, _redirects, og.png. Never suggest a change that breaks site-wide consistency.

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Granola or Obsidian call, run `tool_search` for each ("granola meetings", "obsidian get note") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. The whole skill rests on call evidence — if the Granola leg is empty, stop rather than fall back to generic site advice. A partial
result that says which leg died beats a clean-looking one that dropped a source.
