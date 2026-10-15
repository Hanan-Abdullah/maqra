// feedback.js — checks what readers send from the page ("was this page helpful?" and reports
// about the analysis) and shapes the record saved in the "feedback" collection.
'use strict';

const MODES = ['original', 'easy', 'margin'];
// The report types offered in the page's list (the value is stored, the page shows the Arabic label).
const REPORT_TYPES = ['term', 'unit-summary', 'summary', 'importance', 'question', 'other'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DOC_ID = /^[A-Za-z0-9_-]{10}$/;
const PAGE = /^\/[A-Za-z0-9/_-]{0,200}$/;

const text = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

/** Returns { record } ready to insert, or { error } in plain English for the response. */
function readFeedback(body) {
  const b = body || {};
  const mode = b.mode == null ? null : MODES.includes(b.mode) ? b.mode : undefined;
  if (mode === undefined) return { error: 'mode is not valid' };

  if (b.kind === 'helpful') {
    if (typeof b.helpful !== 'boolean') return { error: 'helpful must be true or false' };
    if (typeof b.page !== 'string' || !PAGE.test(b.page)) return { error: 'page is not valid' };
    if (b.documentId != null && !DOC_ID.test(b.documentId)) return { error: 'documentId is not valid' };
    return { record: { kind: 'helpful', helpful: b.helpful, page: b.page, documentId: b.documentId ?? null, mode, createdAt: new Date() } };
  }

  if (b.kind === 'report') {
    if (typeof b.documentId !== 'string' || !DOC_ID.test(b.documentId)) return { error: 'documentId is not valid' };
    const name = text(b.name, 100);
    if (!name) return { error: 'name is required (up to 100 characters)' };
    const email = text(b.email, 200);
    if (!email || !EMAIL.test(email)) return { error: 'email is not valid' };
    if (!REPORT_TYPES.includes(b.type)) return { error: 'type is not valid' };
    const message = text(b.message, 2000);
    if (!message) return { error: 'message is required (up to 2000 characters)' };
    const unit = b.unit == null ? null : Number.isInteger(b.unit) && b.unit > 0 && b.unit < 1000 ? b.unit : undefined;
    if (unit === undefined) return { error: 'unit is not valid' };
    return {
      record: { kind: 'report', documentId: b.documentId, mode, unit, type: b.type, name, email, message, status: 'new', createdAt: new Date() },
    };
  }

  return { error: 'kind must be "report" or "helpful"' };
}

module.exports = { readFeedback, REPORT_TYPES };
