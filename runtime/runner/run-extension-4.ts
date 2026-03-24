/**
 * runtime/runner/run-extension-4.ts
 * Extension 4 — TPV Cells on Radiator Surface (Photon Recapture Loop)
 * Primary runner. Orchestrates normalization → validation → radiator
 * resolution → formula execution → deterministic result emission.
 *
 * Governing law: ext4-spec-v0.1.4 §14.4, §15, §16, §17, §8.3–§8.4, §10
 * Blueprint law:  blueprint-v0.1.4 §Canonical-Runtime-Sequence, §Build-Agent-Responsibilities
 *
 * Responsibilities per §14.4:
 *  1. Accept normalized ext4 config and upstream context
 *  2. Enforce blocking rules
 *  3. Execute one-pass or iterative path per §10.1 radiator-object selection law
 *  4. Emit deterministic disabled result when disabled
 *  5. Emit deterministic invalid result when blocked
 *  6. Return only extension_4_result
 *
 * The broad Record<string,unknown> boundary is the runtime tolerance layer
 * per §15.1. All internal logic uses the stricter types from
 * types/extension-4.d.ts per §14.5.
 *
 * Dispatcher order (§17.4): baseline → ext2 → ext3A → ext3B → ext4
 * Result attaches under extension_4_result only. No prior result objects mutated.
 */

import { normalizeExtension4 } from '../transforms/extension-4-normalizer';
import { validateExtension4Bounds, EXT4_FLAG_IDS } from '../validators/extension-4-bounds';
import {
  runTpvOnePass,
  runTpvIterative,
  computeRadiatorBaselineEmission,
  type TpvOnePassInput,
  type TpvIterativeInput,
  type ConvergenceControl,
} from '../formulas/tpv-recapture';
import type {
  Extension4Result,
  Extension4RadiatorBasis,
  Extension4Dependency3A,
  Extension4IterationHistoryEntry,
} from '../../types/extension-4.d';

// ─── Version constants §16.1 ──────────────────────────────────────────────────

const SPEC_VERSION   = 'v0.1.4' as const;
const BLUEPRINT_VERSION = 'v0.1.4' as const;

// ─── Broad input contract §15.1 ───────────────────────────────────────────────
// Runner accepts broad types at the runtime boundary per §15.1 note.
// Internal logic resolves stricter types from types/extension-4.d.ts.

export interface Extension4Input {
  scenario: Record<string, unknown>;
  run_packet: Record<string, unknown>;
  radiators: Array<Record<string, unknown>>;
  baseline_result?: Record<string, unknown> | null;
  extension_3a_result?: {
    extension_3a_enabled: boolean;
    convergence_attempted: boolean;
    convergence_iterations: number;
    convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
    blocking_on_nonconvergence?: boolean;
    t_sink_resolved_k: number | null;
    radiator_area_bol_required_m2: number | null;
    radiator_area_eol_required_m2: number | null;
  } | null;
}

// ─── Disabled result shape §16.2 ─────────────────────────────────────────────

function disabledResult(): Extension4Result {
  return {
    extension_4_enabled: false,
    model_extension_4_mode: 'disabled',
    spec_version: SPEC_VERSION,
    blueprint_version: null,
    convergence_attempted: false,
    convergence_iterations: 0,
    convergence_status: 'not_required',
    nonconvergence_blocking_applied: false,
    tpv_model_id: null,
    intercept_fraction: null,
    q_rad_baseline_w: null,
    q_tpv_in_w: null,
    eta_tpv_effective: null,
    p_elec_w: null,
    p_export_w: null,
    p_onboard_w: null,
    q_return_w: null,
    q_tpv_loss_w: null,
    q_tpv_local_to_radiator_w: null,
    q_tpv_separate_cooling_load_w: null,
    q_rad_net_w: null,
    q_relief_w: null,
    area_equivalent_bol_m2: null,
    area_equivalent_eol_m2: null,
    area_delta_bol_m2: null,
    area_delta_eol_m2: null,
    baseline_sink_temperature_k: null,
    baseline_radiator_temperature_k: null,
    tpv_cold_side_temperature_k: null,
    // iteration_history absent per §16.2
    defaults_applied: [],
    warnings: [],
    blocking_errors: [],
    transform_trace: ['extension_4_disabled_gate'],
  };
}

