#!/usr/bin/env node

const axios = require('axios');
const j2x = require('jsontoxml');
const moment = require('moment');
const fs = require('fs-extra');
const { v4: uuid4, v1: uuid1 } = require('uuid');
const path = require('path');
const express = require('express');
const config = require('./config');
const logger = require('./logger');

class PlutoIPTV {
  constructor() {
    this.config = config;
    this.cache = null;
    this.cacheTimestamp = null;
  }

  /**
   * Fetch channel data from Pluto TV API with caching
   */
  async fetchChannelData() {
    try {
      // Check cache validity
      if (this.cache && this.cacheTimestamp) {
        const cacheAge = Date.now() - this.cacheTimestamp;
        if (cacheAge < this.config.cache.maxAge) {
          logger.info('Using in-memory cache');
          return this.cache;
        }
      }

      // Check file cache
      const cacheFile = path.join(this.config.output.directory, 'cache.json');
      if (await fs.pathExists(cacheFile)) {
        const stat = await fs.stat(cacheFile);
        const fileAge = Date.now() - stat.mtime.getTime();
        
        if (fileAge < this.config.cache.maxAge) {
          logger.info('Using file cache');
          const data = await fs.readJSON(cacheFile);
          this.cache = data;
          this.cacheTimestamp = stat.mtime.getTime();
          return data;
        }
      }

      logger.info('Fetching fresh data from Pluto TV API');
      const channels = await this.fetchFromAPI();
      
      // Update caches
      this.cache = channels;
      this.cacheTimestamp = Date.now();
      await fs.writeJSON(cacheFile, channels, { spaces: 2 });
      
      return channels;
    } catch (error) {
      logger.error('Error fetching channel data:', error);
      throw error;
    }
  }

  /**
   * Fetch data from Pluto TV API with retries
   */
  async fetchFromAPI() {
    const timeRanges = this.generateTimeRanges();
    const promises = timeRanges.map(range => this.fetchTimeRange(range));
    
    try {
      const results = await Promise.all(promises);
      return this.mergeChannelData(results);
    } catch (error) {
      logger.error('Error fetching from API:', error);
      throw error;
    }
  }

  /**
   * Generate time ranges for API requests
   */
  generateTimeRanges() {
    const ranges = [];
    let startMoment = moment();
    
    for (let i = 0; i < this.config.api.timeRangeCount; i++) {
      const endMoment = moment(startMoment).add(this.config.api.hoursPerRequest, 'hours');
      ranges.push([startMoment, endMoment]);
      startMoment = endMoment;
    }
    
    return ranges;
  }

