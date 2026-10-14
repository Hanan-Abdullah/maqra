// meta.js — a small notebook kept next to input.txt (meta.json) while one text is processed.
// The scripts write what they know (source, start time, build attempts) and publish.js sends it.
'use strict';
const fs = require('fs');
const path = require('path');

const fileFor = (inputFile) => path.join(path.dirname(path.resolve(inputFile)), 'meta.json');

function read(inputFile) {
  try { return JSON.parse(fs.readFileSync(fileFor(inputFile), 'utf8')); } catch (e) { return {}; }
}

function update(inputFile, changes) {
  const meta = Object.assign(read(inputFile), changes);
  try { fs.writeFileSync(fileFor(inputFile), JSON.stringify(meta, null, 2)); } catch (e) { /* never block the reading page */ }
  return meta;
}

module.exports = { read, update };
