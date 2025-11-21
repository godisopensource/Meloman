import { createContext, useContext, useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { subsonicApi } from '@/lib/subsonic-api'
import { getAverageColorFromImageUrl } from '@/lib/coverColor'
import { useQueue, type QueueTrack } from './QueueContext'

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration?: number
  coverArt?: string
}

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  play: (track: Track, context?: QueueTrack[]) => void
  pause: () => void
  resume: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  togglePlayPause: () => void
  skipNext: () => void
  skipPrevious: () => void
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { queue, currentIndex, setQueue, playNext, playPrevious } = useQueue()
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(70)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume / 100

      audioRef.current.addEventListener('timeupdate', () => {
        const time = audioRef.current?.currentTime || 0
        setCurrentTime(time)
      })

      audioRef.current.addEventListener('durationchange', () => {
        setDuration(audioRef.current?.duration || 0)
      })

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
        // Auto-play next track
        const hasNext = playNext()
        if (!hasNext) {
          setIsPlaying(false)
        }
      })

      audioRef.current.addEventListener('play', () => {
          setIsPlaying(true)
        })

      audioRef.current.addEventListener('pause', () => {
        setIsPlaying(false)
      })
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [playNext])

  // Helper: set accent color based on a track's cover art
  const applyAccentFromTrack = async (t: Track | null) => {
    try {
      if (t && t.coverArt) {
        const url = subsonicApi.getCoverArtUrl(t.coverArt, 300)
        console.debug('[Player] Getting accent color from:', url)
        const color = await getAverageColorFromImageUrl(url)
        const rgb = color.replace('#', '')
        const r = parseInt(rgb.substring(0, 2), 16)
        const g = parseInt(rgb.substring(2, 4), 16)
        const b = parseInt(rgb.substring(4, 6), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        const foreground = luminance > 0.5 ? '#111827' : '#ffffff'
        document.documentElement.style.setProperty('--accent-color', color)
        document.documentElement.style.setProperty('--accent-foreground', foreground)
        document.documentElement.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`)
      } else {
        document.documentElement.style.setProperty('--accent-color', '#3b82f6')
        document.documentElement.style.setProperty('--accent-foreground', '#ffffff')
        document.documentElement.style.setProperty('--accent-color-rgb', '59, 130, 246')
      }
    } catch (e) {
      console.error('[Player] Failed to set accent color:', e)
      document.documentElement.style.setProperty('--accent-color', '#3b82f6')
      document.documentElement.style.setProperty('--accent-foreground', '#ffffff')
    }
  }

  // Play track when queue index changes
  useEffect(() => {
    if (currentIndex >= 0 && queue[currentIndex]) {
      const track = queue[currentIndex]
      if (audioRef.current && track.id !== currentTrack?.id) {
        const streamUrl = subsonicApi.getStreamUrl(track.id)
        audioRef.current.src = streamUrl
        audioRef.current.play()
        setCurrentTrack(track)
        // Ensure accent color updates when queue-based playback changes
        applyAccentFromTrack(track)
        setIsPlaying(true)

        setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused) {
            subsonicApi.scrobble(track.id, true).catch(console.error)
          }
        }, Math.min(30000, (track.duration || 0) * 500))
      }
    }
  }, [currentIndex, queue])

  const play = (track: Track, context?: QueueTrack[]) => {
    if (!audioRef.current) return
    const streamUrl = subsonicApi.getStreamUrl(track.id)
    // Stop current playback, reset time, set new source
    try {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    } catch (e) {
      console.debug('[Player] pause/reset currentTime failed', e)
    }
    audioRef.current.src = streamUrl
    try {
      // Force load the new source and reset playback position
      audioRef.current.load()
      audioRef.current.currentTime = 0
    } catch (e) {
      console.debug('[Player] load/currentTime reset failed', e)
    }
    console.debug('[Player] playing', track.id, streamUrl)
    
    // Update accent color right away (don't wait for play)
    applyAccentFromTrack(track)
    
    // Attempt to play and update UI accordingly
    audioRef.current.play().then(() => {
      console.debug('[Player] play resolved', track.id)
      setCurrentTrack(track)
      setIsPlaying(true)
    }).catch((err) => {
      console.warn('[Player] play() promise rejected', err)
      // Fallback: set currentTrack but keep isPlaying false; user can press play
      setCurrentTrack(track)
      setIsPlaying(false)
      // Try a single retry after a short delay (might fix some autoplay race conditions)
      setTimeout(() => {
        audioRef.current?.play().then(() => {
          console.debug('[Player] play retry resolved', track.id)
          setIsPlaying(true)
        }).catch((e) => {
          console.warn('[Player] play retry rejected', e)
        })
      }, 250)
    })

    // Update queue if context provided
    if (context) {
      const trackIndex = context.findIndex(t => t.id === track.id)
      setQueue(context, trackIndex >= 0 ? trackIndex : 0)
    }

    // Scrobble after 30 seconds or half the track
    setTimeout(() => {
      if (audioRef.current && !audioRef.current.paused) {
        subsonicApi.scrobble(track.id, true).catch(console.error)
      }
    }, Math.min(30000, (track.duration || 0) * 500))
  }

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }

  const resume = () => {
    if (audioRef.current) {
      audioRef.current.play()
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  const seek = (time: number) => {
    if (audioRef.current) {
      console.log('[Player] Seeking to:', time, 'Duration:', audioRef.current.duration)
      if (time >= 0 && time <= audioRef.current.duration) {
        audioRef.current.currentTime = time
        setCurrentTime(time)
      } else {
        console.warn('[Player] Invalid seek time:', time)
      }
    }
  }

  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100
    }
  }

  const skipNext = () => {
    playNext()
  }

  const skipPrevious = () => {
    if (currentTime > 3) {
      // If more than 3 seconds into track, restart it
      seek(0)
    } else {
      playPrevious()
    }
  }

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        play,
        pause,
        resume,
        seek,
        setVolume,
        togglePlayPause,
        skipNext,
        skipPrevious,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
