/**
 * Extension 2 Normalization Layer
 *
 * Governed by: model-extension-2-spec-v0.2.1 §13 (Required Math and Accounting)
 * Runtime ledger: model-extension-2-runtime-ledger-v0.2.1 — Normalization section
 *
 * Responsibilities:
 *   - Normalize scenario extension flags (§5.3)
 *   - Derive band match score from catalog refs (§13.4)
 *   - Derive geometry coupling score from catalog refs (§13.5)
 *   - Derive mediator transfer score from catalog refs (§13.6)
 *   - Serialize all defaults explicitly per §11.5 (no-hidden-default rule)
 *   - Normalize derived source profiles when no catalog ref is selected (§6.5)
 *
 * Non-negotiable rules enforced here:
 *   - §3.2: No exploratory coefficient implied by UI alone without schema-serialized state
 *   - §3.5: Every coefficient must have explicit serialized value after normalization
 *   - §11.5: If any score not explicitly provided, use catalog default and serialize it
 *   - §13.15: Clamping for preview only — validation layer enforces final bounds
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Wien displacement law constant [µm·K]. Spec §6.4, §13.3 */
const WIEN_CONSTANT_UM_K = 2897.771955;

/** Small epsilon to prevent division-by-zero in band width calculations. Spec §13.4 */
const BAND_WIDTH_EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Type declarations — minimal interfaces for normalization layer
// ---------------------------------------------------------------------------

export interface SourceSpectralProfileEntry {
  profile_id: string;
  wavelength_band_min_um: number;
  wavelength_band_max_um: number;
  temperature_basis_nominal_k: number;
  provenance_class: string;
  maturity_class: string;
  confidence_class: string;
  research_required: boolean;
}

export interface AbsorberFamilyEntry {
  absorber_family_id: string;
  wavelength_band_min_um: number;
  wavelength_band_max_um: number;
}

export interface CavityGeometryEntry {
  cavity_geometry_id: string;
  optical_access_factor: number;
  nominal_view_factor: number;
  nominal_path_length_factor: number;
}

export interface MediatorFamilyEntry {
  mediator_family_id: string;
  nominal_thermal_buffer_fraction: number;
  temperature_nominal_k: number;
}

export interface SpectralStageInput {
  spectral_stage_id: string;
  label: string;
  enabled: boolean;
  source_zone_ref: string;
  target_zone_ref: string;
  source_spectral_profile_ref: string | null;
  absorber_family_ref: string;
  emitter_family_ref: string;
  cavity_geometry_ref: string;
  mediator_family_ref: string;
  stage_mode: string;
  capture_efficiency_fraction: number;
  band_match_score: number | null;
  geometry_coupling_score: number | null;
  mediator_transfer_score: number | null;
  regeneration_effectiveness: number;
  thermal_loss_fraction: number;
  work_input_w: number;
  external_heat_input_w: number;
  storage_drawdown_w: number;
  source_capture_fraction_override: number | null;
  notes: string[];
  provenance_class: string;
  maturity_class: string;
  confidence_class: string;
  research_required: boolean;
}

export interface NormalizedSpectralStage extends SpectralStageInput {
  // All scores are guaranteed non-null after normalization
  band_match_score: number;
  geometry_coupling_score: number;
  mediator_transfer_score: number;
  _band_match_score_was_derived: boolean;
  _geometry_coupling_score_was_derived: boolean;
  _mediator_transfer_score_was_derived: boolean;
}

export interface DerivedSourceProfile {
  derived_profile_id: string;
  basis_temperature_k: number;
  lambda_peak_um: number;
  wavelength_band_min_um: number;
  wavelength_band_max_um: number;
  provenance_class: 'placeholder';
  research_required: true;
  _derivation_method: 'wien_law_helper';
}

export interface Extension2NormalizationResult {
  normalized_stages: NormalizedSpectralStage[];
  derived_source_profiles: DerivedSourceProfile[];
  normalization_warnings: string[];
  normalization_errors: string[];
}

