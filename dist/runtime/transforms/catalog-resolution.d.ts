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
export declare function resolveWorkingFluidRef(working_fluid_ref: string, catalog: CatalogFile): WorkingFluidResolutionResult;
/**
 * Resolve a pickup_geometry_ref against the pickup-geometries catalog.
 * Returns found=false when ref does not resolve — caller must block per §13.2.
 * Returns nominal_resistance_multiplier=1.0 as safe fallback when not found
 * (caller must have already blocked on not-found; this prevents NaN propagation).
 * §8, §13.2.
 */
export declare function resolvePickupGeometryRef(pickup_geometry_ref: string, catalog: CatalogFile): PickupGeometryResolutionResult;
/**
 * Resolve all working_fluid_refs and pickup_geometry_refs for a zones array.
 * Returns per-zone resolution results and a combined transform_trace.
 * Blocking violations (unresolved refs) are returned as error strings — caller enforces.
 * §13.2.
 */
export declare function resolveZoneCatalogRefs(zones: Array<Record<string, unknown>>, workingFluidCatalog: CatalogFile, pickupGeometryCatalog: CatalogFile): {
    workingFluidResults: Map<string, WorkingFluidResolutionResult>;
    pickupGeometryResults: Map<string, PickupGeometryResolutionResult>;
    transform_trace: string[];
    blocking_errors: string[];
};
//# sourceMappingURL=catalog-resolution.d.ts.map