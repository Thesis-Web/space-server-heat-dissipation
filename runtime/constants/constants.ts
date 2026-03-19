/**
 * constants.ts
 * Canonical runtime constants for the orbital thermal trade system.
 * Governed by §26.1 of engineering spec v0.1.0.
 * All values are SI. Do not alter without a formal spec revision.
 */

// ─── Stefan-Boltzmann constant ───────────────────────────────────────────────
/** σ = 5.670374419 × 10⁻⁸ W/m²·K⁴  (CODATA 2018 exact) §12.2 */
export const SIGMA_W_M2_K4 = 5.670374419e-8;

// ─── Default sink approximations §26.1 ───────────────────────────────────────
/** Deep-space blackbody background temperature (K).
 *  Used as T_sink_effective when the scenario provides no explicit sink. */
export const T_SINK_DEEP_SPACE_K = 0;

/** GEO effective sink temperature when no explicit environment overrides are set.
 *  §40 declares default = 0 K for first-order sizing. */
export const T_SINK_EFFECTIVE_DEFAULT_K = 0;

// ─── Default emissivity §40 ──────────────────────────────────────────────────
/** Default radiator emissivity when not declared by scenario. §40 */
export const EPSILON_RAD_DEFAULT = 0.9;

// ─── Reserve margin §40 ──────────────────────────────────────────────────────
/** Default thermal reserve margin fraction under nominal policy. §40 */
export const RESERVE_MARGIN_DEFAULT = 0.15;

// ─── Load significance threshold §31.3 ───────────────────────────────────────
/** Fraction of total internal dissipation below which a scavenging branch
 *  output is flagged as low-significance. §31.3 */
export const LOW_SIGNIFICANCE_THRESHOLD_FRACTION = 0.01;

// ─── Default interpolation rule §12.12 ───────────────────────────────────────
/** Canonical default load-state interpolation for v0.1.0. */
export const DEFAULT_INTERPOLATION_RULE = 'piecewise_linear' as const;

// ─── Reference temperatures §26.1 ────────────────────────────────────────────
/** Absolute zero — used in bounds validation only. */
export const T_ABSOLUTE_ZERO_K = 0;

/** Standard reference temperature for exergy calculations when no
 *  explicit T_ref is provided by the scenario. */
export const T_REF_DEFAULT_K = 300;

// ─── Canonical version declarations ──────────────────────────────────────────
export const RUNTIME_VERSION = 'v0.1.0' as const;
export const ENGINEERING_SPEC_VERSION = 'v0.1.0' as const;
export const SCHEMA_BUNDLE_VERSION = 'v0.1.0' as const;
export const BLUEPRINT_VERSION = 'v0.1.1' as const;

// ─── Supported orbit classes §7.1 ────────────────────────────────────────────
export const SUPPORTED_ORBIT_CLASSES = ['GEO'] as const;
export type OrbitClass = typeof SUPPORTED_ORBIT_CLASSES[number];

// ─── Thermal policy reserve margins §33 ─────────────────────────────────────
export const THERMAL_POLICY_MARGINS: Record<string, number> = {
  conservative: 0.25,
  nominal: 0.15,
  aggressive: 0.05,
  experimental: 0.0,
};
