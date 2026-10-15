// build.js — builds the Maqra design prototype (one page, three reading modes).
// Usage: node build.js <document.json> <out.html>
'use strict';
const fs = require('fs');
const path = require('path');

const [docFile, outFile] = process.argv.slice(2);
const doc = JSON.parse(fs.readFileSync(docFile, 'utf8'));
const tokens = fs.readFileSync(path.join(__dirname, 'tokens.css'), 'utf8');
const icons = JSON.parse(fs.readFileSync(path.join(__dirname, 'icons.json'), 'utf8'));
const tpl = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8');

const json = JSON.stringify(doc).replace(/</g, '\\u003c');
const html = tpl
  .replace('/*__FONTS__*/', () => fs.readFileSync(path.join(__dirname, 'fonts.css'), 'utf8'))
  .replace('/*__TOKENS__*/', () => tokens)
  .replace('/*__ICONS__*/', () => JSON.stringify(icons))
  .replace('/*__DOCUMENT__*/', () => json)
  .split('__LOGO__').join('data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'logo.png')).toString('base64'));
fs.writeFileSync(outFile, html);
console.log('Wrote ' + outFile);