  /**
   * Fetch data for a specific time range with retries
   */
  async fetchTimeRange([start, end], retries = this.config.api.maxRetries) {
    const startTime = encodeURIComponent(start.format('YYYY-MM-DD HH:00:00.000ZZ'));
    const stopTime = encodeURIComponent(end.format('YYYY-MM-DD HH:00:00.000ZZ'));
    const url = `${this.config.api.baseUrl}?start=${startTime}&stop=${stopTime}`;
    
    try {
      logger.debug(`Fetching: ${url}`);
      const response = await axios.get(url, {
        timeout: this.config.api.timeout,
        headers: {
          'User-Agent': this.config.api.userAgent
        }
      });
      return response.data;
    } catch (error) {
      if (retries > 0 && (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET')) {
        logger.warn(`Retrying request... (${this.config.api.maxRetries - retries + 1}/${this.config.api.maxRetries})`);
        await this.delay(this.config.api.retryDelay);
        return this.fetchTimeRange([start, end], retries - 1);
      }
      throw error;
    }
  }

  /**
   * Merge channel data from multiple time ranges
   */
  mergeChannelData(results) {
    const channelsMap = new Map();
    
    results.forEach(channels => {
      channels.forEach(channel => {
        if (channelsMap.has(channel._id)) {
          const existing = channelsMap.get(channel._id);
          existing.timelines = existing.timelines.concat(channel.timelines);
        } else {
          channelsMap.set(channel._id, channel);
        }
      });
    });
    
    return Array.from(channelsMap.values())
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }

  /**
   * Generate M3U playlist
   */
  generateM3U(channels) {
    let m3u = '#EXTM3U\n\n';
    const validChannels = this.filterValidChannels(channels);
    
    validChannels.forEach(channel => {
      const channelData = this.prepareChannelData(channel);
      if (channelData) {
        m3u += this.formatM3UEntry(channelData);
        logger.info(`Added channel: ${channel.name}`);
      }
    });
    
    return m3u;
  }

  /**
   * Filter valid channels and remove duplicates
   */
  filterValidChannels(channels) {
    const seenNumbers = new Set();
    const seenSlugs = new Set();
    const seenNames = new Map();
    const duplicates = [];
    let zeroNumberCount = 0;
    
    // First pass: handle channel number 0 assignments
    const processedChannels = channels.map(channel => {
      if (channel.isStitched && !channel.slug.match(/^(announcement|privacy-policy)/) && 
          (channel.number === 0 || channel.number === '0')) {
        const newNumber = 9000 + zeroNumberCount;
        logger.warn(`Channel "${channel.name}" has number 0, assigning ${newNumber}`);
        zeroNumberCount++;
        return { ...channel, number: newNumber };
      }
      return channel;
    });
    
    // Second pass: filter and remove duplicates
    const filtered = [];
    
    processedChannels.forEach(channel => {
      // Skip non-stitched channels
      if (!channel.isStitched || channel.slug.match(/^(announcement|privacy-policy)/)) {
        return;
      }
      
      // Check for duplicate channel numbers
      if (seenNumbers.has(channel.number)) {
        logger.warn(`Duplicate channel number found: ${channel.number} (${channel.name})`);
        duplicates.push({ reason: 'number', channel });
        return;
      }
      
      // Check for duplicate slugs
      if (seenSlugs.has(channel.slug)) {
        logger.warn(`Duplicate channel slug found: ${channel.slug} (${channel.name})`);
        duplicates.push({ reason: 'slug', channel });
        return;
      }
      
      // Check for similar channel names (case-insensitive)
      const normalizedName = channel.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        const existing = seenNames.get(normalizedName);
        logger.warn(`Similar channel name found: "${channel.name}" (number: ${channel.number}) duplicates "${existing.name}" (number: ${existing.number})`);
        duplicates.push({ reason: 'name', channel, existing });
        
        // Keep the channel with the lower number (but prefer non-zero numbers)
        const existingNum = parseInt(existing.number);
        const currentNum = parseInt(channel.number);
        
        if (currentNum < existingNum && currentNum > 0) {
          // Remove the existing channel from filtered array
          const existingIndex = filtered.findIndex(ch => ch._id === existing._id);
          if (existingIndex > -1) {
            filtered.splice(existingIndex, 1);
            seenNumbers.delete(existing.number);
            seenSlugs.delete(existing.slug);
          }
          // Add current channel
          filtered.push(channel);
          seenNumbers.add(channel.number);
          seenSlugs.add(channel.slug);
          seenNames.set(normalizedName, channel);
        }
        return;
      }
      
      // Add to filtered array and seen sets
      filtered.push(channel);
      seenNumbers.add(channel.number);
      seenSlugs.add(channel.slug);
      seenNames.set(normalizedName, channel);
    });
    
    // Log summary if duplicates were found
    if (duplicates.length > 0 || zeroNumberCount > 0) {
      logger.info(`Found and removed ${duplicates.length} duplicate channels`);
      if (zeroNumberCount > 0) {
        logger.info(`Reassigned ${zeroNumberCount} channels with number 0`);
      }
      if (this.config.debug || process.env.DEBUG === 'true') {
        logger.debug('Duplicate details:', duplicates.map(d => ({
          reason: d.reason,
          name: d.channel.name,
          number: d.channel.number,
          slug: d.channel.slug
        })));
      }
    }
    
    return filtered;
  }