// ─── Invalid (blocked) result shape §16.3 ────────────────────────────────────

function invalidResult(
  mode: 'disabled' | 'one_pass' | 'iterative',
  blocking_errors: string[],
  warnings: string[],
  defaults_applied: string[],
  trace: string[]
): Extension4Result {
  return {
    extension_4_enabled: true,
    model_extension_4_mode: mode,
    spec_version: SPEC_VERSION,
    blueprint_version: BLUEPRINT_VERSION,
    convergence_attempted: false,
    convergence_iterations: 0,
    convergence_status: 'invalid',
    nonconvergence_blocking_applied: false,
    tpv_model_id: null,
    intercept_fraction: null,
    q_rad_baseline_w: null,
    q_tpv_in_w: null,
    eta_tpv_effective: null,
    p_elec_w: null,
    p_export_w: null,
    p_onboard_w: null,
    q_return_w: null,
    q_tpv_loss_w: null,
    q_tpv_local_to_radiator_w: null,
    q_tpv_separate_cooling_load_w: null,
    q_rad_net_w: null,
    q_relief_w: null,
    area_equivalent_bol_m2: null,
    area_equivalent_eol_m2: null,
    area_delta_bol_m2: null,
    area_delta_eol_m2: null,
    baseline_sink_temperature_k: null,
    baseline_radiator_temperature_k: null,
    tpv_cold_side_temperature_k: null,
    // iteration_history absent per §16.3
    defaults_applied,
    warnings,
    blocking_errors,
    transform_trace: trace,
  };
}

// ─── §10.1 / §10.2 Radiator-basis resolution ──────────────────────────────────

/**
 * Resolve the radiator basis per §10.1 (use same radiator base model resolved)
 * and §10.2 (field mapping with priority chain).
 *
 * §10.1: Extension 4 uses the same radiator basis already resolved by the
 * base model runtime. It does not perform independent radiator selection.
 *
 * If the base model uses a single radiator, use that object.
 * If multiple radiators, the base model aggregate basis is required.
 * In this repo, the base model resolves via radiators[0] as primary;
 * this is consistent with the base path's single-radiator usage in run-packet.ts.
 *
 * Returns null if basis cannot be resolved deterministically (§21 condition 1).
 */
