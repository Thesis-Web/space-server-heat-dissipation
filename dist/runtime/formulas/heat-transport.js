"use strict";
/**
 * Heat transport formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.lmtd = lmtd;
exports.hxArea = hxArea;
exports.loopHeatTransport = loopHeatTransport;
exports.requiredMassFlow = requiredMassFlow;
/**
 * Log-mean temperature difference for a heat exchanger.
 * LMTD = (ΔT1 - ΔT2) / ln(ΔT1/ΔT2)
 */
function lmtd(dt1_k, dt2_k) {
    if (dt1_k <= 0 || dt2_k <= 0)
        throw new Error("Temperature differences must be > 0");
    if (Math.abs(dt1_k - dt2_k) < 1e-9)
        return dt1_k;
    return (dt1_k - dt2_k) / Math.log(dt1_k / dt2_k);
}
/**
 * Required heat exchanger area given Q, U, and LMTD.
 * Q = U × A × LMTD  →  A = Q / (U × LMTD)
 */
function hxArea(q_w, u_w_per_m2_k, lmtd_k) {
    if (u_w_per_m2_k <= 0 || lmtd_k <= 0)
        throw new Error("U and LMTD must be > 0");
    return q_w / (u_w_per_m2_k * lmtd_k);
}
/**
 * Heat transported by a fluid loop: Q = m_dot × cp × ΔT
 */
function loopHeatTransport(mass_flow_kg_per_s, cp_j_per_kg_k, delta_t_k) {
    return mass_flow_kg_per_s * cp_j_per_kg_k * delta_t_k;
}
/**
 * Required mass flow for a given heat load and ΔT.
 * m_dot = Q / (cp × ΔT)
 */
function requiredMassFlow(q_w, cp_j_per_kg_k, delta_t_k) {
    if (cp_j_per_kg_k <= 0 || delta_t_k <= 0)
        throw new Error("cp and ΔT must be > 0");
    return q_w / (cp_j_per_kg_k * delta_t_k);
}
//# sourceMappingURL=heat-transport.js.map