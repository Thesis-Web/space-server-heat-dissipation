"use strict";
/**
 * heat-exchanger.ts
 * Heat exchanger duty formulas.
 * Governing equations: §12.11 (ε-NTU model for v0.1.0, UA-LMTD optional).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeHxDutyEpsNtu = computeHxDutyEpsNtu;
exports.computeHxDutyUaLmtd = computeHxDutyUaLmtd;
exports.computeLmtdCounterFlow = computeLmtdCounterFlow;
/**
 * Q_dot_hx = epsilon_hx * Q_dot_hx_max
 * Q_dot_hx_max = C_min * (T_hot_in - T_cold_in)
 * C_min = min(m_dot_hot * cp_hot, m_dot_cold * cp_cold)
 * §12.11 — ε-NTU model (default for v0.1.0).
 */
function computeHxDutyEpsNtu(input) {
    if (input.epsilon_hx < 0 || input.epsilon_hx > 1) {
        throw new RangeError(`epsilon_hx must be in [0, 1]. Got ${input.epsilon_hx}`);
    }
    if (input.t_hot_in_k <= input.t_cold_in_k) {
        throw new RangeError(`t_hot_in_k (${input.t_hot_in_k}) must be > t_cold_in_k (${input.t_cold_in_k})`);
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
function computeHxDutyUaLmtd(input) {
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
function computeLmtdCounterFlow(t_hot_in, t_hot_out, t_cold_in, t_cold_out) {
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
//# sourceMappingURL=heat-exchanger.js.map