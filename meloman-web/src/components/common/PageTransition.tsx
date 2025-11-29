import { motion } from "motion/react"
import { ReactNode } from "react"
import { useLocation } from "react-router-dom"

interface PageTransitionProps {
  children: ReactNode
}

// Sidebar routes use vertical transitions, others use horizontal
const SIDEBAR_ROUTES = ['/', '/albums', '/artists', '/songs', '/playlists', '/search']

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()
  const isRootPath = SIDEBAR_ROUTES.includes(location.pathname) || location.pathname.startsWith('/search')
  
  return (
    <motion.div
      initial={{ opacity: 0, [isRootPath ? 'y' : 'x']: isRootPath ? 20 : 40 }}
      animate={{ opacity: 1, [isRootPath ? 'y' : 'x']: 0 }}
      exit={{ opacity: 0, [isRootPath ? 'y' : 'x']: isRootPath ? -20 : -40 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}
