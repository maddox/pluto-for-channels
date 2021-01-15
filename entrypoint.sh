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
  node index.js $VERSIONS

  CURRENT_VERSION=`cat VERSION`
  LATEST_VERSION=`get_latest_release`
  UPDATE_AVAILABLE=""
  LAST_RAN=`date`  
  
  if [ "$CURRENT_VERSION" != "$LATEST_VERSION" ]; then
    UPDATE_AVAILABLE="\<a href='https\:\/\/github.com\/maddox\/pluto-for-channels\/releases\/tag\/$LATEST_VERSION'\>\<span class='tag is-warning'\\>UPDATE AVAILABLE\: $LATEST_VERSION\<\/span\>\<\/a\>"
  fi
  
  LINKED_VERSIONS=""
  
  for i in $(echo $VERSIONS | sed "s/,/ /g")
  do
    LINKED_VERSIONS="$LINKED_VERSIONS \<ul\>\<li\>\<a href='\/$i-playlist.m3u'\>$i Playlist\<\/a\>\<\/li\>\<li\>\<a href='\/$i-epg.xml'\>$i EPG\<\/a\>\<\/li\>\<\/ul\>"
  done
  
  echo $LINKED_VERSIONS
  
  sed -e "s/LAST_RAN/$LAST_RAN/g" \
  -e "s/LINKED_VERSIONS/$LINKED_VERSIONS/g" \
  -e "s/VERSION/$CURRENT_VERSION/g" \
  -e "s/UPDATE_AVAILABLE/$UPDATE_AVAILABLE/g" \
  index.html > "$NGINX_ROOT/index.html"

  mv playlist.m3u "$NGINX_ROOT/playlist.m3u"
  mv epg.xml "$NGINX_ROOT/epg.xml"
  echo "Last ran: $LAST_RAN"
  sleep 10800 # run every 3 hours
done
