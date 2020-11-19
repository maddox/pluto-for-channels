FROM nginx:1.19-alpine
LABEL maintainer="Jon Maddox <jon@jonmaddox.com>"

# Install nvm with node and npm
RUN apk add --no-cache --repository http://nl.alpinelinux.org/alpine/edge/main libuv \
    && apk add --no-cache --update-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/main nodejs=12.19.0-r0 nodejs-npm=12.19.0-r0 \
    && apk add --no-cache --update-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/community yarn=1.22.10-r0 \
    && echo "NodeJS Version:" "$(node -v)" \
    && echo "NPM Version:" "$(npm -v)" \
    && echo "Yarn Version:" "$(yarn -v)"

ARG pluto_iptv_sha=954c9e1c5214986aa1dc95633ddad2071b8f87de

WORKDIR /usr/src/app
ADD entrypoint.sh /usr/src/app/entrypoint.sh
ADD index.html /usr/src/app/index.html

RUN wget https://github.com/maddox/PlutoIPTV/archive/$pluto_iptv_sha.zip
RUN unzip -j $pluto_iptv_sha.zip
RUN rm $pluto_iptv_sha.zip
RUN npm install

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
