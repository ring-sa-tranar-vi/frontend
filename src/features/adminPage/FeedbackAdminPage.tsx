import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchRecentAdminFeedbacksWithToken,
  fetchWorkoutFeedbackSummaryWithToken,
} from '../../api/feedbacks'

type FeedbackSummaryRow = {
  workoutId: number
  workoutName: string
  feedbackCount: number
  avgRating: number
  dislikeRate: number
  tooHardRate: number
  status: 'GOOD' | 'NEEDS_REVIEW' | 'BAD'
}

type RecentFeedbackRow = {
  id: number
  userId: number
  workoutId: number
  workoutName: string
  activityLogId: number | null
  difficulty: string | null
  liked: boolean | null
  rating: number | null
  comment: string | null
  createdAt: string | null
}

const barWidth = (value: number) => `${Math.max(0, Math.min(100, value))}%`

const PAGE_SIZE = 6

function SkeletonRow() {
  return (
    <div className="animate-pulse space-y-3 rounded-2xl border border-[#ece5ff] bg-white p-4">
      <div className="h-4 w-1/4 rounded-full bg-[#ede9ff]" />
      <div className="h-3 w-1/3 rounded-full bg-[#f3eeff]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-2 rounded-full bg-[#ede9ff]" />
        <div className="h-2 rounded-full bg-[#ede9ff]" />
        <div className="h-2 rounded-full bg-[#ede9ff]" />
      </div>
    </div>
  )
}

