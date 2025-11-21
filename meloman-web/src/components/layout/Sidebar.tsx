import { useNavigate, useLocation } from "react-router-dom"
import { Home, Search, Music, Users, Disc, ListMusic } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
]

const libraryItems = [
  { icon: Disc, label: "Albums", path: "/albums" },
  { icon: Users, label: "Artists", path: "/artists" },
  { icon: Music, label: "Songs", path: "/songs" },
  { icon: ListMusic, label: "Playlists", path: "/playlists" },
]

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  return (
    <div className="w-64 bg-black text-white flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold cursor-pointer" onClick={() => navigate('/')}>
          Meloman
        </h1>
      </div>
      
      <nav className="px-3 flex-1">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className="w-full justify-start transition-colors hover:bg-gray-800"
              style={isActive(item.path) ? { color: 'var(--accent-color, #3b82f6)' } : { color: '#d1d5db' }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-800">
          <h2 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Library
          </h2>
          <div className="space-y-1">
            {libraryItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className="w-full justify-start transition-colors hover:bg-gray-800"
                style={isActive(item.path) ? { color: 'var(--accent-color, #3b82f6)' } : { color: '#d1d5db' }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  )
}
