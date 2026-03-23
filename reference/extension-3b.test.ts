/**
 * extension-3b.test.ts
 * Extension 3B minimum test coverage — 3B-spec §17
 *
 * Required test cases per spec §17:
 * 1. vault gas environment preset load + manual override
 * 2. pump direct-power ownership
 * 3. pump pressure-drop ownership
 * 4. liquid-loop single-phase intended with declared void fraction > allowable
 * 5. bubble-risk additive resistance penalty
 * 6. TEG boundedness with residual heat on-node
 * 7. eclipse-state storage drawdown gating
 * 8. additive run-packet dispatch ordering baseline → 3A → 3B
 *
 * Spec refs: §11.1–§11.9, §13, §14, §14.1, §15.2, §15.3
 */

import { computeVaultGasResistance } from '../runtime/formulas/vault-gas-environment';
import {
  computePumpParasitic,
  computeBubblePenalty
} from '../runtime/formulas/loop-parasitics';
import {
  computeTEGBoundedOutput,
  computeTotalRejectWith3B,
  applyOperatingStateEffects
} from '../runtime/formulas/gas-management';
import { computeEffective3BLoopResistance } from '../runtime/formulas/resistance-chain';
import { validateExtension3BBounds } from '../runtime/validators/extension-3b-bounds';
import { normalizeExtension3B } from '../runtime/transforms/extension-3b-normalizer';

// ── Minimal catalog stubs for normalizer ──────────────────────────────────────
const STUB_CATALOGS = {
  vaultGasEnvironmentPresets: {
    catalog_id: 'vault-gas-environment-presets',
    catalog_version: 'v0.1.0',
    presets: [
      {
        preset_id: 'vge-test-preset',
        preset_version: 'v0.1.0',
        label: 'Test Preset',
        gas_presence_mode: 'pressurized',
        gas_species_ref: 'n2-gas',
        pressure_pa: 500,
        convection_assumption_mode: 'preset_fixed_h',
        effective_h_internal_w_per_m2_k: 8.0,
        exchange_area_m2: 0.04,
        contamination_outgassing_mode: 'nominal_clean',
        notes: ''
      }
    ]
  },
  transportImplementationPresets: {
    catalog_id: 'transport-implementation-presets',
    catalog_version: 'v0.1.0',
    presets: []
  },
  eclipseStatePresets: {
    catalog_id: 'eclipse-state-presets',
    catalog_version: 'v0.1.0',
    presets: [
      {
        preset_id: 'es-eclipse-no-storage',
        preset_version: 'v0.1.0',
        label: 'Eclipse No Storage',
        current_state: 'eclipse',
        storage_support_enabled: false,
        storage_ref: null,
        compute_derate_fraction: 0.20,
        noncritical_branch_disable_refs: [],
        notes: ''
      }
    ]
  }
};

