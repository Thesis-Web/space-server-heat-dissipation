/**
 * Extension 3A radiator tests — 3A-spec §16.5
 */

import {
  computeRadiator3ASizing,
  resolveRadiatorTSink,
  resolveEpsilonEol,
  computeGrayCavityEmissivity,
} from '../runtime/formulas/radiation';
import { STEFAN_BOLTZMANN } from '../runtime/constants/constants';

const TOLERANCE = 1e-6;

describe('3A radiator formulas — spec §16.5', () => {

  test('single-sided 3A result matches baseline when 3A features disabled — §16.5', () => {
    // When geometry_mode=single_sided, face_b_view_factor=0, no cavity, no degradation:
    // should produce same area as baseline radiatorEffectiveArea
    const sizing = computeRadiator3ASizing({
      radiator_id: 'rad-test',
      geometry_mode: 'single_sided',
      face_a_view_factor: 1.0,
      face_b_view_factor: 0,
      surface_emissivity_bol: 0.90,
      surface_emissivity_eol_override: null,
      emissivity_degradation_fraction: null,
      cavity_emissivity_mode: 'disabled',
      cavity_view_factor: null,
      cavity_surface_emissivity: null,
      t_sink_resolved_k: 0,
      t_rad_k: 1200,
      q_dot_required_w: 50_000,
      reserve_margin_fraction: 0,
    });
    // Baseline: A = Q / (eps * sigma * F * (T^4 - T_sink^4))
    // = 50000 / (0.90 * 5.670374419e-8 * 1.0 * (1200^4 - 0))
    const dT4 = Math.pow(1200, 4) - 0;
    const expected = 50_000 / (0.90 * STEFAN_BOLTZMANN * 1.0 * dT4);
    expect(sizing.a_bol_required_m2).toBeCloseTo(expected, 4);
    // bol === eol when no degradation
    expect(sizing.a_bol_required_m2).toBeCloseTo(sizing.a_eol_required_m2, 6);
    expect(sizing.a_delta_m2).toBeCloseTo(0, 6);
  });

  test('symmetric double-sided requires less area per face than single-sided equal emissivity — §11.8, §16.5', () => {
    const single = computeRadiator3ASizing({
      radiator_id: 'rad-single',
      geometry_mode: 'single_sided',
      face_a_view_factor: 1.0,
      face_b_view_factor: 0,
      surface_emissivity_bol: 0.85,
      surface_emissivity_eol_override: null,
      emissivity_degradation_fraction: null,
      cavity_emissivity_mode: 'disabled',
      cavity_view_factor: null,
      cavity_surface_emissivity: null,
      t_sink_resolved_k: 4,
      t_rad_k: 1000,
      q_dot_required_w: 100_000,
      reserve_margin_fraction: 0,
    });
    const doubled = computeRadiator3ASizing({
      radiator_id: 'rad-double',
      geometry_mode: 'double_sided_symmetric',
      face_a_view_factor: 1.0,
      face_b_view_factor: 1.0,
      surface_emissivity_bol: 0.85,
      surface_emissivity_eol_override: null,
      emissivity_degradation_fraction: null,
      cavity_emissivity_mode: 'disabled',
      cavity_view_factor: null,
      cavity_surface_emissivity: null,
      t_sink_resolved_k: 4,
      t_rad_k: 1000,
      q_dot_required_w: 100_000,
      reserve_margin_fraction: 0,
    });
    // With equal emissivity and F=1 on both faces, double-sided requires ~half per-face
    // effective_emissive_factor doubles → required area halves
    expect(doubled.a_bol_required_m2).toBeCloseTo(single.a_bol_required_m2 / 2, 4);
  });

  test('BOL/EOL degradation increases required area — §11.7, §11.9, §16.5', () => {
    const sizing = computeRadiator3ASizing({
      radiator_id: 'rad-deg',
      geometry_mode: 'single_sided',
      face_a_view_factor: 1.0,
      face_b_view_factor: 0,
      surface_emissivity_bol: 0.90,
      surface_emissivity_eol_override: null,
      emissivity_degradation_fraction: 0.10, // 10% degradation
      cavity_emissivity_mode: 'disabled',
      cavity_view_factor: null,
      cavity_surface_emissivity: null,
      t_sink_resolved_k: 4,
      t_rad_k: 1100,
      q_dot_required_w: 75_000,
      reserve_margin_fraction: 0,
    });
    // EOL epsilon = 0.90 * (1 - 0.10) = 0.81 < 0.90 → larger area needed at EOL
    expect(sizing.a_eol_required_m2).toBeGreaterThan(sizing.a_bol_required_m2);
    expect(sizing.a_delta_m2).toBeGreaterThan(0);
  });

  test('gray cavity approximation changes effective emissivity — §11.6, §16.5', () => {
    // epsilon_cavity = 1 / ((1/epsilon_surface) + ((1-F)/F))
    const eps_cavity = computeGrayCavityEmissivity(0.80, 0.60);
    // 1 / ((1/0.80) + ((1-0.60)/0.60)) = 1 / (1.25 + 0.6667) = 1 / 1.9167 ≈ 0.5217
    expect(eps_cavity).toBeCloseTo(0.5217, 3);

    const sizingCavity = computeRadiator3ASizing({
      radiator_id: 'rad-cavity',
      geometry_mode: 'single_sided',
      face_a_view_factor: 1.0,
      face_b_view_factor: 0,
      surface_emissivity_bol: 0.80,
      surface_emissivity_eol_override: null,
      emissivity_degradation_fraction: null,
      cavity_emissivity_mode: 'gray_cavity_approx',
      cavity_view_factor: 0.60,
      cavity_surface_emissivity: 0.80,
      t_sink_resolved_k: 4,
      t_rad_k: 1100,
      q_dot_required_w: 50_000,
      reserve_margin_fraction: 0,
    });
    const sizingNoCavity = computeRadiator3ASizing({
      radiator_id: 'rad-no-cavity',
      geometry_mode: 'single_sided',
      face_a_view_factor: 1.0,
      face_b_view_factor: 0,
      surface_emissivity_bol: 0.80,
      surface_emissivity_eol_override: null,
      emissivity_degradation_fraction: null,
      cavity_emissivity_mode: 'disabled',
      cavity_view_factor: null,
      cavity_surface_emissivity: null,
      t_sink_resolved_k: 4,
      t_rad_k: 1100,
      q_dot_required_w: 50_000,
      reserve_margin_fraction: 0,
    });
    // Cavity approximation reduces effective emissivity → larger area required
    expect(sizingCavity.a_bol_required_m2).toBeGreaterThan(sizingNoCavity.a_bol_required_m2);
  });

  test('T_sink override takes priority over environment profile — §9.4, §16.5', () => {
    const result = resolveRadiatorTSink(50.0, 4.0);
    expect(result.t_sink_k).toBe(50.0);
    expect(result.source).toBe('override');
  });

  test('environment profile used when no override — §9.4, §16.5', () => {
    const result = resolveRadiatorTSink(null, 4.0);
    expect(result.t_sink_k).toBe(4.0);
    expect(result.source).toBe('environment_profile');
  });

  test('missing T_sink returns unresolved — §9.4, §13.3, §16.5', () => {
    const result = resolveRadiatorTSink(null, null);
    expect(result.t_sink_k).toBeNull();
    expect(result.source).toBe('unresolved');
  });

  test('eol_override takes priority over degradation fraction — §11.7', () => {
    const eps = resolveEpsilonEol(0.90, 0.80, 0.10);
    expect(eps).toBe(0.80); // override wins
  });

  test('degradation fraction applied when no override — §11.7', () => {
    const eps = resolveEpsilonEol(0.90, null, 0.10);
    expect(eps).toBeCloseTo(0.81, 6); // 0.90 * (1 - 0.10)
  });

  test('no degradation: eol = bol — §11.7', () => {
    const eps = resolveEpsilonEol(0.90, null, null);
    expect(eps).toBe(0.90);
  });
});
