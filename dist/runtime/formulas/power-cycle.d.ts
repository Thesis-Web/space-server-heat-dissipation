/**
 * Power cycle and heat lift formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.7–18.9
 */
/**
 * Carnot efficiency for a power cycle.
 * Law per spec §18.7: η_carnot = 1 - (T_cold / T_hot)
 */
export declare function carnotEfficiency(t_hot_k: number, t_cold_k: number): number;
/**
 * Carnot COP for a heat pump / heat lift.
 * Law per spec §18.8: COP_heating_carnot = T_hot / (T_hot - T_cold)
 */
export declare function carnotCopHeatLift(t_hot_k: number, t_cold_k: number): number;
export interface CarnotValidationResult {
    valid: boolean;
    carnot_bound: number;
    actual_value: number;
    violation_message?: string;
}
/**
 * Validate power cycle efficiency against Carnot bound.
 * Spec §18.7: require 0 < η_actual <= η_carnot
 */
export declare function validatePowerCycleEfficiency(efficiency_or_cop: number, t_hot_k: number, t_cold_k: number): CarnotValidationResult;
/**
 * Validate heat lift COP against Carnot bound.
 * Spec §18.8: require 1 < COP_actual <= COP_carnot
 */
export declare function validateHeatLiftCop(efficiency_or_cop: number, t_hot_k: number, t_cold_k: number): CarnotValidationResult;
/**
 * No silent uplift check.
 * Spec §18.9: if branch implies T lift or hot-side improvement,
 * at least one of work_input_w, external_heat_input_w, storage_drawdown_w > 0
 * OR research_required = true.
 */
export declare function checkNoSilentUplift(params: {
    mode_label: string;
    work_input_w: number;
    external_heat_input_w: number;
    storage_drawdown_w: number;
    research_required: boolean;
}): {
    compliant: boolean;
    message?: string;
};
export interface CarnotEngineBoundInput {
    t_hot_k: number;
    t_cold_k: number;
}
export interface CarnotEngineBoundResult {
    eta_carnot_engine: number;
    t_hot_k: number;
    t_cold_k: number;
}
/**
 * Carnot engine efficiency bound. η = 1 - T_cold/T_hot.
 * Spec §12.7. FIX-007: object-form adapter for operating-mode.ts.
 */
export declare function computeCarnotEngineBound(input: CarnotEngineBoundInput): CarnotEngineBoundResult;
//# sourceMappingURL=power-cycle.d.ts.map