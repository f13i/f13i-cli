---
name: weekly-brain-sync
description: Sync Granola meeting transcripts from the f13i folder into Farhan's 2nd brain Google Drive docs. ALWAYS use this skill when Farhan says "sync my brain", "weekly brain sync", "update my docs from this week's calls", "dump my meetings into my brain", "what happened in my meetings", or any variation of wanting to extract insights from recent meetings into his second brain files. Also trigger when Farhan says "catch me up on my calls" or "what did I learn this week." This skill pulls ALL non-executive-coach meetings from the f13i Granola folder since the last brain update, then generates paste-ready update blocks for brain.md, business.md, workflows.md, and accomplishments.md. Do NOT use the business-doc-update skill instead — this skill is specifically for multi-meeting batch extraction, not single-session updates.
---

# Weekly Brain Sync Skill

Batch-extracts insights from Granola meeting transcripts (f13i folder, excluding your executive coach coaching calls) and generates paste-ready update blocks for all 2nd brain docs.

---

## Step 1: Load Current Brain Docs

Read all four target notes with `obsidian_get_note` (format: content), one call per note:

| File | Google Doc ID |
|------|--------------|
| brain.md | `10-brain/03-brain.md` |
| business.md | `10-brain/02-business.md` |
| workflows.md | `10-brain/04-workflows.md` |
| accomplishments.md | `10-brain/01-accomplishments.md` |

Scan each doc and identify:
- The most recent entry date in business.md (pipeline updates) — this is the **delta start date**
- Existing pipeline companies/contacts in business.md
- Existing workflow entries in workflows.md
- Most recent accomplishment date in accomplishments.md

---

## Step 2: Pull Granola Meetings

### Find the f13i folder
```
tool: Granola:list_meeting_folders
```
Identify the folder named "f13i" (or closest match).

### List meetings since the delta start date
```
tool: Granola:list_meetings
folder_id: [f13i folder ID]
after: [delta start date from Step 1]
```

**Filter out immediately:**
- Any meeting with "your executive coach" in the title or attendees
- Any meeting with "coaching" in the title

What remains is the **sync batch** — the meetings to process.

### Pull full transcripts
For each meeting in the sync batch:
```
tool: Granola:get_meeting_transcript
meeting_id: [id]
```

Pull all transcripts. If there are more than 8 meetings, process the most recent 8 and note the others were skipped.

---

## Step 3: Extract & Classify Insights

For each meeting transcript, extract:

### A. Pipeline / Deal Updates
- Prospect name, company, and role
- What was discussed
- Any commitments made (by either side)
- Objections or concerns raised
- Clear next move + timeline
- Deal status change (if any)

### B. New Contacts
- Name, company, role
- How they came in
- Current status / relationship stage

### C. Workflow or Process Learnings
- Any new repeatable process discovered or discussed
- Tools or automations mentioned worth capturing
- Anything Farhan said "we should always do this" about

### D. Accomplishments
- Results delivered, revenue generated, proposals sent, deals closed
- Anything quantifiable that reflects f13i progress
- Client feedback or validation moments

### E. Content Ideas / Learnings (for brain.md)
- Pricing insights, market observations, founder patterns
- Anything that sparked a "I should write about this" moment
- Real examples from the call that could anchor a LinkedIn post or article
- Phrases or framings Farhan used that landed well

---

## Step 4: Generate Complete Updated .md Files

Fetch the full current content of each doc from Google Drive. Then generate a **complete updated version** of each file — not paste blocks, not diffs. Full replacement files the user can upload directly to Drive.

**Doc IDs to fetch:**

| File | Google Doc ID |
|------|--------------|
| brain.md | `10-brain/03-brain.md` |
| business.md | `10-brain/02-business.md` |
| workflows.md | `10-brain/04-workflows.md` |
| accomplishments.md | `10-brain/01-accomplishments.md` |

Read all 4 with `obsidian_get_note` (format: content). Write updates back with `obsidian_patch_note` or `obsidian_append_to_note` — do NOT route through the outputs folder for manual paste.

**For each file, apply all extracted updates:**
- Merge new pipeline entries into the existing pipeline section (don't duplicate existing entries)
- Add new contacts to the contacts section
- Append new workflow sections (don't overwrite existing ones)
- Add new accomplishments entries
- Add new content ideas to brain.md
- Update the "Last updated:" date at the top to today
- Update status lines in brain.md 🟢 Now section

**Output:** Write each complete updated file using `create_file` to `/mnt/user-data/outputs/`:
- `/mnt/user-data/outputs/brain.md`
- `/mnt/user-data/outputs/business.md`
- `/mnt/user-data/outputs/workflows.md`
- `/mnt/user-data/outputs/accomplishments.md`

Then call `present_files` with all 4 paths so the user can download them.

**Open the output with:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAIN SYNC — [Date Range Covered]
[N] meetings processed
4 files generated — download and upload to Drive folder to replace existing docs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then briefly list what changed per file (2-3 bullets each) before presenting the files.

---

## Step 5: Flag Stale Pipeline Items

After generating updates, scan business.md for pipeline entries that haven't appeared in any recent meeting. Flag them:

```
⚠️  STALE ITEMS — may need a follow-up or status check:
- [Company]: last logged [date] — no recent meeting found
- [Company]: last logged [date] — no recent meeting found
```

---

## Rules

- **Generate complete files, not paste blocks** — fetch the full current doc from Drive, merge in all new content, write the complete updated file to /mnt/user-data/outputs/. User uploads to Drive to replace.
- **Skip your executive coach meetings entirely** — handled by coaching-call-update skill
- **Delta logic is strict** — only pull meetings since the most recent update date found in the docs. If no date is found, default to last 14 days and note the assumption
- **One entry per company** — if a company appears in multiple meetings, consolidate into one updated section (most recent status wins, note the history)
- **Content ideas go in brain.md only** — don't scatter them across files
- **Accomplishments must be quantified** — if it can't be measured, move it to brain.md as context instead
- **Update "Last updated:" date** at the top of every file you touch
- **Meeting count header is required** — always open with the date range and meeting count so Farhan knows what was processed
- **present_files is required** — always call present_files with all 4 output file paths at the end so Farhan can download them

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
