/**
 * reference/extension-4-schema.test.ts
 * Extension 4 schema validation tests — ext4-spec-v0.1.4 §20.1
 *
 * Governing law: ext4-spec-v0.1.4 §20.1, §7.1, §7.2, §7.3, §7.4, §13.1–§13.3
 * Blueprint law:  blueprint-v0.1.4 §Controls-and-Gates Gate 1–Gate 2
 *
 * Required assertions per §20.1:
 * 1. disabled minimal scenario acceptance
 * 2. enabled one-pass acceptance
 * 3. enabled iterative acceptance
 * 4. invalid fraction rejection
 * 5. conditional efficiency field enforcement
 * 6. run-packet result shape validation
 * 7. explicit invalid-bounds cases from §13.3
 */

import { loadSchema, validateDocument } from '../runtime/validators/schema';

// ─── Minimal valid scenario shape — matches schemas/scenario/scenario.schema.json ──

const MINIMAL_SCENARIO_BASE = {
  scenario_id: 'scn-test-schema-001',
  schema_version: 'v0.1.5',
  scenario_version: 'v0.1.5',
  label: 'Ext4 Schema Test Scenario',
  orbit_class: 'GEO',
  environment_profile: 'geo_nominal',
  mission_mode: 'compute_only',
  node_class: '50kw',
  architecture_class: 'single_node',
  utilization_profile: 'full',
  thermal_policy: 'nominal',
  selected_branches: [],
  reporting_preferences: {
    summary_markdown: true,
    comparison_enabled: false,
  },
};

// ─── Minimal valid tpv_recapture_config — fixed mode. §7.1, §5.3 ────────────

const VALID_CONFIG_FIXED = {
  tpv_model_id: 'tpv-test-fixed-v0',
  coverage_fraction: 0.20,
  radiator_view_factor_to_tpv: 0.80,
  spectral_capture_fraction: 0.60,
  coupling_derate_fraction: 0.90,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.15,
  export_fraction: 0.50,
  onboard_return_heat_fraction: 0.80,
  cell_cooling_mode: 'separate_cooling',
};

// ─── Minimal valid tpv_recapture_config — carnot_bounded mode. §7.1, §9.6 ───

const VALID_CONFIG_CARNOT = {
  tpv_model_id: 'tpv-test-carnot-v0',
  coverage_fraction: 0.20,
  radiator_view_factor_to_tpv: 0.80,
  spectral_capture_fraction: 0.60,
  coupling_derate_fraction: 0.90,
  conversion_efficiency_mode: 'carnot_bounded',
  eta_tpv_carnot_fraction: 0.60,
  tpv_cold_side_temperature_k: 280,
  export_fraction: 0.50,
  onboard_return_heat_fraction: 0.80,
  cell_cooling_mode: 'separate_cooling',
};

// ─── Canonical disabled result shape for schema validation. §16.2 ─────────────

const VALID_DISABLED_RESULT = {
  extension_4_enabled: false,
  model_extension_4_mode: 'disabled',
  spec_version: 'v0.1.4',
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
  defaults_applied: [],
  warnings: [],
  blocking_errors: [],
  transform_trace: ['extension_4_disabled_gate'],
};

