package syrics

import (
	"testing"

	"github.com/navidrome/navidrome/conf"
	"github.com/navidrome/navidrome/core/agents"
	"github.com/stretchr/testify/assert"
)

func TestNew(t *testing.T) {
	// Test disabled by default
	conf.Server.Syrics.Enabled = false
	agent := New(nil)
	assert.Nil(t, agent)

	// Test enabled but missing SpDc
	conf.Server.Syrics.Enabled = true
	conf.Server.Syrics.SpDc = ""
	agent = New(nil)
	assert.Nil(t, agent)

	// Test enabled and SpDc present
	conf.Server.Syrics.SpDc = "test_cookie"
	agent = New(nil)
	assert.NotNil(t, agent)
	assert.Implements(t, (*agents.Interface)(nil), agent)
	assert.Equal(t, syricsAgentName, agent.AgentName())
}
