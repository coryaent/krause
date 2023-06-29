"use strict";

module.exports = require ('minimist') (process.argv.slice (2), {
    default: {
        interval: 1000,
        databases: 16
    }
});
