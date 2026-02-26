# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pluto for Channels is a Docker container that fetches channel data from Pluto TV's API and generates M3U playlists and XMLTV EPG files optimized for use with [Channels DVR](https://getchannels.com). It runs nginx to serve the generated files over HTTP.

## Authentication

Pluto TV requires authentication for streams to work. The converter authenticates via `boot.pluto.tv/v4/start` to obtain a session token (JWT) and stitcher params. These are used to construct authenticated stream URLs.

- **Token validity:** 24 hours
- **Refresh cycle:** Every 3 hours (in Docker entrypoint)

## Build and Run Commands

```bash
# Build Docker image locally
docker build -t pluto-for-channels .

# Run container (credentials required)
docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 \
  -e PLUTO_USERNAME='your@email.com' \
  -e PLUTO_PASSWORD='yourpassword' \
  jonmaddox/pluto-for-channels

# Run with multiple feed versions
docker run -d -p 8080:80 \
  -e PLUTO_USERNAME='your@email.com' \
  -e PLUTO_PASSWORD='yourpassword' \
  -e VERSIONS=Dad,Bob,Joe \
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

# Or run with versions
./run.sh Dad,Bob,Joe
```

## Architecture

- **`PlutoIPTV/index.js`** - Main converter that authenticates with Pluto TV, fetches channel data via their API, generates M3U8 playlists and XMLTV EPG files. Handles caching (30 min), retries, and genre mapping.
- **`PlutoIPTV/run.sh`** - Local development script that loads `.env` and runs the converter.
- **`entrypoint.sh`** - Container entrypoint that runs nginx, executes the converter every 3 hours, and updates the status page with links to generated files.
- **`index.html`** - Template for the status page served at the container's root URL.
- **`Dockerfile`** - Alpine-based nginx image with Node.js for running the converter.
- **`VERSION`** - Contains the current version number (used for update notifications).

## Environment Variables

- `PLUTO_USERNAME` - **(Required)** Pluto TV account email
- `PLUTO_PASSWORD` - **(Required)** Pluto TV account password
- `VERSIONS` - Comma-separated list of feed names to generate (creates separate playlist/EPG files per version)
- `START` - Starting channel number offset (e.g., 80000 makes channel 345 become 80345)

## Output Files

- `playlist.m3u` / `{version}-playlist.m3u` - M3U playlist with Channels-specific extensions (contains authenticated stream URLs with JWT)
- `epg.xml` / `{version}-epg.xml` - XMLTV format EPG data

## CI/CD

GitHub Actions workflow (`.github/workflows/docker-publish.yml`) builds and pushes multi-architecture Docker images to Docker Hub on every push to main.
