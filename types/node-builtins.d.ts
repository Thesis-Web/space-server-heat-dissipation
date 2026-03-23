/**
 * types/node-builtins.d.ts
 *
 * Minimal ambient type declarations for Node.js built-in modules and globals.
 * Covers ONLY the APIs used by the spec-governed runtime.
 * No additional surface is declared.
 *
 * Governing law:
 *   spec §26.3 — schema validator uses fs + path + __dirname
 *   spec §26.4 — payload-aggregation transform uses crypto.createHash
 *   spec §26.5 — run-h200-baseline runner uses process.stdout
 *
 * ENV-GATE-001 — approved by owner 2026-03-22
 * Purpose: environment normalization only. Zero runtime logic change.
 */

// ─── Node globals used by runtime ────────────────────────────────────────────

/** Current module directory path. Used in runtime/validators/schema.ts §26.3. */
declare const __dirname: string;

/** Current module file path. Declared for completeness; not actively used. */
declare const __filename: string;

/** Node.js process object. Only stdout.write is used (run-h200-baseline.ts §26.5). */
declare const process: {
  stdout: {
    write(buffer: string): boolean;
  };
};

// ─── fs module — spec §26.3 (schema validator) ───────────────────────────────

declare module 'fs' {
  /**
   * Check if a file or directory exists at the given path.
   * Used by schema.ts loadSchema() guard.
   */
  function existsSync(path: string): boolean;

  /**
   * Read a file as a UTF-8 string.
   * Used by schema.ts loadSchema() to read JSON schema files.
   */
  function readFileSync(path: string, encoding: BufferEncoding): string;

  type BufferEncoding =
    | 'ascii'
    | 'utf8'
    | 'utf-8'
    | 'utf16le'
    | 'ucs2'
    | 'ucs-2'
    | 'base64'
    | 'base64url'
    | 'latin1'
    | 'binary'
    | 'hex';
}

// ─── path module — spec §26.3 (schema validator) ─────────────────────────────

declare module 'path' {
  /**
   * Resolve a sequence of paths into an absolute path.
   * Used by schema.ts loadSchema() to build schemaDir.
   */
  function resolve(...paths: string[]): string;

  /**
   * Join path segments using the platform separator.
   * Used by schema.ts loadSchema() to build schemaFile.
   */
  function join(...paths: string[]): string;
}

// ─── Buffer global — spec §26.6 (packet-metadata-emitter) ───────────────────
//
// Buffer.byteLength(string, encoding) is used by packet-metadata-emitter.ts
// to compute byte lengths for the 3A artifact manifest entries.

declare class Buffer {
  /**
   * Returns the byte length of a string when encoded.
   * Used by packet-metadata-emitter.ts §26.6.
   */
  static byteLength(string: string, encoding?: string): number;
}

// ─── crypto module — spec §26.4 (payload-aggregation transform) ──────────────

declare module 'crypto' {
  /** Hash object returned by createHash. */
  interface Hash {
    /** Feed data into the hash. Returns this for chaining. */
    update(data: string): Hash;
    /** Produce the digest as a hex string. */
    digest(encoding: string): string;
  }

  /**
   * Create a hash object for the given algorithm.
   * Used by payload-aggregation.ts to produce deterministic IDs.
   */
  function createHash(algorithm: string): Hash;
}
