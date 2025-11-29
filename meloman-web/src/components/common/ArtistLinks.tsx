import { useNavigate } from "react-router-dom"
import { subsonicApi } from "@/lib/subsonic-api"

interface ArtistLinksProps {
  artistString: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
}

export function ArtistLinks({ artistString, className = "", onClick }: ArtistLinksProps) {
  const navigate = useNavigate()
  
  // Split artists by common separators: comma, semicolon, slash, ampersand, "feat", "ft", "featuring"
  const splitArtists = (str: string): string[] => {
    const result = str
      .split(/[,;/]|&|\b(?:feat\.?|ft\.?|featuring)\b/i)
      .map(a => a.trim())
      .filter(a => a.length > 0)
    return result
  }

  const handleArtistClick = async (e: React.MouseEvent, artistName: string) => {
    e.stopPropagation()
    if (onClick) onClick(e)
    
    try {
      const artists = await subsonicApi.getArtists()
      const found = artists.find((a: any) => {
        const name = (a.name || a.artist || '').toLowerCase().trim()
        return name === artistName.toLowerCase().trim()
      })
      
      if (found) {
        navigate(`/artists/${found.id}`)
      } else {
        // Fallback: navigate to artists page
        navigate('/artists')
      }
    } catch (err) {
      console.error('Failed to find artist:', err)
      navigate('/artists')
    }
  }

  const artists = splitArtists(artistString)

  // If only one artist or no separators found, render as single link
  if (artists.length === 1) {
    return (
      <span
        className={`hover:underline cursor-pointer ${className}`}
        onClick={(e) => handleArtistClick(e, artists[0])}
      >
        {artistString}
      </span>
    )
  }

  // Render multiple artist links
  return (
    <span className={className}>
      {artists.map((artist, index) => (
        <span key={index}>
          <span
            className="hover:underline cursor-pointer"
            onClick={(e) => handleArtistClick(e, artist)}
          >
            {artist}
          </span>
          {index < artists.length - 1 && <span className="text-gray-500">, </span>}
        </span>
      ))}
    </span>
  )
}
