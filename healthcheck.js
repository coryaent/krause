const net = require('net');
const argv = require ('./argv.js');

var HOST = '127.0.0.1';
var PORT = argv.port;

var client = new net.Socket();
client.connect (PORT, HOST, async function sendCommand () {
    await client.write (`ROLE\n`);
});

// Add a 'data' event handler for the client socket
// data is what the server sent to this socket
client.on ('data', function parseData (data) {
  // console.log(data.toString ());
    let response = data.toString ();
    let resArray = response.split (`\r\n`);
    if (resArray.includes ('connected')) {
        process.exitCode = 0;
    } else {
        process.exitCode = 1;
    }
    client.end ();
});

// Add a 'close' event handler for the client socket
//client.on('close', function() {
//  console.log('Connection closed with exit code', process.exitCode);
//});

