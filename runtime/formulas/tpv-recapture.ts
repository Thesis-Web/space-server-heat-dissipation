/**
 * runtime/formulas/tpv-recapture.ts
 * Extension 4 — TPV Cells on Radiator Surface (Photon Recapture Loop)
 * Pure formula functions only. No side effects.
 *
 * Governing law: ext4-spec-v0.1.4 §14.2, §9.1–§9.14, §11, §12
 * Blueprint law:  blueprint-v0.1.4 §Functional-Architecture (layers 3–6)
 *
 * All runtime modules import types from types/extension-4.d.ts per §14.5.
 * This module is the pure computation leaf — no logging, no state, no imports
 * from other extension modules.
 */

import { STEFAN_BOLTZMANN } from '../constants/constants';
import type {
  TpvRecaptureConfig,
  Extension4RadiatorBasis,
  Extension4Dependency3A,
  Extension4IterationHistoryEntry,
} from '../../types/extension-4.d';

// ─── §14.2 Required pure function signatures ──────────────────────────────────

/**
 * Compute effective intercepted fraction.
 * χ_int = coverage_fraction * radiator_view_factor_to_tpv *
 *         spectral_capture_fraction * coupling_derate_fraction
 * §9.3
 */
export function computeInterceptFraction(config: TpvRecaptureConfig): number {
  return (
    config.coverage_fraction *
    config.radiator_view_factor_to_tpv *
    config.spectral_capture_fraction *
    config.coupling_derate_fraction
  );
}

/**
 * Compute effective TPV conversion efficiency.
 * Fixed mode:        η_tpv = eta_tpv_fixed                                 §9.5
 * Carnot-bounded:   η_tpv = eta_tpv_carnot_fraction * max(0, 1 - T_cold/T_rad_eff)  §9.6
 *
 * @param params.config          Normalized TPV config.
 * @param params.t_rad_k         Hot-side radiator temperature for this iteration.
 */
export function computeTpvEfficiency(params: {
  config: TpvRecaptureConfig;
  t_rad_k: number;
}): number {
  const { config, t_rad_k } = params;

  if (config.conversion_efficiency_mode === 'fixed') {
    // §9.5 — eta_tpv_fixed is guaranteed non-null by bounds validator
    return config.eta_tpv_fixed ?? 0;
  }

  // carnot_bounded §9.6
  const t_cold = config.tpv_cold_side_temperature_k ?? 0;
  const eta_carnot_fraction = config.eta_tpv_carnot_fraction ?? 0;
  // T_rad_eff = max(T_rad, T_cold + 1e-9) — prevents division by zero
  const t_rad_eff = Math.max(t_rad_k, t_cold + 1e-9);
  const carnot_term = Math.max(0, 1 - t_cold / t_rad_eff);
  return eta_carnot_fraction * carnot_term;
}

/**
 * Compute TPV electrical output.
 * P_elec = η_tpv * Q_tpv_in
 * §9.5 (applied generically)
 */
export function computeTpvElectricalOutput(qIn: number, eta: number): number {
  return eta * qIn;
}

/**
 * Compute TPV local inefficiency heat.
 * Q_tpv_loss = Q_tpv_in - P_elec
 * §9.7
 */
export function computeTpvLossHeat(qIn: number, pElec: number): number {
  return qIn - pElec;
}

/**
 * Split recovered electricity into export and onboard fractions.
 * P_export  = f_exp * P_elec       §9.8
 * P_onboard = (1 - f_exp) * P_elec §9.9
 */
export function splitRecoveredElectricity(
  pElec: number,
  exportFraction: number
): { p_export_w: number; p_onboard_w: number } {
  return {
    p_export_w: exportFraction * pElec,
    p_onboard_w: (1 - exportFraction) * pElec,
  };
}

/**
 * Compute returned onboard heat.
 * Q_return = α_ret * P_onboard
 * §9.10
 */
export function computeOnboardReturnHeat(pOnboard: number, alphaRet: number): number {
  return alphaRet * pOnboard;
}

/**
 * Compute net radiator burden.
 * Q_rad_net = Q_rad_baseline - P_export + Q_return + Q_tpv_local_to_radiator
 * §9.12
 */
export function computeNetRadiatorBurden(
  basis: number,
  pExport: number,
  qReturn: number,
  qTpvLocalToRadiator: number
): number {
  return basis - pExport + qReturn + qTpvLocalToRadiator;
}

// ─── TPV local-loss booking per cell_cooling_mode §9.11 ───────────────────────

