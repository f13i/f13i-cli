import type { ContentPiece, Format } from '../lib/types'
import { FORMATS } from '../lib/types'

export type View = 'board' | 'list' | 'archive'

export interface FilterState {
  format: Format | 'all'
  tag: string | 'all'
  assigned: string | 'all'
}

export const EMPTY_FILTERS: FilterState = {
  format: 'all',
  tag: 'all',
  assigned: 'all',
}

interface Props {
  view: View
  onView: (v: View) => void
  filters: FilterState
  onFilters: (f: FilterState) => void
  pieces: ContentPiece[]
  onQuickCapture: () => void
}

const VIEWS: { key: View; label: string }[] = [
  { key: 'board', label: 'Board' },
  { key: 'list', label: 'List' },
  { key: 'archive', label: 'Archive' },
]

const selectCls =
  'rounded-md border border-edge bg-surface-2 px-2 py-1.5 text-xs text-neutral-300 focus:border-orange/50 focus:outline-none'

export function Header({
  view,
  onView,
  filters,
  onFilters,
  pieces,
  onQuickCapture,
}: Props) {
  const tags = Array.from(new Set(pieces.flatMap((p) => p.topic_tags))).sort()
  const assignees = Array.from(
    new Set(pieces.map((p) => p.assigned_to)),
  ).sort()

  const set = (patch: Partial<FilterState>) =>
    onFilters({ ...filters, ...patch })

  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-ink/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-orange" />
          <h1 className="text-sm font-semibold tracking-tight text-neutral-100">
            The Deal Room
            <span className="ml-2 font-normal text-neutral-500">
              Content Pipeline
            </span>
          </h1>
        </div>

        {/* view toggle */}
        <div className="ml-2 flex rounded-md border border-edge bg-surface-1 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => onView(v.key)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                view === v.key
                  ? 'bg-surface-3 text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* filters (hidden on archive — it's its own filtered view) */}
        {view !== 'archive' && (
          <div className="flex items-center gap-2">
            <select
              className={selectCls}
              value={filters.format}
              onChange={(e) =>
                set({ format: e.target.value as Format | 'all' })
              }
            >
              <option value="all">All formats</option>
              {FORMATS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>

            <select
              className={selectCls}
              value={filters.tag}
              onChange={(e) => set({ tag: e.target.value })}
            >
              <option value="all">All tags</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>

            <select
              className={selectCls}
              value={filters.assigned}
              onChange={(e) => set({ assigned: e.target.value })}
            >
              <option value="all">Anyone</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={onQuickCapture}
          className="flex items-center gap-2 rounded-md bg-orange px-3 py-1.5 text-xs font-semibold text-ink hover:bg-orange-soft"
        >
          + Idea
          <kbd className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-medium">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  )
}

/** Shared filter predicate used by board + list. */
export function filterPieces(
  pieces: ContentPiece[],
  f: FilterState,
): ContentPiece[] {
  return pieces.filter((p) => {
    if (f.format !== 'all' && p.format !== f.format) return false
    if (f.tag !== 'all' && !p.topic_tags.includes(f.tag)) return false
    if (f.assigned !== 'all' && p.assigned_to !== f.assigned) return false
    return true
  })
}
