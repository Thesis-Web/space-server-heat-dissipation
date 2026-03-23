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

// =============================================================================
// Extension 3A catalog resolution — working-fluid and pickup-geometry refs
// Governing law: 3A-spec §7, §8, §13.2; dist-tree patch §7 (catalog-resolution.ts patch target)
// =============================================================================

export interface WorkingFluidEntry extends CatalogEntry {
  working_fluid_id: string;
  label: string;
  fluid_class: string;
  phase_class: string;
  temp_operating_min_k: number;
  temp_operating_max_k: number;
  cp_basis_j_per_kgk: number;
  density_basis_kg_per_m3: number;
  thermal_conductivity_w_per_mk: number;
  viscosity_basis_pa_s: number;
  gamma_ratio: number | null;
  latent_heat_basis_j_per_kg: number | null;
  provenance_class: string;
  confidence_class: string;
  maturity_class: string;
  research_required: boolean;
  source_note: string;
}

export interface PickupGeometryEntry extends CatalogEntry {
  pickup_geometry_id: string;
  label: string;
  geometry_class: string;
  contact_mode: string;
  nominal_contact_area_fraction: number;
  nominal_spreading_factor: number;
  /** OUTPUT-DRIVING: applied as multiplier in resistance chain. §8.4. */
  nominal_resistance_multiplier: number;
  manufacturability_class: string;
  provenance_class: string;
  confidence_class: string;
  research_required: boolean;
  source_note: string;
}

export interface WorkingFluidResolutionResult {
  found: boolean;
  entry: WorkingFluidEntry | null;
  working_fluid_ref: string;
  transform_trace_entry: string;
}

export interface PickupGeometryResolutionResult {
  found: boolean;
  entry: PickupGeometryEntry | null;
  pickup_geometry_ref: string;
  /** Resolved multiplier to apply in resistance chain. §8.4. */
  nominal_resistance_multiplier: number;
  transform_trace_entry: string;
}

/**
 * Resolve a working_fluid_ref against the working-fluids catalog.
 * Returns found=false when ref does not resolve — caller must block per §13.2.
 * §7, §13.2.
 */
