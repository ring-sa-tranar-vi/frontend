import { useState } from 'react'

type Props = {
  open: boolean
  title?: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  requireTyping?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title = 'Confirm',
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  requireTyping = null,
  onConfirm,
  onCancel,
}: Props) {
  const [typed, setTyped] = useState('')

  if (!open) return null

  const canConfirm = requireTyping
    ? typed.trim().toUpperCase() === requireTyping
    : true

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-(--brand-border) bg-(--brand-page) p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        {body && <p className="mb-4 text-sm text-(--brand-muted)">{body}</p>}

        {requireTyping && (
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={`Type ${requireTyping} to confirm`}
            className="mb-4 w-full rounded-lg border border-(--brand-border) bg-white p-3 text-sm focus:ring-2 focus:ring-(--brand-primary) focus:outline-none"
          />
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-(--brand-border) bg-(--brand-surface-glass) px-4 py-2 text-sm font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
              canConfirm ? 'bg-red-600' : 'bg-red-300'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
