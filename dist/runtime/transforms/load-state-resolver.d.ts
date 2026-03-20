/**
 * load-state-resolver.ts
 * Load-state resolution transform.
 * Governed by §26.4, §12.12, §27.4.
 */
import { LoadState } from '../formulas/loads';
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
export declare function resolveLoadState(target_load_state: string, points: DeviceLoadPoints): LoadStateResolution;
//# sourceMappingURL=load-state-resolver.d.ts.map