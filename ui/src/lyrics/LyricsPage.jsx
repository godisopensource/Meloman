import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, Typography } from '@material-ui/core'
import { updateTrackLyrics } from '../actions'
import subsonic from '../subsonic'

const useQuery = () => {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

const LyricsPage = () => {
  const dispatch = useDispatch()
  const playerState = useSelector((state) => state.player)
  const query = useQuery()
  const trackIdFromQuery = query.get('trackId')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const current = playerState.current || {}
  const trackId = trackIdFromQuery || current.trackId

  const queueItem = playerState.queue.find((item) => item.trackId === trackId) || {}
  const lyric = queueItem.lyric || current.lyric || ''
  const song = queueItem.song || current.song || {}

  useEffect(() => {
    if (!trackId) return
    if (lyric && lyric !== '') return

    setLoading(true)
    setError(null)

    subsonic
      .getLyricsBySongId(trackId)
      .then((response) => {
        const structured =
          response?.json?.['subsonic-response']?.lyricsList?.structuredLyrics
        if (!structured) return

        const syncedLyric = structured.find(
          (sl) =>
            (sl.synced === true || sl.synced === 'true') &&
            Array.isArray(sl.line) &&
            sl.line.length > 0,
        )

        if (!syncedLyric) return

        const pad = (value) => {
          const str = value.toString()
          return str.length === 1 ? `0${str}` : str
        }

        let lyricText = ''
        for (const line of syncedLyric.line) {
          let time = Math.floor(line.start / 10)
          const ms = time % 100
          time = Math.floor(time / 100)
          const sec = time % 60
          time = Math.floor(time / 60)
          const min = time % 60

          lyricText += `[${pad(min)}:${pad(sec)}.${pad(ms)}] ${line.value}\n`
        }

        dispatch(updateTrackLyrics(trackId, lyricText))
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load lyrics')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [dispatch, trackId, lyric])

  if (!trackId) {
    return <Typography>No track selected.</Typography>
  }

  return (
    <Card style={{ maxWidth: 800, margin: '24px auto' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {song.title || 'Unknown title'}
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          {song.artist || 'Unknown artist'}
        </Typography>

        {loading && <Typography>Chargement des paroles…</Typography>}
        {error && (
          <Typography color="error">Erreur de chargement: {error}</Typography>
        )}
        {!loading && !error && (lyric === '' || !lyric) && (
          <Typography>Aucune parole disponible.</Typography>
        )}
        {!loading && !error && lyric && (
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              marginTop: 16,
            }}
          >
            {lyric}
          </pre>
        )}
      </CardContent>
    </Card>
  )
}

export default LyricsPage