export default function FeedbackAdminPage() {
  const { getToken } = useAuth()
  const { t, i18n } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<
    '' | 'GOOD' | 'NEEDS_REVIEW' | 'BAD'
  >('')
  const [sortBy, setSortBy] = useState<
    'status' | 'rating' | 'feedback' | 'name'
  >('status')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<number[]>([])

  const {
    data: summary = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-feedback-summary'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return fetchWorkoutFeedbackSummaryWithToken(token)
    },
  })

  const { data: recentFeedbacks = [], isLoading: isRecentLoading } = useQuery({
    queryKey: ['admin-recent-feedbacks'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return fetchRecentAdminFeedbacksWithToken(token)
    },
  })

  const rows = summary as FeedbackSummaryRow[]
  const totalFeedbacks = rows.reduce((sum, row) => sum + row.feedbackCount, 0)
  const recentRows = recentFeedbacks as RecentFeedbackRow[]

  const feedbackByWorkout = useMemo(() => {
    const grouped = new Map<number, RecentFeedbackRow[]>()

    for (const feedback of recentRows) {
      const list = grouped.get(feedback.workoutId) ?? []
      list.push(feedback)
      grouped.set(feedback.workoutId, list)
    }

    return grouped
  }, [recentRows])

  const filtered = useMemo(() => {
    let result = [...rows]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter((row) =>
        row.workoutName.toLowerCase().includes(term),
      )
    }
    if (filterStatus) {
      result = result.filter((row) => row.status === filterStatus)
    }
    if (sortBy === 'status') {
      const statusRank: Record<FeedbackSummaryRow['status'], number> = {
        BAD: 0,
        NEEDS_REVIEW: 1,
        GOOD: 2,
      }
      result.sort(
        (a, b) =>
          statusRank[a.status] - statusRank[b.status] ||
          b.feedbackCount - a.feedbackCount,
      )
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.avgRating - a.avgRating)
    } else if (sortBy === 'feedback') {
      result.sort((a, b) => b.feedbackCount - a.feedbackCount)
    } else {
      result.sort((a, b) => a.workoutName.localeCompare(b.workoutName))
    }
    return result
  }, [rows, searchTerm, filterStatus, sortBy])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filtered.length)
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const goodCount = rows.filter((r) => r.status === 'GOOD').length
  const reviewCount = rows.filter((r) => r.status === 'NEEDS_REVIEW').length
  const badCount = rows.filter((r) => r.status === 'BAD').length

  const statusConfig: Record<
    FeedbackSummaryRow['status'],
    { label: string; icon: string; color: string; bgColor: string }
  > = {
    GOOD: {
      label: t('admin.feedbackStatus.good'),
      icon: '✓',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
    },
    NEEDS_REVIEW: {
      label: t('admin.feedbackStatus.needsReview'),
      icon: '!',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 border-amber-200',
    },
    BAD: {
      label: t('admin.feedbackStatus.bad'),
      icon: '✕',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
    },
  }

  if (isError) {
    return <p className="text-sm text-red-500">{(error as Error).message}</p>
  }

  const toggleWorkoutComments = (workoutId: number) => {
    setExpandedWorkoutIds((current) =>
      current.includes(workoutId)
        ? current.filter((id) => id !== workoutId)
        : [...current, workoutId],
    )
  }

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#100b2f]">
            {t('feedbackAdmin.title')}
          </h2>
          <p className="mt-0.5 text-sm text-[#6f6a93]">
            {t('feedbackAdmin.subtitle')}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ece5ff] bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
            {t('feedbackAdmin.goodWorkouts')}
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">
            {goodCount}
          </p>
          <p className="mt-1 text-xs text-[#9b96b8]">
            {totalFeedbacks > 0
              ? t('feedbackAdmin.percent', {
                  percent: ((goodCount / rows.length) * 100).toFixed(0),
                })
              : t('feedbackAdmin.percentZero')}
          </p>
        </div>
        <div className="rounded-2xl border border-[#ece5ff] bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
            {t('feedbackAdmin.needsReview')}
          </p>
          <p className="mt-2 text-3xl font-bold text-amber-600">
            {reviewCount}
          </p>
          <p className="mt-1 text-xs text-[#9b96b8]">
            {totalFeedbacks > 0
              ? t('feedbackAdmin.percent', {
                  percent: ((reviewCount / rows.length) * 100).toFixed(0),
                })
              : t('feedbackAdmin.percentZero')}
          </p>
        </div>
        <div className="rounded-2xl border border-[#ece5ff] bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
            {t('feedbackAdmin.badWorkouts')}
          </p>
          <p className="mt-2 text-3xl font-bold text-red-600">{badCount}</p>
          <p className="mt-1 text-xs text-[#9b96b8]">
            {totalFeedbacks > 0
              ? t('feedbackAdmin.percent', {
                  percent: ((badCount / rows.length) * 100).toFixed(0),
                })
              : t('feedbackAdmin.percentZero')}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#ece5ff] bg-white px-4 py-3 shadow-sm">
        <div className="relative min-w-40 flex-1">
          <svg
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#b0a8d0]"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder={t('feedbackAdmin.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full rounded-lg border border-[#ece5ff] bg-[#faf8ff] py-2 pr-3 pl-8 text-sm text-[#100b2f] transition outline-none placeholder:text-[#c0bada] focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(
              e.target.value as '' | 'GOOD' | 'NEEDS_REVIEW' | 'BAD',
            )
            setCurrentPage(1)
          }}
          className={`rounded-lg border py-2 pr-6 pl-3 text-xs font-semibold transition outline-none ${filterStatus ? 'border-[#5836d6] bg-[#f0ebff] text-[#5836d6]' : 'border-[#ece5ff] bg-white text-[#6f6a93] hover:border-[#c4b8f5]'}`}
        >
          <option value="">{t('feedbackAdmin.allStatus')}</option>
          <option value="GOOD">{t('feedbackAdmin.good')}</option>
          <option value="NEEDS_REVIEW">
            {t('feedbackAdmin.needsReviewSingle')}
          </option>
          <option value="BAD">{t('feedbackAdmin.bad')}</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(
              e.target.value as 'status' | 'rating' | 'feedback' | 'name',
            )
            setCurrentPage(1)
          }}
          className="rounded-lg border border-[#ece5ff] bg-white py-2 pr-6 pl-3 text-xs font-semibold text-[#6f6a93] transition outline-none hover:border-[#c4b8f5]"
        >
          <option value="status">{t('feedbackAdmin.issueSeverity')}</option>
          <option value="rating">{t('feedbackAdmin.highestRating')}</option>
          <option value="feedback">{t('feedbackAdmin.mostFeedback')}</option>
          <option value="name">{t('feedbackAdmin.alphaSort')}</option>
        </select>

        {(searchTerm || filterStatus) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setFilterStatus('')
              setCurrentPage(1)
            }}
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100"
          >
            {t('feedbackAdmin.clear')}
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[#ece5ff] bg-white py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0ebff] text-2xl">
            🔍
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-[#100b2f]">
              {t('feedbackAdmin.noWorkoutsFound')}
            </p>
            <p className="mt-0.5 text-xs text-[#9b96b8]">
              {t('feedbackAdmin.tryAdjustSearch')}
            </p>
          </div>
          {(searchTerm || filterStatus) && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setFilterStatus('')
                setCurrentPage(1)
              }}
              className="rounded-lg bg-[#f0ebff] px-3 py-1.5 text-xs font-semibold text-[#5836d6] hover:bg-[#ede9ff]"
            >
              {t('feedbackAdmin.clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((row) => {
              const cfg = statusConfig[row.status]
              return (
                <article
                  key={row.workoutId}
                  className="rounded-2xl border border-[#ece5ff] bg-white p-5 shadow-sm transition hover:border-[#ddd5f8]"
                >
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-[#100b2f]">
                        {row.workoutName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#9b96b8]">
                        {t('feedbackAdmin.workoutSummary', {
                          workoutId: row.workoutId,
                          count: row.feedbackCount,
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.bgColor} px-3 py-1.5 text-xs font-semibold ${cfg.color}`}
                      >
                        <span>{cfg.icon}</span> {cfg.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleWorkoutComments(row.workoutId)}
                        className="rounded-full border border-[#ece5ff] bg-[#faf8ff] px-3 py-1.5 text-xs font-semibold text-[#5836d6] transition hover:bg-[#f0ebff]"
                      >
                        {expandedWorkoutIds.includes(row.workoutId)
                          ? t('feedbackAdmin.hideComments')
                          : t('feedbackAdmin.showComments', {
                              count:
                                feedbackByWorkout
                                  .get(row.workoutId)
                                  ?.filter((item) => item.comment?.trim())
                                  .length ?? 0,
                            })}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                          {t('feedbackAdmin.rating')}
                        </span>
                        <span className="text-xs font-bold text-[#100b2f]">
                          {row.avgRating.toFixed(1)} ⭐
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#ede9ff]">
                        <div
                          className="h-full bg-[#5836d6] transition-all"
                          style={{ width: barWidth((row.avgRating / 5) * 100) }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                          {t('feedbackAdmin.dislike')}
                        </span>
                        <span className="text-xs font-bold text-[#100b2f]">
                          {row.dislikeRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-red-100">
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: barWidth(row.dislikeRate) }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                          {t('feedbackAdmin.tooHard')}
                        </span>
                        <span className="text-xs font-bold text-[#100b2f]">
                          {row.tooHardRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-amber-100">
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{ width: barWidth(row.tooHardRate) }}
                        />
                      </div>
                    </div>
                  </div>

                  {expandedWorkoutIds.includes(row.workoutId) && (
                    <div className="mt-4 border-t border-[#f0ebff] pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold tracking-wider text-[#b0a8d0] uppercase">
                          {t('feedbackAdmin.recentComments')}
                        </p>
                        <p className="text-xs text-[#9b96b8]">
                          {t('feedbackAdmin.newestFirst')}
                        </p>
                      </div>

                      {isRecentLoading ? (
                        <p className="mt-3 text-sm text-[#6f6a93]">
                          {t('feedbackAdmin.loadingComments')}
                        </p>
                      ) : (
                        (() => {
                          const comments = (
                            feedbackByWorkout.get(row.workoutId) ?? []
                          ).filter(
                            (item) =>
                              item.comment && item.comment.trim().length > 0,
                          )

                          if (comments.length === 0) {
                            return (
                              <p className="mt-3 rounded-xl bg-[#faf8ff] px-3 py-3 text-sm text-[#9b96b8]">
                                {t('feedbackAdmin.noWrittenComments')}
                              </p>
                            )
                          }

                          return (
                            <div className="mt-3 space-y-3">
                              {comments.slice(0, 3).map((feedback) => (
                                <div
                                  key={feedback.id}
                                  className="rounded-xl bg-[#faf8ff] px-3 py-3"
                                >
                                  <p className="text-sm leading-6 text-[#100b2f]">
                                    {feedback.comment}
                                  </p>

                                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-[#6f6a93]">
                                    {feedback.rating != null && (
                                      <span className="rounded-full bg-white px-2 py-1">
                                        {t('feedbackAdmin.ratingValue', {
                                          value: feedback.rating,
                                        })}
                                      </span>
                                    )}
                                    {feedback.liked != null && (
                                      <span className="rounded-full bg-white px-2 py-1">
                                        {feedback.liked
                                          ? t('feedbackAdmin.liked')
                                          : t('feedbackAdmin.disliked')}
                                      </span>
                                    )}
                                    {feedback.difficulty && (
                                      <span className="rounded-full bg-white px-2 py-1">
                                        {feedback.difficulty}
                                      </span>
                                    )}
                                    {feedback.createdAt && (
                                      <span className="rounded-full bg-white px-2 py-1">
                                        {new Date(
                                          feedback.createdAt,
                                        ).toLocaleString(i18n.language)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-1">
              <p className="text-xs text-[#9b96b8]">
                {t('feedbackAdmin.showing', {
                  start: pageStart,
                  end: pageEnd,
                  total: filtered.length,
                  plural: filtered.length !== 1 ? 's' : '',
                })}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ece5ff] bg-white text-sm text-[#5836d6] transition hover:bg-[#f3eeff] disabled:opacity-30"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-semibold transition ${
                        currentPage === p
                          ? 'bg-[#5836d6] text-white shadow-sm'
                          : 'border border-[#ece5ff] bg-white text-[#5836d6] hover:bg-[#f3eeff]'
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#ece5ff] bg-white text-sm text-[#5836d6] transition hover:bg-[#f3eeff] disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
