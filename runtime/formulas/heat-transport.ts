/**
 * heat-transport.ts
 * Single-phase sensible-heat transport equations.
 * Governing equations: §12.4.
 */

export interface HeatTransportInput {
  /** Heat transport rate (W). Q_dot_transport. */
  q_dot_transport_w: number;
  /** Fluid specific heat (J/kg·K). */
  cp_stage_j_per_kgk: number;
  /** Fluid inlet temperature (K). */
  t_in_k: number;
  /** Fluid outlet temperature (K). */
  t_out_k: number;
}

export interface HeatTransportResult {
  /** Required mass flow rate (kg/s). §12.4 */
  m_dot_kg_per_s: number;
  delta_t_k: number;
  q_dot_transport_w: number;
  cp_stage_j_per_kgk: number;
}

export interface MassFlowInput {
  /** Mass flow rate (kg/s). */
  m_dot_kg_per_s: number;
  /** Fluid specific heat (J/kg·K). */
  cp_stage_j_per_kgk: number;
  /** Temperature difference (K). ΔT = T_out - T_in. */
  delta_t_k: number;
}

/**
 * Q_dot_transport = m_dot * cp * (T_out - T_in)  §12.4
 */
export function computeHeatTransportPower(input: MassFlowInput): number {
  if (input.m_dot_kg_per_s < 0) {
    throw new RangeError(`m_dot_kg_per_s must be >= 0. Got ${input.m_dot_kg_per_s}`);
  }
  if (input.cp_stage_j_per_kgk <= 0) {
    throw new RangeError(`cp_stage_j_per_kgk must be > 0. Got ${input.cp_stage_j_per_kgk}`);
  }
  return input.m_dot_kg_per_s * input.cp_stage_j_per_kgk * input.delta_t_k;
}

/**
 * m_dot = Q_dot_transport / (cp * ΔT)  §12.4 rearranged.
 * Computes mass flow required for a given heat transport requirement.
 */
export function computeRequiredMassFlow(input: HeatTransportInput): HeatTransportResult {
  const delta_t = input.t_out_k - input.t_in_k;

  if (input.q_dot_transport_w < 0) {
    throw new RangeError(`q_dot_transport_w must be >= 0. Got ${input.q_dot_transport_w}`);
  }
  if (input.cp_stage_j_per_kgk <= 0) {
    throw new RangeError(`cp_stage_j_per_kgk must be > 0. Got ${input.cp_stage_j_per_kgk}`);
  }
  if (Math.abs(delta_t) < 1e-9) {
    throw new RangeError(
      `T_out (${input.t_out_k} K) and T_in (${input.t_in_k} K) must differ for mass flow calculation`
    );
  }

  const m_dot = input.q_dot_transport_w / (input.cp_stage_j_per_kgk * Math.abs(delta_t));

  return {
    m_dot_kg_per_s: m_dot,
    delta_t_k: delta_t,
    q_dot_transport_w: input.q_dot_transport_w,
    cp_stage_j_per_kgk: input.cp_stage_j_per_kgk,
  };
}
