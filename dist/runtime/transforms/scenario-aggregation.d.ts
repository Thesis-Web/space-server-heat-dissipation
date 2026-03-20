/**
 * Scenario aggregation transform — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.4, ui-expansion-spec-v0.1.5 §5.3, §20
 *
 * Resolves load state, expands defaults, and normalises the scenario object
 * into a form the runner can execute deterministically.
 */
import { type DevicePowers, type LoadState } from "../formulas/loads";
export interface ScenarioAggregationInput {
    device_powers: DevicePowers;
    device_count: number;
    target_load_state: LoadState;
    w_dot_memory_w: number;
    w_dot_storage_w: number;
    w_dot_network_w: number;
    w_dot_power_conversion_w: number;
    w_dot_control_w: number;
    w_dot_non_compute_total_w: number;
    w_dot_conversion_losses_w: number;
    w_dot_control_losses_w: number;
    q_dot_external_w: number;
    q_dot_branch_losses_w: number;
    w_dot_exported_equivalent_w: number;
}
export interface ScenarioAggregationOutput {
    w_dot_device_at_state_w: number;
    w_dot_devices_total_w: number;
    w_dot_compute_module_w: number;
    q_dot_internal_w: number;
    q_dot_total_reject_w: number;
    transform_trace: string[];
}
/**
 * Aggregate scenario loads per spec §18.2–18.4 and §26.4.
 * All arithmetic is authoritative runtime execution.
 */
export declare function aggregateScenario(input: ScenarioAggregationInput): ScenarioAggregationOutput;
//# sourceMappingURL=scenario-aggregation.d.ts.map