/**
 * types/ajv.d.ts
 *
 * Minimal ambient type declaration for the 'ajv' package.
 * Covers ONLY: Ajv class (default export), ValidateFunction, ErrorObject.
 * These are the three symbols imported by runtime/validators/schema.ts.
 *
 * Governing law:
 *   spec §26.3 — schema validator requires AJV draft-07 compilation
 *   import in schema.ts: import Ajv, { ValidateFunction, ErrorObject } from 'ajv'
 *
 * ENV-GATE-001 — approved by owner 2026-03-22
 * Purpose: environment normalization only. Zero runtime logic change.
 */

declare module 'ajv' {
  /**
   * AJV validation error object.
   * Used to report schema validation failures.
   * Spec §26.3 — schema validator surfaces errors via ValidationResult.errors.
   */
  interface ErrorObject {
    /** JSON Pointer path to the failing location in the data. */
    instancePath: string;
    /** Human-readable error message. */
    message?: string;
    /** Schema keyword that produced the error. */
    keyword?: string;
    /** Path within the schema. */
    schemaPath?: string;
    /** Additional params from the keyword. */
    params?: Record<string, unknown>;
    /** Arbitrary additional properties. */
    [key: string]: unknown;
  }

  /**
   * Compiled validator function returned by ajv.compile().
   * Calling it validates data and populates .errors on failure.
   */
  interface ValidateFunction {
    (data: unknown): boolean;
    errors?: ErrorObject[] | null;
  }

  /** AJV constructor options. Only the subset used in schema.ts is declared. */
  interface Options {
    /** Collect all errors rather than stopping at the first. */
    allErrors?: boolean;
    /** Strict mode setting. */
    strict?: boolean | 'log';
  }

  /**
   * AJV validator class.
   * spec §26.3 — instantiated in schema.ts with { allErrors: true, strict: false }.
   */
  class Ajv {
    constructor(opts?: Options);
    /** Compile a JSON schema into a reusable validator function. */
    compile(schema: Record<string, unknown>): ValidateFunction;
  }

  export default Ajv;
  export type { ValidateFunction, ErrorObject };
}
