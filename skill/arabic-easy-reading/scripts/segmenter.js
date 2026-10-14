/**
 * segmenter.js — Text segmentation & numbering (MVP, version "seg-1")
 *
 * Splits a text into:
 *   headings   -> h1, h2, ...
 *   paragraphs -> p1, p2, ...   each split into sentences p1.s1, p1.s2, ...
 *   lists      -> l1, l2, ...   each split into items     l1.i1, l1.i2, ...
 *
 * Rules (MVP):
 *   - Only whitespace is normalized. The wording of the text is never changed.
 *   - If the text contains blank lines, a paragraph = lines between blank lines;
 *     a single line break is joined with a space only when the line before it does
 *     not end a sentence (. ! ? ؟ …). Otherwise it starts a new paragraph (seg-2).
 *     If it has no blank lines, every line is its own paragraph.
 *   - Headings: "# title" (markdown), "**title**" on its own line, or a short single
 *     line (<= 12 words) with no ending punctuation that is followed by another block.
 *     The short-line rule is skipped when the writer rarely uses ending punctuation.
 *   - List items: lines starting with - * • · – or 1. 1) 1- ١. or أ) أ- or a)
 *     Consecutive item lines form one list. Markers are removed; `ordered` is kept.
 *   - Sentences end at . ! ? ؟ … followed by a space or end of paragraph (not at ؛ or ;).
 *     Not split: decimals (3.5), single-letter abbreviations (د. / A.), Dr. Mr. e.g. i.e.
 *   - No split inside a closed «...» quotation (seg-3); an unclosed « is ignored.
 *   - Headings and list items are not split into sentences.
 *   - Counters for h / p / l are independent; use `order` for document order.
 *
 * Works in Node (require) and in the browser (window.Segmenter).
 * CLI:  node segmenter.js input.txt          -> tagged text
 *       node segmenter.js input.txt --json   -> JSON
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Segmenter = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 'seg-4';
  const DEFAULT_MAX_WORDS = 10000;
  const MIN_ARABIC_RATIO = 0.6; // share of Arabic letters among all letters
  const HEADING_MAX_WORDS = 12;

  // Semicolons (؛ ;) do NOT end a sentence: in Arabic they usually link cause and effect.
  const SENTENCE_END = '.!?؟…';
  const TRAILING = /[.!?؟…"'»)\]”’]/;
  const ABBREVIATIONS = new Set(['dr', 'mr', 'mrs', 'ms', 'vs', 'e.g', 'i.e', 'prof', 'st']);
  const SINGLE_LETTER = /^[A-Za-z\u0621-\u064A]$/;

  const UNORDERED_MARKER = /^[-*•·▪◦–]\s+/;
  const ORDERED_MARKER = /^(?:(?:\d{1,3}|[٠-٩]{1,3})[.)\-]|[A-Za-z]\)|[\u0621-\u064A][)\-])\s+/;
  const MD_HEADING = /^#{1,6}\s+/;
  const BOLD_LINE = /^\*\*(.+)\*\*$/;
  const SENTENCE_CLOSE = /[.!?؟…]["'»)\]”’]*$/;
  const ENDS_WITH_PUNCT = /[.!?؟؛;…:،,]["'»)\]”’]*$/;

  function normalize(text) {
    return String(text == null ? '' : text)
      .replace(/\r\n?/g, '\n')
      .replace(/[\u200B\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .split('\n')
      .map(function (l) { return l.replace(/[ \t\f\v]+/g, ' ').trim(); })
      .join('\n')
      .trim();
  }

  function countWords(text) {
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }

  function splitSentences(text) {
    const out = [];
    const n = text.length;
    // inside[i] = true when position i is inside a closed «...» quote (seg-3).
    // An unclosed « is ignored, so a missing » never swallows the paragraph.
    const inside = new Array(n).fill(false);
    for (let a = 0; a < n; a++) {
      if (text[a] !== '«') continue;
      let depth = 0, b = a;
      for (; b < n; b++) {
        if (text[b] === '«') depth++;
        else if (text[b] === '»' && --depth === 0) break;
      }
      if (b < n) { for (let k = a + 1; k < b; k++) inside[k] = true; a = b; }
    }
    let start = 0;
    for (let i = 0; i < n; i++) {
      const ch = text[i];
      if (SENTENCE_END.indexOf(ch) === -1) continue;
      if (inside[i]) continue; // never split inside a quotation
      // decimal number: 3.5
      if (ch === '.' && /\d/.test(text[i - 1] || '') && /\d/.test(text[i + 1] || '')) continue;
      // swallow repeated / closing punctuation: "..." or ".»"
      let j = i + 1;
      while (j < n && TRAILING.test(text[j])) j++;
      // must be followed by whitespace or end (avoids URLs, e.g. example.com)
      if (j < n && !/\s/.test(text[j])) { i = j - 1; continue; }
      // abbreviations: د. أحمد / A. Smith / Dr. / e.g.
      if (ch === '.') {
        const m = text.slice(start, i).match(/(\S+)$/);
        const word = m ? m[1].replace(/^[("'«“]+/, '') : '';
        if (SINGLE_LETTER.test(word) || ABBREVIATIONS.has(word.toLowerCase())) { i = j - 1; continue; }
      }
      const s = text.slice(start, j).trim();
      if (s) out.push(s);
      start = j;
      i = j - 1;
    }
    const rest = text.slice(start).trim();
    if (rest) out.push(rest);
    return out;
  }

  function segment(input, options) {
    const opts = Object.assign({ maxWords: DEFAULT_MAX_WORDS }, options || {});
    const text = normalize(input);
    const lines = text ? text.split('\n') : [];
    const hasBlankLines = /\n\n/.test(text);

    // 1) group lines into raw blocks
    const raw = [];
    let para = null;
    let list = null;
    const flushPara = function () { if (para) { raw.push(para); para = null; } };
    const endList = function () { if (list) { raw.push(list); list = null; } };

    // Line mode (seg-4): the writer ends most lines with punctuation, so a short
    // unpunctuated line (or one ending with ? or :) that starts a new block is kept
    // on its own and may become a heading in step 2. Disabled for wrapped text (PDF).
    const contentLines = lines.filter(function (l) { return l && !ORDERED_MARKER.test(l) && !UNORDERED_MARKER.test(l); });
    const lineMode = hasBlankLines && contentLines.length > 0 &&
      contentLines.filter(function (l) { return ENDS_WITH_PUNCT.test(l); }).length / contentLines.length >= 0.5;
    const NO_HEADING_END = /[.!…،,؛;]["'»)\]”’]*$/;
    const hasNext = function (k) { for (let j = k + 1; j < lines.length; j++) if (lines[j]) return true; return false; };

    lines.forEach(function (line, k) {
      if (!line) { flushPara(); endList(); return; }

      if (MD_HEADING.test(line)) {
        flushPara(); endList();
        raw.push({ type: 'heading', text: line.replace(MD_HEADING, '').trim() });
        return;
      }
      const bold = line.match(BOLD_LINE);
      if (bold) {
        flushPara(); endList();
        raw.push({ type: 'heading', text: bold[1].trim() });
        return;
      }

      const isOrdered = ORDERED_MARKER.test(line);
      if (isOrdered || UNORDERED_MARKER.test(line)) {
        flushPara();
        if (!list) list = { type: 'list', ordered: isOrdered, items: [] };
        list.items.push(line.replace(isOrdered ? ORDERED_MARKER : UNORDERED_MARKER, '').trim());
        return;
      }

      endList();
      if (lineMode && countWords(line) <= HEADING_MAX_WORDS && !NO_HEADING_END.test(line) && hasNext(k)) {
        const last = para && para.lines[para.lines.length - 1];
        if (!para || SENTENCE_CLOSE.test(last) || /:$/.test(last)) {
          flushPara();
          raw.push({ type: 'paragraph', lines: [line] });
          return;
        }
      }
      if (hasBlankLines) {
        // a line ending a sentence closes the paragraph even without a blank line
        // (only lines cut mid-sentence, e.g. copied from PDF, are joined)
        if (para && SENTENCE_CLOSE.test(para.lines[para.lines.length - 1])) flushPara();
        if (!para) para = { type: 'paragraph', lines: [] };
        para.lines.push(line);
      } else {
        flushPara();
        raw.push({ type: 'paragraph', lines: [line] });
      }
    });
    flushPara();
    endList();

    // 2) short-line heading rule (only if the writer generally ends paragraphs with punctuation)
    const plain = raw.filter(function (b) { return b.type === 'paragraph'; });
    const punctuated = plain.filter(function (b) { return ENDS_WITH_PUNCT.test(b.lines[b.lines.length - 1]); });
    const writerUsesPunctuation = plain.length > 0 && punctuated.length / plain.length >= 0.5;

    if (writerUsesPunctuation) {
      raw.forEach(function (b, idx) {
        const next = raw[idx + 1];
        if (b.type !== 'paragraph' || b.lines.length !== 1 || !next) return;
        const t = b.lines[0];
        if (countWords(t) > HEADING_MAX_WORDS) return;
        // question headings ("ما هي إدارة الوقت؟") before text or a list;
        // label headings ("زيادة الإنتاجية:") only before text, not as a list lead-in
        const question = /[؟?]$/.test(t) && next.type !== 'heading';
        const label = /:$/.test(t) && next.type === 'paragraph';
        if (ENDS_WITH_PUNCT.test(t) && !question && !label) return;
        b.type = 'heading';
        b.text = label ? t.replace(/\s*:$/, '') : t;
        delete b.lines;
      });
    }

    // 3) assign IDs
    let h = 0, p = 0, l = 0, sentences = 0, items = 0;
    const blocks = raw.map(function (b, idx) {
      const order = idx + 1;
      if (b.type === 'heading') {
        h++;
        return { order: order, id: 'h' + h, type: 'heading', text: b.text };
      }
      if (b.type === 'list') {
        l++;
        const lid = 'l' + l;
        items += b.items.length;
        return {
          order: order, id: lid, type: 'list', ordered: b.ordered,
          items: b.items.map(function (t, k) { return { id: lid + '.i' + (k + 1), text: t }; })
        };
      }
      p++;
      const pid = 'p' + p;
      const ptext = b.lines.join(' ');
      const sents = splitSentences(ptext).map(function (t, k) { return { id: pid + '.s' + (k + 1), text: t }; });
      sentences += sents.length;
      return { order: order, id: pid, type: 'paragraph', text: ptext, sentences: sents };
    });

    const wordCount = countWords(text);
    return {
      version: VERSION,
      wordCount: wordCount,
      maxWords: opts.maxWords,
      tooLong: wordCount > opts.maxWords,
      stats: { headings: h, paragraphs: p, sentences: sentences, lists: l, listItems: items },
      blocks: blocks
    };
  }

  // Checks a text before analysis. Returns null when accepted, or an Arabic message.
  function check(input, options) {
    const opts = Object.assign({ maxWords: DEFAULT_MAX_WORDS, minWords: 15 }, options || {});
    const text = normalize(input);
    const words = countWords(text);
    if (!words) return 'النص فارغ.';
    const arabic = (text.match(/[\u0621-\u064A\u0671-\u06D3]/g) || []).length;
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    if (arabic + latin === 0 || arabic / (arabic + latin) < MIN_ARABIC_RATIO) return 'النسخة الحالية تدعم النصوص العربية فقط.';
    if (words > opts.maxWords) return 'النص أطول من الحد المسموح (' + opts.maxWords + ' كلمة). عدد كلماته ' + words + '.';
    if (words < opts.minWords) return 'النص أقصر من أن يُحلَّل. أضف نصًا أطول.';
    return null;
  }

  function toTagged(result) {
    return result.blocks.map(function (b) {
      if (b.type === 'heading') return '[' + b.id + '] ' + b.text;
      if (b.type === 'list') return b.items.map(function (it) { return '[' + it.id + '] ' + it.text; }).join('\n');
      return b.sentences.map(function (s) { return '[' + s.id + '] ' + s.text; }).join('\n');
    }).join('\n\n');
  }

  function allIds(result) {
    const ids = [];
    result.blocks.forEach(function (b) {
      ids.push(b.id);
      (b.sentences || []).forEach(function (s) { ids.push(s.id); });
      (b.items || []).forEach(function (it) { ids.push(it.id); });
    });
    return ids;
  }

  return { VERSION: VERSION, check: check, segment: segment, toTagged: toTagged, allIds: allIds, normalize: normalize, splitSentences: splitSentences };
});

// ---- CLI ----
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const args = process.argv.slice(2);
  const file = args.find(function (a) { return !a.startsWith('--'); });
  const input = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
  const result = module.exports.segment(input);
  process.stdout.write(args.includes('--json') ? JSON.stringify(result, null, 2) + '\n' : module.exports.toTagged(result) + '\n');
}
