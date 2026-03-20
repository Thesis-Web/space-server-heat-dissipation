/**
 * heat-pump.ts
 * Heat-lift (heat pump) governing equations and Carnot bound enforcement.
 * Governing equations: §12.7, §12.8, §12.9.
 * Validation rules: §29.2, §46 (COP > Carnot prohibited).
 */
export interface CarnotHeatPumpInput {
    /** Cold-side source temperature (K). */
    t_cold_k: number;
    /** Hot-side delivery temperature (K). Must be > t_cold_k. */
    t_hot_k: number;
}
export interface CarnotHeatPumpResult {
    /** COP_heating_carnot = T_hot / (T_hot - T_cold). §12.8 */
    cop_heating_carnot: number;
    t_cold_k: number;
    t_hot_k: number;
}
export interface HeatLiftInput {
    /** Cold-side heat removal rate (W). Q_dot_cold. */
    q_dot_cold_w: number;
    /** Actual heating COP declared by scenario. Must not exceed Carnot bound. */
    cop_heating_actual: number;
    /** Cold-side temperature (K) for Carnot bound check. */
    t_cold_source_k: number;
    /** Hot-side delivery temperature (K) for Carnot bound check. */
    t_hot_delivery_k: number;
}
export interface HeatLiftResult {
    /** Work input rate (W). W_dot_input = Q_dot_cold / (COP - 1). §12.9 */
    w_dot_input_w: number;
    /** Hot-side heat delivery rate (W). Q_dot_hot = Q_dot_cold + W_dot_input. §12.9 */
    q_dot_hot_w: number;
    /** Carnot bound for reference. */
    cop_heating_carnot: number;
    /** Whether declared COP obeys Carnot bound. */
    carnot_compliant: boolean;
    cop_heating_actual: number;
    q_dot_cold_w: number;
    t_cold_source_k: number;
    t_hot_delivery_k: number;
}
/**
 * COP_heating_carnot = T_hot / (T_hot - T_cold)  §12.8
 */
export declare function computeCarnotHeatPumpBound(input: CarnotHeatPumpInput): CarnotHeatPumpResult;
/**
 * Heat-lift energy balance. §12.9
 * Q_dot_hot = Q_dot_cold + W_dot_input
 * W_dot_input = Q_dot_cold / (COP_actual - 1)
 *
 * Enforces §29.2 and §46 prohibition: COP_actual must not exceed Carnot bound.
 * Throws RangeError if Carnot violation detected (per §46).
 */
export declare function computeHeatLift(input: HeatLiftInput): HeatLiftResult;
//# sourceMappingURL=heat-pump.d.ts.map