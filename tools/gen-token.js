#!/usr/bin/env node
'use strict';
// Usage: node tools/gen-token.js <label> [limit]
// Adds a new token to ~/tokens.json and prints it.
// Example: node tools/gen-token.js "dell-eval" 10

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKENS_PATH = process.env.TOKENS_PATH || path.join(__dirname, '..', '..', 'tokens.json');

const label = process.argv[2];
const limit = parseInt(process.argv[3] || '10', 10);

if (!label) {
  console.error('Usage: node tools/gen-token.js <label> [limit]');
  process.exit(1);
}

let store = { tokens: {} };
try {
  store = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
} catch {
  // fresh file
}

const id = crypto.randomUUID();
store.tokens[id] = {
  label,
  limit,
  used: 0,
  created: new Date().toISOString(),
  last_used: null
};

fs.writeFileSync(TOKENS_PATH, JSON.stringify(store, null, 2), 'utf8');

console.log('');
console.log('Token created:');
console.log('  ID:    ' + id);
console.log('  Label: ' + label);
console.log('  Limit: ' + limit + ' runs');
console.log('');
console.log('Send this to the recipient:');
console.log('  Token: ' + id);
console.log('  URL:   https://orbital.exnulla.com');
console.log('');
