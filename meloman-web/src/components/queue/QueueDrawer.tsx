import { useEffect, useState } from 'react'
import { useQueue } from '@/contexts/QueueContext'
import { Button } from '@/components/ui/button'
import { Trash2, X, ArrowUp, ArrowDown } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

export function QueueDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { queue, currentIndex, removeFromQueue, playTrack, clearQueue, moveUp, moveDown, moveItem } = useQueue()
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  // Prefer AnimatePresence and motion for nicer entry/exit animations
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed right-0 top-0 h-full w-80 bg-black border-l border-gray-800 z-40 shadow-2xl"
          initial={{ x: 60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 60, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <h3 className="text-lg font-semibold">Up Next</h3>
        <div className="flex items-center gap-2">
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
        <div className="space-y-2">
          {queue.map((t, i) => (
            <div
              key={t.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${i === currentIndex ? '' : 'hover:bg-gray-800/50'}`}
              style={i === currentIndex ? { boxShadow: 'inset 0 0 0 1px var(--accent-color)', border: '1px solid var(--accent-color)', backgroundColor: 'rgba(var(--accent-color-rgb), 0.08)' } : undefined}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', String(i)); setDraggingIndex(i) }}
              onDragOver={(e) => { e.preventDefault() }}
              onDragEnd={() => setDraggingIndex(null)}
              onDrop={(e) => { e.preventDefault(); const from = parseInt(e.dataTransfer.getData('text/plain') || '', 10); if (!Number.isNaN(from)) { moveItem(from, i) } setDraggingIndex(null) }}
            >
              <div className="min-w-0">
                <div className="text-sm text-white truncate">{t.title}</div>
                <div className="text-xs text-gray-400 truncate">{t.artist}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => moveUp(i)} disabled={i === 0}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => moveDown(i)} disabled={i === queue.length - 1}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => playTrack(i)}>
                  ▶
                </Button>
                <Button variant="ghost" size="sm" onClick={() => removeFromQueue(i)}>
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
