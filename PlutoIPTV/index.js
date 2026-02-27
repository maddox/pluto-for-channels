#!/usr/bin/env node

const request = require("request");
const j2x = require("jsontoxml");
const moment = require("moment");
const fs = require("fs-extra");
const uuid4 = require("uuid").v4;

// Authentication sessions stored per tuner
const authSessions = new Map(); // tunerName -> { sessionToken, stitcherParams, deviceId }

// Authenticate with Pluto TV to get session token and stitcher params
// Each tuner gets its own unique session with a different deviceId
function authenticate(tunerName) {
  return new Promise((resolve, reject) => {
    // Validate required credentials
    if (!process.env.PLUTO_USERNAME || !process.env.PLUTO_PASSWORD) {
      reject(new Error('PLUTO_USERNAME and PLUTO_PASSWORD environment variables are required'));
      return;
    }

    // Generate unique deviceId per tuner for independent sessions
    const deviceId = uuid4();
    const bootParams = new URLSearchParams({
      appName: 'web',
      appVersion: '8.0.0-111b2b9dc00bd0bea9030b30662159ed9e7c8bc6',
      deviceVersion: '122.0.0',
      deviceModel: 'web',
      deviceMake: 'chrome',
      deviceType: 'web',
      clientID: deviceId,
      clientModelNumber: '1.0.0',
      serverSideAds: 'false',
      drmCapabilities: 'widevine:L3',
      username: process.env.PLUTO_USERNAME,
      password: process.env.PLUTO_PASSWORD,
    });

    const bootUrl = `https://boot.pluto.tv/v4/start?${bootParams.toString()}`;
    console.log(`[INFO] Authenticating ${tunerName} with Pluto TV (deviceId: ${deviceId.substring(0, 8)}...)...`);

    request(bootUrl, function (err, response, body) {
      if (err) {
        reject(new Error(`Authentication request failed: ${err.message}`));
        return;
      }

      try {
        const data = JSON.parse(body);

        if (!data.sessionToken) {
          reject(new Error('Authentication failed: No session token in response'));
          return;
        }

        const authData = {
          sessionToken: data.sessionToken,
          stitcherParams: data.stitcherParams || '',
          deviceId: deviceId,
        };

        console.log(`[INFO] ${tunerName} authentication successful`);
        resolve(authData);
      } catch (parseErr) {
        reject(new Error(`Failed to parse authentication response: ${parseErr.message}`));
      }
    });
  });
}

const conflictingChannels = [
  "cnn",
  "dabl",
  "heartland",
  "newsy",
  "buzzr"
];

const kidsGenres = [
  "Kids",
  "Children & Family",
  "Kids' TV",
  "Cartoons",
  "Animals",
  "Family Animation",
  "Ages 2-4",
  "Ages 11-12",
];
const newsGenres = ["News + Opinion", "General News"];
const sportsGenres = [
  "Sports",
  "Sports & Sports Highlights",
  "Sports Documentaries",
];
const dramaGenres = [
  "Crime",
  "Action & Adventure",
  "Thrillers",
  "Romance",
  "Sci-Fi & Fantasy",
  "Teen Dramas",
  "Film Noir",
  "Romantic Comedies",
  "Indie Dramas",
  "Romance Classics",
  "Crime Action",
  "Action Sci-Fi & Fantasy",
  "Action Thrillers",
  "Crime Thrillers",
  "Political Thrillers",
  "Classic Thrillers",
  "Classic Dramas",
  "Sci-Fi Adventure",
  "Romantic Dramas",
  "Mystery",
  "Psychological Thrillers",
  "Foreign Classic Dramas",
  "Classic Westerns",
  "Westerns",
  "Sci-Fi Dramas",
  "Supernatural Thrillers",
  "Mobster",
  "Action Classics",
  "African-American Action",
  "Suspense",
  "Family Dramas",
  "Alien Sci-Fi",
  "Sci-Fi Cult Classics",
];

