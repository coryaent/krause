const argv = require ('./argv.js');
const log = require ('./logger.js');
const dns = require ('node:dns').promises;
const Redis = require ('ioredis');

log.debug ('Performing healthcheck');

dns.resolve (`tasks.${process.env.SERVICE_NAME}.`).then (async function pingRedis () {
    const redis = new Redis ();
    let result = await redis.ping ();
    if (result != 'PONG') {
        log.debug ('healthcheck could not ping keydb server');
        process.exitCode = 1;
    } else {
        log.debug ('healthcheck successfully pinged keydb server');
    }
    log.debug ('healthcheck closing keydb client connection');
    await redis.disconnect ();
    log.debug ('healthcheck keydb client closed');
})
.catch (async function handleError (error) {
    if (error.code == 'ENOTFOUND') {
        log.debug ('healthcheck found no tasks, cluster is bootstrapping');
    } else {
        throw error;
    }
});
