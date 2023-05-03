# Keyes

[![Docker image size](https://img.shields.io/docker/image-size/stevecorya/keyes?style=flat-square)](https://hub.docker.com/r/stevecorya/keyes)

Keyes allows one to easily setup an eventually consistent, highly available, Redis-compatible datastore.

## Overview
[KeyDB](https://keydb.dev/) is a fork of [Redis](https://redis.io/) which strives to maintain 100% compatibility with the Redis wire protocol. Keyes is a script which assists with running KeyDB on multiple nodes within Docker Swarm by adding automatic discovery to KeyDB.

Keyes enables automatic discovery by querying Swarm's DNS server for a lookup of ```tasks.<service-name>.``` 

In terms of CAP theorem, keyes is available and partition tolerant. It is not gaurenteed to be consistent.

## Example
```yaml
version: '3.8'

services:
  master: 
    image: stevecorya/keyes
    environment:
      - SERVICE_NAME={{.Service.Name}}  
    networks:
      - keydb
    deploy:
      mode: global

networks:
  keydb:
    external: true
```
