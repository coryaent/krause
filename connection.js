"use strict";

const net = require ('net');

const keydb = net.connect ({
    port: 6379,
    host: 'localhost'
})
.on ('data', (datum) => {
    console.log (datum.toString ());
});

keydb.write (`PING\n`);
