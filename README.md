# Krause

[![Docker image size](https://img.shields.io/docker/image-size/coryaent/krause?style=flat-square)](https://hub.docker.com/r/coryaent/krause)

Krause allows one to easily setup an eventually consistent, highly available, Redis-compatible datastore. It is suitable as a cache or message broker.

## Overview
[KeyDB](https://keydb.dev/) is a fork of [Redis](https://redis.io/) which strives to maintain 100% [compatibility](https://docs.keydb.dev/docs/compatibility/) with the Redis wire protocol. Krause is a wrapper which assists with running KeyDB on multiple nodes within Docker Swarm by adding automatic discovery to KeyDB.

Krause enables automatic discovery by querying Swarm's DNS server for a lookup of ```tasks.<service-name>.``` 

## Example
```bash
docker network create --opt encrypted --driver overlay --attachable keydb
```
```yaml
version: '3.8'

services:
  master: 
    image: coryaent/krause
    environment:
      - SERVICE_NAME={{.Service.Name}}  
    networks:
      - keydb
    deploy:
      replicas: 6
      placement:
        max_replicas_per_node: 1

networks:
  keydb:
    external: true
```
