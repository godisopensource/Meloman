import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Play, Clock, ArrowLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from '@/contexts/QueueContext'
import { motion } from "motion/react"

interface Song {
  id: string
  title: string
  track?: number
  duration: number
  artist: string
  album: string
  coverArt?: string
}

interface AlbumDetail {
  id: string
  name: string
  artist: string
  year?: number
  genre?: string
  coverArt?: string
  song?: Song[]
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AlbumDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { play, currentTrack } = usePlayer()
  const { addToQueue, addNext } = useQueue()
  const [album, setAlbum] = useState<AlbumDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadAlbum(id)
    }
  }, [id])

  const loadAlbum = async (albumId: string) => {
    try {
      setLoading(true)
      const data = await subsonicApi.getAlbum(albumId)
      setAlbum(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load album")
    } finally {
      setLoading(false)
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

  const handlePlaySong = (song: Song, index?: number) => {
    // Enqueue the full album and start playback at the selected track
    if (album?.song) {
      const q = album.song.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: album.name,
        duration: s.duration,
        coverArt: s.coverArt || album.coverArt,
      }))
      const idx = typeof index === 'number' ? index : 0
      const track = q[idx]
      if (track) play(track, q)
    } else {
      // Fallback: play single track
      play({
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        duration: song.duration,
        coverArt: song.coverArt || album?.coverArt,
      })
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Loading album...</div>
      </div>
    )
  }

  if (error || !album) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">{error || "Album not found"}</div>
        <Button onClick={() => navigate('/albums')} variant="outline">
          Back to Albums
        </Button>
      </div>
    )
  }

  const totalDuration = album.song?.reduce((acc, song) => acc + song.duration, 0) || 0

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <Button 
          variant="ghost" 
          className="mb-6 text-gray-400 transition-colors hover:bg-gray-800"
          onClick={() => navigate('/albums')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Albums
        </Button>

        <div className="flex gap-8 mb-8">
          <motion.div 
            className={`w-64 h-64 flex-shrink-0 bg-gray-800 rounded-xl shadow-2xl overflow-hidden cursor-pointer ${currentTrack?.album === album.name ? 'playing-border opacity-80' : ''}`}
            whileHover={{ scale: 1.05 }}
          >
            {album.coverArt ? (
              <img 
                src={subsonicApi.getCoverArtUrl(album.coverArt, 300)} 
                alt={album.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <span className="text-8xl">♪</span>
              </div>
            )}
          </motion.div>

        <div className="flex flex-col justify-end">
            <p className="text-sm text-gray-400 uppercase mb-2">Album</p>
            <div className="flex items-center gap-4">
              <h1 className="text-6xl font-bold mb-4">{album.name}</h1>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  className="rounded-full text-white font-semibold px-6 py-2 shadow-lg"
                  style={{ backgroundColor: 'var(--accent-color, #3b82f6)', color: 'var(--accent-foreground, #ffffff)' }}
                  onClick={() => {
                      // Play the album from start
                      if (album.song) {
                        const q = album.song.map(s => ({
                          id: s.id,
                          title: s.title,
                          artist: s.artist,
                          album: album.name,
                          duration: s.duration,
                          coverArt: s.coverArt || album.coverArt,
                        }))
                        const first = q[0]
                        if (first) play(first, q)
                      }
                    }}>
                  <Play className="mr-2 h-4 w-4" />
                  Play Album
                </Button>
              </motion.div>
            </div>
              <div className="flex items-center gap-2 text-gray-300">
              <span className="font-semibold hover:underline cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); navigateToArtist(album.artist) }}>{album.artist}</span>
              {album.year && (
                <>
                  <span>•</span>
                  <span>{album.year}</span>
                </>
              )}
              {album.song && (
                <>
                  <span>•</span>
                  <span>{album.song.length} songs</span>
                  <span>•</span>
                  <span>{formatDuration(totalDuration)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-[40px_40px_1fr_1fr_120px] gap-4 px-4 py-2 text-xs text-gray-400 uppercase border-b border-gray-800">
            <div>#</div>
            <div>Title</div>
            <div>Artist</div>
            <div className="text-right"><Clock className="h-4 w-4 inline" /></div>
          </div>

          {album.song?.map((song, index) => {
            const isPlaying = currentTrack?.id === song.id
            return (
            <motion.div
              key={song.id}
              className={`grid grid-cols-[40px_40px_1fr_1fr_120px] gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 group cursor-pointer ${isPlaying ? 'playing-border bg-gray-800/50' : ''}`}
              onClick={() => handlePlaySong(song, index)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`flex items-center justify-center group-hover:opacity-0 transition-opacity ${isPlaying ? 'accent-text font-bold' : 'text-gray-400'}`}>
                {song.track || index + 1}
              </div>
              <div className="flex items-center justify-center w-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="h-4 w-4 text-white" />
              </div>
              <div className="flex items-center min-w-0">
                <span className={`truncate ${isPlaying ? 'accent-text font-semibold' : 'text-white'}`}>{song.title}</span>
              </div>
              <div className="flex items-center min-w-0">
                <span className="text-gray-400 truncate hover:underline cursor-pointer" style={isPlaying ? { color: 'var(--accent-color, #9ca3af)' } : undefined} onClick={(e) => { e.stopPropagation(); navigateToArtist(song.artist) }}>{song.artist}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addNext({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt || album.coverArt }) }}>
                    Next
                  </Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addToQueue({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt || album.coverArt }) }}>
                    +
                  </Button>
                </div>
                <div className="text-gray-400">{formatDuration(song.duration)}</div>
              </div>
            </motion.div>
            )
          })}
        </div>
      </div>
    </ScrollArea>
  )
}
