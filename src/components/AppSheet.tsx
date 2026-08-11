import { X } from 'lucide-react'
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

export const appSheetFieldClass =
  'rounded-2xl border border-(--menu-control-border) bg-(--menu-field-bg)'

export const appSheetFormLabelClass =
  'mb-1.5 block text-[length:var(--text-sm)] font-semibold text-(--brand-ink-soft)'

export const appSheetFormFieldClass = `${appSheetFieldClass} min-h-11 w-full rounded-xl px-3 py-2 text-[length:var(--text-base)] font-semibold text-(--brand-ink) outline-none focus:border-(--brand-border-strong) focus:ring-2 focus:ring-(--brand-selection)`

export const appSheetFormTextareaClass = `${appSheetFieldClass} w-full resize-none rounded-xl px-3 py-2.5 text-[length:var(--text-base)] leading-relaxed font-medium text-(--brand-ink) outline-none focus:border-(--brand-border-strong) focus:ring-2 focus:ring-(--brand-selection)`

export const appSheetCategoryClass = 'menu-category-card'

export const appSheetContentClass = 'menu-content-card'

export const appSheetCardClass = 'menu-item-card'

export const appSheetPrimaryButtonClass =
  'w-full rounded-full bg-(--brand-primary) px-4 py-4 text-[length:var(--text-base)] font-extrabold text-(--brand-on-primary) transition hover:bg-(--brand-primary-strong) active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70'

export const appSheetInlineActionButtonClass =
  'inline-flex h-10 w-20 shrink-0 items-center justify-center rounded-full bg-(--brand-primary) px-3 text-[length:var(--text-sm)] font-extrabold text-(--brand-on-primary) transition hover:opacity-95'

export const appSheetSecondaryButtonClass =
  'w-full rounded-2xl border border-(--brand-btn-secondary-border) bg-(--brand-btn-secondary-bg) px-4 py-3.5 text-[length:var(--text-sm)] font-extrabold text-(--brand-btn-secondary-text) transition hover:bg-(--brand-btn-secondary-hover) active:scale-[0.985]'

type AppSheetProps = {
  open: boolean
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  onBack?: () => void
  backLabel?: string
  height?: 'compact' | 'default' | 'large'
  fillHeight?: boolean
  motion?: 'slide' | 'instant'
}

const maxHeightClass = {
  compact: 'max-h-[58%]',
  default: 'max-h-[76%]',
  large: 'max-h-[92%]',
}

const fixedHeightClass = {
  compact: 'h-[58%]',
  default: 'h-[76%]',
  large: 'h-[92%]',
}

