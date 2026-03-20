/**
 * Heat transport formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */
/**
 * Log-mean temperature difference for a heat exchanger.
 * LMTD = (ΔT1 - ΔT2) / ln(ΔT1/ΔT2)
 */
export declare function lmtd(dt1_k: number, dt2_k: number): number;
/**
 * Required heat exchanger area given Q, U, and LMTD.
 * Q = U × A × LMTD  →  A = Q / (U × LMTD)
 */
export declare function hxArea(q_w: number, u_w_per_m2_k: number, lmtd_k: number): number;
/**
 * Heat transported by a fluid loop: Q = m_dot × cp × ΔT
 */
export declare function loopHeatTransport(mass_flow_kg_per_s: number, cp_j_per_kg_k: number, delta_t_k: number): number;
/**
 * Required mass flow for a given heat load and ΔT.
 * m_dot = Q / (cp × ΔT)
 */
export declare function requiredMassFlow(q_w: number, cp_j_per_kg_k: number, delta_t_k: number): number;
//# sourceMappingURL=heat-transport.d.ts.map