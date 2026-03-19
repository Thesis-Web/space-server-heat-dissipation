#!/usr/bin/env node
/**
 * validate-schemas.js
 * Schema gate: validates all *.schema.json files are syntactically valid
 * and contain required schema_id and schema_version fields.
 * Gate: §41.2.
 */

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = path.resolve(__dirname, '../../schemas');
const REQUIRED_SCHEMA_IDS = [
  'scenario',
  'compute-device',
  'compute-module',
  'thermal-zone',
  'thermal-stage',
  'working-fluid',
  'storage',
  'radiator',
  'conversion-branch',
  'communications-payload',
  'run-packet',
];

let failures = 0;
const found = [];

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.schema.json')) {
      validateSchemaFile(fullPath);
    }
  }
}

function validateSchemaFile(filePath) {
  const rel = path.relative(process.cwd(), filePath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`FAIL [parse] ${rel}: ${e.message}`);
    failures++;
    return;
  }
  if (!parsed.schema_id) {
    console.error(`FAIL [missing schema_id] ${rel}`);
    failures++;
    return;
  }
  if (!parsed.schema_version) {
    console.error(`FAIL [missing schema_version] ${rel}`);
    failures++;
    return;
  }
  if (!parsed.$schema) {
    console.warn(`WARN [missing $schema] ${rel}`);
  }
  console.log(`  OK  ${rel}  (id=${parsed.schema_id}, version=${parsed.schema_version})`);
  found.push(parsed.schema_id);
}

console.log('\n=== Schema Gate (§41.2) ===\n');
walkDir(SCHEMAS_DIR);

// Check all required schemas present
for (const required of REQUIRED_SCHEMA_IDS) {
  if (!found.includes(required)) {
    console.error(`FAIL [missing required schema] ${required}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\nSchema gate FAILED: ${failures} error(s)\n`);
  process.exit(1);
} else {
  console.log(`\nSchema gate PASSED: ${found.length} schemas validated (${REQUIRED_SCHEMA_IDS.length} required)\n`);
  process.exit(0);
}
