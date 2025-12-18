import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Search,
  Music,
  Users,
  Disc,
  ListMusic,
  Compass,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Search", path: "/search" },
  { icon: Compass, label: "Discover", path: "/discover" },
  { icon: Calendar, label: "Concerts", path: "/concerts" },
];

const libraryItems = [
  { icon: Disc, label: "Albums", path: "/albums" },
  { icon: Users, label: "Artists", path: "/artists" },
  { icon: Music, label: "Songs", path: "/songs" },
  { icon: ListMusic, label: "Playlists", path: "/playlists" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  return (
    <div className="w-64 bg-black/40 h-full">
      <div className="p-6">
        <h1
          className="text-2xl font-bold cursor-pointer bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent hover:from-[var(--accent-color)] hover:to-white transition-all"
          onClick={() => navigate("/")}
        >
          Meloman
        </h1>
      </div>

      <nav className="px-3 flex-1">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className="w-full justify-start transition-all duration-200 rounded-xl"
              style={
                isActive(item.path)
                  ? {
                      color: "var(--accent-color, #3b82f6)",
                      backgroundColor:
                        "rgba(var(--accent-color-rgb, 59, 130, 246), 0.15)",
                      backdropFilter: "blur(8px)",
                    }
                  : { color: "#d1d5db" }
              }
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor =
                    "rgba(255, 255, 255, 0.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-white/5">
          <h2 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Library
          </h2>
          <div className="space-y-1">
            {libraryItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                onClick={() => navigate(item.path)}
                className="w-full justify-start transition-all duration-200 rounded-xl"
                style={
                  isActive(item.path)
                    ? {
                        color: "var(--accent-color, #3b82f6)",
                        backgroundColor:
                          "rgba(var(--accent-color-rgb, 59, 130, 246), 0.15)",
                        backdropFilter: "blur(8px)",
                      }
                    : { color: "#d1d5db" }
                }
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor =
                      "rgba(255, 255, 255, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
