import { useState, useRef, useEffect } from "react"
import { Search, X } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { subsonicApi } from "@/lib/subsonic-api"

interface QuickSearchProps {
  className?: string
}

export function QuickSearch({ className = "" }: QuickSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any>({ albums: [], artists: [], songs: [] })
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchDelayed = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true)
        try {
          const data = await subsonicApi.search(query.trim())
          setResults(data)
        } catch (err) {
          console.error('Search failed:', err)
        } finally {
          setLoading(false)
        }
      } else {
        setResults({ albums: [], artists: [], songs: [] })
      }
    }, 300)

    return () => clearTimeout(searchDelayed)
  }, [query])

  const handleResultClick = async (type: 'album' | 'artist' | 'song', item: any) => {
    setIsOpen(false)
    setQuery("")
    if (type === 'album') {
      navigate(`/albums/${item.id}`)
    } else if (type === 'artist') {
      navigate(`/artists/${item.id}`)
    } else if (type === 'song') {
      // Try to find and navigate to the song's album
      try {
        const albums = await subsonicApi.search(item.album)
        const found = albums.albums?.find((a: any) => a.name === item.album)
        if (found) {
          navigate(`/albums/${found.id}`)
        } else {
          navigate('/songs')
        }
      } catch (err) {
        console.error('Failed to find album:', err)
        navigate('/songs')
      }
    }
  }

  const totalResults = results.albums.length + results.artists.length + results.songs.length

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Quick search..."
          className="w-full pl-10 pr-10 py-2 bg-gray-800/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all"
          style={{
            '--tw-ring-color': 'rgba(var(--accent-color-rgb, 59, 130, 246), 0.5)'
          } as React.CSSProperties}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setResults({ albums: [], artists: [], songs: [] })
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto border"
            style={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(var(--accent-color-rgb, 59, 130, 246), 0.3)'
            }}
          >
            {loading && (
              <div className="p-4 text-center text-gray-400">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}

            {!loading && totalResults === 0 && (
              <div className="p-4 text-center text-gray-400">No results found</div>
            )}

            {!loading && results.artists.length > 0 && (
              <div className="p-2">
                <div className="px-3 py-2 text-xs text-gray-500 uppercase font-semibold">Artists</div>
                {results.artists.slice(0, 3).map((artist: any) => (
                  <div
                    key={artist.id}
                    onClick={() => handleResultClick('artist', artist)}
                    className="px-3 py-2 hover:bg-gray-700 rounded cursor-pointer transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex-shrink-0">
                      {artist.coverArt ? (
                        <img
                          src={subsonicApi.getCoverArtUrl(artist.coverArt, 50)}
                          alt={artist.name || artist.artist}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">♪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{artist.name || artist.artist}</div>
                      {artist.albumCount && (
                        <div className="text-xs text-gray-400">{artist.albumCount} albums</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.albums.length > 0 && (
              <div className="p-2 border-t border-gray-700">
                <div className="px-3 py-2 text-xs text-gray-500 uppercase font-semibold">Albums</div>
                {results.albums.slice(0, 3).map((album: any) => (
                  <div
                    key={album.id}
                    onClick={() => handleResultClick('album', album)}
                    className="px-3 py-2 hover:bg-gray-700 rounded cursor-pointer transition-colors flex items-center gap-3"
                  >
                    {album.coverArt && (
                      <img
                        src={subsonicApi.getCoverArtUrl(album.coverArt, 50)}
                        alt={album.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{album.name || album.title}</div>
                      <div className="text-xs text-gray-400 truncate">{album.artist}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.songs.length > 0 && (
              <div className="p-2 border-t border-gray-700">
                <div className="px-3 py-2 text-xs text-gray-500 uppercase font-semibold">Songs</div>
                {results.songs.slice(0, 3).map((song: any) => (
                  <div
                    key={song.id}
                    onClick={() => handleResultClick('song', song)}
                    className="px-3 py-2 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                  >
                    <div className="text-white font-medium truncate">{song.title}</div>
                    <div className="text-xs text-gray-400 truncate">{song.artist} • {song.album}</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && totalResults > 0 && (
              <div className="p-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    navigate(`/search/results?q=${encodeURIComponent(query)}`)
                    setIsOpen(false)
                    setQuery("")
                  }}
                  className="w-full px-3 py-2 text-sm text-blue-400 hover:text-blue-300 text-center"
                >
                  View all results →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
