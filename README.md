# Pluto for Channels

This simple Docker image will generate an M3U playlist and EPG optimized for use in [Channels](https://getchannels.com) and expose them over HTTP.

[Channels](https://getchannels.com) supports [custom channels](https://getchannels.com/docs/channels-dvr-server/how-to/custom-channels/) by utilizing streaming sources via M3U playlists.

[Channels](https://getchannels.com) allows for [additional extended metadata tags](https://getchannels.com/docs/channels-dvr-server/how-to/custom-channels/#channels-extensions) in M3U playlists that allow you to give it extra information and art to make the experience better. This project adds those extra tags to make things look great in Channels.

## Set Up

Pluto TV now requires authentication for streams to work. You'll need a free Pluto TV account.

### Required: Authentication

You must provide your Pluto TV credentials via environment variables:

- `PLUTO_USERNAME` - Your Pluto TV account email
- `PLUTO_PASSWORD` - Your Pluto TV account password

Running the container:

    docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 \
      -e PLUTO_USERNAME='your@email.com' \
      -e PLUTO_PASSWORD='yourpassword' \
      jonmaddox/pluto-for-channels

You can retrieve the playlist and EPG via the status page.

    http://127.0.0.1:8080

### Optionally provide a starting channel number

By using the `START` env var when starting the docker container, you can tell it to start channel numbers with this value. Original Pluto channel numbers will be added to this, keeping all of the channels in the same order they are on Pluto.

**Default:** 10000 (channel 345 becomes 10345). This ensures consistent channel numbers across all tuners for proper Channels DVR Server failover.

To use a custom starting number:

    docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 \
      -e PLUTO_USERNAME='your@email.com' \
      -e PLUTO_PASSWORD='yourpassword' \
      -e START=80000 \
      jonmaddox/pluto-for-channels

## Add Source to Channels

Once you have your Pluto M3U and EPG XML available, you can use it to [custom channels](https://getchannels.com/docs/channels-dvr-server/how-to/custom-channels/) channels in the [Channels](https://getchannels.com) app.

12 tuners are available for concurrent streaming. Add as many as you need:

1. Add tuner playlists as separate Custom Channels sources:
   - Source 1: `http://your-server:8080/tuner-1-playlist.m3u`
   - Source 2: `http://your-server:8080/tuner-2-playlist.m3u`
   - ... up to tuner-12
2. Set the **Stream Limit** dropdown to **1** for each source
3. Use the same EPG URL (`http://your-server:8080/epg.xml`) for all sources
4. Channels DVR Server will automatically coordinate between tuners and failover as needed

<img src=".github/1.png" width="400px"/>

Next, set the provider for your new source and choose custom URL.

<img src=".github/2.png" width="300px"/>

Finally, enter your EPG xml url and set it to refresh every 6 hours.

<img src=".github/3.png" width="500px"/>
