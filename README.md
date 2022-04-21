# Keyj

[![Codacy grade](https://img.shields.io/codacy/grade/62ddb4351baf4fff8c0aec3c9d71d969?style=flat-square)](https://app.codacy.com/gh/stevecorya/keyj/dashboard)
[![Libraries.io dependency status](https://img.shields.io/librariesio/github/stevecorya/keyj?style=flat-square)](https://libraries.io/github/stevecorya/keyj)
[![Docker image size](https://img.shields.io/docker/image-size/stevecorya/keyj?style=flat-square)](https://hub.docker.com/r/stevecorya/keyj)

Keyj /kidʒ/ allows one to easily setup an eventually consistent, highly available, Redis-compatible datastore.

## Overview
[KeyDB](https://keydb.dev/) is a fork of [Redis](https://redis.io/) which strives to maintain 100% compatibility with the Redis wire protocol. Keyj is a script which assists with running KeyDB on multiple nodes within Docker Swarm by adding automatic discovery to KeyDB.

Keyj enables automatic discovery by querying Swarm's DNS server for a lookup of ```tasks.<service-name>.``` 

## Example
```yaml
version: '3.8'

services:
  master: 
    image: stevecorya/keyj
    environment:
      - SERVICE_NAME={{.Service.Name}}  
    networks:
      - keydb
      - replication
    volumes:
      - data:/data
    deploy:
      mode: global

networks:
  keydb:
    external: true

volumes:
  data:
```
