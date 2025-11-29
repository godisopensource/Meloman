import { subsonicApi } from './subsonic-api'

interface LyricLine {
  start?: number
  value: string
}

interface LyricsCache {
  [songId: string]: {
    lines: LyricLine[]
    synced: boolean
    timestamp: number
  }
}

const lyricsCache: LyricsCache = {}
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

export async function preloadLyrics(songId: string): Promise<void> {
  // Check if already cached and fresh
  if (lyricsCache[songId] && Date.now() - lyricsCache[songId].timestamp < CACHE_DURATION) {
    console.debug('[LyricsPreloader] Already cached:', songId)
    return
  }

  try {
    console.debug('[LyricsPreloader] Preloading lyrics for:', songId)
    const data = await subsonicApi.getLyricsBySongId(songId)
    
    if (data?.structuredLyrics && data.structuredLyrics.length > 0) {
      const lyricsData = data.structuredLyrics[0]
      
      if (lyricsData.line && lyricsData.line.length > 0) {
        const expandedLines: LyricLine[] = []
        for (const line of lyricsData.line) {
          const start = line.start !== undefined ? line.start / 1000 : undefined
          const value = line.value || ''
          
          if (value.includes('\n')) {
            const parts = value.split('\n')
            parts.forEach((part: string) => {
              expandedLines.push({ start, value: part })
            })
          } else {
            expandedLines.push({ start, value })
          }
        }
        
        lyricsCache[songId] = {
          lines: expandedLines,
          synced: lyricsData.synced || false,
          timestamp: Date.now()
        }
        console.debug('[LyricsPreloader] ✓ Cached', expandedLines.length, 'lines for:', songId)
      }
    }
  } catch (err) {
    console.error('[LyricsPreloader] Failed to preload lyrics for', songId, err)
  }
}

export function getCachedLyrics(songId: string): { lines: LyricLine[], synced: boolean } | null {
  const cached = lyricsCache[songId]
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { lines: cached.lines, synced: cached.synced }
  }
  return null
}

export function clearLyricsCache(): void {
  Object.keys(lyricsCache).forEach(key => delete lyricsCache[key])
}
