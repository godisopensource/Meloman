import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { Play, Clock, Shuffle, Music2 } from "lucide-react"
import { useNavigate } from 'react-router-dom'
import { FixedSizeList } from "react-window"
import AutoSizer from "react-virtualized-auto-sizer"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { useQueue } from '@/contexts/QueueContext'
import { FullScreenLoader } from "@/components/ui/loader"
import { ArtistLinks } from "@/components/common/ArtistLinks"
import { SortFilter } from "@/components/common/SortFilter"

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

// Memoized Row component to prevent re-renders during playback
interface RowData {
  songs: Song[]
  currentTrackId: string | undefined
  handlePlaySong: (song: Song, index: number) => void
  instanceId: string
  addNext: (track: { id: string; title: string; artist: string; album: string; duration: number; coverArt?: string }) => void
  addToQueue: (track: { id: string; title: string; artist: string; album: string; duration: number; coverArt?: string }) => void
  navigateToAlbum: (song: Song) => void
}

const SongRow = memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData }) => {
  const { songs, currentTrackId, handlePlaySong, instanceId, addNext, addToQueue, navigateToAlbum } = data
  const song = songs[index]
  const isActive = currentTrackId === song.id
  
  return (
    <div style={style} className="px-4">
      <div
        className="grid grid-cols-[60px_1fr_1fr_1fr_100px_60px] gap-4 px-4 py-3 rounded-lg hover:bg-gray-800/50 group cursor-pointer transition-colors"
        onClick={() => handlePlaySong(song, index)}
        style={isActive ? { boxShadow: 'inset 0 0 0 1px var(--accent-color)', backgroundColor: 'rgba(0,0,0,0.4)' } : undefined}
      >
        <div className="flex items-center" data-render-instance={instanceId}>
          <div className="relative w-10 h-10 bg-gray-800 rounded-lg overflow-hidden shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all cursor-pointer">
            {song.coverArt ? (
              <img
                src={subsonicApi.getCoverArtUrl(song.coverArt, 64)}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">♪</div>
            )}
            <button
              aria-label={`Play ${song.title}`}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
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
          <ArtistLinks artistString={song.artist} className="text-gray-400 truncate" />
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
        </div>
        <div className="flex items-center justify-end">
          <div className="text-gray-400">{formatDuration(song.duration)}</div>
        </div>
      </div>
    </div>
  )
})

export function SongsView() {
  const navigate = useNavigate()
  const { play, currentTrack } = usePlayer()
  const currentTrackId = currentTrack?.id // Extract only the ID to avoid re-renders
  const { addToQueue, addNext, setQueue } = useQueue()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('title')
  const [filterArtist, setFilterArtist] = useState('')
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

  const navigateToAlbum = useCallback(async (song: Song) => {
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
  }, [navigate])

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

  const sortedAndFilteredSongs = useMemo(() => {
    let filtered = songs

    if (filterArtist) {
      filtered = filtered.filter(s => s.artist === filterArtist)
    }

    const sorted = [...filtered]
    if (sortBy === 'title') {
      sorted.sort((a, b) => a.title.localeCompare(b.title))
    } else if (sortBy === 'artist') {
      sorted.sort((a, b) => a.artist.localeCompare(b.artist))
    } else if (sortBy === 'album') {
      sorted.sort((a, b) => a.album.localeCompare(b.album))
    } else if (sortBy === 'duration') {
      sorted.sort((a, b) => b.duration - a.duration)
    } else if (sortBy === 'year') {
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0))
    }

    return sorted
  }, [songs, sortBy, filterArtist])

  const artistOptions = useMemo(() => {
    const artistMap = new Map<string, number>()
    songs.forEach(song => {
      artistMap.set(song.artist, (artistMap.get(song.artist) || 0) + 1)
    })
    return Array.from(artistMap.entries())
      .map(([artist, count]) => ({ value: artist, label: artist, count }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [songs])

  const handlePlaySong = useCallback((song: Song, index: number) => {
    // Create queue from current position onwards
    const queue = sortedAndFilteredSongs.map(s => ({
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
  }, [sortedAndFilteredSongs, play])

  // Memoized row data to prevent unnecessary re-renders - must be before early returns
  const itemData = useMemo(() => ({
    songs: sortedAndFilteredSongs,
    currentTrackId,
    handlePlaySong,
    instanceId,
    addNext,
    addToQueue,
    navigateToAlbum,
  }), [sortedAndFilteredSongs, currentTrackId, handlePlaySong, instanceId, addNext, addToQueue, navigateToAlbum])

  if (loading) {
    return <FullScreenLoader text="Loading songs..." />
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

  const ROW_HEIGHT = 64

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm">
              <Music2 className="h-8 w-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Songs</h1>
              <p className="text-sm text-gray-400">{sortedAndFilteredSongs.length.toLocaleString()} tracks</p>
            </div>
          </div>
          {sortedAndFilteredSongs.length > 0 && (
            <Button 
              className="rounded-full px-6 py-2 bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
              onClick={() => {
                const shuffled = [...sortedAndFilteredSongs].sort(() => Math.random() - 0.5)
                const queue = shuffled.map(s => ({
                  id: s.id,
                  title: s.title,
                  artist: s.artist,
                  album: s.album,
                  duration: s.duration,
                  coverArt: s.coverArt,
                }))
                play(queue[0], queue)
              }}
            >
              <Shuffle className="mr-2 h-4 w-4" />
              Shuffle All
            </Button>
          )}
        </div>
        <SortFilter
          sortOptions={[
            { value: 'title', label: 'Title' },
            { value: 'artist', label: 'Artist' },
            { value: 'album', label: 'Album' },
            { value: 'duration', label: 'Duration' },
            { value: 'year', label: 'Year' },
          ]}
          filterOptions={artistOptions}
          sortValue={sortBy}
          filterValue={filterArtist}
          onSortChange={setSortBy}
          onFilterChange={setFilterArtist}
          filterLabel="Artist"
        />
      </div>
      
      <div className="px-8">
        <div className="grid grid-cols-[60px_1fr_1fr_1fr_100px_60px] gap-4 px-4 py-2 text-xs text-gray-400 uppercase border-b border-gray-800">
          <div></div>
          <div>Title</div>
          <div>Artist</div>
          <div>Album</div>
          <div className="text-right">Actions</div>
          <div className="text-right"><Clock className="h-4 w-4 inline" /></div>
        </div>
      </div>

      <div className="flex-1 mt-2" style={{ minHeight: 0 }}>
        <AutoSizer>
          {({ height, width }) => (
            <FixedSizeList
              height={height}
              itemCount={sortedAndFilteredSongs.length}
              itemSize={ROW_HEIGHT}
              width={width}
              itemData={itemData}
            >
              {SongRow}
            </FixedSizeList>
          )}
        </AutoSizer>
      </div>
    </div>
  )
}
