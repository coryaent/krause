"use strict";

/*
    PRE-REQUISITES
*/
const { execFileSync, spawn } = require ('child_process');
const connect = require ('wait-for-socket').waitForSocket;
const discover = require ('node-discover');
const ip = require ('ip');
const Input = require ('./input.js');
const log = require ('./logger.js');

/*
    REQUIREMENTS
*/
const port = 6379;

execFileSync ('datamkown');

process.on ('SIGINT', () => {
    console.warn ('SIGINT ignored, use SIGTERM to exit.');
});

process.on ('SIGTERM', () => {
    if (KeyDB) KeyDB.kill ();
    if (keydb) keydb.close ();
    if (Discovery) Discovery.stop ();
});

/*
    MAIN
*/
var KeyDB, keydb, Discovery = null;

// server
log.info ('Spawning KeyDB server...');
KeyDB = spawn ('keydb-server', [
    '--bind', '0.0.0.0', 
    '--active-replica', 'yes',
    '--multi-master', 'yes',
    '--databases', '1',
    '--dir', '/data',
], { stdio: ['ignore', 'inherit', 'inherit'] });

// client
log.info ('Connecting as KeyDB client...');
connect ({
    // options
    tries: Infinity,
    port
}, 
    // callback
    function start (error, connection) {
        if (error) throw new Error;
        log.info ('KeyDB client connected.');
        keydb = connection;

        // client instance
        keydb.on ('data', (datum) => {
            console.log (datum.toString ());
        });

        // automatic discovery
        const broadcast = ip.cidrSubnet (Input.masterNetwork).broadcastAddress;
        const address = getMasterNetAdd ();
        log.info (`Starting automatic discovery broadcasting to ${broadcast} from ${address}...`);
        Discovery = discover ({
            // options
            broadcast,
            port,
            address
        },
            // callback
            (error) => {
                if (error) throw new Error;
                log.info ('Automatic discovery started successfully.');
            }
        )
        .on ('added', (peer) => {
            log.info (`Found peer at ${peer.address}.`);
            const cmd = `REPLICAOF ${peer.address} ${peer.port}`;
            log.info (`Setting ${cmd}...`);
            keydb.write (cmd + '\n');
        });
    }
)

/*
    AUXILIARY
*/
function getMasterNetAdd () {
    return require ('@emmsdan/network-address').v4.find ((address) => {
        return ip.cidrSubnet (Input.masterNetwork).contains (address);
    });
}