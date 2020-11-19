FROM hoosin/alpine-nginx-nodejs:latest

ARG pluto_iptv_sha=f64d17e6021d20f60700b61530c93a60ac0aba0e

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
