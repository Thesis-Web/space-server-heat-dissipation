/**
 * Catalog resolution transform — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §4.3 (allowed extension mechanism)
 *
 * Provides typed lookup helpers for all catalog families.
 * Catalog data is data-only JSON; this module handles resolution and trace.
 */

export interface CatalogEntry {
  [key: string]: unknown;
}

export interface CatalogFile {
  catalog_id: string;
  catalog_version: string;
  entries: CatalogEntry[];
}

export interface CatalogResolutionResult<T extends CatalogEntry> {
  found: boolean;
  entry: T | null;
  catalog_id: string;
  catalog_version: string;
  transform_trace_entry: string;
}

/**
 * Resolve an entry from a loaded catalog by a key field and value.
 * Returns a typed result and a transform_trace entry string.
 */
export function resolveCatalogEntry<T extends CatalogEntry>(
  catalog: CatalogFile,
  key_field: string,
  key_value: string
): CatalogResolutionResult<T> {
  const entry = catalog.entries.find((e) => e[key_field] === key_value) as T | undefined;
  const found = entry !== undefined;
  return {
    found,
    entry: entry ?? null,
    catalog_id: catalog.catalog_id,
    catalog_version: catalog.catalog_version,
    transform_trace_entry: `catalog-resolution: ${catalog.catalog_id}@${catalog.catalog_version} ${key_field}=${key_value} → ${found ? "found" : "not-found"}`,
  };
}

/**
 * Build catalog_versions_used and catalog_checksums_sha256 entries for packet metadata.
 * Checksums are passed in as pre-computed SHA-256 hex strings.
 */
export function buildCatalogMetadata(
  loaded_catalogs: Array<{ catalog: CatalogFile; sha256: string }>
): {
  catalog_ids_used: string[];
  catalog_versions_used: Record<string, string>;
  catalog_checksums_sha256: Record<string, string>;
} {
  const catalog_ids_used: string[] = [];
  const catalog_versions_used: Record<string, string> = {};
  const catalog_checksums_sha256: Record<string, string> = {};
  for (const { catalog, sha256 } of loaded_catalogs) {
    catalog_ids_used.push(catalog.catalog_id);
    catalog_versions_used[catalog.catalog_id] = catalog.catalog_version;
    catalog_checksums_sha256[catalog.catalog_id] = sha256;
  }
  return { catalog_ids_used, catalog_versions_used, catalog_checksums_sha256 };
}

/**
 * Expand catalog defaults into a mutable state object.
 * Returns a transform_trace entry.
 */
export function expandCatalogDefaults(
  target: Record<string, unknown>,
  defaults: Record<string, unknown>,
  catalog_id: string,
  preset_id: string
): string {
  for (const [k, v] of Object.entries(defaults)) {
    if (!(k in target) || target[k] === undefined || target[k] === null) {
      target[k] = v;
    }
  }
  return `catalog-default-expansion: ${catalog_id} preset=${preset_id}`;
}
