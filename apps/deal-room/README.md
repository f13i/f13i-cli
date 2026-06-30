# The Deal Room — Content Pipeline Dashboard

A kanban-style dashboard for managing _The Deal Room_ newsletter content from idea
to published. Phase 1 is a manual tracker; the data model and UI are built so the
Phase 2 agent observation layer drops in additively (see [Phase 2](#phase-2-whats-already-scaffolded)).

- **Stack:** Vite + React + TypeScript, Tailwind, `@dnd-kit`, Supabase (Postgres +
  Realtime), TanStack Query.
- **Runs:** local-only on `http://localhost:5180`, no auth.

## Setup

```bash
cd apps/deal-room
npm install
```

1. **Create a Supabase project** (free tier) at
   [supabase.com/dashboard](https://supabase.com/dashboard).
2. **Run the schema.** Open the project's **SQL Editor → New query**, paste the
   contents of [`supabase/schema.sql`](supabase/schema.sql), and **Run**. This
   creates the tables, the `updated_at`/`stage_since` trigger, a permissive RLS
   policy, enables Realtime, and inserts ~8 seed pieces.
3. **Add your keys.** From **Project Settings → API**, copy the project URL and the
   `anon` public key:
   ```bash
   cp .env.example .env
   # edit .env:
   # VITE_SUPABASE_URL=https://<ref>.supabase.co
   # VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```
4. **Run it.**
   ```bash
   npm run dev
   ```
   Opens `http://localhost:5180`. (If `.env` is missing you'll get a setup checklist
   instead of a crash.)

## Using it

- **Board** — five columns (Ideas → Draft → QA → Ready → Published). Drag a card to
  change stage. Dragging **Draft → QA** asks for a one-click confirm. Cards flagged
  `human override` get a red border and float to the top of their column.
- **Quick capture** — press **⌘K** (or **+ Idea**) anywhere to drop an idea into the
  Ideas column instantly.
- **Age** — each card shows time-in-stage; it turns **yellow after 7 days**, **orange
  after 14** to surface stuck content.
- **Detail drawer** — click any card to edit title, hook, notes, tags, format, stage,
  assignment, issue #, word count, and the override flag, or delete it.
- **List** — sortable table across all stages. **Archive** — read-only published log.
- **Filters** — by format, tag, and assignee (top right).

Changes persist to Supabase and propagate live via Realtime (open a second tab to see
it). All reads/writes go through [`src/lib/api.ts`](src/lib/api.ts) — the single seam.

## Phase 2 — what's already scaffolded

The build deliberately reserves space for the agent observation layer so it's
_additive, not a rewrite_ (PRD §8):

- **`agent_status` + `assigned_to`** columns exist; agents write to them via the
  Supabase API from external processes. Every card renders an **agent status slot**
  (the pulsing indicator) — empty in Phase 1, live in Phase 2.
- **`human_override`** is the agent hand-raise mechanism — already wired to float a
  card to the top with a red border.
- **`agent_events`** table is an append-only activity log, ready for the per-card
  event stream and the global "Agent Activity" panel.
- **Realtime** is on, so external agent writes already surface with no polling.

### Phase 2 hardening (not done yet)

- RLS is a permissive `anon` policy for local single-operator use. **Before deploying
  anywhere**, replace it with authenticated policies and route agent writes through a
  service role.

## Data model

See [`supabase/schema.sql`](supabase/schema.sql) — `content_pieces` (the atomic unit)
and `agent_events` (Phase 2 log). Enums (`stage`, `format`) are enforced with CHECK
constraints; `assigned_to` is free-form text so agent names slot in without a
migration.
