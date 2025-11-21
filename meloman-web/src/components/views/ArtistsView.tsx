import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ScrollArea } from "@/components/ui/scroll-area"
import { subsonicApi } from "@/lib/subsonic-api"

interface Artist {
  id: string
  name: string
  albumCount?: number
  coverArt?: string
}

export function ArtistsView() {
  const navigate = useNavigate()
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadArtists()
  }, [])

  const loadArtists = async () => {
    try {
      setLoading(true)
      const data = await subsonicApi.getArtists()
      setArtists(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load artists")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading artists...</div>
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
        <h1 className="text-4xl font-bold mb-8">Artists</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {artists.map((artist) => (
            <div 
              key={artist.id} 
              className="group cursor-pointer transition-all hover:bg-gray-800 p-4 rounded-lg"
              onClick={() => { /* navigate to artist detail */ navigate(`/artists/${artist.id}`) }}
            >
              <div className="aspect-square bg-gray-800 rounded-full mb-4 overflow-hidden shadow-lg">
                {artist.coverArt ? (
                  <img 
                    src={subsonicApi.getCoverArtUrl(artist.coverArt, 300)} 
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <span className="text-6xl">👤</span>
                  </div>
                )}
              </div>
              <h3 className="font-semibold text-white truncate text-center">{artist.name}</h3>
              {artist.albumCount && (
                <p className="text-xs text-gray-400 text-center mt-1">
                  {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
