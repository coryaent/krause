# Krause

[![Docker image size](https://img.shields.io/docker/image-size/coryaent/krause?style=flat-square)](https://hub.docker.com/r/coryaent/krause)
![CodeFactor Grade](https://img.shields.io/codefactor/grade/github/coryaent/krause?style=flat-square)

Krause allows one to easily setup an eventually consistent, highly available, Redis-compatible datastore. It is suitable as a cache or message broker.

## Overview
[KeyDB](https://keydb.dev/) is a fork of [Redis](https://redis.io/) which strives to maintain 100% [compatibility](https://docs.keydb.dev/docs/compatibility/) with the Redis wire protocol. Krause is a wrapper which assists with running KeyDB on multiple nodes within Docker Swarm by adding automatic discovery to KeyDB.

Krause enables automatic discovery by querying Swarm's DNS server for a lookup of ```tasks.<service-name>.``` 

## Example
```yaml
version: '3.8'

x-socket: &socket
  image: alpine/socat
  volumes:
    - /opt/swarm/sockets:/opt/swarm/sockets/
  networks:
    - public
  deploy:
    mode: global
    placement:
      constraints:
        - "node.role == worker"
    resources:
      limits:
        memory: 32M

services:
  discovery:
    image: coryaent/krause
    environment:
      KRAUSE_KEYDB_SERVICE: '{{index .Service.Labels "com.docker.stack.namespace"}}_master'
      KRAUSE_KEYDB_PORT: 56379
      KRAUSE_KEYDB_SOCKET: /opt/swarm/sockets/keydb.sock
      KRAUSE_DISCOVERY_INTERVAL: 5000
    volumes:
      - /opt/swarm/sockets:/opt/swarm/sockets/
    deploy:
      mode: global
      placement:
        constraints:
          - "node.role == worker"

  master:
    image: eqalpha/keydb
    command: >
      keydb-server
      --bind 0.0.0.0
      --unixsocket /opt/swarm/sockets/keydb.sock
      --active-replica yes
      --multi-master yes
      --protected-mode no
      --dir /data
      --port 56379
    volumes:
      - /opt/swarm/sockets:/opt/swarm/sockets/
      - data:/data
    networks:
      - internal
    deploy:
      mode: global
      placement:
        constraints:
          - "node.role == worker"

  localhost:
    command: "-d TCP-L:46379,fork,bind=localhost UNIX:/opt/swarm/sockets/keydb.sock"
    <<: *socket

  gateway:
    extra_hosts:
      - "host.docker.internal:host-gateway"
    command: "-d TCP-L:46379,fork,bind=host.docker.internal UNIX:/opt/swarm/sockets/keydb.sock"
    <<: *socket

volumes:
  data:
    driver: local

networks:
  internal:
    attachable: true
    driver: overlay
    driver_opts:
      encrypted: "true"
    name: keydb
    ipam:
      driver: default
      config:
        - subnet: "10.225.0.0/16"
```
