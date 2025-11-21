import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface QueueTrack {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverArt?: string
}

interface QueueContextType {
  queue: QueueTrack[]
  currentIndex: number
  shuffle: boolean
  repeat: 'none' | 'all' | 'one'
  setQueue: (tracks: QueueTrack[], startIndex?: number) => void
  addToQueue: (track: QueueTrack) => void
  addNext: (track: QueueTrack) => void
  removeFromQueue: (index: number) => void
  playTrack: (index: number) => void
  playNext: () => boolean
  playPrevious: () => boolean
  toggleShuffle: () => void
  setRepeat: (mode: 'none' | 'all' | 'one') => void
  clearQueue: () => void
  moveItem: (from: number, to: number) => void
  moveUp: (index: number) => void
  moveDown: (index: number) => void
}

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export function QueueProvider({ children }: { children: ReactNode }) {
  const [queue, setQueueState] = useState<QueueTrack[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeatState] = useState<'none' | 'all' | 'one'>('none')
  const [originalQueue, setOriginalQueue] = useState<QueueTrack[]>([])

  const setQueue = useCallback((tracks: QueueTrack[], startIndex: number = 0) => {
    setQueueState(tracks)
    setOriginalQueue(tracks)
    setCurrentIndex(startIndex)
  }, [])

  const addToQueue = useCallback((track: QueueTrack) => {
    setQueueState(prev => [...prev, track])
    setOriginalQueue(prev => [...prev, track])
  }, [])

  const addNext = useCallback((track: QueueTrack) => {
    const newIndex = currentIndex + 1
    setQueueState(prev => {
      const newQueue = [...prev]
      newQueue.splice(newIndex, 0, track)
      return newQueue
    })
    setOriginalQueue(prev => {
      const newQueue = [...prev]
      newQueue.splice(newIndex, 0, track)
      return newQueue
    })
  }, [currentIndex])

  const removeFromQueue = useCallback((index: number) => {
    setQueueState(prev => prev.filter((_, i) => i !== index))
    setOriginalQueue(prev => prev.filter((_, i) => i !== index))
    if (index < currentIndex) {
      setCurrentIndex(prev => prev - 1)
    }
  }, [currentIndex])

  const playTrack = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  const playNext = useCallback(() => {
    if (queue.length === 0) return false

    if (repeat === 'one') {
      return true // Stay on current track
    }

    let nextIndex = currentIndex + 1

    if (nextIndex >= queue.length) {
      if (repeat === 'all') {
        nextIndex = 0
      } else {
        return false // End of queue
      }
    }

    setCurrentIndex(nextIndex)
    return true
  }, [queue.length, currentIndex, repeat])

  const playPrevious = useCallback(() => {
    if (queue.length === 0) return false

    let prevIndex = currentIndex - 1

    if (prevIndex < 0) {
      if (repeat === 'all') {
        prevIndex = queue.length - 1
      } else {
        prevIndex = 0
      }
    }

    setCurrentIndex(prevIndex)
    return true
  }, [queue.length, currentIndex, repeat])

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => {
      const newShuffle = !prev
      
      if (newShuffle) {
        // Shuffle the queue but keep current track at current position
        const currentTrack = queue[currentIndex]
        const otherTracks = queue.filter((_, i) => i !== currentIndex)
        const shuffled = [...otherTracks].sort(() => Math.random() - 0.5)
        
        if (currentTrack) {
          shuffled.splice(currentIndex, 0, currentTrack)
        }
        
        setQueueState(shuffled)
      } else {
        // Restore original order
        const currentTrack = queue[currentIndex]
        const originalIndex = originalQueue.findIndex(t => t.id === currentTrack?.id)
        setQueueState(originalQueue)
        setCurrentIndex(originalIndex >= 0 ? originalIndex : currentIndex)
      }
      
      return newShuffle
    })
  }, [queue, currentIndex, originalQueue])

  const setRepeat = useCallback((mode: 'none' | 'all' | 'one') => {
    setRepeatState(mode)
  }, [])

  const clearQueue = useCallback(() => {
    setQueueState([])
    setOriginalQueue([])
    setCurrentIndex(-1)
  }, [])

  const moveItem = useCallback((from: number, to: number) => {
    if (from === to) return
    setQueueState(prev => {
      const newQueue = [...prev]
      if (from < 0 || from >= newQueue.length) return prev
      if (to < 0) to = 0
      if (to >= newQueue.length) to = newQueue.length - 1
      const [item] = newQueue.splice(from, 1)
      newQueue.splice(to, 0, item)
      return newQueue
    })
    setOriginalQueue(prev => {
      const newQueue = [...prev]
      if (from < 0 || from >= newQueue.length) return prev
      if (to < 0) to = 0
      if (to >= newQueue.length) to = newQueue.length - 1
      const [item] = newQueue.splice(from, 1)
      newQueue.splice(to, 0, item)
      return newQueue
    })

    // Update current index to reflect move
    setCurrentIndex(prevIndex => {
      if (prevIndex === from) return to
      if (from < to) {
        // item moved down
        if (prevIndex > from && prevIndex <= to) return prevIndex - 1
      } else {
        // item moved up
        if (prevIndex >= to && prevIndex < from) return prevIndex + 1
      }
      return prevIndex
    })
  }, [])

  const moveUp = useCallback((index: number) => {
    if (index <= 0) return
    moveItem(index, index - 1)
  }, [moveItem])

  const moveDown = useCallback((index: number) => {
    moveItem(index, index + 1)
  }, [moveItem])

  return (
    <QueueContext.Provider
      value={{
        queue,
        currentIndex,
        shuffle,
        repeat,
        setQueue,
        addToQueue,
        addNext,
        removeFromQueue,
        playTrack,
        playNext,
        playPrevious,
        toggleShuffle,
        setRepeat,
        clearQueue,
        moveItem,
        moveUp,
        moveDown,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}

export function useQueue() {
  const context = useContext(QueueContext)
  if (context === undefined) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}
