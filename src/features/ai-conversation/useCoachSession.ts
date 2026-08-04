import { useAuth } from '@clerk/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCalendarEvents } from '../../hooks/useCalendarEvents'
import useCurrentUser from '../../hooks/useCurrentUser'
import { useTrainer } from '../session/query'
import type { CoachCallSession } from '../session/types'
import {
  setCallAudioMuted,
  startGymAmbience,
  startRingback,
  stopGymAmbience,
  stopRingback,
} from './audio/ringback'
import { setSessionAudioMuted, stopSessionAudio } from './audio/sessionAudio'
import { useGeminiLive } from './core/useGeminiLive'
import { useLiveToken } from './core/useLiveToken'
import {
  getModelText,
  messageHasEventType,
  normalizeCaptionText,
  normalizeLiveVoice,
  sleep,
  splitCaptionParagraphs,
  waitForAIToFinishSpeaking,
  type AITurnState,
  type CoachSessionDebugEvent,
  type CoachSessionStep,
  type ProfileSuggestions,
  type UseCoachSessionOptions,
} from './helpers'
import { COACH_PROMPTS } from './prompts/setupPrompts'
import { buildSessionInstruction } from './setupSessionInstruction'
import { getSessionTools } from './setupSessionTools'
import { dispatchToolCall } from './toolRegistry'
import { postActivityEndpoint } from './tools/activity/activityEndpoint'

//──────────────────────
// Build system instruction
//──────────────────────

function mergeCaptionFragments(previous: string, next: string) {
  const current = normalizeCaptionText(previous)
  const incoming = normalizeCaptionText(next)

  if (!current) return incoming
  if (!incoming) return current
  if (incoming === current) return current
  if (incoming.startsWith(current)) return incoming
  if (current.startsWith(incoming)) return current
  if (current.endsWith(incoming)) return current
  if (incoming.endsWith(current)) return incoming
  return `${current} ${incoming}`.replace(/\s+/g, ' ').trim()
}

