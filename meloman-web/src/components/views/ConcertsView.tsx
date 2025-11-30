import { useState, useEffect, useCallback } from "react"
import { Calendar, MapPin, Search, RefreshCw, Ticket, Clock, AlertCircle } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { motion } from "motion/react"

interface Concert {
  id: string
  artistName: string
  eventName: string
  venue: string
  city: string
  date: string
  time?: string
  ticketUrl?: string
  imageUrl?: string
}

interface Artist {
  id: string
  name: string
  albumCount?: number
  coverArt?: string
}

interface ConcertConfig {
  city: string
  country: string
  radius: number
}

const getConcertConfig = (): ConcertConfig => {
  const stored = localStorage.getItem('concert_config')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return { city: '', country: '', radius: 100 }
    }
  }
  return { city: '', country: '', radius: 100 }
}

const saveConcertConfig = (config: ConcertConfig) => {
  localStorage.setItem('concert_config', JSON.stringify(config))
}

// Bandsintown API - free tier available
const BANDSINTOWN_APP_ID = 'meloman_music_player'

async function searchArtistConcerts(artistName: string, city?: string): Promise<Concert[]> {
  try {
    const encodedArtist = encodeURIComponent(artistName)
    const response = await fetch(
      `https://rest.bandsintown.com/artists/${encodedArtist}/events?app_id=${BANDSINTOWN_APP_ID}`,
      { headers: { 'Accept': 'application/json' } }
    )
    
    if (!response.ok) {
      return []
    }
    
    const events = await response.json()
    
    if (!Array.isArray(events)) {
      return []
    }
    
    return events.map((event: any) => ({
      id: event.id || `${artistName}-${event.datetime}`,
      artistName,
      eventName: event.title || `${artistName} Live`,
      venue: event.venue?.name || 'TBA',
      city: `${event.venue?.city || ''}, ${event.venue?.region || ''} ${event.venue?.country || ''}`.trim(),
      date: new Date(event.datetime).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: event.datetime ? new Date(event.datetime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }) : undefined,
      ticketUrl: event.url,
      imageUrl: event.artist?.image_url
    })).filter((concert: Concert) => {
      if (!city) return true
      const cityLower = city.toLowerCase()
      return concert.city.toLowerCase().includes(cityLower)
    })
  } catch (err) {
    console.error(`[Concerts] Failed to fetch concerts for ${artistName}:`, err)
    return []
  }
}

