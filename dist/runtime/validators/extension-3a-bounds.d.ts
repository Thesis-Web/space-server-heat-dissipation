/**
 * extension-3a-bounds.ts
 * Extension 3A numeric bounds and semantic validation.
 * Governing law: 3A-spec §13.2–§13.5.
 * Follows extension-2-bounds.ts naming pattern.
 *
 * Covers:
 *  §13.2 — catalog bounds (numeric fields in catalog entries)
 *  §13.3 — radiator validation (emissivity, view factors, T_sink, geometry)
 *  §13.4 — convergence validation (iteration params, tolerances, runaway)
 *  §13.5 — resistance validation (non-negative terms, pickup ref resolution)
 */
export interface BoundsViolation {
    rule: string;
    severity: 'error' | 'warning';
    field: string;
    value?: unknown;
    message: string;
}
export interface Extension3ABoundsReport {
    valid: boolean;
    violations: BoundsViolation[];
    warnings: BoundsViolation[];
}
/**
 * Validate pickup-geometry catalog entry numeric bounds.
 * §8.3, §13.2.
 */
export declare function validatePickupGeometryBounds(entry: {
    pickup_geometry_id: string;
    nominal_contact_area_fraction: number;
    nominal_spreading_factor: number;
    nominal_resistance_multiplier: number;
}): BoundsViolation[];
/**
 * Validate all 3A radiator fields.
 * §9.3, §13.3.
 */
export declare function validateRadiator3ABounds(rad: {
    radiator_id: string;
    geometry_mode?: string | null;
    face_a_view_factor?: number | null;
    face_b_view_factor?: number | null;
    surface_emissivity_bol?: number | null;
    surface_emissivity_eol_override?: number | null;
    emissivity_degradation_fraction?: number | null;
    cavity_emissivity_mode?: string | null;
    cavity_view_factor?: number | null;
    cavity_surface_emissivity?: number | null;
    background_sink_temp_k_override?: number | null;
}, tSinkResolvable: boolean): BoundsViolation[];
/**
 * Validate convergence_control object bounds.
 * §5.4, §13.4.
 */
export declare function validateConvergenceControl(cc: {
    max_iterations: number;
    tolerance_abs_w: number;
    tolerance_rel_fraction: number;
    runaway_multiplier: number;
    blocking_on_nonconvergence: boolean;
}): BoundsViolation[];
/**
 * Validate a zone's resistance_chain sub-object.
 * §6.5, §13.5.
 */
export declare function validateResistanceChain(zone: {
    zone_id: string;
    resistance_chain?: Record<string, number | null> | null;
    pickup_geometry_ref?: string | null;
}, pickupGeometryResolved: boolean): BoundsViolation[];
/**
 * Run all 3A bounds checks and return a unified report.
 */
export declare function validateExtension3ABounds(params: {
    convergence_control?: Parameters<typeof validateConvergenceControl>[0] | null;
    radiators?: Array<Parameters<typeof validateRadiator3ABounds>[0] & {
        tSinkResolvable: boolean;
    }>;
    zones?: Array<Parameters<typeof validateResistanceChain>[0] & {
        pickupGeometryResolved: boolean;
    }>;
    pickupGeometryEntries?: Array<Parameters<typeof validatePickupGeometryBounds>[0]>;
}): Extension3ABoundsReport;
//# sourceMappingURL=extension-3a-bounds.d.ts.map