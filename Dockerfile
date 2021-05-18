# KeyDB
FROM debian:buster AS keydb-compiler

WORKDIR /usr/local/src

COPY ./datamkown.c ./

RUN apt-get update && apt-get install -y \
	build-essential \
	nasm \
	autotools-dev \
	autoconf \
	libjemalloc-dev \
	tcl tcl-dev \
	uuid-dev \
	libssl-dev \
	libcurl4-openssl-dev \
	wget && \
	gcc datamkown.c -o ./datamkown && chmod ug+s ./datamkown && \
	VERSION="6.0.16" && \
	wget "https://github.com/EQ-Alpha/KeyDB/archive/refs/tags/v${VERSION}.tar.gz" && \
	tar xvf "v${VERSION}.tar.gz" && \
	cd "KeyDB-${VERSION}" && \
	make BUILD_TLS=yes && \
	cp src/keydb-* /usr/local/bin/

# Node.js
FROM node:lts-buster AS keydb-multi-master-bundler

WORKDIR /opt

COPY package*.json ./
COPY . .

RUN npm install && \
    npm install --global pkg && \
    pkg index.js -o ./keydb-multi-master


#####################
# primary container #
#####################
FROM debian:buster-slim

EXPOSE 6379
EXPOSE 6379/udp

COPY --from=keydb-compiler /usr/local/bin/keydb-server /usr/local/bin/keydb-server
COPY --from=keydb-multi-master-bundler /opt/keydb-multi-master /usr/local/bin/keydb-multi-master

STOPSIGNAL SIGTERM

ENTRYPOINT keydb-multi-master