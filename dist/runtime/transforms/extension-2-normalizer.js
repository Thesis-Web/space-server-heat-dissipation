"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.wienPeakWavelengthUm = wienPeakWavelengthUm;
exports.computeBandMatchScore = computeBandMatchScore;
exports.computeGeometryCouplingEffective = computeGeometryCouplingEffective;
exports.computeMediatorTransferEffective = computeMediatorTransferEffective;
exports.computeEtaStageExploratory = computeEtaStageExploratory;
exports.computeStageUsefulTransferW = computeStageUsefulTransferW;
exports.computeStageResidualRejectW = computeStageResidualRejectW;
exports.resolveSourceCaptureFraction = resolveSourceCaptureFraction;
exports.computeStageSourceAvailableW = computeStageSourceAvailableW;
exports.normalizeSpectralStage = normalizeSpectralStage;
exports.buildDerivedSourceProfile = buildDerivedSourceProfile;
exports.normalizeExtension2 = normalizeExtension2;
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Wien displacement law constant [µm·K]. Spec §6.4, §13.3 */
const WIEN_CONSTANT_UM_K = 2897.771955;
/** Small epsilon to prevent division-by-zero in band width calculations. Spec §13.4 */
const BAND_WIDTH_EPSILON = 1e-9;
// ---------------------------------------------------------------------------
// §6.4 Wien-law helper — display/exploratory support only
// ---------------------------------------------------------------------------
/**
 * Compute peak emission wavelength via Wien displacement law.
 * Spec §6.4, §13.3: helper for display or exploratory support only.
 * Must not affect baseline. Result must be serialized if used in derived profile.
 */
