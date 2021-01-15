# Pluto for Channels

This simple Docker image will generate an M3U playlist and EPG optimized for use in [Channels](https://getchannels.com) and expose them over HTTP.

[Channels](https://getchannels.com) supports [custom channels](https://getchannels.com/docs/channels-dvr-server/how-to/custom-channels/) by utilizing streaming sources via M3U playlists.

[Channels](https://getchannels.com) allows for [additional extended metadata tags](https://getchannels.com/docs/channels-dvr-server/how-to/custom-channels/#channels-extensions) in M3U playlists that allow you to give it extra information and art to make the experience better. This project adds those extra tags to make things look great in Channels.

## Set Up

Running the container is easy. Fire up the container as usual. You can set which port it runs on.

    docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 jonmaddox/pluto-for-channels

You can retrieve the playlist and EPG via the status page.

    http://127.0.0.1:8080
    
### Optionally have multiple feeds generated

By using the `VERSIONS` env var when starting the docker container, you can tell it to create multiple feeds that can be used elsewhere.

Simpley provide a comma separated list of words without spaces with the `VERSIONS` env var.

    docker run -d --restart unless-stopped --name pluto-for-channels -p 8080:80 -e VERSIONS=Dad,Bob,Joe jonmaddox/pluto-for-channels


## Add Source to Channels

Once you have your Pluto M3U and EPG XML available, you can use it to [custom channels](https://getchannels.com/docs/channels-dvr-server/how-to/custom-channels/) channels in the [Channels](https://getchannels.com) app.

Add a new source in Channels DVR Server and choose `M3U Playlist`. Fill out the form using your new playlist URL.

<img src=".github/1.png" width="400px"/>

Next, set the provider for your new source and choose custom URL.

<img src=".github/2.png" width="300px"/>

Finally, enter your EPG xml url and set it to refresh every 6 hours.

<img src=".github/3.png" width="500px"/>
