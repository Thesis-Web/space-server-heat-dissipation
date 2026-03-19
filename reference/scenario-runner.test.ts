/**
 * scenario-runner.test.ts
 * End-to-end reference case: 50 kW class node, H200-class GPU, nominal config.
 * Validates §27 execution order, §34 output contract, §41.3 runtime gate.
 * Based on Appendix A scenario shape and §45 50 kW guidance.
 */

import { runScenario } from '../runtime/runner/run-scenario';

describe('End-to-end scenario runner — 50 kW class (§45, Appendix A)', () => {

  const h200DevicePoints = {
    power_idle_w: 100,
    power_light_w: 250,
    power_medium_w: 500,
    power_full_w: 700,
  };

  it('Runs GEO 50 kW H200 nominal scenario without errors', () => {
    const result = runScenario({
      scenario_id: 'geo-50kw-h200-nominal',
      orbit_class: 'GEO',
      thermal_policy: 'nominal',
      load_state: 'full',
      compute_modules: [
        {
          device_count: 8,
          device_load_points: h200DevicePoints,
          memory_power_w: 500,
          storage_power_w: 100,
          network_power_w: 200,
          power_conversion_overhead_w: 300,
          control_overhead_w: 100,
          redundancy_mode: 'n_plus_1',
          target_load_state: 'full',
          thermal_grouping_label: 'compute_vault_A',
        },
      ],
      comms_payload: {
        rf_comms_power_w: 500,
        telemetry_power_w: 100,
        radar_power_w: 0,
        optical_crosslink_power_w: 200,
        duty_cycle_profile: 'full',
      },
      env_terms: null,
      radiator: {
        radiator_id: 'rad-50kw-nominal',
        target_surface_temp_k: 600,
        emissivity: 0.9,
        reserve_margin_fraction: 0.15,
        areal_mass_density_kg_per_m2: 5,
      },
      storage: {
        storage_id: 'stor-pcm-01',
        mass_kg: 50,
        cp_j_per_kgk: 800,
        temp_min_k: 580,
        temp_max_k: 620,
        latent_heat_j_per_kg: 0,
        latent_utilization_fraction: 0,
      },
      w_dot_parasitic_w: 0,
    });

    // §41.3 runtime gate — result must exist with version declarations
    expect(result.runtime_version).toBe('v0.1.0');
    expect(result.engineering_spec_version).toBe('v0.1.0');
    expect(result.scenario_id).toBe('geo-50kw-h200-nominal');

    // No error-severity flags
    expect(result.flag_summary.error_count).toBe(0);

    // Thermal outputs populated §34.2
    expect(result.outputs.thermal.q_dot_internal_w).toBeGreaterThan(0);
    expect(result.outputs.thermal.q_dot_total_reject_w).toBeGreaterThan(0);
    expect(result.outputs.thermal.a_radiator_effective_m2).toBeGreaterThan(0);
    expect(result.outputs.thermal.a_radiator_with_margin_m2).toBeGreaterThan(
      result.outputs.thermal.a_radiator_effective_m2
    );

    // Compute power check: 8 GPUs × 700W + overheads (500+100+200+300+100=1200) = 6800W. §17.2
    expect(result.outputs.electrical.w_dot_compute_w).toBeCloseTo(6800, 0);

    // Storage energy populated
    expect(result.outputs.thermal.storage_energy_usable_j).toBeGreaterThan(0);

    // Assumptions declared §4.3
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it('Rejects LEO scenario at orbit validation (§7.3)', () => {
    const result = runScenario({
      scenario_id: 'leo-test-reject',
      orbit_class: 'LEO',
      thermal_policy: 'nominal',
      load_state: 'full',
      compute_modules: [],
      comms_payload: null,
      env_terms: null,
      radiator: { radiator_id: 'rad-01', target_surface_temp_k: 600 },
      storage: null,
    });

    expect(result.flag_summary.error_count).toBeGreaterThan(0);
    const orbitFlag = result.flags.find(f => f.message.includes('GEO'));
    expect(orbitFlag).toBeDefined();
  });
});
