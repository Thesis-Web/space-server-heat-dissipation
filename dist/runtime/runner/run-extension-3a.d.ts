/**
 * run-extension-3a.ts
 * Extension 3A scenario execution runner.
 * Governing law: 3A-spec §5, §11, §13, §14; dist-tree patch §14.
 * Follows run-extension-2.ts naming and structural pattern.
 *
 * Responsibilities:
 *  - Orchestrate normalization, catalog resolution, validation, math, emission
 *  - Cohabit with run-extension-2 and baseline runners (additive result on packet)
 *  - Gate on enable_model_extension_3a — if false, return clean bypass result
 *  - Enforce all blocking rules from §13 before emitting numeric outputs
 *  - Emit §14.1 required output fields
 *
 * Cohabitation contract (per owner build instruction):
 *  The extension-2 runner remains active. This runner's output is additive
 *  as extension_3a_result on the packet. run-packet.ts dispatches both.
 *  Neither runner alters the other's output.
 */
export interface Extension3ACatalogInput {
    working_fluid_catalog: {
        catalog_id: string;
        catalog_version: string;
        entries: Array<Record<string, unknown>>;
    };
    pickup_geometry_catalog: {
        catalog_id: string;
        catalog_version: string;
        entries: Array<Record<string, unknown>>;
    };
}
export interface Extension3AInput {
    scenario: Record<string, unknown>;
    radiators: Array<Record<string, unknown>>;
    catalogs: Extension3ACatalogInput;
    /** From scenario.environment_profile.sink_temperature_k if present */
    environment_sink_temperature_k?: number | null;
}
export interface BridgeLossEntry {
    zone_id: string;
    q_dot_bridge_w: number;
    r_bridge_k_per_w: number;
    t_upstream_k: number;
    t_downstream_k: number;
}
export interface Extension3AResult {
    extension_3a_enabled: boolean;
    model_extension_3a_mode: string;
    spec_version: string;
    blueprint_version: string;
    topology_valid: boolean;
    topology_cycle_detected: boolean;
    topology_order: string[];
    convergence_attempted: boolean;
    convergence_iterations: number;
    convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
    bridge_losses_w: BridgeLossEntry[];
    bridge_losses_w_total: number;
    resistance_chain_totals: Record<string, {
        r_total_k_per_w: number;
        t_junction_k: number | null;
    }>;
    t_sink_resolved_k: number | null;
    t_sink_source: 'override' | 'environment_profile' | 'unresolved';
    radiator_area_bol_required_m2: number | null;
    radiator_area_eol_required_m2: number | null;
    radiator_area_delta_m2: number | null;
    reserve_margin_sufficient: boolean | null;
    radiation_pressure_pa: number | null;
    radiation_pressure_force_n: number | null;
    defaults_applied: string[];
    topology_violations: Array<{
        rule: string;
        severity: string;
        message: string;
        zone_id?: string;
    }>;
    topology_warnings: Array<{
        rule: string;
        severity: string;
        message: string;
        zone_id?: string;
    }>;
    bounds_violations: Array<{
        rule: string;
        field: string;
        message: string;
    }>;
    bounds_warnings: Array<{
        rule: string;
        field: string;
        message: string;
    }>;
    blocking_errors: string[];
    transform_trace: string[];
}
/**
 * Execute Extension 3A scenario processing.
 * Returns Extension3AResult — always succeeds structurally;
 * blocking_errors[] non-empty means execution is blocked per §13.
 */
export declare function runExtension3A(input: Extension3AInput): Extension3AResult;
//# sourceMappingURL=run-extension-3a.d.ts.map