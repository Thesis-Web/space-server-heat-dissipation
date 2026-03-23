/**
 * constants.ts
 * Canonical runtime constants for the orbital thermal trade system.
 * Governed by §26.1 of engineering-spec-v0.1.0.
 * All values are SI. Do not alter without a formal spec revision.
 *
 * Domain layout:
 *   § A — Blackbody and radiation physics          (baseline authoritative)
 *   § B — Thermal runtime defaults                 (baseline authoritative)
 *   § C — Load and policy constants                (baseline authoritative)
 *   § D — Version declarations                     (baseline authoritative)
 *   § E — TRM exploratory layer hooks              (Extension 2 forward surface)
 *
 * Section E constants are placeholder hooks for Model Extension 2
 * (orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.0 and
 * engineering-spec-v0.2.0). They are named and present so Extension 2
 * runtime modules have a stable, declared import surface. They carry
 * no runtime authority until Extension 2 is implemented and reviewed.
 */

// =============================================================================
// § A — Blackbody and radiation physics
// =============================================================================

/**
 * Stefan-Boltzmann constant.
 * σ = 5.670374419 × 10⁻⁸ W/m²·K⁴  (CODATA 2018 exact value)
 * Governing equation: Q = ε·σ·F·A·(T⁴ − T_sink⁴)  §12.2
 *
 * Both names are first-class canonical exports.
 * SIGMA_W_M2_K4    — precision-notation form, preferred in formula modules.
 * STEFAN_BOLTZMANN — common physics name, preferred in UI, docs, and reports.
 */
export const SIGMA_W_M2_K4 = 5.670374419e-8;
export const STEFAN_BOLTZMANN = SIGMA_W_M2_K4;

/**
 * Wien displacement law constant.
 * b = 2897.771955 μm·K  (CODATA 2018)
 * Peak emission wavelength: λ_peak = WIEN_DISPLACEMENT_UM_K / T_source_k
 *
 * Baseline use: display helper for source characterization.
 * Extension 2 use: source spectral profile derivation per ext-2-spec §6.4, §13.2.
 */
export const WIEN_DISPLACEMENT_UM_K = 2897.771955;


// =============================================================================
// § B — Thermal runtime defaults
// =============================================================================

/**
 * Deep-space blackbody background temperature (K).
 * Used as T_sink_effective when the scenario provides no explicit sink term.
 * §26.1, §40.
 */
export const T_SINK_DEEP_SPACE_K = 0;

/**
 * GEO effective sink temperature default.
 * §40 declares 0 K for first-order sizing where no environment override is set.
 */
export const T_SINK_EFFECTIVE_DEFAULT_K = 0;

/** Absolute zero — used in bounds validation only, not as a physical sink. */
export const T_ABSOLUTE_ZERO_K = 0;

/**
 * Standard exergy reference temperature (K).
 * Used when no explicit T_ref is provided by the scenario. §26.1.
 */
export const T_REF_DEFAULT_K = 300;

/** Default radiator emissivity when not declared by scenario. §40. */
export const EPSILON_RAD_DEFAULT = 0.9;

/** Default thermal reserve margin fraction under nominal policy. §40. */
export const RESERVE_MARGIN_DEFAULT = 0.15;


// =============================================================================
// § C — Load, policy, and interpolation constants
// =============================================================================

/**
 * Fraction of total internal dissipation below which a scavenging branch
 * output is flagged as low-significance. §31.3.
 */
export const LOW_SIGNIFICANCE_THRESHOLD_FRACTION = 0.01;

/** Canonical default load-state interpolation rule for v0.1.0. §12.12. */
export const DEFAULT_INTERPOLATION_RULE = 'piecewise_linear' as const;

/**
 * Supported orbit classes for this version. §7.1.
 * v0.1.0 is GEO-only.
 */
export const SUPPORTED_ORBIT_CLASSES = ['GEO'] as const;
export type OrbitClass = typeof SUPPORTED_ORBIT_CLASSES[number];

/**
 * Thermal policy reserve margin lookup. §33.
 * Keyed by thermal_policy field value from scenario schema.
 */
export const THERMAL_POLICY_MARGINS: Record<string, number> = {
  conservative: 0.25,
  nominal:      0.15,
  aggressive:   0.05,
  experimental: 0.0,
};


// =============================================================================
// § D — Version declarations
// =============================================================================

export const RUNTIME_VERSION          = 'v0.1.0' as const;
export const ENGINEERING_SPEC_VERSION = 'v0.1.0' as const;
export const SCHEMA_BUNDLE_VERSION    = 'v0.1.0' as const;
export const BLUEPRINT_VERSION        = 'v0.1.1' as const;

/**
 * Structured version bundle — emitted in every runtime result per §6.3.
 * Both RUNTIME_VERSION (singular) and RUNTIME_VERSIONS (bundle) are
 * first-class canonical exports. Neither is deprecated.
 */
export const RUNTIME_VERSIONS = {
  runtime:          RUNTIME_VERSION,
  engineering_spec: ENGINEERING_SPEC_VERSION,
  schema_bundle:    SCHEMA_BUNDLE_VERSION,
  blueprint:        BLUEPRINT_VERSION,
} as const;


