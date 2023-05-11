"use strict";

/*
    PRE-REQUISITES
*/
const { execFileSync, spawn } = require ('child_process');
const connect = require ('socket-retry-connect').waitForSocket;
const dig = require ('node-dig-dns');
const log = require ('./logger.js');
const { networkInterfaces } = require ('os');

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
    interval: 10000
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

// get tasks/peers
// task is another process discovered by docker swarm
// peers is a set of tasks without this instance's IP's
const peers = new Set ();
// get ip tasks from domain
const question = 'tasks.' + process.env.SERVICE_NAME + '.';
// automatic discovery
(function discover () {
    dig([question]).then (async function main (discovered) {
        // add peers from found tasks
        const tasks = discovered['answer'].map (a => a['value']);
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
    })
    .catch((error) => {
        log.error (error);
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
    '--multi-master', 'yes',
    '--databases', '1',
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
    function afterConnection (error, connection) {
        if (error) throw new Error;
        log.info ('KeyDB client connected.');
        client = connection;

        // log KeyDB output to stdout
        client.on ('data', (datum) => {
            console.log (datum.toString ());
        });
    }
)
