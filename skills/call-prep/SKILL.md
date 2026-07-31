---
name: call-prep
description: Run Farhan's full call prep workflow before any meeting. ALWAYS use this skill when Farhan says "run my call prep", "prep me for [name] call", "what's on my calendar", "prepare for my meeting with [person]", or asks for a briefing before any upcoming call. Also trigger when the daily call prep workflow is invoked. This skill orchestrates Calendar → Granola → Gmail → Vault → brief output in a consistent sequence every time.
---

# Call Prep Workflow

## Trigger Phrases
- "Run my daily call prep"
- "Prep me for [name]"
- "What do I need to know before my call with [X]"
- "Call prep for [person/company]"

## Step-by-Step Sequence

### Step 1: Load f13i Docs
Use the `load-f13i-docs` skill to pull business.md and brain.md for pipeline context. (No need for voice docs unless brief requires Farhan's writing style.)

### Step 2: Check Calendar
```
tool: Google Calendar:list_events
params:
  timeMin: [today 00:00 CT]
  timeMax: [today 23:59 CT] OR [next 48 hours for daily prep]
  timeZone: America/Chicago
  condenseEventDetails: false
```
If a specific person is named, search 2 weeks out: `q: "[person name]"`

### Step 3: Pull Granola Notes
For each relevant meeting found:
```
tool: Granola:query_granola_meetings
query: "[person name] [company] call meeting"
```
If a specific meeting ID is known, use `Granola:get_meeting_transcript` directly.

Fallback: If Granola returns no transcript, check the business.md meeting notes section in the vault (`obsidian_get_note` on `10-brain/02-business.md`, or via the `load-f13i-docs` skill).

### Step 4: Check Gmail Thread
```
tool: Gmail:search_threads
query: "from:[person] OR to:[person] OR [company name]"
```
Read the most recent thread with `get_thread` using the threadId.

### Step 5: Check Vault for Related Docs
```
tool: obsidian_search_notes
query: '[company name] OR [person name]'
```
Look for deal files (`30-deals/[company]/index.md` + sibling artifacts: proposal, pricing, scoping, contract).

### Step 6: Write the Brief

Output format (always follow this structure):

---
**CALL PREP: [Person Name] — [Date, Time CT]**

**Who they are:** [2-3 sentences — role, company, context]

**Where we left off:** [Last touchpoint — email, call, proposal status]

**What they care about:** [Key pain points or goals from past context]

**Our position:** [What's been proposed, current deal stage]

**What to accomplish in this call:** [1-3 bullet points max]

**Watch out for:** [Objections, sensitivities, things to avoid]

**Open questions:** [Things to ask or clarify]

---

## your executive coach Coaching Calls
When prepping for your coach, also trigger the `coaching-call-update` skill to generate the investor update section before writing the brief.

## Rules
- Never skip a step — all 4 tool checks must run even if some return nothing
- If Granola returns no content, explicitly note "No Granola transcript found — pulling from business.md in the vault (`10-brain/02-business.md`)"
- Brief should fit one screen — tight, executive-facing, no fluff
- Time zone is always America/Chicago (CT) unless Farhan says otherwise

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
