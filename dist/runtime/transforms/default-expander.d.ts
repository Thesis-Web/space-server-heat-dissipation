/**
 * default-expander.ts
 * Default expansion transform — injects spec-declared defaults for omitted fields.
 * Governed by §26.4, §40, §4.3.
 * All injected defaults are surfaced as assumptions per §4.3.
 */
import { Assumption } from '../emitters/json-emitter';
export interface ExpandedDefaults {
    epsilon_rad: number;
    reserve_margin_fraction: number;
    t_sink_effective_k: number;
    t_ref_k: number;
    assumptions: Assumption[];
}
/**
 * Expand defaults for a scenario.
 * Every injected default is recorded as an assumption per §4.3 / §40.
 */
export declare function expandDefaults(overrides: {
    epsilon_rad?: number;
    reserve_margin_fraction?: number;
    t_sink_effective_k?: number;
    t_ref_k?: number;
    thermal_policy?: string;
}): ExpandedDefaults;
//# sourceMappingURL=default-expander.d.ts.map