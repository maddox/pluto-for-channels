FROM alpine:3.14 as builder

# Bring in the dependencies
RUN apk add --no-cache --update-cache alpine-sdk doas nginx libuv nodejs-current npm yarn 

# Add a user to build the APK
RUN adduser -D builduser && \
    addgroup builduser abuild

# Give the user permissions
RUN echo "permit keepenv :builduser" > /etc/doas.conf

# Switch to builduser
USER builduser
WORKDIR /home/builduser

# Setup abuild config
RUN mkdir -p ~/.abuild && \
    echo 'PACKAGER="Build User <build@example.com>"' > ~/.abuild/abuild.conf && \
    echo 'BUILDROOT=/var/cache/distfiles' >> ~/.abuild/abuild.conf

# Generate signing keypair (each build will be different)
RUN abuild-keygen -a -n

# Copy source 
COPY --chown=builduser:builduser apk/package /home/builduser/src/package
COPY --chown=builduser:builduser VERSION /home/builduser/src/package
COPY --chown=builduser:builduser index.html /home/builduser/src/package
COPY --chown=builduser:builduser entrypoint.sh /home/builduser/src/package
COPY --chown=builduser:builduser PlutoIPTV/* /home/builduser/src/package/PlutoIPTV/

# Build package
WORKDIR /home/builduser/src/package
RUN abuild -v -rF

FROM alpine:3.14

# Copy the built packages into /output inside this final image
COPY --from=builder /home/builduser/packages /output
COPY --from=builder /home/builduser/.abuild /output