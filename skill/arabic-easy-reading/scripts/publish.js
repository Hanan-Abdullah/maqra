// publish.js — sends the text and its analysis to Maqra and prints the reading link.
// Usage: node scripts/publish.js input.txt analysis.json [--url <link the text came from>]
// Exit 0: prints "LINK: <url>". Exit 3: prints "PUBLISH_FAILED: <reason>" (deliver the HTML file instead).
'use strict';
const fs = require('fs');
const path = require('path');
const Meta = require('./meta.js');

const SKILL_VERSION = '1.0';
const TIMEOUT_MS = 20000;

const args = process.argv.slice(2);
const urlFlag = args.indexOf('--url');
const sourceUrl = urlFlag >= 0 ? args[urlFlag + 1] : null;
const [textFile, analysisFile] = urlFlag >= 0 ? args.filter((a, i) => i !== urlFlag && i !== urlFlag + 1) : args;
if (!textFile || !analysisFile) {
  console.error('Usage: node scripts/publish.js input.txt analysis.json [--url <link>]');
  process.exit(1);
}

const fail = (reason) => { console.log('PUBLISH_FAILED: ' + reason); process.exit(3); };

let config;
try { config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8')); }
catch (e) { fail('config.json is missing or not valid JSON'); }
const base = String(config.backendUrl || '').replace(/\/$/, '');
if (!/^https?:\/\//.test(base)) fail('backendUrl in config.json is not set');

let raw = fs.readFileSync(analysisFile, 'utf8');
const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
if (fence) raw = fence[1];

const meta = Meta.read(textFile);
const source = sourceUrl ? { type: 'url', url: sourceUrl } : (meta.source || { type: 'paste' });

let analysis;
try { analysis = JSON.parse(raw); } catch (e) { fail('analysis.json is not valid JSON'); }

const body = {
  text: fs.readFileSync(textFile, 'utf8'),
  analysis,
  source,
  processing: {
    skillVersion: SKILL_VERSION,
    fileType: meta.fileType || null,
    reviewed: typeof meta.reviewed === 'boolean' ? meta.reviewed : null,
    attempts: meta.buildAttempts || null,
    durationMs: meta.startedAt ? Date.now() - meta.startedAt : null,
  },
};

// Sends with curl when available: curl goes through the HTTPS_PROXY that Claude's sandbox
// uses for outside connections, while Node's fetch ignores it and fails with ENOTFOUND.
function sendWithCurl(url, json) {
  const os = require('os');
  const { spawnSync } = require('child_process');
  const bodyFile = path.join(os.tmpdir(), `maqra-publish-${process.pid}.json`);
  fs.writeFileSync(bodyFile, json);
  const r = spawnSync('curl', [
    '-sS', '-X', 'POST', url,
    '-H', 'Content-Type: application/json',
    '-H', 'ngrok-skip-browser-warning: 1',
    '--data-binary', '@' + bodyFile,
    '--max-time', String(TIMEOUT_MS / 1000),
    '-w', '\n%{http_code}',
  ], { encoding: 'utf8' });
  try { fs.unlinkSync(bodyFile); } catch (e) { /* ignore */ }
  if (r.error) return null; // curl is not installed
  const lines = (r.stdout || '').split('\n');
  const status = Number(lines.pop());
  if (!status) return { error: `could not reach ${base}: ${(r.stderr || 'no response').trim()}` };
  return { status, text: lines.join('\n') };
}

async function sendWithFetch(url, json) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' },
      body: json,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { status: res.status, text: await res.text() };
  } catch (err) {
    const cause = err.cause ? ` (${err.cause.code || err.cause.message})` : '';
    return { error: `could not reach ${base}: ${err.name === 'TimeoutError' ? 'timed out' : err.message}${cause}` };
  }
}

(async () => {
  const url = base + '/api/documents';
  const json = JSON.stringify(body);
  const res = sendWithCurl(url, json) || await sendWithFetch(url, json);
  if (res.error) fail(res.error);
  let out = {};
  try { out = JSON.parse(res.text); } catch (e) { /* not JSON: a proxy or an error page */ }
  if (res.status < 200 || res.status >= 300) fail(`server answered ${res.status}${out.errors ? ': ' + out.errors.join(' | ') : ''}`);
  (out.warnings || []).forEach((w) => console.log('WARNING: ' + w));
  console.log('LINK: ' + out.url);
})();
