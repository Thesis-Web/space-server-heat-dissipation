/**
 * scenario-aggregator.ts
 * Scenario aggregation transform — assembles system-level thermal balance.
 * Governed by §26.4, §12.1, §27.5, §27.6.
 */
import { Assumption } from '../emitters/json-emitter';
export interface EnvironmentTerms {
    solar_absorbed_w: number;
    earth_reflected_w: number;
    earth_ir_w: number;
    user_margin_w: number;
}
export interface AggregatedBalance {
    /** Q_dot_internal (W) — all on-node electrical draws. §12.1, §27.5 */
    q_dot_internal_w: number;
    /** Q_dot_external (W) — all modeled environmental terms. §12.1, §27.6 */
    q_dot_external_w: number;
    /** W_dot_parasitic (W) — treated as internal dissipation unless explicitly exported. §12.1 */
    w_dot_parasitic_w: number;
    /** Q_dot_branch_losses (W) — conversion losses remaining on-node. §12.1 */
    q_dot_branch_losses_w: number;
    /** W_dot_exported_equivalent (W) — only if a branch removes usable energy. §12.1 */
    w_dot_exported_equivalent_w: number;
    /** Q_dot_total_reject = sum per §12.1 */
    q_dot_total_reject_w: number;
    assumptions: Assumption[];
    notes: string[];
}
/**
 * System energy balance per §12.1:
 * Q_dot_total_reject = Q_dot_internal + Q_dot_external
 *                    + W_dot_parasitic + Q_dot_branch_losses
 *                    - W_dot_exported_equivalent
 */
export declare function aggregateSystemBalance(params: {
    q_dot_internal_w: number;
    env_terms: EnvironmentTerms | null;
    w_dot_parasitic_w: number;
    q_dot_branch_losses_w: number;
    w_dot_exported_equivalent_w: number;
}): AggregatedBalance;
//# sourceMappingURL=scenario-aggregator.d.ts.map