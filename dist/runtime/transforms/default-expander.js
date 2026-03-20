"use strict";
/**
 * default-expander.ts
 * Default expansion transform — injects spec-declared defaults for omitted fields.
 * Governed by §26.4, §40, §4.3.
 * All injected defaults are surfaced as assumptions per §4.3.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandDefaults = expandDefaults;
const constants_1 = require("../constants/constants");
/**
 * Expand defaults for a scenario.
 * Every injected default is recorded as an assumption per §4.3 / §40.
 */
function expandDefaults(overrides) {
    const assumptions = [];
    const epsilon_rad = overrides.epsilon_rad ?? constants_1.EPSILON_RAD_DEFAULT;
    if (overrides.epsilon_rad === undefined) {
        assumptions.push({
            field: 'epsilon_rad',
            value: constants_1.EPSILON_RAD_DEFAULT,
            source: 'default',
            note: 'Default radiator emissivity per §40.',
        });
    }
    // Policy-aware margin
    const policy_margin = overrides.thermal_policy !== undefined
        ? (constants_1.THERMAL_POLICY_MARGINS[overrides.thermal_policy] ?? constants_1.RESERVE_MARGIN_DEFAULT)
        : constants_1.RESERVE_MARGIN_DEFAULT;
    const reserve_margin_fraction = overrides.reserve_margin_fraction ?? policy_margin;
    if (overrides.reserve_margin_fraction === undefined) {
        assumptions.push({
            field: 'reserve_margin_fraction',
            value: reserve_margin_fraction,
            source: 'default',
            note: `Default reserve margin for thermal policy '${overrides.thermal_policy ?? 'nominal'}' per §40 / §33.`,
        });
    }
    const t_sink_effective_k = overrides.t_sink_effective_k ?? constants_1.T_SINK_EFFECTIVE_DEFAULT_K;
    if (overrides.t_sink_effective_k === undefined) {
        assumptions.push({
            field: 't_sink_effective_k',
            value: constants_1.T_SINK_EFFECTIVE_DEFAULT_K,
            source: 'default',
            note: 'Deep-space first-order sizing assumption per §40.',
        });
    }
    const t_ref_k = overrides.t_ref_k ?? constants_1.T_REF_DEFAULT_K;
    if (overrides.t_ref_k === undefined) {
        assumptions.push({
            field: 't_ref_k',
            value: constants_1.T_REF_DEFAULT_K,
            source: 'default',
            note: 'Reference temperature for exergy calculation per §26.1.',
        });
    }
    return { epsilon_rad, reserve_margin_fraction, t_sink_effective_k, t_ref_k, assumptions };
}
//# sourceMappingURL=default-expander.js.map