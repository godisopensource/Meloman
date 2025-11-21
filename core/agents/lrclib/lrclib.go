package lrclib

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/navidrome/navidrome/consts"
	"github.com/navidrome/navidrome/core/agents"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
)

const (
	lrclibAgentName = "lrclib"
	lrclibBaseURL   = "https://lrclib.net/api"
)

type lrclibAgent struct {
	client *http.Client
}

func lrclibConstructor(ds model.DataStore) agents.Interface {
	l := &lrclibAgent{
		client: &http.Client{
			Timeout: 60 * time.Second, // LRCLib can be slow, use longer timeout
		},
	}
	return l
}

func init() {
	agents.Register(lrclibAgentName, lrclibConstructor)
}

func (l *lrclibAgent) AgentName() string {
	return lrclibAgentName
}

func (l *lrclibAgent) GetLyrics(ctx context.Context, artist, title string) (*model.Lyrics, error) {
	log.Info(ctx, "LRCLIB: GetLyrics START", "artist", artist, "title", title)

	// Build the search URL
	searchURL := fmt.Sprintf("%s/search", lrclibBaseURL)
	params := url.Values{}
	params.Add("artist_name", artist)
	params.Add("track_name", title)

	req, err := http.NewRequestWithContext(ctx, "GET", searchURL+"?"+params.Encode(), nil)
	if err != nil {
		log.Error(ctx, "LRCLIB: failed to create request", err)
		return nil, err
	}

	req.Header.Set("User-Agent", "Navidrome/"+consts.Version)

	log.Debug(ctx, "LRCLIB: Searching for lyrics", "url", req.URL.String())

	resp, err := l.client.Do(req)
	if err != nil {
		log.Error(ctx, "LRCLIB: request failed", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		log.Info(ctx, "LRCLIB: No lyrics found", "artist", artist, "title", title)
		return nil, agents.ErrNotFound
	}

	if resp.StatusCode != http.StatusOK {
		log.Error(ctx, "LRCLIB: unexpected status code", "status", resp.Status)
		return nil, fmt.Errorf("unexpected status: %s", resp.Status)
	}

	var results []struct {
		ID           int     `json:"id"`
		TrackName    string  `json:"trackName"`
		ArtistName   string  `json:"artistName"`
		AlbumName    string  `json:"albumName"`
		Duration     float64 `json:"duration"`
		Instrumental bool    `json:"instrumental"`
		PlainLyrics  string  `json:"plainLyrics"`
		SyncedLyrics string  `json:"syncedLyrics"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		log.Error(ctx, "LRCLIB: failed to decode response", err)
		return nil, err
	}

	if len(results) == 0 {
		log.Info(ctx, "LRCLIB: No results found", "artist", artist, "title", title)
		return nil, agents.ErrNotFound
	}

	// Use the first result
	result := results[0]

	log.Info(ctx, "LRCLIB: Found lyrics", "trackName", result.TrackName, "artistName", result.ArtistName, "synced", result.SyncedLyrics != "")

	if result.Instrumental {
		log.Info(ctx, "LRCLIB: Track is instrumental")
		return nil, agents.ErrNotFound
	}

	lyrics := &model.Lyrics{
		DisplayArtist: result.ArtistName,
		DisplayTitle:  result.TrackName,
	}

	// Prefer synced lyrics if available
	if result.SyncedLyrics != "" {
		log.Info(ctx, "LRCLIB: Using synced lyrics")
		parsedLyrics, err := parseLRCFormat(result.SyncedLyrics)
		if err != nil {
			log.Error(ctx, "LRCLIB: failed to parse synced lyrics", err)
			// Fall back to plain lyrics
			if result.PlainLyrics != "" {
				lyrics.Line = []model.Line{{Value: result.PlainLyrics}}
			}
		} else {
			lyrics.Line = parsedLyrics
			lyrics.Synced = true
		}
	} else if result.PlainLyrics != "" {
		log.Info(ctx, "LRCLIB: Using plain lyrics")
		lyrics.Line = []model.Line{{Value: result.PlainLyrics}}
	} else {
		log.Info(ctx, "LRCLIB: No lyrics content available")
		return nil, agents.ErrNotFound
	}

	log.Info(ctx, "LRCLIB: Successfully fetched lyrics", "lines", len(lyrics.Line), "synced", lyrics.Synced)
	return lyrics, nil
}

// parseLRCFormat parses LRC format lyrics into model.Line
// LRC format: [mm:ss.xx]lyric text
func parseLRCFormat(lrcContent string) ([]model.Line, error) {
	var lines []model.Line

	// Split by newlines and parse each line
	for _, line := range splitLines(lrcContent) {
		if len(line) == 0 {
			continue
		}

		// Skip metadata lines (e.g., [ar:Artist], [ti:Title])
		if len(line) > 3 && line[0] == '[' && line[2] == ':' {
			continue
		}

		// Parse timestamp [mm:ss.xx]
		if len(line) < 10 || line[0] != '[' {
			continue
		}

		// Find the closing bracket
		endBracket := -1
		for i := 1; i < len(line) && i < 15; i++ {
			if line[i] == ']' {
				endBracket = i
				break
			}
		}

		if endBracket == -1 {
			continue
		}

		timestamp := line[1:endBracket]
		text := ""
		if endBracket+1 < len(line) {
			text = line[endBracket+1:]
		}

		// Parse timestamp (format: mm:ss.xx or mm:ss.xxx)
		var minutes, seconds, centiseconds int
		_, err := fmt.Sscanf(timestamp, "%d:%d.%d", &minutes, &seconds, &centiseconds)
		if err != nil {
			// Try without centiseconds
			_, err = fmt.Sscanf(timestamp, "%d:%d", &minutes, &seconds)
			if err != nil {
				continue
			}
		}

		// Convert to milliseconds (LRC uses centiseconds, model uses milliseconds * 10)
		start := int64((minutes*60+seconds)*1000 + centiseconds*10)

		lines = append(lines, model.Line{
			Start: &start,
			Value: text,
		})
	}

	return lines, nil
}

func splitLines(s string) []string {
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	return lines
}
