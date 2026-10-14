// pages.js — HTML pages served by the backend until the Angular page is ready.
'use strict';
const fs = require('fs');
const path = require('path');

const TEMPLATE_FILE = path.join(__dirname, '..', '..', 'skill', 'arabic-easy-reading', 'templates', 'reading-page.html');
const TEMPLATE = fs.readFileSync(TEMPLATE_FILE, 'utf8');

const HEAD = '<!doctype html>\n<html lang="ar" dir="rtl">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The skill's reading page with the document placed inside it, the same way build.js does it.
function readingPage(document, title) {
  const json = JSON.stringify(document).replace(/</g, '\\u003c');
  const pageTitle = title ? `${escapeHtml(title)} · مَقرأ` : 'مَقرأ';
  return HEAD + TEMPLATE
    .replace(/<title>[^<]*<\/title>/, () => `<title>${pageTitle}</title>`)
    .replace('/*__DOCUMENT__*/', () => json);
}

const NOT_FOUND = `${HEAD}<title>النص غير موجود · مَقرأ</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@600&family=IBM+Plex+Sans+Arabic:wght@400&display=swap">
<style>
:root { --paper: #f5f6f3; --sheet: #ffffff; --ink: #1f2522; --ink-soft: #56605b; --rule: #dfe3df; --accent: #2f5d50; }
@media (prefers-color-scheme: dark) {
  :root { --paper: #151a18; --sheet: #1c2220; --ink: #e6ebe8; --ink-soft: #9fa9a4; --rule: #2d3532; --accent: #8cc7b3; color-scheme: dark; }
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
  background: var(--paper); color: var(--ink); font-family: "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif; }
.card { max-width: 460px; width: 100%; background: var(--sheet); border: 1px solid var(--rule); border-radius: 14px; padding: 28px 24px; text-align: center; }
.brand { margin: 0 0 14px; font-size: 0.8rem; font-weight: 600; color: var(--accent); }
h1 { margin: 0 0 10px; font-family: "Noto Naskh Arabic", serif; font-size: 1.4rem; line-height: 1.6; }
p { margin: 0; color: var(--ink-soft); line-height: 1.9; }
</style>
</head>
<body>
<main class="card">
  <p class="brand">مَقرأ</p>
  <h1>لم نجد هذا النص في مَقرأ</h1>
  <p>قد يكون الرابط ناقصًا، تأكد أنك نسخته كاملًا.</p>
</main>
</body>
</html>
`;

module.exports = { readingPage, NOT_FOUND };
