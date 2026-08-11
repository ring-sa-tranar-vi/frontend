import { useEffect, useRef, useState } from 'react'

export function useVoicePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const stop = () => {
    if (audioRef.current) {
      const audio = audioRef.current
      try {
        audio.oncanplay = null
        audio.oncanplaythrough = null
        audio.onended = null
        audio.onerror = null
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      } catch (error) {
        console.error('Error stopping audio:', error)
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

  useEffect(() => stop, [])

  const play = (id: string, url?: string | null) => {
    if (!url) {
      console.warn('No voice URL provided for trainer', id)
      return
    }

    console.log('Playing voice for trainer', id, 'URL:', url)

    // Stop existing
    stop()

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
      if (started || audioRef.current !== audio) return
      started = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      setLoadingId(null)
      setPlayingId(id)
      audio.play().catch((err) => {
        if (audioRef.current !== audio) return
        console.error('Error playing audio:', err)
        setLoadingId(null)
        setPlayingId(null)
        audioRef.current = null
        cleanUp()
      })
    }

    audio.oncanplay = startPlayback
    audio.oncanplaythrough = startPlayback

    audio.onended = () => {
      if (audioRef.current !== audio) return
      setPlayingId(null)
      audioRef.current = null
      cleanUp()
    }

    audio.onerror = (e) => {
      if (audioRef.current !== audio) return
      console.error('Audio load error:', e)
      setLoadingId(null)
      setPlayingId(null)
      audioRef.current = null
      cleanUp()
    }

    // Timeout after 10 seconds if audio doesn't load
    timeoutRef.current = setTimeout(() => {
      if (audioRef.current !== audio) return
      console.warn('Audio load timeout for trainer', id)
      cleanUp()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      setLoadingId(null)
      setPlayingId(null)
      audioRef.current = null
    }, 10000)
  }

  return { play, stop, loadingId, playingId } as const
}
