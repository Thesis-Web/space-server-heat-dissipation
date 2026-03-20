"use strict";
/**
 * Power cycle and heat lift formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.7–18.9
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.carnotEfficiency = carnotEfficiency;
exports.carnotCopHeatLift = carnotCopHeatLift;
exports.validatePowerCycleEfficiency = validatePowerCycleEfficiency;
exports.validateHeatLiftCop = validateHeatLiftCop;
exports.checkNoSilentUplift = checkNoSilentUplift;
exports.computeCarnotEngineBound = computeCarnotEngineBound;
/**
 * Carnot efficiency for a power cycle.
 * Law per spec §18.7: η_carnot = 1 - (T_cold / T_hot)
 */
function carnotEfficiency(t_hot_k, t_cold_k) {
    if (t_hot_k <= 0 || t_cold_k <= 0)
        throw new Error("Temperatures must be > 0 K");
    if (t_hot_k <= t_cold_k)
        throw new Error("T_hot must be > T_cold for power cycle");
    return 1 - t_cold_k / t_hot_k;
}
/**
 * Carnot COP for a heat pump / heat lift.
 * Law per spec §18.8: COP_heating_carnot = T_hot / (T_hot - T_cold)
 */
function carnotCopHeatLift(t_hot_k, t_cold_k) {
    if (t_hot_k <= 0 || t_cold_k <= 0)
        throw new Error("Temperatures must be > 0 K");
    if (t_hot_k <= t_cold_k)
        throw new Error("T_hot must be > T_cold for heat lift");
    return t_hot_k / (t_hot_k - t_cold_k);
}
/**
 * Validate power cycle efficiency against Carnot bound.
 * Spec §18.7: require 0 < η_actual <= η_carnot
 */
function validatePowerCycleEfficiency(efficiency_or_cop, t_hot_k, t_cold_k) {
    const carnot = carnotEfficiency(t_hot_k, t_cold_k);
    if (efficiency_or_cop <= 0 || efficiency_or_cop > carnot) {
        return {
            valid: false,
            carnot_bound: carnot,
            actual_value: efficiency_or_cop,
            violation_message: `η_actual=${efficiency_or_cop.toFixed(4)} violates 0 < η <= η_carnot=${carnot.toFixed(4)}`,
        };
    }
    return { valid: true, carnot_bound: carnot, actual_value: efficiency_or_cop };
}
/**
 * Validate heat lift COP against Carnot bound.
 * Spec §18.8: require 1 < COP_actual <= COP_carnot
 */
function validateHeatLiftCop(efficiency_or_cop, t_hot_k, t_cold_k) {
    const carnot = carnotCopHeatLift(t_hot_k, t_cold_k);
    if (efficiency_or_cop <= 1 || efficiency_or_cop > carnot) {
        return {
            valid: false,
            carnot_bound: carnot,
            actual_value: efficiency_or_cop,
            violation_message: `COP_actual=${efficiency_or_cop.toFixed(4)} violates 1 < COP <= COP_carnot=${carnot.toFixed(4)}`,
        };
    }
    return { valid: true, carnot_bound: carnot, actual_value: efficiency_or_cop };
}
/**
 * No silent uplift check.
 * Spec §18.9: if branch implies T lift or hot-side improvement,
 * at least one of work_input_w, external_heat_input_w, storage_drawdown_w > 0
 * OR research_required = true.
 */
function checkNoSilentUplift(params) {
    const { mode_label, work_input_w, external_heat_input_w, storage_drawdown_w, research_required } = params;
    if (mode_label !== "heat_lift")
        return { compliant: true };
    const hasDeclaredSource = work_input_w > 0 || external_heat_input_w > 0 || storage_drawdown_w > 0 || research_required;
    if (!hasDeclaredSource) {
        return {
            compliant: false,
            message: "heat_lift branch must declare work_input_w, external_heat_input_w, storage_drawdown_w > 0, or research_required=true",
        };
    }
    return { compliant: true };
}
/**
 * Carnot engine efficiency bound. η = 1 - T_cold/T_hot.
 * Spec §12.7. FIX-007: object-form adapter for operating-mode.ts.
 */
function computeCarnotEngineBound(input) {
    const eta = carnotEfficiency(input.t_hot_k, input.t_cold_k);
    return {
        eta_carnot_engine: eta,
        t_hot_k: input.t_hot_k,
        t_cold_k: input.t_cold_k,
    };
}
//# sourceMappingURL=power-cycle.js.map