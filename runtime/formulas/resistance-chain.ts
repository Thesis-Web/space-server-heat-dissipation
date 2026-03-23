/**
 * resistance-chain.ts
 * Junction-to-sink thermal resistance chain math for Extension 3A.
 * Governing law: 3A-spec §11.2–§11.3, §6.5, §8.4.
 *
 * All equations per spec §11.3. No equation references an undeclared variable. §3.7.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Core chain computation (§11.3) ────────────────────────────────────────────

/**
 * Compute total thermal resistance and derived heat-flow metrics.
 * Spec §11.3 equations implemented exactly.
 * Null resistance chain terms treated as zero per §11.3.
 *
 * @param input  - declared resistance fields + pickup multiplier
 * @param q_dot_load_w  - declared internal load (W) for T_junction and Q_chain calc; null = skip
 * @param t_sink_k - resolved background sink temperature (K); null = skip derived temps
 */
export function computeResistanceChain(
  input: ResistanceChainInput,
  q_dot_load_w: number | null = null,
  t_sink_k: number | null = null
): ResistanceChainResult {
  // §11.3: null terms treated as zero
  const r_jc  = input.r_junction_to_case_k_per_w   ?? 0;
  const r_cs  = input.r_case_to_spreader_k_per_w    ?? 0;
  const r_spn = input.r_spreader_to_pickup_nominal_k_per_w ?? 0;
  const r_pl  = input.r_pickup_to_loop_k_per_w      ?? 0;
  const r_ls  = input.r_loop_to_sink_k_per_w        ?? 0;
  const mult  = input.nominal_resistance_multiplier;  // must be > 0 per §8.3
  const r_br  = input.bridge_resistance_k_per_w_if_isolated; // 0 when not isolated

  // §11.3 equations
  const r_spreader_to_pickup_effective = r_spn * mult;
  const r_bridge_adjustment = r_br;
  const r_total = r_jc + r_cs + r_spreader_to_pickup_effective + r_pl + r_ls + r_bridge_adjustment;

  // Derived values (§11.3)
  let t_junction_k: number | null = null;
  let q_dot_chain_w: number | null = null;

  if (q_dot_load_w !== null && t_sink_k !== null) {
    // T_junction = T_sink + Q_load * R_total
    t_junction_k = t_sink_k + q_dot_load_w * r_total;
    // Q_chain = (T_junction - T_sink) / R_total  (consistency check)
    q_dot_chain_w = r_total > 0 ? (t_junction_k - t_sink_k) / r_total : 0;
  }

  return {
    r_spreader_to_pickup_effective_k_per_w: r_spreader_to_pickup_effective,
    r_bridge_adjustment_k_per_w: r_bridge_adjustment,
    r_total_k_per_w: r_total,
    t_junction_k,
    q_dot_chain_w,
    term_breakdown: {
      r_junction_to_case: r_jc,
      r_case_to_spreader: r_cs,
      r_spreader_to_pickup_nominal: r_spn,
      r_spreader_to_pickup_effective,
      r_pickup_to_loop: r_pl,
      r_loop_to_sink: r_ls,
      r_bridge_adjustment,
    },
  };
}

// ── Bridge resistance law (§11.2) ─────────────────────────────────────────────

/**
 * Compute heat transfer across an isolation boundary bridge.
 * §11.2 equation: Q_dot_bridge = (T_upstream - T_downstream) / R_bridge
 */
export function computeBridgeHeatTransfer(
  t_upstream_k: number,
  t_downstream_k: number,
  r_bridge_k_per_w: number
): number {
  if (r_bridge_k_per_w <= 0) {
    throw new Error(`R_bridge must be > 0. Got ${r_bridge_k_per_w}. §11.2`);
  }
  return (t_upstream_k - t_downstream_k) / r_bridge_k_per_w;
}

// ── Multi-zone resistance totals (§14.1 output contract) ─────────────────────

/**
 * Compute resistance chain totals for all zones in the topology.
 * Returns map of zone_id → R_total and breakdown per §14.1.
 */
export function computeZoneResistanceTotals(
  zones: Array<{
    zone_id: string;
    resistance_chain?: Record<string, number | null> | null;
    pickup_geometry_ref?: string | null;
    isolation_boundary?: boolean;
    bridge_resistance_k_per_w?: number | null;
  }>,
  pickupMultiplierMap: Map<string, number>
): Map<string, ResistanceChainResult> {
  const results = new Map<string, ResistanceChainResult>();

  for (const zone of zones) {
    const chain = zone.resistance_chain ?? {};
    const mult = pickupMultiplierMap.get(zone.zone_id) ?? 1.0;
    const bridgeR = zone.isolation_boundary ? (zone.bridge_resistance_k_per_w ?? 0) : 0;

    const result = computeResistanceChain(
      {
        r_junction_to_case_k_per_w:           (chain['r_junction_to_case_k_per_w'] as number | null) ?? null,
        r_case_to_spreader_k_per_w:           (chain['r_case_to_spreader_k_per_w'] as number | null) ?? null,
        r_spreader_to_pickup_nominal_k_per_w: (chain['r_spreader_to_pickup_nominal_k_per_w'] as number | null) ?? null,
        r_pickup_to_loop_k_per_w:             (chain['r_pickup_to_loop_k_per_w'] as number | null) ?? null,
        r_loop_to_sink_k_per_w:               (chain['r_loop_to_sink_k_per_w'] as number | null) ?? null,
        nominal_resistance_multiplier: mult,
        bridge_resistance_k_per_w_if_isolated: bridgeR,
      }
    );

    results.set(zone.zone_id, result);
  }

  return results;
}
