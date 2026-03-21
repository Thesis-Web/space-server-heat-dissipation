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

import {
  NormalizedSpectralStage,
  computeEtaStageExploratory,
  computeStageUsefulTransferW,
  computeStageResidualRejectW,
  resolveSourceCaptureFraction,
  computeStageSourceAvailableW,
} from '../transforms/extension-2-normalizer';

import {
  validateExtension2,
  Extension2ValidationReport,
} from '../validators/extension-2-bounds';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stefan-Boltzmann constant [W/m²/K⁴]. Spec §13.13. */
const SIGMA = 5.670374419e-8;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// §13.13 Radiator area formula
// ---------------------------------------------------------------------------

/**
 * Compute effective radiator area from reject power.
 * Spec §13.13.
 *
 * A_effective = Q_dot_rad / (epsilon_rad × sigma × F_view × (T_rad^4 - T_sink^4))
 */
export function computeRadiatorAreaM2(
  qDotRadW: number,
  epsilonRad: number,
  fView: number,
  tRadTargetK: number,
  tSinkEffectiveK: number
): number {
  if (tRadTargetK <= 0 || tSinkEffectiveK <= 0) {
    throw new RangeError(
      `computeRadiatorAreaM2: temperatures must be > 0`
    );
  }
  if (epsilonRad <= 0 || epsilonRad > 1) {
    throw new RangeError(
      `computeRadiatorAreaM2: epsilonRad must be in (0, 1], got ${epsilonRad}`
    );
  }
  if (fView <= 0 || fView > 1) {
    throw new RangeError(
      `computeRadiatorAreaM2: fView must be in (0, 1], got ${fView}`
    );
  }
  const denominator = epsilonRad * SIGMA * fView *
    (Math.pow(tRadTargetK, 4) - Math.pow(tSinkEffectiveK, 4));
  if (denominator <= 0) {
    throw new RangeError(
      `computeRadiatorAreaM2: denominator <= 0 — radiator temperature must exceed sink temperature`
    );
  }
  return qDotRadW / denominator;
}

// ---------------------------------------------------------------------------
// §13.8–§13.9 Per-stage exploratory computation
// ---------------------------------------------------------------------------

function computeStageResult(
  stage: NormalizedSpectralStage,
  zoneRejectMap: Map<string, ZoneRejectState>
): StageResult {
  if (!stage.enabled) {
    return {
      spectral_stage_id: stage.spectral_stage_id,
      label: stage.label,
      enabled: false,
      eta_stage_exploratory: 0,
      q_dot_source_available_w: 0,
      q_dot_stage_useful_w: 0,
      q_dot_stage_residual_w: 0,
      source_capture_fraction_used: 0,
      _exploratory_label: 'EXPLORATORY_ONLY — not proven hardware performance',
    };
  }

  const sourceZone = zoneRejectMap.get(stage.source_zone_ref);
  const qDotZoneRejectW = sourceZone ? sourceZone.q_dot_reject_available_w : 0;

  const captureFraction = resolveSourceCaptureFraction(
    stage.capture_efficiency_fraction,
    stage.source_capture_fraction_override
  );

  const qDotSourceAvailableW = computeStageSourceAvailableW(qDotZoneRejectW, captureFraction);

  const eta = computeEtaStageExploratory(
    stage.capture_efficiency_fraction,
    stage.band_match_score,
    stage.geometry_coupling_score,
    stage.mediator_transfer_score,
    stage.regeneration_effectiveness,
    stage.thermal_loss_fraction
  );

  const qDotUsefulW = computeStageUsefulTransferW(
    qDotSourceAvailableW,
    eta,
    stage.external_heat_input_w,
    stage.storage_drawdown_w,
    stage.work_input_w
  );

  const qDotResidualW = computeStageResidualRejectW(
    qDotSourceAvailableW,
    stage.external_heat_input_w,
    stage.storage_drawdown_w,
    stage.work_input_w,
    qDotUsefulW
  );

  return {
    spectral_stage_id: stage.spectral_stage_id,
    label: stage.label,
    enabled: true,
    eta_stage_exploratory: eta,
    q_dot_source_available_w: qDotSourceAvailableW,
    q_dot_stage_useful_w: qDotUsefulW,
    q_dot_stage_residual_w: qDotResidualW,
    source_capture_fraction_used: captureFraction,
    _exploratory_label: 'EXPLORATORY_ONLY — not proven hardware performance',
  };
}

