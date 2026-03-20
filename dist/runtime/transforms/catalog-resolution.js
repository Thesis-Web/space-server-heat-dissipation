"use strict";
/**
 * Catalog resolution transform — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §4.3 (allowed extension mechanism)
 *
 * Provides typed lookup helpers for all catalog families.
 * Catalog data is data-only JSON; this module handles resolution and trace.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCatalogEntry = resolveCatalogEntry;
exports.buildCatalogMetadata = buildCatalogMetadata;
exports.expandCatalogDefaults = expandCatalogDefaults;
/**
 * Resolve an entry from a loaded catalog by a key field and value.
 * Returns a typed result and a transform_trace entry string.
 */
function resolveCatalogEntry(catalog, key_field, key_value) {
    const entry = catalog.entries.find((e) => e[key_field] === key_value);
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
function buildCatalogMetadata(loaded_catalogs) {
    const catalog_ids_used = [];
    const catalog_versions_used = {};
    const catalog_checksums_sha256 = {};
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
function expandCatalogDefaults(target, defaults, catalog_id, preset_id) {
    for (const [k, v] of Object.entries(defaults)) {
        if (!(k in target) || target[k] === undefined || target[k] === null) {
            target[k] = v;
        }
    }
    return `catalog-default-expansion: ${catalog_id} preset=${preset_id}`;
}
//# sourceMappingURL=catalog-resolution.js.map