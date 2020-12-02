FROM nginx:1.18-alpine
LABEL maintainer="Jon Maddox <jon@jonmaddox.com>"

# Install nvm with node and npm
RUN apk add --no-cache libuv \
    && apk add --no-cache --update-cache nodejs-current npm \
    && apk add --no-cache --update-cache yarn \
    && echo "NodeJS Version:" "$(node -v)" \
    && echo "NPM Version:" "$(npm -v)" \
    && echo "Yarn Version:" "$(yarn -v)"

WORKDIR /usr/src/app
ADD VERSION /usr/src/app/VERSION
ADD entrypoint.sh /usr/src/app/entrypoint.sh
ADD index.html /usr/src/app/index.html

ADD PlutoIPTV/* /usr/src/app/
RUN yarn --production --no-progress

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
