/**
 * heat-exchanger.ts
 * Heat exchanger duty formulas.
 * Governing equations: §12.11 (ε-NTU model for v0.1.0, UA-LMTD optional).
 */

export interface EpsNtuInput {
  /** Heat exchanger effectiveness [0, 1]. */
  epsilon_hx: number;
  /** Hot-side mass flow (kg/s). */
  m_dot_hot_kg_per_s: number;
  /** Hot-side specific heat (J/kg·K). */
  cp_hot_j_per_kgk: number;
  /** Cold-side mass flow (kg/s). */
  m_dot_cold_kg_per_s: number;
  /** Cold-side specific heat (J/kg·K). */
  cp_cold_j_per_kgk: number;
  /** Hot-side inlet temperature (K). */
  t_hot_in_k: number;
  /** Cold-side inlet temperature (K). */
  t_cold_in_k: number;
}

export interface HxResult {
  /** Actual heat transferred (W). Q_dot_hx = epsilon * Q_dot_hx_max. §12.11 */
  q_dot_hx_w: number;
  /** Maximum possible heat transfer (W). §12.11 */
  q_dot_hx_max_w: number;
  /** Minimum capacity rate (W/K). C_min. §12.11 */
  c_min_w_per_k: number;
  epsilon_hx: number;
  t_hot_in_k: number;
  t_cold_in_k: number;
}

export interface UaLmtdInput {
  /** Overall heat transfer coefficient × area (W/K). */
  ua_hx_w_per_k: number;
  /** Log-mean temperature difference (K). */
  delta_t_lm_k: number;
}

/**
 * Q_dot_hx = epsilon_hx * Q_dot_hx_max
 * Q_dot_hx_max = C_min * (T_hot_in - T_cold_in)
 * C_min = min(m_dot_hot * cp_hot, m_dot_cold * cp_cold)
 * §12.11 — ε-NTU model (default for v0.1.0).
 */
export function computeHxDutyEpsNtu(input: EpsNtuInput): HxResult {
  if (input.epsilon_hx < 0 || input.epsilon_hx > 1) {
    throw new RangeError(`epsilon_hx must be in [0, 1]. Got ${input.epsilon_hx}`);
  }
  if (input.t_hot_in_k <= input.t_cold_in_k) {
    throw new RangeError(
      `t_hot_in_k (${input.t_hot_in_k}) must be > t_cold_in_k (${input.t_cold_in_k})`
    );
  }
  if (input.m_dot_hot_kg_per_s < 0 || input.m_dot_cold_kg_per_s < 0) {
    throw new RangeError('Mass flow rates must be >= 0');
  }
  if (input.cp_hot_j_per_kgk <= 0 || input.cp_cold_j_per_kgk <= 0) {
    throw new RangeError('Specific heat values must be > 0');
  }

  const c_hot = input.m_dot_hot_kg_per_s * input.cp_hot_j_per_kgk;
  const c_cold = input.m_dot_cold_kg_per_s * input.cp_cold_j_per_kgk;
  const c_min = Math.min(c_hot, c_cold);

  const q_max = c_min * (input.t_hot_in_k - input.t_cold_in_k);
  const q_hx = input.epsilon_hx * q_max;

  return {
    q_dot_hx_w: q_hx,
    q_dot_hx_max_w: q_max,
    c_min_w_per_k: c_min,
    epsilon_hx: input.epsilon_hx,
    t_hot_in_k: input.t_hot_in_k,
    t_cold_in_k: input.t_cold_in_k,
  };
}

/**
 * Q_dot_hx = UA_hx * ΔTLM  §12.11 alternate form.
 * Available when UA and LMTD are explicitly provided.
 */
export function computeHxDutyUaLmtd(input: UaLmtdInput): number {
  if (input.ua_hx_w_per_k < 0) {
    throw new RangeError(`ua_hx_w_per_k must be >= 0. Got ${input.ua_hx_w_per_k}`);
  }
  if (input.delta_t_lm_k <= 0) {
    throw new RangeError(`delta_t_lm_k must be > 0. Got ${input.delta_t_lm_k}`);
  }
  return input.ua_hx_w_per_k * input.delta_t_lm_k;
}

/**
 * Log-mean temperature difference for a counter-flow exchanger.
 * Helper — not a named spec equation but algebraically standard.
 */
export function computeLmtdCounterFlow(
  t_hot_in: number,
  t_hot_out: number,
  t_cold_in: number,
  t_cold_out: number
): number {
  const dt1 = t_hot_in - t_cold_out;
  const dt2 = t_hot_out - t_cold_in;
  if (dt1 <= 0 || dt2 <= 0) {
    throw new RangeError('Temperature cross detected — invalid counter-flow configuration');
  }
  if (Math.abs(dt1 - dt2) < 1e-9) {
    return dt1; // degenerate case: ΔT1 ≈ ΔT2
  }
  return (dt1 - dt2) / Math.log(dt1 / dt2);
}
