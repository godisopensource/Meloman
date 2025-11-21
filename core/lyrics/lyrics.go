package lyrics

import (
	"context"
	"strings"

	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
)

type LyricsFetcher interface {
	GetLyrics(ctx context.Context, artist, title string) (*model.Lyrics, error)
}

func GetLyrics(ctx context.Context, mf *model.MediaFile, fetcher LyricsFetcher) (model.LyricList, error) {
	var lyricsList model.LyricList
	var err error

	log.Info(ctx, "GetLyrics called", "artist", mf.Artist, "title", mf.Title, "priority", conf.Server.LyricsPriority)

	for pattern := range strings.SplitSeq(strings.ToLower(conf.Server.LyricsPriority), ",") {
		pattern = strings.TrimSpace(pattern)
		log.Debug(ctx, "Trying lyrics source", "pattern", pattern)
		switch {
		case pattern == "embedded":
			lyricsList, err = fromEmbedded(ctx, mf)
		case strings.HasPrefix(pattern, "."):
			lyricsList, err = fromExternalFile(ctx, mf, pattern)
		case pattern == "agent":
			log.Info(ctx, "Trying agent for lyrics", "fetcher", fetcher != nil)
			if fetcher != nil {
				var l *model.Lyrics
				l, err = fetcher.GetLyrics(ctx, mf.Artist, mf.Title)
				log.Info(ctx, "Agent result", "lyrics", l != nil, "err", err)
				if l != nil {
					lyricsList = model.LyricList{*l}
				}
			} else {
				log.Debug(ctx, "No fetcher provided for agent lyrics")
			}
		default:
			log.Error(ctx, "Invalid lyric pattern", "pattern", pattern)
		}

		if err != nil {
			log.Error(ctx, "error parsing lyrics", "source", pattern, err)
		}

		if len(lyricsList) > 0 {
			return lyricsList, nil
		}
	}

	return nil, nil
}
