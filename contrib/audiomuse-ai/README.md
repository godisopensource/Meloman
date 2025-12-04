# AudioMuse-AI Integration for Meloman

[AudioMuse-AI](https://github.com/NeptuneHub/AudioMuse-AI) is an open-source AI-powered music recommendation and playlist generation system that integrates with Navidrome via the Subsonic API.

## Features

- **Clustering**: Automatically groups sonically similar songs, creating genre-defying playlists
- **Instant Playlists**: Tell the AI what you want to hear and it generates a playlist
- **Music Map**: Discover your music collection visually with a 2D map
- **Similar Songs**: Find all songs that share a sonic signature with a track you love
- **Song Paths**: Create seamless listening journeys between two songs
- **Sonic Fingerprint**: Generates playlists based on your listening habits
- **Song Alchemy**: Mix your ideal vibe by marking tracks as "ADD" or "SUBTRACT"

## Hardware Requirements

- 4-core CPU (Intel/ARM, 2015 or later) with AVX support
- 8 GB RAM minimum
- SSD storage recommended

## Deployment Options

### Option 1: Docker Compose (Recommended for single server)

1. Copy the environment file and configure it:
   ```bash
   cd contrib/audiomuse-ai
   cp .env.example .env
   # Edit .env with your Navidrome credentials
   ```

2. Start the services (choose one of the following, depending on your Docker installation):
   ```bash
   # Preferred: modern Docker with compose plugin
   docker compose up -d

   # Fallback: legacy docker-compose binary
   docker-compose up -d

   # If you have trouble with either command, use the helper script included in this repo
   # (it detects the available compose command and runs it):
   ./run-compose.sh up -d

Or use the provided helper scripts:

```bash
./start.sh   # starts the services in detached mode
./stop.sh    # stops the services
```
   ```

3. Access AudioMuse-AI at `http://localhost:8000`

### Option 2: K3s/Kubernetes

1. Edit the secrets in `k8s-manifest.yml` with your credentials (base64 encoded)

2. Apply the manifest:
   ```bash
   kubectl apply -f contrib/audiomuse-ai/k8s-manifest.yml
   ```

3. Access via the ingress or service

### Option 3: Integrated Docker Compose (with Navidrome)

Use `docker-compose-integrated.yml` to run both Navidrome and AudioMuse-AI together:

```bash
cd contrib/audiomuse-ai
cp .env.example .env
# Edit .env
docker compose -f docker-compose-integrated.yml up -d
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `NAVIDROME_URL` | Your Navidrome server URL (e.g., `http://navidrome:4533`) |
| `NAVIDROME_USER` | Navidrome username |
| `NAVIDROME_PASSWORD` | Navidrome password (or Subsonic API token) |

### Optional AI Configuration

For AI-powered playlist naming, configure one of:

- **Gemini** (Free tier available): Set `AI_MODEL_PROVIDER=GEMINI` and `GEMINI_API_KEY`
- **Mistral**: Set `AI_MODEL_PROVIDER=MISTRAL` and `MISTRAL_API_KEY`
- **OpenAI/OpenRouter**: Set `AI_MODEL_PROVIDER=OPENAI`, `OPENAI_API_KEY`, and optionally `OPENAI_SERVER_URL`
- **Ollama** (Self-hosted): Set `AI_MODEL_PROVIDER=OLLAMA` and `OLLAMA_SERVER_URL`

## Initial Setup

1. Access AudioMuse-AI at `http://localhost:8000`
2. Go to **Analysis** and start an initial scan of your music library
3. Once analysis is complete, explore clustering, similar songs, and other features

## Updating

```bash
# Docker Compose
docker compose pull
docker compose up -d

# K3s
kubectl rollout restart deployment/audiomuse-ai-flask -n audiomuse-ai
kubectl rollout restart deployment/audiomuse-ai-worker -n audiomuse-ai
```

## Troubleshooting

- **Connection refused to Navidrome**: Ensure the URL is correct and accessible from the container network
- **Analysis stuck**: Check worker logs with `docker compose logs audiomuse-ai-worker`
- **Out of memory**: Reduce batch size or upgrade to 16GB RAM for large libraries

- **Unknown shorthand flag '-d'**: If you run `docker compose up -d` and get an error like "unknown shorthand flag: 'd' in -d", your Docker CLI doesn't support the `docker compose` plugin and you don't have the legacy `docker-compose` binary installed. Fixes:
  1. Install the plugin on Debian/Ubuntu:
     ```bash
     sudo apt-get update
     sudo apt-get install docker-compose-plugin
     # Afterwards use the modern command: docker compose up -d
     ```
  2. Or install the legacy docker-compose binary (if you prefer):
     ```bash
     sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
     sudo chmod +x /usr/local/bin/docker-compose
     # Then use: docker-compose up -d
     ```
  3. Use the included helper script `./run-compose.sh` which detects the available command and runs it correctly.
  4. If you see an error about `network meloman-network declared as external, but could not be found`, run the following to create the network before starting:
     ```bash
     docker network create meloman-network
     ```
     Or start the services via `./start.sh` which will create the network automatically.

## More Information

- [AudioMuse-AI Documentation](https://neptunehub.github.io/AudioMuse-AI/)
- [GitHub Repository](https://github.com/NeptuneHub/AudioMuse-AI)
