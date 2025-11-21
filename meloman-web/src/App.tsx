import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { QueueProvider } from "@/contexts/QueueContext"
import { PlayerProvider } from "@/contexts/PlayerContext"
import { MainLayout } from "@/components/layout/MainLayout"
import { HomeView } from "@/components/views/HomeView"
import { AlbumsView } from "@/components/views/AlbumsView"
import { AlbumDetailView } from "@/components/views/AlbumDetailView"
import { ArtistsView } from "@/components/views/ArtistsView"
import { ArtistDetailView } from "@/components/views/ArtistDetailView"
import { SongsView } from "@/components/views/SongsView"
import { PlaylistsView } from "@/components/views/PlaylistsView"
import { PlaylistDetailView } from "@/components/views/PlaylistDetailView"
import { SearchView } from "@/components/views/SearchView"
import { LoginView } from "@/components/views/LoginView"

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginView />
  }

  return (
    <QueueProvider>
      <PlayerProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomeView />} />
            <Route path="/albums" element={<AlbumsView />} />
            <Route path="/albums/:id" element={<AlbumDetailView />} />
            <Route path="/artists" element={<ArtistsView />} />
            <Route path="/artists/:id" element={<ArtistDetailView />} />
            <Route path="/songs" element={<SongsView />} />
            <Route path="/playlists" element={<PlaylistsView />} />
            <Route path="/playlists/:id" element={<PlaylistDetailView />} />
            <Route path="/search" element={<SearchView />} />
          </Routes>
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
