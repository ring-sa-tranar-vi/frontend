import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@clerk/react'
import { useCreateWorkout } from '../../hooks/useCreateWorkoutHook'
import type { StatusFn, WorkoutForm } from './types.ts'

type Props = {
  onBack?: () => void
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

export default function AddWorkoutPage({ onBack, onStatusChange }: Props) {
  const { t } = useTranslation()
  const { getToken } = useAuth()
  const [form, setForm] = useState<WorkoutForm>({
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
  })
  const { mutateAsync, isPending } = useCreateWorkout(getToken)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState(false)
  const isSubmitting = isPending

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target

    let newValue = type === 'number' ? Number(value) : value

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
    if (form.level < 1 || form.level > 5)
      newErrors.push(t('workoutsAdmin.validation.levelRange'))
    if (!isValidUrl(form.image))
      newErrors.push(t('workoutsAdmin.validation.workoutImageUrl'))
    if (!isValidUrl(form.video))
      newErrors.push(t('workoutsAdmin.validation.instructionsVideoUrl'))

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
        instructions: form.instructions || null,
        guidance: form.guidance || null,
        level: form.level,
        type: form.type,
        image: form.image || null,
        video: form.video || null,
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
                  {t('workoutsAdmin.workoutImage')}
                </span>
                <input
                  name="image"
                  placeholder={t('workoutsAdmin.urlPlaceholder')}
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