/**
 * Resolve TPV local-loss booking per cell_cooling_mode.
 * returns_to_radiator: q_tpv_local_to_radiator = Q_tpv_loss; q_tpv_separate_cooling = 0
 * separate_cooling:    q_tpv_local_to_radiator = 0;           q_tpv_separate_cooling = Q_tpv_loss
 * §9.11
 */
function bookTpvLocalLoss(config: TpvRecaptureConfig, qTpvLoss: number): {
  q_tpv_local_to_radiator_w: number;
  q_tpv_separate_cooling_load_w: number;
} {
  if (config.cell_cooling_mode === 'returns_to_radiator') {
    return { q_tpv_local_to_radiator_w: qTpvLoss, q_tpv_separate_cooling_load_w: 0 };
  }
  return { q_tpv_local_to_radiator_w: 0, q_tpv_separate_cooling_load_w: qTpvLoss };
}

// ─── Equivalent area metric helpers §9.14 ─────────────────────────────────────

/**
 * Compute equivalent radiator area metrics when 3A context and Q_base_ref > 0.
 * Guard: if Q_base_ref <= 0, returns all null and emits EXT4-WARN-ZERO-BASE-REF.
 * §9.14
 */
export function computeEquivalentAreaMetrics(params: {
  q_rad_net_w: number;
  q_base_ref_w: number | null;
  ext3a: Extension4Dependency3A | null | undefined;
}): {
  area_equivalent_bol_m2: number | null;
  area_equivalent_eol_m2: number | null;
  area_delta_bol_m2: number | null;
  area_delta_eol_m2: number | null;
  zero_base_ref_guard_triggered: boolean;
} {
  const { q_rad_net_w, q_base_ref_w, ext3a } = params;

  const bol = ext3a?.radiator_area_bol_required_m2 ?? null;
  const eol = ext3a?.radiator_area_eol_required_m2 ?? null;

  // Guard: Q_base_ref <= 0 or non-finite, or 3A area context absent
  if (
    q_base_ref_w === null ||
    !isFinite(q_base_ref_w) ||
    q_base_ref_w <= 0 ||
    bol === null ||
    eol === null
  ) {
    return {
      area_equivalent_bol_m2: null,
      area_equivalent_eol_m2: null,
      area_delta_bol_m2: null,
      area_delta_eol_m2: null,
      zero_base_ref_guard_triggered: true,
    };
  }

  const r_area = q_rad_net_w / q_base_ref_w;
  const a_equiv_bol = r_area * bol;
  const a_equiv_eol = r_area * eol;

  return {
    area_equivalent_bol_m2: a_equiv_bol,
    area_equivalent_eol_m2: a_equiv_eol,
    area_delta_bol_m2: a_equiv_bol - bol,
    area_delta_eol_m2: a_equiv_eol - eol,
    zero_base_ref_guard_triggered: false,
  };
}

// ─── Baseline radiator emission §9.2 ─────────────────────────────────────────

/**
 * Compute baseline radiator-emitted thermal power.
 * Q_rad_baseline = ε_rad * σ * A_rad * (T_rad^4 - T_space^4)
 * Uses STEFAN_BOLTZMANN from runtime constants. §9.2.
 */
export function computeRadiatorBaselineEmission(basis: Extension4RadiatorBasis): number {
  const { target_surface_temp_k: t_rad, effective_area_m2: a_rad,
          resolved_emissivity: eps, resolved_sink_temperature_k: t_space } = basis;
  return eps * STEFAN_BOLTZMANN * a_rad * (Math.pow(t_rad, 4) - Math.pow(t_space, 4));
}

// ─── One-pass analytical mode §11, §14.2 ─────────────────────────────────────

export interface TpvOnePassInput {
  config: TpvRecaptureConfig;
  radiator_basis: Extension4RadiatorBasis;
  /** Q_base_ref for equivalent-area computation. §9.14. */
  q_base_ref_w: number | null;
  ext3a: Extension4Dependency3A | null | undefined;
}

export interface TpvOnePassOutput {
  // First-order thermal accounting
  q_rad_baseline_w: number;
  intercept_fraction: number;
  q_tpv_in_w: number;
  eta_tpv_effective: number;
  p_elec_w: number;
  q_tpv_loss_w: number;
  p_export_w: number;
  p_onboard_w: number;
  q_return_w: number;
  q_tpv_local_to_radiator_w: number;
  q_tpv_separate_cooling_load_w: number;
  q_rad_net_w: number;
  q_relief_w: number;
  // Equivalent area metrics
  area_equivalent_bol_m2: number | null;
  area_equivalent_eol_m2: number | null;
  area_delta_bol_m2: number | null;
  area_delta_eol_m2: number | null;
  zero_base_ref_guard_triggered: boolean;
  // One-pass iteration history (exactly one entry if full detail)
  iteration_entry: Extension4IterationHistoryEntry;
}