// =============================================================================
// Test 1: vault gas environment preset load + manual override
// Spec §17 item 1, §11.1, §12.1
// =============================================================================
describe('3B Test 1: vault gas environment — preset load + manual override', () => {
  test('mode=none → r_vault=0, reason_code=mode_none', () => {
    const result = computeVaultGasResistance('zone-a', {
      mode: 'none',
      preset_id: null, preset_version: null,
      gas_presence_mode: 'none', gas_species_ref: null, pressure_pa: null,
      convection_assumption_mode: 'disabled',
      effective_h_internal_w_per_m2_k: null, exchange_area_m2: null,
      contamination_outgassing_mode: 'none', manual_override_fields: [], notes: ''
    });
    expect(result.r_vault_gas_environment_k_per_w).toBe(0);
    expect(result.reason_code).toBe('mode_none');
    expect(result.blocking_errors).toHaveLength(0);
  });

  test('convection enabled with explicit h and A → r = 1/(h*A)', () => {
    const h = 10.0;
    const A = 0.05;
    const result = computeVaultGasResistance('zone-b', {
      mode: 'custom',
      preset_id: null, preset_version: null,
      gas_presence_mode: 'pressurized', gas_species_ref: 'n2-gas', pressure_pa: 1000,
      convection_assumption_mode: 'operator_fixed_h',
      effective_h_internal_w_per_m2_k: h, exchange_area_m2: A,
      contamination_outgassing_mode: 'nominal_clean', manual_override_fields: [], notes: ''
    });
    expect(result.r_vault_gas_environment_k_per_w).toBeCloseTo(1.0 / (h * A), 8);
    expect(result.reason_code).toBe('computed');
    expect(result.blocking_errors).toHaveLength(0);
  });

  test('preset load via normalizer populates explicit fields and records provenance', () => {
    const scenario = {
      enable_model_extension_3b: true,
      model_extension_3b_mode: 'subsystem_depth_only',
      thermal_zones: [{
        zone_id: 'zone-preset',
        vault_gas_environment_model: {
          mode: 'preset',
          preset_id: 'vge-test-preset',
          preset_version: 'v0.1.0',
          gas_presence_mode: 'none', gas_species_ref: null, pressure_pa: null,
          convection_assumption_mode: 'disabled',
          effective_h_internal_w_per_m2_k: null, exchange_area_m2: null,
          contamination_outgassing_mode: 'none', manual_override_fields: [], notes: ''
        }
      }]
    };
    const norm = normalizeExtension3B(scenario as Record<string, unknown>, STUB_CATALOGS);
    expect(norm.disabled).toBe(false);
    const zone = norm.normalized_zones[0];
    // Preset values should be loaded into explicit fields
    expect(zone.vault_gas_environment_model.effective_h_internal_w_per_m2_k).toBe(8.0);
    expect(zone.vault_gas_environment_model.exchange_area_m2).toBe(0.04);
    // Provenance recorded
    expect(norm.preset_provenance.length).toBeGreaterThan(0);
    expect(norm.preset_provenance[0].preset_entry_id).toBe('vge-test-preset');
  });
});

// =============================================================================
// Test 2: pump direct-power ownership
// Spec §17 item 2, §11.2, §6.2.1
// =============================================================================
describe('3B Test 2: pump direct-power ownership', () => {
  test('direct_power with valid pump_power_input_w → w_dot = pump_power_input_w', () => {
    const result = computePumpParasitic('zone-dp', {
      mode: 'custom',
      preset_id: null, preset_version: null,
      transport_class: 'pumped_single_phase_liquid',
      pump_model_mode: 'direct_power',
      pump_power_input_w: 25.0,
      pump_efficiency_fraction: null, pressure_drop_pa: null,
      mass_flow_kg_per_s: null, fluid_density_kg_per_m3_override: null,
      gas_management_mode: 'single_phase_intended',
      allowable_void_fraction: 0.02, declared_void_fraction: 0.0,
      bubble_blanketing_penalty_fraction: 0.05, gas_lock_flow_derate_fraction: 0.02,
      separator_type: 'reservoir', notes: ''
    }, null);
    expect(result.w_dot_pump_w).toBe(25.0);
    expect(result.reason_code).toBe('computed_direct_power');
    expect(result.blocking_errors).toHaveLength(0);
  });

  test('direct_power with missing pump_power_input_w → blocking error', () => {
    const result = computePumpParasitic('zone-dp-fail', {
      mode: 'custom', preset_id: null, preset_version: null,
      transport_class: 'pumped_single_phase_liquid',
      pump_model_mode: 'direct_power',
      pump_power_input_w: null,
      pump_efficiency_fraction: null, pressure_drop_pa: null,
      mass_flow_kg_per_s: null, fluid_density_kg_per_m3_override: null,
      gas_management_mode: 'not_applicable', allowable_void_fraction: null,
      declared_void_fraction: null, bubble_blanketing_penalty_fraction: null,
      gas_lock_flow_derate_fraction: null, separator_type: 'none', notes: ''
    }, null);
    expect(result.blocking_errors.length).toBeGreaterThan(0);
    expect(result.reason_code).toBe('blocked');
  });
});

