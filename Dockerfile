FROM node:22.14.0-slim

ARG BUILD_DATE
ARG APP_VERSION

LABEL org.opencontainers.image.authors='Martin Reinhardt (martin@m13t.de)' \
    org.opencontainers.image.created=$BUILD_DATE \
    org.opencontainers.image.version=$APP_VERSION \
    org.opencontainers.image.url='https://hub.docker.com/r/continuoussecuritytooling/ajv-cli' \
    org.opencontainers.image.documentation='https://github.com/ContinuousSecurityTooling/ajv-cli' \
    org.opencontainers.image.source='https://github.com/ContinuousSecurityTooling/ajv-cli.git' \
    org.opencontainers.image.licenses='MIT'

COPY dist/ docker_entrypoint.sh package-lock.json package.json /app

WORKDIR /app

RUN npm install --omit=dev &&\
    npm install -g ajv-formats &&\
    chown -R 1000:2000 /app

# apt update
RUN apt-get update && apt-get -y upgrade &&\
  # clean up to slim image
  apt-get clean autoclean && apt-get autoremove --yes && rm -rf /var/lib/{apt,dpkg,cache,log}/

USER 1000

ENTRYPOINT ["/app/docker_entrypoint.sh"]
