-"use strict";

/*
    PRE-REQUISITES
*/
const log = require ('./logger.js');
const dns = require('node:dns').promises;
const Redis = require ('ioredis');
const net = require ('node:net');

/*
    REQUIREMENTS
*/
var keydb, discovery = null;

keydb = new Redis (process.env.KRAUSE_KEYDB_SOCKET);
keydb.once ('connect', () => {
    discovery = setInterval (discover, process.env.KRAUSE_DISCOVERY_INTERVAL);
})

process.on ('SIGTERM', () => {
    if (keydb) keydb.disconnect ();
    if (discovery) clearInterval (discovery);
});

// docker swarm endpoint for resolution
const endpoint = 'tasks.' + process.env.KRAUSE_KEYDB_SERVICE + '.';
// automatic discovery
function discover () {
    log.debug ('Hitting endpoint ' + endpoint + ' ...');
    dns.resolve (endpoint).then (async function main (discovered) {
        log.debug (`Got tasks ${discovered}`);
        // get existing peers
        log.debug ('Checking role...');
        let role = await keydb.role ();
        let peers = [];
        for (let peer of role) {
            // role returns an array of arrays where
            // index 1 of the subarray is the IP
            if (net.isIPv4 (peer[1])) {
                peers.push (peer[1]);
            }
        }
        log.debug (`Got peers ${peers}`);
        // add new tasks
        for (let taskAddress of discovered) {
            log.info (`Setting REPLICAOF ${taskAddress} ${process.env.KRAUSE_KEYDB_PORT}`);
            keydb.replicaof (taskAddress, process.env.KRAUSE_KEYDB_PORT);
        }
        // remove old peers
        for (let peer of peers) {
            if (!discovered.includes (peer)) {
                log.info (`Removing REPLICAOF ${peer} ${process.env.KRAUSE_KEYDB_PORT}`);
                keydb.replicaof ('REMOVE', peer, process.end.KRAUSE_KEYDB_PORT);
            }
        }
    }).catch ((error) => {
        // do not throw if 0 tasks are discovered
        if (error.code != 'ENOTFOUND') {
            throw error;
        }
    });
}