  /**
   * Prepare channel data for M3U entry
   */
  prepareChannelData(channel) {
    try {
      const deviceId = uuid1();
      const sid = uuid4();
      const url = new URL(channel.stitched.urls[0].url);
      
      // Set URL parameters
      const params = new URLSearchParams({
        advertisingId: '',
        appName: 'web',
        appVersion: 'unknown',
        appStoreUrl: '',
        architecture: '',
        buildVersion: '',
        clientTime: '0',
        deviceDNT: '0',
        deviceId: deviceId,
        deviceMake: 'Chrome',
        deviceModel: 'web',
        deviceType: 'web',
        deviceVersion: 'unknown',
        includeExtendedEvents: 'false',
        sid: sid,
        userId: '',
        serverSideAds: 'true'
      });
      
      url.search = params.toString();
      
      const slug = this.config.channels.conflicting.includes(channel.slug)
        ? `pluto-${channel.slug}`
        : channel.slug;
      
      return {
        slug,
        channelNumber: this.config.channels.startNumber + parseInt(channel.number),
        name: channel.name,
        logo: channel.colorLogoPNG.path,
        group: channel.category,
        art: channel.featuredImage.path
          .replace('w=1600', 'w=1000')
          .replace('h=900', 'h=562'),
        description: channel.summary
          .replace(/(\r\n|\n|\r)/gm, ' ')
          .replace(/["""]/g, ''),
        url: url.toString()
      };
    } catch (error) {
      logger.error(`Error preparing channel ${channel.name}:`, error);
      return null;
    }
  }

  /**
   * Format M3U entry
   */
  formatM3UEntry(data) {
    return `#EXTINF:0 channel-id="${data.slug}" channel-number="${data.channelNumber}" tvg-logo="${data.logo}" tvc-guide-art="${data.art}" tvc-guide-title="${data.name}" tvc-guide-description="${data.description}" group-title="${data.group}", ${data.name}
${data.url}

`;
  }

  /**
   * Generate XMLTV EPG
   */
  generateXMLTV(channels) {
    const tv = [];
    const validChannels = this.filterValidChannels(channels);
    
    validChannels.forEach(channel => {
      const slug = this.config.channels.conflicting.includes(channel.slug)
        ? `pluto-${channel.slug}`
        : channel.slug;
      
      // Add channel entry
      tv.push(this.createChannelElement(channel, slug));
      
      // Add programme entries
      if (channel.timelines) {
        const programmes = this.createProgrammeElements(channel, slug);
        tv.push(...programmes);
      }
    });
    
    return j2x({ tv }, {
      prettyPrint: true,
      escape: true
    });
  }

  /**
   * Create channel element for XMLTV
   */
  createChannelElement(channel, slug) {
    return {
      name: 'channel',
      attrs: { id: slug },
      children: [
        { name: 'display-name', text: channel.name },
        { name: 'display-name', text: channel.number },
        { name: 'desc', text: channel.summary },
        { name: 'icon', attrs: { src: channel.colorLogoPNG.path } }
      ]
    };
  }

  /**
   * Create programme elements for XMLTV
   */
  createProgrammeElements(channel, slug) {
    const programmes = [];
    
    channel.timelines.forEach(timeline => {
      try {
        const programme = this.createProgrammeElement(timeline, channel, slug);
        if (programme) {
          programmes.push(programme);
          logger.debug(`Added programme: ${timeline.title}`);
        }
      } catch (error) {
        logger.error(`Error creating programme for ${timeline.title}:`, error);
      }
    });
    
    return programmes;
  }

  /**
   * Create a single programme element
   */
  createProgrammeElement(timeline, channel, slug) {
    const programme = {
      name: 'programme',
      attrs: {
        start: moment(timeline.start).format('YYYYMMDDHHmmss ZZ'),
        stop: moment(timeline.stop).format('YYYYMMDDHHmmss ZZ'),
        channel: slug
      },
      children: []
    };
    
    // Basic information
    programme.children.push(
      { name: 'title', attrs: { lang: 'en' }, text: timeline.title }
    );
    
    // Episode information
    const episodeInfo = this.extractEpisodeInfo(timeline);
    if (episodeInfo) {
      programme.children.push(episodeInfo);
    }
    
    // Categories
    const categories = this.determineCategories(timeline, channel);
    categories.forEach(category => {
      programme.children.push({
        name: 'category',
        attrs: { lang: 'en' },
        text: category
      });
    });
    
    // Additional metadata
    this.addProgrammeMetadata(programme, timeline);
    
    return programme;
  }

  /**
   * Extract episode information
   */
  extractEpisodeInfo(timeline) {
    const episode = timeline.episode;
    if (!episode) return null;
    
    const match = episode.description?.match(/\(([Ss](\d+)[Ee](\d+))\)/);
    if (match) {
      return {
        name: 'episode-num',
        attrs: { system: 'onscreen' },
        text: match[1]
      };
    }
    
    if (episode.season > 0 && episode.number > 0) {
      return {
        name: 'episode-num',
        attrs: { system: 'onscreen' },
        text: `S${episode.season}E${episode.number}`
      };
    }
    
    if (episode.number > 0) {
      return {
        name: 'episode-num',
        attrs: { system: 'onscreen' },
        text: `${episode.number}`
      };
    }
    
    return null;
  }

  /**
   * Determine categories for a programme
   */
  determineCategories(timeline, channel) {
    const categories = new Set();
    const episode = timeline.episode;
    
    if (!episode) return Array.from(categories);
    
    // Add basic category
    const isMovie = episode.series?.type === 'film';
    categories.add(isMovie ? 'Movie' : 'Series');
    
    // Add genre categories
    if (episode.genre) categories.add(episode.genre);
    if (episode.subGenre) categories.add(episode.subGenre);
    
    // Map to standard categories
    const mappedCategories = this.mapToStandardCategories(
      Array.from(categories),
      channel.category
    );
    
    return mappedCategories;
  }

  /**
   * Map genres to standard categories
   */
  mapToStandardCategories(genres, channelCategory) {
    const standardCategories = new Set();
    const allMappings = [...this.config.genres.movies, ...this.config.genres.series];
    
    allMappings.forEach(([standard, mapped]) => {
      if (mapped.some(m => 
        genres.includes(m) || channelCategory === m
      )) {
        standardCategories.add(standard);
      }
    });
    
    return Array.from(standardCategories);
  }

  /**
   * Add additional programme metadata
   */
  addProgrammeMetadata(programme, timeline) {
    const episode = timeline.episode;
    if (!episode) return;
    
    // Description
    if (episode.description && episode.description !== 'No information available') {
      programme.children.push({
        name: 'desc',
        attrs: { lang: 'en' },
        text: episode.description
      });
    }
    
    // Icon
    const icon = this.getProgrammeIcon(episode);
    if (icon) {
      programme.children.push({
        name: 'icon',
        attrs: { src: icon }
      });
    }
    
    // Original air date
    if (episode.clip?.originalReleaseDate) {
      programme.children.push({
        name: 'date',
        text: moment(episode.clip.originalReleaseDate).format('YYYYMMDD')
      });
    }
    
    // Live broadcast
    if (episode.liveBroadcast) {
      programme.children.push({ name: 'live' });
    }
    
    // Subtitle
    if (timeline.title !== episode.name && episode.name) {
      programme.children.push({
        name: 'sub-title',
        attrs: { lang: 'en' },
        text: episode.name
      });
    }
  }

  /**
   * Get programme icon
   */
  getProgrammeIcon(episode) {
    if (episode.series?.type === 'film' && episode.poster) {
      return episode.poster.path;
    }
    
    if (episode.series?.tile?.path) {
      return episode.series.tile.path
        .replace('w=660', 'w=900')
        .replace('h=660', 'h=900');
    }
    
    return null;
  }

  /**
   * Process channels and generate output files
   */
  async processChannels() {
    try {
      logger.info('Starting channel processing...');
      
      const channels = await this.fetchChannelData();
      logger.info(`Found ${channels.length} channels`);
      
      // Generate M3U
      const m3u = this.generateM3U(channels);
      const m3uPath = path.join(this.config.output.directory, this.config.output.m3uFilename);
      await fs.writeFile(m3uPath, m3u);
      logger.success(`M3U playlist written to ${m3uPath}`);
      
      // Generate XMLTV
      const xmltv = this.generateXMLTV(channels);
      const xmltvPath = path.join(this.config.output.directory, this.config.output.xmltvFilename);
      await fs.writeFile(xmltvPath, xmltv);
      logger.success(`XMLTV EPG written to ${xmltvPath}`);
      
      return { m3uPath, xmltvPath };
    } catch (error) {
      logger.error('Error processing channels:', error);
      throw error;
    }
  }

  /**
   * Start web server
   */
  async startServer() {
    const app = express();
    
    // Ensure output directory exists
    await fs.ensureDir(this.config.output.directory);
    
    // Serve static files
    app.use(express.static(this.config.output.directory));
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        cache: {
          hasData: !!this.cache,
          age: this.cacheTimestamp ? Date.now() - this.cacheTimestamp : null
        }
      });
    });
    
    // Refresh endpoint
    app.get('/refresh', async (req, res) => {
      try {
        logger.info('Manual refresh requested');
        this.cache = null;
        this.cacheTimestamp = null;
        await this.processChannels();
        res.json({ status: 'success', message: 'Channels refreshed' });
      } catch (error) {
        logger.error('Refresh error:', error);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
    
    // Duplicates check endpoint
    app.get('/duplicates', async (req, res) => {
      try {
        const channels = await this.fetchChannelData();
        const analysis = this.analyzeDuplicates(channels);
        res.json(analysis);
      } catch (error) {
        logger.error('Duplicate analysis error:', error);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
    
    // Channels list endpoint
    app.get('/channels', async (req, res) => {
      try {
        const channels = await this.fetchChannelData();
        const filtered = this.filterValidChannels(channels);
        const enhanced = filtered.map(channel => {
          const channelData = this.prepareChannelData(channel);
          return channelData ? {
            number: channelData.channelNumber,
            name: channel.name,
            slug: channelData.slug,
            category: channel.category,
            originalNumber: channel.number
          } : null;
        }).filter(ch => ch !== null).sort((a, b) => a.number - b.number);
        
        res.json({
          totalRaw: channels.length,
          totalFiltered: enhanced.length,
          channels: enhanced
        });
      } catch (error) {
        logger.error('Channels list error:', error);
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
    
    // Start server
    const port = process.env.PORT || this.config.server.port;
    app.listen(port, '0.0.0.0', () => {
      logger.success(`Server running on http://0.0.0.0:${port}`);
      logger.info(`M3U Playlist: http://localhost:${port}/${this.config.output.m3uFilename}`);
      logger.info(`XMLTV EPG: http://localhost:${port}/${this.config.output.xmltvFilename}`);
    });
    
    // Initial processing
    await this.processChannels();
    
    // Set up periodic refresh
    if (this.config.server.autoRefresh) {
      setInterval(() => {
        logger.info('Auto-refresh triggered');
        this.processChannels().catch(error => {
          logger.error('Auto-refresh error:', error);
        });
      }, this.config.server.refreshInterval);
    }
  }

  /**
   * Utility: delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Analyze channels for duplicates
   */
  analyzeDuplicates(channels) {
    const analysis = {
      totalChannels: channels.length,
      validChannels: 0,
      duplicates: {
        byNumber: [],
        byName: [],
        bySlug: []
      },
      summary: {}
    };
    
    const seenNumbers = new Map();
    const seenNames = new Map();
    const seenSlugs = new Map();
    
    channels.forEach(channel => {
      if (!channel.isStitched || channel.slug.match(/^(announcement|privacy-policy)/)) {
        return;
      }
      
      analysis.validChannels++;
      
      // Check number duplicates
      if (seenNumbers.has(channel.number)) {
        analysis.duplicates.byNumber.push({
          current: { name: channel.name, number: channel.number, slug: channel.slug },
          existing: seenNumbers.get(channel.number)
        });
      } else {
        seenNumbers.set(channel.number, { name: channel.name, number: channel.number, slug: channel.slug });
      }
      
      // Check name duplicates
      const normalizedName = channel.name.toLowerCase().trim();
      if (seenNames.has(normalizedName)) {
        analysis.duplicates.byName.push({
          current: { name: channel.name, number: channel.number, slug: channel.slug },
          existing: seenNames.get(normalizedName)
        });
      } else {
        seenNames.set(normalizedName, { name: channel.name, number: channel.number, slug: channel.slug });
      }
      
      // Check slug duplicates
      if (seenSlugs.has(channel.slug)) {
        analysis.duplicates.bySlug.push({
          current: { name: channel.name, number: channel.number, slug: channel.slug },
          existing: seenSlugs.get(channel.slug)
        });
      } else {
        seenSlugs.set(channel.slug, { name: channel.name, number: channel.number, slug: channel.slug });
      }
    });
    
    // Create summary
    analysis.summary = {
      totalDuplicateNumbers: analysis.duplicates.byNumber.length,
      totalDuplicateNames: analysis.duplicates.byName.length,
      totalDuplicateSlugs: analysis.duplicates.bySlug.length,
      totalUniqueChannels: analysis.validChannels - Math.max(
        analysis.duplicates.byNumber.length,
        analysis.duplicates.byName.length,
        analysis.duplicates.bySlug.length
      )
    };
    
    return analysis;
  }
}

// Main execution
if (require.main === module) {
  const pluto = new PlutoIPTV();
  
  if (process.env.SERVER_MODE === 'true' || process.argv.includes('--server')) {
    pluto.startServer().catch(error => {
      logger.error('Failed to start server:', error);
      process.exit(1);
    });
  } else {
    pluto.processChannels()
      .then(() => {
        logger.success('Processing complete!');
        process.exit(0);
      })
      .catch(error => {
        logger.error('Processing failed:', error);
        process.exit(1);
      });
  }
}

module.exports = PlutoIPTV;