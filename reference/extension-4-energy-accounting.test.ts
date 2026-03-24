/**
 * reference/extension-4-energy-accounting.test.ts
 * Extension 4 energy-accounting tests — ext4-spec-v0.1.4 §20.3
 *
 * Governing law: ext4-spec-v0.1.4 §20.3, §9.1–§9.14, §11.2–§11.3
 * Blueprint law:  blueprint-v0.1.4 §Thermal-Accounting-Law, §Controls-and-Gates Gate 4
 *
 * Required assertions per §20.3:
 * 1. all-export + separate_cooling → burden decreases by P_elec
 * 2. all-onboard-return + separate_cooling → negative relief = −P_elec (α_ret=1, no export)
 * 3. all-onboard-return + returns_to_radiator → negative relief beyond case 2
 * 4. no-export + separate_cooling + α_ret=0 → zero relief
 * 5. partial export → correct split
 * 6. returns_to_radiator → TPV loss booked into burden
 * 7. separate_cooling → TPV loss separated from burden
 */

import {
  runTpvOnePass,
  computeInterceptFraction,
} from '../runtime/formulas/tpv-recapture';
import type { TpvRecaptureConfig } from '../types/extension-4.d';
import type { Extension4RadiatorBasis } from '../types/extension-4.d';

// ─── Fixed test radiator basis ────────────────────────────────────────────────
// Deterministic baseline. §9.2 formula will produce a known Q_rad_baseline.

const RADIATOR: Extension4RadiatorBasis = {
  target_surface_temp_k: 350,
  effective_area_m2: 2.0,
  resolved_emissivity: 0.9,
  resolved_sink_temperature_k: 3,
  resolution_trace: ['test-stub'],
};

// ─── Base config — simple intercept: χ_int = 0.5 * 1.0 * 1.0 * 1.0 = 0.5 ────

const BASE_CONFIG: TpvRecaptureConfig = {
  tpv_model_id: 'tpv-accounting-test-v0',
  coverage_fraction: 0.5,
  radiator_view_factor_to_tpv: 1.0,
  spectral_capture_fraction: 1.0,
  coupling_derate_fraction: 1.0,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.20,          // 20% efficiency → P_elec = 0.20 * Q_tpv_in
  export_fraction: 0.0,
  onboard_return_heat_fraction: 1.0,
  cell_cooling_mode: 'separate_cooling',
  iteration_report_detail: 'minimal',
};

// ─── Helper: run one-pass with q_base_ref self-derived ───────────────────────
// Implements the approved HOLE-001 two-pass pattern (build log §HOLE-001).

function runOnePass(config: TpvRecaptureConfig) {
  const first = runTpvOnePass({ config, radiator_basis: RADIATOR, q_base_ref_w: null, ext3a: null });
  return runTpvOnePass({ config, radiator_basis: RADIATOR, q_base_ref_w: first.q_rad_baseline_w, ext3a: null });
}

// =============================================================================
// §20.3 Case 1 — all-export + separate_cooling → burden decreases by P_elec
// §9.8: P_export = 1.0 * P_elec; §9.9: P_onboard = 0; §9.10: Q_return = 0
// §9.11 separate_cooling: Q_tpv_local_to_radiator = 0
// §9.12: Q_rad_net = Q_rad_baseline - P_elec + 0 + 0
// §9.13: Q_relief = P_elec > 0
// =============================================================================

