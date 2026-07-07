import { useAuth } from '@clerk/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  createTrainerWithToken,
  deleteTrainerWithToken,
  fetchTrainerByIdWithToken,
  fetchTrainersWithToken,
  updateTrainerWithToken,
} from '../../api/trainers'
import { useToast } from '../../hooks/useToast'
import ConfirmModal from '../../components/ConfirmModal'

type Trainer = {
  id: number
  name: string
  prompt: string
  voice: string
  intro: string
  language: string
  imageSelect?: string | null
  imageCall?: string | null
  imageStart?: string | null
  ambience?: string | null
}

type TrainerForm = {
  name: string
  prompt: string
  voice: string
  intro: string
  language: string
  imageSelect: string
  imageCall: string
  imageStart: string
  ambience: string
}

type TrainerField = keyof TrainerForm
type FieldErrors = Partial<Record<TrainerField, string>>

type Props = {
  searchTerm?: string
}

const emptyForm: TrainerForm = {
  name: '',
  prompt: '',
  voice: '',
  intro: '',
  language: '',
  imageSelect: '',
  imageCall: '',
  imageStart: '',
  ambience: '',
}

function normalizeOptional(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function toForm(trainer: Trainer): TrainerForm {
  return {
    name: trainer.name ?? '',
    prompt: trainer.prompt ?? '',
    voice: trainer.voice ?? '',
    intro: trainer.intro ?? '',
    language: trainer.language ?? '',
    imageSelect: trainer.imageSelect ?? '',
    imageCall: trainer.imageCall ?? '',
    imageStart: trainer.imageStart ?? '',
    ambience: trainer.ambience ?? '',
  }
}

export default function TrainerAdminPage({ searchTerm = '' }: Props) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()
  const { toast, showToast } = useToast()
  const { t } = useTranslation()

  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState<TrainerForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    data: trainers = [],
    isLoading,
    isError,
    error,
  } = useQuery<Trainer[]>({
    queryKey: ['admin-trainers'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return fetchTrainersWithToken(token)
    },
  })

  const normalizedSearch = searchTerm.trim().toLowerCase()

  const filteredTrainers = useMemo(() => {
    const sorted = [...trainers].sort((a, b) =>
      (a.name ?? '').localeCompare(b.name ?? ''),
    )
    if (!normalizedSearch) return sorted
    return sorted.filter(
      (t) =>
        t.name?.toLowerCase().includes(normalizedSearch) ||
        t.language?.toLowerCase().includes(normalizedSearch) ||
        t.voice?.toLowerCase().includes(normalizedSearch),
    )
  }, [trainers, normalizedSearch])

  const selectedTrainer = useMemo(
    () => trainers.find((t) => t.id === selectedId) ?? null,
    [trainers, selectedId],
  )

  const prevFilteredRef = useRef<typeof filteredTrainers>(filteredTrainers)

  // Sync selected trainer when filter changes
  useEffect(() => {
    // Check if filtered list changed
    const listChanged =
      filteredTrainers.length !== prevFilteredRef.current.length ||
      filteredTrainers.some(
        (t) => !prevFilteredRef.current.some((prev) => prev.id === t.id),
      )

    prevFilteredRef.current = filteredTrainers

    if (!listChanged) return

    // List changed, compute new selection
    let newSelection: number | null = null

    if (filteredTrainers.length > 0) {
      // If current selection is valid, keep it
      if (
        selectedId !== null &&
        filteredTrainers.some((t) => t.id === selectedId)
      ) {
        newSelection = selectedId
      } else {
        // Otherwise select first trainer
        newSelection = filteredTrainers[0].id
      }
    }

    // Only update if selection actually changed
    if (newSelection !== selectedId) {
      setSelectedId(newSelection)
    }
  }, [filteredTrainers, selectedId])

  // Load trainer data when switching to edit
  useEffect(() => {
    if (mode !== 'edit' || selectedId == null) return
    let active = true

    async function load() {
      try {
        const token = await getToken()
        if (!token) throw new Error('Missing Clerk token')
        const data = (await fetchTrainerByIdWithToken(
          selectedId!,
          token,
        )) as Trainer
        if (!active) return
        setForm(toForm(data))
      } catch (err) {
        if (!active) return
        showToast((err as Error).message || t('trainerAdmin.toastLoadFailed'), {
          type: 'error',
        })
        setMode('view')
      }
    }

    load()
    return () => {
      active = false
    }
  }, [mode, selectedId, getToken, showToast])

  // (no pending delete timer needed — deletion is immediate after confirm modal)

  const createMutation = useMutation({
    mutationFn: async (payload: TrainerForm) => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return createTrainerWithToken(
        {
          ...payload,
          imageSelect: normalizeOptional(payload.imageSelect),
          imageCall: normalizeOptional(payload.imageCall),
          imageStart: normalizeOptional(payload.imageStart),
          ambience: normalizeOptional(payload.ambience),
        },
        token,
      )
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['admin-trainers'] })
      setSubmitError(null)
      const createdId = (saved as Trainer)?.id
      if (typeof createdId === 'number') setSelectedId(createdId)
      setMode('view')
      showToast(t('trainerAdmin.toastCreated'), { type: 'success' })
    },
    onError: (err) => {
      const msg = (err as Error).message || t('trainerAdmin.toastSaveFailed')
      setSubmitError(msg)
      showToast(msg, { type: 'error' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number
      payload: TrainerForm
    }) => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return updateTrainerWithToken(
        id,
        {
          ...payload,
          imageSelect: normalizeOptional(payload.imageSelect),
          imageCall: normalizeOptional(payload.imageCall),
          imageStart: normalizeOptional(payload.imageStart),
          ambience: normalizeOptional(payload.ambience),
        },
        token,
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-trainers'] })
      setSubmitError(null)
      setMode('view')
      showToast(t('trainerAdmin.toastUpdated'), { type: 'success' })
    },
    onError: (err) => {
      const msg = (err as Error).message || t('trainerAdmin.toastUpdateFailed')
      setSubmitError(msg)
      showToast(msg, { type: 'error' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken()
      if (!token) throw new Error('Missing Clerk token')
      return deleteTrainerWithToken(id, token)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-trainers'] })
      setMode('view')
      showToast(t('trainerAdmin.toastDeleted'), { type: 'success' })
    },
    onError: (err) => {
      showToast((err as Error).message || t('trainerAdmin.toastDeleteFailed'), {
        type: 'error',
      })
    },
  })

  const validate = () => {
    const next: FieldErrors = {}
    if (!form.name.trim()) next.name = t('trainerAdmin.validation.nameRequired')
    if (!form.prompt.trim())
      next.prompt = t('trainerAdmin.validation.promptRequired')
    if (!form.voice.trim())
      next.voice = t('trainerAdmin.validation.voiceRequired')
    if (!form.intro.trim())
      next.intro = t('trainerAdmin.validation.introRequired')
    if (!form.language.trim())
      next.language = t('trainerAdmin.validation.languageRequired')
    if (form.imageSelect.trim() && !isHttpUrl(form.imageSelect.trim()))
      next.imageSelect = t('trainerAdmin.validation.httpsUrlRequired')
    if (form.imageCall.trim() && !isHttpUrl(form.imageCall.trim()))
      next.imageCall = t('trainerAdmin.validation.httpsUrlRequired')
    if (form.imageStart.trim() && !isHttpUrl(form.imageStart.trim()))
      next.imageStart = t('trainerAdmin.validation.httpsUrlRequired')
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const onFormChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name as TrainerField]: undefined }))
  }

  const openCreate = () => {
    setMode('create')
    setForm(emptyForm)
    setFieldErrors({})
    setSubmitError(null)
  }

  const openEdit = () => {
    if (selectedTrainer == null) return
    setMode('edit')
    setForm(toForm(selectedTrainer))
    setFieldErrors({})
    setSubmitError(null)
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)
    if (!validate()) return
    showToast(t('trainerAdmin.saving'), { type: 'info' })
    if (mode === 'edit' && selectedId != null) {
      await updateMutation.mutateAsync({ id: selectedId, payload: form })
    } else {
      await createMutation.mutateAsync(form)
    }
  }

  if (isLoading) {
    return <p className="text-sm text-[#6f6a93]">{t('trainerAdmin.loading')}</p>
  }

  if (isError) {
    return <p className="text-sm text-red-500">{(error as Error).message}</p>
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <section className="space-y-4">
      {/* Toast */}
      {toast && (
        <div
          className={`pointer-events-none fixed top-6 right-6 z-20 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-[#100b2f] text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && selectedTrainer != null && (
        <ConfirmModal
          open={true}
          title={t('trainerAdmin.deleteTitle')}
          body={t('trainerAdmin.deleteBody', { name: selectedTrainer.name })}
          requireTyping="DELETE"
          confirmLabel={t('trainerAdmin.deleteConfirm')}
          cancelLabel={t('trainerAdmin.cancel')}
          onConfirm={() => {
            setConfirmDelete(false)
            deleteMutation.mutate(selectedTrainer.id)
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#100b2f]">
            {t('trainerAdmin.title')}
          </h2>
          <p className="text-sm text-[#6f6a93]">{t('trainerAdmin.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-[#5836d6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4527b8] active:scale-95"
        >
          {t('trainerAdmin.addTrainer')}
        </button>
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* List */}
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-[#ece5ff] bg-white shadow-sm">
            {filteredTrainers.map((trainer) => (
              <article
                key={trainer.id}
                onClick={() => {
                  setSelectedId(trainer.id)
                  if (mode === 'create') setMode('view')
                }}
                className={`cursor-pointer border-b border-[#f3eeff] p-4 transition last:border-b-0 ${
                  selectedId === trainer.id
                    ? 'bg-[#f3eeff]'
                    : 'bg-white hover:bg-[#faf8ff]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#ece5ff]">
                    {trainer.imageSelect ? (
                      <img
                        src={trainer.imageSelect}
                        alt={trainer.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl">
                        🧑‍🏫
                      </div>
                    )}
                    {selectedId === trainer.id && (
                      <div className="absolute inset-0 rounded-lg ring-2 ring-[#5836d6]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#100b2f]">
                      {trainer.name || t('trainerAdmin.unnamedTrainer')}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#9b96b8]">
                      {trainer.language && (
                        <span className="rounded-full bg-[#ede9ff] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#5836d6] uppercase">
                          {trainer.language}
                        </span>
                      )}
                      <span>
                        {t('trainerAdmin.voiceLabel')}: {trainer.voice || '-'}
                      </span>
                    </div>
                  </div>

                  {selectedId === trainer.id && (
                    <div className="h-2 w-2 shrink-0 rounded-full bg-[#5836d6]" />
                  )}
                </div>
              </article>
            ))}

            {filteredTrainers.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <span className="text-3xl">🔍</span>
                <p className="text-sm font-semibold text-[#100b2f]">
                  {t('trainerAdmin.noTrainersFound')}
                </p>
                <p className="text-xs text-[#9b96b8]">
                  {t('trainerAdmin.tryDifferentSearch')}
                </p>
              </div>
            )}
          </div>

          <p className="px-1 text-xs text-[#9b96b8]">
            {t('trainerAdmin.resultsCount', {
              count: filteredTrainers.length,
              search: normalizedSearch ? searchTerm.trim() : '',
            })}
          </p>
        </div>

        {/* Side panel */}
        <aside className="h-fit rounded-2xl border border-[#ece5ff] bg-white shadow-sm lg:sticky lg:top-5">
          {/* Detail view */}
          {mode === 'view' && selectedTrainer != null && (
            <div className="space-y-0">
              <div className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-t-2xl bg-[#ece5ff]">
                {selectedTrainer.imageSelect ? (
                  <img
                    src={selectedTrainer.imageSelect}
                    alt={selectedTrainer.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-5xl">🧑‍🏫</span>
                )}
                <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent" />
                <button
                  type="button"
                  onClick={openEdit}
                  className="absolute top-3 right-3 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-[#5836d6] shadow-sm backdrop-blur-sm transition hover:bg-white"
                >
                  {t('trainerAdmin.edit')}
                </button>
                {selectedTrainer.language && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-[#5836d6] px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase">
                    {selectedTrainer.language}
                  </span>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <h3 className="text-xl font-bold text-[#100b2f]">
                    {selectedTrainer.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#9b96b8]">
                    {t('trainerAdmin.trainerId', { id: selectedTrainer.id })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[#ece5ff] bg-[#faf8ff] p-3">
                    <p className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                      {t('trainerAdmin.language')}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-[#100b2f]">
                      {selectedTrainer.language || '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#ece5ff] bg-[#faf8ff] p-3">
                    <p className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                      {t('trainerAdmin.voice')}
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-[#100b2f]">
                      {selectedTrainer.voice || '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#ece5ff] bg-[#faf8ff] px-4 py-3">
                  <span className="shrink-0 text-xl">
                    {selectedTrainer.intro ? '🎵' : '🔇'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                      {t('trainerAdmin.introAudio')}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-[#100b2f]">
                      {selectedTrainer.intro
                        ? t('trainerAdmin.configured')
                        : t('trainerAdmin.notSet')}
                    </p>
                  </div>
                </div>

                {selectedTrainer.prompt && (
                  <div>
                    <p className="mb-1.5 text-[10px] font-bold tracking-wider text-[#b0a8d0] uppercase">
                      {t('trainerAdmin.systemPrompt')}
                    </p>
                    <p className="line-clamp-3 text-xs leading-relaxed text-[#6f6a93]">
                      {selectedTrainer.prompt}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={openEdit}
                  className="w-full rounded-xl bg-[#5836d6] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4527b8] active:scale-[0.98]"
                >
                  {t('trainerAdmin.editTrainer')}
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          {(mode === 'create' || mode === 'edit') && (
            <form onSubmit={onSubmit} className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#100b2f]">
                  {mode === 'create'
                    ? t('trainerAdmin.newTrainer')
                    : t('trainerAdmin.editTrainer')}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setMode('view')
                    setFieldErrors({})
                    setSubmitError(null)
                  }}
                  className="rounded-full border border-[#ece5ff] px-3 py-1 text-xs font-semibold text-[#6f6a93] transition hover:border-[#5836d6] hover:text-[#5836d6]"
                >
                  {t('trainerAdmin.close')}
                </button>
              </div>

              {submitError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                  {t('trainerAdmin.warningPrefix')} {submitError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('trainerAdmin.name')}
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={onFormChange}
                    placeholder={t('trainerAdmin.namePlaceholder')}
                    className={`w-full rounded-xl border p-2.5 text-sm transition outline-none focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20 ${
                      fieldErrors.name ? 'border-red-400' : 'border-[#ece5ff]'
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[10px] text-red-500">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('trainerAdmin.language')}
                  </label>
                  <input
                    name="language"
                    value={form.language}
                    onChange={onFormChange}
                    placeholder={t('trainerAdmin.languagePlaceholder')}
                    className={`w-full rounded-xl border p-2.5 text-sm transition outline-none focus:border-[#5836d6] ${
                      fieldErrors.language
                        ? 'border-red-400'
                        : 'border-[#ece5ff]'
                    }`}
                  />
                  {fieldErrors.language && (
                    <p className="text-[10px] text-red-500">
                      {fieldErrors.language}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('trainerAdmin.voice')}
                  </label>
                  <input
                    name="voice"
                    value={form.voice}
                    onChange={onFormChange}
                    placeholder={t('trainerAdmin.voicePlaceholder')}
                    className={`w-full rounded-xl border p-2.5 text-sm transition outline-none focus:border-[#5836d6] ${
                      fieldErrors.voice ? 'border-red-400' : 'border-[#ece5ff]'
                    }`}
                  />
                  {fieldErrors.voice && (
                    <p className="text-[10px] text-red-500">
                      {fieldErrors.voice}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6f6a93]">
                    {t('trainerAdmin.intro')}
                  </label>
                  <input
                    name="intro"
                    value={form.intro}
                    onChange={onFormChange}
                    placeholder={t('trainerAdmin.introPlaceholder')}
                    className={`w-full rounded-xl border p-2.5 text-sm transition outline-none focus:border-[#5836d6] ${
                      fieldErrors.intro ? 'border-red-400' : 'border-[#ece5ff]'
                    }`}
                  />
                  {fieldErrors.intro && (
                    <p className="text-[10px] text-red-500">
                      {fieldErrors.intro}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('trainerAdmin.ambience')}
                </label>
                <input
                  name="ambience"
                  value={form.ambience}
                  onChange={onFormChange}
                  placeholder={t('trainerAdmin.ambiencePlaceholder')}
                  className="w-full rounded-xl border border-[#ece5ff] p-2.5 text-sm transition outline-none focus:border-[#5836d6]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#6f6a93]">
                  {t('trainerAdmin.prompt')}
                </label>
                <textarea
                  name="prompt"
                  value={form.prompt}
                  onChange={onFormChange}
                  placeholder={t('trainerAdmin.promptPlaceholder')}
                  className={`min-h-24 w-full rounded-xl border p-2.5 text-sm transition outline-none focus:border-[#5836d6] focus:ring-1 focus:ring-[#5836d6]/20 ${
                    fieldErrors.prompt ? 'border-red-400' : 'border-[#ece5ff]'
                  }`}
                />
                {fieldErrors.prompt && (
                  <p className="text-[10px] text-red-500">
                    {fieldErrors.prompt}
                  </p>
                )}
              </div>

              <details className="rounded-xl border border-[#ece5ff]">
                <summary className="cursor-pointer px-3 py-2.5 text-xs font-semibold text-[#5836d6]">
                  {t('trainerAdmin.imageUrls')}
                </summary>
                <div className="space-y-3 px-3 pb-3">
                  {(
                    [
                      ['imageSelect', t('trainerAdmin.imageSelectUrl')],
                      ['imageCall', t('trainerAdmin.imageCallUrl')],
                      ['imageStart', t('trainerAdmin.imageStartUrl')],
                    ] as [TrainerField, string][]
                  ).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <label className="text-xs font-semibold text-[#6f6a93]">
                        {label}
                      </label>
                      <input
                        name={field}
                        value={form[field] as string}
                        onChange={onFormChange}
                        placeholder={t('trainerAdmin.urlPlaceholder')}
                        className={`w-full rounded-xl border p-2.5 text-sm transition outline-none focus:border-[#5836d6] ${
                          fieldErrors[field]
                            ? 'border-red-400'
                            : 'border-[#ece5ff]'
                        }`}
                      />
                      {fieldErrors[field] && (
                        <p className="text-[10px] text-red-500">
                          {fieldErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </details>

              <div className="flex items-center gap-2 pt-1">
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-100"
                  >
                    {t('trainerAdmin.delete')}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-[#5836d6] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4527b8] active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? t('trainerAdmin.saving') : t('trainerAdmin.save')}
                </button>
              </div>
            </form>
          )}

          {mode === 'view' && selectedTrainer == null && (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="text-4xl">👆</span>
              <p className="text-sm font-semibold text-[#100b2f]">
                {t('trainerAdmin.selectTrainer')}
              </p>
              <p className="text-xs text-[#9b96b8]">
                {t('trainerAdmin.clickRowHint')}
              </p>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
