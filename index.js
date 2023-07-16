-"use strict";

/*
    PRE-REQUISITES
*/
const { execFileSync, spawn } = require ('child_process');
const connect = require ('socket-retry-connect').waitForSocket;
const log = require ('./logger.js');
const { networkInterfaces } = require ('os');
const dns = require('node:dns').promises;
const Redis = require ('ioredis');
const net = require ('net');

log.info (`argv: ${process.argv}`);
log.debug ('Debugging enabled');

/*
    REQUIREMENTS
*/
var KeyDB, client, discovery, redis = null;

process.on ('SIGINT', () => {
    log.warn ('SIGINT ignored, use SIGTERM to exit.');
});

process.on ('SIGTERM', () => {
    if (KeyDB) KeyDB.kill ();
    if (client) client.end ();
    if (discovery) clearInterval (discovery);
    if (redis) redis.disconnect ();
});

log.debug ('process.argv:', process.argv);
log.debug ('Parsing arguments');
const argv = require ('./argv.js');
log.debug ('argv:', argv);

/*
    MAIN
*/
// populate an array of local ipv4 addresses
const interfaces = networkInterfaces ();
const ipAddresses = [];
for (let device of Object.keys (interfaces)) {
    for (let iface of interfaces[device]) {
        if (iface.family === 'IPv4') {
            ipAddresses.push (iface.address);
        }
    }
}
log.debug (`Internal IP addresses ${ipAddresses}`);

// docker swarm endpoint for resolution
const endpoint = 'tasks.' + process.env.SERVICE_NAME + '.';
// automatic discovery
function discover () {
    log.debug ('Hitting endpoint ' + endpoint + ' ...');
    dns.resolve (endpoint).then (async function main (discovered) {
        log.debug (`Got tasks ${discovered}`);
        // get existing peers
        log.debug ('Checking role...');
        let role = await redis.role ();
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
        for (let task of discovered) {
            if (client && !ipAddresses.includes (task) && !peers.includes (task)) {
                log.info (`Setting REPLICAOF ${task} 6379`);
                client.write (`REPLICAOF ${task} 6379\n`);
            }
        }
        // remove old peers
        for (let peer of peers) {
            if (client && !discovered.includes (peer)) {
                log.info (`Removing REPLICAOF ${peer}`);
                client.write (`REPLICAOF REMOVE ${peer} 6379\n`);
            }
        }
    }).catch ((error) => {
        // do not throw if 0 tasks are discovered
        if (error.code != 'ENOTFOUND') {
            throw error;
        }
    });
}

// server instance
log.info (`Creating data directory and changing ownership...`);
execFileSync ('datamkown');
log.info ('Spawning KeyDB server...');
KeyDB = spawn ('keydb-server', [
    '--bind', '0.0.0.0', 
    '--active-replica', 'yes',
    '--multi-master', 'yes',
    '--protected-mode', 'no',
    '--databases', argv.databases,
    '--dir', '/data',
    '--port', '6379'
], { stdio: ['ignore', 'inherit', 'inherit'] });

// client
log.info ('Connecting as KeyDB client...');
connect ({
    // options
    tries: Infinity,
    port: 6379
}, // callback
    function connectCallback (error, connection) {
        if (error) throw new Error;
        log.info ('KeyDB client connected.');
        client = connection;
        redis = new Redis ();
        discovery = setInterval (discover, argv.interval);

        // log KeyDB output to stdout
        client.on ('data', (datum) => {
            console.log (datum.toString ());
        });
    }
)
