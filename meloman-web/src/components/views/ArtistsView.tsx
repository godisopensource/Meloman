import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { useNavigate } from "react-router-dom"
import { Users } from "lucide-react"
import { FixedSizeGrid } from 'react-window'
import type { GridChildComponentProps } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { subsonicApi } from "@/lib/subsonic-api"
import { FullScreenLoader } from "@/components/ui/loader"
import { SortFilter } from "@/components/common/SortFilter"

interface Artist {
  id: string
  name: string
  albumCount?: number
  coverArt?: string
}

interface ArtistCellData {
  artists: Artist[]
  columnCount: number
  onNavigate: (id: string) => void
  cardWidth: number
  cardHeight: number
}

// Memoized cell renderer to prevent re-renders on unrelated state changes
const ArtistCell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps<ArtistCellData>) => {
  const { artists, columnCount, onNavigate, cardWidth, cardHeight } = data
  const index = rowIndex * columnCount + columnIndex
  if (index >= artists.length) return null
  
  const artist = artists[index]
  
  return (
    <div style={style} key={artist.id}>
      <div 
        className="group cursor-pointer transition-all hover:bg-gray-800 p-4 rounded-lg"
        onClick={() => onNavigate(artist.id)}
        style={{ width: cardWidth, height: cardHeight }}
      >
        <div className="aspect-square bg-gray-800 rounded-full mb-4 overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
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
        {artist.albumCount && (
          <p className="text-xs text-gray-400 text-center mt-1">
            {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
          </p>
        )}
      </div>
    </div>
  )
})

export function ArtistsView() {
  const navigate = useNavigate()
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('name')
  const [filterLetter, setFilterLetter] = useState('')

  const handleNavigateToArtist = useCallback((id: string) => {
    navigate(`/artists/${id}`)
  }, [navigate])

  useEffect(() => {
    loadArtists()
  }, [])

  const loadArtists = async () => {
    try {
      setLoading(true)
      const data = await subsonicApi.getArtists()
      setArtists(data)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to load artists")
    } finally {
      setLoading(false)
    }
  }

  const sortedAndFilteredArtists = useMemo(() => {
    let filtered = artists

    if (filterLetter) {
      filtered = filtered.filter(a => 
        a.name.toLowerCase().startsWith(filterLetter.toLowerCase())
      )
    }

    const sorted = [...filtered]
    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortBy === 'albums') {
      sorted.sort((a, b) => (b.albumCount || 0) - (a.albumCount || 0))
    }

    return sorted
  }, [artists, sortBy, filterLetter])

  const letterOptions = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
    return letters.map(letter => {
      const count = artists.filter(a => 
        a.name.toLowerCase().startsWith(letter.toLowerCase())
      ).length
      return { value: letter, label: letter, count }
    }).filter(opt => opt.count > 0)
  }, [artists])

  if (loading) {
    return <FullScreenLoader text="Loading artists..." />
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    )
  }

  const CARD_WIDTH = 180
  const CARD_HEIGHT = 250
  const GAP = 24

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm">
            <Users className="h-8 w-8 text-green-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Artists</h1>
            <p className="text-sm text-gray-400">{sortedAndFilteredArtists.length.toLocaleString()} artists</p>
          </div>
        </div>
        <SortFilter
          sortOptions={[
            { value: 'name', label: 'Name' },
            { value: 'albums', label: 'Album Count' },
          ]}
          filterOptions={letterOptions}
          sortValue={sortBy}
          filterValue={filterLetter}
          onSortChange={setSortBy}
          onFilterChange={setFilterLetter}
          filterLabel="Letter"
        />
      </div>
      <div className="flex-1 px-8 pb-8" style={{ minHeight: 0 }}>
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = Math.floor((width + GAP) / (CARD_WIDTH + GAP))
            const rowCount = Math.ceil(sortedAndFilteredArtists.length / columnCount)
            
            const itemData: ArtistCellData = {
              artists: sortedAndFilteredArtists,
              columnCount,
              onNavigate: handleNavigateToArtist,
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
                {ArtistCell}
              </FixedSizeGrid>
            )
          }}
        </AutoSizer>
      </div>
    </div>
  )
}
