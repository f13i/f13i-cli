import { useState } from 'react'
import type { ContentPiece } from '../../lib/types'
import { FORMAT_META, STAGE_LABEL } from '../../lib/types'
import { ageLabel, ageTier, AGE_TIER_CLASS } from '../../lib/age'

interface Props {
  pieces: ContentPiece[]
  onOpen: (piece: ContentPiece) => void
}

type SortKey = 'title' | 'stage' | 'format' | 'assigned_to' | 'age' | 'updated_at'
type Dir = 'asc' | 'desc'

const COLS: { key: SortKey; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'stage', label: 'Stage' },
  { key: 'format', label: 'Format' },
  { key: 'assigned_to', label: 'Assigned' },
  { key: 'age', label: 'Age in stage' },
  { key: 'updated_at', label: 'Updated' },
]

export function ListView({ pieces, onOpen }: Props) {
  const [sort, setSort] = useState<SortKey>('updated_at')
  const [dir, setDir] = useState<Dir>('desc')

  function toggleSort(key: SortKey) {
    if (key === sort) setDir(dir === 'asc' ? 'desc' : 'asc')
    else {
      setSort(key)
      setDir('asc')
    }
  }

  const sorted = [...pieces].sort((a, b) => {
    let av: string | number
    let bv: string | number
    if (sort === 'age') {
      av = new Date(a.stage_since).getTime()
      bv = new Date(b.stage_since).getTime()
    } else if (sort === 'updated_at') {
      av = new Date(a.updated_at).getTime()
      bv = new Date(b.updated_at).getTime()
    } else {
      av = a[sort].toString().toLowerCase()
      bv = b[sort].toString().toLowerCase()
    }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="overflow-x-auto rounded-lg border border-edge">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-edge bg-surface-1 text-left">
            {COLS.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-300"
              >
                {c.label}
                {sort === c.key && (
                  <span className="ml-1 text-orange">
                    {dir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const tier = ageTier(p.stage_since)
            return (
              <tr
                key={p.id}
                onClick={() => onOpen(p)}
                className="cursor-pointer border-b border-edge/60 hover:bg-surface-1"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {p.human_override && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                    )}
                    <span className="text-neutral-100">{p.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-neutral-400">
                  {STAGE_LABEL[p.stage]}
                </td>
                <td className="px-3 py-2 text-neutral-400">
                  {FORMAT_META[p.format].label}
                </td>
                <td className="px-3 py-2 text-neutral-400">
                  {p.assigned_to === 'unassigned' ? '—' : p.assigned_to}
                </td>
                <td className={`px-3 py-2 font-medium ${AGE_TIER_CLASS[tier]}`}>
                  {ageLabel(p.stage_since)}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {new Date(p.updated_at).toLocaleDateString()}
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLS.length} className="px-3 py-8 text-center text-neutral-600">
                No pieces match the current filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
