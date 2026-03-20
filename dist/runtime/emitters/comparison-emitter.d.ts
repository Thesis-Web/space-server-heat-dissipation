/**
 * comparison-emitter.ts
 * Comparison output emitter.
 * Governing spec: §34.5, §26.6.
 * Added per HOLE-008: required by §26.6, omitted from §43.
 */
import { RuntimeResult } from './json-emitter';
import { Flag } from './flag-emitter';
export interface ComparisonResult {
    base_scenario_id: string;
    variant_scenario_id: string;
    label: string;
    /** Delta thermal rejection (W). §34.5 */
    delta_q_dot_total_reject_w: number;
    /** Delta radiator effective area (m²). §34.5 */
    delta_a_radiator_effective_m2: number;
    /** Delta radiator area with margin (m²). */
    delta_a_radiator_with_margin_m2: number;
    /** Delta parasitic work (W). §34.5 */
    delta_w_dot_parasitic_w: number;
    /** Delta total mass estimate (kg). §34.5 */
    delta_mass_estimate_total_kg: number | null;
    /** New flags in variant not present in base. §34.5 */
    delta_flags: Flag[];
    /** Resolved flags in variant no longer present. */
    resolved_flags: Flag[];
    /** Absolute values for reference. */
    base_snapshot: ComparisonSnapshot;
    variant_snapshot: ComparisonSnapshot;
    generated_at: string;
}
export interface ComparisonSnapshot {
    scenario_id: string;
    q_dot_total_reject_w: number;
    a_radiator_effective_m2: number;
    a_radiator_with_margin_m2: number;
    t_radiator_target_k: number;
    w_dot_compute_w: number;
    w_dot_parasitic_w: number;
    mass_estimate_total_kg: number | null;
    flag_ids: string[];
}
/**
 * Compute a comparison between base and variant run results. §34.5.
 * Positive delta means variant is larger/worse; negative means smaller/better.
 */
export declare function computeComparison(base: RuntimeResult, variant: RuntimeResult, label?: string): ComparisonResult;
export declare function emitComparisonMarkdown(cmp: ComparisonResult): string;
//# sourceMappingURL=comparison-emitter.d.ts.map