import type { Format } from '../../lib/types'
import { FORMAT_META } from '../../lib/types'

export function FormatBadge({ format }: { format: Format }) {
  const meta = FORMAT_META[format]
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${meta.tint}`}
    >
      {meta.label}
    </span>
  )
}

export function TagChip({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center rounded bg-surface-3 px-1.5 py-0.5 text-[10px] text-neutral-400">
      #{tag}
    </span>
  )
}
