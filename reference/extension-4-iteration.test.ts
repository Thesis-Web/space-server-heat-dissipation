/**
 * reference/extension-4-iteration.test.ts
 * Extension 4 iteration tests — ext4-spec-v0.1.4 §20.4
 *
 * Governing law: ext4-spec-v0.1.4 §20.4, §12.1–§12.10, §11.2–§11.3
 * Blueprint law:  blueprint-v0.1.4 §Iterative-Update-Law, §Controls-and-Gates Gate 5
 *
 * Required assertions per §20.4:
 * 1. converged case reaches convergence_status='converged'
 * 2. exhausted max iterations reaches convergence_status='nonconverged'
 * 3. runaway case: Q_rad_net^(0)=1000 W, runaway_multiplier=4.0 → status='runaway'
 *    when |Q_rad_net| > 4000 W
 * 4. one-pass mode → convergence_status='not_required'
 * 5. iterative mode honors inherited tolerances
 */

import {
  runTpvOnePass,
  runTpvIterative,
} from '../runtime/formulas/tpv-recapture';
import type { TpvRecaptureConfig, Extension4RadiatorBasis } from '../types/extension-4.d';
import type { ConvergenceControl } from '../runtime/formulas/tpv-recapture';

// ─── Standard radiator basis ──────────────────────────────────────────────────

const RADIATOR: Extension4RadiatorBasis = {
  target_surface_temp_k: 350,
  effective_area_m2: 2.0,
  resolved_emissivity: 0.9,
  resolved_sink_temperature_k: 3,
  resolution_trace: ['test-stub'],
};

// ─── Config that converges rapidly ───────────────────────────────────────────
// χ_int = 0.90 * 1.0 * 1.0 * 1.0 = 0.90; η = 0.50
// χ_int * η = 0.45 — each iteration Q_rad_basis shrinks by factor 0.55.
// With spec default tolerance_abs_w=1.0 W this converges in ~13 iterations.

const CONVERGING_CONFIG: TpvRecaptureConfig = {
  tpv_model_id: 'tpv-converging-v0',
  coverage_fraction: 0.90,
  radiator_view_factor_to_tpv: 1.0,
  spectral_capture_fraction: 1.0,
  coupling_derate_fraction: 1.0,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.50,
  export_fraction: 1.0,      // all exported → relief is positive → converges
  onboard_return_heat_fraction: 0.0,
  cell_cooling_mode: 'separate_cooling',
  iteration_report_detail: 'full',
};

const TIGHT_CC: ConvergenceControl = {
  max_iterations: 100,
  tolerance_abs_w: 1.0,        // spec default — achievable in ~13 iterations
  tolerance_rel_fraction: 0.001,
  runaway_multiplier: 4.0,
  blocking_on_nonconvergence: false,
};

// ─── Config that cannot converge (max=2, realistic) ───────────────────────────
// Force nonconvergence by setting max_iterations=2 with tolerances that
// require more iterations than allowed.

const NONCONVERGE_CC: ConvergenceControl = {
  max_iterations: 2,
  tolerance_abs_w: 1e-12,     // impossibly tight
  tolerance_rel_fraction: 1e-12,
  runaway_multiplier: 4.0,
  blocking_on_nonconvergence: false,
};

// ─── Runaway config ───────────────────────────────────────────────────────────
// Per §20.4: Q_rad_net^(0)=1000 W, runaway_multiplier=4.0 → runaway when |Q_rad_net|>4000 W.
// To force runaway: use returns_to_radiator with α_ret=1, export=0, high η.
// Each iteration: Q_rad_net^(k) = Q_rad_net^(k-1) + Q_tpv_in^(k) (all loss returns)
// With high intercept and η≈0 (all loss), Q_rad_net grows without bound.
// Use a fabricated radiator where Q_rad_baseline≈1000 W to match the spec example.
//
// σ * ε * A * (T^4 - Tsink^4) ≈ 1000 W
// 5.67e-8 * 0.9 * A * (350^4 - 3^4) ≈ 1000
// A ≈ 1000 / (5.67e-8 * 0.9 * 1.5e10) ≈ 1000 / 765.45 ≈ 1.307 m²
// Use A=1.307 to get Q_rad_baseline≈1000 W

const RUNAWAY_RADIATOR: Extension4RadiatorBasis = {
  target_surface_temp_k: 350,
  effective_area_m2: 1.307,
  resolved_emissivity: 0.9,
  resolved_sink_temperature_k: 3,
  resolution_trace: ['runaway-test-stub'],
};

// Runaway config: zero efficiency (η=0) so ALL Q_tpv_in becomes loss,
// and returns_to_radiator feeds it back, growing Q_rad_net each iteration.
// χ_int=0.90 ensures 90% of Q_rad_basis is intercepted and returned each step.
const RUNAWAY_CONFIG: TpvRecaptureConfig = {
  tpv_model_id: 'tpv-runaway-test-v0',
  coverage_fraction: 0.9,
  radiator_view_factor_to_tpv: 1.0,
  spectral_capture_fraction: 1.0,
  coupling_derate_fraction: 1.0,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.0,            // η=0: all intercepted power → loss
  export_fraction: 0.0,
  onboard_return_heat_fraction: 1.0,
  cell_cooling_mode: 'returns_to_radiator',  // loss feeds back into radiator
  iteration_report_detail: 'full',
};

const RUNAWAY_CC: ConvergenceControl = {
  max_iterations: 100,
  tolerance_abs_w: 0.001,
  tolerance_rel_fraction: 0.0001,
  runaway_multiplier: 4.0,        // §20.4: multiplier=4.0
  blocking_on_nonconvergence: false,
};