// ---------------------------------------------------------------------------
// §6.4 Wien-law helper — display/exploratory support only
// ---------------------------------------------------------------------------

/**
 * Compute peak emission wavelength via Wien displacement law.
 * Spec §6.4, §13.3: helper for display or exploratory support only.
 * Must not affect baseline. Result must be serialized if used in derived profile.
 */
export function wienPeakWavelengthUm(temperatureK: number): number {
  if (temperatureK <= 0) {
    throw new RangeError(
      `wienPeakWavelengthUm: temperature_k must be > 0, got ${temperatureK}`
    );
  }
  return WIEN_CONSTANT_UM_K / temperatureK;
}

// ---------------------------------------------------------------------------
// §13.4 Band overlap helper
// ---------------------------------------------------------------------------

/**
 * Compute normalized band match score from source and absorber band definitions.
 * Spec §13.4.
 *
 * band_overlap_width_um = max(0, min(source_max, absorber_max) - max(source_min, absorber_min))
 * source_band_width_um  = max(source_max - source_min, epsilon)
 * band_match_score      = clamp(overlap / source_band_width, 0, 1)
 */
export function computeBandMatchScore(
  sourceMinUm: number,
  sourceMaxUm: number,
  absorberMinUm: number,
  absorberMaxUm: number
): number {
  const overlapWidth = Math.max(
    0,
    Math.min(sourceMaxUm, absorberMaxUm) - Math.max(sourceMinUm, absorberMinUm)
  );
  const sourceBandWidth = Math.max(sourceMaxUm - sourceMinUm, BAND_WIDTH_EPSILON);
  return clamp(overlapWidth / sourceBandWidth, 0, 1);
}

// ---------------------------------------------------------------------------
// §13.5 Geometry coupling helper
// ---------------------------------------------------------------------------

/**
 * Compute bounded exploratory geometry coupling from cavity catalog entry.
 * Spec §13.5.
 *
 * geometry_coupling_effective = clamp(
 *   optical_access_factor × nominal_view_factor × min(1, 1 / nominal_path_length_factor),
 *   0, 1
 * )
 *
 * Result may populate default for geometry_coupling_score.
 * Normalized score must still be serialized explicitly per §11.5.
 */
export function computeGeometryCouplingEffective(
  opticalAccessFactor: number,
  nominalViewFactor: number,
  nominalPathLengthFactor: number
): number {
  if (nominalPathLengthFactor <= 0) {
    throw new RangeError(
      `computeGeometryCouplingEffective: nominalPathLengthFactor must be > 0, got ${nominalPathLengthFactor}`
    );
  }
  const raw =
    opticalAccessFactor *
    nominalViewFactor *
    Math.min(1, 1 / nominalPathLengthFactor);
  return clamp(raw, 0, 1);
}

// ---------------------------------------------------------------------------
// §13.6 Mediator transfer helper
// ---------------------------------------------------------------------------

/**
 * Compute bounded exploratory mediator transfer effectiveness.
 * Spec §13.6.
 *
 * mediator_transfer_effective = clamp(
 *   nominal_thermal_buffer_fraction × min(1, T_stage_nominal_k / T_target_nominal_k),
 *   0, 1
 * )
 *
 * Both denominator terms must remain > 0.
 * Result may populate default for mediator_transfer_score.
 * Normalized score must still be serialized explicitly per §11.5.
 */
export function computeMediatorTransferEffective(
  nominalThermalBufferFraction: number,
  stageNominalK: number,
  targetNominalK: number
): number {
  if (stageNominalK <= 0) {
    throw new RangeError(
      `computeMediatorTransferEffective: stageNominalK must be > 0, got ${stageNominalK}`
    );
  }
  if (targetNominalK <= 0) {
    throw new RangeError(
      `computeMediatorTransferEffective: targetNominalK must be > 0, got ${targetNominalK}`
    );
  }
  const raw =
    nominalThermalBufferFraction *
    Math.min(1, stageNominalK / targetNominalK);
  return clamp(raw, 0, 1);
}

