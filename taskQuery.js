"use strict";

const dig = require ('node-dig-dns');

(async () => {
    const tasks = (await dig (['amazon.com']))['answer'].map (a => a['value']);
    console.log (tasks);
}) ()