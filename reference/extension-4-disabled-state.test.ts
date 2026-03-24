/**
 * reference/extension-4-disabled-state.test.ts
 * Extension 4 disabled-state tests — ext4-spec-v0.1.4 §20.2
 *
 * Governing law: ext4-spec-v0.1.4 §20.2, §16.2, §3 rule 9–11
 * Blueprint law:  blueprint-v0.1.4 §Controls-and-Gates Gate 3
 *
 * Required assertions per §20.2:
 * 1. deterministic disabled result per §16.2
 * 2. no numeric ext4 fields populated
 * 3. no blocking error in disabled state
 * 4. nonconvergence_blocking_applied=false
 * 5. tpv_model_id=null
 * 6. prior extension results unchanged
 */

import { runExtension4 } from '../runtime/runner/run-extension-4';
import type { Extension4Input } from '../runtime/runner/run-extension-4';

// ─── Minimal radiator for baseline resolution ─────────────────────────────────

const STUB_RADIATOR = {
  radiator_id: 'radiator-01',
  target_surface_temp_k: 350,
  effective_area_m2: 2.0,
  emissivity: 0.9,
  sink_temp_k: 3,
};

// ─── Disabled scenarios ───────────────────────────────────────────────────────

/** Disabled by absence of enable_model_extension_4 (defaults false). */
const disabledByAbsence: Extension4Input = {
  scenario: {
    scenario_id: 'scn-disabled-absent',
    // enable_model_extension_4 absent — defaults false per §5.1
  },
  run_packet: {},
  radiators: [STUB_RADIATOR],
};

/** Explicitly disabled — enable_model_extension_4=false. */
const disabledExplicit: Extension4Input = {
  scenario: {
    scenario_id: 'scn-disabled-explicit',
    enable_model_extension_4: false,
    model_extension_4_mode: 'one_pass',  // mode irrelevant when disabled
    tpv_recapture_config: {
      tpv_model_id: 'tpv-test-v0',
      coverage_fraction: 0.2,
      radiator_view_factor_to_tpv: 0.8,
      spectral_capture_fraction: 0.6,
      coupling_derate_fraction: 0.9,
      conversion_efficiency_mode: 'fixed',
      eta_tpv_fixed: 0.15,
      export_fraction: 0.5,
      onboard_return_heat_fraction: 0.8,
      cell_cooling_mode: 'separate_cooling',
    },
  },
  run_packet: {},
  radiators: [STUB_RADIATOR],
  extension_3a_result: {
    extension_3a_enabled: true,
    convergence_attempted: true,
    convergence_iterations: 5,
    convergence_status: 'converged',
    t_sink_resolved_k: 4.0,
    radiator_area_bol_required_m2: 1.8,
    radiator_area_eol_required_m2: 2.1,
  },
};

// =============================================================================
// §20.2 Assertion 1 — deterministic disabled result per §16.2
// =============================================================================

describe('Extension 4 disabled state — §20.2', () => {

  test('Assertion 1: disabled-by-absence produces deterministic disabled result (§20.2 item 1, §16.2)', () => {
    const result = runExtension4(disabledByAbsence);
    expect(result.extension_4_enabled).toBe(false);
    expect(result.model_extension_4_mode).toBe('disabled');
    expect(result.spec_version).toBe('v0.1.4');
    expect(result.convergence_status).toBe('not_required');
    expect(result.convergence_attempted).toBe(false);
    expect(result.convergence_iterations).toBe(0);
  });

  test('Assertion 1b: explicit disable produces same deterministic result shape (§20.2 item 1)', () => {
    const result = runExtension4(disabledExplicit);
    expect(result.extension_4_enabled).toBe(false);
    expect(result.model_extension_4_mode).toBe('disabled');
    expect(result.convergence_status).toBe('not_required');
  });

  // ===========================================================================
  // §20.2 Assertion 2 — no numeric ext4 fields populated
  // All thermal accounting fields must be null per §16.2
  // ===========================================================================

  test('Assertion 2: no numeric ext4 fields populated in disabled result (§20.2 item 2, §16.2)', () => {
    const result = runExtension4(disabledByAbsence);

    // All thermal accounting fields must be null
    const numericFields = [
      'intercept_fraction',
      'q_rad_baseline_w',
      'q_tpv_in_w',
      'eta_tpv_effective',
      'p_elec_w',
      'p_export_w',
      'p_onboard_w',
      'q_return_w',
      'q_tpv_loss_w',
      'q_tpv_local_to_radiator_w',
      'q_tpv_separate_cooling_load_w',
      'q_rad_net_w',
      'q_relief_w',
      'area_equivalent_bol_m2',
      'area_equivalent_eol_m2',
      'area_delta_bol_m2',
      'area_delta_eol_m2',
      'baseline_sink_temperature_k',
      'baseline_radiator_temperature_k',
    ] as const;

    for (const field of numericFields) {
      expect((result as unknown as Record<string, unknown>)[field]).toBeNull();
    }
  });

  // ===========================================================================
  // §20.2 Assertion 3 — no blocking error in disabled state
  // §16.2: disabled result has blocking_errors = []
  // ===========================================================================

  test('Assertion 3: no blocking error in disabled state (§20.2 item 3, §16.2)', () => {
    const result = runExtension4(disabledByAbsence);
    expect(result.blocking_errors).toEqual([]);
  });

  // ===========================================================================
  // §20.2 Assertion 4 — nonconvergence_blocking_applied=false
  // §16.2: false in all disabled results
  // ===========================================================================

  test('Assertion 4: nonconvergence_blocking_applied=false in disabled state (§20.2 item 4, §16.2)', () => {
    const result = runExtension4(disabledByAbsence);
    expect(result.nonconvergence_blocking_applied).toBe(false);
  });

  // ===========================================================================
  // §20.2 Assertion 5 — tpv_model_id=null
  // §16.2, §16.6: null when disabled
  // ===========================================================================

  test('Assertion 5: tpv_model_id=null in disabled state (§20.2 item 5, §16.6)', () => {
    const result = runExtension4(disabledExplicit);
    expect(result.tpv_model_id).toBeNull();
  });

  // ===========================================================================
  // §20.2 Assertion 6 — prior extension results unchanged
  // §3 rule 4: ext4 is additive only; disabled ext4 must not mutate upstream
  // ===========================================================================

  test('Assertion 6: ext4 result does not include 3A result fields (§20.2 item 6, §3 rule 4)', () => {
    const result = runExtension4(disabledExplicit);
    // ext4 result must not copy 3A result fields into its own result object
    expect((result as unknown as Record<string, unknown>)['extension_3a_result']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['extension_3a_enabled']).toBeUndefined();
    expect((result as unknown as Record<string, unknown>)['radiator_area_bol_required_m2']).toBeUndefined();
  });

  test('Assertion 6b: iteration_history absent (not empty array) in disabled result (§16.2)', () => {
    const result = runExtension4(disabledByAbsence);
    // §16.2: "absent not empty array is canonical minimal form"
    expect((result as unknown as Record<string, unknown>)['iteration_history']).toBeUndefined();
  });

});
