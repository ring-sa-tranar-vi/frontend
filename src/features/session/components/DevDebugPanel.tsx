import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { CoachSessionDebugEvent } from '../../ai-conversation'

function VolumeMeter({ getCurrentRms }: { getCurrentRms: () => number }) {
  const barRef = useRef<HTMLDivElement>(null)
  const valRef = useRef<HTMLSpanElement>(null)
  const rafRef = useRef<number>(0)
  const INTERRUPT_THRESHOLD = 0.25
  const METER_MAX = 0.5

  useEffect(() => {
    function tick() {
      const rms = getCurrentRms()
      if (barRef.current)
        barRef.current.style.width = `${Math.min(rms / METER_MAX, 1) * 100}%`
      if (valRef.current) valRef.current.textContent = rms.toFixed(3)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [getCurrentRms])

  const thresholdPct = (INTERRUPT_THRESHOLD / METER_MAX) * 100
  const { t } = useTranslation()

  return (
    <div className="mt-2">
      <div className="mb-0.5 flex justify-between font-sans text-[10px] text-white/60">
        <span>{t('sessionCall.micRms')}</span>
        <span ref={valRef}>0.000</span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded bg-white/10">
        <div
          ref={barRef}
          className="h-full rounded bg-emerald-400 transition-none"
          style={{ width: '0%' }}
        />
        <div
          className="absolute top-0 h-full w-px bg-red-400"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div className="mt-0.5 font-sans text-[9px] text-white/40">
        {t('sessionCall.interruptThreshold')} {INTERRUPT_THRESHOLD}
      </div>
    </div>
  )
}

export default function DevDebugPanel({
  show,
  debugEvents,
  getCurrentRms,
}: {
  show: boolean
  debugEvents: CoachSessionDebugEvent[]
  getCurrentRms?: () => number
}) {
  if (!show) return null
  if (!debugEvents || debugEvents.length === 0) return null

  return (
    <div className="absolute top-3 left-3 z-20 max-h-52 w-[calc(100%-1.5rem)] max-w-sm overflow-hidden rounded-lg bg-black/75 p-3 font-mono text-[11px] leading-4 text-white shadow-lg">
      <div className="mb-1 font-sans text-xs font-bold">Dev debug</div>

      {debugEvents.slice(0, 8).map((event) => (
        <div key={event.id} className="truncate">
          <span className="text-emerald-300">+{event.elapsedMs}ms</span>{' '}
          <span>{event.label}</span>
          {event.detail ? (
            <span className="text-white/70"> - {event.detail}</span>
          ) : null}
        </div>
      ))}

      {getCurrentRms ? <VolumeMeter getCurrentRms={getCurrentRms} /> : null}
    </div>
  )
}
