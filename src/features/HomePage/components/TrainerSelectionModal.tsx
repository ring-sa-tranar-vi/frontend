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
  AppSheetNotice,
  AppSheetSectionText,
  AppSheetSectionTitle,
} from '../../../components/AppSheet'
import {
  getStoredLanguageFilter,
  setStoredLanguageFilter,
} from '../trainerPreference'
import { guestTrainerOptions } from './menu/guestTrainerData'

export type TrainerSelectionItem = {
  id: number
  name: string
  imageSelect?: string | null
  voice?: string
  intro?: string | null
  language?: string
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length
}

function getLocalTrainerImage(trainerId: number) {
  return guestTrainerOptions.find((trainer) => trainer.id === trainerId)
    ?.imageSelect
}

function withLocalImageFallback(
  trainer: TrainerSelectionItem,
): TrainerSelectionItem {
  const image = trainer.imageSelect?.trim()

  if (image && /^(?:https?:|data:|blob:|\/)/i.test(image)) {
    return trainer
  }

  const fallbackImage = getLocalTrainerImage(trainer.id)

  return fallbackImage ? { ...trainer, imageSelect: fallbackImage } : trainer
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
    () =>
      (trainersOverride ?? fetchedTrainers).map(
        (trainer: TrainerSelectionItem) => withLocalImageFallback(trainer),
      ),
    [fetchedTrainers, trainersOverride],
  )
  const isLoading = trainersOverride === undefined && isFetchingTrainers
  const isError = trainersOverride === undefined && didTrainerFetchFail

  const [activeLanguages, setActiveLanguages] = useState<string[]>(
    () => getStoredLanguageFilter() ?? [],
  )
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

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
    if (stored !== null && stored.length > 0) {
      const valid = stored.filter((l) => allLanguages.includes(l))
      setActiveLanguages(valid.length > 0 ? valid : allLanguages)
    } else {
      const defaults = allLanguages.filter((l) =>
        /sv|svenska|en|english|engelska/i.test(l),
      )
      setActiveLanguages(defaults.length > 0 ? defaults : allLanguages)
    }
  }, [allLanguages])

  useEffect(() => {
    if (!filterOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [filterOpen])

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

  const toggleLanguage = (lang: string) => {
    setActiveLanguages((prev) => {
      let next = prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang]
      if (next.length === 0) next = allLanguages
      setStoredLanguageFilter(next)
      return next
    })
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
    <section aria-labelledby="trainer-selection-title" className="space-y-4">
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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-(--brand-surface) text-(--brand-primary)">
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

          {/* Language filter — summary + popover */}
          {allLanguages.length > 1 && (
            <div ref={filterRef} className="relative mt-2 ml-[52px]">
              <div className="flex items-center gap-2">
                <span className="text-[length:var(--text-xs)] font-semibold text-(--brand-body-ink)">
                  {activeLanguages.length > 0
                    ? activeLanguages
                        .map((l) => t(`languages.${l}`, { defaultValue: l }))
                        .join(', ')
                    : t('trainerSelection.allLanguages')}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className="rounded-lg border border-(--brand-border-field) bg-(--brand-surface) px-2.5 py-1 text-[length:var(--text-xs)] font-extrabold text-(--brand-primary) transition hover:bg-(--brand-soft) active:scale-95"
                >
                  {t('trainerSelection.changeFilter')}
                </button>
              </div>

              {filterOpen && (
                <div className="absolute top-full left-0 z-10 mt-2 min-w-[180px] space-y-1 rounded-2xl border border-(--brand-border-field) bg-(--brand-surface) p-3 shadow-lg">
                  {allLanguages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition hover:bg-(--brand-soft) active:scale-[0.98]"
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border-2 transition ${
                          activeLanguages.includes(lang)
                            ? 'border-(--brand-primary) bg-(--brand-primary)'
                            : 'border-(--brand-border-field) bg-(--brand-surface)'
                        }`}
                      >
                        {activeLanguages.includes(lang) && (
                          <Check
                            size={11}
                            strokeWidth={3}
                            className="text-white"
                          />
                        )}
                      </div>
                      <span className="text-[length:var(--text-sm)] font-semibold text-(--brand-title-ink)">
                        {t(`languages.${lang}`, { defaultValue: lang })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
              {/* 3-item sliding window — overflow hides prev and next */}
              <div
                className="overflow-hidden rounded-3xl border border-(--brand-border)"
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
                          onPlay={() => play(String(trainer.id), trainer.intro)}
                          onStop={stop}
                          onSelect={() => onTrainerSelect?.(trainer.id)}
                          showAudioPreview={trainersOverride === undefined}
                          t={t}
                        />
                      ) : (
                        <div className="aspect-[8/9] bg-(--brand-soft)" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Left arrow */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                disabled={n <= 1}
                className="absolute top-1/2 left-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-(--brand-primary) bg-white/20 text-(--brand-primary) shadow-[0_1px_8px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition active:scale-95 disabled:opacity-30"
                aria-label={t('trainerSelection.previousTrainer')}
              >
                <ChevronLeft size={20} strokeWidth={2.2} />
              </button>

              {/* Right arrow */}
              <button
                type="button"
                onClick={() => navigate(1)}
                disabled={n <= 1}
                className="absolute top-1/2 right-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-(--brand-primary) bg-white/20 text-(--brand-primary) shadow-[0_1px_8px_rgba(0,0,0,0.18)] backdrop-blur-[2px] transition active:scale-95 disabled:opacity-30"
                aria-label={t('trainerSelection.nextTrainer')}
              >
                <ChevronRight size={20} strokeWidth={2.2} />
              </button>
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

  return (
    <div className="relative aspect-[8/9] overflow-hidden bg-(--brand-soft)">
      {/* Image — left half, full height */}
      {trainer.imageSelect ? (
        <img
          src={trainer.imageSelect}
          alt={trainer.name}
          loading="lazy"
          draggable={false}
          onError={(event) => {
            const fallbackImage = getLocalTrainerImage(trainer.id)

            if (
              fallbackImage &&
              event.currentTarget.getAttribute('src') !== fallbackImage
            ) {
              event.currentTarget.src = fallbackImage
            }
          }}
          className="absolute bottom-0 left-0 h-full w-1/2 object-contain object-bottom select-none"
        />
      ) : (
        <div className="absolute bottom-0 left-0 flex h-full w-1/2 items-end justify-center pb-4 text-(--brand-muted)">
          <UserRound size={80} strokeWidth={1.2} />
        </div>
      )}

      {/* Top-right: name, title, language, selected indicator */}
      <div className="absolute top-0 right-0 w-1/2 px-4 pt-4 text-right">
        <h3 className="text-[17px] leading-tight font-extrabold text-(--brand-title-ink)">
          {trainer.name}
        </h3>
        <p className="text-[12px] font-semibold text-(--brand-body-ink)">
          {t('trainerSelection.trainerTitle')}
        </p>
        {trainer.language && (
          <p className="text-[12px] font-semibold text-(--brand-muted)">
            {t(`languages.${trainer.language}`)}
          </p>
        )}
        {isSelected && (
          <div className="mt-2 flex justify-end">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-(--brand-primary-deep) text-white">
              <Check size={18} strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom-right: buttons — 65% card width */}
      <div className="absolute right-0 bottom-0 w-[65%] space-y-1.5 px-4 pb-4">
        {/* Preview audio */}
        {showAudioPreview ? (
          <button
            type="button"
            onClick={isPlaying ? onStop : onPlay}
            disabled={isLoading}
            className={`flex w-full items-center justify-center gap-1.5 ${appSheetFieldClass} px-2 py-2 text-[13px] font-extrabold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
              isPlaying
                ? 'border-rose-300 bg-rose-50 text-rose-800'
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
          <p className="flex w-full items-center justify-center gap-1 py-2 text-center text-[13px] font-extrabold text-(--brand-primary-deep)">
            <Check size={14} strokeWidth={3} />
            {t('trainerSelection.selected')}
          </p>
        ) : (
          <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-center justify-center rounded-2xl bg-(--brand-primary) px-2 py-2.5 text-[length:var(--text-sm)] font-extrabold text-white transition active:scale-95"
          >
            {t('trainerSelection.selectButton')}
          </button>
        )}
      </div>
    </div>
  )
}
