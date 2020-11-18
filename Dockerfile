FROM hoosin/alpine-nginx-nodejs:latest

ARG pluto_iptv_sha=f969a8b3505f40eabebf49485394cd958ca1b74c

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