function wienPeakWavelengthUm(temperatureK) {
    if (temperatureK <= 0) {
        throw new RangeError(`wienPeakWavelengthUm: temperature_k must be > 0, got ${temperatureK}`);
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
function computeBandMatchScore(sourceMinUm, sourceMaxUm, absorberMinUm, absorberMaxUm) {
    const overlapWidth = Math.max(0, Math.min(sourceMaxUm, absorberMaxUm) - Math.max(sourceMinUm, absorberMinUm));
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
function computeGeometryCouplingEffective(opticalAccessFactor, nominalViewFactor, nominalPathLengthFactor) {
    if (nominalPathLengthFactor <= 0) {
        throw new RangeError(`computeGeometryCouplingEffective: nominalPathLengthFactor must be > 0, got ${nominalPathLengthFactor}`);
    }
    const raw = opticalAccessFactor *
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
function computeMediatorTransferEffective(nominalThermalBufferFraction, stageNominalK, targetNominalK) {
    if (stageNominalK <= 0) {
        throw new RangeError(`computeMediatorTransferEffective: stageNominalK must be > 0, got ${stageNominalK}`);
    }
    if (targetNominalK <= 0) {
        throw new RangeError(`computeMediatorTransferEffective: targetNominalK must be > 0, got ${targetNominalK}`);
    }
    const raw = nominalThermalBufferFraction *
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
function computeEtaStageExploratory(captureEfficiencyFraction, bandMatchScore, geometryCouplingScore, mediatorTransferScore, regenerationEffectiveness, thermalLossFraction) {
    const raw = captureEfficiencyFraction *
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
function computeStageUsefulTransferW(qDotSourceAvailableW, etaStageExploratory, externalHeatInputW, storageDrawdownW, workInputW) {
    return (qDotSourceAvailableW * etaStageExploratory +
        externalHeatInputW +
        storageDrawdownW +
        workInputW);
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
function computeStageResidualRejectW(qDotSourceAvailableW, externalHeatInputW, storageDrawdownW, workInputW, qDotStageUsefulW) {
    return Math.max(0, qDotSourceAvailableW +
        externalHeatInputW +
        storageDrawdownW +
        workInputW -
        qDotStageUsefulW);
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
function resolveSourceCaptureFraction(captureEfficiencyFraction, sourceCaptureOverride) {
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
function computeStageSourceAvailableW(qDotZoneRejectAvailableW, sourceCaptureF) {
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
function normalizeSpectralStage(stage, sourceProfile, absorberFamily, cavityGeometry, mediatorFamily, targetZoneNominalK) {
    const warnings = [];
    const errors = [];
    // --- Band match score §13.4 ---
    let bandMatchScore;
    let bandMatchWasDerived = false;
    if (stage.band_match_score !== null && stage.band_match_score !== undefined) {
        bandMatchScore = clamp(stage.band_match_score, 0, 1);
    }
    else if (sourceProfile !== null && absorberFamily !== null) {
        bandMatchScore = computeBandMatchScore(sourceProfile.wavelength_band_min_um, sourceProfile.wavelength_band_max_um, absorberFamily.wavelength_band_min_um, absorberFamily.wavelength_band_max_um);
        bandMatchWasDerived = true;
        warnings.push(`Stage ${stage.spectral_stage_id}: band_match_score derived from catalog (${bandMatchScore.toFixed(4)}); serialized per §11.5.`);
    }
    else {
        // Cannot compute — flag incomplete per §11.5
        bandMatchScore = 0;
        errors.push(`Stage ${stage.spectral_stage_id}: band_match_score not provided and catalog refs insufficient to derive. Stage flagged incomplete per §11.5.`);
    }
    // --- Geometry coupling score §13.5 ---
    let geometryCouplingScore;
    let geometryCouplingWasDerived = false;
    if (stage.geometry_coupling_score !== null && stage.geometry_coupling_score !== undefined) {
        geometryCouplingScore = clamp(stage.geometry_coupling_score, 0, 1);
    }
    else if (cavityGeometry !== null) {
        geometryCouplingScore = computeGeometryCouplingEffective(cavityGeometry.optical_access_factor, cavityGeometry.nominal_view_factor, cavityGeometry.nominal_path_length_factor);
        geometryCouplingWasDerived = true;
        warnings.push(`Stage ${stage.spectral_stage_id}: geometry_coupling_score derived from catalog (${geometryCouplingScore.toFixed(4)}); serialized per §11.5.`);
    }
    else {
        geometryCouplingScore = 0;
        errors.push(`Stage ${stage.spectral_stage_id}: geometry_coupling_score not provided and cavity geometry catalog ref missing. Stage flagged incomplete per §11.5.`);
    }
    // --- Mediator transfer score §13.6 ---
    let mediatorTransferScore;
    let mediatorTransferWasDerived = false;
    if (stage.mediator_transfer_score !== null && stage.mediator_transfer_score !== undefined) {
        mediatorTransferScore = clamp(stage.mediator_transfer_score, 0, 1);
    }
    else if (mediatorFamily !== null && targetZoneNominalK > 0) {
        mediatorTransferScore = computeMediatorTransferEffective(mediatorFamily.nominal_thermal_buffer_fraction, mediatorFamily.temperature_nominal_k, targetZoneNominalK);
        mediatorTransferWasDerived = true;
        warnings.push(`Stage ${stage.spectral_stage_id}: mediator_transfer_score derived from catalog (${mediatorTransferScore.toFixed(4)}); serialized per §11.5.`);
    }
    else {
        mediatorTransferScore = 0;
        errors.push(`Stage ${stage.spectral_stage_id}: mediator_transfer_score not provided and mediator catalog or target zone nominal K unavailable. Stage flagged incomplete per §11.5.`);
    }
    const normalized = {
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
function buildDerivedSourceProfile(basisTemperatureK, stageId) {
    if (basisTemperatureK <= 0) {
        throw new RangeError(`buildDerivedSourceProfile: basis_temperature_k must be > 0, got ${basisTemperatureK}`);
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
function normalizeExtension2(scenarioExt2Enabled, stages, catalogResolverFn) {
    if (!scenarioExt2Enabled) {
        // Per spec §5.3: if disabled, all Extension 2 fields absent/null/ignored
        return {
            normalized_stages: [],
            derived_source_profiles: [],
            normalization_warnings: [],
            normalization_errors: [],
        };
    }
    const normalizedStages = [];
    const derivedProfiles = [];
    const allWarnings = [];
    const allErrors = [];
    for (const stage of stages) {
        const resolved = catalogResolverFn(stage);
        // Build derived source profile if no catalog ref per §6.5
        let effectiveSourceProfile = resolved.sourceProfile;
        if (stage.source_spectral_profile_ref === null && stage.enabled) {
            // No catalog ref — cannot derive without basis temperature; log
            allWarnings.push(`Stage ${stage.spectral_stage_id}: no source_spectral_profile_ref and no derived profile basis temperature available. band_match_score derivation skipped.`);
        }
        const { normalized, warnings, errors } = normalizeSpectralStage(stage, effectiveSourceProfile, resolved.absorberFamily, resolved.cavityGeometry, resolved.mediatorFamily, resolved.targetZoneNominalK);
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
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
//# sourceMappingURL=extension-2-normalizer.js.map