import { X } from 'lucide-react'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

export const appSheetFieldClass =
  'rounded-2xl border border-(--brand-border-field) bg-(--brand-field-bg)'

export const appSheetCardClass =
  'rounded-2xl border border-(--brand-border-light) bg-(--brand-card-bg) p-4'

export const appSheetPrimaryButtonClass =
  'w-full rounded-full bg-(--brand-primary) px-4 py-4 text-[length:var(--text-base)] font-extrabold text-white shadow-[0_2px_12px_rgba(80,64,200,0.28)] transition hover:bg-(--brand-primary-strong) active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70'

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
}: AppSheetProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
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
  }, [open])

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

      if (delta > 0) {
        // Downward – only intercept when scroll body is at top.
        const scrollBody = scrollBodyRef.current
        if (scrollBody && scrollBody.scrollTop > 0) return
      }

      e.preventDefault()
      if (!el) return
      el.style.transition = 'none'

      // Upward drag is dampened (⅓, max 60 px); downward is uncapped.
      const newY = delta > 0 ? delta : Math.max(delta / 3, -60)
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
      const el = sectionRef.current
      if (!el) return
      el.style.transition = 'none'
      const newY = delta > 0 ? delta : Math.max(delta / 3, -60)
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
        onClose()
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
  }, [open, onClose])

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
      onClose()
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
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 cursor-grab rounded-full bg-black/20 select-none active:cursor-grabbing" />

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

                <h2 className="text-[length:var(--text-2xl)] leading-none font-extrabold tracking-tight text-(--brand-title-ink)">
                  {title}
                </h2>
              </div>

              {subtitle ? (
                <p className="mt-1.5 text-[length:var(--text-sm)] leading-snug font-semibold text-(--brand-muted)">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <button
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
      ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
      : tone === 'danger'
        ? 'border-rose-300 bg-rose-50 text-rose-950'
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