const VALID_ONE_PASS_RESULT = {
  extension_4_enabled: true,
  model_extension_4_mode: 'one_pass',
  spec_version: 'v0.1.4',
  blueprint_version: 'v0.1.4',
  convergence_attempted: false,
  convergence_iterations: 1,
  convergence_status: 'not_required',
  nonconvergence_blocking_applied: false,
  tpv_model_id: 'tpv-test-fixed-v0',
  intercept_fraction: 0.0864,
  q_rad_baseline_w: 1500.0,
  q_tpv_in_w: 129.6,
  eta_tpv_effective: 0.15,
  p_elec_w: 19.44,
  p_export_w: 9.72,
  p_onboard_w: 9.72,
  q_return_w: 7.776,
  q_tpv_loss_w: 110.16,
  q_tpv_local_to_radiator_w: 0,
  q_tpv_separate_cooling_load_w: 110.16,
  q_rad_net_w: 1498.056,
  q_relief_w: 1.944,
  area_equivalent_bol_m2: null,
  area_equivalent_eol_m2: null,
  area_delta_bol_m2: null,
  area_delta_eol_m2: null,
  baseline_sink_temperature_k: 3.0,
  baseline_radiator_temperature_k: 350.0,
  tpv_cold_side_temperature_k: null,
  defaults_applied: [],
  warnings: [],
  blocking_errors: [],
  transform_trace: ['run-extension-4: start', 'run-extension-4: complete (one-pass)'],
};

// =============================================================================

