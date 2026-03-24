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
  // ── Extension 3B preset catalogs — 3B-spec §4.3, §10 ──────────────────────
  "vault-gas-environment-presets":    "catalogs/vault-gas-environment-presets.v0.1.0.json",
  "transport-implementation-presets": "catalogs/transport-implementation-presets.v0.1.0.json",
  "eclipse-state-presets":            "catalogs/eclipse-state-presets.v0.1.0.json",
};
