import { useState, useEffect } from "react"
import { Compass, Sparkles, Music2, Play, RefreshCw, Settings, Zap, Route, Fingerprint, FlaskConical, ExternalLink } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { subsonicApi } from "@/lib/subsonic-api"
import { usePlayer } from "@/contexts/PlayerContext"
import { motion } from "motion/react"
import { FullScreenLoader } from "@/components/ui/loader"

interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  coverArt?: string
}

interface AudioMuseConfig {
  url: string
  enabled: boolean
}

// Check if AudioMuse-AI is configured
const getAudioMuseConfig = (): AudioMuseConfig => {
  const stored = localStorage.getItem('audiomuse_config')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return { url: '', enabled: false }
    }
  }
  return { url: '', enabled: false }
}

const saveAudioMuseConfig = (config: AudioMuseConfig) => {
  localStorage.setItem('audiomuse_config', JSON.stringify(config))
}

export function DiscoverView() {
  const { play } = usePlayer()
  const [config, setConfig] = useState<AudioMuseConfig>(getAudioMuseConfig())
  const [showConfig, setShowConfig] = useState(false)
  const [configUrl, setConfigUrl] = useState(config.url)
  const [loading, setLoading] = useState(false)
  const [similarSongs, setSimilarSongs] = useState<Song[]>([])
  const [recentTracks, setRecentTracks] = useState<Song[]>([])
  const [seedTrack, setSeedTrack] = useState<Song | null>(null)
  const [audioMuseConnected, setAudioMuseConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecentTracks()
    if (config.enabled && config.url) {
      checkAudioMuseConnection()
    }
  }, [config])

  const loadRecentTracks = async () => {
    try {
      const songs = await subsonicApi.search3({ query: '', songCount: 50 })
      if (songs?.song) {
        // Shuffle and take 10 random tracks as seeds
        const shuffled = songs.song.sort(() => Math.random() - 0.5).slice(0, 10)
        setRecentTracks(shuffled)
        if (!seedTrack && shuffled.length > 0) {
          setSeedTrack(shuffled[0])
        }
      }
    } catch (err) {
      console.error('[Discover] Failed to load recent tracks:', err)
    }
  }

  const checkAudioMuseConnection = async () => {
    if (!config.url) return
    try {
      const response = await fetch(`${config.url}/api/health`, { 
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      setAudioMuseConnected(response.ok)
    } catch {
      setAudioMuseConnected(false)
    }
  }

  const getSimilarSongs = async (track: Song) => {
    if (!config.enabled || !config.url) {
      setError('AudioMuse-AI is not configured. Please set it up first.')
      return
    }

    setLoading(true)
    setSeedTrack(track)
    setError(null)
    
    try {
      const response = await fetch(`${config.url}/api/similarity/${track.id}?n=20`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Failed to get similar songs')
      }
      
      const data = await response.json()
      setSimilarSongs(data.songs || [])
    } catch (err: any) {
      console.error('[Discover] Failed to get similar songs:', err)
      setError('Could not connect to AudioMuse-AI. Make sure it\'s running and configured correctly.')
      setSimilarSongs([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = () => {
    const newConfig = { url: configUrl.replace(/\/$/, ''), enabled: !!configUrl }
    setConfig(newConfig)
    saveAudioMuseConfig(newConfig)
    setShowConfig(false)
    if (newConfig.enabled) {
      checkAudioMuseConnection()
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

  const handlePlayAll = () => {
    if (similarSongs.length === 0) return
    const queue = similarSongs.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      album: s.album,
      duration: s.duration,
      coverArt: s.coverArt,
    }))
    play(queue[0], queue)
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const features = [
    { icon: Sparkles, title: 'Similar Songs', desc: 'Find tracks that sound like your favorites' },
    { icon: Route, title: 'Song Paths', desc: 'Create seamless journeys between two songs' },
    { icon: Fingerprint, title: 'Sonic Fingerprint', desc: 'Playlists based on your listening habits' },
    { icon: FlaskConical, title: 'Song Alchemy', desc: 'Mix tracks to create your perfect vibe' },
  ]

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
            <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 backdrop-blur-sm">
              <Compass className="h-10 w-10 text-violet-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Discover</h1>
              <p className="text-gray-400">AI-powered music recommendations</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {config.enabled ? 'Configure' : 'Setup AudioMuse-AI'}
          </Button>
        </motion.div>

        {/* Configuration Modal */}
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
              <h2 className="text-2xl font-bold mb-4">Configure AudioMuse-AI</h2>
              <p className="text-gray-400 mb-6">
                AudioMuse-AI is an open-source AI music recommendation engine that works with your Navidrome library.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">AudioMuse-AI Server URL</label>
                  <input
                    type="url"
                    value={configUrl}
                    onChange={(e) => setConfigUrl(e.target.value)}
                    placeholder="http://localhost:8000"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <ExternalLink className="h-4 w-4" />
                  <a 
                    href="https://github.com/NeptuneHub/AudioMuse-AI" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline"
                  >
                    Learn how to set up AudioMuse-AI
                  </a>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowConfig(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveConfig}
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  Save Configuration
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Connection Status */}
        {config.enabled && (
          <motion.div
            className={`mb-6 p-4 rounded-xl border ${audioMuseConnected ? 'bg-green-500/10 border-green-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${audioMuseConnected ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <span className={audioMuseConnected ? 'text-green-400' : 'text-yellow-400'}>
                {audioMuseConnected ? 'Connected to AudioMuse-AI' : 'AudioMuse-AI not reachable'}
              </span>
              {!audioMuseConnected && (
                <Button size="sm" variant="ghost" onClick={checkAudioMuseConnection}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Features Grid */}
        {!config.enabled && (
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-2xl font-bold mb-6">What AudioMuse-AI Can Do</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature, idx) => (
                <motion.div
                  key={feature.title}
                  className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-violet-500/50 transition-all"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <feature.icon className="h-8 w-8 text-violet-400 mb-3" />
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Seed Track Selection */}
        {config.enabled && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-2xl font-bold mb-4">Pick a Seed Track</h2>
            <p className="text-gray-400 mb-6">Choose a song to discover similar tracks</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentTracks.map((track, idx) => (
                <motion.div
                  key={track.id}
                  className={`group cursor-pointer p-3 rounded-xl transition-all ${seedTrack?.id === track.id ? 'bg-violet-500/20 ring-2 ring-violet-500' : 'hover:bg-white/5'}`}
                  onClick={() => getSimilarSongs(track)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-gray-800">
                    {track.coverArt ? (
                      <img
                        src={subsonicApi.getCoverArtUrl(track.coverArt, 200)}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="h-8 w-8 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="truncate text-sm font-medium">{track.title}</div>
                  <div className="truncate text-xs text-gray-400">{track.artist}</div>
                </motion.div>
              ))}
            </div>
            
            <div className="flex justify-center mt-6">
              <Button variant="outline" onClick={loadRecentTracks} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Load Different Tracks
              </Button>
            </div>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <FullScreenLoader text="Finding similar songs..." />
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Similar Songs Results */}
        {!loading && similarSongs.length > 0 && seedTrack && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Songs Similar to "{seedTrack.title}"</h2>
                <p className="text-gray-400">{similarSongs.length} recommendations based on sonic analysis</p>
              </div>
              <Button onClick={handlePlayAll} className="gap-2" style={{ backgroundColor: 'var(--accent-color)' }}>
                <Play className="h-4 w-4" />
                Play All
              </Button>
            </div>

            <div className="space-y-2">
              {similarSongs.map((song, idx) => (
                <motion.div
                  key={song.id}
                  className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-all"
                  onClick={() => handlePlaySong(song)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <div className="text-gray-500 w-8 text-center text-sm">{idx + 1}</div>
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-800">
                    {song.coverArt ? (
                      <img
                        src={subsonicApi.getCoverArtUrl(song.coverArt, 64)}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate group-hover:text-[var(--accent-color)] transition-colors">
                      {song.title}
                    </div>
                    <div className="text-sm text-gray-400 truncate">{song.artist}</div>
                  </div>
                  <div className="text-sm text-gray-500">{song.album}</div>
                  <div className="text-sm text-gray-500 w-12 text-right">
                    {formatDuration(song.duration)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State for configured but no results */}
        {config.enabled && !loading && similarSongs.length === 0 && !error && (
          <motion.div
            className="text-center py-20 text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">Select a seed track above to discover similar songs</p>
          </motion.div>
        )}
      </div>
    </ScrollArea>
  )
}
