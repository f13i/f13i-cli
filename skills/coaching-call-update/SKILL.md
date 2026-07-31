---
name: coaching-call-update
description: "Generate a your executive coach coaching call prep update in investor-update format. ALWAYS use this skill when Farhan mentions your coach, coaching call, prep for your coach, or asks for an update for his coach. Also trigger automatically as part of the call-prep workflow when a your executive coach meeting is detected on calendar. This skill pulls Granola notes from the last session, loads current pipeline from business.md, and writes a structured four-section investor update covering by the numbers, what is working, what is not working, and where help is needed."
---

# Coaching Call Update Skill

## Trigger
- "Prep for your coach"
- "Update for my coaching call"
- "your executive coach meeting" detected in calendar during call-prep workflow
- "Investor update for your coach"

## Step 1: Find the Last Coaching Session
```
tool: Granola:query_granola_meetings
query: "your executive coach coaching call"
```
Note the date of the last session — this sets the "since [date]" window for the update.

If no Granola result, check Gmail:
```
Gmail:search_threads
query: "from:coach OR to:coach coaching"
```

## Step 2: Load Current Business Context
Read business.md from the vault:
```
tool: obsidian_get_note
path: 10-brain/02-business.md
format: content
```

Extract:
- Active pipeline (all deals and their current status)
- Content published or created
- Tools/automations built
- Key decisions made since last session

## Step 3: Find Today's Coaching Call
```
tool: Google Calendar:list_events
q: "your coach coaching"
timeMin: [today 00:00 CT]
timeMax: [14 days from now 23:59 CT]
timeZone: America/Chicago
```
Note the event ID for potential calendar note creation.

## Step 4: Write the Investor Update

**Format (always exactly this structure):**

---
**COACHING UPDATE — [Today's Date]**
*Since last session: [Last session date]*

---

**BY THE NUMBERS**
[Quantified metrics only — revenue, proposals sent, calls completed, emails sent, responses received, ARR potential in pipeline, hours worked, posts published. your coach wants numbers. If no number exists, don't list the item here — move it to "What's Working".]

---

**WHAT'S WORKING**
[Specific wins, positive signals, approaches that generated results. 3-5 bullets. Be specific — name companies, name people, name tactics.]

---

**WHAT'S NOT WORKING**
[Honest assessment. What stalled, what didn't convert, what took too long, what needs a different approach. Don't soften this section — your coach values honesty here.]

---

**WHERE I NEED HELP**
[Specific asks for this session. Max 3. Should be things your coach can actually give input on — introductions, frameworks, accountability, perspective on a decision.]

---

## Step 5: Attempt Calendar Event
Try to add the update as a note on the your coach coaching event:

```
tool: Google Calendar:update_event
eventId: [ID from Step 3]
description: [paste the investor update]
sendUpdates: none
```

If update fails (Farhan is not the organizer), create a parallel private event:
```
tool: Google Calendar:create_event
summary: "Notes for your coach Conversation"
start: [same time as coaching call]
end: [same time as coaching call end]
description: [investor update]
```

If both fail, output the update in the chat and note: "Calendar write failed — copy-paste manually into the event or a notes doc."

## Rules
- your coach is numbers-first — lead every section with specifics, not narrative
- "By the Numbers" must have at least 3 quantified data points or it's not ready
- Keep total length to one page — coaching sessions are 45-60 min, he reads fast
- Don't omit the "What's Not Working" section — that's your coach's favorite part

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
