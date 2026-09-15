---
name: deal-filer
description: File the artifacts a work session produced into the right client deal folder and update the deal index — so every deal stays self-contained instead of leaving models, memos, and transcripts loose in the Cowork/outputs folder. ALWAYS use this skill when Farhan says "file this to the deal", "save these to [company]'s folder", "put this in the deal file", "log this to the deal", "update the deal index", or at session close when a deliverable was produced for a named client (proposal, pricing model, one-pager, transcript). Also trigger when files exist only in the outputs folder and need to land in the deal's folder under `30-deals/`. Folder-per-deal, frontmatter kept in sync with the body, and a row in the pipeline index.
---

# Deal Filer

Nearly every work session ends with the same loose end: a proposal or a pricing model got built, and it's sitting in the Cowork/outputs folder instead of living with its deal. The open item "copy the files into `30-deals/<company>/`" has trailed session after session. This skill closes that loop — it files the artifacts and updates the index so the deal stays self-contained and the pipeline stays accurate.

Why it matters beyond tidiness: `deal-status-sync` and the morning snapshot read the deal index and its frontmatter to compute what's Hot/Warm/Cold/Dark and what the next move is. An artifact that never gets filed, or a body update whose frontmatter wasn't touched, means the pipeline is running on stale state.

## Steps

**1. Identify the deal.** List the folders under `30-deals/` (obsidian tools) and match the company. Respect existing capitalization exactly — the vault already has one deviation (`Paywell`), so match what's there rather than normalizing. If there's genuine ambiguity about which deal, ask; don't guess a folder.

**2. If it's a new deal, create the folder properly.** New deal = `30-deals/<company>/index.md` (folder-per-deal — never a loose `30-deals/<company>.md`), with full frontmatter (`type`, `status`, `stage`, `created`, `updated`, `company`, `contacts`) and a new row in the Active Pipeline table in `00-index/index.md`. A frontmatter-less or index-less deal is invisible to deal-status-sync.

**3. File the artifacts.**
- *Markdown artifacts* (memos, notes, transcripts) → write into the deal folder as sibling files via `obsidian_write_note` (e.g. `30-deals/<company>/2026-07-07-pricing-memo.md`).
- *Binary artifacts* (`.xlsx`, `.pdf`, `.pptx`) can't be written through the obsidian note tools — those handle text. Deliver the binary to Farhan with `SendUserFile` and, if the vault folder is reachable as a connected device folder, write it into `30-deals/<company>/` via the device-bridge file tools. If it isn't reachable, reference the file by name in the index update and tell Farhan the one move: "drop `<file>` into `30-deals/<company>/`." Be honest about which happened — don't claim a binary landed in the vault if it didn't.

**4. Update the index and sync the frontmatter — in the same edit.** Append a dated entry to `30-deals/<company>/index.md`:
```
## Update — YYYY-MM-DD
- What was produced: <artifact(s)>
- Decisions: <key calls made this session>
- Status: <current stage / status>
- Next: <specific next move + date>
```
Then update the frontmatter `status`, `stage`, and `updated` to match that entry. Body and frontmatter must never disagree — deal-status-sync reads the frontmatter, so a body-only update silently strands it (this is a logged lesson).

**5. Confirm.** One line: "Filed N artifact(s) to `30-deals/<company>/`, index + frontmatter updated (status: <X>)." If a binary still needs Farhan to move it, say so in the same line.

## Hard rules

- Folder-per-deal, always. No loose top-level deal files; no frontmatter-less deal files.
- Append or patch the index — never overwrite it. History stays.
- Frontmatter and the latest body update must agree, updated in one edit.
- Match existing folder capitalization; don't normalize a name that's already in use.
- Don't invent status — pull it from what actually happened this session. If the session didn't change the stage, leave the stage and just bump `updated`.

---

## Preflight — resolve tool signatures at runtime

**Do not trust the tool names or parameter names written above.** They drift, and
a stale signature fails silently — the skill keeps running and produces confident
output with a source quietly missing.

Before the first Obsidian call, run `tool_search` for each ("obsidian get note", "obsidian patch") and use the
names and parameters it returns. Names in this file are correct as of 2026-09-15;
parameter schemas are deliberately not documented here, because hardcoding them is
what broke `call-prep` and `outbound-sync` for months before anyone noticed.

**Failure behaviour:** if a source fails, name it in the output. A write that reports success but did not execute loses the artifact — confirm the file exists on disk before reporting it filed. A partial
result that says which leg died beats a clean-looking one that dropped a source.
