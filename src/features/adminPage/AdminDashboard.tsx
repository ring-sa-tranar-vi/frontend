import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchWorkouts } from '../../api/workouts'
import { fetchWorkoutFeedbackSummaryWithToken } from '../../api/feedbacks'

type FeedbackRow = {
  workoutId: number
  workoutName: string
  feedbackCount: number
  avgRating: number
  dislikeRate: number
  tooHardRate: number
  status: 'GOOD' | 'NEEDS_REVIEW' | 'BAD'
}

type Workout = {
  id: number
  name: string
  type?: string
  level?: number
  durationSeconds?: number
}

// ─── Sparkline (decorative) ────────────────────────────────────────────────
function Sparkline({ color, points }: { color: string; points: string }) {
  const filled = `0,40 ${points} 100,40`
  return (
    <svg
      viewBox="0 0 100 40"
      className="h-10 w-full"
      preserveAspectRatio="none"
    >
      <polygon points={filled} fill={color} opacity="0.15" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SPARKLINES = {
  purple: '0,30 10,26 20,28 30,24 40,20 50,22 60,17 70,14 80,10 90,7 100,3',
  green: '0,28 10,25 20,27 30,22 40,19 50,21 60,16 70,12 80,9 90,6 100,2',
  orange: '0,26 10,30 20,27 30,32 40,28 50,24 60,26 70,21 80,18 90,14 100,10',
  red: '0,35 10,32 20,34 30,36 40,38 50,38 60,38 70,39 80,40 90,40 100,40',
}

// ─── Polar/Arc helpers for Donut ───────────────────────────────────────────
function polarXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcD(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  const sweep = end - start
  if (sweep <= 0) return ''
  if (sweep >= 360) {
    const a = polarXY(cx, cy, r, 0)
    const b = polarXY(cx, cy, r, 180)
    return `M${a.x} ${a.y} A${r} ${r} 0 1 1 ${b.x} ${b.y} A${r} ${r} 0 1 1 ${a.x} ${a.y}`
  }
  const s = polarXY(cx, cy, r, start)
  const e = polarXY(cx, cy, r, end)
  const large = sweep > 180 ? 1 : 0
  return `M${s.x} ${s.y} A${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
}

// ─── Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({
  good,
  needsReview,
  bad,
  total,
  totalLabel,
}: {
  good: number
  needsReview: number
  bad: number
  total: number
  totalLabel: string
}) {
  const cx = 100,
    cy = 100,
    r = 72
  const t = total || 1
  const gDeg = (good / t) * 360
  const nDeg = (needsReview / t) * 360
  const bDeg = (bad / t) * 360

  return (
    <svg viewBox="0 0 200 200" className="h-44 w-44 shrink-0">
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="22"
      />
      {good > 0 && (
        <path
          d={arcD(cx, cy, r, 0, gDeg)}
          fill="none"
          stroke="#22c55e"
          strokeWidth="22"
          strokeLinecap="butt"
        />
      )}
      {needsReview > 0 && (
        <path
          d={arcD(cx, cy, r, gDeg, gDeg + nDeg)}
          fill="none"
          stroke="#f97316"
          strokeWidth="22"
          strokeLinecap="butt"
        />
      )}
      {bad > 0 && (
        <path
          d={arcD(cx, cy, r, gDeg + nDeg, gDeg + nDeg + bDeg)}
          fill="none"
          stroke="#ef4444"
          strokeWidth="22"
          strokeLinecap="butt"
        />
      )}
      {/* Center label */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fontSize="28"
        fontWeight="800"
        fill="#100b2f"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill="#6f6a93"
      >
        {totalLabel}
      </text>
    </svg>
  )
}

// ─── Type color / icon helpers ─────────────────────────────────────────────
function workoutTypeColor(type?: string) {
  switch ((type ?? '').toUpperCase()) {
    case 'STRENGTH':
      return 'bg-orange-100 text-orange-600'
    case 'CARDIO':
      return 'bg-blue-100 text-blue-600'
    case 'MOBILITY':
      return 'bg-green-100 text-green-600'
    case 'FLEXIBILITY':
      return 'bg-purple-100 text-purple-600'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

const typeEmoji: Record<string, string> = {
  STRENGTH: '🏋️',
  CARDIO: '🏃',
  MOBILITY: '🧘',
  FLEXIBILITY: '🤸',
}
// ─── Main Dashboard ─────────────────────────────────────────────────────────
type Props = {
  onOpenWorkouts?: () => void
  onOpenFeedbacks?: () => void
  searchTerm?: string
}

export default function AdminDashboard({
  onOpenWorkouts,
  onOpenFeedbacks,
  searchTerm = '',
}: Props) {
  const { getToken } = useAuth()
  const { t } = useTranslation()

  const { data: workouts = [] } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('No token')
      return fetchWorkouts(token)
    },
  })

  const { data: feedbackSummary = [] } = useQuery<FeedbackRow[]>({
    queryKey: ['admin-feedback-summary'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('No token')
      return fetchWorkoutFeedbackSummaryWithToken(token)
    },
  })

  // ── Summary totals ──────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const goodCount = feedbackSummary.filter((f) => f.status === 'GOOD').length
    const nrCount = feedbackSummary.filter(
      (f) => f.status === 'NEEDS_REVIEW',
    ).length
    const badCount = feedbackSummary.filter((f) => f.status === 'BAD').length
    const total = goodCount + nrCount + badCount
    return { goodCount, nrCount, badCount, total }
  }, [feedbackSummary])

  // ── Recent feedbacks (top by feedbackCount) ────────────────────────────
  const recentFeedbacks = useMemo(() => {
    return [...feedbackSummary]
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, 4)
  }, [feedbackSummary])

  const totalDuration = useMemo(
    () =>
      workouts.reduce(
        (sum, workout) => sum + (workout.durationSeconds ?? 0),
        0,
      ),
    [workouts],
  )

  const averageDuration = workouts.length
    ? Math.round(totalDuration / workouts.length)
    : 0

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredRecentFeedbacks = useMemo(() => {
    if (!normalizedSearch) return recentFeedbacks

    return recentFeedbacks.filter((fb) => {
      return (
        fb.workoutName.toLowerCase().includes(normalizedSearch) ||
        fb.status.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [normalizedSearch, recentFeedbacks])

  const pct = (n: number) =>
    totals.total > 0 ? Math.round((n / totals.total) * 100) : 0

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {/* Total Workouts */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-start gap-3 p-3.5 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5836d6]/15">
              <svg
                className="h-5 w-5 text-[#5836d6]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-[#5836d6] uppercase">
                {t('admin.totalWorkouts')}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold text-[#100b2f]">
                {workouts.length}
              </p>
              <p className="text-xs text-[#6f6a93]">
                {t('admin.allWorkoutsInApp')}
              </p>
            </div>
          </div>
          <Sparkline color="#5836d6" points={SPARKLINES.purple} />
        </div>

        {/* Good Feedback */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-start gap-3 p-3.5 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-5 w-5 text-green-600"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase">
                {t('admin.goodFeedback')}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold text-[#100b2f]">
                {totals.goodCount}
              </p>
              <p className="text-xs text-[#6f6a93]">
                {t('admin.percentOfTotal', { percent: pct(totals.goodCount) })}
              </p>
            </div>
          </div>
          <Sparkline color="#22c55e" points={SPARKLINES.green} />
        </div>

        {/* Needs Review */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-start gap-3 p-3.5 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100">
              <svg
                className="h-5 w-5 text-orange-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-orange-500 uppercase">
                {t('admin.needsReview')}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold text-[#100b2f]">
                {totals.nrCount}
              </p>
              <p className="text-xs text-[#6f6a93]">
                {t('admin.percentOfTotal', { percent: pct(totals.nrCount) })}
              </p>
            </div>
          </div>
          <Sparkline color="#f97316" points={SPARKLINES.orange} />
        </div>

        {/* Bad Feedback */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-start gap-3 p-3.5 pb-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-5 w-5 text-red-500"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M23 3v12c0 1.1-.9 2-2 2h-9c-.83 0-1.54-.5-1.84-1.22L7.14 8.73C7.05 8.5 7 8.26 7 8V6h-.17L3 2.86A1.99 1.99 0 0 0 1 5v2c0 .47.17.93.46 1.28L1 21h4V9h8.31l-.95-4.57-.03-.32c0-.41.17-.79.44-1.06L14.17 2l5 1zm-2 0h-6l2 7h4V3z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-widest text-red-500 uppercase">
                {t('admin.badFeedback')}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold text-[#100b2f]">
                {totals.badCount}
              </p>
              <p className="text-xs text-[#6f6a93]">
                {t('admin.percentOfTotal', { percent: pct(totals.badCount) })}
              </p>
            </div>
          </div>
          <Sparkline color="#ef4444" points={SPARKLINES.red} />
        </div>
      </div>

      {/* ── Middle row: Donut + Recent Feedbacks ──────────────────────── */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Donut Chart */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm">
          <p className="text-sm font-bold tracking-widest text-[#5836d6] uppercase">
            {t('admin.feedbackSummary')}{' '}
            <span className="font-normal text-[#6f6a93]">
              {t('admin.last30Days')}
            </span>
          </p>
          <div className="mt-3 flex items-center gap-5">
            <DonutChart
              good={totals.goodCount}
              needsReview={totals.nrCount}
              bad={totals.badCount}
              total={totals.total}
              totalLabel={t('admin.totalLabel')}
            />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-green-500" />
                <div>
                  <p className="text-xs font-semibold text-[#100b2f]">
                    {t('admin.feedbackStatus.goodShort')}
                  </p>
                  <p className="text-xs text-[#6f6a93]">
                    {totals.goodCount} ({pct(totals.goodCount)}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-orange-500" />
                <div>
                  <p className="text-xs font-semibold text-[#100b2f]">
                    {t('admin.feedbackStatus.needsReviewShort')}
                  </p>
                  <p className="text-xs text-[#6f6a93]">
                    {totals.nrCount} ({pct(totals.nrCount)}%)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-red-500" />
                <div>
                  <p className="text-xs font-semibold text-[#100b2f]">
                    {t('admin.feedbackStatus.badShort')}
                  </p>
                  <p className="text-xs text-[#6f6a93]">
                    {totals.badCount} ({pct(totals.badCount)}%)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Feedbacks */}
        <div className="rounded-2xl bg-white p-3.5 shadow-sm">
          <p className="text-sm font-bold tracking-widest text-[#5836d6] uppercase">
            {t('admin.recentFeedbacks')}
          </p>
          <div className="mt-2 space-y-2">
            {filteredRecentFeedbacks.length === 0 && (
              <p className="text-sm text-[#6f6a93]">
                {t('admin.noFeedbackYet')}
              </p>
            )}
            {filteredRecentFeedbacks.map((fb) => {
              const workout = workouts.find((w) => w.id === fb.workoutId)
              const type = workout?.type ?? 'STRENGTH'
              const emoji = typeEmoji[type.toUpperCase()] ?? '🏋️'
              const statusMsg =
                fb.status === 'GOOD'
                  ? t('admin.feedbackMessages.good')
                  : fb.status === 'NEEDS_REVIEW'
                    ? t('admin.feedbackMessages.needsReview')
                    : t('admin.feedbackMessages.bad')
              return (
                <div key={fb.workoutId} className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${workoutTypeColor(type)}`}
                  >
                    {emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#100b2f]">
                      {fb.workoutName}
                    </p>
                    <p className="truncate text-xs text-[#6f6a93]">
                      {statusMsg}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[#6f6a93]">
                    {t('admin.sessionsCount', { count: fb.feedbackCount })}
                  </span>
                </div>
              )
            })}
          </div>
          {feedbackSummary.length > 4 && (
            <button
              type="button"
              onClick={onOpenFeedbacks}
              className="mt-2 flex w-full items-center justify-between text-left text-xs font-semibold text-[#5836d6] hover:underline"
            >
              {t('admin.viewAllFeedbacks')}
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Workouts Overview ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold tracking-widest text-[#5836d6] uppercase">
              {t('admin.workoutsOverview')}
            </p>
            <p className="mt-1 text-xs text-[#6f6a93]">
              {t('admin.workoutsOverviewDescription')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenWorkouts}
            className="rounded-xl bg-[#5836d6] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4b2cc2]"
          >
            {t('admin.openWorkouts')}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#ece5ff] bg-[#f8f5ff] p-4">
            <p className="text-xs font-semibold tracking-widest text-[#6f6a93] uppercase">
              {t('admin.totalWorkoutsSmall')}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#100b2f]">
              {workouts.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#ece5ff] bg-[#f8f5ff] p-4">
            <p className="text-xs font-semibold tracking-widest text-[#6f6a93] uppercase">
              {t('admin.withFeedback')}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#100b2f]">
              {feedbackSummary.length}
            </p>
          </div>

          <div className="rounded-2xl border border-[#ece5ff] bg-[#f8f5ff] p-4">
            <p className="text-xs font-semibold tracking-widest text-[#6f6a93] uppercase">
              {t('admin.avgDuration')}
            </p>
            <p className="mt-2 text-3xl font-extrabold text-[#100b2f]">
              {averageDuration > 0
                ? t('admin.durationSeconds', { seconds: averageDuration })
                : '—'}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-3 text-xs text-[#6f6a93]">
          {t('admin.workoutsTip')}
        </div>
      </div>
    </div>
  )
}
