/**
 * schema.ts
 * JSON schema validation module.
 * Governed by §26.3 (schema validation) and §41.2 (schema gate).
 * Uses AJV draft-07 per schema $schema declarations.
 */
import { ValidateFunction, ErrorObject } from 'ajv';
/**
 * Load and compile a JSON schema from the schemas/ directory.
 * Schema path is resolved relative to repo root.
 */
export declare function loadSchema(schemaId: string): ValidateFunction;
export interface ValidationResult {
    valid: boolean;
    errors: ErrorObject[] | null;
    schema_id: string;
    data_id?: string;
}
/**
 * Validate a parsed JSON document against the named schema.
 * Returns structured result — does not throw on validation failure.
 */
export declare function validateDocument(schemaId: string, document: unknown, dataId?: string): ValidationResult;
/**
 * Validate a document and throw if invalid.
 * Produces a human-readable error summary.
 */
export declare function assertValid(schemaId: string, document: unknown, dataId?: string): void;
/**
 * Validate a scenario payload bundle:
 * scenario + all referenced subsystem documents.
 * §15.3 — reject if any referenced subsystem schema object is missing.
 */
export declare function validateScenarioBundle(scenario: unknown, subsystems: Record<string, unknown>): ValidationResult[];
/**
 * Clear validator cache — for testing use only.
 */
export declare function clearValidatorCache(): void;
//# sourceMappingURL=schema.d.ts.map