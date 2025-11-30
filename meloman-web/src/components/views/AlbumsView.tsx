import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react"
import { Play, X } from "lucide-react"
import { useQueue } from '@/contexts/QueueContext'
import { usePlayer } from '@/contexts/PlayerContext'
import { useNavigate, useSearchParams } from "react-router-dom"
import { subsonicApi } from "@/lib/subsonic-api"
import { FullScreenLoader } from "@/components/ui/loader"
import { SortFilter } from "@/components/common/SortFilter"
import { FixedSizeGrid } from 'react-window'
import type { GridChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'

interface Album {
  id: string
  name: string
  artist: string
  year?: number
  coverArt?: string
}

interface AlbumCellData {
  albums: Album[]
  columnCount: number
  currentTrackAlbum: string | undefined
  onAlbumClick: (id: string) => void
  onPlayAlbum: (id: string) => void
  onNavigateToArtist: (artistName: string) => void
  onNavigateToYear: (year: number) => void
  cardWidth: number
  cardHeight: number
}

// Memoized cell renderer to prevent re-renders on unrelated state changes
const AlbumCell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps<AlbumCellData>) => {
  const { albums, columnCount, currentTrackAlbum, onAlbumClick, onPlayAlbum, onNavigateToArtist, onNavigateToYear, cardWidth, cardHeight } = data
  const index = rowIndex * columnCount + columnIndex
  if (index >= albums.length) return null
  
  const album = albums[index]
  const isPlaying = currentTrackAlbum === album.name
  
  return (
    <div style={style} key={album.id}>
      <div 
        className={`group cursor-pointer hover:bg-gray-800/30 p-4 rounded-xl ${isPlaying ? 'opacity-80' : ''}`}
        onClick={() => onAlbumClick(album.id)}
        style={{ pointerEvents: 'auto', width: cardWidth, height: cardHeight }}
      >
        <div className={`relative aspect-square bg-gray-800 rounded-xl mb-4 overflow-hidden shadow-lg group-hover:scale-105 transition-transform ${isPlaying ? 'playing-border' : ''}`}>
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
          <button
            aria-label={`Play album ${album.name}`}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onPlayAlbum(album.id) }}
          >
            <Play className="h-8 w-8 text-white" />
          </button>
        </div>
        <h3 className={`font-semibold truncate ${isPlaying ? 'accent-text' : 'text-white'}`} style={!isPlaying ? { color: undefined } : undefined}>{album.name}</h3>
        <p className="text-sm text-gray-400 truncate hover:underline cursor-pointer" style={isPlaying ? { color: 'var(--accent-color, #9ca3af)' } : undefined} onClick={(e) => { e.stopPropagation(); onNavigateToArtist(album.artist) }}>{album.artist}</p>
        {album.year && (
          <button 
            className="text-xs text-gray-500 hover:text-gray-300 cursor-pointer hover:underline transition-colors relative z-10"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => { 
              e.preventDefault()
              e.stopPropagation()
              onNavigateToYear(album.year!) 
            }}
          >
            {album.year}
          </button>
        )}
      </div>
    </div>
  )
})

export function AlbumsView() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const yearParam = searchParams.get('year')
  const { setQueue } = useQueue()
  const { play, currentTrack } = usePlayer()
  const currentTrackAlbum = currentTrack?.album // Extract only album name to avoid re-renders
  const [albums, setAlbums] = useState<Album[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('name')
  const [filterArtist, setFilterArtist] = useState('')

  useEffect(() => {
    loadAlbums()
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
      
      setAlbums(unique)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load albums")
    } finally {
      setLoading(false)
    }
  }

  // Memoized sorted and filtered albums
  const sortedAndFilteredAlbums = useMemo(() => {
    console.debug('[AlbumsView] Computing sortedAndFilteredAlbums', { albumsCount: albums.length, sortBy, filterArtist, yearParam })
    let result = [...albums]
    
    // Apply year filter
    if (yearParam) {
      result = result.filter(a => a.year?.toString() === yearParam)
    }
    
    // Apply artist filter
    if (filterArtist) {
      result = result.filter(a => a.artist === filterArtist)
    }
    
    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'artist':
          return a.artist.localeCompare(b.artist)
        case 'year-desc':
          return (b.year || 0) - (a.year || 0)
        case 'year-asc':
          return (a.year || 0) - (b.year || 0)
        case 'recent':
          return b.id.localeCompare(a.id) // Assuming newer albums have higher IDs
        default:
          return 0
      }
    })
    
    console.debug('[AlbumsView] Sorted and filtered result', { resultCount: result.length })
    return result
  }, [albums, yearParam, filterArtist, sortBy])

  // Get unique artists for filter
  const artistOptions = useMemo(() => {
    const artistCounts = new Map<string, number>()
    albums.forEach(album => {
      artistCounts.set(album.artist, (artistCounts.get(album.artist) || 0) + 1)
    })
    return Array.from(artistCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([artist, count]) => ({
        value: artist,
        label: artist,
        count
      }))
  }, [albums])

  const handleAlbumClick = useCallback((albumId: string) => {
    navigate(`/albums/${albumId}`)
  }, [navigate])

  const handlePlayAlbum = useCallback(async (albumId: string) => {
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
  }, [play])

  const navigateToArtist = useCallback(async (artistName: string) => {
    try {
      const artists = await subsonicApi.getArtists()
      const found = artists.find((a: any) => (a.name || a.artist) === artistName)
      if (found) navigate(`/artists/${found.id}`)
      else navigate('/artists')
    } catch (err) {
      navigate('/artists')
    }
  }, [navigate])

  const navigateToYear = useCallback((year: number) => {
    navigate(`/albums?year=${year}`)
  }, [navigate])

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

  const CARD_WIDTH = 220
  const CARD_HEIGHT = 300
  const GAP = 24

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-8 pb-4">
        <h1 className="text-4xl font-bold">Albums</h1>
        <div className="flex items-center gap-4">
          <SortFilter
            sortOptions={[
              { value: 'name', label: 'Name' },
              { value: 'artist', label: 'Artist' },
              { value: 'year-desc', label: 'Year (Newest)' },
              { value: 'year-asc', label: 'Year (Oldest)' },
              { value: 'recent', label: 'Recently Added' },
            ]}
            filterOptions={artistOptions}
            sortValue={sortBy}
            filterValue={filterArtist}
            onSortChange={setSortBy}
            onFilterChange={setFilterArtist}
            filterLabel="Artist"
          />
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
      </div>
      <div className="flex-1 px-8 pb-8" style={{ minHeight: 0 }}>
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = Math.floor((width + GAP) / (CARD_WIDTH + GAP))
            const rowCount = Math.ceil(sortedAndFilteredAlbums.length / columnCount)
            
            const itemData: AlbumCellData = {
              albums: sortedAndFilteredAlbums,
              columnCount,
              currentTrackAlbum,
              onAlbumClick: handleAlbumClick,
              onPlayAlbum: handlePlayAlbum,
              onNavigateToArtist: navigateToArtist,
              onNavigateToYear: navigateToYear,
              cardWidth: CARD_WIDTH,
              cardHeight: CARD_HEIGHT,
            }
            
            return (
              <FixedSizeGrid
                columnCount={columnCount}
                columnWidth={CARD_WIDTH + GAP}
                height={height}
                rowCount={rowCount}
                rowHeight={CARD_HEIGHT + GAP}
                width={width}
                itemData={itemData}
              >
                {AlbumCell}
              </FixedSizeGrid>
            )
          }}
        </AutoSizer>
      </div>
    </div>
  )
}
