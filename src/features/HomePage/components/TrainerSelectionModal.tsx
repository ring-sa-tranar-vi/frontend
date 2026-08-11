import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@clerk/react'
import { useQuery } from '@tanstack/react-query'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader,
  Square,
  UserRound,
  Volume2,
} from 'lucide-react'
import { fetchTrainersWithToken } from '../../../api/trainers'
import { useVoicePlayer } from '../../../hooks/useVoicePlayer'
import { useTranslation } from 'react-i18next'
import {
  appSheetFieldClass,
  appSheetFormFieldClass,
  appSheetContentClass,
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
} from '../../../components/AppSheet'
import {
  getStoredLanguageFilter,
  setStoredLanguageFilter,
} from '../trainerPreference'

export type TrainerSelectionItem = {
  id: number
  name: string
  imageSelect?: string | null
  imageStart?: string | null
  voice?: string
  intro?: string | null
  language?: string
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length
}

function getBundledLocalTrainerImage(source?: string | null) {
  if (!import.meta.env.DEV || !source || typeof window === 'undefined') {
    return null
  }

  try {
    const segments = new URL(source, window.location.origin).pathname
      .split('/')
      .filter(Boolean)
    const trainerSegmentIndex = segments.lastIndexOf('trainers')
    const trainerSlug = segments[trainerSegmentIndex + 1]

    if (!trainerSlug || !/^[a-z0-9-]+$/i.test(trainerSlug)) {
      return null
    }

    return `/start-page/${trainerSlug}-start.webp`
  } catch {
    return null
  }
}

