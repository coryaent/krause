"use strict";

const getInput_ = require ('get-input');
/*
    add custom functionality and new error class
    for setting parameter values, e.g.
        }
            envKey: ['FOO', 'foo'],
            argvKey: ['-f', '--foo'],
            endMark: '--',
            priority: 'argv',
            required: 'foo error'
        }
        ... throws an error and
        {
            envKey: ['BAR', 'bar'],
            argvKey: ['-b', '--bar'],
            defaultValue: 'I\'m here',
            endMark: '--',
            priority: 'argv',
        }
        ... proceceeds without error.

*/
function getInput (param) {
    let i = getInput_ (param);
    if (i) return i;
    else if (param.required)
        throw new InputError (param.required);
        else 
        return undefined;
}

class InputError extends Error {
    constructor (message) {
        super (message);
        this.name = 'InputError';
    }
}

module.exports = {
    get masterNetwork () {
        return getInput ({
            envKey: ['KEYDB_MASTER_NETWORK'],
            argvKey: ['-keydb-master-network', '--keydb-master-network'],
            endMark: '--',
            priority: 'argv',
            required: 'Docker network over which KeyDB instances will\
            communicate, in CIDR nodation.'
        })
    },
};