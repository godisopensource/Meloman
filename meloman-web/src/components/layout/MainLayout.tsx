import { useState, useEffect } from "react"
import type { ReactNode } from "react"
import { Sidebar } from "./Sidebar"
import { PlayerBar } from "./PlayerBar"
import { LyricsPanel } from "@/components/lyrics/LyricsPanel"
import { QuickSearch } from "@/components/common/QuickSearch"
import { Button } from "@/components/ui/button"
import { Mic2, Maximize2 } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [showLyrics, setShowLyrics] = useState(false)
  const [fullscreenLyrics, setFullscreenLyrics] = useState(false)
  const [accentColorRgb, setAccentColorRgb] = useState('59, 130, 246')

  // Watch for accent color changes
  useEffect(() => {
    const updateAccentColor = () => {
      const rgb = getComputedStyle(document.documentElement).getPropertyValue('--accent-color-rgb').trim()
      if (rgb && rgb !== accentColorRgb) {
        setAccentColorRgb(rgb)
      }
    }
    
    // Initial update
    updateAccentColor()
    
    // Poll for changes (CSS variables don't trigger events)
    const interval = setInterval(updateAccentColor, 1000)
    return () => clearInterval(interval)
  }, [accentColorRgb])

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
    <div className="h-screen flex flex-col text-white relative overflow-hidden">
      {/* Animated background gradient with accent color */}
      <div 
        className="absolute inset-0 transition-all duration-1000 ease-in-out"
        style={{
          background: `radial-gradient(ellipse at top left, rgba(${accentColorRgb}, 0.25) 0%, transparent 50%), linear-gradient(135deg, rgba(${accentColorRgb}, 0.15) 0%, rgba(17, 24, 39, 1) 40%, rgb(0, 0, 0) 100%)`
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      <div className="relative z-10 h-full flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {!fullscreenLyrics && <Sidebar />}
        
        {!fullscreenLyrics ? (
          <main className="flex-1 overflow-auto relative">
            {/* Quick Search Bar */}
            <div className="sticky top-0 z-20 bg-gradient-to-b from-black/95 to-transparent backdrop-blur-sm p-4">
              <QuickSearch className="max-w-md mx-auto" />
            </div>
            
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
    </div>
  )
}
