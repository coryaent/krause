"use strict";

const DateFormat = require ('fast-date-format');
const dateFormat = new DateFormat ('YYYY[-]MM[-]DD HH[:]mm[:]ss');

module.exports = require ('console-log-level') ({
    prefix: function (level) {
        return `[KDBMM] ${dateFormat.format (new Date ())} [${level.toUpperCase ()}]`
    },
});