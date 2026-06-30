// Core domain types. Mirror supabase/schema.sql exactly.

export type Stage = 'idea' | 'draft' | 'qa' | 'ready' | 'published'

export type Format =
  | 'article'
  | 'quick_take'
  | 'deep_dive'
  | 'case_study'
  | 'roundup'

/** Where a piece physically lives — its system of record. */
export type Source = 'vault' | 'beehiiv' | 'backlog'

export interface ContentPiece {
  id: string
  title: string
  stage: Stage
  format: Format
  topic_tags: string[]
  hook: string
  notes: string
  inspiration_url: string
  /** 'farhan' | 'unassigned' | an agent name (free-form for Phase 2) */
  assigned_to: string
  /** null in Phase 1; agents write "writing" / "waiting for review" in Phase 2 */
  agent_status: string | null
  human_override: boolean
  word_count: number | null
  issue_number: number | null
  beehiiv_post_id: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  /** when the piece last entered its current stage — drives the age indicator */
  stage_since: string
  /** system of record: vault note, Beehiiv post, or read-only backlog bullet */
  source: Source
  /** true for Beehiiv + backlog cards — not draggable, not editable here */
  locked: boolean
}

export const SOURCE_META: Record<Source, { label: string; tint: string }> = {
  vault: { label: 'Vault', tint: 'bg-surface-3 text-neutral-400 ring-edge' },
  beehiiv: {
    label: 'Beehiiv',
    tint: 'bg-orange/15 text-orange-soft ring-orange/30',
  },
  backlog: {
    label: 'Backlog',
    tint: 'bg-neutral-500/10 text-neutral-500 ring-neutral-600/40',
  },
}

/** Stages a vault note can be dragged/set to. Ready + Published are owned by
 *  Beehiiv (publishing stays in Beehiiv), so vault cards stop at QA. */
export const VAULT_STAGES: Stage[] = ['idea', 'draft', 'qa']

/** Fields the operator can create/edit. Server owns ids and timestamps. */
export type ContentPieceInput = Partial<
  Omit<
    ContentPiece,
    'id' | 'created_at' | 'updated_at' | 'stage_since' | 'published_at'
  >
>

// --- Ordered metadata for the five pipeline stages --------------------------

export const STAGES: { key: Stage; label: string }[] = [
  { key: 'idea', label: 'Ideas / Inspiration' },
  { key: 'draft', label: 'Draft in Progress' },
  { key: 'qa', label: 'QA / Review' },
  { key: 'ready', label: 'Ready to Publish' },
  { key: 'published', label: 'Published / Live' },
]

export const STAGE_ORDER: Stage[] = STAGES.map((s) => s.key)

export const STAGE_LABEL: Record<Stage, string> = Object.fromEntries(
  STAGES.map((s) => [s.key, s.label]),
) as Record<Stage, string>

// --- Format badges ----------------------------------------------------------

export const FORMATS: { key: Format; label: string; tint: string }[] = [
  { key: 'article', label: 'Article', tint: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
  { key: 'quick_take', label: 'Quick Take', tint: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' },
  { key: 'deep_dive', label: 'Deep Dive', tint: 'bg-violet-500/15 text-violet-300 ring-violet-500/30' },
  { key: 'case_study', label: 'Case Study', tint: 'bg-amber-500/15 text-amber-300 ring-amber-500/30' },
  { key: 'roundup', label: 'Roundup', tint: 'bg-pink-500/15 text-pink-300 ring-pink-500/30' },
]

export const FORMAT_META: Record<Format, { label: string; tint: string }> =
  Object.fromEntries(
    FORMATS.map((f) => [f.key, { label: f.label, tint: f.tint }]),
  ) as Record<Format, { label: string; tint: string }>