describe('Extension 4 schema — §20.1', () => {

  // ===========================================================================
  // §20.1 Case 1 — disabled minimal scenario acceptance
  // ===========================================================================

  describe('Case 1: disabled minimal scenario acceptance (§20.1 item 1)', () => {
    test('scenario without ext4 fields passes scenario schema', () => {
      const result = validateDocument('scenario', MINIMAL_SCENARIO_BASE, 'disabled-minimal');
      expect(result.valid).toBe(true);
    });

    test('scenario with enable_model_extension_4=false passes schema', () => {
      const scenario = { ...MINIMAL_SCENARIO_BASE, enable_model_extension_4: false };
      const result = validateDocument('scenario', scenario, 'explicit-disabled');
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // §20.1 Case 2 — enabled one-pass acceptance
  // ===========================================================================

  describe('Case 2: enabled one-pass scenario acceptance (§20.1 item 2)', () => {
    test('enabled one-pass scenario with valid fixed config passes schema', () => {
      const scenario = {
        ...MINIMAL_SCENARIO_BASE,
        scenario_id: 'scn-onepass-fixed-001',
        enable_model_extension_4: true,
        model_extension_4_mode: 'one_pass',
        tpv_recapture_config: VALID_CONFIG_FIXED,
      };
      const result = validateDocument('scenario', scenario, 'one-pass-fixed');
      expect(result.valid).toBe(true);
    });

    test('enabled one-pass scenario with carnot_bounded config passes schema', () => {
      const scenario = {
        ...MINIMAL_SCENARIO_BASE,
        scenario_id: 'scn-onepass-carnot-001',
        enable_model_extension_4: true,
        model_extension_4_mode: 'one_pass',
        tpv_recapture_config: VALID_CONFIG_CARNOT,
      };
      const result = validateDocument('scenario', scenario, 'one-pass-carnot');
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // §20.1 Case 3 — enabled iterative acceptance
  // ===========================================================================

  describe('Case 3: enabled iterative scenario acceptance (§20.1 item 3)', () => {
    test('enabled iterative scenario with valid fixed config passes schema', () => {
      const scenario = {
        ...MINIMAL_SCENARIO_BASE,
        scenario_id: 'scn-iterative-fixed-001',
        enable_model_extension_4: true,
        model_extension_4_mode: 'iterative',
        tpv_recapture_config: VALID_CONFIG_FIXED,
      };
      const result = validateDocument('scenario', scenario, 'iterative-fixed');
      expect(result.valid).toBe(true);
    });
  });

  // ===========================================================================
  // §20.1 Case 4 — invalid fraction rejection
  // ===========================================================================

  describe('Case 4: invalid fraction rejection (§20.1 item 4, §12.1, §13.1)', () => {
    test('coverage_fraction > 1 fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const valid = validate({ ...VALID_CONFIG_FIXED, coverage_fraction: 1.5 });
      expect(valid).toBe(false);
    });

    test('export_fraction < 0 fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const valid = validate({ ...VALID_CONFIG_FIXED, export_fraction: -0.1 });
      expect(valid).toBe(false);
    });

    test('onboard_return_heat_fraction > 1 fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const valid = validate({ ...VALID_CONFIG_FIXED, onboard_return_heat_fraction: 1.01 });
      expect(valid).toBe(false);
    });

    test('eta_tpv_fixed > 1 fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const valid = validate({ ...VALID_CONFIG_FIXED, eta_tpv_fixed: 1.1 });
      expect(valid).toBe(false);
    });
  });

  // ===========================================================================
  // §20.1 Case 5 — conditional efficiency field enforcement
  // ===========================================================================

  describe('Case 5: conditional efficiency field enforcement (§20.1 item 5, §7.1)', () => {
    test('fixed mode without eta_tpv_fixed fails schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const { eta_tpv_fixed: _d, ...noEta } = VALID_CONFIG_FIXED;
      expect(validate(noEta)).toBe(false);
    });

    test('carnot_bounded mode without eta_tpv_carnot_fraction fails schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const { eta_tpv_carnot_fraction: _d, ...noFrac } = VALID_CONFIG_CARNOT;
      expect(validate(noFrac)).toBe(false);
    });

    test('carnot_bounded mode without tpv_cold_side_temperature_k fails schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const { tpv_cold_side_temperature_k: _d, ...noTemp } = VALID_CONFIG_CARNOT;
      expect(validate(noTemp)).toBe(false);
    });

    test('carnot_bounded mode with all required fields passes schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      expect(validate(VALID_CONFIG_CARNOT)).toBe(true);
    });
  });

  // ===========================================================================
  // §20.1 Case 6 — run-packet result shape validation
  // ===========================================================================

  describe('Case 6: run-packet result shape validation (§20.1 item 6, §7.2)', () => {
    test('valid disabled result shape passes tpv-recapture-result schema', () => {
      const validate = loadSchema('tpv-recapture-result');
      expect(validate(VALID_DISABLED_RESULT)).toBe(true);
    });

    test('valid one-pass result shape passes tpv-recapture-result schema', () => {
      const validate = loadSchema('tpv-recapture-result');
      expect(validate(VALID_ONE_PASS_RESULT)).toBe(true);
    });

    test('result with invalid convergence_status fails schema', () => {
      const validate = loadSchema('tpv-recapture-result');
      expect(validate({ ...VALID_DISABLED_RESULT, convergence_status: 'pending' })).toBe(false);
    });

    test('result missing required transform_trace fails schema', () => {
      const validate = loadSchema('tpv-recapture-result');
      const { transform_trace: _d, ...noTrace } = VALID_DISABLED_RESULT;
      expect(validate(noTrace)).toBe(false);
    });
  });

  // ===========================================================================
  // §20.1 Case 7 — explicit invalid-bounds cases from §13.3
  // ===========================================================================

  describe('Case 7: explicit invalid-bounds cases from §13.3 / §7.1', () => {
    test('missing tpv_model_id fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const { tpv_model_id: _d, ...noId } = VALID_CONFIG_FIXED;
      expect(validate(noId)).toBe(false);
    });

    test('missing cell_cooling_mode fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      const { cell_cooling_mode: _d, ...noCool } = VALID_CONFIG_FIXED;
      expect(validate(noCool)).toBe(false);
    });

    test('invalid cell_cooling_mode enum value fails schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      expect(validate({ ...VALID_CONFIG_FIXED, cell_cooling_mode: 'active_cooling' })).toBe(false);
    });

    test('invalid conversion_efficiency_mode enum value fails schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      expect(validate({ ...VALID_CONFIG_FIXED, conversion_efficiency_mode: 'unknown_mode' })).toBe(false);
    });

    test('spectral_capture_fraction < 0 fails tpv-recapture-config schema', () => {
      const validate = loadSchema('tpv-recapture-config');
      expect(validate({ ...VALID_CONFIG_FIXED, spectral_capture_fraction: -0.01 })).toBe(false);
    });
  });

});
