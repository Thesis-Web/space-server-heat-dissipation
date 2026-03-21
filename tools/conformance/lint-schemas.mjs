#!/usr/bin/env node
/**
 * lint-schemas.mjs — AJV-based JSON schema linter
 * Governing law: ui-expansion-spec-v0.1.5 §26 gate: npm run lint:schemas
 *
 * Loads every *.schema.json under schemas/ and validates that:
 *   1. The file is valid JSON.
 *   2. The file is a valid JSON Schema Draft-07 meta-schema.
 *   3. The schema compiles without errors in AJV.
 *
 * Also loads every *.json under ui/app/catalogs/ and validates each against
 * its corresponding catalog schema if present.
 *
 * Exit 0 = all pass. Exit 1 = one or more failures.
 *
 * PATCH-B1-001: ROOT path depth corrected from ".." to "../.."
 *   Reason: file is placed at tools/conformance/lint-schemas.mjs (two levels
 *   below repo root), not scripts/lint-schemas.mjs (one level below).
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const Ajv = require("ajv");
// ajv-formats is optional per HOLE-001 — require() itself wrapped in try/catch
// so MODULE_NOT_FOUND does not crash the process before graceful fallback.
let addFormats = null;
try { addFormats = require("ajv-formats"); } catch { /* optional */ }

const ROOT = resolve(new URL(".", import.meta.url).pathname, "../..");
const SCHEMAS_DIR = join(ROOT, "schemas");
const CATALOGS_DIR = join(ROOT, "ui", "app", "catalogs");

const ajv = new Ajv({ strict: false, allErrors: true });
if (typeof addFormats === "function") { try { addFormats(ajv); } catch { /* optional */ } }

let total = 0;
let failures = 0;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { __parse_error: e.message };
  }
}

function walkDir(dir, ext) {
  const results = [];
  if (!statSync(dir, { throwIfNoEntry: false })) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

// ── Phase 1: compile all schemas ──────────────────────────────────────────────
console.log("\n── Schema compilation ──────────────────────────────────────────");
const schemaFiles = walkDir(SCHEMAS_DIR, ".schema.json");

for (const schemaPath of schemaFiles) {
  total++;
  const rel = relative(ROOT, schemaPath);
  const schema = readJson(schemaPath);

  if (schema.__parse_error) {
    console.error(`  FAIL [parse]  ${rel}: ${schema.__parse_error}`);
    failures++;
    continue;
  }

  try {
    ajv.addSchema(schema, schema.schema_id ?? schema["$id"] ?? rel);
    console.log(`  pass          ${rel}`);
  } catch (e) {
    console.error(`  FAIL [compile] ${rel}: ${e.message}`);
    failures++;
  }
}

// ── Phase 2: validate catalog data files against their schemas ─────────────────
console.log("\n── Catalog data validation ─────────────────────────────────────");

const CATALOG_SCHEMA_MAP = {
  "scenario-presets": "scenario-preset-catalog",
  "compute-device-presets": "compute-device-preset-catalog",
  "payload-archetypes": "payload-archetype-catalog",
  "material-families": "material-family-catalog",
  "branch-presets": "branch-preset-catalog",
  "branding": "branding-catalog",
  // ADDITIVE-001: ext2 catalog wrapper schemas v0.2.1
  "absorber-families": "absorber-family-catalog",
  "emitter-families": "emitter-family-catalog",
  "mediator-families": "mediator-family-catalog",
  "cavity-geometries": "cavity-geometry-catalog",
  "source-spectral-profiles": "source-spectral-profile-catalog",
  "research-evidence-classes": "research-evidence-class-catalog",
};

const catalogFiles = walkDir(CATALOGS_DIR, ".json");

for (const catalogPath of catalogFiles) {
  total++;
  const rel = relative(ROOT, catalogPath);
  const data = readJson(catalogPath);

  if (data.__parse_error) {
    console.error(`  FAIL [parse]  ${rel}: ${data.__parse_error}`);
    failures++;
    continue;
  }

  // identify which schema to use from catalog_id field
  const catalogId = data.catalog_id;
  const schemaKey = catalogId ? CATALOG_SCHEMA_MAP[catalogId] : null;
  const schemaId = schemaKey
    ? `https://space-server-heat-dissipation/schemas/catalogs/${schemaKey}.schema.json`
    : null;

  if (!schemaId) {
    console.log(`  skip [no-schema-map] ${rel} (catalog_id=${catalogId})`);
    continue;
  }

  const validate = ajv.getSchema(schemaId);
  if (!validate) {
    console.log(`  skip [schema-not-loaded] ${rel} → ${schemaId}`);
    continue;
  }

  const valid = validate(data);
  if (!valid) {
    console.error(`  FAIL [data]   ${rel}:`);
    for (const err of validate.errors ?? []) {
      console.error(`    ${err.instancePath || "/"} — ${err.message}`);
    }
    failures++;
  } else {
    console.log(`  pass          ${rel}`);
  }
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log(`\n── Result: ${total - failures}/${total} passed ` + (failures > 0 ? `— ${failures} FAILURE(S)` : "— all clean") + " ──\n");
process.exit(failures > 0 ? 1 : 0);
