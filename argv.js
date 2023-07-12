"use strict";

module.exports = require ('minimist') (process.argv.slice (2), {
    default: {
        interval: 10000,
        databases: 16
    }
});