const movieGenres = [
  [
    ["Action"],
    [
      "Action & Adventure",
      "Crime Action",
      "Action Sci-Fi & Fantasy",
      "Action Thrillers",
      "Action Classics",
      "African-American Action",
    ],
  ],
  [["Adventure"], ["Action & Adventure", "Sci-Fi Adventure"]],
  [["Crime"], ["Crime Action", "Crime Thrillers"]],
  [["Documentary"], ["Documentaries"]],
  [
    ["Thriller"],
    [
      "Thrillers",
      "Action Thrillers",
      "Crime Thrillers",
      "Political Thrillers",
      "Classic Thrillers",
      "Psychological Thrillers",
      "Supernatural Thrillers",
    ],
  ],
  [
    ["Science fiction"],
    [
      "Sci-Fi & Fantasy",
      "Action Sci-Fi & Fantasy",
      "Sci-Fi Adventure",
      "Sci-Fi Dramas",
      "Alien Sci-Fi",
      "Sci-Fi Cult Classics",
    ],
  ],
  [["Fantasy"], ["Sci-Fi & Fantasy", "Action Sci-Fi & Fantasy"]],
  [
    ["Drama"],
    [
      "Teen Dramas",
      "Indie Dramas",
      "Classic Dramas",
      "Romantic Dramas",
      "Sci-Fi Dramas",
      "Family Dramas",
    ],
  ],
  [["Romantic comedy"], ["Romantic Comedies"]],
  [["Romance"], ["Romance", "Romance Classics", "Romantic Dramas"]],
  [["Western"], ["Classic Westerns", "Westerns"]],
  [["Mystery"], ["Suspense"]],
];

const seriesGenres = [
  [["Animated"], ["Family Animation", "Cartoons"]],
  [["Educational"], ["Education & Guidance", "Instructional & Educational"]],
  [["News"], ["News and Information", "General News"]],
  [["History"], ["History & Social Studies"]],
  [["Politics"], ["Politics"]],
  [
    ["Action"],
    [
      "Action & Adventure",
      "Action Classics",
      "Martial Arts",
      "Crime Action",
      "Family Adventures",
    ],
  ],
  [["Adventure"], ["Action & Adventure", "Adventures", "Sci-Fi Adventure"]],
  [
    ["Reality"],
    [
      "Reality",
      "Reality Drama",
      "Courtroom Reality",
      "Occupational Reality",
      "Celebrity Reality",
    ],
  ],
  [
    ["Documentary"],
    [
      "Documentaries",
      "Social & Cultural Documentaries",
      "Science and Nature Documentaries",
      "Miscellaneous Documentaries",
      "Crime Documentaries",
      "Travel & Adventure Documentaries",
      "Sports Documentaries",
      "Military Documentaries",
      "Political Documentaries",
      "Foreign Documentaries",
      "Religion & Mythology Documentaries",
      "Historical Documentaries",
      "Biographical Documentaries",
      "Faith & Spirituality Documentaries",
    ],
  ],
  [["Biography"], ["Biographical Documentaries", "Inspirational Biographies"]],
  [["Thriller"], ["Sci-Fi Thrillers", "Thrillers", "Crime Thrillers"]],
  [["Talk"], ["Talk & Variety", "Talk Show"]],
  [["Variety"], ["Sketch Comedies"]],
  [["Home Improvement"], ["Art & Design", "DIY & How To", "Home Improvement"]],
  [["House/garden"], ["Home & Garden"]],
  [["Science"], ["Science and Nature Documentaries"]],
  [["Nature"], ["Science and Nature Documentaries", "Animals"]],
  [["Cooking"], ["Cooking Instruction", "Food & Wine", "Food Stories"]],
  [["Travel"], ["Travel & Adventure Documentaries", "Travel"]],
  [["Western"], ["Westerns", "Classic Westerns"]],
  [["LGBTQ"], ["Gay & Lesbian", "Gay & Lesbian Dramas", "Gay"]],
  [["Game show"], ["Game Show"]],
  [["Military"], ["Classic War Stories"]],
  [
    ["Comedy"],
    [
      "Cult Comedies",
      "Spoofs and Satire",
      "Slapstick",
      "Classic Comedies",
      "Stand-Up",
      "Sports Comedies",
      "African-American Comedies",
      "Showbiz Comedies",
      "Sketch Comedies",
      "Teen Comedies",
      "Latino Comedies",
      "Family Comedies",
    ],
  ],
  [["Crime"], ["Crime Action", "Crime Drama", "Crime Documentaries"]],
  [["Crime drama"], ["Crime Drama"]],
  [
    ["Drama"],
    [
      "Classic Dramas",
      "Family Drama",
      "Indie Drama",
      "Romantic Drama",
      "Crime Drama",
    ],
  ],
];

