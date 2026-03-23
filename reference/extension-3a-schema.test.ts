/**
 * Extension 3A schema tests — 3A-spec §16.1
 * Tests: patched schemas, new schemas, legacy backward compat
 */

import { validateDocument, validateWorkingFluidEntry, validatePickupGeometryEntry } from '../runtime/validators/schema';

describe('3A schema validation — spec §16.1', () => {

  describe('thermal-zone schema v0.2.0 — §6', () => {
    const baseZone = {
      zone_id: 'zone-test-001',
      schema_version: 'v0.2.0',
      zone_label: 'Test Zone',
      zone_type: 'compute_vault',
      target_temp_k: 900,
      temp_min_k: 800,
      temp_max_k: 1000,
      notes: 'test',
    };

    test('minimal zone without 3A fields passes schema', () => {
      const result = validateDocument('thermal-zone', baseZone, 'zone-test-001');
      expect(result.valid).toBe(true);
    });

    test('zone with all 3A fields passes schema', () => {
      const zone = {
        ...baseZone,
        zone_role: 'convergence_exchange',
        flow_direction: 'bidirectional',
        isolation_boundary: true,
        upstream_zone_ref: 'zone-upstream',
        downstream_zone_ref: 'zone-downstream',
        bridge_resistance_k_per_w: 0.015,
        working_fluid_ref: 'fluid-nak-v0',
        pickup_geometry_ref: 'geom-microchannel-v0',
        convergence_enabled: true,
        resistance_chain: {
          r_junction_to_case_k_per_w: 0.005,
          r_case_to_spreader_k_per_w: 0.003,
          r_spreader_to_pickup_nominal_k_per_w: 0.008,
          r_pickup_to_loop_k_per_w: 0.004,
          r_loop_to_sink_k_per_w: 0.002,
        },
      };
      const result = validateDocument('thermal-zone', zone, 'zone-full-3a');
      expect(result.valid).toBe(true);
    });

    test('zone with null resistance_chain passes schema', () => {
      const zone = { ...baseZone, zone_role: 'compute_vault', resistance_chain: null };
      const result = validateDocument('thermal-zone', zone, 'zone-null-chain');
      expect(result.valid).toBe(true);
    });

    test('zone with invalid zone_role fails schema', () => {
      const zone = { ...baseZone, zone_role: 'invalid_role' };
      const result = validateDocument('thermal-zone', zone, 'zone-bad-role');
      expect(result.valid).toBe(false);
    });
  });

  describe('radiator schema v0.2.0 — §9', () => {
    const baseRad = {
      radiator_id: 'rad-test-001',
      schema_version: 'v0.2.0',
      target_surface_temp_k: 1200,
      emissivity: 0.90,
      material_family: 'carbon_composite',
      geometry_class: 'deployable_panel',
      deployment_class: 'boom_deployed',
      packaging_notes: 'test',
      reserve_margin_fraction: 0.15,
    };

    test('baseline radiator without 3A fields passes schema', () => {
      const result = validateDocument('radiator', baseRad, 'rad-baseline');
      expect(result.valid).toBe(true);
    });

    test('radiator with 3A fields passes schema', () => {
      const rad = {
        ...baseRad,
        geometry_mode: 'double_sided_symmetric',
        face_a_area_m2: 2.5,
        face_b_area_m2: 2.5,
        face_a_view_factor: 0.95,
        face_b_view_factor: 0.85,
        surface_emissivity_bol: 0.88,
        surface_emissivity_eol_override: null,
        emissivity_degradation_fraction: 0.05,
        cavity_emissivity_mode: 'disabled',
        background_sink_temp_k_override: 4.0,
      };
      const result = validateDocument('radiator', rad, 'rad-3a');
      expect(result.valid).toBe(true);
    });

    test('invalid geometry_mode value fails schema', () => {
      const rad = { ...baseRad, geometry_mode: 'triple_sided' };
      const result = validateDocument('radiator', rad, 'rad-bad-mode');
      expect(result.valid).toBe(false);
    });

    test('emissivity out of range (0,1] fails schema', () => {
      const rad = { ...baseRad, surface_emissivity_bol: 1.5 };
      const result = validateDocument('radiator', rad, 'rad-bad-eps');
      expect(result.valid).toBe(false);
    });
  });

  describe('working-fluid schema v0.2.0 — §7.1', () => {
    const validFluid = {
      working_fluid_id: 'fluid-test-v0',
      schema_version: 'v0.2.0',
      label: 'Test Fluid',
      fluid_class: 'liquid_metal',
      phase_class: 'single_phase_liquid',
      temp_operating_min_k: 400,
      temp_operating_max_k: 1200,
      cp_basis_j_per_kgk: 1260,
      density_basis_kg_per_m3: 900,
      thermal_conductivity_w_per_mk: 60,
      viscosity_basis_pa_s: 3.5e-4,
      gamma_ratio: null,
      latent_heat_basis_j_per_kg: null,
      provenance_class: 'sourced_secondary',
      confidence_class: 'medium',
      maturity_class: 'trl_4_5',
      research_required: true,
      source_note: 'test entry',
    };

    test('valid working-fluid entry passes schema', () => {
      const result = validateWorkingFluidEntry(validFluid, 'fluid-test-v0');
      expect(result.valid).toBe(true);
    });

    test('invalid fluid_class fails schema', () => {
      const bad = { ...validFluid, fluid_class: 'magic_fluid' };
      const result = validateWorkingFluidEntry(bad, 'fluid-bad');
      expect(result.valid).toBe(false);
    });

    test('invalid provenance_class fails schema', () => {
      const bad = { ...validFluid, provenance_class: 'unknown_class' };
      const result = validateWorkingFluidEntry(bad, 'fluid-bad-prov');
      expect(result.valid).toBe(false);
    });
  });

  describe('pickup-geometry schema v0.1.0 — §8.1', () => {
    const validGeom = {
      pickup_geometry_id: 'geom-test-v0',
      schema_version: 'v0.1.0',
      label: 'Test Geometry',
      geometry_class: 'direct_cold_plate',
      contact_mode: 'direct_bond',
      nominal_contact_area_fraction: 0.85,
      nominal_spreading_factor: 1.05,
      nominal_resistance_multiplier: 1.0,
      manufacturability_class: 'heritage',
      provenance_class: 'operator_estimated',
      confidence_class: 'medium',
      research_required: false,
      source_note: 'test entry',
    };

    test('valid pickup-geometry entry passes schema', () => {
      const result = validatePickupGeometryEntry(validGeom, 'geom-test-v0');
      expect(result.valid).toBe(true);
    });

    test('invalid geometry_class fails schema', () => {
      const bad = { ...validGeom, geometry_class: 'quantum_teleport' };
      const result = validatePickupGeometryEntry(bad, 'geom-bad');
      expect(result.valid).toBe(false);
    });
  });

  describe('legacy packet backward compat — spec §5.3, §16.1', () => {
    test('legacy scenario without 3A fields passes scenario schema', () => {
      // A pre-3A scenario must pass schema validation with no 3A fields present.
      // Uses valid enum values matching the scenario schema constraints.
      const legacyScenario = {
        scenario_id: 'scenario-legacy-001',
        schema_version: 'v0.1.0',
        scenario_version: 'v1.0.0',
        label: 'Legacy GEO 50kW baseline',
        orbit_class: 'GEO',
        environment_profile: 'geo_nominal',   // string ref — valid per schema oneOf §5.3
        mission_mode: 'compute_only',
        node_class: '50kw',
        architecture_class: 'cold_loop_plus_hot_backbone',
        utilization_profile: 'full',
        thermal_policy: 'nominal',
        selected_branches: ['none'],
        reporting_preferences: { summary_markdown: true, comparison_enabled: false },
      };
      const result = validateDocument('scenario', legacyScenario, 'legacy-scenario');
      // Legacy scenario must not fail just because 3A fields are absent
      expect(result.valid).toBe(true);
    });
  });
});
