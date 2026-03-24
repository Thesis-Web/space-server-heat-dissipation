/**
 * reference/extension-4-cohabitation.test.ts
 * Extension 4 cohabitation tests — ext4-spec-v0.1.4 §20.5
 *
 * Governing law: ext4-spec-v0.1.4 §20.5, §3 rules 4–7, §8.3–§8.4, §6.2
 * Blueprint law:  blueprint-v0.1.4 §Cohabitation-Mandate, §Controls-and-Gates Gate 6
 *
 * Required assertions per §20.5:
 * 1. ext4 packet coexists with extension_3a_result
 * 2. ext4 packet coexists with extension_3b_result
 * 3. ext4 does not mutate 3A/3B result objects
 * 4. iterative mode blocks when required 3A authority absent
 * 5. 3C annotations do not alter numeric outputs
 */

import { runExtension4 } from '../runtime/runner/run-extension-4';
import type { Extension4Input } from '../runtime/runner/run-extension-4';

// ─── Shared stubs ─────────────────────────────────────────────────────────────

const STUB_RADIATOR = {
  radiator_id: 'radiator-01',
  target_surface_temp_k: 350,
  effective_area_m2: 2.0,
  emissivity: 0.9,
  sink_temp_k: 3,
};

const VALID_TPV_CONFIG = {
  tpv_model_id: 'tpv-cohabitation-v0',
  coverage_fraction: 0.20,
  radiator_view_factor_to_tpv: 0.80,
  spectral_capture_fraction: 0.60,
  coupling_derate_fraction: 0.90,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.15,
  export_fraction: 1.0,
  onboard_return_heat_fraction: 0.0,
  cell_cooling_mode: 'separate_cooling',
  iteration_report_detail: 'minimal',
};

/** Stub 3A result — converged, provides area and sink context. §8.3. */
const STUB_3A_RESULT = {
  extension_3a_enabled: true,
  convergence_attempted: true,
  convergence_iterations: 8,
  convergence_status: 'converged' as const,
  blocking_on_nonconvergence: false,
  t_sink_resolved_k: 4.0,
  radiator_area_bol_required_m2: 1.8,
  radiator_area_eol_required_m2: 2.2,
};

/** Stub 3B result object — represents pre-existing 3B output. §6.2. */
const STUB_3B_RESULT_ON_PACKET = {
  extension_3b_enabled: true,
  model_extension_3b_mode: 'full',
  convergence_status: 'not_required',
  q_total_reject_3b_w: 1650,
  blocking_errors: [],
  warnings: [],
  transform_trace: ['run-extension-3b: complete'],
};

// =============================================================================
// §20.5 Assertion 1 — ext4 packet coexists with extension_3a_result
// §6.2: extension_4_result contains only ext4 results; 3A tree not copied in
// §3 rule 4: additive only
// =============================================================================