describe('Extension 4 energy accounting — §20.3', () => {

  describe('Case 1: all-export + separate_cooling → burden decreases by P_elec (§20.3 item 1)', () => {
    const cfg: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 1.0,             // all exported
      onboard_return_heat_fraction: 0.0, // irrelevant when p_onboard=0
      cell_cooling_mode: 'separate_cooling',
    };

    test('q_relief equals p_elec when all power exported and separate_cooling', () => {
      const r = runOnePass(cfg);
      expect(r.p_export_w).toBeCloseTo(r.p_elec_w, 9);
      expect(r.p_onboard_w).toBeCloseTo(0, 9);
      expect(r.q_return_w).toBeCloseTo(0, 9);
      expect(r.q_tpv_local_to_radiator_w).toBeCloseTo(0, 9);
      // §9.13: relief = P_elec
      expect(r.q_relief_w).toBeCloseTo(r.p_elec_w, 6);
    });

    test('q_rad_net = q_rad_baseline - p_elec (case 1)', () => {
      const r = runOnePass(cfg);
      expect(r.q_rad_net_w).toBeCloseTo(r.q_rad_baseline_w - r.p_elec_w, 6);
    });

    test('burden decreases: q_rad_net < q_rad_baseline (case 1)', () => {
      const r = runOnePass(cfg);
      expect(r.q_rad_net_w).toBeLessThan(r.q_rad_baseline_w);
    });
  });

  // ===========================================================================
  // §20.3 Case 2 — all-onboard-return + separate_cooling → negative relief = −P_elec
  // α_ret=1, export_fraction=0, separate_cooling
  // §9.9: P_onboard = P_elec; §9.10: Q_return = α_ret * P_elec = P_elec
  // §9.11 separate_cooling: Q_tpv_local = 0
  // §9.12: Q_rad_net = Q_rad_baseline - 0 + P_elec + 0 = Q_rad_baseline + P_elec
  // §9.13: Q_relief = −P_elec (negative)
  // ===========================================================================

  describe('Case 2: all-onboard-return + separate_cooling → negative relief = −P_elec (§20.3 item 2)', () => {
    const cfg: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 0.0,
      onboard_return_heat_fraction: 1.0,  // α_ret=1: all onboard power returns as heat
      cell_cooling_mode: 'separate_cooling',
    };

    test('q_relief equals −p_elec when all onboard-return and separate_cooling', () => {
      const r = runOnePass(cfg);
      expect(r.p_export_w).toBeCloseTo(0, 9);
      expect(r.p_onboard_w).toBeCloseTo(r.p_elec_w, 9);
      expect(r.q_return_w).toBeCloseTo(r.p_elec_w, 6);
      expect(r.q_tpv_local_to_radiator_w).toBeCloseTo(0, 9);
      // §9.13: relief = −P_elec
      expect(r.q_relief_w).toBeCloseTo(-r.p_elec_w, 6);
    });

    test('burden worsens: q_rad_net > q_rad_baseline (case 2)', () => {
      const r = runOnePass(cfg);
      expect(r.q_rad_net_w).toBeGreaterThan(r.q_rad_baseline_w);
    });
  });

  // ===========================================================================
  // §20.3 Case 3 — all-onboard-return + returns_to_radiator → negative relief beyond case 2
  // α_ret=1, export_fraction=0, returns_to_radiator
  // §9.11 returns_to_radiator: Q_tpv_local = Q_tpv_loss (>0 when η<1)
  // §9.12: Q_rad_net = Q_rad_baseline + P_elec + Q_tpv_loss = Q_rad_baseline + Q_tpv_in
  // §9.13: Q_relief = −Q_tpv_in  (more negative than case 2 since Q_tpv_in > P_elec)
  // ===========================================================================

  describe('Case 3: all-onboard-return + returns_to_radiator → negative relief beyond case 2 (§20.3 item 3)', () => {
    const cfgSep: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 0.0,
      onboard_return_heat_fraction: 1.0,
      cell_cooling_mode: 'separate_cooling',
    };
    const cfgRad: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 0.0,
      onboard_return_heat_fraction: 1.0,
      cell_cooling_mode: 'returns_to_radiator',
    };

    test('returns_to_radiator produces more negative relief than separate_cooling (case 3 vs case 2)', () => {
      const rSep = runOnePass(cfgSep);
      const rRad = runOnePass(cfgRad);
      // returns_to_radiator also adds Q_tpv_loss to burden
      expect(rRad.q_relief_w).toBeLessThan(rSep.q_relief_w);
    });

    test('q_tpv_local_to_radiator = q_tpv_loss when returns_to_radiator (case 3)', () => {
      const r = runOnePass(cfgRad);
      expect(r.q_tpv_local_to_radiator_w).toBeCloseTo(r.q_tpv_loss_w, 6);
      expect(r.q_tpv_separate_cooling_load_w).toBeCloseTo(0, 9);
    });

    test('q_rad_net = q_rad_baseline + q_tpv_in when α_ret=1 and returns_to_radiator (case 3)', () => {
      const r = runOnePass(cfgRad);
      // Q_rad_net = Q_rad_baseline - 0 + Q_return + Q_tpv_loss
      //           = Q_rad_baseline + P_elec + Q_tpv_loss
      //           = Q_rad_baseline + Q_tpv_in
      expect(r.q_rad_net_w).toBeCloseTo(r.q_rad_baseline_w + r.q_tpv_in_w, 6);
    });
  });

  // ===========================================================================
  // §20.3 Case 4 — no-export + separate_cooling + α_ret=0 → zero relief
  // export_fraction=0, α_ret=0, separate_cooling
  // §9.9: P_onboard = P_elec; §9.10: Q_return = 0*P_elec = 0
  // §9.11 separate_cooling: Q_tpv_local = 0
  // §9.12: Q_rad_net = Q_rad_baseline → §9.13: relief = 0
  // ===========================================================================

  describe('Case 4: no-export + separate_cooling + α_ret=0 → zero relief (§20.3 item 4)', () => {
    const cfg: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 0.0,
      onboard_return_heat_fraction: 0.0,  // α_ret=0: onboard power is consumed, zero heat return
      cell_cooling_mode: 'separate_cooling',
    };

    test('q_relief = 0 when no export, α_ret=0, separate_cooling (case 4)', () => {
      const r = runOnePass(cfg);
      expect(r.p_export_w).toBeCloseTo(0, 9);
      expect(r.q_return_w).toBeCloseTo(0, 9);
      expect(r.q_tpv_local_to_radiator_w).toBeCloseTo(0, 9);
      expect(r.q_relief_w).toBeCloseTo(0, 6);
    });

    test('q_rad_net = q_rad_baseline when zero relief (case 4)', () => {
      const r = runOnePass(cfg);
      expect(r.q_rad_net_w).toBeCloseTo(r.q_rad_baseline_w, 6);
    });
  });

  // ===========================================================================
  // §20.3 Case 5 — partial export → correct split
  // export_fraction=0.60, α_ret=0
  // §9.8: P_export = 0.60 * P_elec; §9.9: P_onboard = 0.40 * P_elec
  // §9.10: Q_return = 0 (α_ret=0); §9.12: Q_rad_net = Q_rad_baseline - 0.60*P_elec
  // ===========================================================================

  describe('Case 5: partial export → correct split (§20.3 item 5)', () => {
    const EXP_FRAC = 0.60;
    const cfg: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: EXP_FRAC,
      onboard_return_heat_fraction: 0.0,
      cell_cooling_mode: 'separate_cooling',
    };

    test('p_export = export_fraction * p_elec (case 5)', () => {
      const r = runOnePass(cfg);
      expect(r.p_export_w).toBeCloseTo(EXP_FRAC * r.p_elec_w, 6);
    });

    test('p_onboard = (1 - export_fraction) * p_elec (case 5)', () => {
      const r = runOnePass(cfg);
      expect(r.p_onboard_w).toBeCloseTo((1 - EXP_FRAC) * r.p_elec_w, 6);
    });

    test('q_relief = p_export when α_ret=0 and separate_cooling (case 5)', () => {
      const r = runOnePass(cfg);
      expect(r.q_relief_w).toBeCloseTo(r.p_export_w, 6);
    });
  });

  // ===========================================================================
  // §20.3 Case 6 — returns_to_radiator books TPV loss into burden
  // §9.11: Q_tpv_local_to_radiator = Q_tpv_loss, Q_tpv_separate_cooling_load = 0
  // ===========================================================================

  describe('Case 6: returns_to_radiator books TPV loss into radiator burden (§20.3 item 6, §9.11)', () => {
    const cfg: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 0.5,
      onboard_return_heat_fraction: 0.0,
      cell_cooling_mode: 'returns_to_radiator',
    };

    test('q_tpv_local_to_radiator_w = q_tpv_loss_w when returns_to_radiator', () => {
      const r = runOnePass(cfg);
      expect(r.q_tpv_local_to_radiator_w).toBeCloseTo(r.q_tpv_loss_w, 6);
    });

    test('q_tpv_separate_cooling_load_w = 0 when returns_to_radiator', () => {
      const r = runOnePass(cfg);
      expect(r.q_tpv_separate_cooling_load_w).toBeCloseTo(0, 9);
    });

    test('q_tpv_loss_w = q_tpv_in_w - p_elec_w (§9.7 identity)', () => {
      const r = runOnePass(cfg);
      expect(r.q_tpv_loss_w).toBeCloseTo(r.q_tpv_in_w - r.p_elec_w, 6);
    });
  });

  // ===========================================================================
  // §20.3 Case 7 — separate_cooling separates TPV loss from burden
  // §9.11: Q_tpv_separate_cooling_load = Q_tpv_loss, Q_tpv_local_to_radiator = 0
  // ===========================================================================

  describe('Case 7: separate_cooling separates TPV loss from radiator burden (§20.3 item 7, §9.11)', () => {
    const cfg: TpvRecaptureConfig = {
      ...BASE_CONFIG,
      export_fraction: 0.5,
      onboard_return_heat_fraction: 0.0,
      cell_cooling_mode: 'separate_cooling',
    };

    test('q_tpv_separate_cooling_load_w = q_tpv_loss_w when separate_cooling', () => {
      const r = runOnePass(cfg);
      expect(r.q_tpv_separate_cooling_load_w).toBeCloseTo(r.q_tpv_loss_w, 6);
    });

    test('q_tpv_local_to_radiator_w = 0 when separate_cooling', () => {
      const r = runOnePass(cfg);
      expect(r.q_tpv_local_to_radiator_w).toBeCloseTo(0, 9);
    });

    test('q_tpv_loss_w + p_elec_w = q_tpv_in_w (energy conservation §9.7)', () => {
      const r = runOnePass(cfg);
      expect(r.q_tpv_loss_w + r.p_elec_w).toBeCloseTo(r.q_tpv_in_w, 6);
    });
  });

});
