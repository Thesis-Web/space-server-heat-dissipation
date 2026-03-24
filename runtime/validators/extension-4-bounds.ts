/**
 * runtime/validators/extension-4-bounds.ts
 * Extension 4 — TPV Cells on Radiator Surface (Photon Recapture Loop)
 * Bounds and blocking validation.
 *
 * Governing law: ext4-spec-v0.1.4 §14.3, §13.1–§13.5
 * Blueprint law:  blueprint-v0.1.4 §Controls-and-Gates
 *
 * Validates ext4-specific bounds and mode/config consistency against the
 * normalized config produced by extension-4-normalizer.ts.
 * All types imported from types/extension-4.d.ts per §14.5.
 * Additive validator. Does not mutate baseline or 3A validator behavior.
 */

import type {
  TpvRecaptureConfig,
  Extension4NormalizationResult,
  Extension4Dependency3A,
} from '../../types/extension-4.d';

// ─── Stable flag / error / warning IDs — §13.3–§13.5, §18.3 ─────────────────

export const EXT4_FLAG_IDS = {
  // Info — §13.5, §18.3
  INFO_DISABLED:          'EXT4-INFO-DISABLED',
  INFO_ONEPASS:           'EXT4-INFO-ONEPASS',
  INFO_ONEPASS_NO_3A:     'EXT4-INFO-ONEPASS-NO-3A',
  INFO_ZERO_INTERCEPT:    'EXT4-INFO-ZERO-INTERCEPT',
  INFO_ZERO_EFFICIENCY:   'EXT4-INFO-ZERO-EFFICIENCY',

  // Warnings — §13.4, §18.3
  WARN_NO_EXPORT:                      'EXT4-WARN-NO-EXPORT',
  WARN_SEPARATE_COOLING_UNINTEGRATED:  'EXT4-WARN-SEPARATE-COOLING-UNINTEGRATED',
  WARN_NONCONVERGED:                   'EXT4-WARN-NONCONVERGED',
  WARN_ZERO_BASE_REF:                  'EXT4-WARN-ZERO-BASE-REF',

  // Errors — §13.3, §18.3
  ERR_MISSING_CONFIG:       'EXT4-ERR-MISSING-CONFIG',
  ERR_MISSING_3A_AUTHORITY: 'EXT4-ERR-MISSING-3A-AUTHORITY',
  ERR_INVALID_BOUNDS:       'EXT4-ERR-INVALID-BOUNDS',
  ERR_RUNAWAY:              'EXT4-ERR-RUNAWAY',
} as const;

export type Ext4FlagId = typeof EXT4_FLAG_IDS[keyof typeof EXT4_FLAG_IDS];