export function useCoachSession(
  options: UseCoachSessionOptions & {
    trainerId?: string
    session: CoachCallSession
    alreadyCompletedToday?: boolean
  },
) {
  const queryClient = useQueryClient()
  const { getToken } = useAuth()
  const { session, autoStart = true } = options

  const {
    userId,
    voice,
    coachPrompt,
    updateProfile,
    isTrainerLoading: isCurrentUserTrainerLoading,
    isSignedIn,
  } = useCurrentUser()
  const {
    data: trainer,
    isLoading: isTrainerLoading,
    error: trainerError,
  } = useTrainer(options.trainerId ?? '1')
  const sessionCoachPrompt =
    trainer?.prompt ?? session.trainer?.prompt ?? coachPrompt
  const sessionTrainerName = trainer?.name ?? session.trainer?.name
  const sessionVoice = normalizeLiveVoice(
    trainer?.voice ?? session.trainer?.voice ?? voice,
  )
  const currentDate = new Date()
  const { activities: calendarEvents } = useCalendarEvents(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    Boolean(userId),
  )

  const sessionInstruction = useMemo(
    () =>
      buildSessionInstruction(
        session,
        sessionCoachPrompt,
        sessionTrainerName,
        options.alreadyCompletedToday,
        isSignedIn,
        calendarEvents,
      ),
    [
      session,
      sessionCoachPrompt,
      sessionTrainerName,
      options.alreadyCompletedToday,
      isSignedIn,
      calendarEvents,
    ],
  )

  const [step, setStep] = useState<CoachSessionStep>('idle')
  const [error, setError] = useState<string | null>(null)
  const [audioCapturing, setAudioCapturing] = useState(false)
  const [debugEvents, setDebugEvents] = useState<CoachSessionDebugEvent[]>([])
  const [showInstructionsVideo, setShowInstructionsVideo] = useState(false)
  const [isMicrophoneMuted, setIsMicrophoneMuted] = useState(false)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
  const [caption, setCaption] = useState<string | null>(null)
  const [captionDraft, setCaptionDraft] = useState<string>('')
  const [captionHistory, setCaptionHistory] = useState<string[]>([])
  const [playbackSubtitle, setPlaybackSubtitle] = useState<string>('')
  // captions are per-call (ephemeral) — do not persist to localStorage
  const [captionsEnabled, setCaptionsEnabled] = useState<boolean>(false)
  const toggleCaptions = useCallback(() => setCaptionsEnabled((c) => !c), [])

  const debugIdRef = useRef(0)
  const startedAtRef = useRef(0)
  const stepRef = useRef<CoachSessionStep>('idle')
  const hasStartedRef = useRef(false)
  const videoTimersRef = useRef<number[]>([])
  const workoutCompletedRef = useRef(false)
  const activityLogIdRef = useRef<number | null>(null)
  const onboardingStageRef = useRef<
    'confirm_name' | 'intensity' | 'context' | 'done'
  >('confirm_name')

  const aiTurnStateRef = useRef<AITurnState>({
    started: false,
    complete: false,
  })

  //──────────────────────
  // Stable callback refs
  //──────────────────────
  const disconnectRef = useRef<() => void>(() => {})
  const startWorkoutVideoRef = useRef<() => void>(() => {})
  const updateUserNameRef = useRef<(userName: string) => Promise<void>>(
    async () => {},
  )
  const updateIntensityLevelRef = useRef<
    (intensityLevel: number) => Promise<void>
  >(async () => {})
  const updateUserContextRef = useRef<(context: string) => Promise<void>>(
    async () => {},
  )
  const onboardingToTrainingRef = useRef<() => Promise<void>>(async () => {})
  const endOnboardingRef = useRef<() => Promise<void>>(async () => {})
  const startInstructionsRef = useRef<() => void>(() => {})
  const finishedWorkoutRef = useRef<() => void>(() => {})
  //const startWorkoutRef = useRef<() => Promise<void>>(async () => {})
  const finishSessionRef = useRef<
    (summary?: string, suggestions?: ProfileSuggestions) => void
  >(() => {})

  const { token, loadToken, tokenLoading, tokenError } = useLiveToken()

  //──────────────────────
  // Add debug event
  //──────────────────────
  const addDebugEvent = useCallback(
    (label: string, detail?: string | number | boolean | null) => {
      const event: CoachSessionDebugEvent = {
        id: debugIdRef.current + 1,
        elapsedMs: startedAtRef.current
          ? Math.round(performance.now() - startedAtRef.current)
          : 0,
        label,
        detail:
          detail === undefined || detail === null ? undefined : String(detail),
      }

      debugIdRef.current = event.id
      console.debug('[CoachSession]', event)
      setDebugEvents((current) => [event, ...current].slice(0, 12))
    },
    [],
  )

  //──────────────────────
  // Update session step
  //──────────────────────
  const setSessionStep = useCallback((nextStep: CoachSessionStep) => {
    stepRef.current = nextStep
    setStep(nextStep)

    const event: CoachSessionDebugEvent = {
      id: debugIdRef.current + 1,
      elapsedMs: startedAtRef.current
        ? Math.round(performance.now() - startedAtRef.current)
        : 0,
      label: 'step',
      detail: nextStep,
    }

    debugIdRef.current = event.id
    console.debug('[CoachSession]', event)
    setDebugEvents((current) => [event, ...current].slice(0, 12))
  }, [])

  const sessionTools = useMemo(
    () =>
      getSessionTools({
        isSignedIn,
        alreadyCompletedToday: options.alreadyCompletedToday,
        session,
      }),
    [isSignedIn, options.alreadyCompletedToday, session],
  )
  const addCaptionParagraph = useCallback((text?: string | null) => {
    const paragraphs = splitCaptionParagraphs(text)
    if (paragraphs.length === 0) return

    setCaptionHistory((current) => {
      const next = [...current]
      for (const paragraph of paragraphs) {
        const last = next[next.length - 1]
        if (last !== paragraph) {
          next.push(paragraph)
        }
      }
      return next.slice(-100)
    })
  }, [])

  const resolveInstructionSubtitle = useCallback(() => {
    return normalizeCaptionText(
      session.instructionsSubtitleText ??
        session.dashboardDescription ??
        session.description ??
        session.instructions ??
        session.name,
    )
  }, [
    session.description,
    session.dashboardDescription,
    session.instructions,
    session.instructionsSubtitleText,
    session.name,
  ])

  const resolveWorkoutSubtitle = useCallback(() => {
    return normalizeCaptionText(
      session.subtitleText ??
        session.dashboardDescription ??
        session.description ??
        session.name,
    )
  }, [
    session.description,
    session.dashboardDescription,
    session.name,
    session.subtitleText,
  ])

  const {
    geminiConnect,
    geminiDisconnect,
    startAudioCapture,
    haltCapture,
    suppressAiOutput,
    allowAiOutput,
    isActive,
    connectionError,
    currentTurn,
    getSession,
    getAiPlaybackRemainingMs,
    getCurrentRms,
    setMicrophoneEnabled,
    setSpeakerMuted,
  } = useGeminiLive({
    token,
    tools: sessionTools,
    systemInstruction: sessionInstruction,
    voice: sessionVoice,

    //──────────────────────
    // Handle Gemini tool calls
    //──────────────────────
    onToolCall: (functionCall) =>
      dispatchToolCall(functionCall, {
        stepRef,
        onboardingStageRef,
        aiTurnStateRef,
        finishSessionRef,
        finishedWorkoutRef,
        startWorkoutVideoRef,
        updateUserNameRef,
        updateIntensityLevelRef,
        updateUserContextRef,
        onboardingToTrainingRef,
        endOnboardingRef,
        addDebugEvent,
        setSessionStep,
        getAiPlaybackRemainingMs,
      }),

    //──────────────────────
    // Handle Gemini messages
    //──────────────────────
    onMessage: (message) => {
      const modelText = getModelText(message)

      if (modelText.trim().length > 0) {
        aiTurnStateRef.current.started = true
      }

      const transcription = message.serverContent?.outputTranscription
      const trainerText = normalizeCaptionText(transcription?.text)

      if (trainerText) {
        const mergedCaption = mergeCaptionFragments(captionDraft, trainerText)
        setCaption(mergedCaption)
        setCaptionDraft(mergedCaption)

        if (transcription?.finished) {
          setCaptionHistory((cur) => {
            const next = [...cur]
            const last = next[next.length - 1]
            if (last !== mergedCaption) {
              next.push(mergedCaption)
            }
            return next.slice(-100)
          })
          setCaption('')
          setCaptionDraft('')
        }
      }

      const generationFinished =
        Boolean(message.serverContent?.turnComplete) ||
        Boolean(message.serverContent?.generationComplete) ||
        (messageHasEventType(message) &&
          (message.event_type === 'content.stop' ||
            message.event_type === 'interaction.complete'))

      if (generationFinished) {
        aiTurnStateRef.current.complete = true
      }
    },
  })

  //──────────────────────
  // Sync disconnect ref
  //──────────────────────
  useEffect(() => {
    disconnectRef.current = geminiDisconnect
  }, [geminiDisconnect])

  //──────────────────────
  // Pause live audio capture
  //──────────────────────
  const pauseLive = useCallback(() => {
    addDebugEvent('pauseAI-called', stepRef.current)
    // Halt sending audio data to Gemini without closing the AudioContext or
    // stopping media tracks — avoids OS audio session reconfiguration that
    // would cause a brief dropout in the gym ambience.
    haltCapture()
    setAudioCapturing(false)
  }, [addDebugEvent, currentTurn, haltCapture])

  //──────────────────────
  // Disconnect live session
  //──────────────────────
  const disconnectLive = useCallback(() => {
    addDebugEvent('stopAI-called', stepRef.current)
    stopGymAmbience()
    geminiDisconnect()
    setAudioCapturing(false)
  }, [addDebugEvent, geminiDisconnect])

  //──────────────────────
  // Connect with fresh token
  //──────────────────────
  const connectFreshLive = useCallback(async () => {
    addDebugEvent('load live token', stepRef.current)
    const freshToken = await loadToken()

    if (!freshToken) {
      setError(COACH_PROMPTS.NO_TOKEN_ERROR)
      setSessionStep('error')
      hasStartedRef.current = false
      return
    }

    addDebugEvent('connect live', stepRef.current)
    await geminiConnect(freshToken)
    return true
  }, [addDebugEvent, geminiConnect, loadToken, setSessionStep])

  //──────────────────────
  // Send prompt to Gemini
  //──────────────────────
  const sendCoachPrompt = useCallback(
    (text: string) => {
      aiTurnStateRef.current = { started: false, complete: false }

      getSession()?.sendClientContent({
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      })
    },
    [getSession],
  )

  /*
  //──────────────────────
  // Ask if ready for workout
  //──────────────────────
  const askIfReadyForWorkout = useCallback(async () => {
    allowAiOutput()
    addDebugEvent('resume after instructions')
    setSessionStep('asking_ready')

    if (!getSession()) {
      addDebugEvent('session timed out — reconnecting')
      const connected = await connectFreshLive()
      if (!connected) return
    }

    await sleep(250)

    const started = await startAudioCapture()
    setAudioCapturing(started)
    addDebugEvent('mic after instructions', started)

    if (!started) {
      setError('Kunde inte starta mikrofonen.')
      setSessionStep('error')
      return
    }
  }, [
    addDebugEvent,
    allowAiOutput,
    connectFreshLive,
    getSession,
    setSessionStep,
    startAudioCapture,
  ])
*/
  //──────────────────────
  // Play instructions video
  //──────────────────────

  const playInstructionsVideo = useCallback(() => {
    const videoUrl = session.instructionsVideo
    const videoStart = session.instructionsVideoStart
    const videoStop = session.instructionsVideoStop

    addDebugEvent(
      'video-fields',
      `url=${String(videoUrl)} start=${String(videoStart)} stop=${String(videoStop)}`,
    )

    if (videoUrl && videoStart != null && videoStop != null) {
      const t1 = window.setTimeout(() => {
        addDebugEvent('instructions video show')
        setShowInstructionsVideo(true)
      }, videoStart * 1000)
      const t2 = window.setTimeout(() => {
        addDebugEvent('instructions video hide')
        setShowInstructionsVideo(false)
      }, videoStop * 1000)
      videoTimersRef.current = [t1, t2]
    }
  }, [
    addDebugEvent,
    session.instructionsVideo,
    session.instructionsVideoStart,
    session.instructionsVideoStop,
  ])

  //──────────────────────
  // Workout completed
  //──────────────────────

  const workoutCompleted = useCallback(() => {
    addDebugEvent('workout completed')
    workoutCompletedRef.current = true
  }, [])

  /*  
  //──────────────────────
  // Play instructions
  //──────────────────────
  const clearVideoTimers = useCallback(() => {
    videoTimersRef.current.forEach((id) => window.clearTimeout(id))
    videoTimersRef.current = []
  }, [])

  const playInstructions = useCallback(async () => {
    clearVideoTimers()
    setShowInstructionsVideo(false)
    pauseLive()
    setSessionStep('playing_instructions')

    const instructionsAudioUrl =
      session.instructionsAudio ?? session.instructionsAudioUrl

    if (!instructionsAudioUrl) {
      setError(COACH_PROMPTS.NO_INSTRUCTIONS_AUDIO)
      setSessionStep('error')
      return
    }
    try {
      const subtitleText = resolveInstructionSubtitle()
      setPlaybackSubtitle(subtitleText)
      addDebugEvent('play instructions', instructionsAudioUrl)
      await startSessionAudio(instructionsAudioUrl, {
        onEnded: () => {
          addDebugEvent('instructions ended')
          setPlaybackSubtitle('')
          void askIfReadyForWorkout()
        },
      })

      const videoUrl = session.instructionsVideo
      const videoStart = session.instructionsVideoStart
      const videoStop = session.instructionsVideoStop

      addDebugEvent(
        'video-fields',
        `url=${String(videoUrl)} start=${String(videoStart)} stop=${String(videoStop)}`,
      )

      if (videoUrl && videoStart != null && videoStop != null) {
        const t1 = window.setTimeout(() => {
          addDebugEvent('instructions video show')
          setShowInstructionsVideo(true)
        }, videoStart * 1000)
        const t2 = window.setTimeout(() => {
          addDebugEvent('instructions video hide')
          setShowInstructionsVideo(false)
        }, videoStop * 1000)
        videoTimersRef.current = [t1, t2]
      }

      addDebugEvent('play-started', 'instructions')
    } catch {
      addDebugEvent('instructions audio failed')
      setError('Kunde inte spela upp instruktionerna.')
      setSessionStep('error')
    }
  }, [
    addDebugEvent,
    askIfReadyForWorkout,
    clearVideoTimers,
    pauseLive,
    resolveInstructionSubtitle,
    session.instructionsAudio,
    session.instructionsAudioUrl,
    session.instructionsVideo,
    session.instructionsVideoStart,
    session.instructionsVideoStop,
    setSessionStep,
  ])
  */

  //──────────────────────
  // Start session
  //──────────────────────
  const startSession = useCallback(async () => {
    if (hasStartedRef.current) return

    startRingback()

    startedAtRef.current = performance.now()
    debugIdRef.current = 0
    setDebugEvents([])
    addDebugEvent('session start')
    hasStartedRef.current = true
    workoutCompletedRef.current = false
    activityLogIdRef.current = null
    setError(null)
    setSessionStep(session.onboarding ? 'onboarding' : 'live_intro')

    const freshToken = await loadToken()
    if (!freshToken) {
      setError(COACH_PROMPTS.NO_TOKEN_ERROR)
      setSessionStep('error')
      hasStartedRef.current = false
      return
    }
    /*
    preloadSessionAudio(
      session.instructionsAudio ?? session.instructionsAudioUrl,
    )
    preloadSessionAudio(session.workoutAudio ?? session.workoutAudioUrl)
    */

    await geminiConnect(freshToken)
    addDebugEvent('initial live connected')

    const started = await startAudioCapture()
    setAudioCapturing(started)
    addDebugEvent('initial mic', started)

    if (!started) {
      setError('Kunde inte starta mikrofonen.')
      setSessionStep('error')
      hasStartedRef.current = false
      return
    }

    //console.log('[useCoachSession] Session started, waiting for ringback...')
    await sleep(1000)
    stopRingback()
    // console.log('[useCoachSession] Ringback stopped, starting gym ambience...')

    startGymAmbience(session.trainer?.ambience)
    setSessionStep(
      session.onboarding ? 'onboarding' : 'waiting_instruction_approval',
    )
    sendCoachPrompt('Starta samtalet.')
  }, [
    addDebugEvent,
    geminiConnect,
    loadToken,
    sendCoachPrompt,
    session.instructionsAudio,
    session.instructionsAudioUrl,
    session.trainer?.ambience,
    session.workoutAudio,
    session.workoutAudioUrl,
    setSessionStep,
    startAudioCapture,
  ])

  //──────────────────────
  // Update user name during onboarding
  //──────────────────────
  const updateUserName = useCallback(
    async (name: string) => {
      if (name === '') {
        addDebugEvent('skip onboarding', `step=${stepRef.current} - empty name`)
        return
      }
      if (name.length > 30) {
        addDebugEvent(
          'skip onboarding',
          `step=${stepRef.current} - name too long`,
        )
        return
      }

      await updateProfile({ name: name })
      addDebugEvent('onboarding-name', name)
      sendCoachPrompt(`Mitt namn är ${name}.`)
    },
    [addDebugEvent, sendCoachPrompt, updateProfile],
  )

  //──────────────────────
  // Update intensity level during onboarding
  //──────────────────────
  const updateIntensityLevel = useCallback(
    async (intensityLevel: number) => {
      if (intensityLevel < 1 || intensityLevel > 5) {
        addDebugEvent(
          'skip onboarding',
          `step=${stepRef.current} - invalid intensity level`,
        )
        return
      }
      await updateProfile({ intensityLevel })
      addDebugEvent('onboarding-intensity', intensityLevel)
      sendCoachPrompt(`Jag vill träna på nivå ${intensityLevel}.`)
    },
    [addDebugEvent, sendCoachPrompt, updateProfile],
  )

  //──────────────────────
  // Update user context during onboarding
  //──────────────────────

  const updateUserContext = useCallback(
    async (context: string) => {
      await updateProfile({ context })
      addDebugEvent('onboarding-context', context)
      sendCoachPrompt(`Jag vill träna i kontexten: ${context}.`)
    },
    [addDebugEvent, sendCoachPrompt, updateProfile],
  )

  //──────────────────────
  // End onboarding
  //──────────────────────

  const endOnboarding = useCallback(async () => {
    await updateProfile({ onboarding: false })
    addDebugEvent('onboarding-complete')
    sendCoachPrompt('Jag är redo att avsluta samtalet.')
  }, [addDebugEvent, sendCoachPrompt, updateProfile])

  const onboardingToTraining = useCallback(async () => {
    await updateProfile({ onboarding: false })
    setSessionStep('waiting_instruction_approval')
    addDebugEvent('onboarding-complete')
    sendCoachPrompt('Jag är redo att höra instruktionerna.')
  }, [addDebugEvent, sendCoachPrompt, updateProfile])

  /*
  //──────────────────────
  // Start workout
  //──────────────────────
  const startWorkout = useCallback(async () => {
    pauseLive()
    setSessionStep('playing_workout')

    const workoutAudioUrl = session.workoutAudio ?? session.workoutAudioUrl

    if (!workoutAudioUrl) {
      setError(COACH_PROMPTS.NO_WORKOUT_AUDIO)
      setSessionStep('error')
      return
    }

    try {
      const subtitleText = resolveWorkoutSubtitle()
      setPlaybackSubtitle(subtitleText)
      addCaptionParagraph(subtitleText)
      addDebugEvent('play workout', workoutAudioUrl)
      await startSessionAudio(workoutAudioUrl, {
        onEnded: async () => {
          workoutCompletedRef.current = true
          setPlaybackSubtitle('')
          allowAiOutput()
          addDebugEvent('workout ended')
          setSessionStep('collecting_feedback')

          try {
            const backendUserId = Number(userId)
            const workoutId = Number(session.id)

            if (
              !Number.isInteger(backendUserId) ||
              backendUserId <= 0 ||
              !Number.isInteger(workoutId) ||
              workoutId <= 0
            ) {
              throw new Error('Missing backend user or workout id')
            }

            const activityToken = await getToken()
            if (!activityToken) {
              throw new Error('Missing Clerk token')
            }

            const activityResult = await executeLiveToolCall(
              {
                name: 'create_activity_log',
                args: {
                  userId: backendUserId,
                  workoutId,
                  durationSeconds: session.durationSeconds,
                },
              },
              { token: activityToken },
            )
            activityLogIdRef.current = getCreatedActivityLogId(activityResult)

            addDebugEvent(
              'create_activity_log',
              JSON.stringify(activityResult?.response ?? {}),
            )

            if (!activityLogIdRef.current) {
              throw new Error('Backend did not create an activity log')
            }

            void queryClient.invalidateQueries({ queryKey: ['my-progress'] })
            void queryClient.invalidateQueries({ queryKey: ['calendar'] })

            if (!getSession()) {
              addDebugEvent('session timed out — reconnecting')
              const connected = await connectFreshLive()
              if (!connected) return
            }

            const started = await startAudioCapture()
            setAudioCapturing(started)
            addDebugEvent('mic after workout', started)

            if (!started) {
              setError('Kunde inte starta mikrofonen.')
              setSessionStep('error')
              return
            }
          } catch (e) {
            addDebugEvent('activity save failed', String(e))
            const connected = await connectFreshLive()
            if (!connected) return
            const started = await startAudioCapture()
            setAudioCapturing(started)
            addDebugEvent('mic after workout (fallback)', started)
          }
        },
      })
      addDebugEvent('play-started', 'workout')
    } catch {
      addDebugEvent('workout audio failed')
      setError('Kunde inte spela upp workouten.')
      setSessionStep('error')
    }
  }, [
    pauseLive,
    setSessionStep,
    session.workoutAudio,
    session.workoutAudioUrl,
    session.id,
    session.durationSeconds,
    addDebugEvent,
    addCaptionParagraph,
    allowAiOutput,
    resolveWorkoutSubtitle,
    userId,
    getSession,
    startAudioCapture,
    connectFreshLive,
    queryClient,
    getToken,
  ])
  */

  //──────────────────────
  // Finalize session
  //──────────────────────
  const finishSession = useCallback(() => {
    finishSessionRef.current()
  }, [])

  //──────────────────────
  // Finish session with summary
  //──────────────────────
  const finishSessionWithSummary = useCallback(
    async (summary = '', suggestions?: ProfileSuggestions) => {
      stopSessionAudio()

      if (!isSignedIn) {
        addDebugEvent('finish_session', 'guest session - no feedback saved')
        disconnectLive()
        setSessionStep('completed')
        return
      }

      try {
        const workoutCompleted = workoutCompletedRef.current

        if (workoutCompleted) {
          addDebugEvent('finish_session', 'workout completed - saving feedback')
          const workoutId = Number(session.id)

          if (!Number.isInteger(workoutId) || workoutId <= 0) {
            throw new Error('Missing workout id')
          }

          if (!activityLogIdRef.current) {
            const activityToken = await getToken()
            if (!activityToken) {
              throw new Error('Missing Clerk token')
            }

            const activity = await postActivityEndpoint(
              workoutId,
              session.durationSeconds,
              '',
              activityToken,
            )

            if (!activity.ok) {
              throw new Error(activity.error)
            }

            activityLogIdRef.current = activity.data.id
            void queryClient.invalidateQueries({ queryKey: ['my-progress'] })
            void queryClient.invalidateQueries({ queryKey: ['calendar'] })
          }

          if (userId) {
            queryClient.setQueryData(['has-completed-today', userId], {
              hasCompletedToday: true,
            })
          }
        } else {
          addDebugEvent('skip_feedback', 'workout not completed')
        }

        if (
          suggestions?.suggestedIntensityLevel != null ||
          suggestions?.suggestedContext != null
        ) {
          try {
            await updateProfile({
              ...(suggestions.suggestedIntensityLevel != null && {
                intensityLevel: suggestions.suggestedIntensityLevel,
              }),
              ...(suggestions.suggestedContext != null && {
                context: suggestions.suggestedContext,
              }),
            })
            addDebugEvent('update_profile', JSON.stringify(suggestions))
          } catch (e) {
            addDebugEvent('update_profile_failed', String(e))
          }
        }
      } catch (e) {
        addDebugEvent('create_feedback_failed', String(e))
        try {
          const fallbackMsg =
            'Tack för din feedback. Vi sparade den lokalt men något gick fel med lagringen — vi försöker igen nästa gång. Vi hörs snart. Hej då!'
          getSession()?.sendClientContent({
            turns: [
              {
                role: 'user',
                parts: [{ text: `Säg exakt: '${fallbackMsg}'` }],
              },
            ],
            turnComplete: true,
          })

          await sleep(500)
        } catch {
          // ignore
        }
      } finally {
        disconnectLive()
        setSessionStep('completed')
      }
    },
    [
      addDebugEvent,
      disconnectLive,
      getSession,
      session.id,
      setSessionStep,
      updateProfile,
      queryClient,
      userId,
      getToken,
      session.durationSeconds,
    ],
  )

  //──────────────────────
  // Sync latest callbacks into refs
  //──────────────────────
  useEffect(() => {
    startWorkoutVideoRef.current = playInstructionsVideo
    updateUserNameRef.current = updateUserName
    updateIntensityLevelRef.current = updateIntensityLevel
    updateUserContextRef.current = updateUserContext
    onboardingToTrainingRef.current = onboardingToTraining
    endOnboardingRef.current = endOnboarding
    startInstructionsRef.current = playInstructionsVideo
    finishedWorkoutRef.current = workoutCompleted
    //startWorkoutRef.current = startWorkout
    finishSessionRef.current = finishSessionWithSummary
  }, [
    finishSessionWithSummary,
    playInstructionsVideo,
    //startWorkout,
    updateIntensityLevel,
    updateUserContext,
    updateUserName,
    endOnboarding,
    onboardingToTraining,
  ])

  //──────────────────────
  // Manual end session
  //──────────────────────
  const endSession = useCallback(async () => {
    await waitForAIToFinishSpeaking(
      () => aiTurnStateRef.current,
      () => getAiPlaybackRemainingMs(),
      { timeoutMs: 10000 },
    )
    stopRingback()
    addDebugEvent('manual end')
    // clearVideoTimers()
    setShowInstructionsVideo(false)
    stopSessionAudio()

    disconnectLive()
    hasStartedRef.current = false
    setSessionStep('idle')
  }, [
    addDebugEvent,
    // clearVideoTimers,
    disconnectLive,
    getAiPlaybackRemainingMs,
    setSessionStep,
  ])

  const hangUp = useCallback(() => {
    stopRingback()
    addDebugEvent('hang up')
    // clearVideoTimers()
    setShowInstructionsVideo(false)
    stopSessionAudio()
    disconnectLive()
    setSessionStep('idle')
  }, [
    addDebugEvent, // clearVideoTimers,
    disconnectLive,
    setSessionStep,
  ])

  //──────────────────────
  // Cleanup on unmount
  //──────────────────────
  useEffect(() => {
    return () => {
      stopSessionAudio()
      stopRingback()
      stopGymAmbience()
      disconnectRef.current()
      videoTimersRef.current.forEach((id) => window.clearTimeout(id))
      videoTimersRef.current = []
    }
  }, [])

  useEffect(() => {
    setMicrophoneEnabled(!isMicrophoneMuted)
  }, [isMicrophoneMuted, setMicrophoneEnabled])

  useEffect(() => {
    setSpeakerMuted(isSpeakerMuted)
    setSessionAudioMuted(isSpeakerMuted)
    setCallAudioMuted(isSpeakerMuted)
  }, [isSpeakerMuted, setSpeakerMuted])

  // must be declared before usage in the auto-start effect
  const canStartLive = Boolean(
    sessionVoice && !isTrainerLoading && !isCurrentUserTrainerLoading,
  )

  //──────────────────────
  // Auto-start on mount
  //──────────────────────
  useEffect(() => {
    if (!autoStart) {
      return
    }
    if (!canStartLive) {
      return // wait until voice + trainer data is ready
    }

    const timeout = window.setTimeout(() => {
      void startSession()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [autoStart, canStartLive, startSession])

  return {
    step,
    error: error ?? tokenError ?? connectionError,
    isGeminiActive: isActive,
    currentTurn,
    audioCapturing,
    debugEvents,
    isLoadingToken: tokenLoading,
    startSession,
    //startWorkout,
    finishSession,
    endSession,
    hangUp,
    getCurrentRms,
    trainer,
    isTrainerLoading,
    trainerError,
    showInstructionsVideo,
    isMicrophoneMuted,
    isSpeakerMuted,
    caption,
    captionDraft,
    playbackSubtitle,
    captionsEnabled,
    toggleCaptions,
    captionHistory,
    toggleMicrophoneMuted: () => setIsMicrophoneMuted((current) => !current),
    toggleSpeakerMuted: () => setIsSpeakerMuted((current) => !current),
  }
}
