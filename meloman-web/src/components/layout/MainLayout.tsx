import { useState } from "react"
import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { PlayerBar } from "./PlayerBar"
import { LyricsPanel } from "@/components/lyrics/LyricsPanel"
import { Button } from "@/components/ui/button"
import { Mic2, Maximize2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [showLyrics, setShowLyrics] = useState(false)
  const [fullscreenLyrics, setFullscreenLyrics] = useState(false)

  const toggleLyrics = () => {
    if (fullscreenLyrics) {
      setFullscreenLyrics(false)
      setShowLyrics(false)
    } else if (showLyrics) {
      setFullscreenLyrics(true)
    } else {
      setShowLyrics(true)
    }
  }

  const exitFullscreen = () => {
    setFullscreenLyrics(false)
    setShowLyrics(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="flex flex-1 overflow-hidden">
        {!fullscreenLyrics && <Sidebar />}
        
        {!fullscreenLyrics ? (
          <main className="flex-1 overflow-auto relative">
            {children}
            
            {/* Lyrics Toggle Button */}
            <motion.div
              className="fixed bottom-28 right-8 z-10"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Button
                onClick={toggleLyrics}
                className="rounded-full w-12 h-12 shadow-lg"
                style={{ backgroundColor: 'var(--accent-color, #3b82f6)', color: 'var(--accent-foreground, #fff)' }}
              >
                <Mic2 className="h-5 w-5" />
              </Button>
            </motion.div>
          </main>
        ) : (
          <AnimatePresence mode="wait">
            <div className="flex-1 relative">
              <LyricsPanel fullscreen onExitFullscreen={exitFullscreen} />
            </div>
          </AnimatePresence>
        )}
        
        {/* Lyrics Side Panel */}
        <AnimatePresence>
          {showLyrics && !fullscreenLyrics && (
            <motion.div
              className="w-96 border-l border-gray-800 bg-black/50 backdrop-blur relative"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
            >
              <Button
                onClick={() => setFullscreenLyrics(true)}
                variant="ghost"
                size="sm"
                className="absolute top-4 right-4 z-10 text-gray-400 transition-colors hover:bg-gray-800"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <LyricsPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <PlayerBar />
    </div>
  )
}
