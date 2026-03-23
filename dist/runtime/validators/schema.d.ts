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
/**
 * 3A schema IDs that must be resolvable in the schemas/ directory.
 * These are additive to the baseline schema set.
 */
export declare const EXTENSION_3A_SCHEMA_IDS: readonly ["working-fluid", "pickup-geometry"];
/**
 * Validate a working-fluid catalog entry against the working-fluid schema.
 * Used by 3A runtime to validate catalog entries before use.
 * §7.1, §13.2.
 */
export declare function validateWorkingFluidEntry(entry: unknown, entryId?: string): ValidationResult;
/**
 * Validate a pickup-geometry catalog entry against the pickup-geometry schema.
 * §8.1, §13.2.
 */
export declare function validatePickupGeometryEntry(entry: unknown, entryId?: string): ValidationResult;
/**
 * Validate a 3A-enabled scenario bundle:
 * scenario + radiator + thermal-zones + working-fluid entries + pickup-geometry entries.
 * §13 validation contract.
 * Returns all validation results. Caller checks for any !valid result.
 */
export declare function validateScenarioBundle3A(scenario: unknown, subsystems: Record<string, unknown>, workingFluidEntries?: unknown[], pickupGeometryEntries?: unknown[]): ValidationResult[];
//# sourceMappingURL=schema.d.ts.map