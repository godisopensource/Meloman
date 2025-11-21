import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Music2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { subsonicApi } from "@/lib/subsonic-api"

interface Playlist {
  id: string
  name: string
  songCount: number
  duration: number
  coverArt?: string
  owner?: string
  public?: boolean
  created?: string
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins} min`
}

export function PlaylistsView() {
  const navigate = useNavigate()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPlaylists()
  }, [])

  const loadPlaylists = async () => {
    try {
      setLoading(true)
      const data = await subsonicApi.getPlaylists()
      setPlaylists(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load playlists")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading playlists...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8">Playlists</h1>
        
        {playlists.length === 0 ? (
          <div className="text-gray-400">No playlists found</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {playlists.map((playlist) => (
              <div 
                key={playlist.id} 
                className="group cursor-pointer transition-all hover:bg-gray-800 p-4 rounded-lg"
                onClick={() => navigate(`/playlists/${playlist.id}`)}
              >
                <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden shadow-lg">
                  {playlist.coverArt ? (
                    <img 
                      src={subsonicApi.getCoverArtUrl(playlist.coverArt, 300)} 
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <Music2 className="w-20 h-20" />
                    </div>
                  )}
                </div>
                <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                <p className="text-sm text-gray-400 truncate">
                  {playlist.songCount} songs • {formatDuration(playlist.duration)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
