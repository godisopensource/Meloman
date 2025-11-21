import { useState, useEffect } from "react"
import { Play, Clock } from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from '@/contexts/QueueContext'

interface Song {
  id: string
  title: string
  artist: string
  album: string
  artistId?: string
  albumId?: string
  duration: number
  coverArt?: string
  year?: number
}

// Module-level guard to ensure only one SongsView mounts its main list
let _songsViewPrimaryInstance: string | null = null

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SongsView() {
  const navigate = useNavigate()
  const { play, currentTrack } = usePlayer()
  const { addToQueue, addNext, setQueue } = useQueue()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const instanceId = (Math.random().toString(36).slice(2, 8))
  const [isPrimary, setIsPrimary] = useState(false)

  useEffect(() => {
    console.debug('[SongsView] mounted', instanceId)
    // Register primary instance if none
    if (!_songsViewPrimaryInstance) {
      _songsViewPrimaryInstance = instanceId
      setIsPrimary(true)
    } else if (_songsViewPrimaryInstance === instanceId) {
      setIsPrimary(true)
    }

    return () => {
      console.debug('[SongsView] unmounted', instanceId)
      if (_songsViewPrimaryInstance === instanceId) {
        _songsViewPrimaryInstance = null
      }
    }
  }, [])

  // Log DOM instances and row counts for debugging duplicates
  useEffect(() => {
    const logDomState = () => {
      try {
        const containers = Array.from(document.querySelectorAll('[data-songs-instance]'))
        console.debug('[SongsView] DOM instances count', containers.length, containers.map(c => c.getAttribute('data-songs-instance')))
        const rows = document.querySelectorAll('.space-y-1 > .grid')
        console.debug('[SongsView] DOM rows count', rows.length)
      } catch (e) {
        console.error('[SongsView] error counting DOM instances', e)
      }
    }
    // run on mount and whenever songs change
    logDomState()
    const t = setTimeout(logDomState, 200)
    return () => clearTimeout(t)
  }, [songs])

  useEffect(() => {
    loadSongs()
  }, [])

  const navigateToArtist = async (song: Song) => {
    try {
      if ((song as any).artistId) {
        navigate(`/artists/${(song as any).artistId}`)
        return
      }
      if ((song as any).albumArtistId) {
        navigate(`/artists/${(song as any).albumArtistId}`)
        return
      }
      const artists = await subsonicApi.getArtists()
      const found = artists.find((a: any) => (a.name || a.artist) === song.artist)
      if (found) navigate(`/artists/${found.id}`)
      else navigate('/artists')
    } catch (err) {
      navigate('/artists')
    }
  }

  const navigateToAlbum = async (song: Song) => {
    try {
      if ((song as any).albumId) {
        navigate(`/albums/${(song as any).albumId}`)
        return
      }
      const res = await subsonicApi.search(song.album)
      const found = (res.albums || []).find((a:any) => (a.name || a.title) === song.album)
      if (found) navigate(`/albums/${found.id}`)
      else navigate('/albums')
    } catch (err) {
      navigate('/albums')
    }
  }

  const loadSongs = async () => {
    try {
      setLoading(true)
      const data = await subsonicApi.getSongs(500)
      console.debug('[SongsView] received songs', { count: data.length, sample: data.slice(0,8) })
      // Defensive dedupe by normalized title+artist (preferred UX when same song appears under different IDs)
      const seenKeys = new Set<string>()
      const unique: Song[] = []
      for (const s of data) {
        const title = (s.title || '').toString().trim().toLowerCase()
        const artist = (s.artist || '').toString().trim().toLowerCase()
        const key = `${title}::${artist}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          unique.push(s)
        } else {
          console.debug('[SongsView] duplicate song detected by title+artist', { key, id: s.id, title: s.title })
        }
      }
      console.debug('[SongsView] deduped songs by title+artist', { before: data.length, after: unique.length })
      setSongs(unique)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load songs")
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySong = (song: Song, index: number) => {
    // Create queue from current position onwards
    const queue = songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      coverArt: s.coverArt,
    }))
    // Start playback immediately and provide the full queue as context
    console.debug('[SongsView] overlay play', { id: song.id, title: song.title, index })
    play({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt,
    }, queue)
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading songs...</div>
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

  // If this is not the primary instance, avoid rendering the full list (dev-only safeguard)
  if (!isPrimary) {
    return (
      <div className="h-full p-8">
        <h1 className="text-4xl font-bold mb-8">Songs</h1>
        <div className="text-sm text-gray-500">Another instance is rendering the list — hiding this duplicate.</div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8" data-songs-instance={instanceId}>
        <h1 className="text-4xl font-bold mb-8">Songs</h1>
        
        <div className="space-y-1">
          <div className="grid grid-cols-[60px_1fr_1fr_1fr_60px] gap-4 px-4 py-2 text-xs text-gray-400 uppercase border-b border-gray-800">
            <div></div>
            <div>Title</div>
            <div>Artist</div>
            <div>Album</div>
            <div className="text-right"><Clock className="h-4 w-4 inline" /></div>
          </div>

          {songs.map((song, index) => {
            console.debug('[SongsView] rendering row', instanceId, index, song.id)
            const isActive = currentTrack?.id === song.id
            return (
              <div
                key={song.id}
                className="grid grid-cols-[60px_1fr_1fr_1fr_100px_60px] gap-4 px-4 py-3 rounded-lg hover:bg-gray-800/50 group cursor-pointer transition-colors"
                onClick={() => handlePlaySong(song, index)}
                style={isActive ? { boxShadow: 'inset 0 0 0 1px var(--accent-color)', backgroundColor: 'rgba(0,0,0,0.4)' } : undefined}
              >
                <div className="flex items-center" data-render-instance={instanceId}>
                  <div className="relative w-10 h-10 bg-gray-800 rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow cursor-pointer">
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
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handlePlaySong(song, index) }}
                    >
                      <Play className="h-5 w-5 text-white" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center min-w-0">
                  <div className="flex-1 min-w-0">
                      <span className="text-white truncate block">{song.title}</span>
                    </div>
                  
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 truncate hover:underline cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); navigateToArtist(song) }}>{song.artist}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 truncate hover:underline cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); navigateToAlbum(song) }}>{song.album}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addNext({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt }) }}>
                      Next
                    </Button>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addToQueue({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt }) }}>
                      +
                    </Button>
                  </div>
                  <div className="text-gray-400">{formatDuration(song.duration)}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
