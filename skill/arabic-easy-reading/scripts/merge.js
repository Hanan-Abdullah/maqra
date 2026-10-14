/**
 * merge.js — builds the final document JSON from:
 *   1) the original text  (segmented here with segmenter.js)
 *   2) Claude's analysis JSON (codes only, no copied text)
 * and validates every code and term form against the segmented text.
 *
 * Usage: node merge.js original.txt analysis.json > document.json
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./segmenter.js'));
  else root.Merger = factory(root.Segmenter);
})(typeof self !== 'undefined' ? self : this, function (Segmenter) {
'use strict';

const SCHEMA_VERSION = '1';
const LEVELS = ['primary', 'supporting', 'secondary'];
const SHORT_TEXT_SENTENCES = 8; // below this, the page hides importance colouring
const SHORT_UNIT_WORDS = 80;     // below this, the page hides the unit summary (the text is shorter than worth summarising)

function indexText(seg) {
  const units = {};      // sentence / list-item id -> { text, block }
  const blockOrder = []; // block ids in document order
  seg.blocks.forEach(b => {
    blockOrder.push(b.id);
    (b.sentences || []).forEach(s => { units[s.id] = { text: s.text, block: b.id }; });
    (b.items || []).forEach(i => { units[i.id] = { text: i.text, block: b.id }; });
  });
  return { units, blockOrder };
}

// Find a term form inside a sentence. Handles Arabic "لـ + الـ" where the alef drops
// (e.g. form "المقاومة" written as "للمقاومة" in the text).
// `taken` = ranges already used in this sentence; a form found inside one of them
// (e.g. "بلازميد" inside "البلازميدات") is skipped and the next match is tried.
function locate(sentence, form, taken) {
  taken = taken || [];
  const free = (a, b) => taken.every(r => b <= r.start || a >= r.end);
  const tries = [[form, 0]];
  if (form.startsWith('ال')) tries.push(['لل' + form.slice(2), 1]);
  for (const [f, shift] of tries) {
    for (let i = sentence.indexOf(f); i >= 0; i = sentence.indexOf(f, i + 1)) {
      const a = i + shift, b = i + f.length;
      if (free(a, b)) return { start: a, end: b, matched: sentence.slice(a, b) };
    }
  }
  return null;
}

// Deterministic shuffle (same question -> same order on every build), seeded by the question text.
function shuffleOrder(seedText, n) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  return idx;
}

function merge(originalText, analysis) {
  const seg = Segmenter.segment(originalText);
  const { units, blockOrder } = indexText(seg);
  const errors = [];
  const warnings = [];
  const unitIds = Object.keys(units);
  // words of each block, headings excluded (they are not summarised)
  const blockWords = {};
  seg.blocks.forEach(b => {
    const t = b.type === 'paragraph' ? b.text : b.type === 'list' ? b.items.map(i => i.text).join(' ') : '';
    blockWords[b.id] = t ? t.split(/\s+/).filter(Boolean).length : 0;
  });

  // ---- reading units: contiguous, full coverage, no gaps or overlaps
  const readingUnits = (analysis.units || []).map((u, k) => {
    const a = blockOrder.indexOf(u.from), b = blockOrder.indexOf(u.to);
    if (a < 0 || b < 0 || b < a) errors.push(`الوحدة ${k + 1}: حدود غير صحيحة (${u.from} إلى ${u.to})`);
    const blocks = a >= 0 && b >= a ? blockOrder.slice(a, b + 1) : [];
    const words = blocks.reduce((n, id) => n + blockWords[id], 0);
    return { n: k + 1, from: u.from, to: u.to, blocks, title: u.title, summary: u.summary || null,
      wordCount: words, showSummary: !!u.summary && words >= SHORT_UNIT_WORDS, rawQuestion: u.question };
  });
  let pos = 0;
  readingUnits.forEach(u => {
    if (!u.blocks.length) return;
    if (blockOrder.indexOf(u.from) !== pos) errors.push(`الوحدة ${u.n}: فجوة أو تداخل قبلها`);
    pos = blockOrder.indexOf(u.to) + 1;
  });
  if (readingUnits.length && pos !== blockOrder.length) errors.push('الوحدات لا تغطي نهاية النص');
  const unitOfBlock = {};
  readingUnits.forEach(u => u.blocks.forEach(b => { unitOfBlock[b] = u.n; }));

  // ---- comprehension questions: one per unit; a broken question is dropped with a warning
  // (it never blocks the page). Claude writes the correct option first; we shuffle here.
  readingUnits.forEach(u => {
    const q = u.rawQuestion; delete u.rawQuestion;
    u.question = null;
    if (q == null) { if (analysis.rulesVersions && analysis.rulesVersions.questions) warnings.push(`الوحدة ${u.n}: بلا سؤال`); return; }
    const ok = q && typeof q.text === 'string' && q.text.trim() && Array.isArray(q.options) && q.options.length === 3 &&
      q.options.every(o => typeof o === 'string' && o.trim()) && new Set(q.options.map(o => o.trim())).size === 3;
    if (!ok) { warnings.push(`الوحدة ${u.n}: سؤال غير مكتمل (يلزم نص وثلاثة خيارات مختلفة)، فحُذف`); return; }
    const sources = (q.sources || []).filter(id => {
      if (!units[id]) { warnings.push(`الوحدة ${u.n}: مصدر السؤال ${id} غير موجود، فحُذف`); return false; }
      if (unitOfBlock[units[id].block] !== u.n) { warnings.push(`الوحدة ${u.n}: مصدر السؤال ${id} خارج الوحدة`); }
      return true;
    });
    const order = shuffleOrder(q.text, 3);
    u.question = {
      text: q.text.trim(), options: order.map(i => q.options[i].trim()), answer: order.indexOf(0),
      explanation: (q.explanation || '').trim() || null, sources, show: u.wordCount >= SHORT_UNIT_WORDS
    };
  });

  // ---- importance: every sentence / list item exactly once
  const importance = {};
  Object.entries(analysis.importance || {}).forEach(([id, lvl]) => {
    if (!units[id]) errors.push(`الأهمية: رمز غير موجود ${id}`);
    else if (!LEVELS.includes(lvl)) errors.push(`الأهمية: مستوى غير معروف ${lvl} في ${id}`);
    else importance[id] = lvl;
  });
  const missing = unitIds.filter(id => !importance[id]);
  if (missing.length) errors.push(`الأهمية: جمل بلا تصنيف ${missing.join(' ')}`);

  // ---- key points: sources exist and stay inside their reading unit
  const keyPoints = (analysis.keyPoints || []).map((kp, k) => {
    (kp.sources || []).forEach(id => {
      if (!units[id]) errors.push(`النقطة ${k + 1}: رمز غير موجود ${id}`);
      else if (kp.unit && unitOfBlock[units[id].block] !== kp.unit) warnings.push(`النقطة ${k + 1}: المصدر ${id} خارج الوحدة ${kp.unit}`);
    });
    return { unit: kp.unit, text: kp.text, sources: kp.sources || [] };
  });
  if (readingUnits.length > 1 && keyPoints.length !== readingUnits.length) warnings.push(`عدد النقاط ${keyPoints.length} لا يساوي عدد الوحدات ${readingUnits.length}`);

  // ---- terms: locate every form, compute offsets for the page
  const takenBySentence = {};
  const terms = (analysis.terms || []).map((t, k) => {
    const occurrences = [];
    (t.occurrences || []).forEach(o => {
      if (!units[o.at]) { errors.push(`المصطلح "${t.term}": رمز غير موجود ${o.at}`); return; }
      const taken = takenBySentence[o.at] = takenBySentence[o.at] || [];
      const hit = locate(units[o.at].text, o.form, taken);
      if (!hit) { warnings.push(`المصطلح "${t.term}": الصيغة "${o.form}" غير موجودة في ${o.at}، فحُذف هذا الموضع`); return; }
      taken.push({ start: hit.start, end: hit.end });
      occurrences.push({ at: o.at, form: hit.matched, start: hit.start, end: hit.end });
    });
    if (!occurrences.length) warnings.push(`المصطلح "${t.term}" بلا مواضع صالحة`);
    return {
      id: 't' + (k + 1), term: t.term, translation: t.translation || null,
      occurrences, meaning: t.meaning, explanation: t.explanation, example: t.example
    };
  });

  const sentenceCount = unitIds.length;
  return {
    document: {
      schemaVersion: SCHEMA_VERSION,
      segmenterVersion: seg.version,
      rulesVersions: analysis.rulesVersions || null,
      createdAt: new Date().toISOString(),
      language: 'ar',
      text: { wordCount: seg.wordCount, stats: seg.stats, blocks: seg.blocks },
      analysis: { summary: analysis.summary, keyPoints, readingUnits, terms, importance },
      display: {
        showImportance: sentenceCount >= SHORT_TEXT_SENTENCES,
        showSectionSummaries: readingUnits.length > 1,
        showKeyPoints: keyPoints.length > 0,
        showTerms: terms.length > 0,
        showQuestions: readingUnits.some(u => u.question && u.question.show)
      }
    },
    errors,
    warnings
  };
}

return { merge, locate, SCHEMA_VERSION };
});

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const [textFile, analysisFile] = process.argv.slice(2);
  const res = module.exports.merge(fs.readFileSync(textFile, 'utf8'), JSON.parse(fs.readFileSync(analysisFile, 'utf8')));
  res.errors.forEach(e => console.error('خطأ: ' + e));
  res.warnings.forEach(w => console.error('تنبيه: ' + w));
  if (res.errors.length) process.exit(1);
  process.stdout.write(JSON.stringify(res.document, null, 2) + '\n');
}
