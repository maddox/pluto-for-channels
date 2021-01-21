FROM nginx:1.18-alpine
LABEL maintainer="Jon Maddox <jon@jonmaddox.com>"

WORKDIR /usr/src/app
ADD VERSION /usr/src/app/VERSION
ADD entrypoint.sh /usr/src/app/entrypoint.sh
ADD index.html /usr/src/app/index.html
ADD PlutoIPTV/* /usr/src/app/

# Install nvm with node and npm
RUN apk add --no-cache --update-cache libuv nodejs-current npm yarn \
    && echo "NodeJS Version:" "$(node -v)" \
    && echo "NPM Version:" "$(npm -v)" \
    && echo "Yarn Version:" "$(yarn -v)" \
    && yarn --production --no-progress \
    && rm -rf /tmp/*

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
