// prepare.js — checks and numbers the text before analysis.
// Usage: node scripts/prepare.js input.txt
// Exit 0: prints the numbered text. Exit 2: prints "REJECTED: <Arabic message>".
'use strict';
const fs = require('fs');
const Segmenter = require('./segmenter.js');
const MAX_WORDS = 1500; // safe limit tested so far; raise after longer tests

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/prepare.js input.txt'); process.exit(1); }
const text = fs.readFileSync(file, 'utf8');
const problem = Segmenter.check(text, { maxWords: MAX_WORDS });
if (problem) { console.log('REJECTED: ' + problem); process.exit(2); }
const seg = Segmenter.segment(text, { maxWords: MAX_WORDS });
const s = seg.stats;
console.log(`OK — ${seg.version} — ${seg.wordCount} words — headings ${s.headings}, paragraphs ${s.paragraphs}, sentences ${s.sentences}, lists ${s.lists}, list items ${s.listItems}`);
console.log('----- NUMBERED TEXT -----');
console.log(Segmenter.toTagged(seg));
