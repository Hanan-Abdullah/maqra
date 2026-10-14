// build.js — validates Claude's analysis against the text and builds the reading page.
// Usage: node scripts/build.js input.txt analysis.json output-folder
// Exit 0: writes reading-page.html and document.json. Exit 1: prints the errors to fix.
'use strict';
const fs = require('fs'), path = require('path');
const Merger = require('./merge.js');
const Meta = require('./meta.js');

const [textFile, analysisFile, outDir] = process.argv.slice(2);
if (!textFile || !analysisFile || !outDir) { console.error('Usage: node scripts/build.js input.txt analysis.json output-folder'); process.exit(1); }

Meta.update(textFile, { buildAttempts: (Meta.read(textFile).buildAttempts || 0) + 1 });

let raw = fs.readFileSync(analysisFile, 'utf8');
const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
if (fence) raw = fence[1];
let analysis;
try { analysis = JSON.parse(raw); }
catch (e) { console.log('ERROR: analysis.json is not valid JSON — ' + e.message); process.exit(1); }

const res = Merger.merge(fs.readFileSync(textFile, 'utf8'), analysis);
res.warnings.forEach(w => console.log('WARNING: ' + w));
if (res.errors.length) { res.errors.forEach(e => console.log('ERROR: ' + e)); process.exit(1); }

const doc = res.document;
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'document.json'), JSON.stringify(doc, null, 2));
const tpl = fs.readFileSync(path.join(__dirname, '..', 'templates', 'reading-page.html'), 'utf8');
const json = JSON.stringify(doc).replace(/</g, '\\u003c');
fs.writeFileSync(path.join(outDir, 'reading-page.html'), tpl.replace('/*__DOCUMENT__*/', () => json));

const imp = Object.values(doc.analysis.importance);
const pct = l => Math.round(100 * imp.filter(x => x === l).length / imp.length);
console.log(`OK — units ${doc.analysis.readingUnits.length}, key points ${doc.analysis.keyPoints.length}, terms ${doc.analysis.terms.length}, questions ${doc.analysis.readingUnits.filter(u => u.question).length}, importance primary ${pct('primary')}% supporting ${pct('supporting')}% secondary ${pct('secondary')}%`);
console.log('Wrote ' + path.join(outDir, 'reading-page.html') + ' and ' + path.join(outDir, 'document.json'));