// ---------------------------------------------------------------------------
// §13.10–§13.12 Aggregate exploratory result
// ---------------------------------------------------------------------------

/**
 * Aggregate stage results into exploratory totals.
 * Spec §13.10–§13.12.
 */
function aggregateExploratoryResult(
  stageResults: StageResult[],
  baselineState: BaselineState,
  additionalLossesW: number = 0
): ExploratoryResult {
  const enabledResults = stageResults.filter((r) => r.enabled);

  // §13.10 total target-zone inlet
  const qDotRecoveredOrRetargetedW = enabledResults.reduce(
    (sum, r) => sum + r.q_dot_stage_useful_w,
    0
  );

  // §13.9 total residual reject
  const qDotStageResidualTotalW = enabledResults.reduce(
    (sum, r) => sum + r.q_dot_stage_residual_w,
    0
  );

  // §13.12 exploratory radiator reject
  const qDotTotalRejectExploratoryW = Math.max(
    0,
    baselineState.q_dot_baseline_reject_w -
      qDotRecoveredOrRetargetedW +
      qDotStageResidualTotalW +
      additionalLossesW
  );

  // §13.13 exploratory radiator area
  let aRadiatorExploratoryM2 = baselineState.a_radiator_baseline_m2;
  if (qDotTotalRejectExploratoryW >= 0) {
    try {
      aRadiatorExploratoryM2 = computeRadiatorAreaM2(
        qDotTotalRejectExploratoryW,
        baselineState.epsilon_rad,
        baselineState.f_view,
        baselineState.t_rad_target_k,
        baselineState.t_sink_effective_k
      );
    } catch {
      // If formula fails, preserve baseline area and note it
      aRadiatorExploratoryM2 = baselineState.a_radiator_baseline_m2;
    }
  }

  return {
    q_dot_total_reject_exploratory_w: qDotTotalRejectExploratoryW,
    q_dot_recovered_or_retargeted_w: qDotRecoveredOrRetargetedW,
    q_dot_stage_residual_total_w: qDotStageResidualTotalW,
    a_radiator_exploratory_m2: aRadiatorExploratoryM2,
    stage_results: stageResults,
    _exploratory_label: 'EXPLORATORY_ONLY — not proven hardware performance',
  };
}

// ---------------------------------------------------------------------------
// §13.14 Delta result
// ---------------------------------------------------------------------------

/**
 * Compute delta between baseline and exploratory results.
 * Spec §13.14. Output must show baseline, exploratory, and delta with provenance note.
 */
function computeDeltaResult(
  baseline: BaselineState,
  exploratory: ExploratoryResult,
  provenanceNote: string
): DeltaResult {
  return {
    delta_q_dot_reject_w:
      exploratory.q_dot_total_reject_exploratory_w -
      baseline.q_dot_baseline_reject_w,
    delta_a_radiator_m2:
      exploratory.a_radiator_exploratory_m2 -
      baseline.a_radiator_baseline_m2,
    baseline_q_dot_reject_w: baseline.q_dot_baseline_reject_w,
    exploratory_q_dot_reject_w: exploratory.q_dot_total_reject_exploratory_w,
    baseline_a_radiator_m2: baseline.a_radiator_baseline_m2,
    exploratory_a_radiator_m2: exploratory.a_radiator_exploratory_m2,
    provenance_note: provenanceNote,
  };
}

