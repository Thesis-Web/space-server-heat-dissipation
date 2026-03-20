/**
 * Exergy formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */
/**
 * Specific exergy of a heat flow at temperature T relative to dead state T0.
 * ex = Q × (1 - T0/T)
 */
export declare function heatExergy(q_w: number, t_k: number, t0_k: number): number;
/**
 * Exergy destruction for a heat transfer process between T_hot and T_cold.
 * ex_destroyed = Q × T0 × (1/T_cold - 1/T_hot)
 */
export declare function exergyDestruction(q_w: number, t_hot_k: number, t_cold_k: number, t0_k: number): number;
/**
 * Second-law efficiency: actual work output vs maximum possible (Carnot).
 * η_II = W_actual / W_carnot
 */
export declare function secondLawEfficiency(w_actual_w: number, q_w: number, t_hot_k: number, t_cold_k: number): number;
//# sourceMappingURL=exergy.d.ts.map