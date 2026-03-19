/**
 * load-state-resolver.ts
 * Load-state resolution transform.
 * Governed by §26.4, §12.12, §27.4.
 */

import { resolveDevicePower, LoadState } from '../formulas/loads';

export interface DeviceLoadPoints {
  power_idle_w: number;
  power_light_w: number;
  power_medium_w: number;
  power_full_w: number;
}

export interface LoadStateResolution {
  resolved_state: LoadState | 'custom';
  device_power_w: number;
  interpolation_rule: string;
  notes: string[];
}

/**
 * Resolve named or custom load state to a device power value.
 * §12.12 piecewise linear interpolation is the v0.1.0 default.
 */
export function resolveLoadState(
  target_load_state: string,
  points: DeviceLoadPoints
): LoadStateResolution {
  const named: LoadState[] = ['idle', 'light', 'medium', 'full'];
  const notes: string[] = [];

  if (named.includes(target_load_state as LoadState)) {
    return {
      resolved_state: target_load_state as LoadState,
      device_power_w: resolveDevicePower(points, target_load_state as LoadState),
      interpolation_rule: 'piecewise_linear',
      notes,
    };
  }

  // Custom — return full as conservative fallback; log assumption §4.3
  notes.push(
    `target_load_state '${target_load_state}' is not a standard named state. ` +
      `Defaulting to full power (${points.power_full_w} W) as conservative upper bound. ` +
      `Operator should provide explicit power_full_w or use a named state.`
  );
  return {
    resolved_state: 'custom',
    device_power_w: points.power_full_w,
    interpolation_rule: 'conservative_default',
    notes,
  };
}