// =============================================================================
// § F — Extension 3A foundational hardening constants
// =============================================================================
//
// Governing law: orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1
//
// These constants are authoritative for all 3A runtime modules. They must be
// imported from here — no 3A module may re-declare sigma or c inline.
// =============================================================================

/**
 * Speed of light in vacuum.
 * c = 299 792 458 m/s  (exact, SI definition)
 * Used in radiation-pressure flag metric: p_rad = q'' / c  (§11.10)
 */
export const SPEED_OF_LIGHT_M_PER_S = 299_792_458;

/**
 * Default max iterations for convergence loop. §5.4, §12.1
 */
export const CONVERGENCE_MAX_ITERATIONS_DEFAULT = 25;

/**
 * Default absolute tolerance for convergence (watts). §5.4, §12.1
 */
export const CONVERGENCE_TOLERANCE_ABS_W_DEFAULT = 1.0;

/**
 * Default relative tolerance fraction for convergence. §5.4, §12.1
 */
export const CONVERGENCE_TOLERANCE_REL_FRACTION_DEFAULT = 0.001;

/**
 * Default runaway multiplier. §5.4, §12.1
 * Minimum is 2.0 per §5.4 rationale note.
 */
export const CONVERGENCE_RUNAWAY_MULTIPLIER_DEFAULT = 4.0;

/**
 * Minimum allowed runaway multiplier. §5.4.
 * At 1.0 runaway would trip on any non-trivial transient.
 */
export const CONVERGENCE_RUNAWAY_MULTIPLIER_MIN = 2.0;

/**
 * Default topology validation policy. §5.1, §12.1
 */
export const TOPOLOGY_VALIDATION_POLICY_DEFAULT = 'blocking' as const;

/**
 * Extension 3A version token — emitted in packet metadata.
 */
export const EXTENSION_3A_SPEC_VERSION = 'v0.4.1' as const;
export const EXTENSION_3A_BLUEPRINT_VERSION = 'v0.4.1' as const;


// =============================================================================
// § E — TRM exploratory layer hooks  (Extension 2 forward surface)
// =============================================================================
//
// These constants establish a stable, named import surface for Model Extension 2
// runtime modules. They are NOT authoritative for baseline Extension 1 execution.
//
// Extension 2 governing law:
//   orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.0.md
//   orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.0.md
//
// Hard rule: no Extension 2 module may use these constants to alter baseline
// outputs. All TRM-layer math must run exclusively through the exploratory
// result path (model_extension_2_mode != 'disabled').
// =============================================================================

/**
 * Division-by-zero guard for spectral band-width calculations.
 * Denominator: source_band_width_um = max(delta_lambda, TRM_BAND_WIDTH_EPSILON_UM)
 * Extension 2 spec §13.3.
 */
export const TRM_BAND_WIDTH_EPSILON_UM = 1e-9;

/**
 * Clamp bounds for all exploratory stage transfer coefficients.
 * eta_stage_exploratory must remain in [TRM_ETA_MIN, TRM_ETA_MAX].
 * Extension 2 spec §13.4.
 */
export const TRM_ETA_MIN = 0.0;
export const TRM_ETA_MAX = 1.0;

/**
 * Default exploratory capture efficiency fraction where no catalog value
 * is provided. Placeholder — research required before use.
 * Extension 2 spec §11.2.
 */
export const TRM_CAPTURE_EFFICIENCY_DEFAULT = 0.0;

/**
 * Default band match score for uncharacterized source/absorber pairs.
 * Defaults to 0 (no match assumed) until catalog data is sourced.
 * Extension 2 spec §13.3.
 */
export const TRM_BAND_MATCH_SCORE_DEFAULT = 0.0;

/**
 * Provenance class identifiers — string enum for catalog and packet use.
 * Extension 2 spec §12.1.
 */
export const TRM_PROVENANCE_CLASS = {
  measured:           'measured',
  literature_derived: 'literature_derived',
  analog_estimated:   'analog_estimated',
  placeholder:        'placeholder',
  hypothesis_only:    'hypothesis_only',
} as const;
export type TrmProvenanceClass = typeof TRM_PROVENANCE_CLASS[keyof typeof TRM_PROVENANCE_CLASS];

/**
 * Maturity class identifiers — string enum for catalog and packet use.
 * Extension 2 spec §12.2.
 */
export const TRM_MATURITY_CLASS = {
  concept_only:      'concept_only',
  bench_evidence:    'bench_evidence',
  modeled_only:      'modeled_only',
  heritage_analog:   'heritage_analog',
  qualified_estimate:'qualified_estimate',
  custom:            'custom',
} as const;
export type TrmMaturityClass = typeof TRM_MATURITY_CLASS[keyof typeof TRM_MATURITY_CLASS];

/**
 * Confidence class identifiers — string enum for catalog and packet use.
 * Extension 2 spec §12.3.
 */
export const TRM_CONFIDENCE_CLASS = {
  low:     'low',
  medium:  'medium',
  high:    'high',
  unknown: 'unknown',
} as const;
export type TrmConfidenceClass = typeof TRM_CONFIDENCE_CLASS[keyof typeof TRM_CONFIDENCE_CLASS];
