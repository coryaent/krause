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



#####################
# primary container #
#####################
FROM node:lts-bullseye-slim

WORKDIR /usr/local/src

EXPOSE 6379/tcp

STOPSIGNAL SIGTERM

COPY --from=keydb-compiler /usr/local/bin/keydb-server /usr/local/bin/keydb-server
COPY --from=keydb-compiler /usr/local/bin/keydb-cli /usr/local/bin/keydb-cli
COPY --from=keydb-compiler /usr/local/src/datamkown /usr/local/bin/datamkown

COPY . .

RUN apt-get update && apt-get install -y libcurl4 libatomic1 dnsutils && \
	npm install

ENTRYPOINT node ./index.js
