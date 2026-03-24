/**
 * catalog-loader.js — versioned catalog loader for browser UI
 * Governing law: ui-expansion-spec-v0.1.5 §4.1, §15, §8 (catalog-driven controls)
 * 3B-spec §4.3, §10, §16: three new 3B preset catalogs added.
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
  "vault-gas-environment-presets":    "catalogs/vault-gas-environment-presets.v0.1.0.json",
  "transport-implementation-presets": "catalogs/transport-implementation-presets.v0.1.0.json",
  "eclipse-state-presets":            "catalogs/eclipse-state-presets.v0.1.0.json",
};

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

export function lookupEntry(catalog, key_field, key_value) {
  if (!catalog || !catalog.entries) return null;
  return catalog.entries.find((e) => e[key_field] === key_value) ?? null;
}

export function catalogVersionsUsed(catalogs) {
  const out = {};
  for (const [id, cat] of Object.entries(catalogs)) {
    out[id] = cat.catalog_version ?? "unknown";
  }
  return out;
}

export function catalogIdsUsed(catalogs) {
  return Object.keys(catalogs).filter((id) => !catalogs[id].load_error);
}

export function lookup3BPreset(catalog, preset_id) {
  if (!catalog || !Array.isArray(catalog.presets)) return null;
  return catalog.presets.find((p) => p.preset_id === preset_id) ?? null;
}

export function build3BCatalogVersions(catalogs) {
  return {
    vault_gas_environment_presets:
      catalogs["vault-gas-environment-presets"]?.catalog_version ?? null,
    transport_implementation_presets:
      catalogs["transport-implementation-presets"]?.catalog_version ?? null,
    eclipse_state_presets:
      catalogs["eclipse-state-presets"]?.catalog_version ?? null,
  };
}
