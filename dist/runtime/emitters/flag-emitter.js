"use strict";
/**
 * flag-emitter.ts
 * Structured flag generation contract.
 * Governing spec: §35, §35.1, §35.2.
 * This module has no internal imports — it is the leaf dependency for all
 * validators. Build order: flag-emitter first, then bounds, operating-mode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLAG_IDS = void 0;
exports.makeFlag = makeFlag;
exports.makeFlagInfo = makeFlagInfo;
exports.makeFlagWarning = makeFlagWarning;
exports.makeFlagReview = makeFlagReview;
exports.makeFlagError = makeFlagError;
exports.makeResearchRequiredFlag = makeResearchRequiredFlag;
exports.emitFlags = emitFlags;
// ─── Minimum supported flag IDs §35.1 ─────────────────────────────────────────
exports.FLAG_IDS = {
    EXCEEDS_MATERIAL_RANGE: 'exceeds_selected_material_range',
    EXCEEDS_FLUID_RANGE: 'exceeds_selected_fluid_range',
    EXCEEDS_DEVICE_THERMAL_POLICY: 'exceeds_selected_device_thermal_policy',
    REQUIRES_EXTREME_TEMP: 'requires_extreme_target_surface_temperature',
    REQUIRES_LARGE_RADIATOR: 'requires_large_radiator_scale',
    REQUIRES_HIGH_PARASITIC: 'requires_high_parasitic_work_input',
    LOW_SIGNIFICANCE_BRANCH: 'low_significance_recovery_branch_output',
    ASSUMPTION_INCOMPLETE: 'assumption_incompleteness',
    RESEARCH_REQUIRED: 'research_confirmation_required',
    ORBIT_CLASS_REJECTED: 'orbit_class_rejected',
    CARNOT_VIOLATION: 'carnot_violation',
    SCHEMA_VALIDATION_FAILED: 'schema_validation_failed',
    BOUNDS_VIOLATION: 'bounds_violation',
};
// ─── Factory helpers ──────────────────────────────────────────────────────────
function makeFlag(flag_id, severity, message, related_subsystem, related_field, trigger_value = null, threshold_value = null, review_required = false) {
    return {
        flag_id,
        severity,
        message,
        related_subsystem,
        related_field,
        trigger_value,
        threshold_value,
        review_required,
    };
}
function makeFlagInfo(flag_id, message, subsystem, field, trigger, threshold) {
    return makeFlag(flag_id, 'info', message, subsystem, field, trigger ?? null, threshold ?? null, false);
}
function makeFlagWarning(flag_id, message, subsystem, field, trigger, threshold) {
    return makeFlag(flag_id, 'warning', message, subsystem, field, trigger ?? null, threshold ?? null, false);
}
function makeFlagReview(flag_id, message, subsystem, field, trigger, threshold) {
    return makeFlag(flag_id, 'review', message, subsystem, field, trigger ?? null, threshold ?? null, true);
}
function makeFlagError(flag_id, message, subsystem, field, trigger, threshold) {
    return makeFlag(flag_id, 'error', message, subsystem, field, trigger ?? null, threshold ?? null, true);
}
// ─── Research-required flag factory §39 ───────────────────────────────────────
function makeResearchRequiredFlag(field, subsystem) {
    return makeFlagReview(exports.FLAG_IDS.RESEARCH_REQUIRED, `Field '${field}' in subsystem '${subsystem}' is marked research-required. ` +
        `Output dependent on this field cannot be treated as final. §39`, subsystem, field);
}
function emitFlags(flags) {
    const error_count = flags.filter(f => f.severity === 'error').length;
    const review_count = flags.filter(f => f.severity === 'review').length;
    const warning_count = flags.filter(f => f.severity === 'warning').length;
    const info_count = flags.filter(f => f.severity === 'info').length;
    return {
        flags,
        error_count,
        review_count,
        warning_count,
        info_count,
        has_blocking_flags: error_count > 0,
    };
}
//# sourceMappingURL=flag-emitter.js.map