/**
 * Radiation formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.5–18.6, §18.10
 *
 * All formulas are authoritative runtime computations.
 * UI display-only previews are subordinate to these results.
 */
export interface RadiatorSizingInput {
    q_dot_w: number;
    emissivity: number;
    view_factor: number;
    t_radiator_target_k: number;
    t_sink_k: number;
    reserve_margin_fraction: number;
}
export interface RadiatorSizingOutput {
    a_radiator_effective_m2: number;
    a_with_margin_m2: number;
    q_dot_check_w: number;
    sigma: number;
}
/**
 * Compute effective radiator area required to reject q_dot_w.
 * Law: A = Q / (ε × σ × F × (T^4 - T_sink^4))
 * Spec §18.5
 */
export declare function radiatorEffectiveArea(input: RadiatorSizingInput): RadiatorSizingOutput;
/**
 * Compute achieved rejection for a known radiator area.
 * Q = ε × σ × F × A × (T^4 - T_sink^4)
 */
export declare function radiatorAchievedRejection(emissivity: number, view_factor: number, area_m2: number, t_radiator_k: number, t_sink_k: number): number;
/**
 * Regression anchor verification per ui-expansion-spec-v0.1.5 §18.10.
 * Q=50000 W, ε=0.90, F=1.0, T=1200 K, T_sink=0 K → A = 0.4725 m² (4 decimals)
 */
export declare function verifyRegressionAnchor(): {
    pass: boolean;
    computed: number;
    expected: number;
};
export interface RadiatorAreaInput {
    q_dot_required_w: number;
    t_radiator_target_k: number;
    emissivity: number;
    t_sink_effective_k: number;
    reserve_margin_fraction: number;
    view_factor?: number;
}
export interface RadiatorAreaResult {
    a_radiator_effective_m2: number;
    a_radiator_with_margin_m2: number;
}
/**
 * Compute required radiator area for a given rejection requirement.
 * Delegates to radiatorEffectiveArea. view_factor defaults to 1.0 per §40.
 * FIX-002: adapter required by ANCHOR runner (run-scenario.ts).
 */
export declare function computeRadiatorArea(input: RadiatorAreaInput): RadiatorAreaResult;
/**
 * Compute epsilon_eol from declared inputs. §11.7.
 * Priority: eol_override > bol*(1-degradation) > bol (when degradation=null).
 */
export declare function resolveEpsilonEol(epsilon_bol: number, eol_override: number | null, degradation_fraction: number | null): number;
/**
 * Gray cavity effective emissivity approximation. §11.6.
 * epsilon_cavity = 1 / ( (1/epsilon_surface) + ((1 - F_cavity) / F_cavity) )
 * Clamp to (0,1].
 * Physical basis: two-surface gray-body enclosure exchange factor. Incropera & DeWitt Ch.13.
 */
export declare function computeGrayCavityEmissivity(epsilon_surface: number, f_cavity: number): number;
/**
 * Resolve effective emissivity for a single face considering cavity mode.
 * §11.5 (surface_only), §11.6 (gray_cavity_approx).
 */
export declare function resolveEffectiveEmissivity(epsilon: number, cavity_emissivity_mode: 'disabled' | 'surface_only' | 'gray_cavity_approx', cavity_view_factor: number | null, cavity_surface_emissivity: number | null): number;
export interface RadiatorFaceInput {
    epsilon_effective: number;
    area_m2: number;
    view_factor: number;
}
/**
 * Compute heat rejection for one radiator face. §11.8.
 * Q_face = epsilon_eff * sigma * A * F * (T_rad^4 - T_sink^4)
 */
export declare function computeFaceRejection(face: RadiatorFaceInput, t_rad_k: number, t_sink_k: number): number;
/**
 * Compute total radiator heat rejection (two-sided). §11.8.
 * Face B area=0 and F_b=0 for single_sided — no special case needed.
 */
export declare function computeTwoSidedRejection(face_a: RadiatorFaceInput, face_b: RadiatorFaceInput, t_rad_k: number, t_sink_k: number): {
    q_face_a_w: number;
    q_face_b_w: number;
    q_total_w: number;
};
export interface Radiator3ASizingInput {
    radiator_id: string;
    geometry_mode: 'single_sided' | 'double_sided_symmetric' | 'double_sided_asymmetric';
    face_a_view_factor: number;
    face_b_view_factor: number;
    surface_emissivity_bol: number;
    surface_emissivity_eol_override: number | null;
    emissivity_degradation_fraction: number | null;
    cavity_emissivity_mode: 'disabled' | 'surface_only' | 'gray_cavity_approx';
    cavity_view_factor: number | null;
    cavity_surface_emissivity: number | null;
    /** From §9.4 T_sink resolution chain */
    t_sink_resolved_k: number;
    t_rad_k: number;
    q_dot_required_w: number;
    /** For reserve margin check */
    reserve_margin_fraction: number;
    declared_area_m2?: number | null;
}
export interface Radiator3ASizingOutput {
    radiator_id: string;
    epsilon_effective_bol: number;
    epsilon_effective_eol: number;
    effective_emissive_factor_bol: number;
    effective_emissive_factor_eol: number;
    a_bol_required_m2: number;
    a_eol_required_m2: number;
    a_delta_m2: number;
    reserve_margin_sufficient: boolean | null;
    t_sink_resolved_k: number;
    sigma_used: number;
}
/**
 * Compute BOL and EOL radiator area requirements. §11.9.
 * Uses §11.7 for epsilon_eol and §11.6 for cavity effective emissivity.
 * Works for single_sided and double_sided_symmetric. Asymmetric: assigns all to face A.
 */
export declare function computeRadiator3ASizing(input: Radiator3ASizingInput): Radiator3ASizingOutput;
/**
 * Resolve T_sink per §9.4 priority chain:
 * 1. background_sink_temp_k_override on radiator
 * 2. environment_profile.sink_temperature_k on scenario
 * 3. Block — return null (caller must block execution)
 */
export declare function resolveRadiatorTSink(background_sink_temp_k_override: number | null | undefined, environment_profile_sink_temperature_k: number | null | undefined): {
    t_sink_k: number | null;
    source: 'override' | 'environment_profile' | 'unresolved';
};
export interface RadiationPressureResult {
    q_doubleprime_w_per_m2: number;
    p_rad_pa: number;
    f_rad_n: number;
}
/**
 * Compute radiation-pressure screening metrics. §11.10.
 * Flag-only — no propagation engine. §3.6.
 *
 * p_rad = q'' / c
 * F_rad = p_rad * A_projected * C_r
 * C_r defaults to 1.0 per §11.10.
 */
export declare function computeRadiationPressure(q_dot_total_w: number, a_projected_m2: number, c_r?: number): RadiationPressureResult;
//# sourceMappingURL=radiation.d.ts.map