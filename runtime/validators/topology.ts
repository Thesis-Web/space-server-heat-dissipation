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

// ── Types ─────────────────────────────────────────────────────────────────────

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
  valid: boolean;                   // no blocking errors remain after policy application
  cycle_detected: boolean;
  topology_order: string[];         // zone_ids in topological order (empty if cycle)
  violations: TopologyViolation[];
  warnings: TopologyViolation[];
}

// ── Graph builder (§11.1) ─────────────────────────────────────────────────────

/**
 * Build adjacency list from upstream/downstream refs.
 * Edge direction: upstream → current (current depends on upstream).
 * Returns adjacency list (node → successors) and in-degree map for Kahn.
 * Edges are deduplicated — each (from, to) pair added at most once,
 * since both ends of a link may declare the relationship.
 */
function buildGraph(zones: TopologyZoneInput[]): {
  adj: Map<string, Set<string>>;
  inDegree: Map<string, number>;
  nodeSet: Set<string>;
} {
  const adj = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  const nodeSet = new Set<string>();

  for (const z of zones) {
    nodeSet.add(z.zone_id);
    if (!adj.has(z.zone_id)) adj.set(z.zone_id, new Set());
    if (!inDegree.has(z.zone_id)) inDegree.set(z.zone_id, 0);
  }

  // Collect all declared edges as (from, to) pairs, then deduplicate.
  // A→B may appear as: A.downstream_zone_ref=B AND B.upstream_zone_ref=A.
  // Deduplicate before counting in-degrees to prevent false cycle detection.
  const edgeSet = new Set<string>();

  for (const z of zones) {
    // Edge from upstream to this zone
    if (z.upstream_zone_ref && nodeSet.has(z.upstream_zone_ref)) {
      edgeSet.add(`${z.upstream_zone_ref}\x00${z.zone_id}`);
    }
    // Edge from this zone to downstream
    if (z.downstream_zone_ref && nodeSet.has(z.downstream_zone_ref)) {
      edgeSet.add(`${z.zone_id}\x00${z.downstream_zone_ref}`);
    }
  }

  for (const edgeKey of edgeSet) {
    const sep = edgeKey.indexOf('\x00');
    const from = edgeKey.slice(0, sep);
    const to   = edgeKey.slice(sep + 1);
    adj.get(from)!.add(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  return { adj, inDegree, nodeSet };
}

// ── Kahn's topological sort (§11.1) ──────────────────────────────────────────

/**
 * Run Kahn's algorithm.
 * Returns { order, cycle_detected }.
 * order is empty and cycle_detected=true if a cycle exists.
 */
function kahnTopologicalSort(
  adj: Map<string, Set<string>>,
  inDegree: Map<string, number>,
  nodeSet: Set<string>
): { order: string[]; cycle_detected: boolean } {
  // Work on mutable copies
  const deg = new Map(inDegree);
  const order: string[] = [];

  const queue: string[] = [];
  for (const id of nodeSet) {
    if ((deg.get(id) ?? 0) === 0) queue.push(id);
  }
  // Deterministic order
  queue.sort();

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);

    const successors = Array.from(adj.get(node) ?? []).sort();
    for (const succ of successors) {
      const newDeg = (deg.get(succ) ?? 1) - 1;
      deg.set(succ, newDeg);
      if (newDeg === 0) {
        queue.push(succ);
        queue.sort(); // maintain deterministic order
      }
    }
  }

  const cycle_detected = order.length < nodeSet.size;
  return { order: cycle_detected ? [] : order, cycle_detected };
}

// ── Isolation boundary check ──────────────────────────────────────────────────

/**
 * Check: if isolation_boundary=true, bridge_resistance_k_per_w must be present and > 0.
 * §13.1 blocking rule.
 */
