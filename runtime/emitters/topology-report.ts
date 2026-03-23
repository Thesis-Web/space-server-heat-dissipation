/**
 * topology-report.ts
 * Topology report emitter for Extension 3A.
 * Governing law: 3A-spec §14.1–§14.2; dist-tree patch §15.
 *
 * Emits structured topology/convergence/resistance/defaults report.
 * Blueprint §12 output framing requirements implemented here.
 */

import type { Extension3AResult, BridgeLossEntry } from '../runner/run-extension-3a';

export interface TopologyReportEntry {
  zone_id: string;
  declared_role?: string;
  flow_direction?: string;
  topology_position_in_order: number | null;
  convergence_enabled: boolean;
  isolation_boundary: boolean;
  upstream_zone_ref: string | null;
  downstream_zone_ref: string | null;
  r_total_k_per_w: number | null;
  t_junction_k: number | null;
}

export interface TopologyReport {
  generated_for_spec_version: string;
  topology_valid: boolean;
  topology_cycle_detected: boolean;
  topology_order: string[];
  zones: TopologyReportEntry[];
  convergence_attempted: boolean;
  convergence_status: string;
  convergence_iterations: number;
  bridge_losses: BridgeLossEntry[];
  bridge_losses_total_w: number;
  radiator_sizing: {
    t_sink_resolved_k: number | null;
    t_sink_source: string;
    a_bol_required_m2: number | null;
    a_eol_required_m2: number | null;
    a_delta_m2: number | null;
    reserve_margin_sufficient: boolean | null;
  };
  radiation_pressure: {
    p_rad_pa: number | null;
    f_rad_n: number | null;
  };
  defaults_applied: string[];
  violations: Array<{ rule: string; severity: string; message: string }>;
  warnings: Array<{ rule: string; severity: string; message: string }>;
  blocking_errors: string[];
}

/**
 * Emit structured topology report from Extension 3A result.
 * Satisfies §14.1 required emitted fields and §14.2 human-readable framing.
 * Blueprint §12 output framing contract implemented.
 */
export function emitTopologyReport(
  result: Extension3AResult,
  zones: Array<Record<string, unknown>> = []
): TopologyReport {
  const orderIndex = new Map(result.topology_order.map((id, i) => [id, i]));

  const zoneEntries: TopologyReportEntry[] = zones.map(z => ({
    zone_id: String(z.zone_id ?? ''),
    declared_role: z.zone_role as string | undefined,
    flow_direction: z.flow_direction as string | undefined,
    topology_position_in_order: orderIndex.has(String(z.zone_id)) ? orderIndex.get(String(z.zone_id))! : null,
    convergence_enabled: (z.convergence_enabled as boolean | undefined) ?? false,
    isolation_boundary: (z.isolation_boundary as boolean | undefined) ?? false,
    upstream_zone_ref: (z.upstream_zone_ref as string | null | undefined) ?? null,
    downstream_zone_ref: (z.downstream_zone_ref as string | null | undefined) ?? null,
    r_total_k_per_w: result.resistance_chain_totals[String(z.zone_id)]?.r_total_k_per_w ?? null,
    t_junction_k: result.resistance_chain_totals[String(z.zone_id)]?.t_junction_k ?? null,
  }));

  const allViolations = [
    ...result.topology_violations,
    ...result.bounds_violations,
  ];
  const allWarnings = [
    ...result.topology_warnings,
    ...result.bounds_warnings,
  ];

  return {
    generated_for_spec_version: result.spec_version,
    topology_valid: result.topology_valid,
    topology_cycle_detected: result.topology_cycle_detected,
    topology_order: result.topology_order,
    zones: zoneEntries,
    convergence_attempted: result.convergence_attempted,
    convergence_status: result.convergence_status,
    convergence_iterations: result.convergence_iterations,
    bridge_losses: result.bridge_losses_w,
    bridge_losses_total_w: result.bridge_losses_w_total,
    radiator_sizing: {
      t_sink_resolved_k: result.t_sink_resolved_k,
      t_sink_source: result.t_sink_source,
      a_bol_required_m2: result.radiator_area_bol_required_m2,
      a_eol_required_m2: result.radiator_area_eol_required_m2,
      a_delta_m2: result.radiator_area_delta_m2,
      reserve_margin_sufficient: result.reserve_margin_sufficient,
    },
    radiation_pressure: {
      p_rad_pa: result.radiation_pressure_pa,
      f_rad_n: result.radiation_pressure_force_n,
    },
    defaults_applied: result.defaults_applied,
    violations: allViolations.map(v => ({ rule: v.rule, severity: (v as { severity?: string }).severity ?? 'error', message: v.message })),
    warnings: allWarnings.map(w => ({ rule: w.rule, severity: (w as { severity?: string }).severity ?? 'warning', message: w.message })),
    blocking_errors: result.blocking_errors,
  };
}

