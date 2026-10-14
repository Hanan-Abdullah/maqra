// record.js — builds the record saved in the "documents" collection.
//
// The request carries what only the skill knows (the text, Claude's analysis, where the
// text came from, how it was processed). Everything else is computed here from the
// validated document, so the numbers can always be trusted.
'use strict';

const SOURCE_TYPES = ['paste', 'file', 'url'];

// Checks the optional "source" and "processing" parts of the request.
// Returns { source, processing } or { error }.
function readMeta(body) {
  const s = body.source || { type: 'paste' };
  if (!SOURCE_TYPES.includes(s.type)) return { error: `source.type must be one of: ${SOURCE_TYPES.join(', ')}` };
  const source = { type: s.type };
  if (s.type === 'file') {
    if (typeof s.fileName !== 'string' || !s.fileName.trim()) return { error: 'source.fileName is required when source.type is "file"' };
    source.fileName = s.fileName.trim().slice(0, 255);
  }
  if (s.type === 'url') {
    if (typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url)) return { error: 'source.url must be an http(s) link when source.type is "url"' };
    source.url = s.url.slice(0, 2000);
  }

  const p = body.processing || {};
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : null);
  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const processing = {
    skillVersion: str(p.skillVersion, 40),
    fileType: str(p.fileType, 20),
    extractionMethod: str(p.extractionMethod, 40),
    reviewed: typeof p.reviewed === 'boolean' ? p.reviewed : null,
    attempts: num(p.attempts),
    durationMs: num(p.durationMs),
  };
  return { source, processing };
}

function buildRecord({ id, text, analysis, document, warnings, source, processing }) {
  const blocks = document.text.blocks;
  const units = document.analysis.readingUnits;
  const authorTitle = blocks[0] && blocks[0].type === 'heading' ? blocks[0].text : null;

  const levels = Object.values(document.analysis.importance);
  const share = (level) => (levels.length ? Math.round((100 * levels.filter((l) => l === level).length) / levels.length) : 0);

  return {
    _id: id,
    title: authorTitle || (units[0] && units[0].title) || null,
    wordCount: document.text.wordCount,
    source,
    versions: {
      skill: processing.skillVersion,
      schema: document.schemaVersion,
      segmenter: document.segmenterVersion,
      rules: document.rulesVersions,
    },
    stats: {
      units: units.length,
      keyPoints: document.analysis.keyPoints.length,
      terms: document.analysis.terms.length,
      questions: units.filter((u) => u.question).length,
      importance: { primary: share('primary'), supporting: share('supporting'), secondary: share('secondary') },
    },
    quality: {
      warnings,
      attempts: processing.attempts,
    },
    textProfile: {
      ...document.text.stats,
      hasAuthorTitle: Boolean(authorTitle),
    },
    processing: {
      fileType: processing.fileType,
      extractionMethod: processing.extractionMethod,
      reviewed: processing.reviewed,
      durationMs: processing.durationMs,
    },
    originalText: text,
    analysis,
    document,
    createdAt: new Date(),
  };
}

module.exports = { readMeta, buildRecord, SOURCE_TYPES };
