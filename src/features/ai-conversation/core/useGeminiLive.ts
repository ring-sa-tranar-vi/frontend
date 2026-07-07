import {
  GoogleGenAI,
  MediaResolution,
  Modality,
  type FunctionCall,
  type FunctionResponse,
  type LiveServerMessage,
  type Session,
  type ToolListUnion,
} from '@google/genai'
import { useEffect, useRef, useState } from 'react'

const SAMPLE_RATE = 16000
const CHUNK_SAMPLES = 2560 // 160 ms @ 16 kHz
const AI_SAMPLE_RATE = 24000
const PLAYBACK_TAIL_MS = 0
const LIVE_MODEL = 'gemini-3.1-flash-live-preview'
const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_BASE_DELAY_MS = 500

interface UseGeminiLiveProps {
  token: string
  tools?: ToolListUnion
  systemInstruction?: string
  onAudioData?: (data: ArrayBuffer) => void
  onMessage?: (message: LiveServerMessage) => void
  onToolCall?: (functionCall: FunctionCall) => Promise<FunctionResponse>
  onFirstAiAudio?: () => void
  // allow null while async-loading voice from useCurrentUser
  voice?: string | null
}

interface DebugStats {
  inputSampleRate: number
  outputSampleRate: number
  channels: number
  chunkSizeSamples: number
  chunkSizeMs: number
  chunksThisSecond: number
  bytesThisSecond: number
  droppedSilentChunks: number
  totalBytesSent: number
}

function pcm16ToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export type Turn = 'user' | 'gemini' | 'idle'

