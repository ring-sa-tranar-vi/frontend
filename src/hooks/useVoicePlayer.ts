import { useRef, useState } from 'react'

export function useVoicePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const play = (id: string, url?: string | null) => {
    if (!url) {
      console.warn('No voice URL provided for trainer', id)
      return
    }

    console.log('Playing voice for trainer', id, 'URL:', url)

    // Stop existing
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.src = ''
      } catch (e) {
        console.error('Error stopping audio:', e)
      }
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    setLoadingId(id)
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.src = url
    audioRef.current = audio

    const cleanUp = () => {
      audio.oncanplay = null
      audio.oncanplaythrough = null
      audio.onended = null
      audio.onerror = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    // Guard so both oncanplay and oncanplaythrough firing doesn't double-play,
    // which would cause the second play() to trigger onerror, clearing onended.
    let started = false
    const startPlayback = () => {
      if (started) return
      started = true
      setLoadingId(null)
      setPlayingId(id)
      audio.play().catch((err) => {
        console.error('Error playing audio:', err)
        setLoadingId(null)
        setPlayingId(null)
      })
    }

    audio.oncanplay = startPlayback
    audio.oncanplaythrough = startPlayback

    audio.onended = () => {
      setPlayingId(null)
      cleanUp()
    }

    audio.onerror = (e) => {
      console.error('Audio load error:', e)
      setLoadingId(null)
      setPlayingId(null)
      cleanUp()
    }

    // Timeout after 10 seconds if audio doesn't load
    timeoutRef.current = setTimeout(() => {
      console.warn('Audio load timeout for trainer', id)
      setLoadingId(null)
      cleanUp()
    }, 10000)
  }

  const stop = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause()
        audioRef.current.src = ''
      } catch (e) {
        console.error('Error stopping audio:', e)
      }
      audioRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setPlayingId(null)
    setLoadingId(null)
  }

  return { play, stop, loadingId, playingId } as const
}
