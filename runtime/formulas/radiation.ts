/**
 * Radiation formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.5–18.6, §18.10
 *
 * All formulas are authoritative runtime computations.
 * UI display-only previews are subordinate to these results.
 */

import { STEFAN_BOLTZMANN } from "../constants/constants";

export interface RadiatorSizingInput {
  q_dot_w: number;
  emissivity: number;
  view_factor: number;
  t_radiator_target_k: number;
  t_sink_k: number;
  reserve_margin_fraction: number;
}

export interface RadiatorSizingOutput {
  a_radiator_effective_m2: number;
  a_with_margin_m2: number;
  q_dot_check_w: number;
  sigma: number;
}

/**
 * Compute effective radiator area required to reject q_dot_w.
 * Law: A = Q / (ε × σ × F × (T^4 - T_sink^4))
 * Spec §18.5
 */
export function radiatorEffectiveArea(input: RadiatorSizingInput): RadiatorSizingOutput {
  const { q_dot_w, emissivity, view_factor, t_radiator_target_k, t_sink_k, reserve_margin_fraction } = input;
  const denom = emissivity * STEFAN_BOLTZMANN * view_factor * (Math.pow(t_radiator_target_k, 4) - Math.pow(t_sink_k, 4));
  const a_effective = q_dot_w / denom;
  const a_with_margin = a_effective * (1 + reserve_margin_fraction);
  const q_check = emissivity * STEFAN_BOLTZMANN * view_factor * a_effective * (Math.pow(t_radiator_target_k, 4) - Math.pow(t_sink_k, 4));
  return {
    a_radiator_effective_m2: a_effective,
    a_with_margin_m2: a_with_margin,
    q_dot_check_w: q_check,
    sigma: STEFAN_BOLTZMANN,
  };
}

/**
 * Compute achieved rejection for a known radiator area.
 * Q = ε × σ × F × A × (T^4 - T_sink^4)
 */
export function radiatorAchievedRejection(
  emissivity: number,
  view_factor: number,
  area_m2: number,
  t_radiator_k: number,
  t_sink_k: number
): number {
  return emissivity * STEFAN_BOLTZMANN * view_factor * area_m2 * (Math.pow(t_radiator_k, 4) - Math.pow(t_sink_k, 4));
}

/**
 * Regression anchor verification per ui-expansion-spec-v0.1.5 §18.10.
 * Q=50000 W, ε=0.90, F=1.0, T=1200 K, T_sink=0 K → A = 0.4725 m² (4 decimals)
 */
export function verifyRegressionAnchor(): { pass: boolean; computed: number; expected: number } {
  const result = radiatorEffectiveArea({
    q_dot_w: 50_000,
    emissivity: 0.90,
    view_factor: 1.0,
    t_radiator_target_k: 1200,
    t_sink_k: 0,
    reserve_margin_fraction: 0,
  });
  const computed = Math.round(result.a_radiator_effective_m2 * 10_000) / 10_000;
  return { pass: computed === 0.4725, computed, expected: 0.4725 };
}

// ─── FIX-002: computeRadiatorArea adapter ─────────────────────────────────────
// run-scenario.ts (ANCHOR runner) expects computeRadiatorArea with a different
// input shape than radiatorEffectiveArea. This adapter maps the runner's call
// to the canonical radiatorEffectiveArea function.
// view_factor defaults to 1.0 per spec §40 GEO-only scope.
// FIX-002: required by run-scenario.ts.

export interface RadiatorAreaInput {
  q_dot_required_w: number;
  t_radiator_target_k: number;
  emissivity: number;
  t_sink_effective_k: number;
  reserve_margin_fraction: number;
  view_factor?: number;
}

export interface RadiatorAreaResult {
  a_radiator_effective_m2: number;
  a_radiator_with_margin_m2: number;
}

/**
 * Compute required radiator area for a given rejection requirement.
 * Delegates to radiatorEffectiveArea. view_factor defaults to 1.0 per §40.
 * FIX-002: adapter required by ANCHOR runner (run-scenario.ts).
 */
export function computeRadiatorArea(input: RadiatorAreaInput): RadiatorAreaResult {
  const result = radiatorEffectiveArea({
    q_dot_w: input.q_dot_required_w,
    emissivity: input.emissivity,
    view_factor: input.view_factor ?? 1.0,
    t_radiator_target_k: input.t_radiator_target_k,
    t_sink_k: input.t_sink_effective_k,
    reserve_margin_fraction: input.reserve_margin_fraction,
  });
  return {
    a_radiator_effective_m2: result.a_radiator_effective_m2,
    a_radiator_with_margin_m2: result.a_with_margin_m2,
  };
}
