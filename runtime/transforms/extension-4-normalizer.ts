/**
 * runtime/transforms/extension-4-normalizer.ts
 * Extension 4 — TPV Cells on Radiator Surface (Photon Recapture Loop)
 * Normalization / default expansion / enable-gate resolution.
 *
 * Governing law: ext4-spec-v0.1.4 §14.1, §17.1, §13.2, §13.3, §5.2, §5.4
 * Blueprint law:  blueprint-v0.1.4 §Functional-Architecture (layers 1–2)
 *
 * Responsibilities per §14.1:
 *  1. Resolve enable gate and mode
 *  2. Validate presence of config
 *  3. Apply explicit allowed defaults (§13.2)
 *  4. Emit transform trace
 *  5. Return normalized ext4 config
 *  6. Declare whether iterative mode requires 3A hard dependency
 *
 * All types imported from types/extension-4.d.ts per §14.5.
 * Additive-only. Does not touch baseline, 3A, 3B, or 3C fields.
 */

import type {
  TpvRecaptureConfig,
  Extension4NormalizationResult,
} from '../../types/extension-4.d';

// ─── §13.2 Best-solve defaults for v0.1.4 ────────────────────────────────────
// Applied only to fields absent from the incoming config (not silently clamping
// invalid values — invalid values are rejected per §5.4, §13.3).

const DEFAULTS_V014: Partial<TpvRecaptureConfig> & {
  coverage_fraction: number;
  radiator_view_factor_to_tpv: number;
  spectral_capture_fraction: number;
  coupling_derate_fraction: number;
  conversion_efficiency_mode: 'fixed';
  eta_tpv_fixed: number;
  export_fraction: number;
  onboard_return_heat_fraction: number;
  cell_cooling_mode: 'separate_cooling';
  iteration_report_detail: 'minimal';
} = {
  coverage_fraction:          0.10,
  radiator_view_factor_to_tpv: 0.50,
  spectral_capture_fraction:  0.50,
  coupling_derate_fraction:   0.80,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed:              0.15,
  export_fraction:            0.00,
  onboard_return_heat_fraction: 1.00,
  cell_cooling_mode:          'separate_cooling',
  iteration_report_detail:    'minimal',
};

// ─── Flag / error codes — used internally, declared as string constants ───────
// Full stable IDs per §13.3, §13.5

const ERR_MISSING_CONFIG   = 'EXT4-ERR-MISSING-CONFIG';
const ERR_INVALID_BOUNDS   = 'EXT4-ERR-INVALID-BOUNDS';

// ─── Main normalizer ─────────────────────────────────────────────────────────

/**
 * normalizeExtension4
 *
 * Implements §17.1 normalization pseudocode line by line.
 * Returns Extension4NormalizationResult for consumption by
 * extension-4-bounds.ts and run-extension-4.ts.
 *
 * @param scenario  Raw scenario object (broad type — internal logic uses
 *                  the §5.1 fields by name per §14.5 stricter surface).
 */