/**
 * Execute one-pass TPV recapture analysis.
 * Mandatory sequence per §11.2:
 * 1. Resolve baseline radiator basis (pre-resolved, passed in)
 * 2. Compute χ_int
 * 3. Compute Q_tpv_in
 * 4. Compute η_tpv, P_elec, Q_tpv_loss
 * 5. Compute P_export, P_onboard, Q_return
 * 6. Compute Q_rad_net
 * 7. Compute equivalent area metrics if 3A available and Q_base_ref > 0
 * 8. Return result (emission handled by runner)
 *
 * One-pass output truth: §11.3
 */
export function runTpvOnePass(input: TpvOnePassInput): TpvOnePassOutput {
  const { config, radiator_basis } = input;

  // Step 1 — basis already resolved by caller per §10.1 and §10.2
  const q_rad_baseline_w = computeRadiatorBaselineEmission(radiator_basis);

  // Step 2–3 — intercept
  const intercept_fraction = computeInterceptFraction(config);
  const q_tpv_in_w = intercept_fraction * q_rad_baseline_w;

  // Step 4 — efficiency and electrical output
  const eta_tpv_effective = computeTpvEfficiency({
    config,
    t_rad_k: radiator_basis.target_surface_temp_k,
  });
  const p_elec_w = computeTpvElectricalOutput(q_tpv_in_w, eta_tpv_effective);
  const q_tpv_loss_w = computeTpvLossHeat(q_tpv_in_w, p_elec_w);

  // Step 5 — export/onboard split and return heat
  const { p_export_w, p_onboard_w } = splitRecoveredElectricity(
    p_elec_w,
    config.export_fraction
  );
  const q_return_w = computeOnboardReturnHeat(p_onboard_w, config.onboard_return_heat_fraction);

  // Step 5 — local-loss booking §9.11
  const { q_tpv_local_to_radiator_w, q_tpv_separate_cooling_load_w } =
    bookTpvLocalLoss(config, q_tpv_loss_w);

  // Step 6 — net burden §9.12
  const q_rad_net_w = computeNetRadiatorBurden(
    q_rad_baseline_w,
    p_export_w,
    q_return_w,
    q_tpv_local_to_radiator_w
  );

  // §9.13 — relief metric
  const q_relief_w = q_rad_baseline_w - q_rad_net_w;

  // Step 7 — equivalent area metrics §9.14
  const areaMetrics = computeEquivalentAreaMetrics({
    q_rad_net_w,
    q_base_ref_w: input.q_base_ref_w,
    ext3a: input.ext3a,
  });

  // Build iteration entry (used if iteration_report_detail='full')
  // One-pass has index 1, no prior basis for delta. §15.3.
  const iteration_entry: Extension4IterationHistoryEntry = {
    iteration_index: 1,
    q_rad_basis_w: q_rad_baseline_w,
    q_tpv_in_w,
    eta_tpv_effective,
    p_elec_w,
    p_export_w,
    p_onboard_w,
    q_return_w,
    q_tpv_loss_w,
    q_tpv_local_to_radiator_w,
    q_tpv_separate_cooling_load_w,
    q_rad_net_w,
    abs_delta_w: null,       // no prior basis in one-pass
    rel_delta_fraction: null,
  };

  return {
    q_rad_baseline_w,
    intercept_fraction,
    q_tpv_in_w,
    eta_tpv_effective,
    p_elec_w,
    q_tpv_loss_w,
    p_export_w,
    p_onboard_w,
    q_return_w,
    q_tpv_local_to_radiator_w,
    q_tpv_separate_cooling_load_w,
    q_rad_net_w,
    q_relief_w,
    ...areaMetrics,
    iteration_entry,
  };
}

// ─── Iterative analytical mode §12, §14.2 ────────────────────────────────────

export interface ConvergenceControl {
  max_iterations: number;
  tolerance_abs_w: number;
  tolerance_rel_fraction: number;
  runaway_multiplier: number;
  blocking_on_nonconvergence: boolean;
}

export interface TpvIterativeInput {
  config: TpvRecaptureConfig;
  radiator_basis: Extension4RadiatorBasis;
  convergence_control: ConvergenceControl;
  q_base_ref_w: number | null;
  ext3a: Extension4Dependency3A | null | undefined;
}

