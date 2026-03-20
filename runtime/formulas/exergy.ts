/**
 * Exergy formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */

/**
 * Specific exergy of a heat flow at temperature T relative to dead state T0.
 * ex = Q × (1 - T0/T)
 */
export function heatExergy(q_w: number, t_k: number, t0_k: number): number {
  if (t_k <= 0 || t0_k <= 0) throw new Error("Temperatures must be > 0 K");
  return q_w * (1 - t0_k / t_k);
}

/**
 * Exergy destruction for a heat transfer process between T_hot and T_cold.
 * ex_destroyed = Q × T0 × (1/T_cold - 1/T_hot)
 */
export function exergyDestruction(q_w: number, t_hot_k: number, t_cold_k: number, t0_k: number): number {
  return q_w * t0_k * (1 / t_cold_k - 1 / t_hot_k);
}

/**
 * Second-law efficiency: actual work output vs maximum possible (Carnot).
 * η_II = W_actual / W_carnot
 */
export function secondLawEfficiency(w_actual_w: number, q_w: number, t_hot_k: number, t_cold_k: number): number {
  const carnot = 1 - t_cold_k / t_hot_k;
  const w_carnot = q_w * carnot;
  if (w_carnot <= 0) return 0;
  return w_actual_w / w_carnot;
}
