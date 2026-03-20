/**
 * Scenario aggregation transform — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.4, ui-expansion-spec-v0.1.5 §5.3, §20
 *
 * Resolves load state, expands defaults, and normalises the scenario object
 * into a form the runner can execute deterministically.
 */

import { devicePowerAtState, type DevicePowers, type LoadState } from "../formulas/loads";

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
export function aggregateScenario(input: ScenarioAggregationInput): ScenarioAggregationOutput {
  const trace: string[] = [];

  // load-state resolution — spec §26.4 / §18.2
  const w_dot_device_at_state_w = devicePowerAtState(input.device_powers, input.target_load_state);
  trace.push(`load-state-resolution: load_state=${input.target_load_state} device_power=${w_dot_device_at_state_w} W`);

  const w_dot_devices_total_w = input.device_count * w_dot_device_at_state_w;

  // compute module total — spec §18.2
  const w_dot_compute_module_w =
    w_dot_devices_total_w +
    input.w_dot_memory_w +
    input.w_dot_storage_w +
    input.w_dot_network_w +
    input.w_dot_power_conversion_w +
    input.w_dot_control_w;
  trace.push(`compute-module-total: ${w_dot_compute_module_w} W`);

  // internal reject — spec §18.3
  const q_dot_internal_w =
    w_dot_compute_module_w +
    input.w_dot_non_compute_total_w +
    input.w_dot_conversion_losses_w +
    input.w_dot_control_losses_w;
  trace.push(`internal-reject-total: ${q_dot_internal_w} W`);

  // total reject burden — spec §18.4
  const q_dot_total_reject_w =
    q_dot_internal_w +
    input.q_dot_external_w +
    input.q_dot_branch_losses_w -
    input.w_dot_exported_equivalent_w;
  trace.push(`total-reject-burden: ${q_dot_total_reject_w} W`);

  return {
    w_dot_device_at_state_w,
    w_dot_devices_total_w,
    w_dot_compute_module_w,
    q_dot_internal_w,
    q_dot_total_reject_w,
    transform_trace: trace,
  };
}
