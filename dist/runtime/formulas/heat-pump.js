"use strict";
/**
 * heat-pump.ts
 * Heat-lift (heat pump) governing equations and Carnot bound enforcement.
 * Governing equations: §12.7, §12.8, §12.9.
 * Validation rules: §29.2, §46 (COP > Carnot prohibited).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCarnotHeatPumpBound = computeCarnotHeatPumpBound;
exports.computeHeatLift = computeHeatLift;
/**
 * COP_heating_carnot = T_hot / (T_hot - T_cold)  §12.8
 */
function computeCarnotHeatPumpBound(input) {
    if (input.t_hot_k <= input.t_cold_k) {
        throw new RangeError(`t_hot_k (${input.t_hot_k} K) must be > t_cold_k (${input.t_cold_k} K)`);
    }
    if (input.t_cold_k <= 0) {
        throw new RangeError(`t_cold_k must be > 0 K. Got ${input.t_cold_k}`);
    }
    const cop = input.t_hot_k / (input.t_hot_k - input.t_cold_k);
    return {
        cop_heating_carnot: cop,
        t_cold_k: input.t_cold_k,
        t_hot_k: input.t_hot_k,
    };
}
/**
 * Heat-lift energy balance. §12.9
 * Q_dot_hot = Q_dot_cold + W_dot_input
 * W_dot_input = Q_dot_cold / (COP_actual - 1)
 *
 * Enforces §29.2 and §46 prohibition: COP_actual must not exceed Carnot bound.
 * Throws RangeError if Carnot violation detected (per §46).
 */
function computeHeatLift(input) {
    if (input.q_dot_cold_w < 0) {
        throw new RangeError(`q_dot_cold_w must be >= 0. Got ${input.q_dot_cold_w}`);
    }
    if (input.cop_heating_actual <= 1) {
        throw new RangeError(`cop_heating_actual must be > 1 for net heat delivery. Got ${input.cop_heating_actual}`);
    }
    if (input.t_hot_delivery_k <= input.t_cold_source_k) {
        throw new RangeError(`t_hot_delivery_k (${input.t_hot_delivery_k} K) must be > t_cold_source_k (${input.t_cold_source_k} K)`);
    }
    const carnot = computeCarnotHeatPumpBound({
        t_cold_k: input.t_cold_source_k,
        t_hot_k: input.t_hot_delivery_k,
    });
    // §46 prohibition — runtime must reject COP > Carnot
    if (input.cop_heating_actual > carnot.cop_heating_carnot) {
        throw new RangeError(`PROHIBITED (§46): cop_heating_actual (${input.cop_heating_actual.toFixed(4)}) ` +
            `exceeds Carnot bound (${carnot.cop_heating_carnot.toFixed(4)}) ` +
            `for T_cold=${input.t_cold_source_k} K, T_hot=${input.t_hot_delivery_k} K`);
    }
    const w_dot_input_w = input.q_dot_cold_w / (input.cop_heating_actual - 1);
    const q_dot_hot_w = input.q_dot_cold_w + w_dot_input_w;
    return {
        w_dot_input_w,
        q_dot_hot_w,
        cop_heating_carnot: carnot.cop_heating_carnot,
        carnot_compliant: true,
        cop_heating_actual: input.cop_heating_actual,
        q_dot_cold_w: input.q_dot_cold_w,
        t_cold_source_k: input.t_cold_source_k,
        t_hot_delivery_k: input.t_hot_delivery_k,
    };
}
//# sourceMappingURL=heat-pump.js.map