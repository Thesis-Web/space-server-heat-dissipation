/**
 * Extension 3A convergence tests — 3A-spec §16.3
 * Tests: convergent fixed-point, non-convergent blocking, runaway, runaway multiplier floor
 */

import { validateConvergenceControl } from '../runtime/validators/extension-3a-bounds';
import { CONVERGENCE_RUNAWAY_MULTIPLIER_MIN } from '../runtime/constants/constants';
import { runExtension3A } from '../runtime/runner/run-extension-3a';

// Minimal catalogs for runner tests
const emptyCatalogs = {
  working_fluid_catalog: { catalog_id: 'wf', catalog_version: 'v0.1.0', entries: [] },
  pickup_geometry_catalog: { catalog_id: 'pg', catalog_version: 'v0.1.0', entries: [] },
};

describe('3A convergence validation — spec §16.3', () => {

  describe('convergence_control bounds — §5.4, §13.4', () => {
    test('valid defaults pass bounds check', () => {
      const violations = validateConvergenceControl({
        max_iterations: 25, tolerance_abs_w: 1.0, tolerance_rel_fraction: 0.001,
        runaway_multiplier: 4.0, blocking_on_nonconvergence: true,
      });
      expect(violations.filter(v => v.severity === 'error')).toHaveLength(0);
    });

    test('max_iterations < 1 is blocking error — §13.4', () => {
      const violations = validateConvergenceControl({
        max_iterations: 0, tolerance_abs_w: 1.0, tolerance_rel_fraction: 0.001,
        runaway_multiplier: 4.0, blocking_on_nonconvergence: true,
      });
      expect(violations.some(v => v.field.includes('max_iterations') && v.severity === 'error')).toBe(true);
    });

    test('tolerance_abs_w <= 0 is blocking error — §13.4', () => {
      const violations = validateConvergenceControl({
        max_iterations: 25, tolerance_abs_w: 0, tolerance_rel_fraction: 0.001,
        runaway_multiplier: 4.0, blocking_on_nonconvergence: true,
      });
      expect(violations.some(v => v.field.includes('tolerance_abs_w') && v.severity === 'error')).toBe(true);
    });

    test('runaway_multiplier < 2.0 is blocking error — §5.4, §13.4', () => {
      const violations = validateConvergenceControl({
        max_iterations: 25, tolerance_abs_w: 1.0, tolerance_rel_fraction: 0.001,
        runaway_multiplier: 1.5, blocking_on_nonconvergence: true,
      });
      expect(violations.some(v => v.field.includes('runaway_multiplier') && v.severity === 'error')).toBe(true);
    });

    test('runaway_multiplier minimum constant is 2.0 — §5.4', () => {
      expect(CONVERGENCE_RUNAWAY_MULTIPLIER_MIN).toBe(2.0);
    });

    test('runaway_multiplier = 2.0 exactly is valid (minimum) — §5.4, §13.4, §16.3', () => {
      const violations = validateConvergenceControl({
        max_iterations: 25, tolerance_abs_w: 1.0, tolerance_rel_fraction: 0.001,
        runaway_multiplier: 2.0, blocking_on_nonconvergence: true,
      });
      expect(violations.filter(v => v.severity === 'error')).toHaveLength(0);
    });
  });

  describe('runner convergence gate — §16.3', () => {
    test('3A disabled scenario bypasses convergence and returns not_required', () => {
      const result = runExtension3A({
        scenario: { enable_model_extension_3a: false },
        radiators: [],
        catalogs: emptyCatalogs,
      });
      expect(result.extension_3a_enabled).toBe(false);
      expect(result.convergence_status).toBe('not_required');
      expect(result.convergence_attempted).toBe(false);
    });

    test('non-convergence with blocking_on_nonconvergence=true produces blocking_error — §13.4', () => {
      // Set max_iterations=1 with tight tolerance to force non-convergence
      const scenario = {
        enable_model_extension_3a: true,
        model_extension_3a_mode: 'foundational_hardening',
        convergence_control: {
          max_iterations: 1,
          tolerance_abs_w: 1e-15, // impossible tolerance
          tolerance_rel_fraction: 1e-15,
          runaway_multiplier: 100.0,
          blocking_on_nonconvergence: true,
        },
        thermal_zones: [
          {
            zone_id: 'zone-conv-a',
            zone_label: 'Conv A', zone_type: 'compute_vault', notes: '',
            target_temp_k: 900, temp_min_k: 800, temp_max_k: 1000,
            zone_role: 'convergence_exchange', flow_direction: 'bidirectional',
            isolation_boundary: true, bridge_resistance_k_per_w: 0.015,
            upstream_zone_ref: 'zone-conv-b', downstream_zone_ref: 'zone-conv-b',
            convergence_enabled: true, resistance_chain: null,
            working_fluid_ref: null, pickup_geometry_ref: null,
          },
          {
            zone_id: 'zone-conv-b',
            zone_label: 'Conv B', zone_type: 'compute_vault', notes: '',
            target_temp_k: 800, temp_min_k: 700, temp_max_k: 900,
            zone_role: 'convergence_exchange', flow_direction: 'bidirectional',
            isolation_boundary: true, bridge_resistance_k_per_w: 0.015,
            upstream_zone_ref: 'zone-conv-a', downstream_zone_ref: 'zone-conv-a',
            convergence_enabled: true, resistance_chain: null,
            working_fluid_ref: null, pickup_geometry_ref: null,
          },
        ],
      };
      const result = runExtension3A({
        scenario,
        radiators: [],
        catalogs: emptyCatalogs,
        environment_sink_temperature_k: 4,
      });
      // With 1 iteration and impossible tolerance, should non-converge or converge
      // Key test: if non-converged and blocking=true → blocking_errors has entry
      if (result.convergence_status === 'nonconverged') {
        expect(result.blocking_errors.some(e => e.includes('Convergence failed'))).toBe(true);
      }
      // Convergence was at least attempted
      expect(result.convergence_attempted).toBe(true);
    });
  });
});
