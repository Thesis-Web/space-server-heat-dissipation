/**
 * Loads formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.1–18.4, §8.3, §9.3–9.4
 */
export type LoadState = "idle" | "light" | "medium" | "full" | "custom";
export type DutyMode = "continuous" | "uniform" | "per_subsystem";
export interface DevicePowers {
    power_idle_w: number;
    power_light_w: number;
    power_medium_w: number;
    power_full_w: number;
    custom?: number;
}
/**
 * Resolve device power at a given load state.
 * Spec §8.3: W_dot_devices = device_count × W_dot_device_at_selected_load_state
 */
export declare function devicePowerAtState(powers: DevicePowers, state: LoadState): number;
export interface ComputeModuleLoads {
    device_count: number;
    w_dot_device_at_state_w: number;
    w_dot_memory_w: number;
    w_dot_storage_w: number;
    w_dot_network_w: number;
    w_dot_power_conversion_w: number;
    w_dot_control_w: number;
}
/**
 * Compute module total internal electrical draw.
 * Law per spec §18.2 / §8.3:
 * W_dot_compute_total = device_count × W_dot_device + W_memory + W_storage + W_network + W_conversion + W_control
 */
export declare function computeModuleTotal(m: ComputeModuleLoads): number;
export interface PayloadBlock {
    rf_comms_power_w: number;
    telemetry_power_w: number;
    radar_power_w: number;
    optical_crosslink_power_w: number;
    duty_mode: DutyMode;
    duty_fraction: number;
}
/**
 * Duty factor for a single payload block.
 * Spec §9.3: continuous→1.0, uniform→duty_fraction, per_subsystem→duty_fraction (aggregate compat)
 */
export declare function dutyFactor(block: PayloadBlock): number;
/**
 * Non-compute total for a single payload block.
 * Subsystem sum × duty factor.
 */
export declare function payloadBlockTotal(block: PayloadBlock): number;
/**
 * Aggregate non-compute total across additive payload blocks.
 * Law per spec §18.1 / §9.4:
 * W_dot_non_compute_total = Σ_i [ (W_rf + W_tel + W_radar + W_opt)_i × duty_factor_i ]
 */
export declare function nonComputeTotal(blocks: PayloadBlock[]): number;
/**
 * Aggregate comms-load fields for compatibility transform.
 * Spec §9.3: per-subsystem aggregation using duty_factor.
 */
export declare function aggregateCommsLoad(blocks: PayloadBlock[]): {
    rf_comms_power_w: number;
    telemetry_power_w: number;
    radar_power_w: number;
    optical_crosslink_power_w: number;
};
/**
 * Internal reject total (before branches).
 * Law per spec §18.3:
 * Q_dot_internal = W_compute + W_non_compute + W_conversion_losses + W_control_losses
 */
export declare function internalRejectTotal(w_compute_w: number, w_non_compute_w: number, w_conversion_losses_w: number, w_control_losses_w: number): number;
/**
 * Total reject burden.
 * Law per spec §18.4:
 * Q_dot_total = Q_internal + Q_external + Q_branch_losses - W_exported_equivalent
 */
export declare function totalRejectBurden(q_internal_w: number, q_external_w: number, q_branch_losses_w: number, w_exported_equivalent_w: number): number;
/** Spec-aligned compute-module specification for the scenario runner. */
export interface ComputeModuleSpec {
    device_powers: DevicePowers;
    device_count: number;
    load_state: LoadState;
    memory_power_w: number;
    storage_power_w: number;
    network_power_w: number;
    power_conversion_overhead_w: number;
    control_overhead_w: number;
}
/** Communications/non-compute payload specification for the scenario runner. */
export interface CommsPayloadSpec {
    rf_comms_power_w: number;
    telemetry_power_w: number;
    radar_power_w: number;
    optical_crosslink_power_w: number;
    duty_mode: DutyMode;
    duty_fraction: number;
}
export interface InternalDissipationResult {
    q_dot_internal_w: number;
    w_dot_compute_w: number;
    w_dot_non_compute_w: number;
}
/**
 * Aggregate total internal dissipation from all compute modules and comms payload.
 * Spec §27.5: combines §17.2 and §18.2 results.
 * FIX-001: required by run-scenario.ts (ANCHOR runner).
 */
export declare function aggregateInternalDissipation(compute_modules: ComputeModuleSpec[], comms_payload: CommsPayloadSpec | null, additional_conversion_losses_w: number, additional_control_losses_w: number): InternalDissipationResult;
/** @alias devicePowerAtState — FIX-005 */
export declare const resolveDevicePower: typeof devicePowerAtState;
//# sourceMappingURL=loads.d.ts.map