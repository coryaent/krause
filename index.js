"use strict";

/*
    PRE-REQUISITES
*/
const { execFileSync, spawn } = require ('child_process');
const discover = require ('node-discover');
const net = require ('net');
const Input = require ('./input.js');
const ip = require ('ip');

/*
    REQUIREMENTS
*/
execFileSync ('datamkown');

process.on ('SIGINT', () => {
    console.warn ('SIGINT ignored, use SIGTERM to exit.');
});

process.on ('SIGTERM', () => {
    KeyDB.kill ();
    keydb.close ();
    Discovery.stop ();
});

/*
    MAIN
*/

// server
const KeyDB = spawn ('keydb-server', [
    '--bind', '0.0.0.0', 
    '--active-replica', 'yes',
    '--multi-master', 'yes',
    '--databases', '1',
    '--dir', '/data',
], { stdio: ['ignore', 'inherit', 'inherit'] });

// client
const keydb = net.connect ({
    port: 6379,
    host: 'localhost'
})
.on ('data', (datum) => {
    console.log (datum.toString ());
});

const Discovery = discover ({
    broadcast: ip.cidrSubnet (Input.masterNetwork).broadcastAddress,
    port: 6379,
    address: getMasterNetAdd ()
})
.on ('added', (peer) => {
    keydb.write (`REPLICAOF ${peer.address} ${peer.port}\n`);
});

/*
    AUXILIARY
*/
function getMasterNetAdd () {
    return require ('@emmsdan/network-address').v4.find ((address) => {
        return ip.cidrSubnet (Input.masterNetwork).contains (address);
    });
}