// ---------------------------------------------------------------------------
// §13.7 Stage exploratory transfer factor
// ---------------------------------------------------------------------------

/**
 * Compute eta_stage_exploratory from all normalized coefficients.
 * Spec §13.7.
 *
 * eta = capture_efficiency × band_match × geometry_coupling × mediator_transfer
 *       × regeneration_effectiveness × (1 - thermal_loss_fraction)
 *
 * Enforced: 0 <= eta <= 1
 */
export function computeEtaStageExploratory(
  captureEfficiencyFraction: number,
  bandMatchScore: number,
  geometryCouplingScore: number,
  mediatorTransferScore: number,
  regenerationEffectiveness: number,
  thermalLossFraction: number
): number {
  const raw =
    captureEfficiencyFraction *
    bandMatchScore *
    geometryCouplingScore *
    mediatorTransferScore *
    regenerationEffectiveness *
    (1 - thermalLossFraction);
  return clamp(raw, 0, 1);
}

// ---------------------------------------------------------------------------
// §13.8 Exploratory useful transfer
// ---------------------------------------------------------------------------

/**
 * Compute stage useful transfer power.
 * Spec §13.8. Must be labeled exploratory — not proven hardware performance.
 *
 * Q_useful = Q_source_available × eta_stage + external_heat + storage_drawdown + work_input
 */
export function computeStageUsefulTransferW(
  qDotSourceAvailableW: number,
  etaStageExploratory: number,
  externalHeatInputW: number,
  storageDrawdownW: number,
  workInputW: number
): number {
  return (
    qDotSourceAvailableW * etaStageExploratory +
    externalHeatInputW +
    storageDrawdownW +
    workInputW
  );
}

// ---------------------------------------------------------------------------
// §13.9 Stage residual reject
// ---------------------------------------------------------------------------

/**
 * Compute stage residual reject power.
 * Spec §13.9.
 *
 * Q_residual = max(0, Q_source_available + external + drawdown + work - Q_useful)
 */
export function computeStageResidualRejectW(
  qDotSourceAvailableW: number,
  externalHeatInputW: number,
  storageDrawdownW: number,
  workInputW: number,
  qDotStageUsefulW: number
): number {
  return Math.max(
    0,
    qDotSourceAvailableW +
      externalHeatInputW +
      storageDrawdownW +
      workInputW -
      qDotStageUsefulW
  );
}

// ---------------------------------------------------------------------------
// §13.2 Baseline heat source estimate
// ---------------------------------------------------------------------------

/**
 * Determine source capture fraction for a stage.
 * Spec §13.2.
 *
 * If source_capture_fraction_override is provided, use it.
 * Otherwise use capture_efficiency_fraction.
 */
export function resolveSourceCaptureFraction(
  captureEfficiencyFraction: number,
  sourceCaptureOverride: number | null
): number {
  if (sourceCaptureOverride !== null && sourceCaptureOverride !== undefined) {
    return clamp(sourceCaptureOverride, 0, 1);
  }
  return clamp(captureEfficiencyFraction, 0, 1);
}

/**
 * Compute source-available power for a stage.
 * Spec §13.2.
 *
 * Q_stage_source_available = Q_zone_reject_available × source_capture_fraction
 */
export function computeStageSourceAvailableW(
  qDotZoneRejectAvailableW: number,
  sourceCaptureF: number
): number {
  return qDotZoneRejectAvailableW * clamp(sourceCaptureF, 0, 1);
}

// ---------------------------------------------------------------------------
// Full stage normalization — serializes all derived defaults
// ---------------------------------------------------------------------------

/**
 * Normalize a single spectral stage, deriving and serializing all score defaults.
 * Per spec §11.5 no-hidden-default rule: if score not provided, compute from catalog
 * and serialize it; flag the stage accordingly.
 *
 * Returns NormalizedSpectralStage with all scores non-null and derivation flags set.
 */
