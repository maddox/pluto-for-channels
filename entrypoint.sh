#!/bin/sh

cd /usr/src/app

nginx

NGINX_ROOT=/usr/share/nginx/html

while :
do
  node index.js $START_CHANNEL_NUMBER
  LAST_RAN=date
  sed "s/XXX/$($LAST_RAN)/g" index.html > "$NGINX_ROOT/index.html"
  mv playlist.m3u "$NGINX_ROOT/playlist.m3u"
  mv epg.xml "$NGINX_ROOT/epg.xml"
  echo "Last ran: $($LAST_RAN)"
  sleep 10800 # run every 3 hours
done
