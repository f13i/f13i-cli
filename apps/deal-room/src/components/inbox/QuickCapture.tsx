import { useState } from 'react'
import { useHotkey } from '../../hooks/useHotkey'

interface Props {
  onCreate: (title: string) => void
  onClose: () => void
}

// Cmd+K scratchpad — drop an idea into the Ideas stage without navigating away.
export function QuickCapture({ onCreate, onClose }: Props) {
  const [title, setTitle] = useState('')
  useHotkey('escape', onClose)

  function submit() {
    const t = title.trim()
    if (!t) return
    onCreate(t)
    setTitle('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[18vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-edge bg-surface-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-orange" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Capture idea
          </span>
        </div>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="What's the idea?"
          className="w-full bg-transparent px-4 py-4 text-lg text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
        />
        <div className="flex items-center justify-between border-t border-edge px-4 py-2 text-[11px] text-neutral-600">
          <span>Drops straight into Ideas / Inspiration</span>
          <span>
            <kbd className="rounded bg-surface-3 px-1.5 py-0.5">Enter</kbd> to
            add · <kbd className="rounded bg-surface-3 px-1.5 py-0.5">Esc</kbd>{' '}
            to close
          </span>
        </div>
      </div>
    </div>
  )
}
