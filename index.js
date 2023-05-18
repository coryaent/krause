"use strict";

/*
    PRE-REQUISITES
*/
const { execFileSync, spawn } = require ('child_process');
const connect = require ('socket-retry-connect').waitForSocket;
const log = require ('./logger.js');
const { networkInterfaces } = require ('os');
const dns = require('node:dns').promises;

log.info (`argv: ${process.argv}`);
log.debug ('Debugging enabled');

/*
    REQUIREMENTS
*/
var KeyDB, client, discovery = null;

process.on ('SIGINT', () => {
    log.warn ('SIGINT ignored, use SIGTERM to exit.');
});

process.on ('SIGTERM', () => {
    if (KeyDB) KeyDB.kill ();
    if (client) client.close ();
    if (discovery) clearInterval (discovery);
});

log.debug ('process.argv:', process.argv);
log.debug ('Parsing arguments');
const argv = require ('minimist') (process.argv.slice (2), {
    default: {
        port: 6379,
        interval: 10000,
        databases: 16
    }
});
log.debug ('argv:', argv);

/*
    MAIN
*/
// populate a set ofipv4 addresses
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
    dns.resolve (endpoint).then (function main (discovered) {
        // sort for consistency (discovered should be the same on all hosts)
        discovered.sort ();
        log.debug (`Got tasks ${discovered}`);
        // cycle through each host IP
        for (let ip of ipAddresses) {
            // let i be the index in discovered of the host IP
            let i = discovered.indexOf (ip)
            // if the index of the host IP cannot be found i will be -1
            if (i >= 0) {
                // let next be the next index after the index of the host IP
                let next = i + 1;
                // if next is beyond the bounds of the array
                    if (next === discovered.length) {
                        // the next index is the first member of the array
                        next = 0;
                    }
                // next is an ip string
                log.debug (`next IP: ${discovered[next]}`);
                // if client is connected
                if (client) {
                    log.info (`Setting REPLICAOF ${discovered[next]} ${argv.port}`); 
                    client.write (`REPLICAOF ${discovered[next]} ${argv.port}\n`);
                }
            }
        }
    });
}
discovery = setInterval (discover, argv.interval);

// server instance
log.info (`Creating data directory and changing ownership...`);
execFileSync ('datamkown');
log.info ('Spawning KeyDB server...');
KeyDB = spawn ('keydb-server', [
    '--bind', '0.0.0.0', 
    '--active-replica', 'yes',
    '--protected-mode', 'no',
    '--databases', argv.databases,
    '--dir', '/data',
    '--port', argv.port
], { stdio: ['ignore', 'inherit', 'inherit'] });

// client
log.info ('Connecting as KeyDB client...');
connect ({
    // options
    tries: Infinity,
    port: argv.port
}, // callback
    function connectCallback (error, connection) {
        if (error) throw new Error;
        log.info ('KeyDB client connected.');
        client = connection;

        // log KeyDB output to stdout
        client.on ('data', (datum) => {
            console.log (datum.toString ());
        });
    }
)