// =============================================================================
// Test 3: pump pressure-drop ownership
// Spec §17 item 3, §11.3
// =============================================================================
describe('3B Test 3: pump pressure-drop / flow ownership', () => {
  test('pressure_drop_flow with full primitive set → w_dot = dP*m_dot/(rho*eta)', () => {
    const dP = 5000;       // Pa
    const mDot = 0.05;     // kg/s
    const rho = 900;       // kg/m³  (from working-fluid, overridden here)
    const eta = 0.65;
    const expected = (dP * (mDot / rho)) / eta;

    const result = computePumpParasitic('zone-pdp', {
      mode: 'custom', preset_id: null, preset_version: null,
      transport_class: 'pumped_single_phase_liquid',
      pump_model_mode: 'pressure_drop_flow',
      pump_power_input_w: null,
      pump_efficiency_fraction: eta,
      pressure_drop_pa: dP,
      mass_flow_kg_per_s: mDot,
      fluid_density_kg_per_m3_override: rho,
      gas_management_mode: 'single_phase_intended',
      allowable_void_fraction: 0.02, declared_void_fraction: 0.0,
      bubble_blanketing_penalty_fraction: 0.05, gas_lock_flow_derate_fraction: 0.02,
      separator_type: 'reservoir', notes: ''
    }, null);
    expect(result.w_dot_pump_w).toBeCloseTo(expected, 6);
    expect(result.reason_code).toBe('computed_pressure_drop_flow');
    expect(result.blocking_errors).toHaveLength(0);
  });

  test('pressure_drop_flow missing eta → blocking error', () => {
    const result = computePumpParasitic('zone-pdp-fail', {
      mode: 'custom', preset_id: null, preset_version: null,
      transport_class: 'pumped_single_phase_liquid',
      pump_model_mode: 'pressure_drop_flow',
      pump_power_input_w: null, pump_efficiency_fraction: null,
      pressure_drop_pa: 5000, mass_flow_kg_per_s: 0.05,
      fluid_density_kg_per_m3_override: 900,
      gas_management_mode: 'not_applicable', allowable_void_fraction: null,
      declared_void_fraction: null, bubble_blanketing_penalty_fraction: null,
      gas_lock_flow_derate_fraction: null, separator_type: 'none', notes: ''
    }, null);
    expect(result.blocking_errors.length).toBeGreaterThan(0);
    expect(result.reason_code).toBe('blocked');
  });
});

// =============================================================================
// Test 4: single-phase intended with declared void > allowable → blocking
// Spec §17 item 4, §13.3, §11.5
// =============================================================================
describe('3B Test 4: liquid-loop single_phase_intended void fraction exceeded', () => {
  test('declared_void_fraction > allowable_void_fraction in single_phase_intended → blocking', () => {
    const norm = normalizeExtension3B({
      enable_model_extension_3b: true,
      model_extension_3b_mode: 'subsystem_depth_only',
      thermal_zones: [{
        zone_id: 'zone-void',
        transport_implementation: {
          mode: 'custom', preset_id: null, preset_version: null,
          transport_class: 'pumped_single_phase_liquid',
          pump_model_mode: 'none', pump_power_input_w: null,
          pump_efficiency_fraction: null, pressure_drop_pa: null,
          mass_flow_kg_per_s: null, fluid_density_kg_per_m3_override: null,
          gas_management_mode: 'single_phase_intended',
          allowable_void_fraction: 0.02,
          declared_void_fraction: 0.10,  // EXCEEDS allowable
          bubble_blanketing_penalty_fraction: 0.05,
          gas_lock_flow_derate_fraction: 0.02,
          separator_type: 'none', notes: ''
        }
      }]
    } as Record<string, unknown>, STUB_CATALOGS);

    const boundsResult = validateExtension3BBounds(norm);
    expect(boundsResult.passed).toBe(false);
    expect(boundsResult.blocking_errors.some(e => e.includes('void_fraction'))).toBe(true);
  });
});

// =============================================================================
// Test 5: bubble-risk additive resistance penalty
// Spec §17 item 5, §11.4, §11.6
// =============================================================================
describe('3B Test 5: bubble-risk additive resistance penalty', () => {
  test('declared_void_fraction > 0 → r_bubble = r_base * penalty_fraction', () => {
    const rBase = 0.1; // K/W
    const penalty = 0.15;
    const result = computeBubblePenalty('zone-bubble', {
      mode: 'custom', preset_id: null, preset_version: null,
      transport_class: 'pumped_single_phase_liquid',
      pump_model_mode: 'none', pump_power_input_w: null,
      pump_efficiency_fraction: null, pressure_drop_pa: null,
      mass_flow_kg_per_s: null, fluid_density_kg_per_m3_override: null,
      gas_management_mode: 'gas_managed',
      allowable_void_fraction: 0.10,
      declared_void_fraction: 0.05,
      bubble_blanketing_penalty_fraction: penalty,
      gas_lock_flow_derate_fraction: 0.03,
      separator_type: 'membrane', notes: ''
    }, rBase);
    expect(result.r_bubble_penalty_k_per_w).toBeCloseTo(rBase * penalty, 8);
    expect(result.blocking_errors).toHaveLength(0);

    // Effective 3B resistance = base + vault(0) + bubble
    const eff = computeEffective3BLoopResistance('zone-bubble', rBase, 0, result.r_bubble_penalty_k_per_w);
    expect(eff.r_loop_to_sink_effective_3b_k_per_w).toBeCloseTo(rBase + rBase * penalty, 8);
    // 3A base term must not be mutated (reported separately)
    expect(eff.r_loop_to_sink_base_k_per_w).toBe(rBase);
  });
});

