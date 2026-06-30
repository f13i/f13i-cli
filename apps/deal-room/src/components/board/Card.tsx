import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { ContentPiece } from '../../lib/types'
import { FormatBadge } from '../ui/Badge'
import { AgentStatusSlot } from './AgentStatusSlot'
import { ageLabel, ageTier, AGE_TIER_CLASS } from '../../lib/age'

interface Props {
  piece: ContentPiece
  onOpen: (piece: ContentPiece) => void
  /** rendered inside DragOverlay — disables the draggable wiring */
  overlay?: boolean
}

export function Card({ piece, onOpen, overlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: piece.id, disabled: overlay })

  const tier = ageTier(piece.stage_since)
  const overridden = piece.human_override

  const style = overlay
    ? undefined
    : { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => !overlay && onOpen(piece)}
      className={[
        'group cursor-grab select-none rounded-md border bg-surface-2 p-2.5 text-left',
        'transition-colors hover:border-neutral-600 active:cursor-grabbing',
        overridden
          ? 'border-l-2 border-l-red-500 border-y-edge border-r-edge'
          : 'border-edge',
        isDragging ? 'opacity-30' : '',
        overlay ? 'rotate-1 shadow-2xl shadow-black/50 ring-1 ring-orange/40' : '',
      ].join(' ')}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <FormatBadge format={piece.format} />
        <div className="flex items-center gap-1.5">
          {piece.issue_number != null && (
            <span className="text-[10px] font-medium text-neutral-500">
              #{piece.issue_number}
            </span>
          )}
          {overridden && (
            <span
              className="h-2 w-2 rounded-full bg-red-500"
              title="Needs your attention"
            />
          )}
        </div>
      </div>

      <h4 className="text-sm font-medium leading-snug text-neutral-100">
        {piece.title}
      </h4>

      {piece.topic_tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {piece.topic_tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-neutral-500">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-neutral-500">
          {piece.assigned_to === 'unassigned' ? '—' : piece.assigned_to}
        </span>
        <span className={`text-[11px] font-medium ${AGE_TIER_CLASS[tier]}`}>
          {ageLabel(piece.stage_since)}
        </span>
      </div>

      {/* Phase 2 slot — always present */}
      <div className="mt-1.5 border-t border-edge/60 pt-1.5">
        <AgentStatusSlot
          agentStatus={piece.agent_status}
          assignedTo={piece.assigned_to}
        />
      </div>
    </div>
  )
}
