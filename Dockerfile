FROM jonmaddox/alpine-nginx-nodejs-plus:latest

ARG pluto_iptv_sha=954c9e1c5214986aa1dc95633ddad2071b8f87de

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
