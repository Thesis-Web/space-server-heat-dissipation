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
export declare function resolveCatalogEntry<T extends CatalogEntry>(catalog: CatalogFile, key_field: string, key_value: string): CatalogResolutionResult<T>;
/**
 * Build catalog_versions_used and catalog_checksums_sha256 entries for packet metadata.
 * Checksums are passed in as pre-computed SHA-256 hex strings.
 */
export declare function buildCatalogMetadata(loaded_catalogs: Array<{
    catalog: CatalogFile;
    sha256: string;
}>): {
    catalog_ids_used: string[];
    catalog_versions_used: Record<string, string>;
    catalog_checksums_sha256: Record<string, string>;
};
/**
 * Expand catalog defaults into a mutable state object.
 * Returns a transform_trace entry.
 */
export declare function expandCatalogDefaults(target: Record<string, unknown>, defaults: Record<string, unknown>, catalog_id: string, preset_id: string): string;
//# sourceMappingURL=catalog-resolution.d.ts.map