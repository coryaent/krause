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

// get ip tasks from domain
const endpoint = 'tasks.' + process.env.SERVICE_NAME + '.';
// automatic discovery
(function discover () {
    log.debug ('Hitting endpoint ' + endpoint + ' ...');
    dns.lookup (endpoint).then (async function main (discovered) {
        // found tasks
        const tasks = discovered;
        log.debug (`Got tasks ${tasks}`);
        for (let task of tasks) {
            // contrast peers and tasks
            if (!ipAddresses.includes (task) && !peers.has (task)) {
                log.info (`Found new peer at ${task}, adding to peer set`);
                peers.add (task);
                // only run if we already connected to KeyDB socket
                if (client) {
                    log.info (`Adding REPLICAOF for peer ${task}...`);
                    await client.write (`REPLICAOF ${task} ${argv.port}\n`);
                    log.info (`Peer at ${task} successfully added as a replica, data may still be transferring.`);
                }
            }
        }
        // cleanup lost peers
        for (let peer of peers ) {
            if (!tasks.includes (peer)) {
                log.warn (`Peer at ${peer} lost, removing from peer set`);
                peers.delete (peer);
                if (client) {
                    log.info (`Removing REPCILAOF for peer ${peer}...`);
                    await client.write (`REPLICAOF REMOVE ${peer} ${argv.port}\n`);
                }
            }
        };
        log.debug (`Found ${peers.size} peer(s)`);
    });
    discovery = setInterval (discover, argv.interval);
}) ();

// server instance
log.info (`Creating data directory and changing ownership...`);
execFileSync ('datamkown');
log.info ('Spawning KeyDB server...');
KeyDB = spawn ('keydb-server', [
    '--bind', '0.0.0.0', 
    '--active-replica', 'yes',
    '--replica-read-only', 'no',
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
