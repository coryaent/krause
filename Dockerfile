# KeyDB
FROM debian:bullseye AS keydb-compiler

WORKDIR /usr/local/src

COPY ./datamkown.c ./

RUN VERSION="6.2.0" && \
	apt-get update && apt-get install -y \
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
	apt-get clean && \
	rm -rf /var/lib/apt/lists/* && \
	gcc datamkown.c -o ./datamkown && chmod ug+s ./datamkown && \
	wget "https://github.com/EQ-Alpha/KeyDB/archive/refs/tags/v${VERSION}.tar.gz" && \
	tar xvf "v${VERSION}.tar.gz" && \
	cd "KeyDB-${VERSION}" && \
	make BUILD_TLS=yes && \
	cp src/keydb-* /usr/local/bin/

# Node.js
# FROM node:lts-buster AS keydb-multi-master-bundler

# WORKDIR /opt

# COPY package*.json ./
# COPY . .

# RUN npm install && \
#     npm install --global pkg && \
#     pkg index.js -o ./keydb-multi-master


#####################
# primary container #
#####################
# FROM debian:buster-slim
FROM node:12-bullseye-slim

WORKDIR /usr/local/src

EXPOSE 6379/tcp
EXPOSE 6379/udp

STOPSIGNAL SIGTERM

COPY --from=keydb-compiler /usr/local/bin/keydb-server /usr/local/bin/keydb-server
COPY --from=keydb-compiler /usr/local/bin/keydb-cli /usr/local/bin/keydb-cli
COPY --from=keydb-compiler /usr/local/src/datamkown /usr/local/bin/datamkown

# COPY --from=keydb-multi-master-bundler /opt/keydb-multi-master /usr/local/bin/keydb-multi-master
COPY . .

RUN	apt-get update && apt-get install -y libcurl4 libatomic1 dnsutils && \
	npm install

ENTRYPOINT node ./index.js
