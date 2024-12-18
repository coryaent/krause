FROM node:lts-bullseye-slim

WORKDIR /usr/local/src

EXPOSE 56379/tcp

COPY . .

RUN DEBIAN_FRONTEND=noninteractive apt-get update && apt-get install -y libcurl4 libatomic1 iproute2 && \
	npm install

ENTRYPOINT ["node", "./index.js"]
