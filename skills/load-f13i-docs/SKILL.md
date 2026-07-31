---
name: load-f13i-docs
description: Load Farhan's f13i second-brain documents into context from his Obsidian vault. ALWAYS use this skill when Farhan says "load my f13i docs", "pull my docs", "load my brain", or starts any session related to f13i consulting work, cold outreach, business development, the f13i website, or any task requiring knowledge of his business context, voice, pipeline, or workflows. Also trigger when he references brain.md, writing.md, business.md, workflows.md, or accomplishments.md by name. This is the standard session opener for virtually all f13i work — when in doubt, load the docs.
---

# Load f13i Docs

The f13i second brain lives in Farhan's **Obsidian vault** (migrated off Google Drive on 2026-05-12). Read every file with the `obsidian` tools — `obsidian_get_note` with `format: content`. Do not use Google Drive.

## Core docs (always load these 5)

| File | Vault path |
|------|-----------|
| brain.md | `10-brain/03-brain.md` |
| writing.md | `10-brain/05-writing.md` |
| business.md | `10-brain/02-business.md` |
| workflows.md | `10-brain/04-workflows.md` |
| accomplishments.md | `10-brain/01-accomplishments.md` |

## Conditional: Voice Docs

Only load these when the task involves writing, editing, content creation, LinkedIn posts, cold emails, or anything requiring Farhan's voice:

| File | Vault path |
|------|-----------|
| 01_voice_doc | `10-brain/voice/01-voice-doc.md` |
| 02_llm_prompt | `10-brain/voice/02-llm-prompt.md` |
| 03_reference_writing | `10-brain/voice/03-reference-writing.md` |
| 04_content_modes | `10-brain/voice/04-content-modes.md` |
| 05_edit_checklist | `10-brain/voice/05-edit-checklist.md` |

## Steps

1. Read the 5 core docs with `obsidian_get_note` (`format: content`) at the vault paths above.
2. If the task is writing/content/outreach → read the 5 voice docs too.
3. Confirm loaded with a single line: "Docs loaded." then proceed immediately to the task — no summary, no listing what was fetched.

## Important Rules

- Read from the Obsidian vault only — the Google Drive copies are pre-migration and stale. Never fetch these by Google Doc ID.
- Never summarize or describe the docs after loading — just confirm and move on.
- accomplishments.md MUST be loaded for any resume, cover letter, pitch, 1-pager, or content referencing work history.
- If Farhan says "load my f13i docs" and also describes a task in the same message, load the docs and immediately start the task — don't wait for a second message.
- All CTAs → cal.com/farhan-m | All email → me@f13i.com