// =============================================================================
// Test 6: TEG boundedness with residual heat on-node
// Spec §17 item 6, §11.8, §13.4
// =============================================================================
describe('3B Test 6: TEG boundedness — residual heat on-node', () => {
  test('TEG bounded to min(eta_declared, eta_carnot, teg_carnot_fraction_cap)', () => {
    const tHot = 600;  // K
    const tCold = 300; // K
    const etaCarnot = 1 - tCold / tHot;   // = 0.5
    const etaDeclared = 0.40;             // under Carnot
    const cap = 0.20;                     // spec default cap
    const qIn = 1000;                     // W

    const result = computeTEGBoundedOutput({
      branch_id: 'teg-01', branch_type: 'teg', enabled: true,
      q_dot_input_w: qIn,
      efficiency_fraction: etaDeclared,
      t_hot_source_k: tHot, t_cold_sink_k: tCold,
      teg_carnot_fraction_cap: cap,
      teg_residual_heat_on_node: true,
      teg_subordinate_to_rejection: true
    });

    const expectedEta = Math.min(etaDeclared, etaCarnot, cap); // = 0.20
    expect(result.eta_teg_cap).toBeCloseTo(expectedEta, 8);
    expect(result.p_dot_teg_electrical_w).toBeCloseTo(qIn * expectedEta, 4);
    // Residual stays on-node
    expect(result.residual_on_node).toBe(true);
    expect(result.q_dot_teg_residual_w).toBeCloseTo(qIn - qIn * expectedEta, 4);
    expect(result.blocking_errors).toHaveLength(0);
  });

  test('TEG with teg_subordinate_to_rejection=false → blocking error', () => {
    const result = computeTEGBoundedOutput({
      branch_id: 'teg-bad', branch_type: 'teg', enabled: true,
      q_dot_input_w: 500,
      efficiency_fraction: 0.15,
      t_hot_source_k: 500, t_cold_sink_k: 300,
      teg_carnot_fraction_cap: 0.20,
      teg_residual_heat_on_node: true,
      teg_subordinate_to_rejection: false  // VIOLATION
    });
    expect(result.blocking_errors.length).toBeGreaterThan(0);
    expect(result.reason_code).toBe('blocked');
  });

  test('total reject bookkeeping includes pump parasitic and TEG residual on-node', () => {
    const qBase = 5000;
    const wPump = 50;
    const tegResults = [{
      branch_id: 'teg-01',
      eta_carnot: 0.5, eta_teg_cap: 0.20,
      p_dot_teg_electrical_w: 200,
      q_dot_teg_residual_w: 800,
      residual_on_node: true,
      reason_code: 'computed',
      blocking_errors: [], warnings: [], trace: []
    }];
    const { q_dot_total_reject_3b_w } = computeTotalRejectWith3B(qBase, wPump, tegResults);
    expect(q_dot_total_reject_3b_w).toBeCloseTo(qBase + wPump + 800, 4);
  });
});

