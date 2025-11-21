import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { subsonicApi } from '@/lib/subsonic-api'

interface AuthContextType {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  username: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | null>(null)

  useEffect(() => {
    const loaded = subsonicApi.loadStoredCredentials()
    if (loaded) {
      setIsAuthenticated(true)
      setUsername(localStorage.getItem('username'))
    }
  }, [])

  const login = async (username: string, password: string) => {
    await subsonicApi.authenticate({ username, password })
    setIsAuthenticated(true)
    setUsername(username)
  }

  const logout = () => {
    subsonicApi.logout()
    setIsAuthenticated(false)
    setUsername(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, username }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
