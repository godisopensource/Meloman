import axios from 'axios'
import * as CryptoJS from 'crypto-js'

const API_VERSION = '1.8.0'
const CLIENT_NAME = 'MelomanWeb'

interface AuthCredentials {
  username: string
  password: string
}

interface SubsonicResponse<T> {
  'subsonic-response': {
    status: 'ok' | 'failed'
    version: string
    type?: string
    serverVersion?: string
    error?: {
      code: number
      message: string
    }
  } & T
}

class SubsonicAPI {
  private username: string = ''
  private token: string = ''
  private salt: string = ''
  private baseUrl: string = '/rest'

  private generateAuthParams(): Record<string, string> {
    return {
      u: this.username,
      t: this.token,
      s: this.salt,
      v: API_VERSION,
      c: CLIENT_NAME,
      f: 'json',
    }
  }

  private buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const allParams = {
      ...this.generateAuthParams(),
      ...params,
    }
    const queryString = new URLSearchParams(allParams).toString()
    return `${this.baseUrl}/${endpoint}?${queryString}`
  }

  async authenticate(credentials: AuthCredentials): Promise<void> {
    this.username = credentials.username
    this.salt = Math.random().toString(36).substring(7)
    this.token = CryptoJS.MD5(credentials.password + this.salt).toString()

    // Test authentication with ping
    try {
      const response = await axios.get<SubsonicResponse<{}>>(this.buildUrl('ping'))
      if (response.data['subsonic-response'].status === 'failed') {
        throw new Error(response.data['subsonic-response'].error?.message || 'Authentication failed')
      }
      
      // Store credentials
      localStorage.setItem('username', this.username)
      localStorage.setItem('subsonic-token', this.token)
      localStorage.setItem('subsonic-salt', this.salt)
    } catch (error) {
      this.username = ''
      this.token = ''
      this.salt = ''
      throw error
    }
  }

  loadStoredCredentials(): boolean {
    const username = localStorage.getItem('username')
    const token = localStorage.getItem('subsonic-token')
    const salt = localStorage.getItem('subsonic-salt')

    if (username && token && salt) {
      this.username = username
      this.token = token
      this.salt = salt
      return true
    }
    return false
  }

  logout(): void {
    this.username = ''
    this.token = ''
    this.salt = ''
    localStorage.removeItem('username')
    localStorage.removeItem('subsonic-token')
    localStorage.removeItem('subsonic-salt')
  }

  isAuthenticated(): boolean {
    return !!this.username && !!this.token && !!this.salt
  }

  async getAlbums(): Promise<any[]> {
    console.debug('[SubsonicAPI] getAlbums() called')
    const response = await axios.get<SubsonicResponse<{ albumList2: { album: any[] } }>>(
      this.buildUrl('getAlbumList2', { type: 'alphabeticalByName', size: 500 })
    )
    const albums = response.data['subsonic-response'].albumList2?.album || []
    // Remove duplicates by normalized artist + album name (more robust than id)
    const seen = new Map<string, any>()
    for (const album of albums) {
      const artist = (album.artist || '').toString().trim().toLowerCase()
      const name = (album.name || album.title || '').toString().trim().toLowerCase()
      const key = `${artist}::${name}`
      if (!seen.has(key)) {
        seen.set(key, album)
      }
    }
    return Array.from(seen.values())
  }

  async getArtists(): Promise<any[]> {
    const response = await axios.get<SubsonicResponse<{ artists: { index: any[] } }>>(
      this.buildUrl('getArtists')
    )
    const indexes = response.data['subsonic-response'].artists?.index || []
    return indexes.flatMap((index: any) => index.artist || [])
  }

  async getAlbum(id: string): Promise<any> {
    const response = await axios.get<SubsonicResponse<{ album: any }>>(
      this.buildUrl('getAlbum', { id })
    )
    return response.data['subsonic-response'].album
  }

  async search(query: string): Promise<{ albums: any[], artists: any[], songs: any[] }> {
    const response = await axios.get<SubsonicResponse<{ searchResult3: any }>>(
      this.buildUrl('search3', { query, albumCount: 20, artistCount: 20, songCount: 50 })
    )
    const result = response.data['subsonic-response'].searchResult3 || {}
    return {
      albums: result.album || [],
      artists: result.artist || [],
      songs: result.song || [],
    }
  }

  getCoverArtUrl(id: string, size?: number): string {
    const params: Record<string, any> = { id }
    if (size) params.size = size
    return this.buildUrl('getCoverArt', params)
  }

  getStreamUrl(id: string): string {
    return this.buildUrl('stream', { id })
  }

  async scrobble(id: string, submission: boolean = true): Promise<void> {
    await axios.get(this.buildUrl('scrobble', { id, submission }))
  }

  async star(id: string): Promise<void> {
    await axios.get(this.buildUrl('star', { id }))
  }

  async unstar(id: string): Promise<void> {
    await axios.get(this.buildUrl('unstar', { id }))
  }

  async getSongs(size: number = 500): Promise<any[]> {
    console.debug('[SubsonicAPI] getSongs() called, size=', size)
    const response = await axios.get<SubsonicResponse<{ randomSongs: { song: any[] } }>>(
      this.buildUrl('getRandomSongs', { size })
    )
    const songs = response.data['subsonic-response'].randomSongs?.song || []
    console.debug('[SubsonicAPI] getSongs() returned', songs.length)
    return songs
  }

  async getPlaylists(): Promise<any[]> {
    const response = await axios.get<SubsonicResponse<{ playlists: { playlist: any[] } }>>(
      this.buildUrl('getPlaylists')
    )
    return response.data['subsonic-response'].playlists?.playlist || []
  }

  async getPlaylist(id: string): Promise<any> {
    const response = await axios.get<SubsonicResponse<{ playlist: any }>>(
      this.buildUrl('getPlaylist', { id })
    )
    return response.data['subsonic-response'].playlist
  }

  async getLyricsBySongId(id: string): Promise<any> {
    const response = await axios.get<SubsonicResponse<{ lyricsList: any }>>(
      this.buildUrl('getLyricsBySongId', { id })
    )
    return response.data['subsonic-response'].lyricsList
  }

  async getUser(): Promise<any> {
    const response = await axios.get<SubsonicResponse<{ user: any }>>(
      this.buildUrl('getUser', { username: this.username })
    )
    return response.data['subsonic-response'].user
  }

  async search3(params: { query: string; artistCount?: number; albumCount?: number; songCount?: number }): Promise<any> {
    const response = await axios.get<SubsonicResponse<{ searchResult3: any }>>(
      this.buildUrl('search3', params)
    )
    return response.data['subsonic-response'].searchResult3
  }
}

export const subsonicApi = new SubsonicAPI()
