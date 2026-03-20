/**
 * flag-emitter.ts
 * Structured flag generation contract.
 * Governing spec: §35, §35.1, §35.2.
 * This module has no internal imports — it is the leaf dependency for all
 * validators. Build order: flag-emitter first, then bounds, operating-mode.
 */
export type FlagSeverity = 'info' | 'warning' | 'review' | 'error';
export interface Flag {
    /** Stable flag identifier. §35 */
    flag_id: string;
    /** Severity classification. §35.2 */
    severity: FlagSeverity;
    /** Human-readable explanation. §35 */
    message: string;
    /** Subsystem that triggered the flag. §35 */
    related_subsystem: string;
    /** Specific field or rule reference. §35 */
    related_field: string;
    /** Value that triggered the flag, if applicable. §35 */
    trigger_value: number | string | null;
    /** Threshold or limit that was exceeded. §35 */
    threshold_value: number | string | null;
    /** Whether human review is required before accepting output. §35 */
    review_required: boolean;
}
export declare const FLAG_IDS: {
    readonly EXCEEDS_MATERIAL_RANGE: "exceeds_selected_material_range";
    readonly EXCEEDS_FLUID_RANGE: "exceeds_selected_fluid_range";
    readonly EXCEEDS_DEVICE_THERMAL_POLICY: "exceeds_selected_device_thermal_policy";
    readonly REQUIRES_EXTREME_TEMP: "requires_extreme_target_surface_temperature";
    readonly REQUIRES_LARGE_RADIATOR: "requires_large_radiator_scale";
    readonly REQUIRES_HIGH_PARASITIC: "requires_high_parasitic_work_input";
    readonly LOW_SIGNIFICANCE_BRANCH: "low_significance_recovery_branch_output";
    readonly ASSUMPTION_INCOMPLETE: "assumption_incompleteness";
    readonly RESEARCH_REQUIRED: "research_confirmation_required";
    readonly ORBIT_CLASS_REJECTED: "orbit_class_rejected";
    readonly CARNOT_VIOLATION: "carnot_violation";
    readonly SCHEMA_VALIDATION_FAILED: "schema_validation_failed";
    readonly BOUNDS_VIOLATION: "bounds_violation";
};
export declare function makeFlag(flag_id: string, severity: FlagSeverity, message: string, related_subsystem: string, related_field: string, trigger_value?: number | string | null, threshold_value?: number | string | null, review_required?: boolean): Flag;
export declare function makeFlagInfo(flag_id: string, message: string, subsystem: string, field: string, trigger?: number | string, threshold?: number | string): Flag;
export declare function makeFlagWarning(flag_id: string, message: string, subsystem: string, field: string, trigger?: number | string, threshold?: number | string): Flag;
export declare function makeFlagReview(flag_id: string, message: string, subsystem: string, field: string, trigger?: number | string, threshold?: number | string): Flag;
export declare function makeFlagError(flag_id: string, message: string, subsystem: string, field: string, trigger?: number | string, threshold?: number | string): Flag;
export declare function makeResearchRequiredFlag(field: string, subsystem: string): Flag;
export interface FlagEmitResult {
    flags: Flag[];
    error_count: number;
    review_count: number;
    warning_count: number;
    info_count: number;
    has_blocking_flags: boolean;
}
export declare function emitFlags(flags: Flag[]): FlagEmitResult;
//# sourceMappingURL=flag-emitter.d.ts.map