/**
 * Render topology report as markdown summary.
 * §14.2: markdown emitter must surface foundational truths in plain form.
 */
export function renderTopologyReportMarkdown(report: TopologyReport): string {
  const lines: string[] = [];

  lines.push('# Extension 3A Topology Report');
  lines.push('');
  lines.push(`**Spec version:** ${report.generated_for_spec_version}`);
  lines.push(`**Topology valid:** ${report.topology_valid ? '✓ Yes' : '✗ No'}`);
  lines.push(`**Cycle detected:** ${report.topology_cycle_detected ? '✗ Yes' : '✓ No'}`);
  if (report.topology_order.length > 0) {
    lines.push(`**Topology order:** ${report.topology_order.join(' → ')}`);
  }
  lines.push('');

  lines.push('## Zones');
  for (const z of report.zones) {
    const pos = z.topology_position_in_order !== null ? `pos=${z.topology_position_in_order}` : 'not ordered';
    lines.push(`- **${z.zone_id}** [${z.declared_role ?? 'no role'}] flow=${z.flow_direction ?? 'unknown'} ${pos}`);
    if (z.r_total_k_per_w !== null) {
      lines.push(`  R_total=${z.r_total_k_per_w.toFixed(6)} K/W${z.t_junction_k !== null ? ` T_junction=${z.t_junction_k.toFixed(1)} K` : ''}`);
    }
  }
  lines.push('');

  lines.push('## Convergence');
  lines.push(`**Attempted:** ${report.convergence_attempted ? 'Yes' : 'No'}`);
  if (report.convergence_attempted) {
    lines.push(`**Status:** ${report.convergence_status}`);
    lines.push(`**Iterations:** ${report.convergence_iterations}`);
  }
  lines.push('');

  lines.push('## Bridge Losses');
  if (report.bridge_losses.length === 0) {
    lines.push('None declared.');
  } else {
    for (const bl of report.bridge_losses) {
      lines.push(`- Zone **${bl.zone_id}**: Q_bridge=${bl.q_dot_bridge_w.toFixed(2)} W at R=${bl.r_bridge_k_per_w} K/W`);
    }
    lines.push(`**Total bridge loss:** ${report.bridge_losses_total_w.toFixed(2)} W`);
  }
  lines.push('');

  lines.push('## Radiator Sizing');
  lines.push(`**T_sink:** ${report.radiator_sizing.t_sink_resolved_k !== null ? `${report.radiator_sizing.t_sink_resolved_k} K` : 'UNRESOLVED'} (source: ${report.radiator_sizing.t_sink_source})`);
  if (report.radiator_sizing.a_bol_required_m2 !== null) {
    lines.push(`**BOL area required:** ${report.radiator_sizing.a_bol_required_m2.toFixed(4)} m²`);
    lines.push(`**EOL area required:** ${report.radiator_sizing.a_eol_required_m2?.toFixed(4) ?? 'N/A'} m²`);
    lines.push(`**Area delta (EOL-BOL):** ${report.radiator_sizing.a_delta_m2?.toFixed(4) ?? 'N/A'} m²`);
    lines.push(`**Reserve margin sufficient:** ${report.radiator_sizing.reserve_margin_sufficient === null ? 'N/A' : report.radiator_sizing.reserve_margin_sufficient ? '✓ Yes' : '✗ No'}`);
  }
  lines.push('');

  if (report.radiation_pressure.p_rad_pa !== null) {
    lines.push('## Radiation Pressure (flag-only)');
    lines.push(`**p_rad:** ${report.radiation_pressure.p_rad_pa.toExponential(4)} Pa`);
    lines.push(`**F_rad:** ${report.radiation_pressure.f_rad_n?.toExponential(4) ?? 'N/A'} N`);
    lines.push('');
  }

  if (report.blocking_errors.length > 0) {
    lines.push('## ⛔ Blocking Errors');
    for (const err of report.blocking_errors) lines.push(`- ${err}`);
    lines.push('');
  }

  if (report.warnings.length > 0) {
    lines.push('## ⚠️ Warnings');
    for (const w of report.warnings) lines.push(`- [${w.rule}] ${w.message}`);
    lines.push('');
  }

  lines.push('## Defaults Applied');
  if (report.defaults_applied.length === 0) {
    lines.push('None.');
  } else {
    for (const d of report.defaults_applied) lines.push(`- ${d}`);
  }

  return lines.join('\n');
}
