# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pluto for Channels is a Docker container that fetches channel data from Pluto TV's API and generates M3U playlists and XMLTV EPG files optimized for use with [Channels DVR](https://getchannels.com). It runs nginx to serve the generated files over HTTP.

## Build and Run Commands

```bash
# Build Docker image locally
docker build -t pluto-for-channels .

# Run container (basic)
docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 jonmaddox/pluto-for-channels

# Run with multiple feed versions
docker run -d -p 8080:80 -e VERSIONS=Dad,Bob,Joe jonmaddox/pluto-for-channels

# Run with custom starting channel number
docker run -d -p 8080:80 -e START=80000 jonmaddox/pluto-for-channels

# Install dependencies locally (for development)
cd PlutoIPTV && yarn install

# Run the converter locally
cd PlutoIPTV && START=0 node index.js [versions]
```

## Architecture

- **`PlutoIPTV/index.js`** - Main converter that fetches Pluto TV channel data via their API, generates M3U8 playlists and XMLTV EPG files. Handles caching (30 min), retries, and genre mapping.
- **`entrypoint.sh`** - Container entrypoint that runs nginx, executes the converter every 3 hours, and updates the status page with links to generated files.
- **`index.html`** - Template for the status page served at the container's root URL.
- **`Dockerfile`** - Alpine-based nginx image with Node.js for running the converter.
- **`VERSION`** - Contains the current version number (used for update notifications).

## Environment Variables

- `VERSIONS` - Comma-separated list of feed names to generate (creates separate playlist/EPG files per version)
- `START` - Starting channel number offset (e.g., 80000 makes channel 345 become 80345)

## Output Files

- `playlist.m3u` / `{version}-playlist.m3u` - M3U playlist with Channels-specific extensions
- `epg.xml` / `{version}-epg.xml` - XMLTV format EPG data

## CI/CD

GitHub Actions workflow (`.github/workflows/docker-publish.yml`) builds and pushes multi-architecture Docker images to Docker Hub on every push to main.
