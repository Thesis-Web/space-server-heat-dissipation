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
export declare function computeHxDutyEpsNtu(input: EpsNtuInput): HxResult;
/**
 * Q_dot_hx = UA_hx * ΔTLM  §12.11 alternate form.
 * Available when UA and LMTD are explicitly provided.
 */
export declare function computeHxDutyUaLmtd(input: UaLmtdInput): number;
/**
 * Log-mean temperature difference for a counter-flow exchanger.
 * Helper — not a named spec equation but algebraically standard.
 */
export declare function computeLmtdCounterFlow(t_hot_in: number, t_hot_out: number, t_cold_in: number, t_cold_out: number): number;
//# sourceMappingURL=heat-exchanger.d.ts.map