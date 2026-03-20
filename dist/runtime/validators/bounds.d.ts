/**
 * Bounds validator — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §21
 * Blocking cases: §21.1
 * Warning cases: §21.2
 */
export interface ValidationIssue {
    severity: "blocking" | "warning";
    code: string;
    message: string;
    field?: string;
}
export interface ValidationResult {
    blocking: ValidationIssue[];
    warnings: ValidationIssue[];
    research_required_items: string[];
    export_allowed: boolean;
}
/**
 * Run all blocking and warning validations per spec §21.
 * Returns a ValidationResult. export_allowed=false if any blocking issues exist.
 */
export declare function validatePacketForExport(params: {
    scenario_id?: string;
    packet_id?: string;
    device_count?: number;
    power_fields?: number[];
    radiator_target_temp_k?: number;
    emissivity?: number;
    view_factor?: number;
    target_surface_temp_k?: number;
    material_limit_temp_k?: number;
    branch_mode_labels?: string[];
    t_hot_source_k?: number;
    t_cold_sink_k?: number;
    heat_lift_has_source_term?: boolean;
    heat_lift_research_required?: boolean;
    has_speculative_device?: boolean;
    has_speculative_material?: boolean;
    has_solar_polish_without_source?: boolean;
    has_per_subsystem_duty_simplification?: boolean;
    research_required_items?: string[];
}): ValidationResult;
import { type Flag } from '../emitters/flag-emitter';
export interface BoundsViolation {
    severity: 'error' | 'warning';
    field: string;
    message: string;
}
/**
 * Validate thermal zone temperature bounds per spec §19.3.
 * FIX-004.
 */
export declare function validateThermalZoneBounds(zone: {
    zone_id: string;
    target_temp_k: number;
    temp_min_k: number;
    temp_max_k: number;
    pressure_min_pa?: number;
    pressure_max_pa?: number;
}): BoundsViolation[];
/**
 * Validate storage bounds per spec §21.3.
 * FIX-004.
 */
export declare function validateStorageBounds(storage: {
    storage_id?: string;
    mass_kg: number;
    cp_j_per_kgk: number;
    temp_min_k: number;
    temp_max_k: number;
    latent_utilization_fraction: number;
}): BoundsViolation[];
/**
 * Validate radiator configuration bounds per spec §22.3.
 * FIX-004.
 */
export declare function validateRadiatorBounds(radiator: {
    emissivity: number;
    target_surface_temp_k: number;
    reserve_margin_fraction: number;
}): BoundsViolation[];
/**
 * Convert BoundsViolation[] to Flag[] for use in run-scenario.ts.
 * FIX-004.
 */
export declare function boundsViolationsToFlags(violations: BoundsViolation[], subsystem: string): Flag[];
//# sourceMappingURL=bounds.d.ts.map