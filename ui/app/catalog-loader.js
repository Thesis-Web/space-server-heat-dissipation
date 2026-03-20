/**
 * catalog-loader.js — versioned catalog loader for browser UI
 * Governing law: ui-expansion-spec-v0.1.5 §4.1, §15, §8 (catalog-driven controls)
 *
 * Loads catalog JSON files from ui/app/catalogs/ relative paths.
 * Returns typed catalog objects with version and checksum metadata.
 * Catalog logic is data-only per spec §8 (no solver logic in catalogs).
 */

"use strict";

const CATALOG_PATHS = {
  "scenario-presets":       "catalogs/scenario-presets.v0.1.0.json",
  "compute-device-presets": "catalogs/compute-device-presets.v0.1.0.json",
  "payload-archetypes":     "catalogs/payload-archetypes.v0.1.0.json",
  "material-families":      "catalogs/material-families.v0.1.0.json",
  "branch-presets":         "catalogs/branch-presets.v0.1.0.json",
  "branding":               "catalogs/branding.v0.1.0.json",
};

/**
 * Load all catalogs concurrently.
 * Returns an object keyed by catalog id.
 * Each value: { catalog_id, catalog_version, entries[], raw_text, load_error? }
 */
export async function loadAllCatalogs(base_url = ".") {
  const results = {};
  await Promise.all(
    Object.entries(CATALOG_PATHS).map(async ([id, path]) => {
      try {
        const url = `${base_url}/${path}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const raw_text = await resp.text();
        const catalog = JSON.parse(raw_text);
        results[id] = { ...catalog, raw_text, load_error: null };
      } catch (e) {
        results[id] = {
          catalog_id: id,
          catalog_version: "unknown",
          entries: [],
          raw_text: "",
          load_error: e.message,
        };
      }
    })
  );
  return results;
}

/**
 * Lookup an entry in a loaded catalog by a key field value.
 * Returns the entry or null.
 */
export function lookupEntry(catalog, key_field, key_value) {
  if (!catalog || !catalog.entries) return null;
  return catalog.entries.find((e) => e[key_field] === key_value) ?? null;
}

/**
 * Build catalog_versions_used object for packet metadata.
 */
export function catalogVersionsUsed(catalogs) {
  const out = {};
  for (const [id, cat] of Object.entries(catalogs)) {
    out[id] = cat.catalog_version ?? "unknown";
  }
  return out;
}

/**
 * Build catalog_ids_used array for packet metadata.
 */
export function catalogIdsUsed(catalogs) {
  return Object.keys(catalogs).filter((id) => !catalogs[id].load_error);
}
