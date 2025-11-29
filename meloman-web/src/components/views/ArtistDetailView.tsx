import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Play, ArrowLeft } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from "@/contexts/QueueContext"
import { FullScreenLoader } from "@/components/ui/loader"

export function ArtistDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { play } = usePlayer()
    const { addToQueue, addNext } = useQueue()
  const [artist, setArtist] = useState<any>(null)
  const [albums, setAlbums] = useState<any[]>([])
  const [songs, setSongs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadArtistDetail(id)
  }, [id])

  const loadArtistDetail = async (artistId: string) => {
    try {
      setLoading(true)
      console.debug('[ArtistDetailView] loading artist', artistId)
      
      // find artist from artist index
      const artists = await subsonicApi.getArtists()
      const found = artists.find((a: any) => a.id === artistId)
      setArtist(found)
      const name = found?.name || found?.artist || null
      console.debug('[ArtistDetailView] found artist', { name, found })

      if (name) {
        // search for albums and songs matching artist name
        const results = await subsonicApi.search(name)
        console.debug('[ArtistDetailView] search results', { albums: results.albums.length, songs: results.songs.length })
        
        // Dedupe albums by normalized artist+name
        const albumMap = new Map<string, any>()
        for (const album of results.albums || []) {
          const artist = (album.artist || '').toString().trim().toLowerCase()
          const albumName = (album.name || album.title || '').toString().trim().toLowerCase()
          const key = `${artist}::${albumName}`
          if (!albumMap.has(key)) {
            albumMap.set(key, album)
          }
        }
        const uniqueAlbums = Array.from(albumMap.values())
        console.debug('[ArtistDetailView] deduped albums', { before: results.albums.length, after: uniqueAlbums.length })
        
        // Dedupe songs by normalized title+artist
        const songMap = new Map<string, any>()
        for (const song of results.songs || []) {
          const artist = (song.artist || '').toString().trim().toLowerCase()
          const title = (song.title || song.name || '').toString().trim().toLowerCase()
          const key = `${title}::${artist}`
          if (!songMap.has(key)) {
            songMap.set(key, song)
          }
        }
        const uniqueSongs = Array.from(songMap.values())
        console.debug('[ArtistDetailView] deduped songs', { before: results.songs.length, after: uniqueSongs.length })
        
        setAlbums(uniqueAlbums)
        setSongs(uniqueSongs)
      } else {
        setAlbums([])
        setSongs([])
      }
      setError(null)
    } catch (err: any) {
      console.error('[ArtistDetailView] error', err)
      setError(err.message || "Failed to load artist")
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySong = (_song: any, index: number) => {
    const queue = songs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      coverArt: s.coverArt,
    }))
    const track = queue[index]
    if (track) {
      console.debug('[ArtistDetailView] overlay play', { id: track.id, title: track.title, index })
      play(track, queue)
    }
  }

  const handlePlayAllSongs = () => {
    if (songs.length > 0) {
      const queue = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        coverArt: s.coverArt,
      }))
      const first = queue[0]
      if (first) play(first, queue)
    }
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
      console.error('[ArtistDetailView] play album failed', err)
    }
  }

  if (loading) {
    return <FullScreenLoader text="Loading artist..." />
  }

  if (error || !artist) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-400">{error || "Artist not found"}</div>
      </div>
    )
  }

  const artistName = artist?.name || artist?.artist || 'Artist'

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <Button 
          variant="ghost" 
          className="mb-6 text-gray-400 transition-colors hover:bg-gray-800"
          onClick={() => navigate('/artists')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Artists
        </Button>

        <div className="flex gap-8 mb-8">
          <div className="w-64 h-64 flex-shrink-0 bg-gray-800 rounded-full shadow-2xl overflow-hidden">
            {artist.coverArt ? (
              <img 
                src={subsonicApi.getCoverArtUrl(artist.coverArt, 300)} 
                alt={artistName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">
                <span className="text-8xl">👤</span>
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <p className="text-sm text-gray-400 uppercase mb-2">Artist</p>
            <h1 className="text-6xl font-bold mb-4">{artistName}</h1>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-300">{albums.length} albums · {songs.length} songs</p>
              {songs.length > 0 && (
                <Button 
                  className="rounded-full text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{ backgroundColor: 'var(--accent-color, #3b82f6)', color: 'var(--accent-foreground, #ffffff)' }}
                  onClick={handlePlayAllSongs}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Play All
                </Button>
              )}
            </div>
          </div>
        </div>

        {albums.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Albums</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {albums.map((album: any) => (
                <div 
                  key={album.id} 
                  className="group cursor-pointer transition-all hover:bg-gray-800/30 p-4 rounded-xl hover:scale-105 duration-300"
                  onClick={() => navigate(`/albums/${album.id}`)}
                >
                  <div className="aspect-square bg-gray-800 rounded-xl mb-4 overflow-hidden shadow-lg group-hover:shadow-2xl transition-all duration-300 relative">
                    {album.coverArt ? (
                      <img 
                        src={subsonicApi.getCoverArtUrl(album.coverArt, 300)} 
                        alt={album.name || album.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <span className="text-6xl">♪</span>
                      </div>
                    )}
                    <button
                      aria-label={`Play album ${album.name || album.title}`}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handlePlayAlbum(album.id) }}
                    >
                      <Play className="h-6 w-6 text-white" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-white truncate transition-colors group-hover:opacity-90">{album.name || album.title}</h3>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                  {album.year && <p className="text-xs text-gray-500">{album.year}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {songs.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Top Songs</h2>
            <div className="space-y-1">
              {songs.slice(0, 20).map((song: any, index: number) => (
                <div 
                  key={song.id} 
                  className="grid grid-cols-[40px_60px_1fr_1fr_120px_80px] gap-4 px-4 py-3 rounded-lg hover:bg-gray-800 group cursor-pointer transition-colors"
                  onClick={() => handlePlaySong(song, index)}
                >
                  <div className="flex items-center justify-center text-gray-400 group-hover:opacity-0 transition-opacity">
                    {index + 1}
                  </div>
                    <div className="relative w-12 h-12 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    {song.coverArt ? (
                      <img 
                        src={subsonicApi.getCoverArtUrl(song.coverArt, 64)} 
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">♪</div>
                    )}
                      <button
                        aria-label={`Play ${song.title}`}
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); handlePlaySong(song, index) }}
                      >
                        <Play className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  <div className="flex items-center">
                    <span className="text-white truncate">{song.title}</span>
                  </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addNext({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt }) }}>Next</Button>
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); addToQueue({ id: song.id, title: song.title, artist: song.artist, album: song.album, duration: song.duration, coverArt: song.coverArt }) }}>+</Button>
                    </div>
                  <div className="flex items-center">
                    <span className="text-gray-400 truncate">{song.album}</span>
                  </div>
                  <div className="flex items-center justify-end text-gray-400">
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ScrollArea>
  )
}
