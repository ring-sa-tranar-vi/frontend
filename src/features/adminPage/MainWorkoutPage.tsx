import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/react'
import { useTranslation } from 'react-i18next'
/* eslint-disable react-hooks/set-state-in-effect */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkoutWithToken,
  deleteWorkout,
  fetchWorkouts,
  setWorkoutEnabledWithToken,
  updateWorkout,
} from '../../api/workouts'
import ConfirmModal from '../../components/ConfirmModal'
import { useToast } from '../../hooks/useToast'
import { fetchTrainersWithToken } from '../../api/trainers'

type AdminTab = 'workouts' | 'trainers' | 'feedback'

type Props = {
  onSwitchTab?: (tab: AdminTab) => void
  searchTerm?: string
}

type Workout = {
  id: number
  name: string
  description?: string
  dashboardName?: string | null
  dashboardDescription?: string | null
  subtitleText?: string | null
  instructionsSubtitleText?: string | null
  type?: string
  level?: number
  durationSeconds?: number
  instructionsAudio?: string
  workoutAudio?: string
  instructionsImage?: string
  workoutImage?: string
  instructionsVideo?: string | null
  instructionsVideoStart?: number | null
  instructionsVideoStop?: number | null
  kneeFriendly?: boolean
  lowImpact?: boolean
  seated?: boolean
  beginnerFriendly?: boolean
  enabled?: boolean
  trainer?: { id?: number; name?: string } | null
}

type WorkoutForm = {
  name: string
  description: string
  dashboardName: string
  dashboardDescription: string
  subtitleText: string
  instructionsSubtitleText: string
  type: string
  level: number
  durationSeconds: number
  instructionsAudio: string
  workoutAudio: string
  instructionsImage: string
  workoutImage: string
  instructionsVideo: string
  instructionsVideoStart: string
  instructionsVideoStop: string
  kneeFriendly: boolean
  lowImpact: boolean
  seated: boolean
  beginnerFriendly: boolean
}

type SortBy =
  'newest' | 'name-asc' | 'name-desc' | 'duration-asc' | 'duration-desc'

const emptyForm: WorkoutForm = {
  name: '',
  description: '',
  dashboardName: '',
  dashboardDescription: '',
  subtitleText: '',
  instructionsSubtitleText: '',
  type: '',
  level: 1,
  durationSeconds: 60,
  instructionsAudio: '',
  workoutAudio: '',
  instructionsImage: '',
  workoutImage: '',
  instructionsVideo: '',
  instructionsVideoStart: '',
  instructionsVideoStop: '',
  kneeFriendly: false,
  lowImpact: false,
  seated: false,
  beginnerFriendly: false,
}

function toForm(workout: Workout): WorkoutForm {
  return {
    name: workout.name ?? '',
    description: workout.description ?? '',
    dashboardName: workout.dashboardName ?? '',
    dashboardDescription: workout.dashboardDescription ?? '',
    subtitleText: workout.subtitleText ?? '',
    instructionsSubtitleText: workout.instructionsSubtitleText ?? '',
    type: workout.type ?? '',
    level: workout.level ?? 1,
    durationSeconds: workout.durationSeconds ?? 60,
    instructionsAudio: workout.instructionsAudio ?? '',
    workoutAudio: workout.workoutAudio ?? '',
    instructionsImage: workout.instructionsImage ?? '',
    workoutImage: workout.workoutImage ?? '',
    instructionsVideo: workout.instructionsVideo ?? '',
    instructionsVideoStart:
      workout.instructionsVideoStart != null
        ? String(workout.instructionsVideoStart)
        : '',
    instructionsVideoStop:
      workout.instructionsVideoStop != null
        ? String(workout.instructionsVideoStop)
        : '',
    kneeFriendly: workout.kneeFriendly ?? false,
    lowImpact: workout.lowImpact ?? false,
    seated: workout.seated ?? false,
    beginnerFriendly: workout.beginnerFriendly ?? false,
  }
}

function isValidUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true

  try {
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        value
          ? 'border-[#5836d6] bg-[#f0ebff] text-[#5836d6]'
          : 'border-[#ece5ff] text-[#6f6a93] hover:border-[#5836d6]'
      }`}
    >
      {children}
    </select>
  )
}

function PaginationControls({
  currentPage,
  totalPages,
  onChange,
  prevLabel,
  nextLabel,
}: {
  currentPage: number
  totalPages: number
  onChange: (page: number) => void
  prevLabel: string
  nextLabel: string
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="rounded-lg border border-[#ece5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#5836d6] transition hover:bg-[#f3eeff] disabled:opacity-30"
      >
        ← {prevLabel}
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            currentPage === page
              ? 'bg-[#5836d6] text-white shadow-sm'
              : 'border border-[#ece5ff] bg-white text-[#5836d6] hover:bg-[#f3eeff]'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-[#ece5ff] bg-white px-3 py-1.5 text-xs font-semibold text-[#5836d6] transition hover:bg-[#f3eeff] disabled:opacity-30"
      >
        {nextLabel} →
      </button>
    </div>
  )
}

function WorkoutDetailsPanel({
  workout,
  onEdit,
  onToggleEnabled,
  isTogglingEnabled,
}: {
  workout: Workout
  onEdit: () => void
  onToggleEnabled: () => void
  isTogglingEnabled: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="space-y-0">
      <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-[#ece5ff]">
        {workout.workoutImage || workout.instructionsImage ? (
          <img
            src={workout.workoutImage || workout.instructionsImage}
            alt={workout.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            🏋️
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
        <button
          type="button"
          onClick={onEdit}
          className="absolute top-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#5836d6] shadow-sm backdrop-blur-sm transition hover:bg-white"
        >
          ✏️ {t('workoutsAdmin.edit')}
        </button>
        {workout.type && (
          <span className="absolute bottom-3 left-3 rounded-full bg-[#5836d6] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
            {workout.type}
          </span>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-bold text-[#100b2f]">
            {workout.dashboardName || workout.name}
          </h3>
          <p className="text-xs text-[#9b96b8]">
            {t('workoutsAdmin.level')} {workout.level ?? '-'}
          </p>
          <p className="mt-1 text-xs font-semibold text-[#6f6a93]">
            {workout.enabled === false
              ? t('workoutsAdmin.statusDisabled')
              : t('workoutsAdmin.statusEnabled')}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[#ece5ff] bg-[#f8f5ff] p-3 text-center">
            <p className="text-[10px] font-semibold tracking-wide text-[#9b96b8] uppercase">
              {t('workoutsAdmin.duration')}
            </p>
            <p className="mt-1 text-base font-bold text-[#100b2f]">
              {workout.durationSeconds ?? '-'} {t('workoutsAdmin.seconds')}
            </p>
          </div>
          <div className="rounded-xl border border-[#ece5ff] bg-[#f8f5ff] p-3 text-center">
            <p className="text-[10px] font-semibold tracking-wide text-[#9b96b8] uppercase">
              {t('workoutsAdmin.level')}
            </p>
            <p className="mt-1 text-base font-bold text-[#100b2f]">
              {workout.level ?? '-'}
            </p>
          </div>
          <div className="rounded-xl border border-[#ece5ff] bg-[#f8f5ff] p-3 text-center">
            <p className="text-[10px] font-semibold tracking-wide text-[#9b96b8] uppercase">
              {t('workoutsAdmin.type')}
            </p>
            <p className="mt-1 truncate text-base font-bold text-[#100b2f]">
              {workout.type ? workout.type.toUpperCase() : '-'}
            </p>
          </div>
        </div>

        {(workout.dashboardDescription || workout.description) && (
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#9b96b8] uppercase">
              {t('workoutsAdmin.description')}
            </p>
            <p className="text-sm leading-relaxed text-[#3d3860]">
              {workout.dashboardDescription || workout.description}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onEdit}
          className="w-full rounded-xl bg-[#5836d6] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4527b8] active:scale-95"
        >
          {t('workoutsAdmin.editWorkout')}
        </button>
        <button
          type="button"
          onClick={onToggleEnabled}
          disabled={isTogglingEnabled}
          className="w-full rounded-xl border border-[#d8ccff] bg-white py-2.5 text-sm font-semibold text-[#5836d6] transition hover:bg-[#f5f0ff] disabled:opacity-60"
        >
          {isTogglingEnabled
            ? t('workoutsAdmin.updatingStatus')
            : workout.enabled === false
              ? t('workoutsAdmin.enableWorkout')
              : t('workoutsAdmin.disableWorkout')}
        </button>
      </div>
    </div>
  )
}

export default function MainWorkoutPage({ searchTerm = '' }: Props) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { toast, showToast } = useToast()

  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [filterType, setFilterType] = useState<string>('')
  const [filterLevel, setFilterLevel] = useState<string>('')
  const [filterTrainerId, setFilterTrainerId] = useState<string>('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [form, setForm] = useState<WorkoutForm>(emptyForm)

  const {
    data: workouts = [],
    isLoading,
    isError,
    error,
  } = useQuery<Workout[]>({
    queryKey: ['workouts'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return fetchWorkouts(token)
    },
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const { data: trainers = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['admin-trainers'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return fetchTrainersWithToken(token)
    },
  })

  const uniqueTypes = useMemo(() => {
    const types = workouts
      .map((w) => w.type?.trim().toUpperCase())
      .filter((t): t is string => Boolean(t))
    return [...new Set(types)].sort()
  }, [workouts])

  const uniqueLevels = useMemo(() => {
    const levels = workouts
      .map((w) => w.level)
      .filter((l): l is number => l != null)
    return [...new Set(levels)].sort((a, b) => a - b)
  }, [workouts])

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((item) => {
      if (filterType && item.type?.toUpperCase() !== filterType) return false
      if (filterLevel && String(item.level) !== filterLevel) return false
      if (
        filterTrainerId &&
        String(item.trainer?.id ?? '') !== filterTrainerId
      ) {
        return false
      }

      if (!normalizedSearch) return true
      return (
        item.name?.toLowerCase().includes(normalizedSearch) ||
        item.type?.toLowerCase().includes(normalizedSearch) ||
        item.description?.toLowerCase().includes(normalizedSearch) ||
        String(item.level ?? '').includes(normalizedSearch)
      )
    })
  }, [normalizedSearch, workouts, filterType, filterLevel, filterTrainerId])

  const sortedWorkouts = useMemo(() => {
    const next = [...filteredWorkouts]

    next.sort((a, b) => {
      if (sortBy === 'name-asc') {
        return (a.name ?? '').localeCompare(b.name ?? '')
      }
      if (sortBy === 'name-desc') {
        return (b.name ?? '').localeCompare(a.name ?? '')
      }
      if (sortBy === 'duration-asc') {
        return (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0)
      }
      if (sortBy === 'duration-desc') {
        return (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0)
      }

      // Newest as default proxy by id
      return (b.id ?? 0) - (a.id ?? 0)
    })

    return next
  }, [filteredWorkouts, sortBy])

  const pageSize = 6
  const totalPages = Math.max(1, Math.ceil(sortedWorkouts.length / pageSize))

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1)
  }, [
    normalizedSearch,
    sortBy,
    filterType,
    filterLevel,
    filterTrainerId,
    currentPage,
  ])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [totalPages, currentPage])

  const pagedWorkouts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedWorkouts.slice(start, start + pageSize)
  }, [currentPage, sortedWorkouts])

  const pageStart =
    sortedWorkouts.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const pageEnd = Math.min(currentPage * pageSize, sortedWorkouts.length)

  useEffect(() => {
    if (sortedWorkouts.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }

    if (
      selectedId !== null &&
      sortedWorkouts.some((item) => item.id === selectedId)
    ) {
      return
    }

    const firstId = sortedWorkouts[0].id
    if (firstId !== selectedId) setSelectedId(firstId)
  }, [selectedId, sortedWorkouts])

  const selectedWorkout = useMemo(
    () => workouts.find((item) => item.id === selectedId) ?? null,
    [selectedId, workouts],
  )

  useEffect(() => {
    if (mode === 'edit' && selectedWorkout != null) {
      const next = toForm(selectedWorkout)
      if (form.name !== next.name || form.description !== next.description) {
        setForm(next)
        setErrors([])
      }
    }
  }, [mode, selectedWorkout, form])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        dashboardName: form.dashboardName.trim() || null,
        dashboardDescription: form.dashboardDescription.trim() || null,
        subtitleText: form.subtitleText.trim() || null,
        instructionsSubtitleText: form.instructionsSubtitleText.trim() || null,
        type: form.type.trim(),
        level: form.level,
        durationSeconds: form.durationSeconds,
        instructionsAudio: form.instructionsAudio.trim(),
        workoutAudio: form.workoutAudio.trim(),
        instructionsImage: form.instructionsImage.trim(),
        workoutImage: form.workoutImage.trim(),
        instructionsVideo: form.instructionsVideo.trim() || null,
        instructionsVideoStart:
          form.instructionsVideoStart !== ''
            ? Number(form.instructionsVideoStart)
            : null,
        instructionsVideoStop:
          form.instructionsVideoStop !== ''
            ? Number(form.instructionsVideoStop)
            : null,
        kneeFriendly: form.kneeFriendly,
        lowImpact: form.lowImpact,
        seated: form.seated,
        beginnerFriendly: form.beginnerFriendly,
      }

      if (mode === 'edit') {
        if (selectedId == null) throw new Error('No workout selected')
        return updateWorkout(selectedId, payload, token)
      }

      return createWorkoutWithToken(payload, token)
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] })

      if (mode === 'create') {
        const createdId = (saved as Workout)?.id
        if (typeof createdId === 'number') {
          setSelectedId(createdId)
        }
      }

      setMode('view')
      setErrors([])
      showToast(
        mode === 'create'
          ? t('workoutsAdmin.toastCreated')
          : t('workoutsAdmin.toastUpdated'),
        {
          type: 'success',
        },
      )
    },
    onError: () => {
      showToast(t('workoutsAdmin.toastSaveFailed'), { type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token || selectedId == null) throw new Error('Missing Clerk token')
      return deleteWorkout(selectedId, token)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] })
      setMode('view')
      setConfirmDelete(false)
      showToast(t('workoutsAdmin.toastDeleted'), { type: 'success' })
    },
    onError: () => {
      setConfirmDelete(false)
      showToast(t('workoutsAdmin.toastDeleteFailed'), { type: 'error' })
    },
  })

  const toggleEnabledMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return setWorkoutEnabledWithToken(id, enabled, token)
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['workouts'] })
      showToast(
        variables.enabled
          ? t('workoutsAdmin.toastEnabled')
          : t('workoutsAdmin.toastDisabled'),
        { type: 'success' },
      )
    },
    onError: () => {
      showToast(t('workoutsAdmin.toastStatusFailed'), { type: 'error' })
    },
  })

  const validate = () => {
    const nextErrors: string[] = []

    if (!form.name.trim())
      nextErrors.push(t('workoutsAdmin.validation.nameRequired'))
    if (form.level < 0 || form.level > 4) {
      nextErrors.push(t('workoutsAdmin.validation.levelRange'))
    }
    if (form.durationSeconds < 0) {
      nextErrors.push(t('workoutsAdmin.validation.durationPositive'))
    }

    if (!isValidUrl(form.instructionsAudio)) {
      nextErrors.push(t('workoutsAdmin.validation.instructionsAudioUrl'))
    }
    if (!isValidUrl(form.workoutAudio)) {
      nextErrors.push(t('workoutsAdmin.validation.workoutAudioUrl'))
    }
    if (!isValidUrl(form.instructionsImage)) {
      nextErrors.push(t('workoutsAdmin.validation.instructionsImageUrl'))
    }
    if (!isValidUrl(form.workoutImage)) {
      nextErrors.push(t('workoutsAdmin.validation.workoutImageUrl'))
    }

    if (form.instructionsVideo && !isValidUrl(form.instructionsVideo)) {
      nextErrors.push(t('workoutsAdmin.validation.instructionsVideoUrl'))
    }

    const vStart =
      form.instructionsVideoStart !== ''
        ? Number(form.instructionsVideoStart)
        : null
    const vStop =
      form.instructionsVideoStop !== ''
        ? Number(form.instructionsVideoStop)
        : null
    if (vStart !== null && vStop !== null && vStart >= vStop) {
      nextErrors.push(t('workoutsAdmin.validation.videoStartBeforeStop'))
    }

    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    showToast(t('workoutsAdmin.toastSaving'), { type: 'info' })
    await saveMutation.mutateAsync()
  }

  const onFormChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = event.target

    let nextValue: string | number | boolean =
      type === 'checkbox'
        ? (event.target as HTMLInputElement).checked
        : type === 'number'
          ? Number(value)
          : value

    if (name === 'durationSeconds') {
      const onlyDigits = String(value).replace(/\D/g, '')
      nextValue = onlyDigits.length > 0 ? Number(onlyDigits) : 0
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }))
  }

  const openCreate = () => {
    setMode('create')
    setForm(emptyForm)
    setErrors([])
  }

  const openEdit = () => {
    if (selectedWorkout == null) return
    setMode('edit')
    setForm(toForm(selectedWorkout))
    setErrors([])
  }

  if (isLoading) {
    return (
      <p className="text-sm text-(--brand-muted)">
        {t('workoutsAdmin.loading')}
      </p>
    )
  }

  if (isError) {
    return <p className="text-sm text-red-500">{(error as Error).message}</p>
  }

  return (
    <section className="space-y-4">
      {toast && (
        <div
          className={`pointer-events-none fixed top-6 right-6 z-20 rounded-lg px-4 py-2 text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-(--brand-ink) text-(--brand-on-primary)'
          }`}
        >
          {toast.message}
        </div>
      )}

      {confirmDelete && selectedWorkout != null && (
        <ConfirmModal
          open={true}
          title={t('workoutsAdmin.deleteTitle')}
          body={t('workoutsAdmin.deleteBody', { name: selectedWorkout.name })}
          requireTyping="DELETE"
          confirmLabel={t('workoutsAdmin.deleteConfirm')}
          cancelLabel={t('workoutsAdmin.cancel')}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#100b2f]">
            {t('workoutsAdmin.title')}
          </h2>
          <p className="text-sm text-[#6f6a93]">
            {t('workoutsAdmin.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-[#5836d6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4527b8] active:scale-95"
        >
          {t('workoutsAdmin.addWorkout')}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ece5ff] bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect value={filterType} onChange={setFilterType}>
            <option value="">{t('workoutsAdmin.allCategories')}</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={filterLevel} onChange={setFilterLevel}>
            <option value="">{t('workoutsAdmin.allLevels')}</option>
            {uniqueLevels.map((l) => (
              <option key={l} value={String(l)}>
                {t('workoutsAdmin.level')} {l}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect value={filterTrainerId} onChange={setFilterTrainerId}>
            <option value="">{t('workoutsAdmin.allTrainers')}</option>
            {trainers.map((tr) => (
              <option key={tr.id} value={String(tr.id)}>
                {tr.name}
              </option>
            ))}
          </FilterSelect>

          {(filterType || filterLevel || filterTrainerId) && (
            <button
              type="button"
              onClick={() => {
                setFilterType('')
                setFilterLevel('')
                setFilterTrainerId('')
              }}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-500 transition hover:bg-red-100"
            >
              {t('workoutsAdmin.clearFilters')}
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
          className="rounded-lg border border-[#ece5ff] px-3 py-1.5 text-xs font-semibold text-[#6f6a93] hover:border-[#5836d6]"
        >
          <option value="newest">{t('workoutsAdmin.sortNewest')}</option>
          <option value="name-asc">{t('workoutsAdmin.sortNameAsc')}</option>
          <option value="name-desc">{t('workoutsAdmin.sortNameDesc')}</option>
          <option value="duration-asc">
            {t('workoutsAdmin.sortDurationAsc')}
          </option>
          <option value="duration-desc">
            {t('workoutsAdmin.sortDurationDesc')}
          </option>
        </select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[#ece5ff] bg-white shadow-sm">
            {pagedWorkouts.map((workout, index) => (
              <article
                key={workout.id}
                onClick={() => {
                  setSelectedId(workout.id)
                  if (mode === 'create') setMode('view')
                }}
                className={`cursor-pointer border-b border-[#f3eeff] p-3 transition last:border-b-0 ${
                  selectedId === workout.id
                    ? 'bg-[#f3eeff]'
                    : 'bg-white hover:bg-[#faf8ff]'
                } ${index === 0 ? '' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-[#ece5ff]">
                    {workout.workoutImage || workout.instructionsImage ? (
                      <img
                        src={workout.workoutImage || workout.instructionsImage}
                        alt={workout.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg text-[#b0a0e0]">
                        🏋️
                      </div>
                    )}
                    {selectedId === workout.id && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-[#5836d6]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#100b2f]">
                      {workout.dashboardName || workout.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {workout.type && (
                        <span className="rounded-full bg-[#ede9ff] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#5836d6] uppercase">
                          {workout.type}
                        </span>
                      )}
                      {workout.enabled === false && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600 uppercase">
                          {t('workoutsAdmin.statusDisabled')}
                        </span>
                      )}
                      <span className="text-xs text-[#9b96b8]">
                        {t('workoutsAdmin.level')} {workout.level ?? '-'}
                      </span>
                      <span className="text-xs text-[#9b96b8]">·</span>
                      <span className="text-xs text-[#9b96b8]">
                        {workout.durationSeconds ?? '-'}{' '}
                        {t('workoutsAdmin.seconds')}
                      </span>
                    </div>
                  </div>

                  {selectedId === workout.id && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-[#5836d6]" />
                  )}
                </div>
              </article>
            ))}

            {pagedWorkouts.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-semibold text-[#100b2f]">
                  {t('workoutsAdmin.noWorkoutsFound')}
                </p>
                <p className="text-xs text-[#9b96b8]">
                  {t('workoutsAdmin.tryAdjustSearch')}
                </p>
                {(filterType || filterLevel || filterTrainerId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterType('')
                      setFilterLevel('')
                      setFilterTrainerId('')
                    }}
                    className="mt-1 rounded-lg bg-[#f3eeff] px-3 py-1.5 text-xs font-semibold text-[#5836d6] hover:bg-[#ede9ff]"
                  >
                    {t('workoutsAdmin.clearFilters')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs text-[#9b96b8]">
              {sortedWorkouts.length === 0
                ? t('workoutsAdmin.noWorkoutsFound')
                : t('workoutsAdmin.showing', {
                    start: pageStart,
                    end: pageEnd,
                    total: sortedWorkouts.length,
                  })}
            </p>

            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onChange={setCurrentPage}
                prevLabel={t('workoutsAdmin.prev')}
                nextLabel={t('workoutsAdmin.next')}
              />
            )}
          </div>
        </div>

        <aside className="h-fit rounded-2xl border border-[#ece5ff] bg-white shadow-sm xl:sticky xl:top-5">
          {mode === 'view' && selectedWorkout != null && (
            <WorkoutDetailsPanel
              workout={selectedWorkout}
              onEdit={openEdit}
              onToggleEnabled={() => {
                if (selectedWorkout.id == null) return
                toggleEnabledMutation.mutate({
                  id: selectedWorkout.id,
                  enabled: !(selectedWorkout.enabled ?? true),
                })
              }}
              isTogglingEnabled={toggleEnabledMutation.isPending}
            />
          )}

          {(mode === 'create' || mode === 'edit') && (
            <form onSubmit={onSubmit} className="space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#100b2f]">
                    {t('workoutsAdmin.title')}
                  </h2>
                  <p className="text-sm text-[#6f6a93]">
                    {t('workoutsAdmin.subtitle')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-xl bg-[#5836d6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4527b8] active:scale-95"
                >
                  {t('workoutsAdmin.addWorkout')}
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('workoutsAdmin.name')}
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={onFormChange}
                  placeholder={t('workoutsAdmin.namePlaceholder')}
                  className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('workoutsAdmin.dashboardName')}
                </label>
                <input
                  name="dashboardName"
                  value={form.dashboardName}
                  onChange={onFormChange}
                  placeholder={t('workoutsAdmin.dashboardNamePlaceholder')}
                  className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('workoutsAdmin.description')}
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={onFormChange}
                  placeholder={t('workoutsAdmin.descriptionPlaceholder')}
                  className="min-h-20 w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('workoutsAdmin.dashboardDescription')}
                </label>
                <textarea
                  name="dashboardDescription"
                  value={form.dashboardDescription}
                  onChange={onFormChange}
                  placeholder={t(
                    'workoutsAdmin.dashboardDescriptionPlaceholder',
                  )}
                  className="min-h-16 w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('workoutsAdmin.type')}
                  </label>
                  <input
                    name="type"
                    value={form.type}
                    onChange={onFormChange}
                    placeholder={t('workoutsAdmin.typePlaceholder')}
                    className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('workoutsAdmin.level')}
                  </label>
                  <input
                    type="number"
                    name="level"
                    min="0"
                    max="4"
                    value={form.level}
                    onChange={onFormChange}
                    className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('workoutsAdmin.seconds')}
                  </label>
                  <input
                    type="text"
                    name="durationSeconds"
                    inputMode="numeric"
                    value={form.durationSeconds}
                    onChange={onFormChange}
                    className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('workoutsAdmin.workoutImage')}
                </label>
                <input
                  name="workoutImage"
                  value={form.workoutImage}
                  onChange={onFormChange}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                />
              </div>

              <details className="rounded-xl border border-[#ece5ff]">
                <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-[#5836d6]">
                  {t('workoutsAdmin.moreFields')}
                </summary>
                <div className="space-y-3 px-3 pb-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#6f6a93]">
                      {t('workoutsAdmin.instructionsImage')}
                    </label>
                    <input
                      name="instructionsImage"
                      value={form.instructionsImage}
                      onChange={onFormChange}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#6f6a93]">
                      {t('workoutsAdmin.workoutAudio')}
                    </label>
                    <input
                      name="workoutAudio"
                      value={form.workoutAudio}
                      onChange={onFormChange}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#6f6a93]">
                      {t('workoutsAdmin.instructionsAudio')}
                    </label>
                    <input
                      name="instructionsAudio"
                      value={form.instructionsAudio}
                      onChange={onFormChange}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#6f6a93]">
                      Workout audio subtitle text
                    </label>
                    <textarea
                      name="subtitleText"
                      value={form.subtitleText}
                      onChange={onFormChange}
                      placeholder="Example: subtitles for the workout audio in the language spoken during the workout"
                      className="min-h-[120px] w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#6f6a93]">
                      Instructions audio subtitle text
                    </label>
                    <textarea
                      name="instructionsSubtitleText"
                      value={form.instructionsSubtitleText}
                      onChange={onFormChange}
                      placeholder="Example: subtitles for the instructions audio in the language spoken during the instructions"
                      className="min-h-[120px] w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#6f6a93]">
                      {t('workoutsAdmin.instructionsVideoOptional')}
                    </label>
                    <input
                      name="instructionsVideo"
                      value={form.instructionsVideo}
                      onChange={onFormChange}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#6f6a93]">
                        {t('workoutsAdmin.videoStartSeconds')}
                      </label>
                      <input
                        name="instructionsVideoStart"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={form.instructionsVideoStart}
                        onChange={onFormChange}
                        placeholder={t('workoutsAdmin.videoStartPlaceholder')}
                        className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#6f6a93]">
                        {t('workoutsAdmin.videoStopSeconds')}
                      </label>
                      <input
                        name="instructionsVideoStop"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={form.instructionsVideoStop}
                        onChange={onFormChange}
                        placeholder={t('workoutsAdmin.videoStopPlaceholder')}
                        className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                      />
                    </div>
                  </div>
                </div>
              </details>

              {errors.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-600">
                  {errors.map((item) => (
                    <p key={item} className="flex items-center gap-1">
                      <span>⚠</span> {item}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-100"
                  >
                    {t('workoutsAdmin.delete')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="flex-1 rounded-xl bg-[#5836d6] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4527b8] active:scale-95 disabled:opacity-50"
                >
                  {saveMutation.isPending
                    ? t('workoutsAdmin.saving')
                    : t('workoutsAdmin.save')}
                </button>
              </div>
            </form>
          )}

          {mode === 'view' && selectedWorkout == null && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="text-4xl">👆</span>
              <p className="text-sm font-semibold text-[#100b2f]">
                {t('workoutsAdmin.selectWorkout')}
              </p>
              <p className="text-xs text-[#9b96b8]">
                {t('workoutsAdmin.clickWorkoutHint')}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
