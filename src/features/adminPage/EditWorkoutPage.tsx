import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import { fetchWorkoutById, updateWorkout } from '../../api/workouts'
import type { StatusFn, WorkoutForm, WorkoutResponse } from './types.ts'

type Props = {
  workoutId: number
  onBack: () => void
  onStatusChange?: StatusFn
}

const isValidUrl = (url: string): boolean => {
  if (!url) return true
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

const emptyForm: WorkoutForm = {
  name: '',
  description: '',
  dashboardName: '',
  dashboardDescription: '',
  instructions: '',
  guidance: '',
  level: 2,
  type: '',
  image: '',
  video: '',
}

export default function EditWorkoutPage({
  workoutId,
  onBack,
  onStatusChange,
}: Props) {
  const { getToken } = useAuth()
  const { t } = useTranslation()
  const [form, setForm] = useState<WorkoutForm>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setLoading(true)
        const token = await getToken()

        if (!token) {
          throw new Error('Missing Clerk token')
        }

        const workout = await fetchWorkoutById(workoutId, token)

        if (!isMounted) return

        const workoutData = workout as WorkoutResponse

        setForm({
          name: workoutData.name ?? '',
          description: workoutData.description ?? '',
          dashboardName: workoutData.dashboardName ?? '',
          dashboardDescription: workoutData.dashboardDescription ?? '',
          instructions: workoutData.instructions ?? '',
          guidance: workoutData.guidance ?? '',
          level: workoutData.level ?? 2,
          type: workoutData.type ?? '',
          image: workoutData.image ?? '',
          video: workoutData.video ?? '',
        })
      } catch (error) {
        console.error(error)
        onStatusChange?.(t('workoutsAdmin.toastLoadWorkoutFailed'), {
          type: 'error',
        })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [getToken, onStatusChange, workoutId, t])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target

    const nextValue = type === 'number' ? Number(value) : value

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }))
  }

  const validate = () => {
    const nextErrors: string[] = []

    if (!form.name) nextErrors.push(t('workoutsAdmin.validation.nameRequired'))
    if (!form.description)
      nextErrors.push(t('workoutsAdmin.validation.descriptionRequired'))
    if (!form.type) nextErrors.push(t('workoutsAdmin.validation.typeRequired'))
    if (form.level < 0 || form.level > 4)
      nextErrors.push(t('workoutsAdmin.validation.levelRange'))
    if (!isValidUrl(form.image)) {
      nextErrors.push(t('workoutsAdmin.validation.workoutImageUrl'))
    }
    if (!isValidUrl(form.video)) {
      nextErrors.push(t('workoutsAdmin.validation.instructionsVideoUrl'))
    }

    setErrors(nextErrors)
    return nextErrors.length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    try {
      setSaving(true)
      onStatusChange?.(t('workoutsAdmin.toastSavingChanges'), { type: 'info' })

      const token = await getToken()
      if (!token) {
        throw new Error('Missing Clerk token')
      }

      await updateWorkout(
        workoutId,
        {
          name: form.name,
          description: form.description,
          dashboardName: form.dashboardName || null,
          dashboardDescription: form.dashboardDescription || null,
          instructions: form.instructions || null,
          guidance: form.guidance || null,
          level: form.level,
          type: form.type,
          image: form.image || null,
          video: form.video || null,
        },
        token,
      )

      onStatusChange?.(t('workoutsAdmin.toastChangesSaved'), {
        type: 'success',
      })
      onBack()
    } catch (error) {
      console.error(error)
      onStatusChange?.(t('workoutsAdmin.toastSaveChangesFailed'), {
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-(--brand-border) bg-white p-6">
        <p className="text-sm text-(--brand-muted)">
          {t('workoutsAdmin.loadingWorkout')}
        </p>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-(--brand-page) p-6 text-(--brand-ink)">
      <div className="w-full max-w-4xl rounded-2xl border border-(--brand-border) bg-white p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">
            {t('workoutsAdmin.editWorkout')}
          </h1>
          <button
            type="button"
            onClick={() => {
              onStatusChange?.(t('workoutsAdmin.backToWorkouts'), {
                type: 'info',
              })
              onBack()
            }}
            className="rounded-full border border-(--brand-border) bg-(--brand-surface-glass) px-4 py-2 text-sm font-semibold"
          >
            {t('workoutsAdmin.backToWorkouts')}
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.name')} *
              </span>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.dashboardName')}
              </span>
              <input
                name="dashboardName"
                value={form.dashboardName}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.type')} *
              </span>
              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.level')} *
              </span>
              <input
                type="number"
                min="0"
                max="4"
                name="level"
                value={form.level}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm opacity-80">
              {t('workoutsAdmin.description')} *
            </span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.instructions')}
              </span>
              <textarea
                name="instructions"
                value={form.instructions}
                onChange={handleChange}
                className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.guidance')}
              </span>
              <textarea
                name="guidance"
                value={form.guidance}
                onChange={handleChange}
                className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
          </div>

          {/* Dashboard Display (English) */}
          <div className="flex flex-col gap-4 rounded-xl border border-(--brand-border) bg-(--brand-surface-glass) p-4">
            <div>
              <h3 className="text-base font-semibold">
                {t('workoutsAdmin.dashboardSection')}
              </h3>
              <p className="text-sm text-(--brand-muted)">
                {t('workoutsAdmin.dashboardSectionHint')}
              </p>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.dashboardName')}
              </span>
              <input
                name="dashboardName"
                placeholder={t('workoutsAdmin.dashboardNamePlaceholder')}
                value={form.dashboardName}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.dashboardDescription')}
              </span>
              <textarea
                name="dashboardDescription"
                placeholder={t('workoutsAdmin.dashboardDescriptionPlaceholder')}
                value={form.dashboardDescription}
                onChange={handleChange}
                className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.workoutImage')}
              </span>
              <input
                name="image"
                value={form.image}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.videoPlaceholder')}
              </span>
              <input
                name="video"
                placeholder={t('workoutsAdmin.videoPlaceholder')}
                value={form.video}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {errors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onStatusChange?.(t('workoutsAdmin.canceling'), {
                  type: 'info',
                })
                onBack()
              }}
              className="rounded-lg border border-(--brand-border) bg-(--brand-surface-glass) px-4 py-3 text-sm font-medium"
            >
              {t('workoutsAdmin.cancel')}
            </button>

            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg px-4 py-3 text-sm font-medium text-(--brand-on-primary) ${
                saving
                  ? 'cursor-not-allowed bg-(--brand-primary)/60'
                  : 'bg-(--brand-primary) hover:bg-(--brand-primary)/90'
              }`}
            >
              {saving ? t('workoutsAdmin.saving') : t('workoutsAdmin.save')}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
