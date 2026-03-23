/**
 * topology.ts
 * Topology graph validation for Extension 3A.
 * Governing law: 3A-spec §11.1, §13.1.
 *
 * Implements:
 *  - directed graph construction from upstream/downstream zone refs (§11.1)
 *  - acyclic validation via Kahn's topological sort (§11.1)
 *  - DFS cycle detection as secondary confirmation
 *  - blocking vs warn-only policy enforcement (§13.1)
 *  - warning-level checks: disconnected zones, bidirectional with single neighbor,
 *    convergence-enabled zone with no convergence neighbor
 */
export interface TopologyZoneInput {
    zone_id: string;
    upstream_zone_ref?: string | null;
    downstream_zone_ref?: string | null;
    flow_direction?: string | null;
    isolation_boundary?: boolean;
    convergence_enabled?: boolean;
}
export interface TopologyViolation {
    rule: string;
    severity: 'error' | 'warning';
    zone_id?: string;
    message: string;
}
export interface TopologyValidationResult {
    valid: boolean;
    cycle_detected: boolean;
    topology_order: string[];
    violations: TopologyViolation[];
    warnings: TopologyViolation[];
}
/**
 * Validate the topology graph for a set of 3A thermal zones.
 * Applies blocking and warning rules per §13.1.
 * topology_validation_policy='blocking' makes cycles and unresolved refs block execution.
 * topology_validation_policy='warn_only' downgrades cycle errors to warnings.
 *
 * @param zones - normalized 3A zones (after cross-reference validation)
 * @param policy - 'blocking' | 'warn_only'
 */
export declare function validateTopology(zones: Array<TopologyZoneInput & {
    bridge_resistance_k_per_w?: number | null;
}>, policy?: 'blocking' | 'warn_only'): TopologyValidationResult;
//# sourceMappingURL=topology.d.ts.map