export const useGeminiLive = ({
  token,
  tools,
  systemInstruction,
  onAudioData,
  onMessage,
  onToolCall,
  onFirstAiAudio,
  voice,
}: UseGeminiLiveProps) => {
  const [isActive, setIsActive] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [currentTurn, setCurrentTurn] = useState<Turn>('idle')
  const aiAudioCtxRef = useRef<AudioContext | null>(null)
  const aiPlayheadRef = useRef(0)
  const playingUntilWallMsRef = useRef(0)
  const sessionRef = useRef<Session | null>(null)
  const tokenRef = useRef(token)
  const toolsRef = useRef(tools)
  const systemInstructionRef = useRef(systemInstruction)
  const onAudioRef = useRef(onAudioData)
  const onMessageRef = useRef(onMessage)
  const onToolCallRef = useRef(onToolCall)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimerRef = useRef<number | null>(null)
  const connectingRef = useRef(false)
  const autoReconnectDisabledRef = useRef(false)
  const suppressAiAudioRef = useRef(false)
  const captureHaltedRef = useRef(false)
  const currentRmsRef = useRef(0)
  const onFirstAiAudioRef = useRef(onFirstAiAudio)
  const firstAiAudioFiredRef = useRef(false)
  const voiceRef = useRef<string | null>(voice ?? null)
  const microphoneEnabledRef = useRef(true)
  const speakerMutedRef = useRef(false)

  useEffect(() => {
    // Keep async callers reading the latest values without mutating refs during render.
    tokenRef.current = token
    toolsRef.current = tools
    systemInstructionRef.current = systemInstruction
    onAudioRef.current = onAudioData
    onMessageRef.current = onMessage
    onToolCallRef.current = onToolCall
    onFirstAiAudioRef.current = onFirstAiAudio
    voiceRef.current = voice ?? null
  }, [
    token,
    tools,
    systemInstruction,
    onAudioData,
    onMessage,
    onToolCall,
    onFirstAiAudio,
    voice,
  ])

  useEffect(() => {
    console.debug(
      '[GeminiLive] voice prop:',
      voice,
      'voiceRef.current:',
      voiceRef.current,
    )
  }, [voice])

  async function handleToolCalls(functionCalls: FunctionCall[]) {
    const functionResponses = await Promise.all(
      functionCalls.map(async (functionCall) => {
        const name = functionCall.name ?? 'unknown_tool'

        try {
          if (!onToolCallRef.current) {
            return {
              id: functionCall.id,
              name,
              response: {
                error: `No frontend handler configured for live tool: ${name}`,
              },
            } satisfies FunctionResponse
          }

          return await onToolCallRef.current(functionCall)
        } catch (error) {
          return {
            id: functionCall.id,
            name,
            response: {
              error:
                error instanceof Error
                  ? error.message
                  : `Live tool failed: ${name}`,
            },
          } satisfies FunctionResponse
        }
      }),
    )

    try {
      sessionRef.current?.sendToolResponse({ functionResponses })
    } catch (error) {
      console.error('[GeminiLive] Failed to send tool response:', error)
    }
  }

  async function geminiConnect(overrideToken?: string) {
    console.debug('[GeminiLive] connect pressed')
    setConnectionError(null)

    const selectedVoice = voiceRef.current
    if (!selectedVoice) {
      console.warn('[GeminiLive] connect blocked: voice not loaded yet')
      setConnectionError('Voice not loaded yet.')
      return
    }

    console.debug('[GeminiLive] connecting with voiceRef:', selectedVoice)

    // If a manual connect is requested, allow auto-reconnect again.
    autoReconnectDisabledRef.current = false
    firstAiAudioFiredRef.current = false

    // Prevent parallel connects
    if (connectingRef.current) {
      console.debug('[GeminiLive] connect already in progress — skipping')
      return
    }
    connectingRef.current = true

    const activeToken = overrideToken ?? tokenRef.current
    if (!activeToken) {
      console.error('[GeminiLive] missing token')
      setConnectionError('Live token saknas.')
      return
    }
    // Keep ref in sync if an override was supplied before the useEffect fires
    if (overrideToken) tokenRef.current = overrideToken

    if (sessionRef.current) {
      console.debug('[GeminiLive] already connected — skipping')
      connectingRef.current = false
      return
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: activeToken,
        httpOptions: { apiVersion: 'v1alpha' },
      })

      // If a reconnect was scheduled, clear it — we are connecting now.
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
        reconnectAttemptsRef.current = 0
      }

      const session = await ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
          tools: toolsRef.current,
          systemInstruction: systemInstructionRef.current
            ? { parts: [{ text: systemInstructionRef.current }] }
            : undefined,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
        callbacks: {
          onopen: () => {
            console.debug('[GeminiLive] opened')
            setIsActive(true)
            // successful open -> reset reconnect attempts
            reconnectAttemptsRef.current = 0
            connectingRef.current = false
          },
          onmessage: (message: LiveServerMessage) => {
            void handleLiveMessage(message)
          },
          onerror: (e: ErrorEvent) => {
            console.error('[GeminiLive] error:', e.message)
            setConnectionError(e.message || 'Gemini Live websocket error.')
          },
          onclose: (e: CloseEvent) => {
            console.debug(
              '[GeminiLive] closed — code:',
              e.code,
              'reason:',
              e.reason || '(no reason)',
            )
            setIsActive(false)
            sessionRef.current = null

            // If manual disconnect happened, don't auto-reconnect.
            if (autoReconnectDisabledRef.current) {
              reconnectAttemptsRef.current = 0
              connectingRef.current = false
              return
            }

            if (e.code !== 1000) {
              setConnectionError(
                e.reason || `Gemini Live closed with code ${e.code}.`,
              )

              // Schedule a limited number of reconnect attempts with exponential backoff
              if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttemptsRef.current += 1
                const backoff =
                  RECONNECT_BASE_DELAY_MS *
                  2 ** (reconnectAttemptsRef.current - 1)
                console.debug(
                  `[GeminiLive] scheduling reconnect #${reconnectAttemptsRef.current} in ${backoff}ms`,
                )
                reconnectTimerRef.current = window.setTimeout(() => {
                  reconnectTimerRef.current = null
                  // try reconnect with latest token
                  void geminiConnect()
                }, backoff) as unknown as number
              } else {
                console.debug('[GeminiLive] max reconnect attempts reached')
                reconnectAttemptsRef.current = 0
                connectingRef.current = false
              }
            } else {
              connectingRef.current = false
            }
          },
        },
      })

      async function handleLiveMessage(message: LiveServerMessage) {
        if (message.serverContent) {
          const content = message.serverContent

          // AI IS CURRENTLY SENDING AUDIO (Data Layer speaking)
          if (content.modelTurn?.parts?.some((p) => p.inlineData)) {
            console.debug('[GeminiLive] turn→gemini: audio data received')
            setCurrentTurn('gemini')
            if (!firstAiAudioFiredRef.current) {
              firstAiAudioFiredRef.current = true
              onFirstAiAudioRef.current?.()
            }
          }

          // AI HAS FINISHED SENDING DATA
          if (content.turnComplete) {
            console.debug('[GeminiLive] turn→user: turnComplete')
            setCurrentTurn('user')
          }

          // AI WAS INTERRUPTED
          if (content.interrupted) {
            console.debug('[GeminiLive] turn→user: interrupted')
            aiPlayheadRef.current = 0
            playingUntilWallMsRef.current = 0
            setCurrentTurn('user')
          }
        }

        const functionCalls = message.toolCall?.functionCalls ?? []
        if (functionCalls.length > 0) {
          await handleToolCalls(functionCalls)
        }

        const parts = message.serverContent?.modelTurn?.parts ?? []
        let audioParts = 0

        for (const part of parts) {
          const b64 = part?.inlineData?.data
          if (!b64) continue

          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
          onAudioRef.current?.(bytes.buffer)
          if (!suppressAiAudioRef.current && !speakerMutedRef.current) {
            void playAiPcm16(bytes.buffer)
          }
          audioParts++
        }

        if (audioParts > 0) {
          setCurrentTurn('gemini')
        } else if (audioParts === 0 && parts.length > 0) {
          console.debug(
            '[GeminiLive] modelTurn had parts, but no inline audio data',
          )
        }

        if (message.serverContent?.turnComplete) {
          setCurrentTurn('user')
        }

        const text = parts
          .map((p) => p?.text)
          .filter(Boolean)
          .join(' ')
        if (text) console.debug('[GeminiLive] text:', text)

        onMessageRef.current?.(message)
      }

      sessionRef.current = session
      console.debug('[GeminiLive] connect success:', session)
      connectingRef.current = false
    } catch (error) {
      console.error('[GeminiLive] Failed to connect:', error)
      setIsActive(false)
      setConnectionError(
        error instanceof Error ? error.message : 'Gemini Live connect failed.',
      )
      connectingRef.current = false
    }
  }

  function geminiDisconnect() {
    console.debug('[GeminiLive] disconnect pressed')
    // Manual disconnect should disable auto-reconnect
    autoReconnectDisabledRef.current = true

    // Clear any scheduled reconnect
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (isCapturingRef.current) {
      stopAudioCapture()
    }
    sessionRef.current?.close()
    sessionRef.current = null
    setIsActive(false)
    setConnectionError(null)
    setCurrentTurn('idle')
    aiAudioCtxRef.current?.close()
    aiAudioCtxRef.current = null
    aiPlayheadRef.current = 0
    playingUntilWallMsRef.current = 0
    reconnectAttemptsRef.current = 0
    connectingRef.current = false
  }

  function getCurrentRms() {
    return currentRmsRef.current
  }

  function suppressAiOutput() {
    suppressAiAudioRef.current = true
    aiAudioCtxRef.current?.close()
    aiAudioCtxRef.current = null
    aiPlayheadRef.current = 0
    playingUntilWallMsRef.current = 0
  }

  function allowAiOutput() {
    suppressAiAudioRef.current = false
  }

  function setMicrophoneEnabled(enabled: boolean) {
    microphoneEnabledRef.current = enabled
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = enabled
    })
  }

  function setSpeakerMuted(muted: boolean) {
    speakerMutedRef.current = muted
    if (!muted) {
      return
    }
    aiAudioCtxRef.current?.close()
    aiAudioCtxRef.current = null
    aiPlayheadRef.current = 0
    playingUntilWallMsRef.current = 0
  }

  function getSession() {
    return sessionRef.current
  }

  function getAiPlaybackRemainingMs() {
    return Math.max(0, playingUntilWallMsRef.current - Date.now())
  }

  async function playAiPcm16(buffer: ArrayBuffer) {
    if (!aiAudioCtxRef.current) {
      aiAudioCtxRef.current = new AudioContext({ sampleRate: AI_SAMPLE_RATE })
    }
    const ctx = aiAudioCtxRef.current
    if (ctx.state === 'suspended') await ctx.resume()

    const pcm16 = new Int16Array(buffer)
    const f32 = new Float32Array(pcm16.length)
    for (let i = 0; i < pcm16.length; i++) f32[i] = pcm16[i] / 32768

    const audioBuffer = ctx.createBuffer(1, f32.length, AI_SAMPLE_RATE)
    audioBuffer.getChannelData(0).set(f32)

    const src = ctx.createBufferSource()
    src.buffer = audioBuffer
    src.connect(ctx.destination)

    const now = ctx.currentTime
    const startAt = Math.max(now, aiPlayheadRef.current)
    src.start(startAt)
    aiPlayheadRef.current = startAt + audioBuffer.duration

    const remainingMs = (aiPlayheadRef.current - ctx.currentTime) * 1000
    playingUntilWallMsRef.current = Date.now() + remainingMs + PLAYBACK_TAIL_MS
  }

  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const workletNodeRef = useRef<AudioWorkletNode | null>(null)
  const workletBlobUrlRef = useRef<string | null>(null)
  const isCapturingRef = useRef(false)
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statsRef = useRef<DebugStats>({
    inputSampleRate: 0,
    outputSampleRate: SAMPLE_RATE,
    channels: 1,
    chunkSizeSamples: CHUNK_SAMPLES,
    chunkSizeMs: (CHUNK_SAMPLES / SAMPLE_RATE) * 1000,
    chunksThisSecond: 0,
    bytesThisSecond: 0,
    droppedSilentChunks: 0,
    totalBytesSent: 0,
  })

  async function startAudioCapture() {
    if (isCapturingRef.current) {
      console.warn(
        '[GeminiLive] startAudioCapture() called while already capturing — ignored',
      )
      captureHaltedRef.current = false
      return true
    }

    try {
      console.debug('[GeminiLive] requesting microphone access')

      // On iOS, echoCancellation puts AVAudioSession into voiceChat mode which
      // automatically ducks other audio playback (gym ambience) when new audio
      // starts. Disabling it on iOS prevents OS-level AEC ducking.
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: SAMPLE_RATE,
          echoCancellation: !isIOS,
          noiseSuppression: !isIOS,
          autoGainControl: !isIOS,
        },
      })
      mediaStreamRef.current = stream
      stream.getAudioTracks().forEach((track) => {
        track.enabled = microphoneEnabledRef.current
      })

      const trackSettings = stream.getAudioTracks()[0]?.getSettings() ?? {}
      console.debug('[GeminiLive] track settings:', trackSettings)
      statsRef.current.inputSampleRate = trackSettings.sampleRate ?? SAMPLE_RATE
      statsRef.current.channels = trackSettings.channelCount ?? 1

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioContextRef.current = audioContext
      statsRef.current.outputSampleRate = audioContext.sampleRate
      console.debug(
        '[GeminiLive] AudioContext.sampleRate:',
        audioContext.sampleRate,
      )

      const source = audioContext.createMediaStreamSource(stream)

      // Worklet: mono channel 0 only, buffer into CHUNK_SAMPLES frames,
      // compute RMS, convert Float32→PCM16, transfer buffer (zero-copy).
      const workletCode = `
        const CHUNK = ${CHUNK_SAMPLES};
        class AudioProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this._buf = new Float32Array(CHUNK);
            this._idx = 0;
          }
          process(inputs) {
            const ch = inputs[0]?.[0];
            if (!ch) return true;
            for (let i = 0; i < ch.length; i++) {
              this._buf[this._idx++] = ch[i];
              if (this._idx >= CHUNK) {
                let ss = 0;
                for (let j = 0; j < CHUNK; j++) ss += this._buf[j] * this._buf[j];
                const rms = Math.sqrt(ss / CHUNK);
                const pcm16 = new Int16Array(CHUNK);
                for (let j = 0; j < CHUNK; j++) {
                  pcm16[j] = Math.round(Math.max(-1, Math.min(1, this._buf[j])) * 32767);
                }
                this.port.postMessage({ pcm16: pcm16.buffer, rms }, [pcm16.buffer]);
                this._idx = 0;
              }
            }
            return true;
          }
        }
        registerProcessor('audio-processor', AudioProcessor);
      `

      const blob = new Blob([workletCode], { type: 'application/javascript' })
      const blobUrl = URL.createObjectURL(blob)
      workletBlobUrlRef.current = blobUrl

      await audioContext.audioWorklet.addModule(blobUrl)
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor')
      workletNodeRef.current = workletNode

      workletNode.port.onmessage = (
        event: MessageEvent<{ pcm16: ArrayBuffer; rms: number }>,
      ) => {
        const { pcm16, rms } = event.data
        currentRmsRef.current = rms

        if (captureHaltedRef.current) return
        if (Date.now() < playingUntilWallMsRef.current) return

        const base64 = pcm16ToBase64(pcm16)

        sessionRef.current?.sendRealtimeInput({
          audio: { data: base64, mimeType: `audio/pcm;rate=${SAMPLE_RATE}` },
        })

        if (rms > 0.01) {
          console.debug('[GeminiLive] mic→gemini rms:', rms.toFixed(4))
        }

        statsRef.current.chunksThisSecond++
        statsRef.current.bytesThisSecond += pcm16.byteLength
        statsRef.current.totalBytesSent += pcm16.byteLength
      }

      // Do NOT connect workletNode to destination — avoids mic feedback loop.
      source.connect(workletNode)
      isCapturingRef.current = true
      setCurrentTurn('user')

      statsIntervalRef.current = setInterval(() => {
        statsRef.current.chunksThisSecond = 0
        statsRef.current.bytesThisSecond = 0
      }, 1000)

      console.debug(
        `[GeminiLive] audio capture started — mono PCM16 @ ${SAMPLE_RATE} Hz, ` +
          `chunk ${CHUNK_SAMPLES} samples / ${((CHUNK_SAMPLES / SAMPLE_RATE) * 1000).toFixed(0)} ms`,
      )
      return true
    } catch (error) {
      console.error('[GeminiLive] audio capture setup failed:', error)
      setConnectionError(
        error instanceof Error
          ? error.message
          : 'Kunde inte starta mikrofonen.',
      )
      return false
    }
  }

  function haltCapture() {
    captureHaltedRef.current = true
  }

  function endUserTurn() {
    if (sessionRef.current) {
      sessionRef.current.sendRealtimeInput({ audioStreamEnd: true })
      setCurrentTurn('gemini')
    }
  }

  function stopAudioCapture() {
    if (!isCapturingRef.current) {
      console.warn('[GeminiLive] stopAudioCapture() called but not capturing')
      return
    }

    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current)
      statsIntervalRef.current = null
    }

    workletNodeRef.current?.disconnect()
    workletNodeRef.current = null

    mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    mediaStreamRef.current = null

    audioContextRef.current?.close()
    audioContextRef.current = null

    if (workletBlobUrlRef.current) {
      URL.revokeObjectURL(workletBlobUrlRef.current)
      workletBlobUrlRef.current = null
    }

    isCapturingRef.current = false

    console.debug(
      '[GeminiLive] audio capture stopped — total bytes sent:',
      statsRef.current.totalBytesSent,
    )

    statsRef.current = {
      ...statsRef.current,
      chunksThisSecond: 0,
      bytesThisSecond: 0,
      droppedSilentChunks: 0,
      totalBytesSent: 0,
    }
  }

  useEffect(() => {
    return () => {
      if (isCapturingRef.current) {
        stopAudioCapture()
      }
      sessionRef.current?.close()
      sessionRef.current = null

      // Clear any pending reconnect attempts and reset flags
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      connectingRef.current = false
      autoReconnectDisabledRef.current = false
    }
  }, [])

  return {
    geminiConnect,
    geminiDisconnect,
    startAudioCapture,
    stopAudioCapture,
    haltCapture,
    suppressAiOutput,
    allowAiOutput,
    endUserTurn,
    isActive,
    connectionError,
    currentTurn,
    getSession,
    getAiPlaybackRemainingMs,
    getCurrentRms,
    setMicrophoneEnabled,
    setSpeakerMuted,
  }
}
