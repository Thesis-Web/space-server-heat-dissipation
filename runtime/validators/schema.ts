/**
 * schema.ts
 * JSON schema validation module.
 * Governed by §26.3 (schema validation) and §41.2 (schema gate).
 * Uses AJV draft-07 per schema $schema declarations.
 */

import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import * as fs from 'fs';
import * as path from 'path';

const ajv = new Ajv({ allErrors: true, strict: false });

// Cache compiled validators keyed by schema_id
const validatorCache = new Map<string, ValidateFunction>();

// ─── Schema loader ────────────────────────────────────────────────────────────

/**
 * Load and compile a JSON schema from the schemas/ directory.
 * Schema path is resolved relative to repo root.
 */
export function loadSchema(schemaId: string): ValidateFunction {
  if (validatorCache.has(schemaId)) {
    return validatorCache.get(schemaId)!;
  }

  const schemaDir = path.resolve(__dirname, '../../schemas', schemaId);
  const schemaFile = path.join(schemaDir, `${schemaId}.schema.json`);

  if (!fs.existsSync(schemaFile)) {
    throw new Error(`Schema file not found: ${schemaFile}`);
  }

  const raw = fs.readFileSync(schemaFile, 'utf-8');
  const schema = JSON.parse(raw) as Record<string, unknown>;
  const validate = ajv.compile(schema);
  validatorCache.set(schemaId, validate);
  return validate;
}

// ─── Validation result type ───────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
  schema_id: string;
  data_id?: string;
}

// ─── Validate a document against its schema ───────────────────────────────────

/**
 * Validate a parsed JSON document against the named schema.
 * Returns structured result — does not throw on validation failure.
 */
export function validateDocument(
  schemaId: string,
  document: unknown,
  dataId?: string
): ValidationResult {
  const validate = loadSchema(schemaId);
  const valid = validate(document) as boolean;
  return {
    valid,
    errors: valid ? null : (validate.errors ?? null),
    schema_id: schemaId,
    data_id: dataId,
  };
}

/**
 * Validate a document and throw if invalid.
 * Produces a human-readable error summary.
 */
export function assertValid(
  schemaId: string,
  document: unknown,
  dataId?: string
): void {
  const result = validateDocument(schemaId, document, dataId);
  if (!result.valid) {
    const messages = (result.errors ?? [])
      .map(e => `  [${e.instancePath || '/'}] ${e.message}`)
      .join('\n');
    throw new Error(
      `Schema validation failed for ${schemaId}` +
      (dataId ? ` (${dataId})` : '') +
      `:\n${messages}`
    );
  }
}

/**
 * Validate a scenario payload bundle:
 * scenario + all referenced subsystem documents.
 * §15.3 — reject if any referenced subsystem schema object is missing.
 */
export function validateScenarioBundle(
  scenario: unknown,
  subsystems: Record<string, unknown>
): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateDocument('scenario', scenario, 'scenario'));

  for (const [schemaId, doc] of Object.entries(subsystems)) {
    results.push(validateDocument(schemaId, doc, schemaId));
  }

  return results;
}

/**
 * Clear validator cache — for testing use only.
 */
export function clearValidatorCache(): void {
  validatorCache.clear();
}
