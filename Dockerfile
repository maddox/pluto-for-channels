FROM hoosin/alpine-nginx-nodejs:latest

WORKDIR /usr/src/app
ADD entrypoint.sh /usr/src/app/entrypoint.sh
ADD index.html /usr/src/app/index.html

RUN wget https://github.com/maddox/PlutoIPTV/archive/channels.zip
RUN unzip -j channels.zip
RUN rm channels.zip
RUN yarn

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
