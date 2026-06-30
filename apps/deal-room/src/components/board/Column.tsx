import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { ContentPiece, Stage } from '../../lib/types'
import { STAGE_LABEL } from '../../lib/types'
import { Card } from './Card'

interface Props {
  stage: Stage
  pieces: ContentPiece[]
  onOpen: (piece: ContentPiece) => void
  /** only the Ideas column gets an inline quick-add */
  onQuickAdd?: (title: string) => void
}

export function Column({ stage, pieces, onOpen, onQuickAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const [draft, setDraft] = useState('')

  // human_override cards float to the top of the column (PRD §7)
  const ordered = [...pieces].sort((a, b) => {
    if (a.human_override !== b.human_override) return a.human_override ? -1 : 1
    return new Date(b.stage_since).getTime() - new Date(a.stage_since).getTime()
  })

  function submitQuickAdd() {
    const t = draft.trim()
    if (!t || !onQuickAdd) return
    onQuickAdd(t)
    setDraft('')
  }

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          {STAGE_LABEL[stage]}
        </h3>
        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500">
          {pieces.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'flex min-h-[60vh] flex-1 flex-col gap-2 rounded-lg border p-2 transition-colors',
          isOver
            ? 'border-orange/50 bg-orange/5'
            : 'border-edge/60 bg-surface-1',
        ].join(' ')}
      >
        {onQuickAdd && (
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitQuickAdd()}
            onBlur={submitQuickAdd}
            placeholder="+ Quick idea…"
            className="rounded-md border border-edge bg-surface-2 px-2.5 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-orange/50 focus:outline-none"
          />
        )}

        {ordered.map((piece) => (
          <Card key={piece.id} piece={piece} onOpen={onOpen} />
        ))}

        {ordered.length === 0 && !onQuickAdd && (
          <p className="px-1 py-6 text-center text-xs text-neutral-700">
            Nothing here
          </p>
        )}
      </div>
    </div>
  )
}
