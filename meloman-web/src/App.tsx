import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { QueueProvider } from "@/contexts/QueueContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import { MainLayout } from "@/components/layout/MainLayout"
import { AnimatePresence } from "motion/react"
import { PageTransition } from "@/components/common/PageTransition"
import { HomeView } from "@/components/views/HomeView"
import { AlbumsView } from "@/components/views/AlbumsView"
import { AlbumDetailView } from "@/components/views/AlbumDetailView"
import { ArtistsView } from "@/components/views/ArtistsView"
import { ArtistDetailView } from "@/components/views/ArtistDetailView"
import { SongsView } from "@/components/views/SongsView"
import { PlaylistsView } from "@/components/views/PlaylistsView"
import { PlaylistDetailView } from "@/components/views/PlaylistDetailView"
import { SearchView } from "@/components/views/SearchView"
import { SearchResultsView } from "@/components/views/SearchResultsView"
import { LoginView } from "@/components/views/LoginView"

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <QueueProvider>
      <PlayerProvider>
        <MainLayout>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><HomeView /></PageTransition>} />
              <Route path="/albums" element={<PageTransition><AlbumsView /></PageTransition>} />
              <Route path="/albums/:id" element={<PageTransition><AlbumDetailView /></PageTransition>} />
              <Route path="/artists" element={<PageTransition><ArtistsView /></PageTransition>} />
              <Route path="/artists/:id" element={<PageTransition><ArtistDetailView /></PageTransition>} />
              <Route path="/songs" element={<PageTransition><SongsView /></PageTransition>} />
              <Route path="/playlists" element={<PageTransition><PlaylistsView /></PageTransition>} />
              <Route path="/playlists/:id" element={<PageTransition><PlaylistDetailView /></PageTransition>} />
              <Route path="/search" element={<PageTransition><SearchView /></PageTransition>} />
              <Route path="/search/results" element={<PageTransition><SearchResultsView /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </MainLayout>
      </PlayerProvider>
    </QueueProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProtectedRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