// Default START to 10000 for consistent channel numbers across tuners (important for Channels DVR failover)
const start = parseInt(process.env.START || 10000);

// Fixed 12 tuners for concurrent streaming
const tunerCount = 12;
const tuners = Array.from({ length: tunerCount }, (_, i) => `tuner-${i + 1}`);

const plutoIPTV = {
  grabJSON: function () {
    return new Promise((resolve, reject) => {
      console.log("[INFO] Grabbing EPG...");

      // check for cache
      if (fs.existsSync("cache.json")) {
        let stat = fs.statSync("cache.json");

        let now = new Date() / 1000;
        let mtime = new Date(stat.mtime) / 1000;

        // it's under 30 mins old
        if (now - mtime <= 1800) {
          console.log("[DEBUG] Using cache.json, it's under 30 minutes old.");
          resolve(fs.readJSONSync("cache.json"));
          return;
        }
      }

      let startMoment = moment();

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 60000; // 1 minute

      function requestWithRetry(url, retries = MAX_RETRIES) {
        return new Promise((resolve, reject) => {
          function attempt() {
            request(url, function (err, code, raw) {
              if (err) {
                if (retries > 0 && err.code === 'ETIMEDOUT') {
                  console.log(`Retrying request... (${MAX_RETRIES - retries + 1})`);
                  setTimeout(attempt, RETRY_DELAY);
                  retries--;
                } else {
                  reject(err);
                }
              } else {
                resolve(JSON.parse(raw));
              }
            });
          }
          attempt();
        });
      }

      let timeRanges = [];
      for (let i = 0; i < 4; i++) {
        let endMoment = moment(startMoment).add(6, "hours");
        timeRanges.push([startMoment, endMoment]);
        startMoment = endMoment;
      }

      let promises = [];
      timeRanges.forEach((timeRange) => {
        // 2020-03-24%2021%3A00%3A00.000%2B0000
        let startTime = encodeURIComponent(
          timeRange[0].format("YYYY-MM-DD HH:00:00.000ZZ")
        );

        // 2020-03-25%2005%3A00%3A00.000%2B0000
        let stopTime = encodeURIComponent(
          timeRange[1].format("YYYY-MM-DD HH:00:00.000ZZ")
        );

        let url = `https://api.pluto.tv/v2/channels?start=${startTime}&stop=${stopTime}`;
        console.log(url);

        promises.push(requestWithRetry(url));
      });

      let channelsList = {};
      Promise.all(promises).then((results) => {
        results.forEach((channels) => {
          channels.forEach((channel) => {
            let foundChannel = channelsList[channel._id];

            if (!foundChannel) {
              channelsList[channel._id] = channel;
              foundChannel = channel;
            } else {
              foundChannel.timelines = foundChannel.timelines.concat(
                channel.timelines
              );
            }
          });
        });

        let fullChannels = Object.values(channelsList);
        let sortedChannels = fullChannels.sort(
          ({ number: a }, { number: b }) => a - b
        );
        console.log("[DEBUG] Using api.pluto.tv, writing cache.json.");
        fs.writeFileSync("cache.json", JSON.stringify(sortedChannels));
        resolve(sortedChannels);
      })
      .catch((err) => {
        reject(err);
      });
    });
  },
};

module.exports = plutoIPTV;