export interface TpvIterativeOutput {
  convergence_status: 'converged' | 'nonconverged' | 'runaway';
  convergence_iterations: number;
  // Final-iterate values
  q_rad_baseline_w: number;
  intercept_fraction: number;
  q_tpv_in_w: number;
  eta_tpv_effective: number;
  p_elec_w: number;
  q_tpv_loss_w: number;
  p_export_w: number;
  p_onboard_w: number;
  q_return_w: number;
  q_tpv_local_to_radiator_w: number;
  q_tpv_separate_cooling_load_w: number;
  q_rad_net_w: number;
  q_relief_w: number;
  // Equivalent area metrics
  area_equivalent_bol_m2: number | null;
  area_equivalent_eol_m2: number | null;
  area_delta_bol_m2: number | null;
  area_delta_eol_m2: number | null;
  zero_base_ref_guard_triggered: boolean;
  // Iteration history (all entries, empty if minimal mode — caller filters)
  iteration_history: Extension4IterationHistoryEntry[];
}

/**
 * Execute iterative TPV recapture analysis.
 * Mandatory sequence per §12.4 iterative update law.
 * State variables per §12.2. Initial state per §12.3.
 * Convergence test per §12.6. Runaway per §12.8.
 * Non-convergence behavior per §12.9.
 */
