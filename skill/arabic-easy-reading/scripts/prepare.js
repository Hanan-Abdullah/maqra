// prepare.js — checks and numbers the text before analysis.
// Usage: node scripts/prepare.js input.txt
// Exit 0: prints the numbered text. Exit 2: prints "REJECTED: <Arabic message>".
'use strict';
const fs = require('fs');
const Segmenter = require('./segmenter.js');
const Meta = require('./meta.js');
// No upper limit on length (the developer's decision, 15 Oct 2026). Very long texts may make the
// analysis too long for one reply: test long texts and set a limit here if they fail.
const MAX_WORDS = Infinity;

const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/prepare.js input.txt'); process.exit(1); }
const text = fs.readFileSync(file, 'utf8');
const problem = Segmenter.check(text, { maxWords: MAX_WORDS });
if (problem) { console.log('REJECTED: ' + problem); process.exit(2); }
const seg = Segmenter.segment(text, { maxWords: MAX_WORDS });
if (!Meta.read(file).startedAt) Meta.update(file, { startedAt: Date.now() });
const s = seg.stats;
console.log(`OK — ${seg.version} — ${seg.wordCount} words — headings ${s.headings}, paragraphs ${s.paragraphs}, sentences ${s.sentences}, lists ${s.lists}, list items ${s.listItems}`);
console.log('----- NUMBERED TEXT -----');
console.log(Segmenter.toTagged(seg));