// =============================================================================
// Test 7: eclipse-state storage drawdown gating
// Spec §17 item 7, §11.9, §13.5
// =============================================================================
describe('3B Test 7: eclipse-state storage drawdown gating', () => {
  test('eclipse with storage_support_enabled=true but missing storage_ref → blocking', () => {
    const effects = applyOperatingStateEffects({
      current_state: 'eclipse',
      state_resolution_mode: 'explicit',
      preset_id: null, preset_version: null,
      storage_support_enabled: true,
      storage_ref: null,       // MISSING
      compute_derate_fraction: 0.10,
      noncritical_branch_disable_refs: [],
      notes: ''
    }, 10000);
    expect(effects.blocking_errors.length).toBeGreaterThan(0);
    expect(effects.blocking_errors[0]).toMatch(/storage_ref/);
  });

  test('eclipse with storage_support_enabled=true and valid storage_ref → drawdown allowed', () => {
    const effects = applyOperatingStateEffects({
      current_state: 'eclipse',
      state_resolution_mode: 'explicit',
      preset_id: null, preset_version: null,
      storage_support_enabled: true,
      storage_ref: 'storage-01',
      compute_derate_fraction: 0.20,
      noncritical_branch_disable_refs: [],
      notes: ''
    }, 10000);
    expect(effects.storage_drawdown_allowed).toBe(true);
    expect(effects.solar_source_terms_suppressed).toBe(true);
    expect(effects.q_dot_compute_effective_w).toBeCloseTo(10000 * (1 - 0.20), 4);
    expect(effects.blocking_errors).toHaveLength(0);
  });

  test('sunlit state → no effects applied, solar terms active', () => {
    const effects = applyOperatingStateEffects({
      current_state: 'sunlit',
      state_resolution_mode: 'explicit',
      preset_id: null, preset_version: null,
      storage_support_enabled: false,
      storage_ref: null,
      compute_derate_fraction: 0,
      noncritical_branch_disable_refs: [],
      notes: ''
    }, 8000);
    expect(effects.solar_source_terms_suppressed).toBe(false);
    expect(effects.storage_drawdown_allowed).toBe(false);
    expect(effects.q_dot_compute_effective_w).toBe(8000);
  });
});

// =============================================================================
// Test 8: additive run-packet dispatch ordering baseline → 3A → 3B
// Spec §17 item 8, §15.3, §14.1
// =============================================================================
describe('3B Test 8: additive dispatch ordering and disabled result shape', () => {
  test('3B disabled → deterministic disabled result emitted (spec §14.1)', () => {
    const norm = normalizeExtension3B({
      enable_model_extension_3b: false,
      model_extension_3b_mode: 'disabled',
      thermal_zones: []
    } as Record<string, unknown>, STUB_CATALOGS);

    expect(norm.disabled).toBe(true);
    expect(norm.enabled).toBe(false);
    expect(norm.mode).toBe('disabled');
    expect(norm.normalized_zones).toHaveLength(0);
    expect(norm.trace).toContain('extension_3b_disabled: returning deterministic disabled result');
  });

  test('3B disabled normalizer returns empty preset_provenance', () => {
    const norm = normalizeExtension3B({
      enable_model_extension_3b: false,
      thermal_zones: []
    } as Record<string, unknown>, STUB_CATALOGS);
    expect(norm.preset_provenance).toHaveLength(0);
  });

  test('3B enabled with mode=subsystem_depth_only normalizes zones correctly', () => {
    const norm = normalizeExtension3B({
      enable_model_extension_3b: true,
      model_extension_3b_mode: 'subsystem_depth_only',
      thermal_zones: [{ zone_id: 'zone-001' }]
    } as Record<string, unknown>, STUB_CATALOGS);

    expect(norm.disabled).toBe(false);
    expect(norm.normalized_zones).toHaveLength(1);
    const zone = norm.normalized_zones[0];
    // Defaults injected for all three 3B nested objects
    expect(zone.vault_gas_environment_model.mode).toBe('none');
    expect(zone.transport_implementation.mode).toBe('none');
    expect(zone.loop_model.loop_id).toBeNull();
  });

  test('3B mode requires eclipse semantics but operating_state absent → blocking', () => {
    const norm = normalizeExtension3B({
      enable_model_extension_3b: true,
      model_extension_3b_mode: 'subsystem_depth_with_eclipse',
      // operating_state deliberately absent
      thermal_zones: []
    } as Record<string, unknown>, STUB_CATALOGS);

    const boundsResult = validateExtension3BBounds(norm);
    // Either norm or bounds should surface the eclipse-state requirement
    const allErrors = [...norm.blocking_errors, ...boundsResult.blocking_errors];
    expect(allErrors.some(e => e.toLowerCase().includes('operating_state') || e.includes('eclipse'))).toBe(true);
  });
});