export function normalizeExtension4(
  scenario: Record<string, unknown>
): Extension4NormalizationResult {
  const trace: string[] = [];
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const defaults_applied: string[] = [];

  // §17.1 Step 1 — resolve enable gate
  const raw_enabled = scenario['enable_model_extension_4'];
  const enabled: boolean = typeof raw_enabled === 'boolean' ? raw_enabled : false;
  trace.push(`ext4-normalizer: enable_model_extension_4=${enabled}`);

  // §17.1 — disabled fast path
  if (!enabled) {
    trace.push('ext4-normalizer: disabled gate — returning disabled normalization result');
    return {
      enabled: false,
      mode: 'disabled',
      config: null,
      defaults_applied: [],
      blocking_errors: [],
      warnings: [],
      trace,
    };
  }

  // §17.1 Step 2 — resolve mode
  const raw_mode = scenario['model_extension_4_mode'];
  let mode: 'disabled' | 'one_pass' | 'iterative' =
    raw_mode === 'one_pass' || raw_mode === 'iterative' || raw_mode === 'disabled'
      ? (raw_mode as 'disabled' | 'one_pass' | 'iterative')
      : 'iterative'; // §5.2: iterative is canonical when enabled

  if (raw_mode === undefined || raw_mode === null) {
    // field absent — default to iterative per §5.2
    defaults_applied.push('model_extension_4_mode');
    trace.push('ext4-normalizer: model_extension_4_mode absent — defaulted to iterative');
    mode = 'iterative';
  } else {
    trace.push(`ext4-normalizer: model_extension_4_mode=${mode}`);
  }

  // §17.1 — enabled with mode=disabled is a blocking error per §13.3
  if (mode === 'disabled') {
    blocking_errors.push(ERR_INVALID_BOUNDS + ': enabled=true but mode=disabled is contradictory');
    trace.push('ext4-normalizer: BLOCK — enabled=true with mode=disabled');
    return {
      enabled: true,
      mode: 'disabled',
      config: null,
      defaults_applied,
      blocking_errors,
      warnings,
      trace,
    };
  }

  // §17.1 Step 3 — resolve config
  const raw_config = scenario['tpv_recapture_config'];
  if (raw_config === null || raw_config === undefined) {
    blocking_errors.push(ERR_MISSING_CONFIG + ': enabled=true but tpv_recapture_config is null/absent');
    trace.push('ext4-normalizer: BLOCK — tpv_recapture_config missing');
    return {
      enabled: true,
      mode,
      config: null,
      defaults_applied,
      blocking_errors,
      warnings,
      trace,
    };
  }

  const raw_cfg = raw_config as Record<string, unknown>;

  // §17.1 Step 4 — apply allowed defaults to missing config fields
  // Only fields that are absent (not set to an explicit invalid value)
  const patched: Record<string, unknown> = { ...raw_cfg };

  function applyDefault<K extends keyof typeof DEFAULTS_V014>(field: K): void {
    if (patched[field] === undefined || patched[field] === null) {
      patched[field] = DEFAULTS_V014[field];
      defaults_applied.push(field);
      trace.push(`ext4-normalizer: applied default ${field}=${DEFAULTS_V014[field]}`);
    }
  }

  applyDefault('coverage_fraction');
  applyDefault('radiator_view_factor_to_tpv');
  applyDefault('spectral_capture_fraction');
  applyDefault('coupling_derate_fraction');
  applyDefault('conversion_efficiency_mode');

  // Efficiency-mode-conditional defaults
  const eff_mode = patched['conversion_efficiency_mode'] as string;
  if (eff_mode === 'fixed') {
    if (patched['eta_tpv_fixed'] === undefined || patched['eta_tpv_fixed'] === null) {
      patched['eta_tpv_fixed'] = DEFAULTS_V014.eta_tpv_fixed;
      defaults_applied.push('eta_tpv_fixed');
      trace.push(`ext4-normalizer: applied default eta_tpv_fixed=${DEFAULTS_V014.eta_tpv_fixed}`);
    }
  }
  // carnot_bounded has no defaults — missing fields are blocking per §5.4

  applyDefault('export_fraction');
  applyDefault('onboard_return_heat_fraction');
  applyDefault('cell_cooling_mode');
  applyDefault('iteration_report_detail');

  // §17.1 Step 5 — validate mode/config coherence
  // (full bounds validation is in extension-4-bounds.ts; normalizer does
  // only the coherence checks that are needed before any bounds check)
  if (eff_mode === 'carnot_bounded') {
    if (patched['eta_tpv_carnot_fraction'] === undefined || patched['eta_tpv_carnot_fraction'] === null) {
      blocking_errors.push(ERR_MISSING_CONFIG + ': carnot_bounded requires eta_tpv_carnot_fraction');
      trace.push('ext4-normalizer: BLOCK — carnot_bounded missing eta_tpv_carnot_fraction');
    }
    if (patched['tpv_cold_side_temperature_k'] === undefined || patched['tpv_cold_side_temperature_k'] === null) {
      blocking_errors.push(ERR_MISSING_CONFIG + ': carnot_bounded requires tpv_cold_side_temperature_k');
      trace.push('ext4-normalizer: BLOCK — carnot_bounded missing tpv_cold_side_temperature_k');
    }
  }

  // §14.1 Responsibility 6 — declare iterative 3A hard dependency
  if (mode === 'iterative') {
    trace.push('ext4-normalizer: iterative mode — 3A authority required; will block if absent (§8.3)');
  }

  if (defaults_applied.length > 0) {
    trace.push(`ext4-normalizer: ${defaults_applied.length} defaults applied: ${defaults_applied.join(', ')}`);
  }

  trace.push('ext4-normalizer: normalization complete');

  return {
    enabled: true,
    mode,
    config: patched as unknown as TpvRecaptureConfig,
    defaults_applied,
    blocking_errors,
    warnings,
    trace,
  };
}