export function normalizeSpectralStage(
  stage: SpectralStageInput,
  sourceProfile: SourceSpectralProfileEntry | null,
  absorberFamily: AbsorberFamilyEntry | null,
  cavityGeometry: CavityGeometryEntry | null,
  mediatorFamily: MediatorFamilyEntry | null,
  targetZoneNominalK: number
): { normalized: NormalizedSpectralStage; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // --- Band match score §13.4 ---
  let bandMatchScore: number;
  let bandMatchWasDerived = false;

  if (stage.band_match_score !== null && stage.band_match_score !== undefined) {
    bandMatchScore = clamp(stage.band_match_score, 0, 1);
  } else if (sourceProfile !== null && absorberFamily !== null) {
    bandMatchScore = computeBandMatchScore(
      sourceProfile.wavelength_band_min_um,
      sourceProfile.wavelength_band_max_um,
      absorberFamily.wavelength_band_min_um,
      absorberFamily.wavelength_band_max_um
    );
    bandMatchWasDerived = true;
    warnings.push(
      `Stage ${stage.spectral_stage_id}: band_match_score derived from catalog (${bandMatchScore.toFixed(4)}); serialized per §11.5.`
    );
  } else {
    // Cannot compute — flag incomplete per §11.5
    bandMatchScore = 0;
    errors.push(
      `Stage ${stage.spectral_stage_id}: band_match_score not provided and catalog refs insufficient to derive. Stage flagged incomplete per §11.5.`
    );
  }

  // --- Geometry coupling score §13.5 ---
  let geometryCouplingScore: number;
  let geometryCouplingWasDerived = false;

  if (stage.geometry_coupling_score !== null && stage.geometry_coupling_score !== undefined) {
    geometryCouplingScore = clamp(stage.geometry_coupling_score, 0, 1);
  } else if (cavityGeometry !== null) {
    geometryCouplingScore = computeGeometryCouplingEffective(
      cavityGeometry.optical_access_factor,
      cavityGeometry.nominal_view_factor,
      cavityGeometry.nominal_path_length_factor
    );
    geometryCouplingWasDerived = true;
    warnings.push(
      `Stage ${stage.spectral_stage_id}: geometry_coupling_score derived from catalog (${geometryCouplingScore.toFixed(4)}); serialized per §11.5.`
    );
  } else {
    geometryCouplingScore = 0;
    errors.push(
      `Stage ${stage.spectral_stage_id}: geometry_coupling_score not provided and cavity geometry catalog ref missing. Stage flagged incomplete per §11.5.`
    );
  }

  // --- Mediator transfer score §13.6 ---
  let mediatorTransferScore: number;
  let mediatorTransferWasDerived = false;

  if (stage.mediator_transfer_score !== null && stage.mediator_transfer_score !== undefined) {
    mediatorTransferScore = clamp(stage.mediator_transfer_score, 0, 1);
  } else if (mediatorFamily !== null && targetZoneNominalK > 0) {
    mediatorTransferScore = computeMediatorTransferEffective(
      mediatorFamily.nominal_thermal_buffer_fraction,
      mediatorFamily.temperature_nominal_k,
      targetZoneNominalK
    );
    mediatorTransferWasDerived = true;
    warnings.push(
      `Stage ${stage.spectral_stage_id}: mediator_transfer_score derived from catalog (${mediatorTransferScore.toFixed(4)}); serialized per §11.5.`
    );
  } else {
    mediatorTransferScore = 0;
    errors.push(
      `Stage ${stage.spectral_stage_id}: mediator_transfer_score not provided and mediator catalog or target zone nominal K unavailable. Stage flagged incomplete per §11.5.`
    );
  }

  const normalized: NormalizedSpectralStage = {
    ...stage,
    band_match_score: bandMatchScore,
    geometry_coupling_score: geometryCouplingScore,
    mediator_transfer_score: mediatorTransferScore,
    _band_match_score_was_derived: bandMatchWasDerived,
    _geometry_coupling_score_was_derived: geometryCouplingWasDerived,
    _mediator_transfer_score_was_derived: mediatorTransferWasDerived,
  };

  return { normalized, warnings, errors };
}

