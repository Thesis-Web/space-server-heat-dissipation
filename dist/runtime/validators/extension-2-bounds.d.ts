/**
 * Extension 2 Validation Layer
 *
 * Governed by: model-extension-2-spec-v0.2.1 §15 (Validation Rules)
 * Runtime ledger: model-extension-2-runtime-ledger-v0.2.1 — Validation section
 *
 * Validation rules enforced:
 *   §15.1 Stage completeness — enabled stage invalid if any required ref missing
 *   §15.2 Coefficient bounds — any out-of-range coefficient blocks packet generation
 *   §15.3 Provenance enforcement — placeholder/hypothesis_only on output-driving fields
 *          raises blocking caution when strict_research_enforcement = true
 *   §15.4 No-silent-mix — baseline_only mode must not affect baseline outputs
 *   §15.5 Packet transparency — all exploratory coefficients disclosed in output bundle
 *   §15.6 Metadata-only enforcement — metadata-only fields must not alter numeric output
 *   §15.7 Derived-profile integrity — derived profile includes reproducible derivation info
 *
 * Non-negotiable rule §13.15:
 *   Runtime shall NOT silently clamp for final output.
 *   Violations emit validation failures, not silent corrections.
 */
import { NormalizedSpectralStage } from '../transforms/extension-2-normalizer';
export type ValidationSeverity = 'blocking' | 'caution' | 'info';
export interface ValidationResult {
    severity: ValidationSeverity;
    code: string;
    message: string;
    stage_id?: string;
    field?: string;
}
export interface Extension2ValidationReport {
    valid: boolean;
    blocking: ValidationResult[];
    cautions: ValidationResult[];
    infos: ValidationResult[];
    all: ValidationResult[];
}
/**
 * Validate that all enabled stages have required refs per §15.1.
 */
export declare function validateStageCompleteness(stages: NormalizedSpectralStage[]): ValidationResult[];
/**
 * Validate all coefficient bounds for a stage per §15.2.
 * Out-of-range values block packet generation.
 * Runtime shall NOT silently clamp per §13.15.
 */
export declare function validateStageCoefficientBounds(stage: NormalizedSpectralStage): ValidationResult[];
/**
 * Validate provenance enforcement per §15.3.
 * If a stage materially affects output and provenance is placeholder or hypothesis_only,
 * raise blocking caution (blocking when strict_research_enforcement = true).
 */
export declare function validateStageProvenance(stage: NormalizedSpectralStage, strictResearchEnforcement: boolean): ValidationResult[];
/**
 * Validate that baseline_only mode does not route exploratory coefficients
 * into baseline numeric outputs per §15.4.
 *
 * In this implementation, the separation is enforced architecturally
 * (run-extension-2.ts computes a parallel path). This validator confirms
 * mode consistency at the scenario level.
 */
export declare function validateBaselineIsolation(modelExtension2Mode: string, _baselineResultPresent: boolean, exploratoryResultPresent: boolean): ValidationResult[];
/**
 * Validate that any derived source profile includes sufficient state to
 * reproduce the derivation deterministically per §15.7.
 */
export declare function validateDerivedProfileIntegrity(derivedProfiles: Array<{
    derived_profile_id: string;
    basis_temperature_k?: number;
    lambda_peak_um?: number;
    _derivation_method?: string;
}>): ValidationResult[];
/**
 * Run all Extension 2 validation checks and return consolidated report.
 * Spec §15 complete.
 */
export declare function validateExtension2(stages: NormalizedSpectralStage[], derivedProfiles: Array<Record<string, unknown>>, modelExtension2Mode: string, strictResearchEnforcement: boolean, baselineResultPresent: boolean, exploratoryResultPresent: boolean): Extension2ValidationReport;
//# sourceMappingURL=extension-2-bounds.d.ts.map