function resolveRadiatorBasis(
  radiators: Array<Record<string, unknown>>,
  ext3a: Extension4Dependency3A | null | undefined,
  trace: string[]
): Extension4RadiatorBasis | null {
  // §10.1 — use same radiator object the base model already resolved
  const rad = radiators[0] ?? null;
  if (!rad) {
    trace.push('ext4-runner: radiator basis UNRESOLVABLE — radiators array empty');
    return null;
  }

  // §10.2 — T_rad: target_surface_temp_k required
  const t_rad = rad['target_surface_temp_k'];
  if (typeof t_rad !== 'number' || !isFinite(t_rad) || t_rad <= 0) {
    trace.push(`ext4-runner: radiator basis UNRESOLVABLE — target_surface_temp_k invalid: ${t_rad}`);
    return null;
  }
  trace.push(`ext4-runner: T_rad resolved from target_surface_temp_k=${t_rad} K`);

  // §10.2 — A_rad: effective_area_m2; fallback to base-model computed area
  let a_rad: number | null = null;
  const raw_area = rad['effective_area_m2'];
  if (typeof raw_area === 'number' && isFinite(raw_area) && raw_area > 0) {
    a_rad = raw_area;
    trace.push(`ext4-runner: A_rad resolved from effective_area_m2=${a_rad} m²`);
  } else {
    trace.push(`ext4-runner: A_rad — effective_area_m2 absent/invalid; no ext4-only area invented per §10.2`);
    return null; // §10.2: do not invent ext4-only area
  }

  // §10.2 — ε_rad: emissivity priority chain
  // surface_emissivity_eol_override → derived EOL → surface_emissivity_bol → emissivity
  // Same formula used by 3A per §10.2: ε_eol = ε_bol * (1 - degradation), clamped to (0,1]
  let resolved_emissivity: number;
  let emissivity_source: string;

  const eol_override = rad['surface_emissivity_eol_override'];
  const bol = rad['surface_emissivity_bol'];
  const degradation = rad['emissivity_degradation_fraction'];
  const emissivity_fallback = rad['emissivity'];

  if (typeof eol_override === 'number' && isFinite(eol_override) && eol_override > 0) {
    resolved_emissivity = Math.min(1, Math.max(1e-9, eol_override));
    emissivity_source = 'surface_emissivity_eol_override';
  } else if (
    typeof bol === 'number' && isFinite(bol) && bol > 0 &&
    typeof degradation === 'number' && isFinite(degradation)
  ) {
    const derived_eol = bol * (1 - degradation);
    resolved_emissivity = Math.min(1, Math.max(1e-9, derived_eol));
    emissivity_source = `derived_eol(bol=${bol}, degradation=${degradation})=${derived_eol.toFixed(6)}`;
  } else if (typeof bol === 'number' && isFinite(bol) && bol > 0) {
    resolved_emissivity = Math.min(1, Math.max(1e-9, bol));
    emissivity_source = `surface_emissivity_bol=${bol}`;
  } else if (typeof emissivity_fallback === 'number' && isFinite(emissivity_fallback) && emissivity_fallback > 0) {
    resolved_emissivity = Math.min(1, Math.max(1e-9, emissivity_fallback));
    emissivity_source = `emissivity=${emissivity_fallback}`;
  } else {
    trace.push('ext4-runner: ε_rad UNRESOLVABLE — all emissivity fields absent/invalid');
    return null;
  }
  trace.push(`ext4-runner: ε_rad resolved from ${emissivity_source} → ${resolved_emissivity.toFixed(6)}`);

  // §10.2 — T_space: background_sink_temp_k_override → t_sink_resolved_k → sink_temp_k
  let resolved_sink_temperature_k: number;
  let sink_source: string;

  const bg_override = rad['background_sink_temp_k_override'];
  const sink_temp_k = rad['sink_temp_k'];
  const t_sink_3a = ext3a?.t_sink_resolved_k ?? null;

  if (typeof bg_override === 'number' && isFinite(bg_override) && bg_override > 0) {
    resolved_sink_temperature_k = bg_override;
    sink_source = `background_sink_temp_k_override=${bg_override}`;
  } else if (typeof t_sink_3a === 'number' && isFinite(t_sink_3a) && t_sink_3a > 0) {
    resolved_sink_temperature_k = t_sink_3a;
    sink_source = `extension_3a_result.t_sink_resolved_k=${t_sink_3a}`;
  } else if (typeof sink_temp_k === 'number' && isFinite(sink_temp_k) && sink_temp_k >= 0) {
    resolved_sink_temperature_k = sink_temp_k;
    sink_source = `sink_temp_k=${sink_temp_k}`;
  } else {
    trace.push('ext4-runner: T_space UNRESOLVABLE — no valid sink temperature source');
    return null;
  }
  trace.push(`ext4-runner: T_space resolved from ${sink_source} → ${resolved_sink_temperature_k} K`);

  return {
    target_surface_temp_k: t_rad,
    effective_area_m2: a_rad,
    resolved_emissivity,
    resolved_sink_temperature_k,
    resolution_trace: trace.slice(), // defensive copy; caller also holds ref to same trace array
  };
}

// ─── Default convergence control (§12.7) ─────────────────────────────────────

const DEFAULT_CONVERGENCE_CONTROL: ConvergenceControl = {
  max_iterations: 100,
  tolerance_abs_w: 1.0,
  tolerance_rel_fraction: 0.001,
  runaway_multiplier: 4.0,
  blocking_on_nonconvergence: false,
};

