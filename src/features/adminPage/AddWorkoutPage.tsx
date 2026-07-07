import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/react'
import { useCreateWorkout } from '../../hooks/useCreateWorkoutHook'
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

type StatusFn = (
  message: string,
  options?: { type?: ToastType; duration?: number },
) => void

type Props = {
  onBack?: () => void
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

export default function AddWorkoutPage({ onBack, onStatusChange }: Props) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [form, setForm] = useState<WorkoutForm>({
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
  })
  const { mutateAsync, isPending } = useCreateWorkout(getToken)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [trainersLoading, setTrainersLoading] = useState(true)
  const [trainersError, setTrainersError] = useState('')
  const isSubmitting = isPending

  useEffect(() => {
    let isMounted = true

    async function loadTrainers() {
      try {
        setTrainersLoading(true)
        const token = await getToken()

        if (!token) {
          throw new Error('Missing Clerk token')
        }

        const data = await fetchTrainersWithToken(token)

        if (!isMounted) return

        setTrainers(Array.isArray(data) ? data : [])
        setTrainersError('')
      } catch (error) {
        if (!isMounted) return

        console.error(error)
        setTrainersError(t('workoutsAdmin.trainersLoadFailed'))
        onStatusChange?.(t('workoutsAdmin.trainersLoadFailed'), {
          type: 'error',
        })
      } finally {
        if (isMounted) {
          setTrainersLoading(false)
        }
      }
    }

    loadTrainers()

    return () => {
      isMounted = false
    }
  }, [getToken, onStatusChange])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target

    let newValue =
      type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
          ? Number(value)
          : value

    // Constrain level to 0-4
    if (name === 'level' && typeof newValue === 'number') {
      newValue = Math.min(Math.max(newValue, 0), 4)
    }

    setForm((prev) => ({
      ...prev,
      [name]: newValue,
    }))
  }

  const validate = () => {
    const newErrors: string[] = []

    if (!form.name) newErrors.push(t('workoutsAdmin.validation.nameRequired'))
    if (!form.description)
      newErrors.push(t('workoutsAdmin.validation.descriptionRequired'))
    if (!form.type) newErrors.push(t('workoutsAdmin.validation.typeRequired'))
    if (form.durationSeconds <= 0)
      newErrors.push(t('workoutsAdmin.validation.durationPositive'))
    if (form.level < 0 || form.level > 4)
      newErrors.push(t('workoutsAdmin.validation.levelRange'))
    if (!form.trainerId)
      newErrors.push(t('workoutsAdmin.validation.trainerRequired'))
    if (!form.instructionsAudio)
      newErrors.push(t('workoutsAdmin.validation.instructionsAudioRequired'))
    else if (!isValidUrl(form.instructionsAudio))
      newErrors.push(t('workoutsAdmin.validation.instructionsAudioUrl'))
    if (!form.workoutAudio)
      newErrors.push(t('workoutsAdmin.validation.workoutAudioRequired'))
    else if (!isValidUrl(form.workoutAudio))
      newErrors.push(t('workoutsAdmin.validation.workoutAudioUrl'))
    if (!form.instructionsImage)
      newErrors.push(t('workoutsAdmin.validation.instructionsImageRequired'))
    else if (!isValidUrl(form.instructionsImage))
      newErrors.push(t('workoutsAdmin.validation.instructionsImageUrl'))
    if (!form.workoutImage)
      newErrors.push(t('workoutsAdmin.validation.workoutImageRequired'))
    else if (!isValidUrl(form.workoutImage))
      newErrors.push(t('workoutsAdmin.validation.workoutImageUrl'))

    if (form.instructionsVideo && !isValidUrl(form.instructionsVideo))
      newErrors.push(t('workoutsAdmin.validation.instructionsVideoUrl'))

    const start =
      form.instructionsVideoStart !== ''
        ? Number(form.instructionsVideoStart)
        : null
    const stop =
      form.instructionsVideoStop !== ''
        ? Number(form.instructionsVideoStop)
        : null
    if (start !== null && stop !== null && start >= stop)
      newErrors.push(t('workoutsAdmin.validation.videoStartBeforeStop'))

    setErrors(newErrors)
    return newErrors.length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validate()) return

    setSuccess(false)
    onStatusChange?.(t('workoutsAdmin.toastSaving'), { type: 'info' })

    try {
      await mutateAsync({
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
      })

      setSuccess(true)
      onStatusChange?.(t('workoutsAdmin.toastSaved'), { type: 'success' })

      // optional reset
      // setForm(initialState)
    } catch (err) {
      console.error(err)
      onStatusChange?.(t('workoutsAdmin.toastSaveFailed'), { type: 'error' })
    }
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-(--brand-page) p-6 text-(--brand-ink)">
      <div className="w-full max-w-4xl rounded-2xl border border-(--brand-border) bg-white p-8 shadow-lg">
        <div className="mb-8 flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">
            {t('workoutsAdmin.addWorkoutPageTitle')}
          </h1>
          <button
            type="button"
            onClick={() => {
              onStatusChange?.(t('workoutsAdmin.canceling'), { type: 'info' })
              onBack?.()
            }}
            className="rounded-full border border-(--brand-border) bg-(--brand-surface-glass) px-4 py-2 text-sm font-semibold"
          >
            {t('workoutsAdmin.back')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* Basic Info */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">
              {t('workoutsAdmin.basicInfo')}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.name')} *
                </span>
                <input
                  name="name"
                  placeholder={t('workoutsAdmin.namePlaceholder')}
                  value={form.name}
                  onChange={handleChange}
                  className="rounded-lg border border-(--brand-border) bg-white p-3 focus:ring-2 focus:ring-(--brand-primary) focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.type')} *
                </span>
                <input
                  name="type"
                  placeholder={t('workoutsAdmin.typePlaceholder')}
                  value={form.type}
                  onChange={handleChange}
                  className="rounded-lg border border-(--brand-border) bg-white p-3 focus:ring-2 focus:ring-(--brand-primary) focus:outline-none"
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
                  disabled={trainersLoading}
                  className="rounded-lg border border-(--brand-border) bg-white p-3 focus:ring-2 focus:ring-(--brand-primary) focus:outline-none"
                >
                  <option value="">
                    {trainersLoading
                      ? t('workoutsAdmin.loadingTrainers')
                      : t('workoutsAdmin.chooseTrainer')}
                  </option>
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.name}
                    </option>
                  ))}
                </select>
                {trainersError && (
                  <span className="text-sm text-red-600">{trainersError}</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.level')} *
                </span>
                <input
                  type="number"
                  name="level"
                  value={form.level}
                  onChange={handleChange}
                  min="0"
                  max="4"
                  className="rounded-lg border border-(--brand-border) bg-white p-3"
                />
              </label>

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.duration')} *
                </span>
                <input
                  type="number"
                  name="durationSeconds"
                  value={form.durationSeconds}
                  onChange={handleChange}
                  min="0"
                  className="rounded-lg border border-(--brand-border) bg-white p-3"
                />
              </label>
            </div>
          </div>

          {/* Instructions */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">
              {t('workoutsAdmin.description')}
            </h2>
            <label className="flex flex-col gap-1">
              <span className="text-sm opacity-80">
                {t('workoutsAdmin.description')} *
              </span>
              <textarea
                name="description"
                placeholder={t('workoutsAdmin.descriptionPlaceholder')}
                value={form.description}
                onChange={handleChange}
                className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
              />
            </label>
          </div>

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
          <div>
            <h2 className="mb-1 text-xl font-semibold">
              {t('workoutsAdmin.dashboardSection')}
            </h2>
            <p className="mb-4 text-sm text-(--brand-muted)">
              {t('workoutsAdmin.dashboardSectionHint')}
            </p>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.dashboardName')}
                </span>
                <input
                  name="dashboardName"
                  placeholder={t('workoutsAdmin.dashboardNamePlaceholder')}
                  value={form.dashboardName}
                  onChange={handleChange}
                  className="rounded-lg border border-(--brand-border) bg-white p-3 focus:ring-2 focus:ring-(--brand-primary) focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.dashboardDescription')}
                </span>
                <textarea
                  name="dashboardDescription"
                  placeholder={t(
                    'workoutsAdmin.dashboardDescriptionPlaceholder',
                  )}
                  value={form.dashboardDescription}
                  onChange={handleChange}
                  className="min-h-[120px] rounded-lg border border-(--brand-border) bg-white p-3"
                />
              </label>
            </div>
          </div>

          {/* Media */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">
              {t('workoutsAdmin.media')}
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-sm opacity-80">
                  {t('workoutsAdmin.instructionsAudio')} *
                </span>
                <input
                  name="instructionsAudio"
                  placeholder={t('workoutsAdmin.urlPlaceholder')}
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
                  placeholder={t('workoutsAdmin.urlPlaceholder')}
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
                  placeholder={t('workoutsAdmin.urlPlaceholder')}
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
                  placeholder={t('workoutsAdmin.urlPlaceholder')}
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
          </div>

          {/* Options */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">
              {t('workoutsAdmin.options')}
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  name: 'kneeFriendly',
                  label: t('exercisePanel.kneeFriendly'),
                },
                { name: 'lowImpact', label: t('exercisePanel.lowImpact') },
                { name: 'seated', label: t('exercisePanel.seated') },
                {
                  name: 'beginnerFriendly',
                  label: t('exercisePanel.beginnerFriendly'),
                },
              ].map((item) => (
                <label
                  key={item.name}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-(--brand-border) bg-(--brand-surface-glass) p-3 hover:border-(--brand-primary)"
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
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              {errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          {/* Submit */}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onStatusChange?.(t('workoutsAdmin.canceling'))
                onBack?.()
              }}
              className="rounded-lg border border-(--brand-border) bg-(--brand-surface-glass) px-4 py-3 text-sm font-medium"
            >
              {t('workoutsAdmin.cancel')}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`relative flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-(--brand-on-primary) transition ${
                isSubmitting
                  ? 'cursor-not-allowed bg-(--brand-primary)/60'
                  : 'bg-(--brand-primary) hover:bg-(--brand-primary)/90'
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('workoutsAdmin.saving')}
                </>
              ) : success ? (
                t('workoutsAdmin.saved')
              ) : (
                t('workoutsAdmin.save')
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
