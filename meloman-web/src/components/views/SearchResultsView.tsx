import { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { Play, Clock, Music2, User, Disc } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from "@/contexts/QueueContext"
import { FullScreenLoader } from "@/components/ui/loader"
import { ArtistLinks } from "@/components/common/ArtistLinks"
import { motion } from "motion/react"

interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverArt?: string
}

interface Album {
  id: string
  name: string
  artist: string
  coverArt?: string
  songCount?: number
  duration?: number
}

interface Artist {
  id: string
  name: string
  albumCount?: number
  coverArt?: string
}

interface SearchResults {
  songs: Song[]
  albums: Album[]
  artists: Artist[]
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SearchResultsView() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') || ''
  
  const [results, setResults] = useState<SearchResults>({ songs: [], albums: [], artists: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { play, currentTrack } = usePlayer()
  const { addToQueue, addNext } = useQueue()

  useEffect(() => {
    if (query.trim()) {
      performSearch(query)
    } else {
      setResults({ songs: [], albums: [], artists: [] })
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    try {
      setLoading(true)
      setError(null)
      const data = await subsonicApi.search(searchQuery)
      console.debug('[SearchResults] search results', data)
      setResults({
        songs: data.songs || [],
        albums: data.albums || [],
        artists: data.artists || [],
      })
    } catch (err: any) {
      console.error('[SearchResults] search failed', err)
      setError(err.message || "Search failed")
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySong = (_song: Song, allSongs: Song[], index: number) => {
    const queue = allSongs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      coverArt: s.coverArt,
    }))
    play(queue[index], queue)
  }

  if (!query.trim()) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Music2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Enter a search query to see results</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <FullScreenLoader text={`Searching for "${query}"...`} />
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  const hasResults = results.songs.length > 0 || results.albums.length > 0 || results.artists.length > 0

  if (!hasResults) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Music2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No results found for "{query}"</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <h1 className="text-4xl font-bold mb-2">Search Results</h1>
        <p className="text-gray-400 mb-8">Results for "{query}"</p>

        {/* Artists Section */}
        {results.artists.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-6 w-6 text-gray-400" />
              <h2 className="text-2xl font-bold">Artists</h2>
              <span className="text-gray-500">({results.artists.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.artists.map((artist) => (
                <motion.div
                  key={artist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/artists/${artist.id}`)}
                >
                  <div className="aspect-square rounded-full overflow-hidden bg-gray-800 mb-3 group-hover:ring-2 group-hover:ring-[var(--accent-color)] transition-all">
                    {artist.coverArt ? (
                      <img
                        src={subsonicApi.getCoverArtUrl(artist.coverArt, 200)}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold truncate group-hover:text-[var(--accent-color)] transition-colors">
                    {artist.name}
                  </h3>
                  {artist.albumCount !== undefined && (
                    <p className="text-sm text-gray-400">
                      {artist.albumCount} album{artist.albumCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Albums Section */}
        {results.albums.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Disc className="h-6 w-6 text-gray-400" />
              <h2 className="text-2xl font-bold">Albums</h2>
              <span className="text-gray-500">({results.albums.length})</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.albums.map((album) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group cursor-pointer"
                  onClick={() => navigate(`/albums/${album.id}`)}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-800 mb-3 group-hover:ring-2 group-hover:ring-[var(--accent-color)] transition-all shadow-lg">
                    {album.coverArt ? (
                      <img
                        src={subsonicApi.getCoverArtUrl(album.coverArt, 300)}
                        alt={album.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Disc className="h-12 w-12 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold truncate group-hover:text-[var(--accent-color)] transition-colors">
                    {album.name}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                  {album.songCount !== undefined && (
                    <p className="text-xs text-gray-500">
                      {album.songCount} song{album.songCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Songs Section */}
        {results.songs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Music2 className="h-6 w-6 text-gray-400" />
              <h2 className="text-2xl font-bold">Songs</h2>
              <span className="text-gray-500">({results.songs.length})</span>
            </div>
            <div className="space-y-1">
              <div className="grid grid-cols-[60px_1fr_1fr_1fr_60px] gap-4 px-4 py-2 text-xs text-gray-400 uppercase border-b border-gray-800">
                <div></div>
                <div>Title</div>
                <div>Artist</div>
                <div>Album</div>
                <div className="text-right"><Clock className="h-4 w-4 inline" /></div>
              </div>

              {results.songs.map((song, index) => {
                const isActive = currentTrack?.id === song.id
                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="grid grid-cols-[60px_1fr_1fr_1fr_100px_60px] gap-4 px-4 py-3 rounded-lg hover:bg-gray-800/50 group cursor-pointer transition-colors"
                    onClick={() => handlePlaySong(song, results.songs, index)}
                    style={isActive ? { boxShadow: 'inset 0 0 0 1px var(--accent-color)', backgroundColor: 'rgba(0,0,0,0.4)' } : undefined}
                  >
                    <div className="flex items-center">
                      <div className="relative w-10 h-10 bg-gray-800 rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                        {song.coverArt ? (
                          <img
                            src={subsonicApi.getCoverArtUrl(song.coverArt, 64)}
                            alt={song.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">♪</div>
                        )}
                        <button
                          aria-label={`Play ${song.title}`}
                          className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); handlePlaySong(song, results.songs, index) }}
                        >
                          <Play className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center min-w-0">
                      <span className="text-white truncate">{song.title}</span>
                    </div>
                    <div className="flex items-center min-w-0">
                      <ArtistLinks artistString={song.artist} className="text-gray-400 truncate" />
                    </div>
                    <div className="flex items-center min-w-0">
                      <span
                        className="text-gray-400 truncate hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/albums/${song.id}`) // Note: May need albumId if available
                        }}
                      >
                        {song.album}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            addNext({
                              id: song.id,
                              title: song.title,
                              artist: song.artist,
                              album: song.album,
                              duration: song.duration,
                              coverArt: song.coverArt,
                            })
                          }}
                        >
                          Next
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            addToQueue({
                              id: song.id,
                              title: song.title,
                              artist: song.artist,
                              album: song.album,
                              duration: song.duration,
                              coverArt: song.coverArt,
                            })
                          }}
                        >
                          +
                        </Button>
                      </div>
                      <div className="text-gray-400">{formatDuration(song.duration)}</div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  )
}