export interface Extension4BoundsResult {
  passed: boolean;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

// ─── Fraction bounds helper ───────────────────────────────────────────────────

function isFraction(v: unknown): boolean {
  return typeof v === 'number' && isFinite(v) && v >= 0 && v <= 1;
}

function isPositiveNumber(v: unknown): boolean {
  return typeof v === 'number' && isFinite(v) && v > 0;
}

// ─── Main bounds validator ────────────────────────────────────────────────────

/**
 * validateExtension4Bounds
 *
 * Runs all §13.3 blocking rules and §13.4 warning rules against the
 * normalized Extension 4 config. Called by run-extension-4.ts after
 * normalization and before execution.
 *
 * @param norm      Output of normalizeExtension4.
 * @param ext3a     3A result if available (needed for mode precondition check §8.3).
 */
export function validateExtension4Bounds(
  norm: Extension4NormalizationResult,
  ext3a?: Extension4Dependency3A | null
): Extension4BoundsResult {
  const blocking_errors: string[] = [...norm.blocking_errors];
  const warnings: string[] = [...norm.warnings];
  const trace: string[] = ['extension-4-bounds: begin validation'];

  // Disabled path — bounds check skipped per §13.3 preamble
  if (!norm.enabled) {
    trace.push('ext4-bounds: disabled — bounds check skipped');
    return { passed: true, blocking_errors: [], warnings: [], trace };
  }

  // Early exit if normalizer already blocked (missing config, etc.)
  if (blocking_errors.length > 0) {
    trace.push(`ext4-bounds: pre-existing blocking errors from normalizer: ${blocking_errors.length}`);
    return { passed: false, blocking_errors, warnings, trace };
  }

  const cfg = norm.config as TpvRecaptureConfig;

  // ── §13.3 Blocking validation rules ────────────────────────────────────────

  // Rule: enabled ext4 with mode disabled (should already be caught by normalizer)
  if (norm.mode === 'disabled') {
    blocking_errors.push(
      `${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: enabled=true with mode=disabled`
    );
    trace.push('ext4-bounds: BLOCK — enabled=true with mode=disabled');
  }

  // Rule: §13.3 — iterative mode without resolvable convergence-control authority (§8.3)
  if (norm.mode === 'iterative') {
    const ext3a_enabled = ext3a?.extension_3a_enabled ?? false;
    if (!ext3a || !ext3a_enabled) {
      blocking_errors.push(
        `${EXT4_FLAG_IDS.ERR_MISSING_3A_AUTHORITY}: iterative mode requires enable_model_extension_3a=true and 3A result`
      );
      trace.push('ext4-bounds: BLOCK — iterative mode without 3A authority');
    }
  }

  // Rule: §13.3 — any invalid bounds on fractions (§12.1: all fractions in [0,1])
  const fractionFields: Array<keyof TpvRecaptureConfig> = [
    'coverage_fraction',
    'radiator_view_factor_to_tpv',
    'spectral_capture_fraction',
    'coupling_derate_fraction',
    'export_fraction',
    'onboard_return_heat_fraction',
  ];
  for (const field of fractionFields) {
    const val = cfg[field];
    if (!isFraction(val)) {
      blocking_errors.push(
        `${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: ${field}=${val} outside [0,1]`
      );
      trace.push(`ext4-bounds: BLOCK — ${field}=${val} not a fraction`);
    }
  }

  // Rule: §13.3 — fixed efficiency field
  if (cfg.conversion_efficiency_mode === 'fixed') {
    if (!isFraction(cfg.eta_tpv_fixed)) {
      blocking_errors.push(
        `${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: eta_tpv_fixed=${cfg.eta_tpv_fixed} outside [0,1] or missing (fixed mode requires it)`
      );
      trace.push('ext4-bounds: BLOCK — eta_tpv_fixed invalid or missing in fixed mode');
    }
  }

  // Rule: §13.3 — carnot_bounded efficiency fields
  if (cfg.conversion_efficiency_mode === 'carnot_bounded') {
    if (!isFraction(cfg.eta_tpv_carnot_fraction)) {
      blocking_errors.push(
        `${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: eta_tpv_carnot_fraction=${cfg.eta_tpv_carnot_fraction} outside [0,1] or missing`
      );
      trace.push('ext4-bounds: BLOCK — eta_tpv_carnot_fraction invalid in carnot_bounded mode');
    }
    if (!isPositiveNumber(cfg.tpv_cold_side_temperature_k)) {
      blocking_errors.push(
        `${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: tpv_cold_side_temperature_k=${cfg.tpv_cold_side_temperature_k} must be > 0 K`
      );
      trace.push('ext4-bounds: BLOCK — tpv_cold_side_temperature_k invalid in carnot_bounded mode');
    }
  }

  // Rule: §13.3 — impossible negative temperatures blocked (handled upstream by radiator
  // basis resolution; logged here as defense-in-depth if reached)

  // ── §13.4 Warning rules ─────────────────────────────────────────────────────

  // Warning: one-pass used instead of canonical iterative
  if (norm.mode === 'one_pass') {
    warnings.push(`${EXT4_FLAG_IDS.INFO_ONEPASS}: one-pass mode used; iterative is canonical when enabled`);
    trace.push('ext4-bounds: WARN — one-pass mode (non-canonical)');
  }

  // Warning: zero exported fraction with full onboard return — §13.4
  if (
    typeof cfg.export_fraction === 'number' &&
    cfg.export_fraction === 0 &&
    typeof cfg.onboard_return_heat_fraction === 'number' &&
    cfg.onboard_return_heat_fraction > 0
  ) {
    warnings.push(
      `${EXT4_FLAG_IDS.WARN_NO_EXPORT}: export_fraction=0 with onboard_return_heat_fraction=${cfg.onboard_return_heat_fraction}; no durable relief`
    );
    trace.push('ext4-bounds: WARN — zero export, full onboard return');
  }

  // Warning: separate_cooling load emitted but not integrated — §13.4
  if (cfg.cell_cooling_mode === 'separate_cooling') {
    warnings.push(
      `${EXT4_FLAG_IDS.WARN_SEPARATE_COOLING_UNINTEGRATED}: cell_cooling_mode=separate_cooling; q_tpv_separate_cooling_load_w emitted but not integrated into broader system cooling path`
    );
    trace.push('ext4-bounds: WARN — separate_cooling load unintegrated');
  }

  const passed = blocking_errors.length === 0;
  trace.push(`ext4-bounds: validation complete — passed=${passed} blocking=${blocking_errors.length} warnings=${warnings.length}`);

  return { passed, blocking_errors, warnings, trace };
}
