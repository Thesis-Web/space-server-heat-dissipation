/**
 * loads.ts
 * Load aggregation and interpolation formulas.
 * Required by §26.2, §12.12, §12.13, §17.2, §18.2.
 * Added per HOLE-002: §26.2 names this module; §43 omitted it. §26.2 governs.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoadState = 'idle' | 'light' | 'medium' | 'full';

export interface DeviceLoadPoints {
  power_idle_w: number;
  power_light_w: number;
  power_medium_w: number;
  power_full_w: number;
}

export interface ComputeModuleSpec {
  device_count: number;
  device_load_points: DeviceLoadPoints;
  memory_power_w: number;
  storage_power_w: number;
  network_power_w: number;
  power_conversion_overhead_w: number;
  control_overhead_w: number;
  target_load_state: LoadState | string;
  /** §17.1 — schema field; passthrough, not used in power computation. */
  redundancy_mode?: string;
  /** §17.1 — schema field; passthrough, not used in power computation. */
  thermal_grouping_label?: string;
}

export interface CommsPayloadSpec {
  rf_comms_power_w: number;
  telemetry_power_w: number;
  radar_power_w: number;
  optical_crosslink_power_w: number;
  duty_cycle_profile:
    | string
    | {
        rf_comms_fraction?: number;
        telemetry_fraction?: number;
        radar_fraction?: number;
        optical_crosslink_fraction?: number;
      };
}

export interface InternalDissipationResult {
  /** W_dot_compute (W) — all compute modules summed. §12.13 */
  w_dot_compute_w: number;
  /** W_dot_non_compute (W) — from communications payload. §12.13 */
  w_dot_non_compute_w: number;
  /** W_dot_conversion_losses (W). §12.13 */
  w_dot_conversion_losses_w: number;
  /** W_dot_control_losses (W). §12.13 */
  w_dot_control_losses_w: number;
  /** Q_dot_internal = sum of all on-node electrical draws. §12.13 */
  q_dot_internal_w: number;
}

// ─── Load-state resolution §12.12 ────────────────────────────────────────────

/**
 * Resolve device power for a named load state.
 * Piecewise linear interpolation is the v0.1.0 default per §12.12.
 */
export function resolveDevicePower(
  points: DeviceLoadPoints,
  load_state: LoadState | string
): number {
  switch (load_state) {
    case 'idle':
      return points.power_idle_w;
    case 'light':
      return points.power_light_w;
    case 'medium':
      return points.power_medium_w;
    case 'full':
      return points.power_full_w;
    default:
      // Custom duty — not a standard named state. Return full as conservative fallback.
      // Caller must handle custom fractions upstream via interpolateLoadFraction.
      return points.power_full_w;
  }
}

/**
 * Piecewise linear interpolation across the four duty points.
 * fraction must be in [0, 1].
 * 0.0 = idle, 0.333 = light, 0.667 = medium, 1.0 = full.
 * §12.12 default interpolation rule.
 */
export function interpolateLoadFraction(
  points: DeviceLoadPoints,
  fraction: number
): number {
  if (fraction < 0 || fraction > 1) {
    throw new RangeError(`Load fraction must be in [0, 1]. Got ${fraction}`);
  }

  const knots = [
    { x: 0.0, y: points.power_idle_w },
    { x: 1 / 3, y: points.power_light_w },
    { x: 2 / 3, y: points.power_medium_w },
    { x: 1.0, y: points.power_full_w },
  ];

  for (let i = 0; i < knots.length - 1; i++) {
    const lo = knots[i];
    const hi = knots[i + 1];
    if (fraction >= lo.x && fraction <= hi.x) {
      const t = (fraction - lo.x) / (hi.x - lo.x);
      return lo.y + t * (hi.y - lo.y);
    }
  }
  return points.power_full_w; // safety clamp
}

// ─── Compute module power §17.2 ──────────────────────────────────────────────

/**
 * W_dot_compute_module = device_count * W_dot_device_selected_load
 *   + memory_power_w + storage_power_w + network_power_w
 *   + power_conversion_overhead_w + control_overhead_w
 * §17.2
 */
export function computeModulePower(spec: ComputeModuleSpec): number {
  if (spec.device_count < 1) {
    throw new RangeError(`device_count must be >= 1. Got ${spec.device_count}`);
  }
  const device_power = resolveDevicePower(spec.device_load_points, spec.target_load_state);
  return (
    spec.device_count * device_power +
    spec.memory_power_w +
    spec.storage_power_w +
    spec.network_power_w +
    spec.power_conversion_overhead_w +
    spec.control_overhead_w
  );
}

// ─── Non-compute load §18.2 ──────────────────────────────────────────────────

/**
 * W_dot_non_compute = rf_comms + telemetry + radar + optical_crosslink
 * with duty-cycle fractions applied if present. §18.2
 */
export function computeNonComputePower(spec: CommsPayloadSpec): number {
  let rf_fraction = 1.0;
  let tel_fraction = 1.0;
  let radar_fraction = 1.0;
  let optical_fraction = 1.0;

  if (typeof spec.duty_cycle_profile === 'object') {
    rf_fraction = spec.duty_cycle_profile.rf_comms_fraction ?? 1.0;
    tel_fraction = spec.duty_cycle_profile.telemetry_fraction ?? 1.0;
    radar_fraction = spec.duty_cycle_profile.radar_fraction ?? 1.0;
    optical_fraction = spec.duty_cycle_profile.optical_crosslink_fraction ?? 1.0;
  }
  // named string profile → treat as full duty (operator resolves externally)

  return (
    spec.rf_comms_power_w * rf_fraction +
    spec.telemetry_power_w * tel_fraction +
    spec.radar_power_w * radar_fraction +
    spec.optical_crosslink_power_w * optical_fraction
  );
}

// ─── Total internal dissipation §12.13 ───────────────────────────────────────

/**
 * Q_dot_internal = W_dot_compute + W_dot_non_compute
 *                + W_dot_conversion_losses + W_dot_control_losses
 * §12.13 — any electrical draw remaining on-node is thermalized on-node.
 */
export function aggregateInternalDissipation(
  compute_modules: ComputeModuleSpec[],
  comms_payload: CommsPayloadSpec | null,
  additional_conversion_losses_w = 0,
  additional_control_losses_w = 0
): InternalDissipationResult {
  const w_compute = compute_modules.reduce(
    (sum, m) => sum + computeModulePower(m),
    0
  );
  const w_non_compute = comms_payload ? computeNonComputePower(comms_payload) : 0;
  const q_internal =
    w_compute +
    w_non_compute +
    additional_conversion_losses_w +
    additional_control_losses_w;

  return {
    w_dot_compute_w: w_compute,
    w_dot_non_compute_w: w_non_compute,
    w_dot_conversion_losses_w: additional_conversion_losses_w,
    w_dot_control_losses_w: additional_control_losses_w,
    q_dot_internal_w: q_internal,
  };
}