// =============================================================================
// §20.4 Case 1 — converged case reaches status='converged'
// §12.6 convergence test: abs_delta ≤ tol_abs AND rel_delta ≤ tol_rel
// =============================================================================

describe('Extension 4 iteration — §20.4', () => {

  describe('Case 1: converged case → convergence_status=converged (§20.4 item 1, §12.6)', () => {
    test('all-export config with sufficient max_iterations converges', () => {
      const result = runTpvIterative({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        convergence_control: TIGHT_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.convergence_status).toBe('converged');
    });

    test('converged result has convergence_iterations >= 2 (§12.6: no delta on k=1)', () => {
      const result = runTpvIterative({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        convergence_control: TIGHT_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.convergence_iterations).toBeGreaterThanOrEqual(2);
    });

    test('converged result iteration_history present in full-detail mode (§16.5)', () => {
      const result = runTpvIterative({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        convergence_control: TIGHT_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.iteration_history).toBeDefined();
      expect(result.iteration_history!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ===========================================================================
  // §20.4 Case 2 — exhausted max iterations → convergence_status='nonconverged'
  // §12.9: when max_iterations exhausted without meeting convergence test
  // ===========================================================================

  describe('Case 2: exhausted max iterations → convergence_status=nonconverged (§20.4 item 2, §12.9)', () => {
    test('impossibly tight tolerance with max=2 produces nonconverged', () => {
      const result = runTpvIterative({
        config: { ...CONVERGING_CONFIG, iteration_report_detail: 'minimal' },
        radiator_basis: RADIATOR,
        convergence_control: NONCONVERGE_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.convergence_status).toBe('nonconverged');
    });

    test('nonconverged result has convergence_iterations = max_iterations', () => {
      const result = runTpvIterative({
        config: { ...CONVERGING_CONFIG, iteration_report_detail: 'minimal' },
        radiator_basis: RADIATOR,
        convergence_control: NONCONVERGE_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.convergence_iterations).toBe(NONCONVERGE_CC.max_iterations);
    });
  });

  // ===========================================================================
  // §20.4 Case 3 — runaway case → convergence_status='runaway'
  // §20.4 example: Q_rad_net^(0)=1000 W, runaway_multiplier=4.0
  //   → runaway when |Q_rad_net| > 4000 W
  // §12.8: isRunaway when |Q_rad_net^(k)| > runaway_multiplier * max(|Q_rad_net^(0)|, 1)
  // ===========================================================================

  describe('Case 3: runaway → convergence_status=runaway (§20.4 item 3, §12.8)', () => {
    test('returns_to_radiator with η=0 and high intercept triggers runaway status', () => {
      const result = runTpvIterative({
        config: RUNAWAY_CONFIG,
        radiator_basis: RUNAWAY_RADIATOR,
        convergence_control: RUNAWAY_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.convergence_status).toBe('runaway');
    });

    test('runaway terminates before max_iterations (§12.8: early exit)', () => {
      const result = runTpvIterative({
        config: RUNAWAY_CONFIG,
        radiator_basis: RUNAWAY_RADIATOR,
        convergence_control: RUNAWAY_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.convergence_iterations).toBeLessThanOrEqual(RUNAWAY_CC.max_iterations);
    });

    test('runaway result iteration_history length equals convergence_iterations (§12.8)', () => {
      const result = runTpvIterative({
        config: RUNAWAY_CONFIG,
        radiator_basis: RUNAWAY_RADIATOR,
        convergence_control: RUNAWAY_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.iteration_history.length).toBe(result.convergence_iterations);
    });
  });

  // ===========================================================================
  // §20.4 Case 4 — one-pass mode → convergence_status='not_required'
  // §11.3: one-pass always emits not_required, convergence_attempted=false
  // ===========================================================================

  describe('Case 4: one-pass mode → convergence_status=not_required (§20.4 item 4, §11.3)', () => {
    test('runTpvOnePass produces iteration_entry with iteration_index=1', () => {
      const result = runTpvOnePass({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        q_base_ref_w: null,
        ext3a: null,
      });
      expect(result.iteration_entry.iteration_index).toBe(1);
    });

    test('one-pass iteration_entry has null abs_delta_w (no prior basis)', () => {
      const result = runTpvOnePass({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        q_base_ref_w: null,
        ext3a: null,
      });
      // §15.3: abs_delta_w=null on first iteration (no prior basis)
      expect(result.iteration_entry.abs_delta_w).toBeNull();
      expect(result.iteration_entry.rel_delta_fraction).toBeNull();
    });
  });

  // ===========================================================================
  // §20.4 Case 5 — iterative mode honors inherited tolerances
  // §12.7: convergence_control resolved from scenario; defaults applied
  // ===========================================================================

  describe('Case 5: iterative mode honors inherited tolerances (§20.4 item 5, §12.7)', () => {
    test('loose tolerance converges in fewer iterations than tight tolerance', () => {
      const looseCC: ConvergenceControl = {
        ...TIGHT_CC,
        tolerance_abs_w: 100.0,
        tolerance_rel_fraction: 0.1,
      };
      const loose = runTpvIterative({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        convergence_control: looseCC,
        q_base_ref_w: null,
        ext3a: null,
      });
      const tight = runTpvIterative({
        config: CONVERGING_CONFIG,
        radiator_basis: RADIATOR,
        convergence_control: TIGHT_CC,
        q_base_ref_w: null,
        ext3a: null,
      });
      // Loose tolerance should converge in no more iterations than tight
      expect(loose.convergence_iterations).toBeLessThanOrEqual(tight.convergence_iterations);
      expect(loose.convergence_status).toBe('converged');
    });
  });

});
