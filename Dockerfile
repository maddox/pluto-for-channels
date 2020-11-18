FROM hoosin/alpine-nginx-nodejs:latest

WORKDIR /usr/src/app
ADD entrypoint.sh /usr/src/app/entrypoint.sh
ADD index.html /usr/src/app/entrypoint.sh

RUN wget https://github.com/maddox/PlutoIPTV/archive/5c9bc933d7cdf299b60f4ed9e155a17d66bd3f28.zip
RUN unzip -j 5c9bc933d7cdf299b60f4ed9e155a17d66bd3f28.zip
RUN rm 5c9bc933d7cdf299b60f4ed9e155a17d66bd3f28.zip
RUN yarn

RUN ["chmod", "+x", "/usr/src/app/entrypoint.sh"]

ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
