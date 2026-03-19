/**
 * radiation.ts
 * Canonical radiator emission formulas.
 * Governing equations: §12.2 (Stefan-Boltzmann), §32.3 (margin).
 * No formula substitution permitted without spec revision per §4.2.
 */

import { SIGMA_W_M2_K4, T_SINK_EFFECTIVE_DEFAULT_K, EPSILON_RAD_DEFAULT, RESERVE_MARGIN_DEFAULT } from '../constants/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadiatorEmissionInput {
  /** Radiator surface temperature (K). Must be > T_sink_effective_k. */
  t_radiator_target_k: number;
  /** Effective radiating area (m²). Must be > 0. */
  a_radiator_effective_m2: number;
  /** Emissivity (dimensionless, 0 < ε ≤ 1). Defaults to EPSILON_RAD_DEFAULT. */
  emissivity?: number;
  /** Effective sink temperature (K). Defaults to T_SINK_EFFECTIVE_DEFAULT_K. */
  t_sink_effective_k?: number;
}

export interface RadiatorEmissionResult {
  /** Radiative heat rejection rate (W). */
  q_dot_rad_w: number;
  /** Inputs echoed for output traceability. */
  t_radiator_target_k: number;
  a_radiator_effective_m2: number;
  emissivity: number;
  t_sink_effective_k: number;
}

export interface RadiatorSizingInput {
  /** Required heat rejection rate (W). Must be > 0. */
  q_dot_required_w: number;
  /** Radiator surface temperature (K). */
  t_radiator_target_k: number;
  /** Emissivity. Defaults to EPSILON_RAD_DEFAULT. */
  emissivity?: number;
  /** Effective sink temperature (K). Defaults to 0. */
  t_sink_effective_k?: number;
  /** Reserve margin fraction. Defaults to RESERVE_MARGIN_DEFAULT. */
  reserve_margin_fraction?: number;
}

export interface RadiatorSizingResult {
  /** Effective area required to meet q_dot_required_w (m²), before margin. */
  a_radiator_effective_m2: number;
  /** Effective area with reserve margin applied (m²). §32.3 */
  a_radiator_with_margin_m2: number;
  reserve_margin_fraction: number;
  emissivity: number;
  t_sink_effective_k: number;
  t_radiator_target_k: number;
  q_dot_required_w: number;
}

// ─── Core emission equation §12.2 ────────────────────────────────────────────

/**
 * Q_dot_rad = epsilon * sigma * A * (T_rad^4 - T_sink^4)
 * §12.2 — no substitution allowed.
 */
export function computeRadiatorEmission(input: RadiatorEmissionInput): RadiatorEmissionResult {
  const emissivity = input.emissivity ?? EPSILON_RAD_DEFAULT;
  const t_sink = input.t_sink_effective_k ?? T_SINK_EFFECTIVE_DEFAULT_K;

  if (emissivity <= 0 || emissivity > 1) {
    throw new RangeError(`emissivity must be in (0, 1]. Got ${emissivity}`);
  }
  if (input.t_radiator_target_k <= 0) {
    throw new RangeError(`t_radiator_target_k must be > 0 K. Got ${input.t_radiator_target_k}`);
  }
  if (input.a_radiator_effective_m2 <= 0) {
    throw new RangeError(`a_radiator_effective_m2 must be > 0. Got ${input.a_radiator_effective_m2}`);
  }
  if (t_sink < 0) {
    throw new RangeError(`t_sink_effective_k must be >= 0. Got ${t_sink}`);
  }

  const q_dot_rad_w =
    emissivity *
    SIGMA_W_M2_K4 *
    input.a_radiator_effective_m2 *
    (Math.pow(input.t_radiator_target_k, 4) - Math.pow(t_sink, 4));

  return {
    q_dot_rad_w,
    t_radiator_target_k: input.t_radiator_target_k,
    a_radiator_effective_m2: input.a_radiator_effective_m2,
    emissivity,
    t_sink_effective_k: t_sink,
  };
}

// ─── Sizing rearrangement §12.2 ───────────────────────────────────────────────

/**
 * A_radiator_effective = Q_dot_rad / (epsilon * sigma * (T_rad^4 - T_sink^4))
 * §12.2 first-order sizing rearrangement.
 * Applies reserve margin per §32.3.
 */
export function computeRadiatorArea(input: RadiatorSizingInput): RadiatorSizingResult {
  const emissivity = input.emissivity ?? EPSILON_RAD_DEFAULT;
  const t_sink = input.t_sink_effective_k ?? T_SINK_EFFECTIVE_DEFAULT_K;
  const margin = input.reserve_margin_fraction ?? RESERVE_MARGIN_DEFAULT;

  if (input.q_dot_required_w <= 0) {
    throw new RangeError(`q_dot_required_w must be > 0. Got ${input.q_dot_required_w}`);
  }
  if (emissivity <= 0 || emissivity > 1) {
    throw new RangeError(`emissivity must be in (0, 1]. Got ${emissivity}`);
  }
  if (input.t_radiator_target_k <= t_sink) {
    throw new RangeError(
      `t_radiator_target_k (${input.t_radiator_target_k} K) must exceed t_sink_effective_k (${t_sink} K)`
    );
  }
  if (margin < 0) {
    throw new RangeError(`reserve_margin_fraction must be >= 0. Got ${margin}`);
  }

  const denominator =
    emissivity * SIGMA_W_M2_K4 * (Math.pow(input.t_radiator_target_k, 4) - Math.pow(t_sink, 4));

  const a_effective = input.q_dot_required_w / denominator;
  const a_with_margin = a_effective * (1 + margin);

  return {
    a_radiator_effective_m2: a_effective,
    a_radiator_with_margin_m2: a_with_margin,
    reserve_margin_fraction: margin,
    emissivity,
    t_sink_effective_k: t_sink,
    t_radiator_target_k: input.t_radiator_target_k,
    q_dot_required_w: input.q_dot_required_w,
  };
}

/**
 * Cross-check: given a user-supplied area, compute achievable rejection
 * and the mismatch against requirement. §22.2.
 */
export function computeAchievedRejection(
  area_m2: number,
  t_radiator_k: number,
  q_dot_required_w: number,
  emissivity?: number,
  t_sink_k?: number
): { achieved_w: number; mismatch_w: number; mismatch_fraction: number } {
  const result = computeRadiatorEmission({
    t_radiator_target_k: t_radiator_k,
    a_radiator_effective_m2: area_m2,
    emissivity,
    t_sink_effective_k: t_sink_k,
  });
  const mismatch = result.q_dot_rad_w - q_dot_required_w;
  return {
    achieved_w: result.q_dot_rad_w,
    mismatch_w: mismatch,
    mismatch_fraction: mismatch / q_dot_required_w,
  };
}
