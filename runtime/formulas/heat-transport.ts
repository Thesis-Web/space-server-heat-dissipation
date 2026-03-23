/**
 * Heat transport formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */

/**
 * Log-mean temperature difference for a heat exchanger.
 * LMTD = (ΔT1 - ΔT2) / ln(ΔT1/ΔT2)
 */
export function lmtd(dt1_k: number, dt2_k: number): number {
  if (dt1_k <= 0 || dt2_k <= 0) throw new Error("Temperature differences must be > 0");
  if (Math.abs(dt1_k - dt2_k) < 1e-9) return dt1_k;
  return (dt1_k - dt2_k) / Math.log(dt1_k / dt2_k);
}

/**
 * Required heat exchanger area given Q, U, and LMTD.
 * Q = U × A × LMTD  →  A = Q / (U × LMTD)
 */
export function hxArea(q_w: number, u_w_per_m2_k: number, lmtd_k: number): number {
  if (u_w_per_m2_k <= 0 || lmtd_k <= 0) throw new Error("U and LMTD must be > 0");
  return q_w / (u_w_per_m2_k * lmtd_k);
}

/**
 * Heat transported by a fluid loop: Q = m_dot × cp × ΔT
 */
export function loopHeatTransport(
  mass_flow_kg_per_s: number,
  cp_j_per_kg_k: number,
  delta_t_k: number
): number {
  return mass_flow_kg_per_s * cp_j_per_kg_k * delta_t_k;
}

/**
 * Required mass flow for a given heat load and ΔT.
 * m_dot = Q / (cp × ΔT)
 */
export function requiredMassFlow(q_w: number, cp_j_per_kg_k: number, delta_t_k: number): number {
  if (cp_j_per_kg_k <= 0 || delta_t_k <= 0) throw new Error("cp and ΔT must be > 0");
  return q_w / (cp_j_per_kg_k * delta_t_k);
}

// =============================================================================
// Extension 3B pump work equations
// Governing law: 3B-spec §11.2, §11.3, §6.2 (numeric ownership rule)
// Blueprint: 3B-blueprint §5.3 (numeric ownership law)
// Primitive pump-power ownership belongs to transport_implementation only.
// These are canonical named equations exposed for reuse by the 3B runner.
// =============================================================================

/**
 * pumpWorkDirectPower
 * 3B-spec §11.2: direct-power pump parasitic.
 * Primitive numeric owner: transport_implementation.pump_power_input_w.
 */
export function pumpWorkDirectPower(pumpPowerInputW: number): number {
  if (pumpPowerInputW < 0) throw new Error('pump_power_input_w must be >= 0');
  return pumpPowerInputW;
}

/**
 * pumpWorkPressureDropFlow
 * 3B-spec §11.3: pressure-drop / flow pump parasitic.
 * w_dot = (dP * m_dot / rho) / eta_pump
 * Primitive owner set: pressure_drop_pa, mass_flow_kg_per_s, pump_efficiency_fraction, density.
 */
export function pumpWorkPressureDropFlow(
  pressureDropPa: number,
  massFlowKgPerS: number,
  densityKgPerM3: number,
  pumpEfficiencyFraction: number
): number {
  if (densityKgPerM3 <= 0) throw new Error('density must be > 0');
  if (pumpEfficiencyFraction <= 0 || pumpEfficiencyFraction > 1) {
    throw new Error('pump_efficiency_fraction must be in (0, 1]');
  }
  if (pressureDropPa < 0) throw new Error('pressure_drop_pa must be >= 0');
  if (massFlowKgPerS < 0) throw new Error('mass_flow_kg_per_s must be >= 0');

  const vDot = massFlowKgPerS / densityKgPerM3;
  const wIdeal = pressureDropPa * vDot;
  return wIdeal / pumpEfficiencyFraction;
}

/**
 * totalTransportParasiticHeat
 * 3B-spec §11.7: sum all on-node pump parasitic contributions.
 * Used by the 3B runner for reject bookkeeping.
 */
export function totalTransportParasiticHeat(parasiticsW: number[]): number {
  return parasiticsW.reduce((acc, w) => acc + Math.max(0, w), 0);
}
