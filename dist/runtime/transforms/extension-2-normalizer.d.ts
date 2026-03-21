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
/**
 * Compute peak emission wavelength via Wien displacement law.
 * Spec §6.4, §13.3: helper for display or exploratory support only.
 * Must not affect baseline. Result must be serialized if used in derived profile.
 */
export declare function wienPeakWavelengthUm(temperatureK: number): number;
/**
 * Compute normalized band match score from source and absorber band definitions.
 * Spec §13.4.
 *
 * band_overlap_width_um = max(0, min(source_max, absorber_max) - max(source_min, absorber_min))
 * source_band_width_um  = max(source_max - source_min, epsilon)
 * band_match_score      = clamp(overlap / source_band_width, 0, 1)
 */
export declare function computeBandMatchScore(sourceMinUm: number, sourceMaxUm: number, absorberMinUm: number, absorberMaxUm: number): number;
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
export declare function computeGeometryCouplingEffective(opticalAccessFactor: number, nominalViewFactor: number, nominalPathLengthFactor: number): number;
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
export declare function computeMediatorTransferEffective(nominalThermalBufferFraction: number, stageNominalK: number, targetNominalK: number): number;
/**
 * Compute eta_stage_exploratory from all normalized coefficients.
 * Spec §13.7.
 *
 * eta = capture_efficiency × band_match × geometry_coupling × mediator_transfer
 *       × regeneration_effectiveness × (1 - thermal_loss_fraction)
 *
 * Enforced: 0 <= eta <= 1
 */
export declare function computeEtaStageExploratory(captureEfficiencyFraction: number, bandMatchScore: number, geometryCouplingScore: number, mediatorTransferScore: number, regenerationEffectiveness: number, thermalLossFraction: number): number;
/**
 * Compute stage useful transfer power.
 * Spec §13.8. Must be labeled exploratory — not proven hardware performance.
 *
 * Q_useful = Q_source_available × eta_stage + external_heat + storage_drawdown + work_input
 */
export declare function computeStageUsefulTransferW(qDotSourceAvailableW: number, etaStageExploratory: number, externalHeatInputW: number, storageDrawdownW: number, workInputW: number): number;
/**
 * Compute stage residual reject power.
 * Spec §13.9.
 *
 * Q_residual = max(0, Q_source_available + external + drawdown + work - Q_useful)
 */
export declare function computeStageResidualRejectW(qDotSourceAvailableW: number, externalHeatInputW: number, storageDrawdownW: number, workInputW: number, qDotStageUsefulW: number): number;
/**
 * Determine source capture fraction for a stage.
 * Spec §13.2.
 *
 * If source_capture_fraction_override is provided, use it.
 * Otherwise use capture_efficiency_fraction.
 */
export declare function resolveSourceCaptureFraction(captureEfficiencyFraction: number, sourceCaptureOverride: number | null): number;
/**
 * Compute source-available power for a stage.
 * Spec §13.2.
 *
 * Q_stage_source_available = Q_zone_reject_available × source_capture_fraction
 */
export declare function computeStageSourceAvailableW(qDotZoneRejectAvailableW: number, sourceCaptureF: number): number;
/**
 * Normalize a single spectral stage, deriving and serializing all score defaults.
 * Per spec §11.5 no-hidden-default rule: if score not provided, compute from catalog
 * and serialize it; flag the stage accordingly.
 *
 * Returns NormalizedSpectralStage with all scores non-null and derivation flags set.
 */
export declare function normalizeSpectralStage(stage: SpectralStageInput, sourceProfile: SourceSpectralProfileEntry | null, absorberFamily: AbsorberFamilyEntry | null, cavityGeometry: CavityGeometryEntry | null, mediatorFamily: MediatorFamilyEntry | null, targetZoneNominalK: number): {
    normalized: NormalizedSpectralStage;
    warnings: string[];
    errors: string[];
};
/**
 * Build a derived source profile from a basis temperature when no catalog ref is selected.
 * Spec §6.5: packet must include enough info to reproduce derivation deterministically.
 */
export declare function buildDerivedSourceProfile(basisTemperatureK: number, stageId: string): DerivedSourceProfile;
/**
 * Normalize Extension 2 state for a scenario.
 * If enable_model_extension_2 = false, returns empty result.
 * If mode is baseline_only, exploratory fields are serialized but not computed.
 * Per spec §5.3.
 */
export declare function normalizeExtension2(scenarioExt2Enabled: boolean, stages: SpectralStageInput[], catalogResolverFn: (stage: SpectralStageInput) => {
    sourceProfile: SourceSpectralProfileEntry | null;
    absorberFamily: AbsorberFamilyEntry | null;
    cavityGeometry: CavityGeometryEntry | null;
    mediatorFamily: MediatorFamilyEntry | null;
    targetZoneNominalK: number;
}): Extension2NormalizationResult;
//# sourceMappingURL=extension-2-normalizer.d.ts.map