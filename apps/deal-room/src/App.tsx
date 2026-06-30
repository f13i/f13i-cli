import { useMemo, useState } from 'react'
import type { ContentPiece, Stage } from './lib/types'
import {
  useContentPieces,
  useCreatePiece,
  useDeletePiece,
  useUpdatePiece,
  useUpdateStage,
} from './hooks/useContentPieces'
import { useHotkey } from './hooks/useHotkey'
import {
  EMPTY_FILTERS,
  Header,
  filterPieces,
  type FilterState,
  type View,
} from './components/Header'
import { Board } from './components/board/Board'
import { ListView } from './components/list/ListView'
import { Archive } from './components/archive/Archive'
import { DetailDrawer } from './components/drawer/DetailDrawer'
import { QuickCapture } from './components/inbox/QuickCapture'

export default function App() {
  return <Dashboard />
}

function Dashboard() {
  const { data: pieces = [], isLoading, isError, error } = useContentPieces()

  const createPiece = useCreatePiece()
  const updatePiece = useUpdatePiece()
  const updateStage = useUpdateStage()
  const deletePiece = useDeletePiece()

  const [view, setView] = useState<View>('board')
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)

  useHotkey('mod+k', () => setCaptureOpen(true))

  const filtered = useMemo(
    () => filterPieces(pieces, filters),
    [pieces, filters],
  )

  // derive the live piece so the drawer reflects realtime/optimistic updates
  const selected = selectedId
    ? pieces.find((p) => p.id === selectedId) ?? null
    : null

  const handleQuickAdd = (title: string) =>
    createPiece.mutate({ title, stage: 'idea' })

  const handleMoveStage = (id: string, stage: Stage) =>
    updateStage.mutate({ id, stage })

  const open = (p: ContentPiece) => setSelectedId(p.id)

  return (
    <div className="min-h-screen bg-ink">
      <Header
        view={view}
        onView={setView}
        filters={filters}
        onFilters={setFilters}
        pieces={pieces}
        onQuickCapture={() => setCaptureOpen(true)}
      />

      <main className="px-5 py-5">
        {isLoading && (
          <p className="py-16 text-center text-sm text-neutral-600">
            Loading pipeline…
          </p>
        )}

        {isError && (
          <div className="mx-auto max-w-lg rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
            Couldn't load content pieces.
            <pre className="mt-2 whitespace-pre-wrap text-xs text-red-400/80">
              {(error as Error)?.message}
            </pre>
            <p className="mt-2 text-xs text-red-400/70">
              Is the backend running? Start it with <code>npm run dev</code>;
              check the vault path in the terminal output.
            </p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {view === 'board' && (
              <Board
                pieces={filtered}
                onOpen={open}
                onMoveStage={handleMoveStage}
                onQuickAdd={handleQuickAdd}
              />
            )}
            {view === 'list' && <ListView pieces={filtered} onOpen={open} />}
            {view === 'archive' && <Archive pieces={pieces} onOpen={open} />}
          </>
        )}
      </main>

      {selected && (
        <DetailDrawer
          piece={selected}
          onClose={() => setSelectedId(null)}
          onUpdate={(id, patch) => updatePiece.mutate({ id, patch })}
          onDelete={(id) => deletePiece.mutate(id)}
        />
      )}

      {captureOpen && (
        <QuickCapture
          onCreate={handleQuickAdd}
          onClose={() => setCaptureOpen(false)}
        />
      )}
    </div>
  )
}
