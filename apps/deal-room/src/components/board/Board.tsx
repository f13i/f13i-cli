import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { ContentPiece, Stage } from '../../lib/types'
import { STAGE_LABEL, STAGE_ORDER, VAULT_STAGES } from '../../lib/types'
import { Column } from './Column'
import { Card } from './Card'
import { ConfirmDialog } from '../ui/ConfirmDialog'

interface Props {
  pieces: ContentPiece[]
  onOpen: (piece: ContentPiece) => void
  onMoveStage: (id: string, stage: Stage) => void
  onQuickAdd: (title: string) => void
}

export function Board({ pieces, onOpen, onMoveStage, onQuickAdd }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{
    id: string
    to: Stage
  } | null>(null)

  // small activation distance so a click still opens the drawer
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const byStage = useMemo(() => {
    const map: Record<Stage, ContentPiece[]> = {
      idea: [],
      draft: [],
      qa: [],
      ready: [],
      published: [],
    }
    for (const p of pieces) map[p.stage].push(p)
    return map
  }, [pieces])

  const activePiece = activeId
    ? pieces.find((p) => p.id === activeId) ?? null
    : null

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const id = String(active.id)
    const to = String(over.id) as Stage
    const piece = pieces.find((p) => p.id === id)
    if (!piece || piece.stage === to) return

    // Ready + Published are owned by Beehiiv — publishing happens there, not by
    // dragging a vault note. Ignore drops into those columns.
    if (!VAULT_STAGES.includes(to)) return

    // PRD §7: Draft -> QA gets a single confirm to reduce accidental moves
    if (piece.stage === 'draft' && to === 'qa') {
      setPendingMove({ id, to })
      return
    }
    onMoveStage(id, to)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGE_ORDER.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              pieces={byStage[stage]}
              onOpen={onOpen}
              onQuickAdd={stage === 'idea' ? onQuickAdd : undefined}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activePiece ? (
            <div className="w-72">
              <Card piece={activePiece} onOpen={onOpen} overlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <ConfirmDialog
          title="Mark as ready for QA?"
          body={`This moves the piece into ${STAGE_LABEL.qa}.`}
          confirmLabel="Move to QA"
          onConfirm={() => {
            onMoveStage(pendingMove.id, pendingMove.to)
            setPendingMove(null)
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}
    </>
  )
}
