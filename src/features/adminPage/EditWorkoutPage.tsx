import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { useTranslation } from 'react-i18next'
import { fetchWorkoutById, updateWorkout } from '../../api/workouts'
import { fetchTrainersWithToken } from '../../api/trainers'
import type { ToastType } from '../../hooks/useToast'

type TrainerOption = {
  id: number
  name: string
}

type WorkoutForm = {
  name: string
  description: string
  dashboardName: string
  dashboardDescription: string
  subtitleText: string
  instructionsSubtitleText: string
  level: number
  type: string
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
  trainerId: string
}

type WorkoutResponse = {
  id: number
  name?: string
  description?: string
  dashboardName?: string | null
  dashboardDescription?: string | null
  subtitleText?: string | null
  instructionsSubtitleText?: string | null
  level?: number
  type?: string
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
  trainer?: {
    id?: number
  } | null
}

type StatusFn = (
  message: string,
  options?: { type?: ToastType; duration?: number },
) => void

type Props = {
  workoutId: number
  onBack: () => void
  onStatusChange?: StatusFn
}

const isValidUrl = (url: string): boolean => {
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
  subtitleText: '',
  instructionsSubtitleText: '',
  level: 2,
  type: '',
  durationSeconds: 0,
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
  trainerId: '',
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
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
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

        const [workout, trainerList] = await Promise.all([
          fetchWorkoutById(workoutId, token),
          fetchTrainersWithToken(token),
        ])

        if (!isMounted) return

        const workoutData = workout as WorkoutResponse

        setTrainers(Array.isArray(trainerList) ? trainerList : [])
        setForm({
          name: workoutData.name ?? '',
          description: workoutData.description ?? '',
          dashboardName: workoutData.dashboardName ?? '',
          dashboardDescription: workoutData.dashboardDescription ?? '',
          subtitleText: workoutData.subtitleText ?? '',
          instructionsSubtitleText: workoutData.instructionsSubtitleText ?? '',
          level: workoutData.level ?? 2,
          type: workoutData.type ?? '',
          durationSeconds: workoutData.durationSeconds ?? 0,
          instructionsAudio: workoutData.instructionsAudio ?? '',
          workoutAudio: workoutData.workoutAudio ?? '',
          instructionsImage: workoutData.instructionsImage ?? '',
          workoutImage: workoutData.workoutImage ?? '',
          instructionsVideo: workoutData.instructionsVideo ?? '',
          instructionsVideoStart:
            workoutData.instructionsVideoStart != null
              ? String(workoutData.instructionsVideoStart)
              : '',
          instructionsVideoStop:
            workoutData.instructionsVideoStop != null
              ? String(workoutData.instructionsVideoStop)
              : '',
          kneeFriendly: workoutData.kneeFriendly ?? false,
          lowImpact: workoutData.lowImpact ?? false,
          seated: workoutData.seated ?? false,
          beginnerFriendly: workoutData.beginnerFriendly ?? false,
          trainerId:
            workoutData.trainer?.id != null
              ? String(workoutData.trainer.id)
              : '',
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
  }, [getToken, onStatusChange, workoutId])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target

    const nextValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
          ? Number(value)
          : value

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
    if (form.durationSeconds <= 0)
      nextErrors.push(t('workoutsAdmin.validation.durationPositive'))
    if (form.level < 0 || form.level > 4)
      nextErrors.push(t('workoutsAdmin.validation.levelRange'))
    if (!form.trainerId)
      nextErrors.push(t('workoutsAdmin.validation.trainerRequired'))
    if (!form.instructionsAudio || !isValidUrl(form.instructionsAudio)) {
      nextErrors.push(t('workoutsAdmin.validation.instructionsAudioUrl'))
    }
    if (!form.workoutAudio || !isValidUrl(form.workoutAudio)) {
      nextErrors.push(t('workoutsAdmin.validation.workoutAudioUrl'))
    }
    if (!form.instructionsImage || !isValidUrl(form.instructionsImage)) {
      nextErrors.push(t('workoutsAdmin.validation.instructionsImageUrl'))
    }
    if (!form.workoutImage || !isValidUrl(form.workoutImage)) {
      nextErrors.push(t('workoutsAdmin.validation.workoutImageUrl'))
    }

    if (form.instructionsVideo && !isValidUrl(form.instructionsVideo))
      nextErrors.push(t('workoutsAdmin.validation.instructionsVideoUrl'))

    const start =
      form.instructionsVideoStart !== ''
        ? Number(form.instructionsVideoStart)
        : null
    const stop =
      form.instructionsVideoStop !== ''
        ? Number(form.instructionsVideoStop)
        : null
    if (start !== null && stop !== null && start >= stop)
      nextErrors.push(t('workoutsAdmin.validation.videoStartBeforeStop'))

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
          subtitleText: form.subtitleText || null,
          instructionsSubtitleText: form.instructionsSubtitleText || null,
          level: form.level,
          type: form.type,
          durationSeconds: form.durationSeconds,
          instructionsAudio: form.instructionsAudio,
          workoutAudio: form.workoutAudio,
          instructionsImage: form.instructionsImage,
          workoutImage: form.workoutImage,
          instructionsVideo: form.instructionsVideo || null,
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
          trainer: {
            id: Number(form.trainerId),
          },
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
                {t('workoutsAdmin.trainer')} *
              </span>
              <select
                name="trainerId"
                value={form.trainerId}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              >
                <option value="">{t('workoutsAdmin.chooseTrainer')}</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
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

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.duration')} *
              </span>
              <input
                type="number"
                min="0"
                name="durationSeconds"
                value={form.durationSeconds}
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
                Workout audio subtitle text
              </span>
              <textarea
                name="subtitleText"
                placeholder="Example: subtitles for the workout audio in the language spoken during the workout"
                value={form.subtitleText}
                onChange={handleChange}
                className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                Instructions audio subtitle text
              </span>
              <textarea
                name="instructionsSubtitleText"
                placeholder="Example: subtitles for the instructions audio in the language spoken during the instructions"
                value={form.instructionsSubtitleText}
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
                {t('workoutsAdmin.instructionsAudio')} *
              </span>
              <input
                name="instructionsAudio"
                value={form.instructionsAudio}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.workoutAudio')} *
              </span>
              <input
                name="workoutAudio"
                value={form.workoutAudio}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.instructionsImage')} *
              </span>
              <input
                name="instructionsImage"
                value={form.instructionsImage}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.workoutImage')} *
              </span>
              <input
                name="workoutImage"
                value={form.workoutImage}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.instructionsVideoOptional')}
              </span>
              <input
                name="instructionsVideo"
                placeholder={t('workoutsAdmin.videoPlaceholder')}
                value={form.instructionsVideo}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.videoStartSeconds')}
              </span>
              <input
                name="instructionsVideoStart"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={t('workoutsAdmin.videoStartPlaceholder')}
                value={form.instructionsVideoStart}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.videoStopSeconds')}
              </span>
              <input
                name="instructionsVideoStop"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={t('workoutsAdmin.videoStopPlaceholder')}
                value={form.instructionsVideoStop}
                onChange={handleChange}
                className="rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { name: 'kneeFriendly', label: t('exercisePanel.kneeFriendly') },
              { name: 'lowImpact', label: t('exercisePanel.lowImpact') },
              { name: 'seated', label: t('exercisePanel.seated') },
              {
                name: 'beginnerFriendly',
                label: t('exercisePanel.beginnerFriendly'),
              },
            ].map((item) => (
              <label
                key={item.name}
                className="flex items-center gap-2 rounded-lg border border-(--brand-border) bg-(--brand-surface-glass) p-3"
              >
                <input
                  type="checkbox"
                  name={item.name}
                  checked={form[item.name as keyof WorkoutForm] as boolean}
                  onChange={handleChange}
                />
                {item.label}
              </label>
            ))}
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