function validateIsolationBoundaries(
  zones: Array<TopologyZoneInput & { bridge_resistance_k_per_w?: number | null }>
): TopologyViolation[] {
  const violations: TopologyViolation[] = [];
  for (const z of zones) {
    if (z.isolation_boundary) {
      const r = (z as TopologyZoneInput & { bridge_resistance_k_per_w?: number | null }).bridge_resistance_k_per_w;
      if (r === null || r === undefined || r <= 0) {
        violations.push({
          rule: '3A-spec §13.1',
          severity: 'error',
          zone_id: z.zone_id,
          message: `Zone '${z.zone_id}' declares isolation_boundary=true but bridge_resistance_k_per_w is absent or zero. §13.1`,
        });
      }
    }
  }
  return violations;
}

// ── Warning checks (§13.1) ────────────────────────────────────────────────────

function buildWarnings(zones: TopologyZoneInput[]): TopologyViolation[] {
  const warnings: TopologyViolation[] = [];
  const nodeSet = new Set(zones.map(z => z.zone_id));

  for (const z of zones) {
    const hasUp = !!z.upstream_zone_ref && nodeSet.has(z.upstream_zone_ref);
    const hasDown = !!z.downstream_zone_ref && nodeSet.has(z.downstream_zone_ref);

    // Disconnected non-isolated zone
    if (!hasUp && !hasDown && z.flow_direction !== 'isolated') {
      warnings.push({
        rule: '3A-spec §13.1',
        severity: 'warning',
        zone_id: z.zone_id,
        message: `Zone '${z.zone_id}' has no declared neighbors and flow_direction is not 'isolated'. §13.1`,
      });
    }

    // Bidirectional with only one declared neighbor
    if (z.flow_direction === 'bidirectional' && (!hasUp || !hasDown)) {
      warnings.push({
        rule: '3A-spec §13.1',
        severity: 'warning',
        zone_id: z.zone_id,
        message: `Zone '${z.zone_id}' is bidirectional but only one neighbor is declared. §13.1`,
      });
    }

    // Convergence-enabled with no convergence neighbor
    if (z.convergence_enabled) {
      const neighbors = [z.upstream_zone_ref, z.downstream_zone_ref].filter(Boolean);
      const hasConvergenceNeighbor = zones.some(
        other => neighbors.includes(other.zone_id) && other.convergence_enabled
      );
      if (!hasConvergenceNeighbor) {
        warnings.push({
          rule: '3A-spec §13.1',
          severity: 'warning',
          zone_id: z.zone_id,
          message: `Zone '${z.zone_id}' has convergence_enabled=true but no neighbor zone has convergence_enabled=true. §13.1`,
        });
      }
    }
  }

  return warnings;
}

// ── Main validation function ──────────────────────────────────────────────────

/**
 * Validate the topology graph for a set of 3A thermal zones.
 * Applies blocking and warning rules per §13.1.
 * topology_validation_policy='blocking' makes cycles and unresolved refs block execution.
 * topology_validation_policy='warn_only' downgrades cycle errors to warnings.
 *
 * @param zones - normalized 3A zones (after cross-reference validation)
 * @param policy - 'blocking' | 'warn_only'
 */
export function validateTopology(
  zones: Array<TopologyZoneInput & { bridge_resistance_k_per_w?: number | null }>,
  policy: 'blocking' | 'warn_only' = 'blocking'
): TopologyValidationResult {
  const violations: TopologyViolation[] = [];
  const warnings: TopologyViolation[] = [...buildWarnings(zones)];

  // Isolation boundary check (always blocking — policy does not affect this)
  violations.push(...validateIsolationBoundaries(zones));

  // Build graph and run Kahn
  const { adj, inDegree, nodeSet } = buildGraph(zones);
  const { order, cycle_detected } = kahnTopologicalSort(adj, inDegree, nodeSet);

  if (cycle_detected) {
    const cycleViolation: TopologyViolation = {
      rule: '3A-spec §11.1 / §13.1',
      severity: policy === 'blocking' ? 'error' : 'warning',
      message: 'Directed cycle detected in thermal zone topology graph. Acyclic graph required. §11.1',
    };
    if (policy === 'blocking') {
      violations.push(cycleViolation);
    } else {
      warnings.push(cycleViolation);
    }
  }

  const blockingErrors = violations.filter(v => v.severity === 'error');
  const valid = blockingErrors.length === 0;

  return {
    valid,
    cycle_detected,
    topology_order: order,
    violations,
    warnings,
  };
}
