'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { executeRunPacket } = require('./dist/runtime/runner/run-packet');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ── Token auth middleware ────────────────────────────────────────────────────
// DELIVERY-001: token-gated /api/run-packet
// tokens.json lives at TOKENS_PATH (outside repo, never committed).
// Format: { "tokens": { "<uuid>": { "label": "...", "limit": 10, "used": 0, "created": "...", "last_used": null } } }
// usage.log lives at USAGE_LOG_PATH — one line per run.

const TOKENS_PATH = process.env.TOKENS_PATH || path.join(__dirname, '..', 'tokens.json');
const USAGE_LOG_PATH = process.env.USAGE_LOG_PATH || path.join(__dirname, '..', 'usage.log');

function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
  } catch {
    return { tokens: {} };
  }
}

function saveTokens(data) {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[token] Failed to save tokens.json:', e.message);
  }
}

function logUsage(tokenId, label, used, limit, ip) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    token: tokenId.slice(0, 8) + '...',
    label,
    run: used,
    limit,
    ip: ip || 'unknown'
  }) + '\n';
  try {
    fs.appendFileSync(USAGE_LOG_PATH, line, 'utf8');
  } catch (e) {
    console.error('[token] Failed to write usage.log:', e.message);
  }
}

function tokenAuth(req, res, next) {
  // Allow local/loopback without token (server operator testing)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (isLocal) return next();

  const tokenId = req.headers['x-demo-token'] || req.query.token;
  if (!tokenId) {
    return res.status(401).json({ ok: false, error: 'No token provided. Request access at exnulla.com.' });
  }

  const store = loadTokens();
  const entry = store.tokens[tokenId];

  if (!entry) {
    return res.status(401).json({ ok: false, error: 'Invalid token. Request access at exnulla.com.' });
  }

  if (entry.used >= entry.limit) {
    return res.status(429).json({ ok: false, error: 'Token exhausted (' + entry.used + '/' + entry.limit + ' runs used). Contact owner to continue.' });
  }

  // Consume one run
  entry.used += 1;
  entry.last_used = new Date().toISOString();
  saveTokens(store);
  logUsage(tokenId, entry.label, entry.used, entry.limit, ip);

  console.log('[token] ' + entry.label + ' — run ' + entry.used + '/' + entry.limit + ' from ' + ip);
  next();
}

// ── CORS for orbital.exnulla.com ─────────────────────────────────────────────
app.use(function(req, res, next) {
  var origin = req.headers.origin || '';
  var allowed = [
    'https://orbital.exnulla.com',
    'https://exnulla.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ];
  if (allowed.indexOf(origin) !== -1) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Demo-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Static UI ────────────────────────────────────────────────────────────────
// ── Gate + tool routes ───────────────────────────────────────────────────────
// / → token gate page. /tool → full UI. Token injected via sessionStorage.
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'ui/app/gate.html'));
});
app.get('/tool', function(req, res) {
  res.sendFile(path.join(__dirname, 'ui/app/index.html'));
});

app.use(express.static(path.join(__dirname, 'ui/app')));

// ── Token-gated run endpoint ─────────────────────────────────────────────────
app.post('/api/run-packet', tokenAuth, async function(req, res) {
  try {
    var result = executeRunPacket(req.body);
    res.json({ ok: true, result: result });
  } catch (err) {
    var message = (err && err.message) ? err.message : String(err);
    res.status(500).json({ ok: false, error: message });
  }
});

// ── Token status endpoint (operator only — local) ───────────────────────────
app.get('/admin/tokens', function(req, res) {
  var ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  var isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!isLocal) return res.status(403).json({ error: 'Local access only.' });
  var store = loadTokens();
  res.json(store);
});

var PORT = process.env.PORT || 8080;
app.listen(PORT, function() {
  console.log('Orbital Thermal Trade System running on http://localhost:' + PORT);
  console.log('[token] Tokens file: ' + TOKENS_PATH);
  console.log('[token] Usage log: ' + USAGE_LOG_PATH);
});