// ---------------------------------------------------------------------------
// Derived source profile builder — §6.5
// ---------------------------------------------------------------------------

/**
 * Build a derived source profile from a basis temperature when no catalog ref is selected.
 * Spec §6.5: packet must include enough info to reproduce derivation deterministically.
 */
export function buildDerivedSourceProfile(
  basisTemperatureK: number,
  stageId: string
): DerivedSourceProfile {
  if (basisTemperatureK <= 0) {
    throw new RangeError(
      `buildDerivedSourceProfile: basis_temperature_k must be > 0, got ${basisTemperatureK}`
    );
  }
  const lambdaPeakUm = wienPeakWavelengthUm(basisTemperatureK);
  // Approximate ±30% band around Wien peak for generic derived profile
  const bandHalfWidthFraction = 0.30;
  return {
    derived_profile_id: `derived_wien_${stageId}_${Math.round(basisTemperatureK)}k`,
    basis_temperature_k: basisTemperatureK,
    lambda_peak_um: lambdaPeakUm,
    wavelength_band_min_um: lambdaPeakUm * (1 - bandHalfWidthFraction),
    wavelength_band_max_um: lambdaPeakUm * (1 + bandHalfWidthFraction),
    provenance_class: 'placeholder',
    research_required: true,
    _derivation_method: 'wien_law_helper',
  };
}

// ---------------------------------------------------------------------------
// Scenario-level Extension 2 normalization entry point
// ---------------------------------------------------------------------------

/**
 * Normalize Extension 2 state for a scenario.
 * If enable_model_extension_2 = false, returns empty result.
 * If mode is baseline_only, exploratory fields are serialized but not computed.
 * Per spec §5.3.
 */
export function normalizeExtension2(
  scenarioExt2Enabled: boolean,
  stages: SpectralStageInput[],
  catalogResolverFn: (
    stage: SpectralStageInput
  ) => {
    sourceProfile: SourceSpectralProfileEntry | null;
    absorberFamily: AbsorberFamilyEntry | null;
    cavityGeometry: CavityGeometryEntry | null;
    mediatorFamily: MediatorFamilyEntry | null;
    targetZoneNominalK: number;
  }
): Extension2NormalizationResult {
  if (!scenarioExt2Enabled) {
    // Per spec §5.3: if disabled, all Extension 2 fields absent/null/ignored
    return {
      normalized_stages: [],
      derived_source_profiles: [],
      normalization_warnings: [],
      normalization_errors: [],
    };
  }

  const normalizedStages: NormalizedSpectralStage[] = [];
  const derivedProfiles: DerivedSourceProfile[] = [];
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  for (const stage of stages) {
    const resolved = catalogResolverFn(stage);

    // Build derived source profile if no catalog ref per §6.5
    let effectiveSourceProfile = resolved.sourceProfile;
    if (stage.source_spectral_profile_ref === null && stage.enabled) {
      // No catalog ref — cannot derive without basis temperature; log
      allWarnings.push(
        `Stage ${stage.spectral_stage_id}: no source_spectral_profile_ref and no derived profile basis temperature available. band_match_score derivation skipped.`
      );
    }

    const { normalized, warnings, errors } = normalizeSpectralStage(
      stage,
      effectiveSourceProfile,
      resolved.absorberFamily,
      resolved.cavityGeometry,
      resolved.mediatorFamily,
      resolved.targetZoneNominalK
    );

    normalizedStages.push(normalized);
    allWarnings.push(...warnings);
    allErrors.push(...errors);
  }

  return {
    normalized_stages: normalizedStages,
    derived_source_profiles: derivedProfiles,
    normalization_warnings: allWarnings,
    normalization_errors: allErrors,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Clamp value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
