"use strict";

module.exports = require ('minimist') (process.argv.slice (2), {
    default: {
        port: 6379,
        interval: 10000,
        databases: 16
    }
});
