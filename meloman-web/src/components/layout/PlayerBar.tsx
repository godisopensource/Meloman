import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Repeat1, Shuffle, ListMusic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from "@/contexts/QueueContext"
import { subsonicApi } from "@/lib/subsonic-api"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { QueueDrawer } from "@/components/queue/QueueDrawer"
import { motion } from "motion/react"
import { ArtistLinks } from "@/components/common/ArtistLinks"

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlayerBar() {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlayPause, seek, setVolume, skipNext, skipPrevious } = usePlayer()
  const { shuffle, repeat, toggleShuffle, setRepeat } = useQueue()
  const [queueOpen, setQueueOpen] = useState(false)
  const navigate = useNavigate()
  
  const handleTrackNameClick = async () => {
    if (!currentTrack?.album) return
    try {
      const albums = await subsonicApi.search(currentTrack.album)
      const found = albums.albums?.find((a: any) => a.name === currentTrack.album)
      if (found) navigate(`/albums/${found.id}`)
    } catch (err) {
      console.error('Failed to find album:', err)
    }
  }

  const handleProgressChange = (value: number[]) => {
    seek(value[0])
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
  }

  return (
    <div className="h-24 bg-black border-t border-gray-800 px-4 flex items-center justify-between">
      {/* Track Info */}
      <div className="flex items-center gap-4 w-[30%]">
        {currentTrack ? (
          <>
            <motion.div 
              className={`w-14 h-14 bg-gray-800 rounded-lg overflow-hidden shadow-md cursor-pointer ${isPlaying ? 'playing-border' : ''}`}
              whileHover={{ scale: 1.05 }}
            >
              {currentTrack.coverArt ? (
                <img 
                  src={subsonicApi.getCoverArtUrl(currentTrack.coverArt, 64)} 
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">♪</div>
              )}
            </motion.div>
            <div className="min-w-0">
              <div 
                className={`text-sm font-bold truncate hover:underline cursor-pointer transition-colors ${isPlaying ? 'accent-text' : 'text-white'}`}
                onClick={handleTrackNameClick}
              >
                {currentTrack.title}
              </div>
              <ArtistLinks 
                artistString={currentTrack.artist} 
                className="text-xs text-gray-400 truncate"
              />
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-gray-800 rounded-lg"></div>
            <div>
              <div className="text-sm font-medium text-gray-600">No track playing</div>
            </div>
          </>
        )}
      </div>

      {/* Player Controls */}
      <div className="flex flex-col items-center gap-2 w-[40%]">
        <div className="flex items-center gap-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleShuffle}
              className="transition-colors"
              style={shuffle ? { color: 'var(--accent-color, #3b82f6)' } : { color: '#9ca3af' }}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipPrevious}
              className="transition-colors"
              style={{ color: '#ffffff' }}
            >
              <SkipBack className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}>
            <Button 
              size="sm" 
              className="h-10 w-10 rounded-full"
              style={{ backgroundColor: 'var(--accent-color, #3b82f6)', color: 'var(--accent-foreground, #ffffff)' }}
              onClick={togglePlayPause}
              disabled={!currentTrack}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={skipNext}
              className="transition-colors"
              style={{ color: '#ffffff' }}
            >
              <SkipForward className="h-5 w-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}
              className="transition-colors"
              style={repeat !== 'none' ? { color: 'var(--accent-color, #3b82f6)' } : { color: '#9ca3af' }}
            >
              {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Button>
          </motion.div>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <Slider 
            value={[currentTime]} 
            max={duration || 100} 
            step={1}
            onValueChange={handleProgressChange}
            className="flex-1"
            disabled={!currentTrack}
          />
          <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
        <div className="flex items-center gap-2 w-[30%] justify-end">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVolume(volume > 0 ? 0 : 70)}
            className="text-gray-400"
            style={{ color: 'var(--accent-foreground, #fff)' }}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </motion.div>
        <Slider 
          value={[volume]} 
          max={100} 
          step={1}
          onValueChange={handleVolumeChange}
          className="w-24"
        />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setQueueOpen(prev => !prev)}
          className="text-gray-400 ml-4 transition-colors"
        >
          <ListMusic className="h-5 w-5" />
        </Button>
      </div>

      {/* Queue Drawer */}
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  )
}