export function runTpvIterative(input: TpvIterativeInput): TpvIterativeOutput {
  const { config, radiator_basis, convergence_control: cc } = input;

  // §12.3 — initial state
  const q_rad_baseline_w = computeRadiatorBaselineEmission(radiator_basis);
  const intercept_fraction = computeInterceptFraction(config); // static across iterations §12.4.1

  // §12.3 — Q_rad_net^(0) preserved for runaway-threshold computation
  const q_rad_net_0 = q_rad_baseline_w;

  let q_basis_prev = q_rad_baseline_w;
  const t_rad_prev = radiator_basis.target_surface_temp_k; // §12.3 — T_rad fixed at baseline in v0.1.4 per §12.4.7

  const iteration_history: Extension4IterationHistoryEntry[] = [];

  for (let k = 1; k <= cc.max_iterations; k++) {
    // §12.4.1 — intercept fraction is static
    const chi_int = intercept_fraction;

    // §12.4.2
    const q_tpv_in_w = chi_int * q_basis_prev;

    // §12.4.3 — efficiency (carnot_bounded uses t_rad_prev per spec)
    const eta_tpv_effective = computeTpvEfficiency({
      config,
      t_rad_k: t_rad_prev,
    });

    // §12.4.4
    const p_elec_w = computeTpvElectricalOutput(q_tpv_in_w, eta_tpv_effective);
    const q_tpv_loss_w = computeTpvLossHeat(q_tpv_in_w, p_elec_w);
    const { p_export_w, p_onboard_w } = splitRecoveredElectricity(
      p_elec_w, config.export_fraction
    );
    const q_return_w = computeOnboardReturnHeat(p_onboard_w, config.onboard_return_heat_fraction);
    const { q_tpv_local_to_radiator_w, q_tpv_separate_cooling_load_w } =
      bookTpvLocalLoss(config, q_tpv_loss_w);

    // §12.4.5
    const q_rad_net_w = computeNetRadiatorBurden(
      q_basis_prev, p_export_w, q_return_w, q_tpv_local_to_radiator_w
    );

    // §12.6 — convergence deltas
    // Note: Q_rad_net^(k-1) ≡ Q_rad_basis^(k) = q_basis_prev per clarifying note
    const abs_delta_w = k === 1 ? null : Math.abs(q_rad_net_w - q_basis_prev);
    const rel_delta_fraction = k === 1 ? null :
      Math.abs(q_rad_net_w - q_basis_prev) / Math.max(Math.abs(q_rad_net_w), 1.0);

    // Record iteration history entry
    iteration_history.push({
      iteration_index: k,
      q_rad_basis_w: q_basis_prev,
      q_tpv_in_w,
      eta_tpv_effective,
      p_elec_w,
      p_export_w,
      p_onboard_w,
      q_return_w,
      q_tpv_loss_w,
      q_tpv_local_to_radiator_w,
      q_tpv_separate_cooling_load_w,
      q_rad_net_w,
      abs_delta_w,
      rel_delta_fraction,
    });

    // §12.8 — runaway check
    const isNonFinite = !isFinite(q_rad_net_w) || !isFinite(p_elec_w) ||
                        !isFinite(q_tpv_loss_w) || !isFinite(eta_tpv_effective);
    const runawayThreshold = cc.runaway_multiplier * Math.max(Math.abs(q_rad_net_0), 1.0);
    const isRunaway = isNonFinite || Math.abs(q_rad_net_w) > runawayThreshold;

    if (isRunaway) {
      const areaMetrics = computeEquivalentAreaMetrics({
        q_rad_net_w: isFinite(q_rad_net_w) ? q_rad_net_w : 0,
        q_base_ref_w: input.q_base_ref_w,
        ext3a: input.ext3a,
      });
      return {
        convergence_status: 'runaway',
        convergence_iterations: k,
        q_rad_baseline_w,
        intercept_fraction,
        q_tpv_in_w,
        eta_tpv_effective,
        p_elec_w,
        q_tpv_loss_w,
        p_export_w,
        p_onboard_w,
        q_return_w,
        q_tpv_local_to_radiator_w,
        q_tpv_separate_cooling_load_w,
        q_rad_net_w: isFinite(q_rad_net_w) ? q_rad_net_w : q_basis_prev,
        q_relief_w: isFinite(q_rad_net_w) ? q_rad_baseline_w - q_rad_net_w : 0,
        ...areaMetrics,
        iteration_history,
      };
    }

    // §12.6 — convergence test (skip k=1: no prior basis for abs_delta)
    if (k > 1 && abs_delta_w !== null && rel_delta_fraction !== null) {
      const converged =
        abs_delta_w <= cc.tolerance_abs_w &&
        rel_delta_fraction <= cc.tolerance_rel_fraction;

      if (converged) {
        const areaMetrics = computeEquivalentAreaMetrics({
          q_rad_net_w,
          q_base_ref_w: input.q_base_ref_w,
          ext3a: input.ext3a,
        });
        return {
          convergence_status: 'converged',
          convergence_iterations: k,
          q_rad_baseline_w,
          intercept_fraction,
          q_tpv_in_w,
          eta_tpv_effective,
          p_elec_w,
          q_tpv_loss_w,
          p_export_w,
          p_onboard_w,
          q_return_w,
          q_tpv_local_to_radiator_w,
          q_tpv_separate_cooling_load_w,
          q_rad_net_w,
          q_relief_w: q_rad_baseline_w - q_rad_net_w,
          ...areaMetrics,
          iteration_history,
        };
      }
    }

    // §12.4.6 — set next basis
    q_basis_prev = q_rad_net_w;
    // §12.4.7 — T_rad update: v0.1.4 uses burden-only iteration (§12.5)
    // No full geometric redesign inside the loop. T_rad remains at baseline.
    // t_rad_prev is unchanged in this version; carnot efficiency updates
    // only when a temperature-coupled mapping is available — not defined in v0.1.4.
    // t_rad_prev = t_rad_prev; // identity; explicit per §12.4.7 note
  }

  // §12.9 — max iterations exhausted without convergence
  const lastEntry = iteration_history[iteration_history.length - 1];
  const last_q_rad_net_w = lastEntry?.q_rad_net_w ?? q_rad_net_0;
  const areaMetrics = computeEquivalentAreaMetrics({
    q_rad_net_w: last_q_rad_net_w,
    q_base_ref_w: input.q_base_ref_w,
    ext3a: input.ext3a,
  });

  return {
    convergence_status: 'nonconverged',
    convergence_iterations: cc.max_iterations,
    q_rad_baseline_w,
    intercept_fraction,
    q_tpv_in_w: lastEntry?.q_tpv_in_w ?? 0,
    eta_tpv_effective: lastEntry?.eta_tpv_effective ?? 0,
    p_elec_w: lastEntry?.p_elec_w ?? 0,
    q_tpv_loss_w: lastEntry?.q_tpv_loss_w ?? 0,
    p_export_w: lastEntry?.p_export_w ?? 0,
    p_onboard_w: lastEntry?.p_onboard_w ?? 0,
    q_return_w: lastEntry?.q_return_w ?? 0,
    q_tpv_local_to_radiator_w: lastEntry?.q_tpv_local_to_radiator_w ?? 0,
    q_tpv_separate_cooling_load_w: lastEntry?.q_tpv_separate_cooling_load_w ?? 0,
    q_rad_net_w: last_q_rad_net_w,
    q_relief_w: q_rad_baseline_w - last_q_rad_net_w,
    ...areaMetrics,
    iteration_history,
  };
}
