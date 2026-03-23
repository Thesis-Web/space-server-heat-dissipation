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
    violations: Array<{
        rule: string;
        severity: string;
        message: string;
    }>;
    warnings: Array<{
        rule: string;
        severity: string;
        message: string;
    }>;
    blocking_errors: string[];
}
/**
 * Emit structured topology report from Extension 3A result.
 * Satisfies §14.1 required emitted fields and §14.2 human-readable framing.
 * Blueprint §12 output framing contract implemented.
 */
export declare function emitTopologyReport(result: Extension3AResult, zones?: Array<Record<string, unknown>>): TopologyReport;
/**
 * Render topology report as markdown summary.
 * §14.2: markdown emitter must surface foundational truths in plain form.
 */
export declare function renderTopologyReportMarkdown(report: TopologyReport): string;
//# sourceMappingURL=topology-report.d.ts.map