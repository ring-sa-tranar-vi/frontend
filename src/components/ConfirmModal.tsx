import { AlertTriangle } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

type Props = {
  open: boolean
  title: string
  body?: string
  confirmLabel: string
  cancelLabel: string
  error?: string | null
  isConfirming?: boolean
  confirmingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Shared confirmation pattern for irreversible actions. */
export default function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  error = null,
  isConfirming = false,
  confirmingLabel,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    if (!open) {
      const previouslyFocused = previouslyFocusedElementRef.current
      if (previouslyFocused) {
        requestAnimationFrame(() =>
          previouslyFocused.focus({ preventScroll: true }),
        )
        previouslyFocusedElementRef.current = null
      }
      return
    }

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const focusTimer = window.setTimeout(
      () => cancelButtonRef.current?.focus({ preventScroll: true }),
      0,
    )
    const temporarilyInertElements: HTMLElement[] = []
    let currentElement: HTMLElement | null = overlayRef.current

    while (currentElement?.parentElement) {
      const parentElement: HTMLElement = currentElement.parentElement

      if (parentElement === document.body) break

      for (const sibling of Array.from(parentElement.children)) {
        if (
          sibling !== currentElement &&
          sibling instanceof HTMLElement &&
          !sibling.inert
        ) {
          sibling.inert = true
          temporarilyInertElements.push(sibling)
        }
      }

      currentElement = parentElement
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConfirming) {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])',
        ) ?? [],
      )

      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      temporarilyInertElements.forEach((element) => {
        element.inert = false
      })
    }
  }, [isConfirming, onCancel, open])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-end bg-(--brand-backdrop) px-4 pt-12 pb-[max(1rem,var(--stage-safe-bottom))] sm:items-center sm:justify-center sm:p-6"
      onMouseDown={() => {
        if (!isConfirming) onCancel()
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={body ? bodyId : undefined}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[2rem] border border-(--brand-border) bg-(--menu-content-bg) p-5 shadow-[0_18px_48px_rgb(24_18_58_/_0.24)] sm:p-6"
      >
        <div className="mx-auto mb-5 h-1 w-9 rounded-full bg-(--brand-handle) sm:hidden" />
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--brand-danger-surface) text-(--brand-danger)">
            <AlertTriangle size={22} strokeWidth={2.4} aria-hidden="true" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2
              id={titleId}
              className="text-[length:var(--text-xl)] leading-tight font-extrabold tracking-tight text-(--brand-title-ink)"
            >
              {title}
            </h2>
            {body ? (
              <p
                id={bodyId}
                className="mt-1.5 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-muted)"
              >
                {body}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-(--brand-danger-border) bg-(--brand-danger-surface) px-4 py-3 text-[length:var(--text-sm)] font-bold text-(--brand-danger-ink)"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 space-y-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isConfirming}
            onClick={onCancel}
            className="w-full rounded-2xl border border-(--brand-btn-secondary-border) bg-(--brand-btn-secondary-bg) px-4 py-3.5 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition hover:bg-(--brand-btn-secondary-hover) active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={onConfirm}
            className="w-full rounded-full bg-(--brand-danger) px-4 py-4 text-[length:var(--text-base)] font-extrabold text-(--brand-on-danger) transition hover:bg-(--brand-danger-hover) active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isConfirming ? (confirmingLabel ?? confirmLabel) : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
