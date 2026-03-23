/**
 * extension-3a-normalizer.ts
 * Extension 3A field normalization transform.
 * Governing law: 3A-spec §5.3, §6, §9, §12; dist-tree patch §8.
 * Follows extension-2-normalizer.ts naming and structural pattern.
 *
 * Responsibilities:
 *  - Inject 3A defaults for absent fields (delegates to default-expander)
 *  - Normalize zone_role / convergence_enabled consistency
 *  - Normalize radiator 3A fields
 *  - Return a transform_trace for every mutation
 *  - Enforce legacy packet backward compat: absent enable_model_extension_3a → false (§5.3)
 *
 * This normalizer does NOT validate — it only normalizes.
 * Validation is the responsibility of topology.ts / extension-3a-bounds.ts / cross-reference.ts.
 */
export interface NormalizedZone3A {
    zone_id: string;
    zone_label?: string;
    zone_role?: string;
    flow_direction: string;
    isolation_boundary: boolean;
    upstream_zone_ref: string | null;
    downstream_zone_ref: string | null;
    bridge_resistance_k_per_w: number | null;
    working_fluid_ref: string | null;
    pickup_geometry_ref: string | null;
    convergence_enabled: boolean;
    resistance_chain: Record<string, number | null> | null;
    target_temp_k?: number;
    temp_min_k?: number;
    temp_max_k?: number;
    [key: string]: unknown;
}
export interface NormalizedRadiator3A {
    radiator_id: string;
    geometry_mode: string;
    face_a_area_m2?: number;
    face_b_area_m2: number;
    face_a_view_factor?: number;
    face_b_view_factor: number;
    surface_emissivity_bol?: number;
    surface_emissivity_eol_override: number | null;
    emissivity_degradation_fraction: number | null;
    cavity_emissivity_mode: string;
    cavity_view_factor: number | null;
    cavity_surface_emissivity: number | null;
    background_sink_temp_k_override: number | null;
    [key: string]: unknown;
}
export interface Extension3ANormalizationResult {
    enable_model_extension_3a: boolean;
    model_extension_3a_mode: string;
    topology_validation_policy: string;
    convergence_control: {
        max_iterations: number;
        tolerance_abs_w: number;
        tolerance_rel_fraction: number;
        runaway_multiplier: number;
        blocking_on_nonconvergence: boolean;
    };
    normalized_zones: NormalizedZone3A[];
    normalized_radiators: NormalizedRadiator3A[];
    defaults_applied: string[];
    transform_trace: string[];
}
/**
 * Normalize a scenario for Extension 3A processing.
 *
 * Backward compat (§5.3): a packet without enable_model_extension_3a is treated
 * as enable=false, mode=disabled — no 3A processing applied, no 3A errors raised.
 *
 * @param scenarioRaw  - parsed scenario object (may be pre-3A legacy)
 * @param radiatorsRaw - array of radiator objects (may be empty)
 * @returns normalized 3A fields + defaults audit trail
 */
export declare function normalizeExtension3A(scenarioRaw: Record<string, unknown>, radiatorsRaw?: Array<Record<string, unknown>>): Extension3ANormalizationResult;
//# sourceMappingURL=extension-3a-normalizer.d.ts.map