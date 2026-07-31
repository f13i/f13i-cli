---
name: cold-email
description: "Draft, grade, and refine cold outreach emails for f13i consulting prospects. ALWAYS use this skill when Farhan asks to write a cold email, pitch email, outreach message, or LinkedIn message to a prospect. Also trigger when grading an existing email draft, identifying a prospect from a job posting, applying the JD-to-client playbook, or checking for warm signals before outreach. This skill codifies the full f13i outreach system: warm signal check, hook selection, draft, grade, and refine."
---

# Cold Email Skill

## Step-by-Step Workflow

### Step 1: Load Context
Load f13i docs using `load-f13i-docs` skill, or read directly from the Obsidian vault with `obsidian_get_note` (format: content):
- `10-brain/05-writing.md` (voice rules)
- `10-brain/02-business.md` (pipeline, ICP, existing relationships)
- Voice docs: `10-brain/voice/01-voice-doc.md`, `10-brain/voice/02-llm-prompt.md` (fetch these for all outreach tasks)

### Step 2: Warm Signal Check (ALWAYS run before drafting)
Check for existing relationship context in this order:

**Granola:**
```
Granola:query_granola_meetings
query: "[person name] OR [company name]"
```

**Google Calendar:**
```
Google Calendar:list_events
q: "[person name] OR [company name]"
timeMin: [3 months ago]
timeMax: [today]
```

**Gmail:**
```
Gmail:search_threads
query: "from:[company domain] OR to:[company domain]"
```

**Obsidian vault (second brain):**
```
obsidian_search_notes
query: "[company name]"
```

If ANY warm signal found → email MUST open with that specific moment/interaction, not a general insight. Override the hook decision tree.

### Step 3: Research the Prospect
- Web search: "[person name] [company]" + "[company] pricing page"
- Fetch their pricing page directly if available
- If from a job posting: extract the hiring pain from the JD — that IS the hook

### Step 4: Hook Selection (if no warm signal)

Pick ONE hook based on what the research surfaced:

| Hook | When to Use |
|------|-------------|
| **Bug** | Obvious pricing problem visible on their page (missing tier, wrong model, confusing packaging) |
| **Left on table** | Clear revenue gap — they're underpricing a segment or feature |
| **Competitive gap** | Their pricing vs. competitors reveals a strategic blind spot |
| **JD signal** | They're hiring for pricing — use the JD pain as the opener |

### Step 5: Draft the Email

**Structure:**
```
Subject: [3-6 words, specific to their situation — no generics]

[Warm signal anchor OR specific observation — 1 sentence]

[The so-what / what it means for them — 1-2 sentences]

[Credibility anchor — 1 sentence, specific to why you — tie to Grafana or relevant experience]

[No-strings-attached ask — 1 sentence]

[Signature]
Everyone's got a pricing opinion. Almost nobody has pricing data.
f13i.com | cal.com/farhan-m | me@f13i.com
```

**Voice rules (from `10-brain/05-writing.md`):**
- Contractions always
- No hedging phrases ("I think", "might", "perhaps")
- No consulting jargon
- Short sentences, varied length
- Sound like a practitioner, not a vendor

### Step 6: Grade the Email

Grade as the recipient would grade it (use their background/role):

| Grade | Criteria |
|-------|----------|
| **A+** | Specific, non-obvious insight + clear credibility + low-friction ask. Would reply. |
| **A** | Strong but one element slightly generic or slightly long |
| **B+** | Good insight, minor hedging or weak subject line |
| **B** | Sendable but one fix needed |
| **Below B** | Do not send. Identify the specific problem. |

**Do not send below B.** If B or below, fix it and re-grade before presenting final version.

### Step 7: Email Verification
Before finalizing, note email format:
- Research the company's email pattern (first.last, firstlast, etc.)
- Recommend verifying via Hunter.io or NeverBounce free tier before sending
- Note the email domain's mail provider if findable (MX record lookup via web search)

## ICP Reminder
Strongest current lane: companies embedding AI into their product who don't know how to price it.
Secondary: Series A-B SaaS with a clear pricing problem visible from the outside.
Avoid: AI-native operators running full Claude/GPT/Gemini stacks with full business context — they don't see consultant value.

## JD-to-Client Playbook
When Farhan shares a job posting for a pricing role:
1. Extract the pain from the JD — what are they trying to solve?
2. Identify the hiring manager (usually the poster)
3. Research their current pricing page
4. Apply this workflow — JD pain becomes Hook B (left on table) or Hook A (bug)
5. Grade using the A+/B rubric before finalizing

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift.

Before the first Gmail, Calendar, Granola, or Obsidian call, run `tool_search`
for each ("gmail search threads", "calendar list events", "granola meetings",
"obsidian get note") and use the names and parameters it returns. The names here
are correct as of 2026-07-30; the parameter schemas are not documented here on
purpose, because hardcoding them is what broke this skill.

**History:** this skill shipped for months calling `gmail_search_messages`,
`gmail_read_thread`, and `gcal_list_events` — none of which exist. It failed
silently, producing confident output with the email and calendar legs missing
entirely. Nothing reported it. Fixed 2026-07-30.

**Failure behaviour:** if a source fails, name it in the output. A partial
result that says which leg died beats a clean-looking one that quietly dropped
a source.
