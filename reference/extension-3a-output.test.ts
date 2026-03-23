/**
 * Extension 3A output contract tests — 3A-spec §16.6
 */

import { runExtension3A } from '../runtime/runner/run-extension-3a';
import { emitTopologyReport, renderTopologyReportMarkdown } from '../runtime/emitters/topology-report';

const emptyCatalogs = {
  working_fluid_catalog: { catalog_id: 'working-fluids', catalog_version: 'v0.1.0', entries: [] },
  pickup_geometry_catalog: { catalog_id: 'pickup-geometries', catalog_version: 'v0.1.0', entries: [] },
};

const simpleZone = (id: string, extra: Record<string, unknown> = {}) => ({
  zone_id: id, zone_label: id, zone_type: 'compute_vault', notes: '',
  target_temp_k: 900, temp_min_k: 800, temp_max_k: 1000,
  zone_role: 'compute_vault', flow_direction: 'isolated',
  isolation_boundary: false, upstream_zone_ref: null, downstream_zone_ref: null,
  bridge_resistance_k_per_w: null, working_fluid_ref: null, pickup_geometry_ref: null,
  convergence_enabled: false, resistance_chain: null,
  ...extra,
});

describe('3A output contract — spec §16.6', () => {

  test('topology report emitted — §16.6', () => {
    const result = runExtension3A({
      scenario: {
        enable_model_extension_3a: true,
        model_extension_3a_mode: 'topology_only',
        thermal_zones: [simpleZone('zone-a'), simpleZone('zone-b')],
      },
      radiators: [],
      catalogs: emptyCatalogs,
    });
    const report = emitTopologyReport(result, [simpleZone('zone-a'), simpleZone('zone-b')]);
    expect(report).toBeDefined();
    expect(report.topology_valid).toBe(true);
    expect(report.zones).toHaveLength(2);
  });

  test('topology report renders as markdown — §14.2, §16.6', () => {
    const result = runExtension3A({
      scenario: {
        enable_model_extension_3a: true,
        model_extension_3a_mode: 'topology_only',
        thermal_zones: [simpleZone('zone-a')],
      },
      radiators: [],
      catalogs: emptyCatalogs,
    });
    const report = emitTopologyReport(result, [simpleZone('zone-a')]);
    const md = renderTopologyReportMarkdown(report);
    expect(typeof md).toBe('string');
    expect(md).toContain('Extension 3A Topology Report');
    expect(md).toContain('Topology valid');
    expect(md).toContain('T_sink');
    expect(md).toContain('Defaults Applied');
  });

  test('defaults_applied list populated in result — §12.2, §16.6', () => {
    const result = runExtension3A({
      scenario: {
        enable_model_extension_3a: true,
        model_extension_3a_mode: 'topology_only',
        thermal_zones: [simpleZone('zone-a')],
      },
      radiators: [],
      catalogs: emptyCatalogs,
    });
    expect(Array.isArray(result.defaults_applied)).toBe(true);
    expect(result.defaults_applied.length).toBeGreaterThan(0);
  });

  test('radiation-pressure metric emitted without changing orbit state — §11.10, §3.6, §16.6', () => {
    // Provide a radiator with surface_emissivity_bol to trigger sizing
    const result = runExtension3A({
      scenario: {
        enable_model_extension_3a: true,
        model_extension_3a_mode: 'foundational_hardening',
        thermal_zones: [],
      },
      radiators: [{
        radiator_id: 'rad-pres-test',
        schema_version: 'v0.2.0',
        target_surface_temp_k: 1200,
        emissivity: 0.90,
        material_family: 'test',
        geometry_class: 'deployable_panel',
        deployment_class: 'boom_deployed',
        packaging_notes: '',
        reserve_margin_fraction: 0.15,
        surface_emissivity_bol: 0.90,
        geometry_mode: 'single_sided',
        face_a_view_factor: 1.0,
        face_b_area_m2: 0,
        face_b_view_factor: 0,
        cavity_emissivity_mode: 'disabled',
        background_sink_temp_k_override: 4.0,
        q_dot_required_w: 50000,
        face_a_area_m2: 1.0,
      }],
      catalogs: emptyCatalogs,
      environment_sink_temperature_k: 4,
    });
    // Radiation pressure should be non-null (emitted as metric only — §3.6)
    expect(result.radiation_pressure_pa).not.toBeNull();
    expect(result.radiation_pressure_force_n).not.toBeNull();
    // Spec §3.6: no propagation engine — result is a flag metric only
    expect(typeof result.radiation_pressure_pa).toBe('number');
  });

  test('resistance chain totals emitted per zone — §14.1, §16.6', () => {
    const result = runExtension3A({
      scenario: {
        enable_model_extension_3a: true,
        model_extension_3a_mode: 'foundational_hardening',
        thermal_zones: [
          simpleZone('zone-resist-a', {
            resistance_chain: {
              r_junction_to_case_k_per_w: 0.005,
              r_case_to_spreader_k_per_w: 0.003,
              r_spreader_to_pickup_nominal_k_per_w: 0.008,
              r_pickup_to_loop_k_per_w: 0.004,
              r_loop_to_sink_k_per_w: 0.002,
            },
          }),
        ],
      },
      radiators: [],
      catalogs: emptyCatalogs,
    });
    expect(result.resistance_chain_totals).toBeDefined();
    expect(result.resistance_chain_totals['zone-resist-a']).toBeDefined();
    expect(result.resistance_chain_totals['zone-resist-a'].r_total_k_per_w).toBeCloseTo(0.022, 6);
  });

  test('legacy packet (no 3A fields) produces clean bypass with no 3A errors — §5.3, §16.6', () => {
    const result = runExtension3A({
      scenario: { /* no enable_model_extension_3a field */ },
      radiators: [],
      catalogs: emptyCatalogs,
    });
    expect(result.extension_3a_enabled).toBe(false);
    expect(result.blocking_errors).toHaveLength(0);
    expect(result.convergence_status).toBe('not_required');
  });

  test('spec_version and blueprint_version emitted in result — §14.1', () => {
    const result = runExtension3A({
      scenario: { enable_model_extension_3a: false },
      radiators: [],
      catalogs: emptyCatalogs,
    });
    expect(result.spec_version).toBe('v0.4.1');
    expect(result.blueprint_version).toBe('v0.4.1');
  });
});
