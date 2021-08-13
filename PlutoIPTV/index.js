#!/usr/bin/env node

const request = require("request");
const j2x = require("jsontoxml");
const moment = require("moment");
const fs = require("fs-extra");
const uuid4 = require("uuid").v4;
const uuid1 = require("uuid").v1;
const url = require("url");

const conflictingChannels = ["cnn"];

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
    ["Sci-Fi"],
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
  [["Action"], ["Action & Adventure", "Action Classics", "Crime Action"]],
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
  [["Competition reality"], ["Competition Reality"]],
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
  [["War"], ["Classic War Stories"]],
];

versions = ["main"];

if (process.argv[2]) {
  versions = versions.concat(process.argv[2].split(","));
}

const plutoIPTV = {
  grabJSON: function (callback) {
    callback = callback || function () {};

    console.log("[INFO] Grabbing EPG...");

    // check for cache
    if (fs.existsSync("cache.json")) {
      let stat = fs.statSync("cache.json");

      let now = new Date() / 1000;
      let mtime = new Date(stat.mtime) / 1000;

      // it's under 30 mins old
      if (now - mtime <= 1800) {
        console.log("[DEBUG] Using cache.json, it's under 30 minutes old.");

        callback(fs.readJSONSync("cache.json"));
        return;
      }
    }

    let startMoment = moment();

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

      let url = `http://api.pluto.tv/v2/channels?start=${startTime}&stop=${stopTime}`;
      console.log(url);

      promises.push(
        new Promise((resolve, reject) => {
          request(url, function (err, code, raw) {
            resolve(JSON.parse(raw));
          });
        })
      );
    });

    let channelsList = {};
    Promise.all(promises).then((results) => {
      results.forEach((channels) => {
        channels.forEach((channel) => {
          foundChannel = channelsList[channel._id];

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

      fullChannels = Object.values(channelsList);
      console.log("[DEBUG] Using api.pluto.tv, writing cache.json.");
      fs.writeFileSync("cache.json", JSON.stringify(fullChannels));

      sortedChannels = fullChannels.sort(
        ({ number: a }, { number: b }) => a - b
      );
      callback(sortedChannels);
      return;
    });
  },
};

module.exports = plutoIPTV;

function processChannels(version, channels) {
  ///////////////////
  // M3U8 Playlist //
  ///////////////////

  let m3u8 = "#EXTM3U\n\n";
  channels.forEach((channel) => {
    let deviceId = uuid1();
    let sid = uuid4();
    if (
      channel.isStitched &&
      !channel.slug.match(/^announcement|^privacy-policy/)
    ) {
      let m3uUrl = new URL(channel.stitched.urls[0].url);
      let queryString = url.search;
      let params = new URLSearchParams(queryString);

      // set the url params
      params.set("advertisingId", "");
      params.set("appName", "web");
      params.set("appVersion", "unknown");
      params.set("appStoreUrl", "");
      params.set("architecture", "");
      params.set("buildVersion", "");
      params.set("clientTime", "0");
      params.set("deviceDNT", "0");
      params.set("deviceId", deviceId);
      params.set("deviceMake", "Chrome");
      params.set("deviceModel", "web");
      params.set("deviceType", "web");
      params.set("deviceVersion", "unknown");
      params.set("includeExtendedEvents", "false");
      params.set("sid", sid);
      params.set("userId", "");
      params.set("serverSideAds", "true");

      m3uUrl.search = params.toString();
      m3uUrl = m3uUrl.toString();

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
        .replace("”", "");
      let channelNumberTag;

      m3u8 =
        m3u8 +
        `#EXTINF:0 channel-id="${slug}" tvg-logo="${logo}" tvc-guide-art="${art}" tvc-guide-title="${name}" tvc-guide-description="${guideDescription}" group-title="${group}", ${name}
${m3uUrl}

`;
      console.log("[INFO] Adding " + channel.name + " channel.");
    } else {
      console.log("[DEBUG] Skipping 'fake' channel " + channel.name + ".");
    }
  });

  ///////////////////////////
  // XMLTV Programme Guide //
  ///////////////////////////
  let tv = [];

  //////////////
  // Channels //
  //////////////
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

      //////////////
      // Episodes //
      //////////////
      if (channel.timelines) {
        channel.timelines.forEach((programme) => {
          console.log(
            "[INFO] Adding instance of " +
              programme.title +
              " to channel " +
              channel.name +
              "."
          );

          let episodeParts = programme.episode.description.match(
            /\(([Ss](\d+)[Ee](\d+))\)/
          );
          let episodeNumberString;
          if (episodeParts) {
            episodeNumberString = episodeParts[1];
          }

          let isMovie = programme.episode.series.type == "film";

          let channelsGenres = [];
          let mogrifiedGenres = [...movieGenres, ...seriesGenres];
          mogrifiedGenres.push(["Children", kidsGenres]);
          mogrifiedGenres.push(["News", newsGenres]);
          mogrifiedGenres.push(["Sports", sportsGenres]);
          mogrifiedGenres.push(["Drama", dramaGenres]);

          mogrifiedGenres.forEach((genrePackage) => {
            genreName = genrePackage[0];
            genres = genrePackage[1];

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

          airing = {
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
                name: "desc",
                attrs: { lang: "en" },
                text: programme.episode.description,
              },
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
                name: "category",
                attrs: { lang: "en" },
                text: programme.episode.genre,
              },
              {
                name: "category",
                attrs: { lang: "en" },
                text: programme.episode.subGenre,
              },
              {
                name: "series-id",
                attrs: { system: "pluto" },
                text: programme.episode.series._id,
              },
              {
                name: "episode-num",
                attrs: { system: "onscreen" },
                text: episodeNumberString || programme.episode.number,
              },
              {
                name: "episode-num",
                attrs: { system: "pluto" },
                text: programme.episode._id,
              },
              {
                name: "episode-num",
                attrs: { system: "original-air-date" },
                text: programme.episode.clip
                  ? programme.episode.clip.originalReleaseDate
                  : null,
              },
            ],
          };

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

          if (!isMovie) {
            airing.children.push({
              name: "sub-title",
              attrs: { lang: "en" },
              text:
                programme.title == programme.episode.name
                  ? ""
                  : programme.episode.name,
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

  epgFileName = version == "main" ? "epg.xml" : `${version}-epg.xml`;
  playlistFileName =
    version == "main" ? "playlist.m3u" : `${version}-playlist.m3u`;

  fs.writeFileSync(epgFileName, epg);
  console.log(`[SUCCESS] Wrote the EPG to ${epgFileName}!`);

  fs.writeFileSync(playlistFileName, m3u8);
  console.log(`[SUCCESS] Wrote the M3U8 tuner to ${playlistFileName}!`);
}

versions.forEach((version) => {
  plutoIPTV.grabJSON(function (channels) {
    processChannels(version, channels);
  });
});
