import type { ContentPiece } from '../../lib/types'
import { FormatBadge } from '../ui/Badge'

interface Props {
  pieces: ContentPiece[]
  onOpen: (piece: ContentPiece) => void
}

// Read-only view of everything published (PRD §6.5).
export function Archive({ pieces, onOpen }: Props) {
  const published = pieces
    .filter((p) => p.stage === 'published')
    .sort((a, b) => {
      const at = a.published_at ? new Date(a.published_at).getTime() : 0
      const bt = b.published_at ? new Date(b.published_at).getTime() : 0
      return bt - at
    })

  if (published.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-neutral-600">
        Nothing published yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {published.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpen(p)}
          className="flex w-full items-center gap-4 rounded-lg border border-edge bg-surface-1 px-4 py-3 text-left hover:border-neutral-600"
        >
          <span className="w-16 shrink-0 text-sm font-semibold text-orange">
            {p.issue_number != null ? `#${p.issue_number}` : '—'}
          </span>
          <span className="flex-1 truncate text-sm text-neutral-100">
            {p.title}
          </span>
          <FormatBadge format={p.format} />
          <span className="w-24 shrink-0 text-right text-xs text-neutral-500">
            {p.published_at
              ? new Date(p.published_at).toLocaleDateString()
              : '—'}
          </span>
        </button>
      ))}
    </div>
  )
}