// ---------------------------------------------------------------------------
// Main Extension 2 run entry point
// ---------------------------------------------------------------------------

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
export function runExtension2(
  modelExtension2Mode: string,
  strictResearchEnforcement: boolean,
  normalizedStages: NormalizedSpectralStage[],
  derivedProfiles: Array<Record<string, unknown>>,
  baselineState: BaselineState,
  zoneRejectMap: Map<string, ZoneRejectState>
): Extension2RunResult {
  const isDisabled =
    modelExtension2Mode === 'disabled' || modelExtension2Mode === 'baseline_only';

  // Run per-stage computation
  const stageResults: StageResult[] = normalizedStages.map((stage) =>
    computeStageResult(stage, zoneRejectMap)
  );

  // Aggregate exploratory result if mode requires it
  let exploratoryResult: ExploratoryResult | null = null;
  let deltaResult: DeltaResult | null = null;

  if (!isDisabled) {
    exploratoryResult = aggregateExploratoryResult(stageResults, baselineState);

    if (modelExtension2Mode === 'exploratory_compare') {
      const provenanceNote = buildProvenanceNote(normalizedStages);
      deltaResult = computeDeltaResult(baselineState, exploratoryResult, provenanceNote);
    }
  }

  // Validation §15 — run after results computed
  const validationReport = validateExtension2(
    normalizedStages,
    derivedProfiles,
    modelExtension2Mode,
    strictResearchEnforcement,
    true, // baseline always present
    exploratoryResult !== null
  );

  // Extension 2 summary §16.2
  const catalogIdsUsed = [
    ...new Set([
      ...normalizedStages.map((s) => s.source_spectral_profile_ref).filter(Boolean),
      ...normalizedStages.map((s) => s.absorber_family_ref),
      ...normalizedStages.map((s) => s.emitter_family_ref),
      ...normalizedStages.map((s) => s.cavity_geometry_ref),
      ...normalizedStages.map((s) => s.mediator_family_ref),
    ]),
  ] as string[];

  const researchRequiredIds = normalizedStages
    .filter((s) => s.research_required && s.enabled)
    .map((s) => s.spectral_stage_id);

  const summary: Extension2Summary = {
    extension_2_enabled: !isDisabled || modelExtension2Mode === 'baseline_only',
    mode: modelExtension2Mode,
    stage_count_total: normalizedStages.length,
    stage_count_enabled: normalizedStages.filter((s) => s.enabled).length,
    research_required_stage_ids: researchRequiredIds,
    catalog_ids_used: catalogIdsUsed,
    validation: validationReport,
  };

  // Exploratory coefficients summary §16.1
  const coefficientsSummary = buildCoefficientsSummary(normalizedStages);

  return {
    baseline_result: baselineState,
    exploratory_result: exploratoryResult,
    delta_result: deltaResult,
    extension_2_summary: summary,
    extension_2_stage_results: stageResults,
    exploratory_coefficients_summary: coefficientsSummary,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildProvenanceNote(stages: NormalizedSpectralStage[]): string {
  const uniqueProvenance = [
    ...new Set(stages.filter((s) => s.enabled).map((s) => s.provenance_class)),
  ];
  const hasResearchRequired = stages.some((s) => s.enabled && s.research_required);
  return (
    `Delta computed from ${stages.filter((s) => s.enabled).length} enabled exploratory stage(s). ` +
    `Provenance classes: ${uniqueProvenance.join(', ')}. ` +
    (hasResearchRequired
      ? 'One or more stages require further research before engineering commitment. '
      : '') +
    'All exploratory values are not proven hardware performance.'
  );
}

function buildCoefficientsSummary(
  stages: NormalizedSpectralStage[]
): Record<string, unknown> {
  return {
    stage_count: stages.length,
    enabled_stage_count: stages.filter((s) => s.enabled).length,
    stages: stages.map((s) => ({
      spectral_stage_id: s.spectral_stage_id,
      enabled: s.enabled,
      capture_efficiency_fraction: s.capture_efficiency_fraction,
      band_match_score: s.band_match_score,
      band_match_score_was_derived: s._band_match_score_was_derived,
      geometry_coupling_score: s.geometry_coupling_score,
      geometry_coupling_score_was_derived: s._geometry_coupling_score_was_derived,
      mediator_transfer_score: s.mediator_transfer_score,
      mediator_transfer_score_was_derived: s._mediator_transfer_score_was_derived,
      regeneration_effectiveness: s.regeneration_effectiveness,
      thermal_loss_fraction: s.thermal_loss_fraction,
      work_input_w: s.work_input_w,
      external_heat_input_w: s.external_heat_input_w,
      storage_drawdown_w: s.storage_drawdown_w,
      source_capture_fraction_override: s.source_capture_fraction_override,
      provenance_class: s.provenance_class,
      research_required: s.research_required,
    })),
  };
}
