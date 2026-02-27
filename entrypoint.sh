#!/bin/sh

cd /usr/src/app

nginx

NGINX_ROOT=/usr/share/nginx/html

get_latest_release() {
  curl --silent "https://api.github.com/repos/maddox/pluto-for-channels/releases/latest" |
    grep '"tag_name":' |
    sed -E 's/.*"([^"]+)".*/\1/'
}

while :
do
  PLUTO_USERNAME=$PLUTO_USERNAME PLUTO_PASSWORD=$PLUTO_PASSWORD START=$START TUNERS=${TUNERS:-1} node index.js

  CURRENT_VERSION=`cat VERSION`
  LATEST_VERSION=`get_latest_release`
  UPDATE_AVAILABLE=""
  LAST_RAN=`date`

  if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
    UPDATE_AVAILABLE="\<a href='https\:\/\/github.com\/maddox\/pluto-for-channels\/releases\/tag\/$LATEST_VERSION'\>\<span class='tag is-warning'\\>UPDATE AVAILABLE\: $LATEST_VERSION\<\/span\>\<\/a\>"
  fi

  LINKED_TUNERS=""
  TUNER_COUNT=${TUNERS:-1}

  for i in $(seq 1 $TUNER_COUNT)
  do
    LINKED_TUNERS="$LINKED_TUNERS \<li\>\<a href='\/tuner-$i-playlist.m3u'\>Tuner $i Playlist\<\/a\>\<\/li\>"
  done

  sed -e "s/LAST_RAN/$LAST_RAN/g" \
  -e "s/LINKED_TUNERS/$LINKED_TUNERS/g" \
  -e "s/VERSION/$CURRENT_VERSION/g" \
  -e "s/UPDATE_AVAILABLE/$UPDATE_AVAILABLE/g" \
  index.html > "$NGINX_ROOT/index.html"

  mv *playlist.m3u "$NGINX_ROOT"
  mv *epg.xml "$NGINX_ROOT"
  echo "Last ran: $LAST_RAN"
  sleep 10800 # run every 3 hours
done
