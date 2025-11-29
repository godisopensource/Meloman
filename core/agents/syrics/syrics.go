package syrics

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/consts"
	"github.com/navidrome/navidrome/core/agents"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
)

const (
	syricsAgentName = "syrics"
	tokenURL        = "https://open.spotify.com/get_access_token?reason=transport&productType=web_player" // #nosec G101 - This is a public API URL, not a credential
	searchURL       = "https://api.spotify.com/v1/search"
	lyricsURL       = "https://spclient.wg.spotify.com/color-lyrics/v2/track/%s"
)

type syricsAgent struct {
	ds          model.DataStore
	spDc        string
	accessToken string
	tokenExpiry time.Time
	client      *http.Client
}

func New(ds model.DataStore) agents.Interface {
	if !conf.Server.Syrics.Enabled || conf.Server.Syrics.SpDc == "" {
		return nil
	}
	return &syricsAgent{
		ds:     ds,
		spDc:   conf.Server.Syrics.SpDc,
		client: &http.Client{Timeout: consts.DefaultHttpClientTimeOut},
	}
}

func (s *syricsAgent) AgentName() string {
	return syricsAgentName
}

func init() {
	agents.Register(syricsAgentName, New)
}

func (s *syricsAgent) GetLyrics(ctx context.Context, artist, title string) (*model.Lyrics, error) {
	log.Info(ctx, "SYRICS: GetLyrics START", "artist", artist, "title", title)

	if err := s.ensureToken(ctx); err != nil {
		log.Error(ctx, "SYRICS: failed to get token", err)
		return nil, err
	}

	log.Info(ctx, "SYRICS: Token acquired, searching for track")

	trackID, err := s.searchTrack(ctx, artist, title)
	if err != nil {
		log.Error(ctx, "SYRICS: failed to search track", err)
		return nil, err
	}

	if trackID == "" {
		log.Info(ctx, "SYRICS: track not found in Spotify search", "artist", artist, "title", title)
		return nil, agents.ErrNotFound
	}

	log.Info(ctx, "SYRICS: track found in Spotify", "trackID", trackID)

	lyrics, err := s.fetchLyrics(ctx, trackID)
	if err != nil {
		log.Error(ctx, "SYRICS: failed to fetch lyrics from Spotify", err)
		return nil, err
	}

	if lyrics == nil {
		log.Info(ctx, "SYRICS: no lyrics available for track", "trackID", trackID)
		return nil, agents.ErrNotFound
	}

	log.Info(ctx, "SYRICS: SUCCESS - lyrics fetched", "lines", len(lyrics.Line))

	return lyrics, nil
}

func (s *syricsAgent) ensureToken(ctx context.Context) error {
	if s.accessToken != "" && time.Now().Before(s.tokenExpiry) {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, "GET", tokenURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Cookie", "sp_dc="+s.spDc)
	req.Header.Set("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36")

	log.Debug(ctx, "syrics: requesting token", "url", tokenURL, "cookieLength", len(s.spDc))

	resp, err := s.client.Do(req)
	if err != nil {
		log.Error(ctx, "syrics: token request error", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Debug(ctx, "syrics: token request failed", "status", resp.Status, "body", string(bodyBytes))
		return fmt.Errorf("failed to get token: %s", resp.Status)
	}

	var result struct {
		AccessToken                      string `json:"accessToken"`
		AccessTokenExpirationTimestampMs int64  `json:"accessTokenExpirationTimestampMs"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return err
	}

	s.accessToken = result.AccessToken
	s.tokenExpiry = time.UnixMilli(result.AccessTokenExpirationTimestampMs)
	log.Debug(ctx, "syrics: token acquired", "expiry", s.tokenExpiry)
	return nil
}

func (s *syricsAgent) searchTrack(ctx context.Context, artist, title string) (string, error) {
	query := fmt.Sprintf("track:%s artist:%s", title, artist)
	u, _ := url.Parse(searchURL)
	q := u.Query()
	q.Set("q", query)
	q.Set("type", "track")
	q.Set("limit", "1")
	u.RawQuery = q.Encode()

	req, err := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Debug(ctx, "syrics: search failed", "status", resp.Status)
		return "", fmt.Errorf("failed to search track: %s", resp.Status)
	}

	var result struct {
		Tracks struct {
			Items []struct {
				ID string `json:"id"`
			} `json:"items"`
		} `json:"tracks"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Tracks.Items) == 0 {
		log.Debug(ctx, "syrics: track not found", "artist", artist, "title", title)
		return "", agents.ErrNotFound
	}

	return result.Tracks.Items[0].ID, nil
}

func (s *syricsAgent) fetchLyrics(ctx context.Context, trackID string) (*model.Lyrics, error) {
	u := fmt.Sprintf(lyricsURL, trackID)
	req, err := http.NewRequestWithContext(ctx, "GET", u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.accessToken)
	req.Header.Set("App-Platform", "WebPlayer")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		log.Debug(ctx, "syrics: lyrics not found for track", "trackID", trackID)
		return nil, agents.ErrNotFound
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch lyrics: %s", resp.Status)
	}

	var result struct {
		Lyrics struct {
			SyncType string `json:"syncType"`
			Lines    []struct {
				StartTimeMs string `json:"startTimeMs"`
				Words       string `json:"words"`
			} `json:"lines"`
		} `json:"lyrics"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	lyrics := &model.Lyrics{
		Synced: result.Lyrics.SyncType == "LINE_SYNCED",
	}

	for _, line := range result.Lyrics.Lines {
		var start int64
		_, _ = fmt.Sscanf(line.StartTimeMs, "%d", &start) // Error ignored - zero value is acceptable fallback
		lyrics.Line = append(lyrics.Line, model.Line{
			Start: &start,
			Value: line.Words,
		})
	}
	log.Debug(ctx, "syrics: fetched lyrics", "trackID", trackID, "synced", lyrics.Synced, "lines", len(lyrics.Line))

	return lyrics, nil
}
