"use strict";
/**
 * load-state-resolver.ts
 * Load-state resolution transform.
 * Governed by §26.4, §12.12, §27.4.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveLoadState = resolveLoadState;
const loads_1 = require("../formulas/loads");
/**
 * Resolve named or custom load state to a device power value.
 * §12.12 piecewise linear interpolation is the v0.1.0 default.
 */
function resolveLoadState(target_load_state, points) {
    const named = ['idle', 'light', 'medium', 'full'];
    const notes = [];
    if (named.includes(target_load_state)) {
        return {
            resolved_state: target_load_state,
            device_power_w: (0, loads_1.resolveDevicePower)(points, target_load_state),
            interpolation_rule: 'piecewise_linear',
            notes,
        };
    }
    // Custom — return full as conservative fallback; log assumption §4.3
    notes.push(`target_load_state '${target_load_state}' is not a standard named state. ` +
        `Defaulting to full power (${points.power_full_w} W) as conservative upper bound. ` +
        `Operator should provide explicit power_full_w or use a named state.`);
    return {
        resolved_state: 'custom',
        device_power_w: points.power_full_w,
        interpolation_rule: 'conservative_default',
        notes,
    };
}
//# sourceMappingURL=load-state-resolver.js.map