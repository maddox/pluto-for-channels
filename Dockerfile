FROM hoosin/alpine-nginx-nodejs:latest

ARG pluto_iptv_sha=5c9bc933d7cdf299b60f4ed9e155a17d66bd3f28

WORKDIR /usr/src/app
ADD entrypoint.sh /usr/src/app/entrypoint.sh
ADD index.html /usr/src/app/index.html

RUN wget https://github.com/maddox/PlutoIPTV/archive/$pluto_iptv_sha.zip
RUN ls -al
RUN unzip -j $pluto_iptv_sha.zip
RUN rm $pluto_iptv_sha.zip
RUN ls -al
RUN yarn

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
