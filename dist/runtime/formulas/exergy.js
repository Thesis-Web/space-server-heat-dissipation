"use strict";
/**
 * Exergy formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.heatExergy = heatExergy;
exports.exergyDestruction = exergyDestruction;
exports.secondLawEfficiency = secondLawEfficiency;
/**
 * Specific exergy of a heat flow at temperature T relative to dead state T0.
 * ex = Q × (1 - T0/T)
 */
function heatExergy(q_w, t_k, t0_k) {
    if (t_k <= 0 || t0_k <= 0)
        throw new Error("Temperatures must be > 0 K");
    return q_w * (1 - t0_k / t_k);
}
/**
 * Exergy destruction for a heat transfer process between T_hot and T_cold.
 * ex_destroyed = Q × T0 × (1/T_cold - 1/T_hot)
 */
function exergyDestruction(q_w, t_hot_k, t_cold_k, t0_k) {
    return q_w * t0_k * (1 / t_cold_k - 1 / t_hot_k);
}
/**
 * Second-law efficiency: actual work output vs maximum possible (Carnot).
 * η_II = W_actual / W_carnot
 */
function secondLawEfficiency(w_actual_w, q_w, t_hot_k, t_cold_k) {
    const carnot = 1 - t_cold_k / t_hot_k;
    const w_carnot = q_w * carnot;
    if (w_carnot <= 0)
        return 0;
    return w_actual_w / w_carnot;
}
//# sourceMappingURL=exergy.js.map