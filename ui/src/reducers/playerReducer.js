import { v4 as uuidv4 } from 'uuid'
import subsonic from '../subsonic'
import {
  PLAYER_ADD_TRACKS,
  PLAYER_CLEAR_QUEUE,
  PLAYER_CURRENT,
  PLAYER_PLAY_NEXT,
  PLAYER_PLAY_TRACKS,
  PLAYER_SET_TRACK,
  PLAYER_SET_VOLUME,
  PLAYER_SYNC_QUEUE,
  PLAYER_SET_MODE,
  PLAYER_UPDATE_LYRICS,
} from '../actions'
import config from '../config'

const initialState = {
  queue: [],
  current: {},
  clear: false,
  volume: config.defaultUIVolume / 100,
  savedPlayIndex: 0,
}

const pad = (value) => {
  const str = value.toString()
  if (str.length === 1) {
    return `0${str}`
  } else {
    return str
  }
}

const mapToAudioLists = (item) => {
  // If item comes from a playlist, trackId is mediaFileId
  const trackId = item.mediaFileId || item.id

  if (item.isRadio) {
    return {
      trackId,
      uuid: uuidv4(),
      name: item.name,
      song: item,
      musicSrc: item.streamUrl,
      cover: item.cover,
      isRadio: true,
    }
  }

  const { lyrics } = item
  let lyricText = ''

  if (lyrics) {
    const structured = JSON.parse(lyrics)
    for (const structuredLyric of structured) {
      if (structuredLyric.synced) {
        for (const line of structuredLyric.line) {
          let time = Math.floor(line.start / 10)
          const ms = time % 100
          time = Math.floor(time / 100)
          const sec = time % 60
          time = Math.floor(time / 60)
          const min = time % 60

          ms.toString()
          lyricText += `[${pad(min)}:${pad(sec)}.${pad(ms)}] ${line.value}\n`
        }
      }
    }
  }
  // Note: If no embedded lyrics, they will be fetched asynchronously via fetchAndUpdateLyrics action

  return {
    trackId,
    uuid: uuidv4(),
    song: item,
    name: item.title,
    lyric: lyricText,
    singer: item.artist,
    duration: item.duration,
    musicSrc: subsonic.streamUrl(trackId),
    cover: subsonic.getCoverArtUrl(
      {
        id: trackId,
        updatedAt: item.updatedAt,
        album: item.album,
      },
      300,
    ),
  }
}

const reduceClearQueue = () => ({ ...initialState, clear: true })

const reducePlayTracks = (state, { data, id }) => {
  let playIndex = 0
  const queue = Object.keys(data).map((key, idx) => {
    if (key === id) {
      playIndex = idx
    }
    return mapToAudioLists(data[key])
  })
  return {
    ...state,
    queue,
    playIndex,
    clear: true,
  }
}

const reduceSetTrack = (state, { data }) => {
  return {
    ...state,
    queue: [mapToAudioLists(data)],
    playIndex: 0,
    clear: true,
  }
}

const reduceAddTracks = (state, { data }) => {
  const queue = state.queue
  Object.keys(data).forEach((id) => {
    queue.push(mapToAudioLists(data[id]))
  })
  return { ...state, queue, clear: false }
}

const reducePlayNext = (state, { data }) => {
  const newQueue = []
  const current = state.current || {}
  let foundPos = false
  state.queue.forEach((item) => {
    newQueue.push(item)
    if (item.uuid === current.uuid) {
      foundPos = true
      Object.keys(data).forEach((id) => {
        newQueue.push(mapToAudioLists(data[id]))
      })
    }
  })
  if (!foundPos) {
    Object.keys(data).forEach((id) => {
      newQueue.push(mapToAudioLists(data[id]))
    })
  }

  return {
    ...state,
    queue: newQueue,
    clear: true,
  }
}

const reduceSetVolume = (state, { data: { volume } }) => {
  return {
    ...state,
    volume,
  }
}

const reduceSyncQueue = (state, { data: { audioInfo, audioLists } }) => {
  return {
    ...state,
    queue: audioLists,
    clear: false,
    playIndex: undefined,
  }
}

const reduceCurrent = (state, { data }) => {
  let current = data.ended ? {} : data
  
  // Force ReactJkMusicPlayer to reload by regenerating UUIDs and clearing lyrics
  const clearedQueue = state.queue.map((item) => {
    if (item.uuid === current.uuid) {
      // Current track: keep it as-is (preserve lyrics if present)
      return item
    }
    // Other tracks: generate new UUID and clear lyrics
    // This forces ReactJkMusicPlayer to treat them as "new" items
    return { ...item, uuid: uuidv4(), lyric: '' }
  })
  
  // If switching to a track, check if it already has lyrics in the queue
  if (current.uuid) {
    const queueItem = clearedQueue.find((item) => item.uuid === current.uuid)
    if (queueItem?.lyric && !current.lyric) {
      current = { ...current, lyric: queueItem.lyric }
    }
  }
  
  const savedPlayIndex = clearedQueue.findIndex(
    (item) => item.uuid === current.uuid,
  )
  return {
    ...state,
    queue: clearedQueue,
    current,
    playIndex: undefined,
    savedPlayIndex,
    volume: data.volume,
  }
}

const reduceMode = (state, { data: { mode } }) => {
  return {
    ...state,
    mode,
  }
}

const reduceUpdateLyrics = (state, { data: { trackId, lyrics } }) => {
  const updatedQueue = state.queue.map((item) => {
    if (item.trackId === trackId) {
      return { ...item, lyric: lyrics }
    }
    return item
  })
  
  // Also update current if it matches the trackId
  const updatedCurrent = state.current?.trackId === trackId
    ? { ...state.current, lyric: lyrics }
    : state.current
  
  return {
    ...state,
    queue: updatedQueue,
    current: updatedCurrent,
  }
}

export const playerReducer = (previousState = initialState, payload) => {
  const { type } = payload
  switch (type) {
    case PLAYER_CLEAR_QUEUE:
      return reduceClearQueue()
    case PLAYER_PLAY_TRACKS:
      return reducePlayTracks(previousState, payload)
    case PLAYER_SET_TRACK:
      return reduceSetTrack(previousState, payload)
    case PLAYER_ADD_TRACKS:
      return reduceAddTracks(previousState, payload)
    case PLAYER_PLAY_NEXT:
      return reducePlayNext(previousState, payload)
    case PLAYER_SET_VOLUME:
      return reduceSetVolume(previousState, payload)
    case PLAYER_SYNC_QUEUE:
      return reduceSyncQueue(previousState, payload)
    case PLAYER_CURRENT:
      return reduceCurrent(previousState, payload)
    case PLAYER_SET_MODE:
      return reduceMode(previousState, payload)
    case PLAYER_UPDATE_LYRICS:
      return reduceUpdateLyrics(previousState, payload)
    default:
      return previousState
  }
}