export default function TrainerSelectionModal({
  onTrainerSelect,
  selectedTrainerId,
  trainersOverride,
}: {
  onTrainerSelect?: (trainerId: number) => void
  selectedTrainerId?: number | null
  trainersOverride?: readonly TrainerSelectionItem[]
}) {
  const { getToken, isSignedIn } = useAuth()
  const { play, stop, loadingId, playingId } = useVoicePlayer()
  const { t } = useTranslation()

  const {
    data: fetchedTrainers = [],
    isLoading: isFetchingTrainers,
    isError: didTrainerFetchFail,
  } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return fetchTrainersWithToken(token)
    },
    enabled: trainersOverride === undefined && isSignedIn === true,
    refetchOnWindowFocus: false,
  })
  const trainers = useMemo(
    () => (trainersOverride ?? fetchedTrainers) as TrainerSelectionItem[],
    [fetchedTrainers, trainersOverride],
  )
  const isLoading = trainersOverride === undefined && isFetchingTrainers
  const isError = trainersOverride === undefined && didTrainerFetchFail

  const [activeLanguages, setActiveLanguages] = useState<string[]>(
    () => getStoredLanguageFilter() ?? [],
  )

  // Carousel state
  const [centerIndex, setCenterIndex] = useState(0)
  // trackOffset: -100 = showing center, -200 = showing next, 0 = showing prev
  const [trackOffset, setTrackOffset] = useState(-100)
  const [transitionEnabled, setTransitionEnabled] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragX, setDragX] = useState(0)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isHorizontalSwipe = useRef<boolean | null>(null)
  const isSnappingBack = useRef(false)
  const hasInitialisedFilter = useRef(false)

  const allLanguages = useMemo(() => {
    const langs = (trainers as TrainerSelectionItem[])
      .map((t) => t.language)
      .filter((l): l is string => typeof l === 'string' && l.trim() !== '')
    return Array.from(new Set(langs))
  }, [trainers])

  useEffect(() => {
    if (allLanguages.length === 0 || hasInitialisedFilter.current) return
    hasInitialisedFilter.current = true
    const stored = getStoredLanguageFilter()
    const selectedTrainerLanguage = trainers.find(
      (trainer) => trainer.id === selectedTrainerId,
    )?.language
    const storedLanguage = stored?.find((language) =>
      allLanguages.includes(language),
    )
    const defaultLanguage = allLanguages.find((language) =>
      /sv|svenska|en|english|engelska/i.test(language),
    )
    const nextLanguage =
      selectedTrainerLanguage ??
      storedLanguage ??
      defaultLanguage ??
      allLanguages[0]

    setActiveLanguages([nextLanguage])
    setStoredLanguageFilter([nextLanguage])
  }, [allLanguages, selectedTrainerId, trainers])

  const filteredTrainers = useMemo(() => {
    if (activeLanguages.length === 0) return trainers as TrainerSelectionItem[]
    return (trainers as TrainerSelectionItem[]).filter(
      (t) =>
        typeof t.language === 'string' && activeLanguages.includes(t.language),
    )
  }, [trainers, activeLanguages])

  // When filtered list changes, snap to selected trainer without animation
  useEffect(() => {
    const idx = filteredTrainers.findIndex((t) => t.id === selectedTrainerId)
    setTransitionEnabled(false)
    setCenterIndex(idx >= 0 ? idx : 0)
    setTrackOffset(-100)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionEnabled(true))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTrainers])

  const n = filteredTrainers.length
  const prevItem = n > 0 ? filteredTrainers[wrap(centerIndex - 1, n)] : null
  const centerItem = n > 0 ? filteredTrainers[centerIndex] : null
  const nextItem = n > 0 ? filteredTrainers[wrap(centerIndex + 1, n)] : null

  const navigate = (direction: 1 | -1) => {
    if (isAnimating || n <= 1) return
    setIsAnimating(true)
    setTrackOffset(direction === 1 ? -200 : 0)
  }

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName !== 'transform') return

    // Snap-back (user dragged but didn't swipe far enough)
    if (isSnappingBack.current) {
      isSnappingBack.current = false
      return
    }

    if (!isAnimating) return

    const direction = trackOffset === -200 ? 1 : -1

    // Instantly reset position and advance center — no visible jump
    setTransitionEnabled(false)
    setTrackOffset(-100)
    setCenterIndex((prev) => wrap(prev + direction, n))
    setIsAnimating(false)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTransitionEnabled(true))
    })
  }

  const selectLanguage = (language: string) => {
    setActiveLanguages([language])
    setStoredLanguageFilter([language])
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isHorizontalSwipe.current = null
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current
    if (
      isHorizontalSwipe.current === null &&
      (Math.abs(dx) > 5 || Math.abs(dy) > 5)
    ) {
      isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy)
    }
    if (isHorizontalSwipe.current) {
      setIsDragging(true)
      setDragX(dx)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    const wasHorizontal = isHorizontalSwipe.current
    touchStartX.current = null
    touchStartY.current = null
    isHorizontalSwipe.current = null
    setIsDragging(false)
    setDragX(0)

    if (wasHorizontal && Math.abs(delta) > 55) {
      navigate(delta < 0 ? 1 : -1)
    } else if (wasHorizontal) {
      // Snap back with transition
      isSnappingBack.current = true
    }
  }

  if (isSignedIn === false && trainersOverride === undefined) {
    return (
      <section aria-labelledby="trainer-selection-title">
        <AppSheetNotice>{t('trainerSelection.notLoggedIn')}</AppSheetNotice>
      </section>
    )
  }

  const trackStyle: React.CSSProperties = {
    transform: isDragging
      ? `translateX(calc(-100% + ${dragX}px))`
      : `translateX(${trackOffset}%)`,
    transition:
      transitionEnabled && !isDragging
        ? 'transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94)'
        : 'none',
    willChange: 'transform',
  }

  return (
    <section
      aria-labelledby="trainer-selection-title"
      className={`space-y-4 ${appSheetContentClass}`}
    >
      {isLoading ? (
        <AppSheetNotice>{t('trainerSelection.loading')}</AppSheetNotice>
      ) : isError ? (
        <AppSheetNotice tone="danger">
          {t('trainerSelection.fetchError')}
        </AppSheetNotice>
      ) : trainers.length > 0 ? (
        <div>
          {/* Header */}
          <div className="flex items-start gap-3 text-(--brand-primary-deep)">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--menu-choice-bg) text-(--brand-primary)">
              <UserRound size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div id="trainer-selection-title">
                <AppSheetSectionTitle>
                  {t('trainerSelection.title')}
                </AppSheetSectionTitle>
              </div>
              <AppSheetSectionText>
                {t('trainerSelection.description')}
              </AppSheetSectionText>
            </div>
          </div>

          {/* Language filter */}
          {allLanguages.length > 1 && (
            <div className="mt-3 ml-[52px]">
              <label
                htmlFor="trainer-language-filter"
                className="mb-2 block text-[length:var(--text-sm)] font-extrabold text-(--brand-title-ink)"
              >
                {t('trainerSelection.trainerLanguages')}
              </label>
              <select
                id="trainer-language-filter"
                value={activeLanguages[0] ?? ''}
                onChange={(event) => selectLanguage(event.target.value)}
                className={appSheetFormFieldClass}
              >
                {allLanguages.map((language) => (
                  <option key={language} value={language}>
                    {t(`languages.${language}`, { defaultValue: language })}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* No trainers after filter */}
          {n === 0 && (
            <div className="mt-3">
              <AppSheetNotice>
                {t('trainerSelection.noTrainersForFilter')}
              </AppSheetNotice>
            </div>
          )}

          {/* Carousel */}
          {centerItem && (
            <div className="relative mt-4">
              {n === 1 ? (
                <div className="overflow-hidden rounded-2xl border border-(--menu-category-border)">
                  <TrainerCard
                    trainer={centerItem}
                    isSelected={centerItem.id === selectedTrainerId}
                    playingId={playingId}
                    loadingId={loadingId}
                    onPlay={() => play(String(centerItem.id), centerItem.intro)}
                    onStop={stop}
                    onSelect={() => {
                      stop()
                      onTrainerSelect?.(centerItem.id)
                    }}
                    showAudioPreview={trainersOverride === undefined}
                    t={t}
                  />
                </div>
              ) : (
                <>
                  <div
                    className="overflow-hidden rounded-2xl border border-(--menu-category-border)"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div
                      className="flex"
                      style={trackStyle}
                      onTransitionEnd={handleTransitionEnd}
                    >
                      {[prevItem, centerItem, nextItem].map((trainer, slot) => (
                        <div
                          key={`${slot}-${trainer?.id ?? 'empty'}`}
                          className="w-full shrink-0"
                          aria-hidden={slot !== 1}
                        >
                          {trainer ? (
                            <TrainerCard
                              trainer={trainer}
                              isSelected={trainer.id === selectedTrainerId}
                              playingId={playingId}
                              loadingId={loadingId}
                              onPlay={() =>
                                play(String(trainer.id), trainer.intro)
                              }
                              onStop={stop}
                              onSelect={() => {
                                stop()
                                onTrainerSelect?.(trainer.id)
                              }}
                              showAudioPreview={trainersOverride === undefined}
                              t={t}
                            />
                          ) : (
                            <div className="aspect-[8/9] bg-(--menu-choice-bg)" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="absolute top-1/2 left-2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-(--brand-primary) bg-(--menu-control-bg) text-(--brand-primary) transition active:scale-95"
                    aria-label={t('trainerSelection.previousTrainer')}
                  >
                    <ChevronLeft size={20} strokeWidth={2.2} />
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(1)}
                    className="absolute top-1/2 right-2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl border border-(--brand-primary) bg-(--menu-control-bg) text-(--brand-primary) transition active:scale-95"
                    aria-label={t('trainerSelection.nextTrainer')}
                  >
                    <ChevronRight size={20} strokeWidth={2.2} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <AppSheetNotice>{t('trainerSelection.noTrainers')}</AppSheetNotice>
      )}
    </section>
  )
}

// Separate component so React can key each slot independently
function TrainerCard({
  trainer,
  isSelected,
  playingId,
  loadingId,
  onPlay,
  onStop,
  onSelect,
  showAudioPreview,
  t,
}: {
  trainer: TrainerSelectionItem
  isSelected: boolean
  playingId: string | null
  loadingId: string | null
  onPlay: () => void
  onStop: () => void
  onSelect: () => void
  showAudioPreview: boolean
  t: (key: string) => string
}) {
  const id = String(trainer.id)
  const isPlaying = playingId === id
  const isLoading = loadingId === id
  const [useBundledFallback, setUseBundledFallback] = useState(false)
  const [imageUnavailable, setImageUnavailable] = useState(false)
  const bundledFallback = getBundledLocalTrainerImage(
    trainer.imageStart ?? trainer.imageSelect,
  )
  const imageSource =
    useBundledFallback || !trainer.imageSelect
      ? bundledFallback
      : trainer.imageSelect

  return (
    <div className="relative aspect-[8/9] overflow-hidden bg-(--menu-choice-bg)">
      {/* Image — left half, full height */}
      {imageSource && !imageUnavailable ? (
        <img
          src={imageSource}
          alt={trainer.name}
          loading="lazy"
          draggable={false}
          onError={() => {
            if (
              !useBundledFallback &&
              bundledFallback &&
              imageSource !== bundledFallback
            ) {
              setUseBundledFallback(true)
              return
            }

            setImageUnavailable(true)
          }}
          className="absolute bottom-0 left-0 h-full w-1/2 object-contain object-bottom select-none"
        />
      ) : (
        <div className="absolute bottom-0 left-0 flex h-full w-1/2 items-end justify-center pb-4 text-(--brand-muted)">
          <UserRound size={80} strokeWidth={1.2} />
        </div>
      )}

      {/* Top-right: name, title, language, selected indicator */}
      <div className="absolute top-0 right-0 w-1/2 px-3 pt-3 text-right">
        <h3
          className="menu-card-title line-clamp-2 min-h-10 text-(--brand-title-ink)"
          title={trainer.name}
        >
          {trainer.name}
        </h3>
        <p className="menu-card-meta text-(--brand-body-ink)">
          {t('trainerSelection.trainerTitle')}
        </p>
        {trainer.language && (
          <p className="menu-card-meta">{t(`languages.${trainer.language}`)}</p>
        )}
        {isSelected && (
          <div className="mt-2 flex justify-end">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-primary-deep) text-(--brand-on-primary)">
              <Check size={18} strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom-right: buttons — 65% card width */}
      <div className="absolute right-0 bottom-0 w-[65%] space-y-1.5 px-3 pb-3">
        {/* Preview audio */}
        {showAudioPreview ? (
          <button
            type="button"
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading}
            className={`flex min-h-11 w-full items-center justify-center gap-1.5 ${appSheetFieldClass} px-2 py-2 text-[length:var(--text-sm)] font-extrabold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              isPlaying
                ? 'border-(--brand-danger-border) bg-(--brand-danger-surface) text-(--brand-danger-ink-muted)'
                : 'text-(--brand-title-ink)'
            }`}
          >
            {isLoading ? (
              <>
                <Loader size={14} className="animate-spin" />
                {t('trainerSelection.loadingAudio')}
              </>
            ) : isPlaying ? (
              <>
                <Square size={13} className="fill-current" />
                {t('trainerSelection.stopAudio')}
              </>
            ) : (
              <>
                <Volume2 size={14} />
                {t('trainerSelection.listenAudio')}
              </>
            )}
          </button>
        ) : null}

        {/* Select / selected */}
        {isSelected ? (
          <p className="flex min-h-11 w-full items-center justify-center gap-1 py-2 text-center text-[length:var(--text-sm)] font-extrabold text-(--brand-primary-deep)">
            <Check size={14} strokeWidth={3} />
            {t('trainerSelection.selected')}
          </p>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="flex min-h-11 w-full items-center justify-center rounded-xl bg-(--brand-primary) px-2 py-2.5 text-[length:var(--text-sm)] font-extrabold text-(--brand-on-primary) transition active:scale-95"
          >
            {t('trainerSelection.selectButton')}
          </button>
        )}
      </div>
    </div>
  )
}
