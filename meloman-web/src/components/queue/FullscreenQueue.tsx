import { useState, useEffect } from "react"
import { X, GripVertical, Play, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useQueue } from "@/contexts/QueueContext"
import { usePlayer } from "@/contexts/PlayerContext"
import { subsonicApi } from "@/lib/subsonic-api"
import { motion, Reorder, AnimatePresence } from "motion/react"

interface FullscreenQueueProps {
  onClose: () => void
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function FullscreenQueue({ onClose }: FullscreenQueueProps) {
  const { queue, currentIndex, removeFromQueue, setQueue, jumpTo } = useQueue()
  const { currentTrack } = usePlayer()
  const [reorderedQueue, setReorderedQueue] = useState(queue)

  useEffect(() => {
    setReorderedQueue(queue)
  }, [queue])

  const handleReorder = (newOrder: any[]) => {
    setReorderedQueue(newOrder)
    setQueue(newOrder)
  }

  const handleRemove = (index: number) => {
    removeFromQueue(index)
  }

  const handlePlay = (index: number) => {
    jumpTo(index)
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-bold">Queue</h1>
          <p className="text-gray-400 mt-1">
            {queue.length} track{queue.length !== 1 ? 's' : ''} in queue
          </p>
        </div>
        <Button
          onClick={onClose}
          variant="ghost"
          size="lg"
          className="rounded-full h-12 w-12"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Queue List */}
      <ScrollArea className="flex-1 p-6">
        {queue.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-xl mb-2">Queue is empty</p>
              <p className="text-sm">Add songs to start listening</p>
            </div>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={reorderedQueue}
            onReorder={handleReorder}
            className="space-y-2"
          >
            <AnimatePresence>
              {reorderedQueue.map((track, index) => {
                const isCurrentTrack = currentTrack?.id === track.id && index === currentIndex
                const isPastTrack = index < currentIndex

                return (
                  <Reorder.Item
                    key={track.id + index}
                    value={track}
                    className={`flex items-center gap-4 p-4 rounded-lg group transition-all ${
                      isCurrentTrack
                        ? 'bg-gradient-to-r from-[var(--accent-color)]/20 to-transparent border-l-4 border-[var(--accent-color)]'
                        : isPastTrack
                        ? 'opacity-50 hover:opacity-70 bg-gray-900/30 hover:bg-gray-800/50'
                        : 'bg-gray-900/30 hover:bg-gray-800/50'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing text-gray-600 group-hover:text-gray-400 transition-colors">
                      <GripVertical className="h-5 w-5" />
                    </div>

                    {/* Track Number */}
                    <div className="text-gray-500 font-mono text-sm w-8 text-right">
                      {index + 1}
                    </div>

                    {/* Cover Art */}
                    <motion.div
                      className="relative w-16 h-16 bg-gray-800 rounded-lg overflow-hidden shadow-lg flex-shrink-0"
                      whileHover={{ scale: 1.05 }}
                    >
                      {track.coverArt ? (
                        <img
                          src={subsonicApi.getCoverArtUrl(track.coverArt, 128)}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          ♪
                        </div>
                      )}
                      {isCurrentTrack && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-color)] flex items-center justify-center">
                            <Play className="h-4 w-4 text-white fill-white" />
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold truncate ${
                          isCurrentTrack ? 'text-[var(--accent-color)]' : 'text-white'
                        }`}
                      >
                        {track.title}
                      </div>
                      <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                      <div className="text-xs text-gray-500 truncate">{track.album}</div>
                    </div>

                    {/* Duration */}
                    <div className="text-gray-400 text-sm font-mono">
                      {formatDuration(track.duration)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isCurrentTrack && (
                        <Button
                          onClick={() => handlePlay(index)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleRemove(index)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Reorder.Item>
                )
              })}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </ScrollArea>
    </motion.div>
  )
}
