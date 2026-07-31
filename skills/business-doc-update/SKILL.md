---
name: business-doc-update
description: Compile updates from the current session and write them into Farhan's f13i second-brain docs in his Obsidian vault. ALWAYS use this skill when Farhan says "update my docs", "update my brain", "update business.md", "log this to my docs", or asks to save/capture what was discussed into his second brain. Also trigger at the end of any working session where meaningful decisions, deal status changes, new contacts, new workflows, or new content was created. This is the standard session close workflow.
---

# Business Doc Update Skill

The second brain lives in Farhan's **Obsidian vault** (migrated off Google Drive on 2026-05-12). Read and write it with the `obsidian` tools — no more copy-paste into Drive.

## When to Trigger
- "Update my docs"
- "Log this to my brain"
- "Save this to business.md / workflows.md"
- End of any session with: new pipeline activity, new contacts, new tools built, new workflows, content created, deals progressed

## Step 1: Load Current Docs
Read the docs that need updating with `obsidian_get_note` (`format: content`). Usually:
- business.md → `10-brain/02-business.md`
- workflows.md → `10-brain/04-workflows.md`
- brain.md → `10-brain/03-brain.md`

## Step 2: Scan the Session
Review the current conversation and identify:

**Pipeline changes:**
- New prospect contacted or responded
- Proposal sent, edited, or accepted
- Meeting booked or completed
- Deal closed or lost
- Status changes on existing pipeline (deals live under `30-deals/<client>/index.md`)

**New contacts:**
- Name, company, role, how they came in, current status

**New tools / automations built:**
- What it does, how to trigger it

**New workflows:**
- Step-by-step process for recurring tasks

**Content created:**
- LinkedIn posts, articles, emails — status (draft/final/published)

**Decisions made:**
- ICP refinements, positioning changes, pricing strategy decisions

## Step 3: Write the Updates into the Vault

For each changed doc, write the update straight into the vault:
- Adding a new entry under an existing section → `obsidian_append_to_note` (or `obsidian_patch_note` targeting the heading).
- Updating an existing section in place → `obsidian_patch_note`.
- Show the block you're about to write in chat first so Farhan can eyeball it, then apply it.

Keep blocks structured to match the doc, e.g. for a pipeline entry in `02-business.md`:
```
**[Company Name]** — [Date]
- Status: [current status]
- Contact: [Name, Role]
- Last touchpoint: [what happened]
- Next move: [specific action + date if known]
```

For a `04-workflows.md` entry:
```
### [Workflow Name]
**Trigger:** [when to run this]
**Steps:**
1. [step]
2. [step]
```

## Step 4: Flag Stale Items
While reviewing, flag any pipeline entries or status items that appear stale based on session context. Note: "[Company] — last updated [date], may need status check."

## Rules
- Write directly to the vault with the obsidian tools — do not claim you can only output paste blocks, and do not send Farhan to Google Drive (those copies are pre-migration and stale).
- Always show the update in chat before writing it, so Farhan can catch anything off.
- Only touch sections that actually changed — don't regenerate the whole doc.
- Keep updates concise — matching the existing doc's density and style.
- If a section doesn't exist yet, create it and label it clearly as a new section.
