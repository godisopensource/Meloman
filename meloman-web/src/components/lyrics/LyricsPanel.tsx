import { useState, useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { motion } from "motion/react"

interface LyricLine {
  start?: number
  value: string
}

interface LyricsData {
  displayArtist?: string
  displayTitle?: string
  lang?: string
  line?: LyricLine[]
  synced?: boolean
}

interface LyricsPanelProps {
  fullscreen?: boolean
  onExitFullscreen?: () => void
}

export function LyricsPanel({ fullscreen = false, onExitFullscreen }: LyricsPanelProps = {}) {
  const { currentTrack, currentTime, seek } = usePlayer()
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [loading, setLoading] = useState(false)
  const [synced, setSynced] = useState(false)
  const [currentLineIndex, setCurrentLineIndex] = useState(-1)
  const activeLyricRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const handleLineClick = (lineStartTime?: number) => {
    if (lineStartTime !== undefined && synced && lineStartTime >= 0) {
      console.log('[Lyrics] Seeking to:', lineStartTime.toFixed(2))
      seek(lineStartTime)
    }
  }

  useEffect(() => {
    if (currentTrack?.id) {
      console.log('[Lyrics] Loading lyrics for track:', currentTrack.id)
      loadLyrics(currentTrack.id)
    } else {
      setLyrics([])
      setSynced(false)
    }
  }, [currentTrack?.id])

  useEffect(() => {
    if (!synced || lyrics.length === 0) {
      setCurrentLineIndex(-1)
      return
    }

    // Find current line with proper timing
    let foundIndex = -1
    for (let i = lyrics.length - 1; i >= 0; i--) {
      const lineStart = lyrics[i].start
      if (lineStart !== undefined && lineStart <= currentTime) {
        foundIndex = i
        break
      }
    }
    
    if (foundIndex !== currentLineIndex) {
      console.log('[Lyrics] Current time:', currentTime.toFixed(2), 'Line index:', foundIndex, 'Line start:', lyrics[foundIndex]?.start?.toFixed(2), 'Text:', lyrics[foundIndex]?.value?.substring(0, 30))
    }
    setCurrentLineIndex(foundIndex)
  }, [currentTime, lyrics, synced, currentLineIndex])

  // Auto-scroll to active lyric (Spotify-style centered)
  useEffect(() => {
    if (fullscreen && activeLyricRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeElement = activeLyricRef.current
      const containerHeight = container.clientHeight
      const elementTop = activeElement.offsetTop
      const elementHeight = activeElement.clientHeight
      
      // Center the active line
      const scrollTo = elementTop - (containerHeight / 2) + (elementHeight / 2)
      
      container.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      })
    }
  }, [currentLineIndex, fullscreen])

  const loadLyrics = async (songId: string) => {
    try {
      setLoading(true)
      const data = await subsonicApi.getLyricsBySongId(songId)
      console.log('[Lyrics] API Response:', data)
      
      if (data?.structuredLyrics && data.structuredLyrics.length > 0) {
        const lyricsData: LyricsData = data.structuredLyrics[0]
        console.log('[Lyrics] Parsed data:', { synced: lyricsData.synced, lineCount: lyricsData.line?.length })
        
        if (lyricsData.line && lyricsData.line.length > 0) {
          // Convert milliseconds to seconds
          const linesInSeconds = lyricsData.line.map(line => ({
            ...line,
            start: line.start !== undefined ? line.start / 1000 : undefined
          }))
          setLyrics(linesInSeconds)
          setSynced(lyricsData.synced || false)
          console.log('[Lyrics] First line start time (seconds):', linesInSeconds[0]?.start, 'Original (ms):', lyricsData.line[0]?.start)
        } else {
          setLyrics([])
          setSynced(false)
        }
      } else {
        setLyrics([])
        setSynced(false)
      }
    } catch (err) {
      console.error("[Lyrics] Failed to load lyrics:", err)
      setLyrics([])
      setSynced(false)
    } finally {
      setLoading(false)
    }
  }

  if (!currentTrack) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No track playing</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>Loading lyrics...</p>
      </div>
    )
  }

  if (lyrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 relative">
        {fullscreen && onExitFullscreen && (
          <Button
            onClick={onExitFullscreen}
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-gray-400 transition-colors hover:bg-gray-800"
          >
              <X className="h-5 w-5" />
            </Button>
          )}
          <p>No lyrics available</p>
        </div>
      )
    }

  // Fullscreen mode (Spotify-style)
  if (fullscreen) {
    return (
      <motion.div 
        className="h-full relative bg-gradient-to-b from-gray-900 via-black to-black"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
      >
        {/* Close button */}
        {onExitFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              onClick={onExitFullscreen}
              variant="ghost"
              size="sm"
              className="absolute top-6 right-6 z-20 text-gray-400 transition-colors hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* Header */}
        <motion.div 
          className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/80 to-transparent z-10"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-white mb-2">{currentTrack.title}</h2>
          <p className="text-xl text-gray-300">{currentTrack.artist}</p>
          {synced && (
            <p className="text-sm mt-3 flex items-center gap-2" style={{ color: 'var(--accent-color, #3b82f6)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-color, #3b82f6)' }}></span>
              Synced Lyrics
            </p>
          )}
        </motion.div>

        {/* Lyrics container with custom scroll */}
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto pt-48 pb-32 px-8"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="max-w-4xl mx-auto">
            {lyrics.map((line, index) => {
              const isCurrent = synced && index === currentLineIndex
              const isPast = synced && index < currentLineIndex

              return (
                <div
                  key={index}
                  ref={isCurrent ? activeLyricRef : null}
                  className={`py-4 transition-all duration-500 ease-out ${
                    isCurrent ? 'my-8 scale-110' : ''
                  }`}
                >
                  <p
                    onClick={() => handleLineClick(line.start)}
                    className={`transition-all duration-500 leading-relaxed cursor-pointer hover:opacity-90 ${
                      isCurrent
                        ? 'text-white font-bold text-4xl tracking-tight'
                        : isPast
                        ? 'text-gray-600 text-3xl opacity-40'
                        : 'text-gray-500 text-3xl opacity-50'
                    }`}
                  >
                    {line.value}
                  </p>
                </div>
              )
            })}
            {/* Bottom padding for better scrolling */}
            <div className="h-96"></div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Side panel mode (compact)
  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white mb-1">{currentTrack.title}</h3>
          <p className="text-sm text-gray-400">{currentTrack.artist}</p>
          {synced && (
            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--accent-color, #3b82f6)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-color, #3b82f6)' }}></span>
              Synced
            </p>
          )}
        </div>

        <div className="space-y-3">
          {lyrics.map((line, index) => {
            const isCurrent = synced && index === currentLineIndex
            const isPast = synced && index < currentLineIndex

            return (
              <p
                key={index}
                onClick={() => handleLineClick(line.start)}
                className={`text-sm transition-all duration-300 leading-relaxed cursor-pointer hover:opacity-90 ${
                  isCurrent
                    ? 'text-white font-semibold text-base'
                    : isPast
                    ? 'text-gray-600'
                    : 'text-gray-500'
                }`}
              >
                {line.value}
              </p>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
