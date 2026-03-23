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
exports.resolveWorkingFluidRef = resolveWorkingFluidRef;
exports.resolvePickupGeometryRef = resolvePickupGeometryRef;
exports.resolveZoneCatalogRefs = resolveZoneCatalogRefs;
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
/**
 * Resolve a working_fluid_ref against the working-fluids catalog.
 * Returns found=false when ref does not resolve — caller must block per §13.2.
 * §7, §13.2.
 */
function resolveWorkingFluidRef(working_fluid_ref, catalog) {
    const result = resolveCatalogEntry(catalog, 'working_fluid_id', working_fluid_ref);
    return {
        found: result.found,
        entry: result.entry,
        working_fluid_ref,
        transform_trace_entry: result.transform_trace_entry,
    };
}
/**
 * Resolve a pickup_geometry_ref against the pickup-geometries catalog.
 * Returns found=false when ref does not resolve — caller must block per §13.2.
 * Returns nominal_resistance_multiplier=1.0 as safe fallback when not found
 * (caller must have already blocked on not-found; this prevents NaN propagation).
 * §8, §13.2.
 */
function resolvePickupGeometryRef(pickup_geometry_ref, catalog) {
    const result = resolveCatalogEntry(catalog, 'pickup_geometry_id', pickup_geometry_ref);
    return {
        found: result.found,
        entry: result.entry,
        pickup_geometry_ref,
        nominal_resistance_multiplier: result.entry?.nominal_resistance_multiplier ?? 1.0,
        transform_trace_entry: result.transform_trace_entry,
    };
}
/**
 * Resolve all working_fluid_refs and pickup_geometry_refs for a zones array.
 * Returns per-zone resolution results and a combined transform_trace.
 * Blocking violations (unresolved refs) are returned as error strings — caller enforces.
 * §13.2.
 */
function resolveZoneCatalogRefs(zones, workingFluidCatalog, pickupGeometryCatalog) {
    const workingFluidResults = new Map();
    const pickupGeometryResults = new Map();
    const transform_trace = [];
    const blocking_errors = [];
    for (const zone of zones) {
        const zoneId = String(zone.zone_id ?? 'unknown');
        const wfRef = zone.working_fluid_ref;
        if (wfRef) {
            const wfResult = resolveWorkingFluidRef(wfRef, workingFluidCatalog);
            workingFluidResults.set(zoneId, wfResult);
            transform_trace.push(wfResult.transform_trace_entry);
            if (!wfResult.found) {
                blocking_errors.push(`zone[${zoneId}].working_fluid_ref '${wfRef}' not found in catalog '${workingFluidCatalog.catalog_id}@${workingFluidCatalog.catalog_version}'. §13.2`);
            }
        }
        const pgRef = zone.pickup_geometry_ref;
        if (pgRef) {
            const pgResult = resolvePickupGeometryRef(pgRef, pickupGeometryCatalog);
            pickupGeometryResults.set(zoneId, pgResult);
            transform_trace.push(pgResult.transform_trace_entry);
            if (!pgResult.found) {
                blocking_errors.push(`zone[${zoneId}].pickup_geometry_ref '${pgRef}' not found in catalog '${pickupGeometryCatalog.catalog_id}@${pickupGeometryCatalog.catalog_version}'. §13.2`);
            }
        }
    }
    return { workingFluidResults, pickupGeometryResults, transform_trace, blocking_errors };
}
//# sourceMappingURL=catalog-resolution.js.map