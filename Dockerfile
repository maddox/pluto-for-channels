FROM nginx:1.18-alpine
LABEL maintainer="Jon Maddox <jon@jonmaddox.com>"

# Install nvm with node and npm
RUN apk add --no-cache libuv \
    && apk add --no-cache --update-cache nodejs-current npm \
    && apk add --no-cache --update-cache yarn \
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
RUN yarn --production --no-progress

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
