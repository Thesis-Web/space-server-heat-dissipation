/**
 * default-expander.ts
 * Default expansion transform — injects spec-declared defaults for omitted fields.
 * Governed by §26.4, §40, §4.3 (baseline).
 * Extension 3A defaults governed by 3A-spec §12.1–§12.2.
 * All injected defaults are surfaced as assumptions per §4.3 / §12.2.
 */
import { Assumption } from '../emitters/json-emitter';
export interface ExpandedDefaults {
    epsilon_rad: number;
    reserve_margin_fraction: number;
    t_sink_effective_k: number;
    t_ref_k: number;
    assumptions: Assumption[];
}
/**
 * Expand defaults for a scenario.
 * Every injected default is recorded as an assumption per §4.3 / §40.
 */
export declare function expandDefaults(overrides: {
    epsilon_rad?: number;
    reserve_margin_fraction?: number;
    t_sink_effective_k?: number;
    t_ref_k?: number;
    thermal_policy?: string;
}): ExpandedDefaults;
/**
 * 3A resistance chain sub-object with all terms defaulted to null.
 * §12.1: thermal-zone.resistance_chain defaults all sub-fields to null.
 */
export interface ResistanceChainDefaults {
    r_junction_to_case_k_per_w: null;
    r_case_to_spreader_k_per_w: null;
    r_spreader_to_pickup_nominal_k_per_w: null;
    r_pickup_to_loop_k_per_w: null;
    r_loop_to_sink_k_per_w: null;
}
/**
 * 3A convergence control with all spec-declared defaults injected.
 * §5.4, §12.1.
 */
export interface ConvergenceControlDefaults {
    max_iterations: number;
    tolerance_abs_w: number;
    tolerance_rel_fraction: number;
    runaway_multiplier: number;
    blocking_on_nonconvergence: boolean;
}
/**
 * Full 3A defaults expansion result.
 * Every injected default is recorded in defaults_applied[] per §12.2, §14.1.
 */
export interface Expanded3ADefaults {
    enable_model_extension_3a: false;
    model_extension_3a_mode: 'disabled';
    topology_validation_policy: string;
    convergence_control: ConvergenceControlDefaults;
    defaults_audit_version: string | null;
    zone_flow_direction: 'isolated';
    zone_isolation_boundary: false;
    zone_upstream_zone_ref: null;
    zone_downstream_zone_ref: null;
    zone_bridge_resistance_k_per_w: null;
    zone_working_fluid_ref: null;
    zone_pickup_geometry_ref: null;
    zone_convergence_enabled: false;
    zone_resistance_chain: null;
    radiator_geometry_mode: 'single_sided';
    radiator_face_b_area_m2: 0;
    radiator_face_b_view_factor: 0;
    radiator_surface_emissivity_eol_override: null;
    radiator_emissivity_degradation_fraction: null;
    radiator_cavity_emissivity_mode: 'disabled';
    radiator_cavity_view_factor: null;
    radiator_cavity_surface_emissivity: null;
    radiator_background_sink_temp_k_override: null;
    defaults_applied: string[];
}
/**
 * Expand all Extension 3A defaults for a scenario packet.
 * Applies §12.1 defaults table exactly. Every injection is recorded
 * in defaults_applied[] with field-path string per §14.1.
 *
 * NOTE: surface_emissivity_bol has NO silent default per §12.1 / §12.2.
 * If absent, the caller must block execution (§13.3 validation).
 *
 * @param overrides - any 3A fields already present in the packet
 * @returns full expanded 3A defaults + audit trail
 */
export declare function expand3ADefaults(overrides: {
    enable_model_extension_3a?: boolean | null;
    model_extension_3a_mode?: string | null;
    topology_validation_policy?: string | null;
    convergence_control?: Partial<ConvergenceControlDefaults> | null;
    defaults_audit_version?: string | null;
}): Expanded3ADefaults;
/**
 * Inject 3A per-zone defaults onto a mutable zone object.
 * Called by extension-3a-normalizer for each zone in thermal_zones[].
 * §12.1 zone-level defaults.
 * Returns array of field paths where defaults were injected.
 */
export declare function injectZone3ADefaults(zone: Record<string, unknown>): string[];
/**
 * Inject 3A per-radiator defaults onto a mutable radiator object.
 * Called by extension-3a-normalizer for each radiator.
 * NOTE: surface_emissivity_bol is NOT injected — it has no silent default per §12.2.
 * §12.1 radiator-level defaults.
 * Returns array of field paths where defaults were injected.
 */
export declare function injectRadiator3ADefaults(radiator: Record<string, unknown>, radiatorId: string): string[];
//# sourceMappingURL=default-expander.d.ts.map