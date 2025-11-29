import { useEffect, useState } from 'react'
import { useQueue } from '@/contexts/QueueContext'
import { Button } from '@/components/ui/button'
import { Trash2, X, ArrowUp, ArrowDown, Maximize2, Minimize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { usePlayer } from '@/contexts/PlayerContext'
import { subsonicApi } from '@/lib/subsonic-api'

export function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentIndex, removeFromQueue, playTrack, clearQueue, moveUp, moveDown, moveItem } = useQueue()
  const { currentTrack } = usePlayer()
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  
  const toggleFullscreen = () => setFullscreen(!fullscreen)
  
  // Prefer AnimatePresence and motion for nicer entry/exit animations
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={fullscreen ? "fixed inset-0 bg-black z-50" : "fixed right-0 top-0 h-full w-80 bg-black border-l border-gray-800 z-40 shadow-2xl"}
          initial={fullscreen ? { opacity: 0 } : { x: 60, opacity: 0 }}
          animate={fullscreen ? { opacity: 1 } : { x: 0, opacity: 1 }}
          exit={fullscreen ? { opacity: 0 } : { x: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <h3 className={fullscreen ? "text-3xl font-bold" : "text-lg font-semibold"}>Up Next {fullscreen && `(${queue.length})`}</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => clearQueue()}>
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="p-3 overflow-y-auto h-[calc(100%-64px)]">
        {queue.length === 0 && <div className="text-gray-500">Queue is empty</div>}
        <div className={fullscreen ? "grid grid-cols-1 gap-2 max-w-4xl mx-auto" : "space-y-2"}>
          {queue.map((t, i) => (
            <div
              key={`${t.id}-${i}`}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer ${i === currentIndex ? '' : 'hover:bg-gray-800/50'}`}
              style={i === currentIndex ? { boxShadow: 'inset 0 0 0 1px var(--accent-color)', border: '1px solid var(--accent-color)', backgroundColor: 'rgba(var(--accent-color-rgb), 0.08)' } : undefined}
              onClick={() => playTrack(i)}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); setDraggingIndex(i) }}
              onDragOver={(e) => { e.preventDefault() }}
              onDragEnd={() => setDraggingIndex(null)}
              onDrop={(e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain') || '', 10); if (!Number.isNaN(from)) { moveItem(from, i) } setDraggingIndex(null) }}
            >
              {fullscreen && t.coverArt && (
                <img
                  src={subsonicApi.getCoverArtUrl(t.coverArt, 80)}
                  alt={t.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${i === currentIndex ? 'font-bold' : ''} ${i === currentIndex ? 'text-[var(--accent-color)]' : 'text-white'}`}>{t.title}</div>
                <div className="text-xs text-gray-400 truncate">{t.artist}</div>
                {fullscreen && <div className="text-xs text-gray-500 truncate">{t.album}</div>}
              </div>
              <div className="flex items-center gap-1">
                {!fullscreen && (
                  <>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); moveUp(i) }} disabled={i === 0}>
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); moveDown(i) }} disabled={i === queue.length - 1}>
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeFromQueue(i) }}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
