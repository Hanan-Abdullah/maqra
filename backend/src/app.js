// app.js — the HTTP routes. Kept apart from server.js so it can be tested with any store.
'use strict';
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { readMeta, buildRecord } = require('./record');

// The same validation code the skill uses, so the server accepts exactly what the skill accepts.
const Merger = require(path.join(__dirname, '..', '..', 'skill', 'arabic-easy-reading', 'scripts', 'merge.js'));

// 10 random URL-safe characters, e.g. "k3Xa9QpZ2m".
const newId = () => crypto.randomBytes(8).toString('base64url').slice(0, 10);

function createApp({ documents, publicUrl }) {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (req, res) => res.json({ ok: true }));

  // Save a text with its analysis and return the reading link.
  app.post('/api/documents', async (req, res) => {
    const body = req.body || {};
    if (typeof body.text !== 'string' || !body.text.trim()) return res.status(400).json({ errors: ['text is required'] });
    if (!body.analysis || typeof body.analysis !== 'object' || Array.isArray(body.analysis)) {
      return res.status(400).json({ errors: ['analysis is required'] });
    }
    const meta = readMeta(body);
    if (meta.error) return res.status(400).json({ errors: [meta.error] });

    const result = Merger.merge(body.text, body.analysis);
    if (!result.errors.length) {
      // merge.js accepts an analysis without units or summary; the reading page needs both.
      if (!result.document.analysis.readingUnits.length) result.errors.push('analysis has no reading units');
      if (typeof result.document.analysis.summary !== 'string' || !result.document.analysis.summary.trim()) result.errors.push('analysis has no summary');
    }
    if (result.errors.length) return res.status(422).json({ errors: result.errors, warnings: result.warnings });

    const id = newId();
    await documents.insertOne(buildRecord({
      id,
      text: body.text,
      analysis: body.analysis,
      document: result.document,
      warnings: result.warnings,
      source: meta.source,
      processing: meta.processing,
    }));
    res.status(201).json({ id, url: `${publicUrl}/read/${id}`, warnings: result.warnings });
  });

  // Errors: clear messages for bad requests, a generic one for everything else.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ errors: ['request is too large'] });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ errors: ['body is not valid JSON'] });
    console.error(err);
    res.status(500).json({ errors: ['internal error'] });
  });

  return app;
}

module.exports = { createApp };
