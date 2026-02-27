# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pluto for Channels is a Docker container that fetches channel data from Pluto TV's API and generates M3U playlists and XMLTV EPG files optimized for use with [Channels DVR Server](https://getchannels.com). It runs nginx to serve the generated files over HTTP.

## Authentication

Pluto TV requires authentication for streams to work. The converter authenticates via `boot.pluto.tv/v4/start` to obtain a session token (JWT) and stitcher params. These are used to construct authenticated stream URLs.

- **Token validity:** 24 hours
- **Refresh cycle:** Every 3 hours (in Docker entrypoint)
- **Concurrent streams:** Pluto TV limits to 1 stream per session. The converter creates 12 independent sessions with unique deviceIds to enable concurrent streaming.

## Build and Run Commands

```bash
# Build Docker image locally
docker build -t pluto-for-channels .

# Run container (credentials required)
docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 \
  -e PLUTO_USERNAME='your@email.com' \
  -e PLUTO_PASSWORD='yourpassword' \
  jonmaddox/pluto-for-channels

# Run with custom starting channel number
docker run -d -p 8080:80 \
  -e PLUTO_USERNAME='your@email.com' \
  -e PLUTO_PASSWORD='yourpassword' \
  -e START=80000 \
  jonmaddox/pluto-for-channels
```

## Local Development

```bash
# Install dependencies
cd PlutoIPTV && yarn install

# Set up credentials
cp .env.example .env
# Edit .env with your Pluto TV credentials

# Run the converter locally
./run.sh
```

## Architecture

- **`PlutoIPTV/index.js`** - Main converter that authenticates with Pluto TV (12 independent sessions), fetches channel data via their API, generates 12 M3U8 playlists and a shared XMLTV EPG file. Handles caching (30 min), retries, and genre mapping.
- **`PlutoIPTV/run.sh`** - Local development script that loads `.env` and runs the converter.
- **`entrypoint.sh`** - Container entrypoint that runs nginx, executes the converter every 3 hours, and updates the status page with links to generated files.
- **`index.html`** - Template for the status page served at the container's root URL.
- **`Dockerfile`** - Alpine-based nginx image with Node.js for running the converter.
- **`VERSION`** - Contains the current version number (used for update notifications).

## Environment Variables

- `PLUTO_USERNAME` - **(Required)** Pluto TV account email
- `PLUTO_PASSWORD` - **(Required)** Pluto TV account password
- `START` - Starting channel number offset (default: 10000). Channel 345 becomes 10345.

## Output Files

- `tuner-{1-12}-playlist.m3u` - 12 M3U playlists, each with its own authenticated session for concurrent streaming
- `epg.xml` - Shared XMLTV format EPG data (no session-specific data)

## Multi-Tuner Setup with Channels DVR Server

12 tuners are available for concurrent streaming. Add as many as you need:

1. In Channels DVR Server, add tuner playlists as separate Custom Channels sources
2. Set the "Stream Limit" dropdown to 1 for each source
3. All tuners share the same EPG file and channel numbers
4. Channels DVR Server will automatically failover between tuners

## CI/CD

GitHub Actions workflow (`.github/workflows/docker-publish.yml`) builds and pushes multi-architecture Docker images to Docker Hub on every push to main.