export function AppSheet({
  open,
  title,
  subtitle,
  icon,
  children,
  footer,
  onClose,
  onBack,
  backLabel,
  height = 'default',
  fillHeight = false,
  motion = 'slide',
}: AppSheetProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const touchStartY = useRef<number | null>(null)
  const mouseStartY = useRef<number | null>(null)
  // Drag position stored in a ref – no re-render needed during drag.
  const dragY = useRef(0)
  // Guards against animating the close on initial mount (open=false from birth).
  // Without this, every AppSheet instance would slide down on first render.
  const hasEverBeenOpen = useRef(false)
  // Only pointer-events use React state; opacity/blur are driven via DOM refs
  // so transitions are always in sync with the sheet position.
  const [backdropVisible, setBackdropVisible] = useState(false)
  const titleId = useId()
  const subtitleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

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
      () => closeButtonRef.current?.focus({ preventScroll: true }),
      0,
    )
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements =
        sectionRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
      const focusable = focusableElements
        ? Array.from(focusableElements).filter(
            (element) => element.offsetParent !== null,
          )
        : []

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
    }
  }, [open])

  function applyBackdrop(fraction: number, animated: boolean) {
    const bd = backdropRef.current
    if (!bd) return
    const clamped = Math.max(0, Math.min(1, fraction))
    bd.style.transition = animated
      ? 'opacity 300ms ease-out, backdrop-filter 300ms ease-out'
      : 'none'
    bd.style.opacity = String(1 - clamped)
    bd.style.backdropFilter = `blur(${3 * (1 - clamped)}px)`
  }

  useLayoutEffect(() => {
    const el = sectionRef.current
    if (!el) return

    if (open) {
      hasEverBeenOpen.current = true
      setBackdropVisible(true)
      if (motion === 'instant') {
        el.style.transition = 'none'
        el.style.transform = 'translateY(0)'
        applyBackdrop(0, false)
        return
      }
      // Snap to bottom (no transition) so the browser commits that position,
      // then animate up.  getBoundingClientRect() forces a synchronous style-
      // flush so the browser treats translateY(100%) as the CSS "from" state.
      el.style.transition = 'none'
      el.style.transform = 'translateY(100%)'
      applyBackdrop(1, false)
      el.getBoundingClientRect()
      el.style.transition = 'transform 300ms ease-out'
      el.style.transform = 'translateY(0)'
      applyBackdrop(0, true)
      // No cleanup returned: a cleanup that resets the transform would fire
      // before the close effect and prevent the slide-down animation.
      // StrictMode double-invoke: second run overwrites the first before any
      // browser paint, so the net result is still one correct animation.
    } else {
      if (motion === 'instant') {
        dragY.current = 0
        el.style.transition = 'none'
        el.style.transform = 'translateY(100%)'
        applyBackdrop(1, false)
        setBackdropVisible(false)
        return
      }
      if (!hasEverBeenOpen.current) {
        // Initial mount in closed state – just snap off-screen, no animation.
        el.style.transition = 'none'
        el.style.transform = 'translateY(100%)'
        applyBackdrop(1, false)
        return
      }
      // Slide-down close.  Enable transition first, then force a style-flush
      // so the browser commits the current position as the from-state before
      // we change the transform.
      el.style.transition = 'transform 300ms ease-out'
      el.getBoundingClientRect()
      el.style.transform = 'translateY(100%)'
      applyBackdrop(1, true)

      const tid = setTimeout(() => {
        setBackdropVisible(false)
        dragY.current = 0
        el.style.transition = 'none'
      }, 350)
      return () => clearTimeout(tid)
    }
  }, [motion, open])

  function handleWheel(event: React.WheelEvent<HTMLElement>) {
    const scrollBody = scrollBodyRef.current

    if (!scrollBody || event.deltaY === 0) {
      return
    }

    if (event.target instanceof Element) {
      const isInsideScrollBody = event.target.closest(
        '[data-app-sheet-scroll="true"]',
      )

      if (isInsideScrollBody) {
        return
      }
    }

    const canScrollDown =
      event.deltaY > 0 &&
      scrollBody.scrollTop + scrollBody.clientHeight < scrollBody.scrollHeight
    const canScrollUp = event.deltaY < 0 && scrollBody.scrollTop > 0

    if (!canScrollDown && !canScrollUp) {
      return
    }

    event.preventDefault()
    scrollBody.scrollBy({ top: event.deltaY, behavior: 'auto' })
  }

  function onTouchStart(e: React.TouchEvent) {
    if (!open) return
    // Restrict drag to the handle / header area – the scroll body has touch-pan-y
    // so the browser claims vertical gestures there and preventDefault won't work.
    if (scrollBodyRef.current?.contains(e.target as Node)) return
    touchStartY.current = e.touches[0].clientY
  }

  function onMouseDown(e: React.MouseEvent) {
    if (!open) return
    if (scrollBodyRef.current?.contains(e.target as Node)) return
    mouseStartY.current = e.clientY
  }

  useEffect(() => {
    const el = sectionRef.current
    if (!el || !open) return

    function handleTouchMove(e: TouchEvent) {
      if (touchStartY.current == null) return
      const delta = e.touches[0].clientY - touchStartY.current

      if (delta <= 0) return

      // Downward – only intercept when scroll body is at top.
      const scrollBody = scrollBodyRef.current
      if (scrollBody && scrollBody.scrollTop > 0) return

      e.preventDefault()
      if (!el) return
      el.style.transition = 'none'

      // The sheet only follows a downward close gesture. Upward movement is
      // reserved for scrolling the content and must never lift the dialog.
      const newY = Math.max(0, delta)
      dragY.current = newY
      el.style.transform = `translateY(${newY}px)`

      // Backdrop opacity/blur follow how far down the sheet has been dragged.
      const sheetHeight = el.offsetHeight || 1
      applyBackdrop(Math.max(0, newY / sheetHeight), false)
    }

    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', handleTouchMove)
  }, [open])

  useEffect(() => {
    if (!open) return

    function handleMouseMove(e: MouseEvent) {
      if (mouseStartY.current == null) return
      const delta = e.clientY - mouseStartY.current
      if (delta <= 0) return
      const el = sectionRef.current
      if (!el) return
      el.style.transition = 'none'
      const newY = Math.max(0, delta)
      dragY.current = newY
      el.style.transform = `translateY(${newY}px)`
      const sheetHeight = el.offsetHeight || 1
      applyBackdrop(Math.max(0, newY / sheetHeight), false)
    }

    function handleMouseUp() {
      if (mouseStartY.current == null) return
      const dragged = dragY.current
      mouseStartY.current = null
      dragY.current = 0
      const el = sectionRef.current
      if (!el) return
      el.style.transition = 'transform 300ms ease-out'
      if (dragged > 120) {
        onCloseRef.current()
      } else {
        el.style.transform = 'translateY(0)'
        applyBackdrop(0, true)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [open])

  function onTouchEnd() {
    if (touchStartY.current == null) return
    const dragged = dragY.current
    touchStartY.current = null
    dragY.current = 0

    const el = sectionRef.current
    if (!el) return

    // Re-enable transition before animating.
    el.style.transition = 'transform 300ms ease-out'

    if (dragged > 120) {
      // The close effect will animate translateY(100%) from wherever the sheet
      // currently is (the drag release point).
      onCloseRef.current()
    } else {
      // Snap back to fully open.
      el.style.transform = 'translateY(0)'
      applyBackdrop(0, true)
    }
  }

  return (
    <>
      <div
        ref={backdropRef}
        onClick={onClose}
        className={[
          'absolute inset-0 z-40 bg-(--brand-backdrop) opacity-0',
          backdropVisible ? '' : 'pointer-events-none',
        ].join(' ')}
      />

      <section
        ref={sectionRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        aria-hidden={!open}
        inert={!open}
        onWheel={handleWheel}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        className={[
          'absolute inset-x-0 bottom-0 z-50 flex w-full flex-col',
          'app-sheet-surface overflow-hidden rounded-t-4xl',
          'will-change-transform',
          fillHeight ? fixedHeightClass[height] : maxHeightClass[height],
          open ? '' : 'pointer-events-none',
          !open && !backdropVisible ? 'invisible' : '',
        ].join(' ')}
        // No transform style prop – position is controlled entirely via
        // el.style.transform so CSS transitions always have a reliable from-state.
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 cursor-grab rounded-full bg-(--brand-handle) select-none active:cursor-grabbing" />

        <div className="flex min-h-0 flex-1 flex-col px-5 pt-4 pb-[max(1.25rem,var(--stage-safe-bottom))]">
          <header className="flex shrink-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-(--brand-primary)">
                {icon ? (
                  <div
                    className={`flex shrink-0 items-center justify-center rounded-2xl bg-(--brand-soft) ${
                      onBack ? 'h-11 w-11' : 'h-9 w-9'
                    }`}
                  >
                    {onBack ? (
                      <button
                        type="button"
                        onClick={onBack}
                        aria-label={backLabel}
                        className="flex h-full w-full items-center justify-center rounded-2xl transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                      >
                        {icon}
                      </button>
                    ) : (
                      icon
                    )}
                  </div>
                ) : null}

                <h2
                  id={titleId}
                  className="text-[length:var(--text-2xl)] leading-none font-extrabold tracking-tight text-(--brand-title-ink)"
                >
                  {title}
                </h2>
              </div>

              {subtitle ? (
                <p
                  id={subtitleId}
                  className="mt-1.5 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-muted)"
                >
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--brand-soft) text-(--brand-primary) transition focus-visible:ring-2 focus-visible:ring-(--brand-border-strong) focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
              aria-label="Stäng"
            >
              <X size={21} strokeWidth={2.4} />
            </button>
          </header>

          <div
            ref={scrollBodyRef}
            data-app-sheet-scroll="true"
            className="app-sheet-scroll mt-4 min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pr-1 pb-1"
          >
            {children}
          </div>

          {footer ? (
            <div className="app-sheet-footer shrink-0 pt-3">{footer}</div>
          ) : null}
        </div>
      </section>
    </>
  )
}

export function AppSheetCard({ children }: { children: ReactNode }) {
  return <div className={appSheetCardClass}>{children}</div>
}

export function AppSheetSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[length:var(--text-xl)] leading-tight font-extrabold text-(--brand-title-ink)">
      {children}
    </h3>
  )
}

export function AppSheetSectionText({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1.5 text-[length:var(--text-sm)] leading-relaxed font-semibold text-(--brand-body-ink)">
      {children}
    </p>
  )
}

export function AppSheetNotice({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'danger'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-(--brand-success-border) bg-(--brand-success-surface) text-(--brand-success-ink)'
      : tone === 'danger'
        ? 'border-(--brand-danger-border) bg-(--brand-danger-surface) text-(--brand-danger-ink)'
        : 'border-(--brand-border-field) bg-(--brand-soft) text-(--brand-title-ink)'

  return (
    <div
      role="status"
      className={`rounded-2xl border px-4 py-3 text-center text-[length:var(--text-sm)] font-bold ${toneClass}`}
    >
      {children}
    </div>
  )
}

export function AppSheetLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[length:var(--text-xs)] font-extrabold tracking-wide text-(--brand-muted) uppercase">
      {children}
    </p>
  )
}

export function AppSheetValue({ children }: { children: ReactNode }) {
  return (
    <p className="mt-1 text-[length:var(--text-base)] leading-snug font-extrabold text-(--brand-ink)">
      {children}
    </p>
  )
}