export function ConcertsView() {
  const [config, setConfig] = useState<ConcertConfig>(getConcertConfig())
  const [showConfig, setShowConfig] = useState(false)
  const [configCity, setConfigCity] = useState(config.city)
  const [configCountry, setConfigCountry] = useState(config.country)
  const [loading, setLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, artist: '' })
  const [artists, setArtists] = useState<Artist[]>([])
  const [concerts, setConcerts] = useState<Concert[]>([])
  const [filteredConcerts, setFilteredConcerts] = useState<Concert[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadArtists()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredConcerts(concerts.filter(c => 
        c.artistName.toLowerCase().includes(query) ||
        c.venue.toLowerCase().includes(query) ||
        c.city.toLowerCase().includes(query)
      ))
    } else {
      setFilteredConcerts(concerts)
    }
  }, [searchQuery, concerts])

  const loadArtists = async () => {
    try {
      const response = await subsonicApi.getArtists()
      // The response is an array of index objects with artist arrays
      if (Array.isArray(response)) {
        const allArtists: Artist[] = []
        response.forEach((index: any) => {
          if (index.artist && Array.isArray(index.artist)) {
            allArtists.push(...index.artist)
          }
        })
        setArtists(allArtists)
      }
    } catch (err) {
      console.error('[Concerts] Failed to load artists:', err)
    }
  }

  const fetchAllConcerts = useCallback(async () => {
    if (artists.length === 0) {
      setError('No artists in your library. Add some music first!')
      return
    }

    setLoading(true)
    setError(null)
    setConcerts([])
    setLoadingProgress({ current: 0, total: artists.length, artist: '' })

    const allConcerts: Concert[] = []
    const batchSize = 5
    
    for (let i = 0; i < artists.length; i += batchSize) {
      const batch = artists.slice(i, i + batchSize)
      
      setLoadingProgress({ 
        current: Math.min(i + batchSize, artists.length), 
        total: artists.length, 
        artist: batch[0]?.name || '' 
      })

      const batchResults = await Promise.all(
        batch.map(artist => searchArtistConcerts(artist.name, config.city))
      )
      
      batchResults.forEach(concertBatch => {
        allConcerts.push(...concertBatch)
      })

      if (i + batchSize < artists.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    allConcerts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    setConcerts(allConcerts)
    setFilteredConcerts(allConcerts)
    setLoading(false)

    if (allConcerts.length === 0) {
      setError(config.city 
        ? `No upcoming concerts found near ${config.city}. Try a different location or remove the filter.`
        : 'No upcoming concerts found for artists in your library.')
    }
  }, [artists, config.city])

  const handleSaveConfig = () => {
    const newConfig = { ...config, city: configCity, country: configCountry }
    setConfig(newConfig)
    saveConcertConfig(newConfig)
    setShowConfig(false)
  }

  const groupConcertsByMonth = (concertList: Concert[]) => {
    const groups: { [key: string]: Concert[] } = {}
    concertList.forEach(concert => {
      const date = new Date(concert.date)
      const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      if (!groups[monthKey]) {
        groups[monthKey] = []
      }
      groups[monthKey].push(concert)
    })
    return groups
  }

  const concertsByMonth = groupConcertsByMonth(filteredConcerts)

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm">
              <Calendar className="h-10 w-10 text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Concerts</h1>
              <p className="text-gray-400">
                {config.city 
                  ? `Tour dates near ${config.city}`
                  : 'Tour dates from artists in your library'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfig(true)}
              className="flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" />
              {config.city || 'Set Location'}
            </Button>
            <Button
              onClick={fetchAllConcerts}
              disabled={loading || artists.length === 0}
              style={{ backgroundColor: 'var(--accent-color)' }}
              className="flex items-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find Concerts
            </Button>
          </div>
        </motion.div>

        {/* Location Config Modal */}
        {showConfig && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setShowConfig(false)}
          >
            <motion.div
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-4">Set Your Location</h2>
              <p className="text-gray-400 mb-6">
                Filter concerts by location to find shows near you.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input
                    type="text"
                    value={configCity}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigCity(e.target.value)}
                    placeholder="e.g., New York, Los Angeles, London"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Country (optional)</label>
                  <input
                    type="text"
                    value={configCountry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfigCountry(e.target.value)}
                    placeholder="e.g., USA, UK, Germany"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                  />
                </div>

                <p className="text-sm text-gray-500">
                  Leave empty to show all concerts worldwide.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowConfig(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Save Location
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Stats Bar */}
        {artists.length > 0 && (
          <motion.div
            className="grid grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-[var(--accent-color)]">{artists.length}</div>
              <div className="text-sm text-gray-400">Artists in Library</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-orange-400">{concerts.length}</div>
              <div className="text-sm text-gray-400">Upcoming Concerts</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-3xl font-bold text-green-400">
                {new Set(concerts.map(c => c.artistName)).size}
              </div>
              <div className="text-sm text-gray-400">Artists Touring</div>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <motion.div
            className="py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center mb-8">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-orange-400 animate-spin" />
              <p className="text-lg font-medium">Searching for concerts...</p>
              <p className="text-gray-400">
                Checking {loadingProgress.current} of {loadingProgress.total} artists
              </p>
              {loadingProgress.artist && (
                <p className="text-sm text-gray-500 mt-2">
                  Currently: {loadingProgress.artist}
                </p>
              )}
            </div>
            <div className="max-w-md mx-auto">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(loadingProgress.current / loadingProgress.total) * 100}%` 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && !loading && (
          <motion.div
            className="p-6 rounded-xl bg-orange-500/10 border border-orange-500/30 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-400" />
            <p className="text-orange-300">{error}</p>
          </motion.div>
        )}

        {/* Search Filter */}
        {concerts.length > 0 && !loading && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                placeholder="Filter by artist, venue, or city..."
                className="w-full h-12 pl-12 pr-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
              />
            </div>
          </motion.div>
        )}

        {/* Concerts List */}
        {!loading && Object.keys(concertsByMonth).length > 0 && (
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {Object.entries(concertsByMonth).map(([month, monthConcerts], monthIdx) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: monthIdx * 0.05 }}
              >
                <h2 className="text-xl font-bold mb-4 text-gray-300">{month}</h2>
                <div className="space-y-3">
                  {monthConcerts.map((concert, idx) => (
                    <motion.div
                      key={concert.id}
                      className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-orange-500/30 transition-all"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                    >
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-400 uppercase">
                          {new Date(concert.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-orange-400">
                          {new Date(concert.date).getDate()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-lg truncate group-hover:text-orange-400 transition-colors">
                          {concert.artistName}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{concert.venue}</span>
                        </div>
                        <div className="text-sm text-gray-500">{concert.city}</div>
                      </div>

                      {concert.time && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          {concert.time}
                        </div>
                      )}

                      {concert.ticketUrl && (
                        <a
                          href={concert.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors"
                        >
                          <Ticket className="h-4 w-4" />
                          Tickets
                        </a>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty State - Initial */}
        {!loading && concerts.length === 0 && !error && (
          <motion.div
            className="text-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Calendar className="h-20 w-20 mx-auto mb-6 text-gray-600" />
            <h2 className="text-2xl font-bold mb-2">Find Live Shows</h2>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Click "Find Concerts" to search for upcoming tour dates from the {artists.length} artists in your library.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfig(true)}
                className="gap-2"
              >
                <MapPin className="h-4 w-4" />
                Set Location First
              </Button>
              <Button
                onClick={fetchAllConcerts}
                disabled={artists.length === 0}
                style={{ backgroundColor: 'var(--accent-color)' }}
                className="gap-2"
              >
                <Search className="h-4 w-4" />
                Find All Concerts
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  )
}
