module.exports = {
  // API Configuration
  api: {
    baseUrl: 'https://api.pluto.tv/v2/channels',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 60000,
    userAgent: 'pluto-iptv/2.0.0',
    timeRangeCount: 4,
    hoursPerRequest: 6
  },

  // Cache Configuration
  cache: {
    maxAge: 30 * 60 * 1000, // 30 minutes
  },

  // Channel Configuration
  channels: {
    startNumber: parseInt(process.env.CHANNEL_START_NUMBER || '1000'),
    conflicting: [
      'cnn',
      'dabl',
      'heartland',
      'newsy',
      'buzzr'
    ],
    // Duplicate handling options
    duplicateHandling: {
      checkNames: true,        // Check for duplicate channel names
      checkSlugs: true,        // Check for duplicate slugs
      checkNumbers: true,      // Check for duplicate numbers
      caseSensitive: false,    // Case sensitivity for name comparison
      preferLowerNumber: true, // When duplicates found, keep channel with lower number
      zeroNumberStart: 9000    // Starting number for channels with number 0
    }
  },

  // Server Configuration
  server: {
    port: 8080,
    autoRefresh: true,
    refreshInterval: 6 * 60 * 60 * 1000 // 6 hours
  },

  // Output Configuration
  output: {
    directory: process.env.OUTPUT_DIR || './output',
    m3uFilename: 'playlist.m3u',
    xmltvFilename: 'epg.xml'
  },

  // Genre Mappings
  genres: {
    movies: [
      [['Action'], [
        'Action & Adventure',
        'Crime Action',
        'Action Sci-Fi & Fantasy',
        'Action Thrillers',
        'Action Classics',
        'African-American Action'
      ]],
      [['Adventure'], ['Action & Adventure', 'Sci-Fi Adventure']],
      [['Crime'], ['Crime Action', 'Crime Thrillers']],
      [['Documentary'], ['Documentaries']],
      [['Thriller'], [
        'Thrillers',
        'Action Thrillers',
        'Crime Thrillers',
        'Political Thrillers',
        'Classic Thrillers',
        'Psychological Thrillers',
        'Supernatural Thrillers'
      ]],
      [['Science fiction'], [
        'Sci-Fi & Fantasy',
        'Action Sci-Fi & Fantasy',
        'Sci-Fi Adventure',
        'Sci-Fi Dramas',
        'Alien Sci-Fi',
        'Sci-Fi Cult Classics'
      ]],
      [['Fantasy'], ['Sci-Fi & Fantasy', 'Action Sci-Fi & Fantasy']],
      [['Drama'], [
        'Teen Dramas',
        'Indie Dramas',
        'Classic Dramas',
        'Romantic Dramas',
        'Sci-Fi Dramas',
        'Family Dramas'
      ]],
      [['Romantic comedy'], ['Romantic Comedies']],
      [['Romance'], ['Romance', 'Romance Classics', 'Romantic Dramas']],
      [['Western'], ['Classic Westerns', 'Westerns']],
      [['Mystery'], ['Suspense']]
    ],
    
    series: [
      [['Animated'], ['Family Animation', 'Cartoons']],
      [['Educational'], ['Education & Guidance', 'Instructional & Educational']],
      [['News'], ['News and Information', 'General News']],
      [['History'], ['History & Social Studies']],
      [['Politics'], ['Politics']],
      [['Action'], [
        'Action & Adventure',
        'Action Classics',
        'Martial Arts',
        'Crime Action',
        'Family Adventures'
      ]],
      [['Adventure'], ['Action & Adventure', 'Adventures', 'Sci-Fi Adventure']],
      [['Reality'], [
        'Reality',
        'Reality Drama',
        'Courtroom Reality',
        'Occupational Reality',
        'Celebrity Reality'
      ]],
      [['Documentary'], [
        'Documentaries',
        'Social & Cultural Documentaries',
        'Science and Nature Documentaries',
        'Miscellaneous Documentaries',
        'Crime Documentaries',
        'Travel & Adventure Documentaries',
        'Sports Documentaries',
        'Military Documentaries',
        'Political Documentaries',
        'Foreign Documentaries',
        'Religion & Mythology Documentaries',
        'Historical Documentaries',
        'Biographical Documentaries',
        'Faith & Spirituality Documentaries'
      ]],
      [['Biography'], ['Biographical Documentaries', 'Inspirational Biographies']],
      [['Thriller'], ['Sci-Fi Thrillers', 'Thrillers', 'Crime Thrillers']],
      [['Talk'], ['Talk & Variety', 'Talk Show']],
      [['Variety'], ['Sketch Comedies']],
      [['Home Improvement'], ['Art & Design', 'DIY & How To', 'Home Improvement']],
      [['House/garden'], ['Home & Garden']],
      [['Science'], ['Science and Nature Documentaries']],
      [['Nature'], ['Science and Nature Documentaries', 'Animals']],
      [['Cooking'], ['Cooking Instruction', 'Food & Wine', 'Food Stories']],
      [['Travel'], ['Travel & Adventure Documentaries', 'Travel']],
      [['Western'], ['Westerns', 'Classic Westerns']],
      [['LGBTQ'], ['Gay & Lesbian', 'Gay & Lesbian Dramas', 'Gay']],
      [['Game show'], ['Game Show']],
      [['Military'], ['Classic War Stories']],
      [['Comedy'], [
        'Cult Comedies',
        'Spoofs and Satire',
        'Slapstick',
        'Classic Comedies',
        'Stand-Up',
        'Sports Comedies',
        'African-American Comedies',
        'Showbiz Comedies',
        'Sketch Comedies',
        'Teen Comedies',
        'Latino Comedies',
        'Family Comedies'
      ]],
      [['Crime'], ['Crime Action', 'Crime Drama', 'Crime Documentaries']],
      [['Crime drama'], ['Crime Drama']],
      [['Drama'], [
        'Classic Dramas',
        'Family Drama',
        'Indie Drama',
        'Romantic Drama',
        'Crime Drama'
      ]]
    ]
  }
};