// Generate EPG XML file (shared across all tuners - no session-specific data)
function generateEPG(list) {
  let seenChannels = {};
  let channels = [];
  list.forEach((channel) => {
    if (seenChannels[channel.number]) {
      return;
    }
    seenChannels[channel.number] = true;
    channels.push(channel);
  });

  let tv = [];

  // Channels
  channels.forEach((channel) => {
    channel.slug = conflictingChannels.includes(channel.slug)
      ? `pluto-${channel.slug}`
      : channel.slug;

    if (
      channel.isStitched &&
      !channel.slug.match(/^announcement|^privacy-policy/)
    ) {
      tv.push({
        name: "channel",
        attrs: { id: channel.slug },
        children: [
          { name: "display-name", text: channel.name },
          { name: "display-name", text: channel.number },
          { name: "desc", text: channel.summary },
          { name: "icon", attrs: { src: channel.colorLogoPNG.path } },
        ],
      });

      // Episodes
      console.log("[INFO] Processing channel " + channel.name);
      if (channel.timelines) {
        channel.timelines.forEach((programme) => {
          console.log("[INFO]     Adding instance of " + programme.title);

          let episodeParts = programme.episode.description.match(
            /\(([Ss](\d+)[Ee](\d+))\)/
          );
          let episodeNumberString;
          if (episodeParts) {
            episodeNumberString = episodeParts[1];
          } else if (
            programme.episode.season > 0 &&
            programme.episode.number > 0
          ) {
            episodeNumberString = `S${programme.episode.season}E${programme.episode.number}`;
          } else if (programme.episode.number > 0) {
            episodeNumberString = `${programme.episode.number}`;
          }

          let isMovie = programme.episode.series.type == "film";
          let isLive = programme.episode.liveBroadcast === true;

          let channelsGenres = [];
          let mogrifiedGenres = [...movieGenres, ...seriesGenres];
          mogrifiedGenres.push(["Children", kidsGenres]);
          mogrifiedGenres.push(["News", newsGenres]);
          mogrifiedGenres.push(["Sports", sportsGenres]);
          mogrifiedGenres.push(["Drama", dramaGenres]);

          mogrifiedGenres.forEach((genrePackage) => {
            let genreName = genrePackage[0];
            let genres = genrePackage[1];

            if (
              genres.includes(programme.episode.genre) ||
              genres.includes(programme.episode.subGenre) ||
              genres.includes(channel.category)
            ) {
              channelsGenres.push(genreName);
            }
          });

          let airingArt;
          if (isMovie && null != programme.episode.poster) {
            airingArt = programme.episode.poster.path;
          } else {
            airingArt = programme.episode.series.tile.path
              .replace("w=660", "w=900")
              .replace("h=660", "h=900");
          }

          let airing = {
            name: "programme",
            attrs: {
              start: moment(programme.start).format("YYYYMMDDHHmmss ZZ"),
              stop: moment(programme.stop).format("YYYYMMDDHHmmss ZZ"),
              channel: channel.slug,
            },
            children: [
              { name: "title", attrs: { lang: "en" }, text: programme.title },
              { name: "icon", attrs: { src: airingArt } },
              {
                name: "date",
                text: moment(
                  programme.episode.clip
                    ? programme.episode.clip.originalReleaseDate
                    : null
                ).format("YYYYMMDD"),
              },
              {
                name: "category",
                attrs: { lang: "en" },
                text: isMovie ? "Movie" : "Series",
              },
              {
                name: "series-id",
                attrs: { system: "pluto" },
                text: programme.episode.series._id,
              },
            ],
          };

          if (
            programme.episode.description &&
            programme.episode.description != "No information available"
          ) {
            airing.children.push({
              name: "desc",
              attrs: { lang: "en" },
              text: programme.episode.description,
            });
          }
          if (
            programme.episode.genre &&
            programme.episode.genre != "No information available"
          ) {
            airing.children.push({
              name: "category",
              attrs: { lang: "en" },
              text: programme.episode.genre,
            });
          }
          if (
            programme.episode.subGenre &&
            programme.episode.subGenre != "No information available"
          ) {
            airing.children.push({
              name: "category",
              attrs: { lang: "en" },
              text: programme.episode.subGenre,
            });
          }
          if (episodeNumberString && !isMovie && !isLive) {
            airing.children.push({
              name: "episode-num",
              attrs: { system: "onscreen" },
              text: episodeNumberString,
            });
          }
          if (!isMovie && !isLive) {
            airing.children.push({
              name: "episode-num",
              attrs: { system: "pluto" },
              text: programme.episode._id,
            });
          }

          let oad = programme.episode.clip
            ? programme.episode.clip.originalReleaseDate
            : null;
          if (isLive) {
            airing.children.push({
              name: "live",
            });
            airing.children.push({
              name: "episode-num",
              attrs: { system: "original-air-date" },
              text: moment(programme.start).format("YYYYMMDDHHmmss ZZ"),
            });
          } else if (oad) {
            airing.children.push({
              name: "episode-num",
              attrs: { system: "original-air-date" },
              text: oad,
            });
          }

          let uniqueGenres = channelsGenres.filter(function (item, pos) {
            return channelsGenres.indexOf(item) == pos;
          });

          uniqueGenres.forEach((genre) => {
            airing.children.push({
              name: "category",
              attrs: { lang: "en" },
              text: genre,
            });
          });

          let subTitle =
            programme.title == programme.episode.name
              ? ""
              : programme.episode.name;
          if (!isMovie && subTitle) {
            airing.children.push({
              name: "sub-title",
              attrs: { lang: "en" },
              text: subTitle,
            });
          }

          tv.push(airing);
        });
      }
    }
  });

  let epg = j2x(
    { tv },
    {
      prettyPrint: true,
      escape: true,
    }
  );

  fs.writeFileSync("epg.xml", epg);
  console.log(`[SUCCESS] Wrote the EPG to epg.xml!`);
}