function resolveConvergenceControl(
  scenario: Record<string, unknown>,
  ext3a: Extension4Dependency3A | null | undefined,
  trace: string[]
): ConvergenceControl {
  // Inherit from 3A per §12.7
  const raw_cc = scenario['convergence_control'] as Record<string, unknown> | null | undefined;

  const max_iterations =
    typeof raw_cc?.['max_iterations'] === 'number'
      ? raw_cc['max_iterations'] as number
      : DEFAULT_CONVERGENCE_CONTROL.max_iterations;

  const tolerance_abs_w =
    typeof raw_cc?.['tolerance_abs_w'] === 'number'
      ? raw_cc['tolerance_abs_w'] as number
      : DEFAULT_CONVERGENCE_CONTROL.tolerance_abs_w;

  const tolerance_rel_fraction =
    typeof raw_cc?.['tolerance_rel_fraction'] === 'number'
      ? raw_cc['tolerance_rel_fraction'] as number
      : DEFAULT_CONVERGENCE_CONTROL.tolerance_rel_fraction;

  const runaway_multiplier =
    typeof raw_cc?.['runaway_multiplier'] === 'number'
      ? raw_cc['runaway_multiplier'] as number
      : DEFAULT_CONVERGENCE_CONTROL.runaway_multiplier;

  // §12.9: blocking_on_nonconvergence inherited from 3A; default false if absent
  let blocking_on_nonconvergence = DEFAULT_CONVERGENCE_CONTROL.blocking_on_nonconvergence;
  let blocking_source = 'default=false';

  if (typeof raw_cc?.['blocking_on_nonconvergence'] === 'boolean') {
    blocking_on_nonconvergence = raw_cc['blocking_on_nonconvergence'] as boolean;
    blocking_source = `scenario.convergence_control.blocking_on_nonconvergence=${blocking_on_nonconvergence}`;
  } else if (typeof ext3a?.blocking_on_nonconvergence === 'boolean') {
    blocking_on_nonconvergence = ext3a.blocking_on_nonconvergence;
    blocking_source = `ext3a.blocking_on_nonconvergence=${blocking_on_nonconvergence}`;
  } else {
    trace.push('ext4-runner: blocking_on_nonconvergence absent from cc and 3A — defaulting false per §12.9');
  }

  trace.push(
    `ext4-runner: convergence_control resolved — max_iterations=${max_iterations} ` +
    `tol_abs=${tolerance_abs_w} tol_rel=${tolerance_rel_fraction} ` +
    `runaway=${runaway_multiplier} blocking=${blocking_on_nonconvergence} (${blocking_source})`
  );

  return {
    max_iterations,
    tolerance_abs_w,
    tolerance_rel_fraction,
    runaway_multiplier,
    blocking_on_nonconvergence,
  };
}

// ─── Informational flag helpers — §13.5, §18.3 ───────────────────────────────

function checkInfoFlags(
  result_vals: {
    intercept_fraction: number;
    eta_tpv_effective: number;
    p_elec_w: number;
  },
  mode: string,
  warnings: string[]
): void {
  void mode; // §18.3 — mode available for future flag routing; suppressed per tsconfig noUnusedLocals=false
  if (result_vals.intercept_fraction === 0) {
    warnings.push(`${EXT4_FLAG_IDS.INFO_ZERO_INTERCEPT}: χ_int = 0`);
  }
  if (result_vals.eta_tpv_effective === 0 || result_vals.p_elec_w === 0) {
    warnings.push(`${EXT4_FLAG_IDS.INFO_ZERO_EFFICIENCY}: η_tpv=0 or P_elec=0`);
  }
}

// ─── Main runner §14.4 ───────────────────────────────────────────────────────

/**
 * runExtension4
 *
 * Implements §14.4 responsibilities and §17.1–§17.3 pseudocode.
 * Blueprint canonical runtime sequence §steps 1–12.
 * Returns extension_4_result only. Does not mutate any upstream result object.
 */
