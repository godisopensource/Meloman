import { useState, useEffect, useRef } from "react"
import { Play, X } from "lucide-react"
import { useQueue } from '@/contexts/QueueContext'
import { usePlayer } from '@/contexts/PlayerContext'
import { useNavigate, useSearchParams } from "react-router-dom"
import { ScrollArea } from "@/components/ui/scroll-area"
import { subsonicApi } from "@/lib/subsonic-api"
import { saveScrollPosition, getScrollPosition } from "@/lib/scrollRestoration"
import { motion } from "motion/react"
import { FullScreenLoader } from "@/components/ui/loader"

interface Album {
  id: string
  name: string
  artist: string
  year?: number
  coverArt?: string
}

export function AlbumsView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const yearParam = searchParams.get('year')
  const { setQueue } = useQueue()
  const { play, currentTrack } = usePlayer()
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAlbums()
    // Restore scroll position
    const savedPosition = getScrollPosition('albums-list')
    if (savedPosition && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: savedPosition })
      }, 100)
    }
  }, [])

  useEffect(() => {
    // Save scroll position when unmounting
    return () => {
      if (scrollRef.current) {
        saveScrollPosition('albums-list', scrollRef.current.scrollTop)
      }
    }
  }, [])

  const loadAlbums = async () => {
    try {
      setLoading(true)
      const data = await subsonicApi.getAlbums()
      console.debug('[AlbumsView] received albums', { count: data.length, sample: data.slice(0,5) })
      // Defensive dedupe in case API returns variants: normalize artist+name
      const seen = new Map<string, Album>()
      for (const a of data) {
        const artist = (a.artist || '').toString().trim().toLowerCase()
        const name = (a.name || a.title || '').toString().trim().toLowerCase()
        const key = `${artist}::${name}`
        if (!seen.has(key)) seen.set(key, a)
        else {
          console.debug('[AlbumsView] duplicate detected', { key, existing: seen.get(key), duplicate: a })
        }
      }
      const unique = Array.from(seen.values())
      console.debug('[AlbumsView] deduped albums', { before: data.length, after: unique.length })
      
      // Apply year filter if present
      const filtered = yearParam ? unique.filter(a => a.year?.toString() === yearParam) : unique
      console.debug('[AlbumsView] year filter', { yearParam, before: unique.length, after: filtered.length })
      
      setAlbums(filtered)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load albums")
    } finally {
      setLoading(false)
    }
  }

  const handleAlbumClick = (albumId: string) => {
    if (scrollRef.current) {
      saveScrollPosition('albums-list', scrollRef.current.scrollTop)
    }
    navigate(`/albums/${albumId}`)
  }

  const handlePlayAlbum = async (albumId: string) => {
    try {
      const detail = await subsonicApi.getAlbum(albumId)
      const q = (detail.song || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: detail.name || detail.title,
        duration: s.duration,
        coverArt: s.coverArt || detail.coverArt,
      }))
      const first = q[0]
      if (first) play(first, q)
    } catch (err) {
      console.error('[AlbumsView] play album failed', err)
    }
  }

  const navigateToArtist = async (artistName: string) => {
    try {
      const artists = await subsonicApi.getArtists()
      const found = artists.find((a: any) => (a.name || a.artist) === artistName)
      if (found) navigate(`/artists/${found.id}`)
      else navigate('/artists')
    } catch (err) {
      navigate('/artists')
    }
  }

  if (loading) {
    return <FullScreenLoader text="Loading albums..." />
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Albums</h1>
          {yearParam && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-300">Year: {yearParam}</span>
              <button 
                onClick={() => setSearchParams({})}
                className="hover:bg-gray-700 p-1 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {albums.map((album) => {
            const isPlaying = currentTrack?.album === album.name
            return (
            <motion.div 
              key={album.id} 
              className={`group cursor-pointer hover:bg-gray-800/30 p-4 rounded-xl ${isPlaying ? 'opacity-80' : ''}`}
              onClick={() => handleAlbumClick(album.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              style={{ pointerEvents: 'auto' }}
            >
              <div className={`relative aspect-square bg-gray-800 rounded-xl mb-4 overflow-hidden shadow-lg ${isPlaying ? 'playing-border' : ''}`}>
                {album.coverArt ? (
                  <motion.img 
                    src={subsonicApi.getCoverArtUrl(album.coverArt, 300)} 
                    alt={album.name}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                  />
                  ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <span className="text-6xl">♪</span>
                  </div>
                  )}
                  <motion.button
                    aria-label={`Play album ${album.name}`}
                    className="absolute inset-0 flex items-center justify-center bg-black/40"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album.id) }}
                  >
                    <Play className="h-8 w-8 text-white" />
                  </motion.button>
              </div>
              <h3 className={`font-semibold truncate ${isPlaying ? 'accent-text' : 'text-white'}`} style={!isPlaying ? { color: undefined } : undefined}>{album.name}</h3>
              <p className="text-sm text-gray-400 truncate hover:underline cursor-pointer" style={isPlaying ? { color: 'var(--accent-color, #9ca3af)' } : undefined} onClick={(e) => { e.stopPropagation(); navigateToArtist(album.artist) }}>{album.artist}</p>
              {album.year && (
                <button 
                  className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer hover:underline transition-colors relative z-10"
                  style={{ pointerEvents: 'auto' }}
                  onClick={(e) => { 
                    e.preventDefault()
                    e.stopPropagation()
                    navigate(`/albums?year=${album.year}`) 
                  }}
                >
                  {album.year}
                </button>
              )}
            </motion.div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
