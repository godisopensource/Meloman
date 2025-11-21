import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Play, Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { motion } from "motion/react"

interface Album {
  id: string
  name: string
  artist: string
  coverArt?: string
  created?: string
}

interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverArt?: string
  created?: string
}

export function HomeView() {
  const navigate = useNavigate()
  const { play } = usePlayer()
  const [recentAlbums, setRecentAlbums] = useState<Album[]>([])
  const [recentSongs, setRecentSongs] = useState<Song[]>([])
  const [userName, setUserName] = useState<string>("Utilisateur")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Get user info
      try {
        const user = await subsonicApi.getUser()
        if (user?.username) {
          setUserName(user.username)
        }
      } catch (err) {
        console.error("Failed to get user info:", err)
      }

      // Get recent albums
      try {
        const albums = await subsonicApi.getAlbums()
        // Sort by created date if available
        const sorted = albums
          .filter((a: any) => a.created)
          .sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime())
          .slice(0, 10)
        setRecentAlbums(sorted.length > 0 ? sorted : albums.slice(0, 10))
      } catch (err) {
        console.error("Failed to load recent albums:", err)
      }

      // Get recent songs
      try {
        const songs = await subsonicApi.search3({ query: '', songCount: 20 })
        if (songs?.song) {
          setRecentSongs(songs.song.slice(0, 10))
        }
      } catch (err) {
        console.error("Failed to load recent songs:", err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePlaySong = (song: Song) => {
    play({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      coverArt: song.coverArt,
    })
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bonjour"
    if (hour < 18) return "Bon après-midi"
    return "Bonsoir"
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-6xl font-bold mb-2">{getGreeting()}, {userName}</h1>
          <p className="text-gray-400 text-lg mb-8">Découvrez votre musique</p>
        </motion.div>

        {/* Recent Albums */}
        {recentAlbums.length > 0 && (
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold mb-6">Albums récents</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {recentAlbums.map((album, index) => (
                <motion.div
                  key={album.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className="group cursor-pointer hover:bg-gray-800/30 p-4 rounded-xl"
                  onClick={() => navigate(`/albums/${album.id}`)}
                >
                  <div className="relative aspect-square bg-gray-800 rounded-xl mb-4 overflow-hidden shadow-lg">
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
                  </div>
                  <h3 className="font-semibold text-white truncate">{album.name}</h3>
                  <p className="text-sm text-gray-400 truncate">{album.artist}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Songs */}
        {recentSongs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-6">Dernières musiques</h2>
            <div className="space-y-2">
              {recentSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  className="group grid grid-cols-[60px_1fr_auto] gap-4 p-3 rounded-lg hover:bg-gray-800 cursor-pointer"
                  onClick={() => handlePlaySong(song)}
                >
                  <div className="relative w-14 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                    {song.coverArt ? (
                      <img
                        src={subsonicApi.getCoverArtUrl(song.coverArt, 64)}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <span className="text-xl">♪</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{song.title}</div>
                    <div className="text-sm text-gray-400 truncate">{song.artist}</div>
                  </div>
                  <div className="flex items-center text-gray-400 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDuration(song.duration)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  )
}
