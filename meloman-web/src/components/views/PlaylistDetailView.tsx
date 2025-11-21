import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Play, Clock, ArrowLeft } from "lucide-react"
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
  duration: number
  coverArt?: string
}

interface PlaylistDetail {
  id: string
  name: string
  songCount: number
  duration: number
  owner?: string
  public?: boolean
  created?: string
  coverArt?: string
  entry?: Song[]
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlaylistDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { play } = usePlayer()
  const { setQueue, addToQueue, addNext } = useQueue()
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadPlaylist(id)
    }
  }, [id])

  const loadPlaylist = async (playlistId: string) => {
    try {
      setLoading(true)
      const data = await subsonicApi.getPlaylist(playlistId)
      setPlaylist(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load playlist")
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySong = (song: Song, index?: number) => {
    if (playlist?.entry) {
      const q = playlist.entry.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: playlist.name,
        duration: s.duration,
        coverArt: s.coverArt || playlist.coverArt,
      }))
      setQueue(q, typeof index === 'number' ? index : 0)
    } else {
      play({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        coverArt: song.coverArt,
      })
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading playlist...</div>
      </div>
    )
  }

  if (error || !playlist) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">{error || "Playlist not found"}</div>
        <Button onClick={() => navigate('/playlists')} variant="outline">
          Back to Playlists
        </Button>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <Button 
          variant="ghost" 
          className="mb-6 text-gray-400 transition-colors hover:bg-gray-800"
          onClick={() => navigate('/playlists')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Playlists
        </Button>

        <div className="flex gap-8 mb-8">
          <div className="w-64 h-64 flex-shrink-0 bg-gray-800 rounded-xl shadow-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-300">
            {playlist.coverArt ? (
              <img 
                src={subsonicApi.getCoverArtUrl(playlist.coverArt, 300)} 
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <span className="text-8xl">🎵</span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <p className="text-sm text-gray-400 uppercase mb-2">Playlist</p>
            <div className="flex flex-col gap-4">
              <h1 className="text-6xl font-bold">{playlist.name}</h1>
              <Button 
                className="rounded-full text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200 w-fit"
                style={{ backgroundColor: 'var(--accent-color, #3b82f6)', color: 'var(--accent-foreground, #ffffff)' }}
                onClick={() => {
                if (playlist.entry) {
                  const q = playlist.entry.map(s => ({
                    id: s.id,
                    title: s.title,
                    artist: s.artist,
                    album: playlist.name,
                    duration: s.duration,
                    coverArt: s.coverArt || playlist.coverArt,
                  }))
                  setQueue(q, 0)
                }
              }}>
                <Play className="mr-2 h-4 w-4" />
                Play Playlist
              </Button>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              {playlist.owner && <span>{playlist.owner}</span>}
              {playlist.songCount && (
                <>
                  <span>•</span>
                  <span>{playlist.songCount} songs</span>
                </>
              )}
              {playlist.duration && (
                <>
                  <span>•</span>
                  <span>{formatDuration(playlist.duration)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[40px_1fr_1fr_60px] gap-4 px-4 py-2 text-xs text-gray-400 uppercase border-b border-gray-800">
            <div>#</div>
            <div>Title</div>
            <div>Artist</div>
            <div className="text-right"><Clock className="h-4 w-4 inline" /></div>
          </div>

          {playlist.entry?.map((song, index) => (
            <div
              key={song.id}
              className="grid grid-cols-[40px_1fr_1fr_100px_60px] gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 group cursor-pointer transition-colors"
              onClick={() => handlePlaySong(song, index)}
            >
              <div className="flex items-center justify-center text-gray-400 group-hover:opacity-0 transition-opacity">
                {index + 1}
              </div>
              <div className="opacity-0 group-hover:opacity-100 items-center justify-center transition-opacity">
                <Play className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center">
                <span className="text-white truncate">{song.title}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 truncate hover:underline cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); }}>{song.artist}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addNext({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt || playlist.coverArt }) }}>
                    Next
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addToQueue({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt || playlist.coverArt }) }}>
                    +
                  </Button>
                </div>
                <div className="text-gray-400">{formatDuration(song.duration)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  )
}