// Generate M3U8 playlist for a specific tuner with its own auth session
function generatePlaylist(tunerName, list, authData) {
  let seenChannels = {};
  let channels = [];
  list.forEach((channel) => {
    if (seenChannels[channel.number]) {
      return;
    }
    seenChannels[channel.number] = true;
    channels.push(channel);
  });

  let m3u8 = "#EXTM3U\n\n";
  channels.forEach((channel) => {
    if (
      channel.isStitched &&
      !channel.slug.match(/^announcement|^privacy-policy/)
    ) {
      // Construct authenticated stream URL with tuner-specific JWT
      const stitcher = "https://cfd-v4-service-channel-stitcher-use1-1.prd.pluto.tv";
      let m3uUrl = `${stitcher}/v2/stitch/hls/channel/${channel._id}/master.m3u8?${authData.stitcherParams}&jwt=${authData.sessionToken}&masterJWTPassthrough=true&includeExtendedEvents=true`;

      let slug = conflictingChannels.includes(channel.slug)
        ? `pluto-${channel.slug}`
        : channel.slug;
      let logo = channel.colorLogoPNG.path;
      let group = channel.category;
      let name = channel.name;
      let art = channel.featuredImage.path
        .replace("w=1600", "w=1000")
        .replace("h=900", "h=562");
      let guideDescription = channel.summary
        .replace(/(\r\n|\n|\r)/gm, " ")
        .replace('"', "")
        .replace("\u201D", "");
      let channelNumber = start + parseInt(channel.number);

      m3u8 =
        m3u8 +
        `#EXTINF:0 channel-id="${slug}" tvg-chno="${channelNumber}" channel-number="${channelNumber}" tvg-logo="${logo}" tvc-guide-art="${art}" tvc-guide-title="${name}" tvc-guide-description="${guideDescription}" group-title="${group}", ${name}
${m3uUrl}

`;
      console.log(`[INFO] ${tunerName}: Adding ${channel.name} channel.`);
    } else {
      console.log(`[DEBUG] ${tunerName}: Skipping 'fake' channel ${channel.name}.`);
    }
  });

  const playlistFileName = `${tunerName}-playlist.m3u`;
  fs.writeFileSync(playlistFileName, m3u8);
  console.log(`[SUCCESS] Wrote the M3U8 playlist to ${playlistFileName}!`);
}

// Main execution - authenticate each tuner, then generate files
async function main() {
  try {
    console.log(`[INFO] Starting with ${tunerCount} tuner(s)...`);
    console.log(`[INFO] Channel number offset: ${start}`);

    // Authenticate each tuner with its own session
    for (const tuner of tuners) {
      const authData = await authenticate(tuner);
      authSessions.set(tuner, authData);
    }

    // Fetch channels once (shared data)
    const channels = await plutoIPTV.grabJSON();

    // Generate EPG once (no session-specific data)
    generateEPG(channels);

    // Generate playlist for each tuner with its own auth
    for (const tuner of tuners) {
      generatePlaylist(tuner, channels, authSessions.get(tuner));
    }

    console.log(`[SUCCESS] Generated ${tunerCount} tuner playlist(s) and 1 EPG file.`);
  } catch (err) {
    console.error('[ERROR] ' + err.message);
    process.exit(1);
  }
}

main();
