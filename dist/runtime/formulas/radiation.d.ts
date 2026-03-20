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
//# sourceMappingURL=radiation.d.ts.map