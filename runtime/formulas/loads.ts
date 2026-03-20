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
export function devicePowerAtState(powers: DevicePowers, state: LoadState): number {
  switch (state) {
    case "idle": return powers.power_idle_w;
    case "light": return powers.power_light_w;
    case "medium": return powers.power_medium_w;
    case "full": return powers.power_full_w;
    case "custom": return powers.custom ?? 0;
  }
}

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
export function computeModuleTotal(m: ComputeModuleLoads): number {
  return (
    m.device_count * m.w_dot_device_at_state_w +
    m.w_dot_memory_w +
    m.w_dot_storage_w +
    m.w_dot_network_w +
    m.w_dot_power_conversion_w +
    m.w_dot_control_w
  );
}

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
export function dutyFactor(block: PayloadBlock): number {
  if (block.duty_mode === "continuous") return 1.0;
  return block.duty_fraction;
}

/**
 * Non-compute total for a single payload block.
 * Subsystem sum × duty factor.
 */
export function payloadBlockTotal(block: PayloadBlock): number {
  const raw = block.rf_comms_power_w + block.telemetry_power_w + block.radar_power_w + block.optical_crosslink_power_w;
  return raw * dutyFactor(block);
}

/**
 * Aggregate non-compute total across additive payload blocks.
 * Law per spec §18.1 / §9.4:
 * W_dot_non_compute_total = Σ_i [ (W_rf + W_tel + W_radar + W_opt)_i × duty_factor_i ]
 */
export function nonComputeTotal(blocks: PayloadBlock[]): number {
  return blocks.reduce((sum, b) => sum + payloadBlockTotal(b), 0);
}

/**
 * Aggregate comms-load fields for compatibility transform.
 * Spec §9.3: per-subsystem aggregation using duty_factor.
 */
export function aggregateCommsLoad(blocks: PayloadBlock[]): {
  rf_comms_power_w: number;
  telemetry_power_w: number;
  radar_power_w: number;
  optical_crosslink_power_w: number;
} {
  return blocks.reduce(
    (acc, b) => {
      const df = dutyFactor(b);
      return {
        rf_comms_power_w: acc.rf_comms_power_w + b.rf_comms_power_w * df,
        telemetry_power_w: acc.telemetry_power_w + b.telemetry_power_w * df,
        radar_power_w: acc.radar_power_w + b.radar_power_w * df,
        optical_crosslink_power_w: acc.optical_crosslink_power_w + b.optical_crosslink_power_w * df,
      };
    },
    { rf_comms_power_w: 0, telemetry_power_w: 0, radar_power_w: 0, optical_crosslink_power_w: 0 }
  );
}

/**
 * Internal reject total (before branches).
 * Law per spec §18.3:
 * Q_dot_internal = W_compute + W_non_compute + W_conversion_losses + W_control_losses
 */
export function internalRejectTotal(
  w_compute_w: number,
  w_non_compute_w: number,
  w_conversion_losses_w: number,
  w_control_losses_w: number
): number {
  return w_compute_w + w_non_compute_w + w_conversion_losses_w + w_control_losses_w;
}

/**
 * Total reject burden.
 * Law per spec §18.4:
 * Q_dot_total = Q_internal + Q_external + Q_branch_losses - W_exported_equivalent
 */
export function totalRejectBurden(
  q_internal_w: number,
  q_external_w: number,
  q_branch_losses_w: number,
  w_exported_equivalent_w: number
): number {
  return q_internal_w + q_external_w + q_branch_losses_w - w_exported_equivalent_w;
}

// ─── FIX-001: Runtime aggregation types and function ─────────────────────────
// run-scenario.ts (ANCHOR runner) expects ComputeModuleSpec, CommsPayloadSpec,
// and aggregateInternalDissipation from this module.
// These are additive and compose existing exports.
// Law basis: spec §17.2, §18.2, §18.3.

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
export function aggregateInternalDissipation(
  compute_modules: ComputeModuleSpec[],
  comms_payload: CommsPayloadSpec | null,
  additional_conversion_losses_w: number,
  additional_control_losses_w: number
): InternalDissipationResult {
  const w_compute = compute_modules.reduce((sum, m) => {
    const w_device = devicePowerAtState(m.device_powers, m.load_state);
    return sum + computeModuleTotal({
      device_count: m.device_count,
      w_dot_device_at_state_w: w_device,
      w_dot_memory_w: m.memory_power_w,
      w_dot_storage_w: m.storage_power_w,
      w_dot_network_w: m.network_power_w,
      w_dot_power_conversion_w: m.power_conversion_overhead_w,
      w_dot_control_w: m.control_overhead_w,
    });
  }, 0);

  const w_non_compute = comms_payload
    ? nonComputeTotal([{
        rf_comms_power_w: comms_payload.rf_comms_power_w,
        telemetry_power_w: comms_payload.telemetry_power_w,
        radar_power_w: comms_payload.radar_power_w,
        optical_crosslink_power_w: comms_payload.optical_crosslink_power_w,
        duty_mode: comms_payload.duty_mode,
        duty_fraction: comms_payload.duty_fraction,
      }])
    : 0;

  const q_internal = internalRejectTotal(
    w_compute, w_non_compute,
    additional_conversion_losses_w, additional_control_losses_w
  );

  return {
    q_dot_internal_w: q_internal,
    w_dot_compute_w: w_compute,
    w_dot_non_compute_w: w_non_compute,
  };
}

// ─── FIX-005: resolveDevicePower alias ───────────────────────────────────────
// load-state-resolver.ts (ANCHOR) imports resolveDevicePower.
// BASE loads.ts exported devicePowerAtState (identical function, different name).
// Adding alias so both names resolve.
/** @alias devicePowerAtState — FIX-005 */
export const resolveDevicePower = devicePowerAtState;
