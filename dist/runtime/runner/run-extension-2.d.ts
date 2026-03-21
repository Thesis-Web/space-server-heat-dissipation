/**
 * Extension 2 Result Composer
 *
 * Governed by: model-extension-2-spec-v0.2.1 §13 (Math), §16 (Packet and Manifest Contract)
 * Runtime ledger: model-extension-2-runtime-ledger-v0.2.1 — Result composition section
 *
 * Responsibilities:
 *   - Compute baseline path unchanged (§13.1)
 *   - Compute exploratory path in parallel when enabled (§13.8–§13.12)
 *   - Compute delta path only from explicit baseline vs exploratory sections (§13.14)
 *   - Emit baseline_result, exploratory_result, delta_result per §16.2
 *   - Emit extension_2_summary and extension_2_stage_results per §16.2
 *   - Enforce §13.15: do not silently clamp for final output
 *
 * Non-negotiable:
 *   §3.3: baseline and exploratory results must remain separable
 *   §3.1: all numeric outputs are runtime-authoritative
 *   §16.3: deterministic IDs for derived objects
 */
import { NormalizedSpectralStage } from '../transforms/extension-2-normalizer';
import { Extension2ValidationReport } from '../validators/extension-2-bounds';
export interface BaselineState {
    /** Total baseline reject power [W]. */
    q_dot_baseline_reject_w: number;
    /** Baseline radiator area [m²]. */
    a_radiator_baseline_m2: number;
    /** Baseline radiator emissivity [dimensionless]. */
    epsilon_rad: number;
    /** Baseline radiator target temperature [K]. */
    t_rad_target_k: number;
    /** Effective sink temperature [K]. */
    t_sink_effective_k: number;
    /** Baseline radiator view factor [dimensionless]. */
    f_view: number;
}
export interface ZoneRejectState {
    zone_id: string;
    q_dot_reject_available_w: number;
    temperature_nominal_k: number;
}
export interface StageResult {
    spectral_stage_id: string;
    label: string;
    enabled: boolean;
    eta_stage_exploratory: number;
    q_dot_source_available_w: number;
    q_dot_stage_useful_w: number;
    q_dot_stage_residual_w: number;
    source_capture_fraction_used: number;
    _exploratory_label: 'EXPLORATORY_ONLY — not proven hardware performance';
}
export interface ExploratoryResult {
    q_dot_total_reject_exploratory_w: number;
    q_dot_recovered_or_retargeted_w: number;
    q_dot_stage_residual_total_w: number;
    a_radiator_exploratory_m2: number;
    stage_results: StageResult[];
    _exploratory_label: 'EXPLORATORY_ONLY — not proven hardware performance';
}
export interface DeltaResult {
    delta_q_dot_reject_w: number;
    delta_a_radiator_m2: number;
    baseline_q_dot_reject_w: number;
    exploratory_q_dot_reject_w: number;
    baseline_a_radiator_m2: number;
    exploratory_a_radiator_m2: number;
    provenance_note: string;
}
export interface Extension2Summary {
    extension_2_enabled: boolean;
    mode: string;
    stage_count_total: number;
    stage_count_enabled: number;
    research_required_stage_ids: string[];
    catalog_ids_used: string[];
    validation: Extension2ValidationReport;
}
export interface Extension2RunResult {
    baseline_result: BaselineState;
    exploratory_result: ExploratoryResult | null;
    delta_result: DeltaResult | null;
    extension_2_summary: Extension2Summary;
    extension_2_stage_results: StageResult[];
    exploratory_coefficients_summary: Record<string, unknown>;
}
/**
 * Compute effective radiator area from reject power.
 * Spec §13.13.
 *
 * A_effective = Q_dot_rad / (epsilon_rad × sigma × F_view × (T_rad^4 - T_sink^4))
 */
export declare function computeRadiatorAreaM2(qDotRadW: number, epsilonRad: number, fView: number, tRadTargetK: number, tSinkEffectiveK: number): number;
/**
 * Execute Extension 2 result composition.
 * Spec §13 (all subsections), §16.2.
 *
 * modelExtension2Mode governs which result sections are emitted:
 *   disabled        → only baseline_result preserved, no exploratory computation
 *   baseline_only   → baseline preserved, exploratory fields serialized but not computed
 *   exploratory_compare → baseline + exploratory + delta all emitted
 *   exploratory_only    → exploratory result only (baseline preserved but delta not emitted)
 */
export declare function runExtension2(modelExtension2Mode: string, strictResearchEnforcement: boolean, normalizedStages: NormalizedSpectralStage[], derivedProfiles: Array<Record<string, unknown>>, baselineState: BaselineState, zoneRejectMap: Map<string, ZoneRejectState>): Extension2RunResult;
//# sourceMappingURL=run-extension-2.d.ts.map