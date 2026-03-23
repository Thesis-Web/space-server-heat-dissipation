/**
 * resistance-chain.ts
 * Junction-to-sink thermal resistance chain math for Extension 3A.
 * Governing law: 3A-spec §11.2–§11.3, §6.5, §8.4.
 *
 * All equations per spec §11.3. No equation references an undeclared variable. §3.7.
 */
export interface ResistanceChainInput {
    /** From zone.resistance_chain sub-object. Null treated as 0. §11.3 */
    r_junction_to_case_k_per_w: number | null;
    r_case_to_spreader_k_per_w: number | null;
    /** Nominal value before geometry multiplier. §11.3, §8.4 */
    r_spreader_to_pickup_nominal_k_per_w: number | null;
    r_pickup_to_loop_k_per_w: number | null;
    r_loop_to_sink_k_per_w: number | null;
    /** From pickup-geometry catalog. §8.4. Default 1.0 when no ref. */
    nominal_resistance_multiplier: number;
    /** bridge_resistance_k_per_w when isolation_boundary=true, else 0. §11.3 */
    bridge_resistance_k_per_w_if_isolated: number;
}
export interface ResistanceChainResult {
    r_spreader_to_pickup_effective_k_per_w: number;
    r_bridge_adjustment_k_per_w: number;
    r_total_k_per_w: number;
    /** Implied junction temperature at declared load. §11.3 */
    t_junction_k: number | null;
    /** Heat flow through chain at declared load. §11.3 */
    q_dot_chain_w: number | null;
    /** Term breakdown for defaults audit and output contract §14.1 */
    term_breakdown: {
        r_junction_to_case: number;
        r_case_to_spreader: number;
        r_spreader_to_pickup_nominal: number;
        r_spreader_to_pickup_effective: number;
        r_pickup_to_loop: number;
        r_loop_to_sink: number;
        r_bridge_adjustment: number;
    };
}
/**
 * Compute total thermal resistance and derived heat-flow metrics.
 * Spec §11.3 equations implemented exactly.
 * Null resistance chain terms treated as zero per §11.3.
 *
 * @param input  - declared resistance fields + pickup multiplier
 * @param q_dot_load_w  - declared internal load (W) for T_junction and Q_chain calc; null = skip
 * @param t_sink_k - resolved background sink temperature (K); null = skip derived temps
 */
export declare function computeResistanceChain(input: ResistanceChainInput, q_dot_load_w?: number | null, t_sink_k?: number | null): ResistanceChainResult;
/**
 * Compute heat transfer across an isolation boundary bridge.
 * §11.2 equation: Q_dot_bridge = (T_upstream - T_downstream) / R_bridge
 */
export declare function computeBridgeHeatTransfer(t_upstream_k: number, t_downstream_k: number, r_bridge_k_per_w: number): number;
/**
 * Compute resistance chain totals for all zones in the topology.
 * Returns map of zone_id → R_total and breakdown per §14.1.
 */
export declare function computeZoneResistanceTotals(zones: Array<{
    zone_id: string;
    resistance_chain?: Record<string, number | null> | null;
    pickup_geometry_ref?: string | null;
    isolation_boundary?: boolean;
    bridge_resistance_k_per_w?: number | null;
}>, pickupMultiplierMap: Map<string, number>): Map<string, ResistanceChainResult>;
//# sourceMappingURL=resistance-chain.d.ts.map