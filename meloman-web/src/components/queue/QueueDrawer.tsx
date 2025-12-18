import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueue } from '@/contexts/QueueContext'
import { Button } from '@/components/ui/button'
import { Trash2, X, ArrowUp, ArrowDown, Maximize2, Minimize2, GripVertical, Play, Music2 } from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'motion/react'
import { usePlayer } from '@/contexts/PlayerContext'
import { subsonicApi } from '@/lib/subsonic-api'

export function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentIndex, removeFromQueue, playTrack, clearQueue, moveUp, moveDown, moveItem } = useQueue()
  const { currentTrack, isPlaying } = usePlayer()
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  
  const toggleFullscreen = () => setFullscreen(!fullscreen)
  
  // Calculate upcoming and history
  const upcomingTracks = queue.slice(currentIndex + 1)
  const historyTracks = queue.slice(0, currentIndex)
  const currentQueueTrack = queue[currentIndex]

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Calculate total remaining time
  const totalRemainingTime = upcomingTracks.reduce((acc, t) => acc + (t.duration || 0), 0)
  
  // Use portal to render at document body level for proper full-screen positioning
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={fullscreen 
              ? "fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-50 overflow-hidden" 
              : "fixed right-0 top-0 bottom-0 w-96 bg-black/90 backdrop-blur-2xl border-l border-white/10 z-50 shadow-2xl"
            }
            initial={fullscreen ? { opacity: 0 } : { x: 60, opacity: 0 }}
            animate={fullscreen ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={fullscreen ? { opacity: 0 } : { x: 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
          {/* Header */}
          <div className={`p-6 flex items-center justify-between border-b border-white/10 ${fullscreen ? 'bg-gradient-to-b from-black/50 to-transparent' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`${fullscreen ? 'p-3' : 'p-2'} rounded-xl bg-gradient-to-br from-[var(--accent-color)]/20 to-purple-500/20`}>
                <Music2 className={`${fullscreen ? 'h-6 w-6' : 'h-5 w-5'} text-[var(--accent-color)]`} />
              </div>
              <div>
                <h3 className={`${fullscreen ? 'text-2xl' : 'text-lg'} font-bold`}>Queue</h3>
                <p className="text-xs text-gray-400">
                  {queue.length} tracks • {formatDuration(totalRemainingTime)} remaining
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleFullscreen}
                className="rounded-full hover:bg-white/10"
              >
                {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => clearQueue()}
                className="rounded-full hover:bg-red-500/20 text-red-400"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="rounded-full hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className={`overflow-y-auto ${fullscreen ? 'h-[calc(100%-88px)] p-8' : 'h-[calc(100%-88px)] p-4'}`}>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Music2 className="h-16 w-16 mb-4 opacity-50" />
                <p>Queue is empty</p>
                <p className="text-sm mt-2">Add songs to start playing</p>
              </div>
            ) : (
              <div className={`${fullscreen ? 'max-w-4xl mx-auto space-y-8' : 'space-y-4'}`}>
                {/* Now Playing */}
                {currentQueueTrack && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Now Playing</h4>
                    <motion.div
                      className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[var(--accent-color)]/20 to-transparent border border-[var(--accent-color)]/30 ${fullscreen ? 'p-6' : ''}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={currentQueueTrack.id}
                    >
                      <div className="relative">
                        {currentQueueTrack.coverArt ? (
                          <img
                            src={subsonicApi.getCoverArtUrl(currentQueueTrack.coverArt, fullscreen ? 120 : 80)}
                            alt={currentQueueTrack.title}
                            className={`${fullscreen ? 'w-24 h-24' : 'w-16 h-16'} rounded-xl object-cover shadow-lg`}
                          />
                        ) : (
                          <div className={`${fullscreen ? 'w-24 h-24' : 'w-16 h-16'} rounded-xl bg-gray-800 flex items-center justify-center`}>
                            <Music2 className="w-8 h-8 text-gray-600" />
                          </div>
                        )}
                        {isPlaying && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[var(--accent-color)] rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold truncate text-[var(--accent-color)] ${fullscreen ? 'text-xl' : 'text-base'}`}>
                          {currentQueueTrack.title}
                        </div>
                        <div className="text-sm text-gray-400 truncate">{currentQueueTrack.artist}</div>
                        {fullscreen && <div className="text-xs text-gray-500 truncate mt-1">{currentQueueTrack.album}</div>}
                      </div>
                      <div className="text-sm text-gray-400">
                        {formatDuration(currentQueueTrack.duration || 0)}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Up Next */}
                {upcomingTracks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Up Next ({upcomingTracks.length})
                    </h4>
                    <div className="space-y-2">
                      {upcomingTracks.map((t, idx) => {
                        const actualIndex = currentIndex + 1 + idx
                        return (
                          <motion.div
                            key={`${t.id}-${actualIndex}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all ${fullscreen ? 'p-4' : ''}`}
                            onClick={() => playTrack(actualIndex)}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(actualIndex)); setDraggingIndex(actualIndex) }}
                            onDragOver={(e) => { e.preventDefault() }}
                            onDragEnd={() => setDraggingIndex(null)}
                            onDrop={(e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain') || '', 10); if (!Number.isNaN(from)) { moveItem(from, actualIndex) } setDraggingIndex(null) }}
                          >
                            <div className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            {t.coverArt ? (
                              <img
                                src={subsonicApi.getCoverArtUrl(t.coverArt, 64)}
                                alt={t.title}
                                className={`${fullscreen ? 'w-14 h-14' : 'w-10 h-10'} rounded-lg object-cover`}
                              />
                            ) : (
                              <div className={`${fullscreen ? 'w-14 h-14' : 'w-10 h-10'} rounded-lg bg-gray-800 flex items-center justify-center`}>
                                <Music2 className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate text-white group-hover:text-[var(--accent-color)] transition-colors">
                                {t.title}
                              </div>
                              <div className="text-xs text-gray-400 truncate">{t.artist}</div>
                              {fullscreen && <div className="text-xs text-gray-500 truncate">{t.album}</div>}
                            </div>
                            <div className="text-xs text-gray-500">{formatDuration(t.duration || 0)}</div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 rounded-full hover:bg-white/10"
                                onClick={(e) => { e.stopPropagation(); playTrack(actualIndex) }}
                              >
                                <Play className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 rounded-full hover:bg-red-500/20 text-red-400"
                                onClick={(e) => { e.stopPropagation(); removeFromQueue(actualIndex) }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* History */}
                {historyTracks.length > 0 && (
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Previously Played ({historyTracks.length})
                    </h4>
                    <div className="space-y-1 opacity-50">
                      {historyTracks.map((t, idx) => (
                        <div
                          key={`${t.id}-${idx}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                          onClick={() => playTrack(idx)}
                        >
                          {t.coverArt ? (
                            <img
                              src={subsonicApi.getCoverArtUrl(t.coverArt, 40)}
                              alt={t.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                              <Music2 className="w-3 h-3 text-gray-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs truncate text-gray-400">{t.title}</div>
                            <div className="text-xs text-gray-500 truncate">{t.artist}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