describe('Extension 4 cohabitation — §20.5', () => {

  describe('Assertion 1: ext4 coexists with extension_3a_result (§20.5 item 1, §6.2)', () => {
    const input: Extension4Input = {
      scenario: {
        scenario_id: 'scn-cohab-3a-001',
        enable_model_extension_4: true,
        model_extension_4_mode: 'one_pass',
        tpv_recapture_config: VALID_TPV_CONFIG,
      },
      run_packet: {},
      radiators: [STUB_RADIATOR],
      extension_3a_result: STUB_3A_RESULT,
    };

    test('ext4 runner completes successfully when 3A result is present (one-pass)', () => {
      const result = runExtension4(input);
      expect(result.extension_4_enabled).toBe(true);
      expect(result.model_extension_4_mode).toBe('one_pass');
      expect(result.convergence_status).toBe('not_required');
      expect(result.blocking_errors).toHaveLength(0);
    });

    test('ext4 result does not contain extension_3a_result fields (§6.2)', () => {
      const result = runExtension4(input);
      const r = result as unknown as Record<string, unknown>;
      expect(r['extension_3a_result']).toBeUndefined();
      expect(r['extension_3a_enabled']).toBeUndefined();
      expect(r['t_sink_resolved_k']).toBeUndefined();
    });

    test('ext4 uses 3A sink temperature for T_space resolution when available', () => {
      const result = runExtension4(input);
      // 3A provided t_sink_resolved_k=4.0; ext4 should use it
      expect(result.baseline_sink_temperature_k).toBeCloseTo(4.0, 6);
    });

    test('ext4 populates area metrics when 3A area basis is present (§9.14)', () => {
      const result = runExtension4(input);
      // 3A provided bol/eol areas — area metrics must be non-null
      expect(result.area_equivalent_bol_m2).not.toBeNull();
      expect(result.area_equivalent_eol_m2).not.toBeNull();
      expect(result.area_delta_bol_m2).not.toBeNull();
      expect(result.area_delta_eol_m2).not.toBeNull();
    });
  });

  // ===========================================================================
  // §20.5 Assertion 2 — ext4 packet coexists with extension_3b_result
  // 3B result is on the run-packet; ext4 must not interfere with it
  // ===========================================================================

  describe('Assertion 2: ext4 coexists with extension_3b_result (§20.5 item 2, §3 rule 4)', () => {
    const run_packet_with_3b = {
      extension_3b_result: STUB_3B_RESULT_ON_PACKET,
    };

    const input: Extension4Input = {
      scenario: {
        scenario_id: 'scn-cohab-3b-001',
        enable_model_extension_4: true,
        model_extension_4_mode: 'one_pass',
        tpv_recapture_config: VALID_TPV_CONFIG,
      },
      run_packet: run_packet_with_3b,
      radiators: [STUB_RADIATOR],
      extension_3a_result: STUB_3A_RESULT,
    };

    test('ext4 runner completes successfully when 3B result is on run-packet', () => {
      const result = runExtension4(input);
      expect(result.extension_4_enabled).toBe(true);
      expect(result.blocking_errors).toHaveLength(0);
    });

    test('ext4 result does not contain extension_3b_result fields (§6.2)', () => {
      const result = runExtension4(input);
      const r = result as unknown as Record<string, unknown>;
      expect(r['extension_3b_result']).toBeUndefined();
      expect(r['extension_3b_enabled']).toBeUndefined();
    });
  });

  // ===========================================================================
  // §20.5 Assertion 3 — ext4 does not mutate 3A/3B result objects
  // §3 rule 4: additive only; zero mutation of upstream result objects
  // ===========================================================================

  describe('Assertion 3: ext4 does not mutate 3A/3B result objects (§20.5 item 3, §3 rule 4)', () => {
    test('3A result object is unchanged after ext4 runs', () => {
      const snapshot = JSON.stringify(STUB_3A_RESULT);
      const input: Extension4Input = {
        scenario: {
          scenario_id: 'scn-mutate-test-001',
          enable_model_extension_4: true,
          model_extension_4_mode: 'one_pass',
          tpv_recapture_config: VALID_TPV_CONFIG,
        },
        run_packet: {},
        radiators: [STUB_RADIATOR],
        extension_3a_result: STUB_3A_RESULT,
      };
      runExtension4(input);
      expect(JSON.stringify(STUB_3A_RESULT)).toBe(snapshot);
    });

    test('3B result object on run-packet is unchanged after ext4 runs', () => {
      const run_packet_with_3b = { extension_3b_result: { ...STUB_3B_RESULT_ON_PACKET } };
      const snapshot = JSON.stringify(run_packet_with_3b);
      const input: Extension4Input = {
        scenario: {
          scenario_id: 'scn-mutate-test-002',
          enable_model_extension_4: true,
          model_extension_4_mode: 'one_pass',
          tpv_recapture_config: VALID_TPV_CONFIG,
        },
        run_packet: run_packet_with_3b,
        radiators: [STUB_RADIATOR],
        extension_3a_result: STUB_3A_RESULT,
      };
      runExtension4(input);
      expect(JSON.stringify(run_packet_with_3b)).toBe(snapshot);
    });
  });

  // ===========================================================================
  // §20.5 Assertion 4 — iterative mode blocks when required 3A authority absent
  // §8.3: iterative mode requires 3A authority; absent 3A → blocking error
  // ===========================================================================

  describe('Assertion 4: iterative mode blocks when 3A authority absent (§20.5 item 4, §8.3)', () => {
    const inputNoA: Extension4Input = {
      scenario: {
        scenario_id: 'scn-iter-no-3a-001',
        enable_model_extension_4: true,
        model_extension_4_mode: 'iterative',
        tpv_recapture_config: VALID_TPV_CONFIG,
      },
      run_packet: {},
      radiators: [STUB_RADIATOR],
      // extension_3a_result absent
    };

    test('iterative mode without 3A produces convergence_status=invalid', () => {
      const result = runExtension4(inputNoA);
      expect(result.convergence_status).toBe('invalid');
    });

    test('iterative mode without 3A has non-empty blocking_errors (§8.3)', () => {
      const result = runExtension4(inputNoA);
      expect(result.blocking_errors.length).toBeGreaterThan(0);
    });

    test('one-pass mode without 3A is allowed with informational flag (§8.4)', () => {
      const inputOnPass: Extension4Input = {
        scenario: {
          scenario_id: 'scn-onepass-no-3a-001',
          enable_model_extension_4: true,
          model_extension_4_mode: 'one_pass',
          tpv_recapture_config: VALID_TPV_CONFIG,
        },
        run_packet: {},
        radiators: [STUB_RADIATOR],
        // extension_3a_result absent
      };
      const result = runExtension4(inputOnPass);
      // one-pass without 3A: allowed but emits EXT4-INFO-ONEPASS-NO-3A flag
      expect(result.convergence_status).toBe('not_required');
      expect(result.blocking_errors).toHaveLength(0);
      const hasInfoFlag = result.warnings.some(w => w.includes('EXT4-INFO-ONEPASS-NO-3A'));
      expect(hasInfoFlag).toBe(true);
    });
  });

  // ===========================================================================
  // §20.5 Assertion 5 — 3C annotations do not alter numeric outputs
  // §6.2: extension_4_catalog_versions is pass-through provenance only;
  // zero numeric authority (§14 rule 14, §7.3)
  // ===========================================================================

  describe('Assertion 5: 3C annotations do not alter numeric outputs (§20.5 item 5, §6.2)', () => {
    const BASE_SCENARIO = {
      scenario_id: 'scn-3c-base-001',
      enable_model_extension_4: true,
      model_extension_4_mode: 'one_pass',
      tpv_recapture_config: VALID_TPV_CONFIG,
    };

    test('numeric outputs unchanged when extension_4_catalog_versions added vs absent', () => {
      const without3c: Extension4Input = {
        scenario: { ...BASE_SCENARIO },
        run_packet: {},
        radiators: [STUB_RADIATOR],
        extension_3a_result: STUB_3A_RESULT,
      };
      const with3c: Extension4Input = {
        scenario: {
          ...BASE_SCENARIO,
          // 3C-style catalog versions annotation — pass-through only
          extension_4_catalog_versions: {
            tpv_model_catalog_version: 'v1.2.3',
            spectral_profile_version: 'v0.9.1',
          },
        },
        run_packet: {},
        radiators: [STUB_RADIATOR],
        extension_3a_result: STUB_3A_RESULT,
      };

      const r1 = runExtension4(without3c);
      const r2 = runExtension4(with3c);

      // All numeric fields must be identical
      expect(r2.q_rad_baseline_w).toBeCloseTo(r1.q_rad_baseline_w!, 6);
      expect(r2.q_tpv_in_w).toBeCloseTo(r1.q_tpv_in_w!, 6);
      expect(r2.p_elec_w).toBeCloseTo(r1.p_elec_w!, 6);
      expect(r2.q_rad_net_w).toBeCloseTo(r1.q_rad_net_w!, 6);
      expect(r2.q_relief_w).toBeCloseTo(r1.q_relief_w!, 6);
      expect(r2.intercept_fraction).toBeCloseTo(r1.intercept_fraction!, 6);
    });
  });

});
