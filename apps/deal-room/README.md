# The Deal Room — Content Pipeline Dashboard

A kanban dashboard for _The Deal Room_ newsletter that reads your **actual sources
of truth** — Obsidian for ideas/drafts, Beehiiv for what's scheduled and live. No
separate database, no double-entry. Phase 1 is a manual tracker; the data model and
UI are built so the Phase 2 agent observation layer drops in additively.

- **Stack:** Vite + React + TypeScript, Tailwind, `@dnd-kit`, TanStack Query, plus a
  small local Node/Express backend that reads the vault + Beehiiv.
- **Runs:** local-only on `http://localhost:5180`, one process, no auth.

## How it maps your sources

| Column | Source of truth | Writable from the board? |
| --- | --- | --- |
| **Ideas** | New idea notes you capture (⌘K) + read-only bullets from your idea backlog | ✅ new notes / drag |
| **Draft** | Vault notes in `50-content/articles/` with `status: draft` | ✅ drag + edit |
| **QA / Review** | Vault notes with `status: final` (or `stage: qa`) | ✅ drag + edit |
| **Ready to Publish** | Beehiiv **scheduled** posts | read-only (publish in Beehiiv) |
| **Published / Live** | Beehiiv **published** posts | read-only |

Dragging a card between **Ideas / Draft / QA** rewrites only the `stage:` field in
the note's frontmatter — your body and other frontmatter keys are never touched.
**Ready** and **Published** come from Beehiiv; publishing stays in Beehiiv (the board
reflects it, doesn't drive it). Vault notes that are already `status: published` are
hidden so they don't double-show with their Beehiiv issue.

## Setup

```bash
cd apps/deal-room
npm install
npm run dev          # starts the vault+Beehiiv backend AND the UI on :5180
```

That's it — it runs with **no config**, using the default f13i-brain vault path and a
cached Beehiiv snapshot. Optional `.env` (see `.env.example`):

- `OBSIDIAN_VAULT_PATH` / `DEAL_ROOM_CONTENT_DIRS` — point at a different vault/folders.
- `BEEHIIV_API_KEY` — switch Beehiiv from the cached snapshot to **live** reads. Without
  it, the Ready/Published columns come from `server/cache/beehiiv-posts.json` (refresh
  that via the Beehiiv MCP / `list_posts` when issues change).

## Using it

- **Board** — drag a card across Ideas → Draft → QA; **Draft → QA** asks for a one-click
  confirm. Override-flagged cards get a red border and float to the top of their column.
- **⌘K quick capture** — drop an idea; it's written as a new note in your vault.
- **Age** — time-in-stage turns **yellow after 7 days**, **orange after 14**.
- **Detail drawer** — click a vault card to edit title, hook, notes, tags, format, stage,
  assignment, issue #, and the override flag (writes back to frontmatter), or delete the
  note. Beehiiv + backlog cards open read-only.
- **List / Archive** — sortable table; read-only published log.
- Board polls every 15s, so edits made directly in your vault or in Beehiiv show up
  without a manual refresh.

## Architecture

```
React UI ──fetch /api──► Express backend (server/) ──► Obsidian vault (fs, frontmatter)
                                                   └──► Beehiiv (live API or cache)
```

- All UI data access goes through one seam: [`src/lib/api.ts`](src/lib/api.ts).
- All vault/Beehiiv access lives in [`server/`](server/): `vault.mjs` (read notes, patch
  frontmatter — body-safe), `beehiiv.mjs` (live or cached), `map.mjs` (→ unified
  `ContentPiece`), `api.mjs` (REST routes).

## Phase 2 — what's already scaffolded

- Every card renders an **agent status slot** (the pulse indicator) — empty in Phase 1.
  When agents run, they write `agent_status` and it animates live.
- **`human_override`** is the agent hand-raise mechanism — already floats a card to the
  top with a red border.
- Adding agents means writing to the same notes / fields the board already reads —
  additive, not a rewrite.

## Out of scope (v1)

No auth/multi-user, no rich-text editor, no automated publishing to Beehiiv (read-only
by design), no analytics, desktop-only.
