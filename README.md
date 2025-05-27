# Pluto for Channels (Modernized)

A modern, dockerized Pluto TV to M3U/XMLTV converter for Channels DVR. This is a completely rewritten version of the original [pluto-for-channels](https://github.com/maddox/pluto-for-channels) with significant improvements.

## 🚀 What's New in This Version

### Complete Modernization
- **ES6+ JavaScript**: Rewritten with modern async/await patterns
- **Class-based architecture**: Better code organization and maintainability
- **Updated dependencies**: Replaced deprecated packages (request → axios)
- **Comprehensive error handling**: Automatic retries and graceful failures

### Docker Support
- **Easy deployment**: Single command to run everything
- **Docker Compose**: Production-ready configuration
- **Health checks**: Built-in monitoring
- **Security**: Runs as non-root user

### New Features
- **Built-in web server**: No need for separate HTTP server
- **Duplicate detection**: Automatically removes duplicate channels
- **Smart caching**: Reduces API calls and improves performance
- **Auto-refresh**: Configurable automatic updates
- **Multiple endpoints**:
  - `/health` - Health check
  - `/refresh` - Manual refresh
  - `/duplicates` - Duplicate analysis
  - `/channels` - Channel list

## 📦 Installation

### Using Docker (Recommended)

1. Clone this repository:
```bash
git clone https://github.com/YOUR_USERNAME/pluto-for-channels.git
cd pluto-for-channels
```

2. Start with Docker Compose:
```bash
docker-compose up -d
```

That's it! The server will be available at http://localhost:8080

### Manual Installation

1. Install Node.js 14+ 
2. Clone and install:
```bash
git clone https://github.com/YOUR_USERNAME/pluto-for-channels.git
cd pluto-for-channels
npm install
```

3. Run the server:
```bash
npm run server
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `CHANNEL_START_NUMBER` | `1000` | Starting channel number |
| `OUTPUT_DIR` | `./output` | Output directory |
| `DEBUG` | `false` | Enable debug logging |

### Configuration File

Edit `config.js` for advanced settings:

```javascript
{
  api: {
    timeout: 30000,           // API timeout
    maxRetries: 3,            // Max retry attempts
    retryDelay: 60000        // Retry delay
  },
  cache: {
    maxAge: 30 * 60 * 1000   // Cache duration (30 min)
  },
  server: {
    autoRefresh: true,        // Enable auto-refresh
    refreshInterval: 6 * 60 * 60 * 1000  // 6 hours
  }
}
```

## 📺 Channels DVR Setup

1. In Channels DVR, go to Settings → Manage Sources → Add Source
2. Select "Custom Channels"
3. Enter the URLs:
   - **Stream**: `http://[YOUR_SERVER_IP]:8080/playlist.m3u`
   - **XMLTV Guide**: `http://[YOUR_SERVER_IP]:8080/epg.xml`
4. Click "Save"

## 🔍 Duplicate Channel Handling

This version automatically handles duplicate channels:
- Detects duplicates by name, number, and slug
- Keeps the best version (lower channel number)
- Handles channels with number 0 (assigns 9000+)
- Removes regional duplicates (e.g., multiple CBS News channels)

Check duplicate status:
```
http://localhost:8080/duplicates
```

## 📊 API Endpoints

- `GET /playlist.m3u` - M3U playlist
- `GET /epg.xml` - XMLTV EPG guide
- `GET /health` - Health check
- `GET /refresh` - Force refresh
- `GET /duplicates` - Duplicate analysis
- `GET /channels` - Channel list

## 🐳 Docker Details

### Build Your Own Image
```bash
docker build -t pluto-for-channels .
```

### Run Without Compose
```bash
docker run -d \
  -p 8080:8080 \
  -v pluto-data:/app/output \
  --name pluto-for-channels \
  pluto-for-channels
```

### View Logs
```bash
docker-compose logs -f
```

## 🛠️ Development

### Run in Development Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Lint Code
```bash
npm run lint
```

## 📈 Performance

- **Caching**: 30-minute cache reduces API calls by ~90%
- **Memory Usage**: ~100MB typical, ~150MB peak
- **CPU Usage**: Minimal except during refresh
- **Startup Time**: ~5 seconds
- **Refresh Time**: ~10-15 seconds for full refresh

## 🐛 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Ensure port 8080 is free
netstat -an | findstr 8080
```

### No channels appearing
1. Check http://localhost:8080/health
2. Try manual refresh: http://localhost:8080/refresh
3. Enable debug mode: Set `DEBUG=true` in docker-compose.yml

### Duplicate channels
- The system automatically removes duplicates
- Check http://localhost:8080/duplicates for analysis

## 🔄 Differences from Original

| Feature | Original | This Version |
|---------|----------|--------------|
| Language | Node.js callbacks | ES6+ async/await |
| Server | Requires separate HTTP server | Built-in Express server |
| Docker | Basic support | Full Docker Compose with health checks |
| Caching | File-based only | In-memory + file caching |
| Duplicates | Manual filtering needed | Automatic detection and removal |
| Updates | Manual | Automatic refresh every 6 hours |
| Monitoring | None | Health checks and status endpoints |
| Error Handling | Basic | Comprehensive with retries |

## 📄 License

MIT License - Same as original project

## 🙏 Credits

- Original project by [@maddox](https://github.com/maddox)
- Pluto TV for providing the API
- Channels DVR community for inspiration

## 🤝 Contributing

Pull requests welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 Changelog

### v2.0.0 (2024)
- Complete rewrite in modern JavaScript
- Added Docker support
- Built-in web server
- Duplicate channel detection
- Smart caching system
- Auto-refresh capability
- Health monitoring
- Multiple new endpoints

### v1.x.x
- See original repository for historical changes