export function runExtension4(input: Extension4Input): Extension4Result {
  const transform_trace: string[] = ['run-extension-4: start'];

  // ── Blueprint step 1 — read scenario activation state ───────────────────
  const scenario = input.scenario;

  // ── §17.1 — normalize ────────────────────────────────────────────────────
  const norm = normalizeExtension4(scenario);
  transform_trace.push(...norm.trace);

  // ── Blueprint step 2 — disabled fast path §16.2 ─────────────────────────
  if (!norm.enabled) {
    transform_trace.push('run-extension-4: disabled — emitting deterministic disabled result');
    const r = disabledResult();
    r.transform_trace = [...transform_trace, 'run-extension-4: complete (disabled)'];
    return r;
  }

  // ── §8.3 / §8.4 — cohabitation precondition enforcement ─────────────────
  // Build typed 3A dependency surface from broad input
  const raw3a = input.extension_3a_result;
  const ext3a: Extension4Dependency3A | null =
    raw3a != null
      ? {
          extension_3a_enabled:         raw3a.extension_3a_enabled,
          convergence_attempted:         raw3a.convergence_attempted,
          convergence_iterations:        raw3a.convergence_iterations,
          convergence_status:            raw3a.convergence_status,
          blocking_on_nonconvergence:    raw3a.blocking_on_nonconvergence,
          t_sink_resolved_k:             raw3a.t_sink_resolved_k,
          radiator_area_bol_required_m2: raw3a.radiator_area_bol_required_m2,
          radiator_area_eol_required_m2: raw3a.radiator_area_eol_required_m2,
        }
      : null;

  // ── Blueprint step 3 — validate bounds ───────────────────────────────────
  const boundsResult = validateExtension4Bounds(norm, ext3a);
  transform_trace.push(...boundsResult.trace);

  const all_blocking = [...boundsResult.blocking_errors];
  const all_warnings = [...boundsResult.warnings];
  const defaults_applied = [...norm.defaults_applied];

  if (!boundsResult.passed || all_blocking.length > 0) {
    transform_trace.push(`run-extension-4: BLOCKED — ${all_blocking.length} blocking error(s)`);
    transform_trace.push('run-extension-4: complete (invalid)');
    return invalidResult(
      norm.mode,
      all_blocking,
      all_warnings,
      defaults_applied,
      transform_trace
    );
  }

  const cfg = norm.config!;

  // ── Blueprint step 4 — acquire baseline radiator state §10.1 / §10.2 ────
  const radiatorBasis = resolveRadiatorBasis(input.radiators, ext3a, transform_trace);
  if (!radiatorBasis) {
    all_blocking.push(`${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: radiator basis could not be resolved deterministically per §10.1 / §21 condition 1`);
    transform_trace.push('run-extension-4: BLOCKED — radiator basis unresolvable');
    transform_trace.push('run-extension-4: complete (invalid)');
    return invalidResult(norm.mode, all_blocking, all_warnings, defaults_applied, transform_trace);
  }

  // §9.2 guard: Q_rad_baseline must not be negative
  // (actual value computed inside formula; guard here on temperature ordering)
  if (radiatorBasis.target_surface_temp_k <= radiatorBasis.resolved_sink_temperature_k) {
    all_blocking.push(
      `${EXT4_FLAG_IDS.ERR_INVALID_BOUNDS}: T_rad=${radiatorBasis.target_surface_temp_k} K <= T_space=${radiatorBasis.resolved_sink_temperature_k} K; Q_rad_baseline would be non-positive`
    );
    transform_trace.push('run-extension-4: BLOCKED — T_rad <= T_space');
    transform_trace.push('run-extension-4: complete (invalid)');
    return invalidResult(norm.mode, all_blocking, all_warnings, defaults_applied, transform_trace);
  }

  // Q_base_ref for §9.14: derived from formula output (Q_rad_baseline).
  // Resolved inside each mode branch — not pre-declared here per HOLE-001.

  // ── Mode branch: one-pass or iterative ───────────────────────────────────

  if (norm.mode === 'one_pass') {
    // §8.4 — one-pass without 3A: allowed with informational flag
    const without_3a = !ext3a?.extension_3a_enabled;
    if (without_3a) {
      all_warnings.push(`${EXT4_FLAG_IDS.INFO_ONEPASS_NO_3A}: one-pass executed without 3A iterative authority`);
      transform_trace.push('ext4-runner: EXT4-INFO-ONEPASS-NO-3A — executed_without_3a_authority=true');
    }
    all_warnings.push(`${EXT4_FLAG_IDS.INFO_ONEPASS}: one-pass mode used`);

    // Run one-pass formula §11
    // q_base_ref_w = Q_rad_baseline (computed inside runTpvOnePass; we need it for area metrics)
    // For §9.14: Q_base_ref is the Q_rad_baseline computed at baseline state — same formula
    // We pass null here; the formula computes Q_rad_baseline and uses it directly for area ratio.
    // The formula resolves Q_base_ref internally as Q_rad_baseline.
    const opInput: TpvOnePassInput = {
      config: cfg,
      radiator_basis: radiatorBasis,
      q_base_ref_w: null, // resolved to q_rad_baseline inside formula for §9.14
      ext3a,
    };
    // Compute Q_rad_baseline for q_base_ref_w before calling
    // (formula re-computes it; we set q_base_ref_w = the result's q_rad_baseline_w)
    const opResult = runTpvOnePass({
      ...opInput,
      q_base_ref_w: null, // first pass to get baseline
    });
    // Now re-run with q_base_ref_w set to the computed Q_rad_baseline §9.14
    const opFinal = runTpvOnePass({
      config: cfg,
      radiator_basis: radiatorBasis,
      q_base_ref_w: opResult.q_rad_baseline_w,
      ext3a,
    });

    // §13.5 informational flags
    checkInfoFlags(
      { intercept_fraction: opFinal.intercept_fraction, eta_tpv_effective: opFinal.eta_tpv_effective, p_elec_w: opFinal.p_elec_w },
      norm.mode,
      all_warnings
    );

    // §9.14 guard: if zero_base_ref triggered emit flag
    if (opFinal.zero_base_ref_guard_triggered) {
      all_warnings.push(`${EXT4_FLAG_IDS.WARN_ZERO_BASE_REF}: Q_base_ref <= 0; equivalent area metrics nulled`);
    }

    transform_trace.push(`ext4-runner: one-pass complete q_rad_net=${opFinal.q_rad_net_w?.toFixed(2)} W relief=${opFinal.q_relief_w?.toFixed(2)} W`);

    // §16.4 — one-pass result shape
    // iteration_history: absent if minimal, 1 entry if full
    const result: Extension4Result = {
      extension_4_enabled: true,
      model_extension_4_mode: 'one_pass',
      spec_version: SPEC_VERSION,
      blueprint_version: BLUEPRINT_VERSION,
      convergence_attempted: false,            // §11.3
      convergence_iterations: 1,              // §11.3
      convergence_status: 'not_required',      // §11.3
      nonconvergence_blocking_applied: false,  // §11.3
      tpv_model_id: cfg.tpv_model_id,
      intercept_fraction: opFinal.intercept_fraction,
      q_rad_baseline_w: opFinal.q_rad_baseline_w,
      q_tpv_in_w: opFinal.q_tpv_in_w,
      eta_tpv_effective: opFinal.eta_tpv_effective,
      p_elec_w: opFinal.p_elec_w,
      p_export_w: opFinal.p_export_w,
      p_onboard_w: opFinal.p_onboard_w,
      q_return_w: opFinal.q_return_w,
      q_tpv_loss_w: opFinal.q_tpv_loss_w,
      q_tpv_local_to_radiator_w: opFinal.q_tpv_local_to_radiator_w,
      q_tpv_separate_cooling_load_w: opFinal.q_tpv_separate_cooling_load_w,
      q_rad_net_w: opFinal.q_rad_net_w,
      q_relief_w: opFinal.q_relief_w,
      area_equivalent_bol_m2: opFinal.area_equivalent_bol_m2,
      area_equivalent_eol_m2: opFinal.area_equivalent_eol_m2,
      area_delta_bol_m2: opFinal.area_delta_bol_m2,
      area_delta_eol_m2: opFinal.area_delta_eol_m2,
      baseline_sink_temperature_k: radiatorBasis.resolved_sink_temperature_k,
      baseline_radiator_temperature_k: radiatorBasis.target_surface_temp_k,
      tpv_cold_side_temperature_k: cfg.tpv_cold_side_temperature_k ?? null,
      defaults_applied,
      warnings: all_warnings,
      blocking_errors: [],
      transform_trace: [...transform_trace, 'run-extension-4: complete (one-pass)'],
    };

    // §11.3 / §16.4: iteration_history absent in minimal; 1 entry in full
    if (cfg.iteration_report_detail === 'full') {
      result.iteration_history = [opFinal.iteration_entry];
    }
    // else: absent (not set) per §16.5 "absent not empty array is canonical minimal form"

    return result;
  }

  // ── Iterative path ────────────────────────────────────────────────────────

  // §8.3 guard already enforced by bounds validator; reaching here means 3A is present
  const cc = resolveConvergenceControl(scenario, ext3a, transform_trace);

  // Compute Q_rad_baseline first for q_base_ref_w per §9.14
  // Same formula used by iterative first iteration — §12.3 initial state
  const q_rad_baseline_pre = computeRadiatorBaselineEmission(radiatorBasis);
  transform_trace.push(`ext4-runner: Q_rad_baseline=${q_rad_baseline_pre.toFixed(2)} W (pre-iterative basis)`);

  const iterInput: TpvIterativeInput = {
    config: cfg,
    radiator_basis: radiatorBasis,
    convergence_control: cc,
    q_base_ref_w: q_rad_baseline_pre,
    ext3a,
  };

  const iterResult = runTpvIterative(iterInput);
  transform_trace.push(
    `ext4-runner: iterative complete status=${iterResult.convergence_status} ` +
    `iterations=${iterResult.convergence_iterations} ` +
    `q_rad_net=${iterResult.q_rad_net_w.toFixed(2)} W ` +
    `relief=${iterResult.q_relief_w.toFixed(2)} W`
  );

  // §12.9 — nonconvergence blocking
  let nonconvergence_blocking_applied = false;
  if (iterResult.convergence_status === 'nonconverged') {
    all_warnings.push(`${EXT4_FLAG_IDS.WARN_NONCONVERGED}: max iterations (${cc.max_iterations}) exhausted without convergence`);
    nonconvergence_blocking_applied = cc.blocking_on_nonconvergence;
    if (cc.blocking_on_nonconvergence) {
      all_blocking.push(`${EXT4_FLAG_IDS.WARN_NONCONVERGED}: nonconvergence with blocking_on_nonconvergence=true`);
    }
  }
  if (iterResult.convergence_status === 'runaway') {
    all_blocking.push(`${EXT4_FLAG_IDS.ERR_RUNAWAY}: runaway detected at iteration ${iterResult.convergence_iterations}`);
  }

  // §13.5 informational flags
  checkInfoFlags(
    { intercept_fraction: iterResult.intercept_fraction, eta_tpv_effective: iterResult.eta_tpv_effective, p_elec_w: iterResult.p_elec_w },
    norm.mode,
    all_warnings
  );

  // §9.14 guard
  if (iterResult.zero_base_ref_guard_triggered) {
    all_warnings.push(`${EXT4_FLAG_IDS.WARN_ZERO_BASE_REF}: Q_base_ref <= 0; equivalent area metrics nulled`);
  }

  // §16.5 — iterative result shape
  const iterConvergenceStatus = iterResult.convergence_status;

  // Build iteration history per detail mode
  let iteration_history: Extension4IterationHistoryEntry[] | undefined;
  if (cfg.iteration_report_detail === 'full') {
    iteration_history = iterResult.iteration_history;
  }
  // else: absent (not set) — §16.5 "absent not empty array is canonical minimal form"

  const result: Extension4Result = {
    extension_4_enabled: true,
    model_extension_4_mode: 'iterative',
    spec_version: SPEC_VERSION,
    blueprint_version: BLUEPRINT_VERSION,
    convergence_attempted: true,                     // §16.5
    convergence_iterations: iterResult.convergence_iterations,
    convergence_status: iterConvergenceStatus,
    nonconvergence_blocking_applied,
    tpv_model_id: cfg.tpv_model_id,
    intercept_fraction: iterResult.intercept_fraction,
    q_rad_baseline_w: iterResult.q_rad_baseline_w,
    q_tpv_in_w: iterResult.q_tpv_in_w,
    eta_tpv_effective: iterResult.eta_tpv_effective,
    p_elec_w: iterResult.p_elec_w,
    p_export_w: iterResult.p_export_w,
    p_onboard_w: iterResult.p_onboard_w,
    q_return_w: iterResult.q_return_w,
    q_tpv_loss_w: iterResult.q_tpv_loss_w,
    q_tpv_local_to_radiator_w: iterResult.q_tpv_local_to_radiator_w,
    q_tpv_separate_cooling_load_w: iterResult.q_tpv_separate_cooling_load_w,
    q_rad_net_w: iterResult.q_rad_net_w,
    q_relief_w: iterResult.q_relief_w,
    area_equivalent_bol_m2: iterResult.area_equivalent_bol_m2,
    area_equivalent_eol_m2: iterResult.area_equivalent_eol_m2,
    area_delta_bol_m2: iterResult.area_delta_bol_m2,
    area_delta_eol_m2: iterResult.area_delta_eol_m2,
    baseline_sink_temperature_k: radiatorBasis.resolved_sink_temperature_k,
    baseline_radiator_temperature_k: radiatorBasis.target_surface_temp_k,
    tpv_cold_side_temperature_k: cfg.tpv_cold_side_temperature_k ?? null,
    ...(iteration_history !== undefined ? { iteration_history } : {}),
    defaults_applied,
    warnings: all_warnings,
    blocking_errors: all_blocking,
    transform_trace: [...transform_trace, 'run-extension-4: complete (iterative)'],
  };

  return result;
}
