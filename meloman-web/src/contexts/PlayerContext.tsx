import { createContext, useContext, useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import { subsonicApi } from '@/lib/subsonic-api'
import { getAverageColorFromImageUrl } from '@/lib/coverColor'
import { useQueue, type QueueTrack } from './QueueContext'
import { preloadLyrics } from '@/lib/lyricsPreloader'

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
  const lastPlayedTrackId = useRef<string | null>(null)
  const isManualPlay = useRef(false)
  const lastQueueIndex = useRef<number>(-1)
  const queueRef = useRef<QueueTrack[]>([])
  const [accentApplied, setAccentApplied] = useState(false)
  
  // Keep queueRef in sync with queue state
  useEffect(() => {
    queueRef.current = queue
  }, [queue])

  // Initialize audio element once on mount
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.volume = volume / 100
      // Don't set any src initially - wait for first play

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
        // Auto-play next track - use ref to avoid stale closure
        playNext()
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
  }, []) // Empty deps - only run on mount

  // Helper: set accent color based on a track's cover art
  const applyAccentFromTrack = async (t: Track | null) => {
    try {
      if (t && t.coverArt) {
        const url = subsonicApi.getCoverArtUrl(t.coverArt, 300)
        console.debug('[Player] Extracting accent color from track:', t.title, 'coverArt:', t.coverArt)
        let color = await getAverageColorFromImageUrl(url)
        console.debug('[Player] ✓ Extracted color:', color, 'for track:', t.title)
        setAccentApplied(true)
        const rgb = color.replace('#', '')
        let r = parseInt(rgb.substring(0, 2), 16)
        let g = parseInt(rgb.substring(2, 4), 16)
        let b = parseInt(rgb.substring(4, 6), 16)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        
        // Ensure color has enough contrast on dark background
        // If too dark (luminance < 0.3), brighten it
        if (luminance < 0.3) {
          const factor = 0.4 / Math.max(luminance, 0.1)
          r = Math.min(255, Math.floor(r * factor))
          g = Math.min(255, Math.floor(g * factor))
          b = Math.min(255, Math.floor(b * factor))
          color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
        }
        
        const foreground = luminance > 0.5 ? '#111827' : '#ffffff'
        document.documentElement.style.setProperty('--accent-color', color)
        document.documentElement.style.setProperty('--accent-foreground', foreground)
        document.documentElement.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`)
      } else {
        document.documentElement.style.setProperty('--accent-color', '#3b82f6')
        document.documentElement.style.setProperty('--accent-foreground', '#ffffff')
        document.documentElement.style.setProperty('--accent-color-rgb', '59, 130, 246')
        setAccentApplied(true)
      }
    } catch (e) {
      console.error('[Player] Failed to set accent color:', e)
      document.documentElement.style.setProperty('--accent-color', '#3b82f6')
      document.documentElement.style.setProperty('--accent-foreground', '#ffffff')
      setAccentApplied(true)
    }
  }
  
  // Apply accent color immediately when track changes
  useEffect(() => {
    if (currentTrack) {
      applyAccentFromTrack(currentTrack)
    }
  }, [currentTrack?.id, currentTrack?.coverArt])

  // Play track when queue index changes (only from navigation, not from manual play or queue additions)
  useEffect(() => {
    // Use queueRef to avoid re-triggering when queue content changes
    const currentQueue = queueRef.current
    
    console.debug('[Player] useEffect triggered - currentIndex:', currentIndex, 'lastQueueIndex:', lastQueueIndex.current, 'queue.length:', currentQueue.length, 'isManualPlay:', isManualPlay.current)
    
    // Skip if this is a manual play() call - let play() handle everything
    if (isManualPlay.current) {
      console.debug('[Player] Skipping useEffect - manual play in progress')
      isManualPlay.current = false
      lastQueueIndex.current = currentIndex
      return
    }
    
    // Only react to actual index changes
    if (currentIndex === lastQueueIndex.current) {
      console.debug('[Player] Skipping useEffect - same index')
      return
    }
    
    lastQueueIndex.current = currentIndex
    
    if (currentIndex >= 0 && currentIndex < currentQueue.length && currentQueue[currentIndex] && audioRef.current) {
      const track = currentQueue[currentIndex]
      console.debug('[Player] Track from queue:', track.title, 'lastPlayedTrackId:', lastPlayedTrackId.current)
      
      // Only switch track if it's actually a different track AND audio is not already playing this
      const audioSrc = audioRef.current.src
      const expectedSrc = subsonicApi.getStreamUrl(track.id)
      const isSameSource = audioSrc === expectedSrc || audioSrc.includes(track.id)
      
      if (track.id !== lastPlayedTrackId.current && !isSameSource) {
        const streamUrl = subsonicApi.getStreamUrl(track.id)
        console.debug('[Player] Queue index changed to', currentIndex, '- playing:', track.title)
        
        audioRef.current.pause()
        audioRef.current.src = streamUrl
        audioRef.current.currentTime = 0
        
        // Set track immediately for instant UI update
        setCurrentTrack(track)
        lastPlayedTrackId.current = track.id
        setCurrentTime(0)
        
        // Update accent color async (non-blocking)
        applyAccentFromTrack(track).catch(console.error)
        
        audioRef.current.play()
          .then(() => {
            console.debug('[Player] ✓ Autoplay successful for:', track.title)
            setIsPlaying(true)
          })
          .catch((err) => {
            console.error('[Player] ✗ Autoplay failed for:', track.title, err)
            setIsPlaying(false)
          })
        
        // Preload lyrics for next track in queue
        if (currentIndex + 1 < currentQueue.length) {
          const nextTrack = currentQueue[currentIndex + 1]
          console.debug('[Player] Preloading lyrics for next track:', nextTrack.title)
          preloadLyrics(nextTrack.id).catch(console.error)
        }

        setTimeout(() => {
          if (audioRef.current && !audioRef.current.paused) {
            subsonicApi.scrobble(track.id, true).catch(console.error)
          }
        }, Math.min(30000, (track.duration || 0) * 500))
      } else {
        console.debug('[Player] Same track, not switching')
      }
    }
  }, [currentIndex]) // Only depend on currentIndex, use queueRef for queue data

  const play = (track: Track, context?: QueueTrack[]) => {
    const streamUrl = subsonicApi.getStreamUrl(track.id)
    
    // Set flag to prevent useEffect from interfering
    isManualPlay.current = true
    lastPlayedTrackId.current = track.id
    
    // Update queue (useEffect will see isManualPlay flag and skip)
    if (context) {
      const trackIndex = context.findIndex(t => t.id === track.id)
      setQueue(context, trackIndex >= 0 ? trackIndex : 0)
      
      // Preload lyrics for next track if available
      if (trackIndex >= 0 && trackIndex + 1 < context.length) {
        const nextTrack = context[trackIndex + 1]
        console.debug('[Player] Preloading lyrics for next track:', nextTrack.title)
        preloadLyrics(nextTrack.id).catch(console.error)
      }
    }
    
    // Set track for UI update (triggers accent color extraction)
    setCurrentTrack(track)
    
    // Use requestAnimationFrame to ensure we're after all React state updates
    requestAnimationFrame(() => {
      // Create a fresh audio element to avoid any error state from previous plays
      const oldAudio = audioRef.current
      const newAudio = new Audio(streamUrl)
      newAudio.volume = volume / 100
      
      // Transfer event listeners to new audio element
      newAudio.addEventListener('timeupdate', () => {
        setCurrentTime(newAudio.currentTime || 0)
      })
      newAudio.addEventListener('durationchange', () => {
        setDuration(newAudio.duration || 0)
      })
      newAudio.addEventListener('ended', () => {
        setIsPlaying(false)
        setCurrentTime(0)
        playNext()
      })
      newAudio.addEventListener('play', () => {
        setIsPlaying(true)
      })
      newAudio.addEventListener('pause', () => {
        setIsPlaying(false)
      })
      
      // Stop and clean up old audio completely
      if (oldAudio) {
        oldAudio.pause()
        oldAudio.src = ''
        oldAudio.load() // Reset the audio element
      }
      
      // Replace the ref
      audioRef.current = newAudio
      setCurrentTime(0)
      console.debug('[Player] playing', track.id, streamUrl)
      
      // Start playback
      newAudio.play().then(() => {
        console.debug('[Player] play resolved', track.id)
        setIsPlaying(true)
      }).catch((err) => {
        console.warn('[Player] play() promise rejected', err)
        setIsPlaying(false)
        isManualPlay.current = false
      })
    })

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
    if (audioRef.current && audioRef.current.src && currentTrack) {
      audioRef.current.play().catch(err => {
        console.error('[Player] Resume failed:', err)
        setIsPlaying(false)
      })
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
