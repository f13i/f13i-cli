import { useEffect, useState } from 'react'
import type { ContentPiece, ContentPieceInput, Format, Stage } from '../../lib/types'
import { FORMATS, STAGES } from '../../lib/types'
import { useHotkey } from '../../hooks/useHotkey'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { AgentStatusSlot } from '../board/AgentStatusSlot'

interface Props {
  piece: ContentPiece
  onClose: () => void
  onUpdate: (id: string, patch: ContentPieceInput) => void
  onDelete: (id: string) => void
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-edge bg-surface-1 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-orange/50 focus:outline-none'

export function DetailDrawer({ piece, onClose, onUpdate, onDelete }: Props) {
  // Local mirror so typing is snappy; commit on blur / change.
  const [title, setTitle] = useState(piece.title)
  const [hook, setHook] = useState(piece.hook)
  const [notes, setNotes] = useState(piece.notes)
  const [url, setUrl] = useState(piece.inspiration_url)
  const [tagDraft, setTagDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-sync when a different card is opened, or realtime changes this one.
  useEffect(() => {
    setTitle(piece.title)
    setHook(piece.hook)
    setNotes(piece.notes)
    setUrl(piece.inspiration_url)
  }, [piece.id, piece.title, piece.hook, piece.notes, piece.inspiration_url])

  useHotkey('escape', () => {
    if (!confirmDelete) onClose()
  })

  const commit = (patch: ContentPieceInput) => onUpdate(piece.id, patch)

  function addTag() {
    const t = tagDraft.trim().replace(/^#/, '')
    if (!t || piece.topic_tags.includes(t)) {
      setTagDraft('')
      return
    }
    commit({ topic_tags: [...piece.topic_tags, t] })
    setTagDraft('')
  }

  function removeTag(tag: string) {
    commit({ topic_tags: piece.topic_tags.filter((x) => x !== tag) })
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative flex h-full w-full max-w-md flex-col border-l border-edge bg-surface-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-edge px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Content piece
          </span>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-500 hover:bg-surface-3 hover:text-neutral-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <Field label="Title">
            <input
              className={inputCls}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title !== piece.title && commit({ title })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stage">
              <select
                className={inputCls}
                value={piece.stage}
                onChange={(e) => commit({ stage: e.target.value as Stage })}
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Format">
              <select
                className={inputCls}
                value={piece.format}
                onChange={(e) => commit({ format: e.target.value as Format })}
              >
                {FORMATS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Hook">
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              onBlur={() => hook !== piece.hook && commit({ hook })}
              placeholder="One-line angle or opening"
            />
          </Field>

          <Field label="Notes">
            <textarea
              className={`${inputCls} resize-none font-mono text-[13px]`}
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== piece.notes && commit({ notes })}
              placeholder="Free-form working notes (markdown)"
            />
          </Field>

          <Field label="Topic tags">
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-edge bg-surface-1 p-2">
              {piece.topic_tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] text-neutral-300"
                >
                  #{t}
                  <button
                    onClick={() => removeTag(t)}
                    className="text-neutral-500 hover:text-red-400"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                onBlur={addTag}
                placeholder="add tag…"
                className="min-w-[80px] flex-1 bg-transparent text-[11px] text-neutral-200 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
          </Field>

          <Field label="Inspiration URL">
            <div className="flex items-center gap-2">
              <input
                className={inputCls}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() =>
                  url !== piece.inspiration_url &&
                  commit({ inspiration_url: url })
                }
                placeholder="https://…"
              />
              {piece.inspiration_url && (
                <a
                  href={piece.inspiration_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-md border border-edge px-2 py-1.5 text-xs text-orange-soft hover:bg-surface-3"
                >
                  Open
                </a>
              )}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Assigned">
              <input
                className={inputCls}
                defaultValue={piece.assigned_to}
                onBlur={(e) =>
                  e.target.value !== piece.assigned_to &&
                  commit({ assigned_to: e.target.value || 'unassigned' })
                }
              />
            </Field>
            <Field label="Issue #">
              <input
                type="number"
                className={inputCls}
                defaultValue={piece.issue_number ?? ''}
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null
                  if (v !== piece.issue_number) commit({ issue_number: v })
                }}
              />
            </Field>
            <Field label="Words">
              <input
                type="number"
                className={inputCls}
                defaultValue={piece.word_count ?? ''}
                onBlur={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null
                  if (v !== piece.word_count) commit({ word_count: v })
                }}
              />
            </Field>
          </div>

          {/* override toggle */}
          <button
            onClick={() => commit({ human_override: !piece.human_override })}
            className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-sm transition-colors ${
              piece.human_override
                ? 'border-red-500/50 bg-red-500/10 text-red-300'
                : 'border-edge bg-surface-1 text-neutral-300 hover:bg-surface-3'
            }`}
          >
            <span className="flex items-center gap-2">
              {piece.human_override && (
                <span className="h-2 w-2 rounded-full bg-red-500" />
              )}
              Human override
            </span>
            <span className="text-xs text-neutral-500">
              {piece.human_override ? 'flagged — on' : 'off'}
            </span>
          </button>

          {/* Phase 2 read-only agent status */}
          <div className="rounded-md border border-edge bg-surface-1 px-3 py-2.5">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Agent status
            </span>
            <AgentStatusSlot
              agentStatus={piece.agent_status}
              assignedTo={piece.assigned_to}
            />
          </div>

          <div className="flex justify-between pt-1 text-[11px] text-neutral-600">
            <span>Created {new Date(piece.created_at).toLocaleDateString()}</span>
            <span>Updated {new Date(piece.updated_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* footer */}
        <div className="border-t border-edge px-4 py-3">
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-sm text-red-400/80 hover:text-red-400"
          >
            Delete piece
          </button>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete this piece?"
          body={`"${piece.title}" will be removed permanently.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            setConfirmDelete(false)
            onDelete(piece.id)
            onClose()
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
