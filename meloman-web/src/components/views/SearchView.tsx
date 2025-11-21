import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Play } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"

interface SearchResults {
  albums: any[]
  artists: any[]
  songs: any[]
}

export function SearchView() {
  const navigate = useNavigate()
  const { play } = usePlayer()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResults>({ albums: [], artists: [], songs: [] })
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ albums: [], artists: [], songs: [] })
      setHasSearched(false)
      return
    }

    try {
      setLoading(true)
      setHasSearched(true)
      const data = await subsonicApi.search(searchQuery)
      setResults(data)
    } catch (err) {
      console.error("Search failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value)
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const handlePlaySong = (song: any) => {
    play({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt,
    })
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-8">Search</h1>
        
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            placeholder="Search for albums, artists, or songs..."
            className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading && <div className="text-gray-400">Searching...</div>}

        {!loading && hasSearched && (
          <div className="space-y-8">
            {results.songs.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Songs</h2>
                <div className="space-y-1">
                  {results.songs.map((song) => (
                    <div
                      key={song.id}
                      className="flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 group cursor-pointer transition-colors"
                      onClick={() => handlePlaySong(song)}
                    >
                      <div className="relative w-12 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                        {song.coverArt ? (
                          <img 
                            src={subsonicApi.getCoverArtUrl(song.coverArt, 64)} 
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">♪</div>
                        )}
                      <button
                      aria-label={`Play ${song.title}`}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handlePlaySong(song) }}
                    >
                      <Play className="h-4 w-4 text-white" />
                    </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white truncate">{song.title}</div>
                        <div className="text-sm text-gray-400 truncate">{song.artist}</div>
                      </div>
                      <div className="text-sm text-gray-400">{formatDuration(song.duration)}</div>
                      
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.albums.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Albums</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {results.albums.map((album) => (
                    <div 
                      key={album.id} 
                      className="group cursor-pointer transition-all hover:bg-gray-800 p-4 rounded-lg"
                      onClick={() => navigate(`/albums/${album.id}`)}
                    >
                      <div className="aspect-square bg-gray-800 rounded-lg mb-4 overflow-hidden shadow-lg">
                        {album.coverArt ? (
                          <img 
                            src={subsonicApi.getCoverArtUrl(album.coverArt, 300)} 
                            alt={album.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <span className="text-6xl">♪</span>
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-white truncate">{album.name}</h3>
                      <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.artists.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Artists</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {results.artists.map((artist) => (
                    <div 
                      key={artist.id} 
                      className="group cursor-pointer transition-all hover:bg-gray-800 p-4 rounded-lg"
                      onClick={() => navigate(`/artists/${artist.id}`)}
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasSearched && !loading && results.albums.length === 0 && results.artists.length === 0 && results.songs.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                No results found for "{query}"
              </div>
            )}
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="text-center text-gray-400 py-12">
            Search for your favorite music
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