export function resolveWorkingFluidRef(
  working_fluid_ref: string,
  catalog: CatalogFile
): WorkingFluidResolutionResult {
  const result = resolveCatalogEntry<WorkingFluidEntry>(catalog, 'working_fluid_id', working_fluid_ref);
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
export function resolvePickupGeometryRef(
  pickup_geometry_ref: string,
  catalog: CatalogFile
): PickupGeometryResolutionResult {
  const result = resolveCatalogEntry<PickupGeometryEntry>(catalog, 'pickup_geometry_id', pickup_geometry_ref);
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
export function resolveZoneCatalogRefs(
  zones: Array<Record<string, unknown>>,
  workingFluidCatalog: CatalogFile,
  pickupGeometryCatalog: CatalogFile
): {
  workingFluidResults: Map<string, WorkingFluidResolutionResult>;
  pickupGeometryResults: Map<string, PickupGeometryResolutionResult>;
  transform_trace: string[];
  blocking_errors: string[];
} {
  const workingFluidResults = new Map<string, WorkingFluidResolutionResult>();
  const pickupGeometryResults = new Map<string, PickupGeometryResolutionResult>();
  const transform_trace: string[] = [];
  const blocking_errors: string[] = [];

  for (const zone of zones) {
    const zoneId = String(zone.zone_id ?? 'unknown');

    const wfRef = zone.working_fluid_ref as string | null | undefined;
    if (wfRef) {
      const wfResult = resolveWorkingFluidRef(wfRef, workingFluidCatalog);
      workingFluidResults.set(zoneId, wfResult);
      transform_trace.push(wfResult.transform_trace_entry);
      if (!wfResult.found) {
        blocking_errors.push(
          `zone[${zoneId}].working_fluid_ref '${wfRef}' not found in catalog '${workingFluidCatalog.catalog_id}@${workingFluidCatalog.catalog_version}'. §13.2`
        );
      }
    }

    const pgRef = zone.pickup_geometry_ref as string | null | undefined;
    if (pgRef) {
      const pgResult = resolvePickupGeometryRef(pgRef, pickupGeometryCatalog);
      pickupGeometryResults.set(zoneId, pgResult);
      transform_trace.push(pgResult.transform_trace_entry);
      if (!pgResult.found) {
        blocking_errors.push(
          `zone[${zoneId}].pickup_geometry_ref '${pgRef}' not found in catalog '${pickupGeometryCatalog.catalog_id}@${pickupGeometryCatalog.catalog_version}'. §13.2`
        );
      }
    }
  }

  return { workingFluidResults, pickupGeometryResults, transform_trace, blocking_errors };
}

// =============================================================================
// Extension 3B catalog resolution
// Governing law: 3B-spec §10, §12.1, §12.2, §12.3
// Blueprint: 3B-blueprint §5.4
// Resolves preset IDs against the three 3B preset catalogs.
// Does not replace or mutate 3A or baseline catalog resolution logic.
// =============================================================================

export interface Preset3BResolutionResult {
  preset_id: string;
  found: boolean;
  preset_entry: Record<string, unknown> | null;
  catalog_id: string;
  catalog_version: string;
  transform_trace_entry: string;
}

/**
 * Resolve a vault-gas-environment preset ID against its catalog.
 * 3B-spec §10.1, §12.1.
 */
export function resolveVaultGasPreset(
  presetId: string,
  catalog: { catalog_id: string; catalog_version: string; presets: Record<string, unknown>[] }
): Preset3BResolutionResult {
  const entry = catalog.presets.find(
    (p) => (p['preset_id'] as string) === presetId
  ) ?? null;
  return {
    preset_id: presetId,
    found: entry !== null,
    preset_entry: entry,
    catalog_id: catalog.catalog_id,
    catalog_version: catalog.catalog_version,
    transform_trace_entry: entry
      ? `vault-gas-preset resolved: '${presetId}' from '${catalog.catalog_id}@${catalog.catalog_version}'`
      : `vault-gas-preset NOT FOUND: '${presetId}' in '${catalog.catalog_id}@${catalog.catalog_version}' — 3B-spec §10.1`
  };
}

/**
 * Resolve a transport-implementation preset ID against its catalog.
 * 3B-spec §10.2, §12.2.
 */
export function resolveTransportImplementationPreset(
  presetId: string,
  catalog: { catalog_id: string; catalog_version: string; presets: Record<string, unknown>[] }
): Preset3BResolutionResult {
  const entry = catalog.presets.find(
    (p) => (p['preset_id'] as string) === presetId
  ) ?? null;
  return {
    preset_id: presetId,
    found: entry !== null,
    preset_entry: entry,
    catalog_id: catalog.catalog_id,
    catalog_version: catalog.catalog_version,
    transform_trace_entry: entry
      ? `transport-impl-preset resolved: '${presetId}' from '${catalog.catalog_id}@${catalog.catalog_version}'`
      : `transport-impl-preset NOT FOUND: '${presetId}' in '${catalog.catalog_id}@${catalog.catalog_version}' — 3B-spec §10.2`
  };
}

/**
 * Resolve an eclipse-state preset ID against its catalog.
 * 3B-spec §10.3, §12.3.
 */
export function resolveEclipseStatePreset(
  presetId: string,
  catalog: { catalog_id: string; catalog_version: string; presets: Record<string, unknown>[] }
): Preset3BResolutionResult {
  const entry = catalog.presets.find(
    (p) => (p['preset_id'] as string) === presetId
  ) ?? null;
  return {
    preset_id: presetId,
    found: entry !== null,
    preset_entry: entry,
    catalog_id: catalog.catalog_id,
    catalog_version: catalog.catalog_version,
    transform_trace_entry: entry
      ? `eclipse-state-preset resolved: '${presetId}' from '${catalog.catalog_id}@${catalog.catalog_version}'`
      : `eclipse-state-preset NOT FOUND: '${presetId}' in '${catalog.catalog_id}@${catalog.catalog_version}' — 3B-spec §10.3`
  };
}
