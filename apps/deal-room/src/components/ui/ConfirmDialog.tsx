import { useHotkey } from '../../hooks/useHotkey'

interface Props {
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useHotkey('escape', onCancel)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-edge bg-surface-2 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
        {body && <p className="mt-1.5 text-sm text-neutral-400">{body}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="rounded-md px-3 py-1.5 text-sm text-neutral-300 hover:bg-surface-3"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${
              danger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-orange hover:bg-orange-soft'
            }`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
