"use strict";
/**
 * flag-emitter.ts
 * Structured flag generation contract.
 * Governing spec: §35, §35.1, §35.2.
 * This module has no internal imports — it is the leaf dependency for all
 * validators. Build order: flag-emitter first, then bounds, operating-mode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLAG_IDS_3A = exports.FLAG_IDS = void 0;
exports.makeFlag = makeFlag;
exports.makeFlagInfo = makeFlagInfo;
exports.makeFlagWarning = makeFlagWarning;
exports.makeFlagReview = makeFlagReview;
exports.makeFlagError = makeFlagError;
exports.makeResearchRequiredFlag = makeResearchRequiredFlag;
exports.emitFlags = emitFlags;
exports.makeFlagRadiationPressureWarning = makeFlagRadiationPressureWarning;
exports.makeFlagConvergenceNonconverged = makeFlagConvergenceNonconverged;
exports.makeFlagConvergenceRunaway = makeFlagConvergenceRunaway;
exports.makeFlagReserveMarginInsufficient = makeFlagReserveMarginInsufficient;
exports.makeFlagTSinkUnresolved = makeFlagTSinkUnresolved;
exports.makeFlagTopologyCycle = makeFlagTopologyCycle;
exports.emit3AFlags = emit3AFlags;
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
// =============================================================================
// Extension 3A flag IDs and factory helpers
// Governing law: 3A-spec §11.10, §13.1, §13.4; dist-tree patch §16 (flag-emitter.ts patch target)
// =============================================================================
exports.FLAG_IDS_3A = {
    // Topology
    TOPOLOGY_CYCLE_DETECTED: 'topology_cycle_detected',
    TOPOLOGY_DISCONNECTED_ZONE: 'topology_disconnected_zone',
    TOPOLOGY_SINGLE_NEIGHBOR_BIDI: 'topology_single_neighbor_bidirectional',
    TOPOLOGY_NO_CONVERGENCE_PEER: 'topology_no_convergence_peer',
    // Convergence
    CONVERGENCE_NONCONVERGED: 'convergence_nonconverged',
    CONVERGENCE_RUNAWAY: 'convergence_runaway',
    CONVERGENCE_TEMP_CLAMPED: 'convergence_temp_clamped',
    // Radiator / radiation
    RADIATION_PRESSURE_WARNING: 'radiation_pressure_screening_warning',
    RESERVE_MARGIN_INSUFFICIENT: 'reserve_margin_insufficient',
    T_SINK_UNRESOLVED: 't_sink_unresolved',
    // Resistance
    RESISTANCE_ALL_NULL_WITH_LOAD: 'resistance_all_null_with_load',
    // Bridge
    BRIDGE_LOSS_HIGH: 'bridge_loss_high',
};
/**
 * Emit radiation-pressure warning flag. §11.10, §3.6.
 * Flag-only: no propagation engine is triggered.
 */
function makeFlagRadiationPressureWarning(p_rad_pa, f_rad_n, subsystem = 'radiator') {
    return makeFlag(exports.FLAG_IDS_3A.RADIATION_PRESSURE_WARNING, 'warning', `Radiation pressure screening: p_rad=${p_rad_pa.toExponential(3)} Pa, F_rad=${f_rad_n.toExponential(3)} N. Flag-only per 3A-spec §11.10, §3.6.`, subsystem, 'radiation_pressure_pa', p_rad_pa, null, true);
}
/**
 * Emit convergence failure warning flag. §13.4.
 */
function makeFlagConvergenceNonconverged(iterations, subsystem = 'convergence') {
    return makeFlag(exports.FLAG_IDS_3A.CONVERGENCE_NONCONVERGED, 'error', `Convergence failed after ${iterations} iterations. §13.4.`, subsystem, 'convergence_status', 'nonconverged', null, true);
}
/**
 * Emit convergence runaway flag. §13.4.
 */
function makeFlagConvergenceRunaway(iterations, subsystem = 'convergence') {
    return makeFlag(exports.FLAG_IDS_3A.CONVERGENCE_RUNAWAY, 'error', `Convergence runaway detected at iteration ${iterations}. State vector exceeded runaway multiplier threshold. §13.4.`, subsystem, 'convergence_status', 'runaway', null, true);
}
/**
 * Emit reserve margin insufficient flag. §11.9.
 */
function makeFlagReserveMarginInsufficient(radiator_id, a_eol, declared_area) {
    return makeFlag(exports.FLAG_IDS_3A.RESERVE_MARGIN_INSUFFICIENT, 'warning', `Radiator '${radiator_id}' EOL required area ${a_eol.toFixed(4)} m² exceeds declared area ${declared_area.toFixed(4)} m² with margin. §11.9.`, 'radiator', `radiator[${radiator_id}].reserve_margin`, a_eol, declared_area, true);
}
/**
 * Emit T_sink unresolved blocking flag. §9.4, §13.3.
 */
function makeFlagTSinkUnresolved(radiator_id) {
    return makeFlag(exports.FLAG_IDS_3A.T_SINK_UNRESOLVED, 'error', `T_sink unresolved for radiator '${radiator_id}'. Provide background_sink_temp_k_override or environment_profile.sink_temperature_k. §9.4.`, 'radiator', `radiator[${radiator_id}].background_sink_temp_k_override`, null, null, true);
}
/**
 * Emit topology cycle detected flag. §13.1.
 */
function makeFlagTopologyCycle() {
    return makeFlag(exports.FLAG_IDS_3A.TOPOLOGY_CYCLE_DETECTED, 'error', 'Directed cycle detected in thermal zone topology graph. Execution blocked under blocking policy. §11.1, §13.1.', 'topology', 'thermal_zones', null, null, true);
}
/**
 * Emit all 3A flags for an Extension3AResult.
 * Convenience bundler — caller adds these flags to the runtime flag list.
 */
function emit3AFlags(result) {
    const flags = [];
    if (result.topology_cycle_detected) {
        flags.push(makeFlagTopologyCycle());
    }
    if (result.convergence_status === 'nonconverged') {
        flags.push(makeFlagConvergenceNonconverged(result.convergence_iterations));
    }
    if (result.convergence_status === 'runaway') {
        flags.push(makeFlagConvergenceRunaway(result.convergence_iterations));
    }
    if (result.reserve_margin_sufficient === false) {
        flags.push(makeFlag(exports.FLAG_IDS_3A.RESERVE_MARGIN_INSUFFICIENT, 'warning', 'Reserve margin insufficient for EOL radiator area requirement. §11.9.', 'radiator', 'reserve_margin_sufficient', 'false', null, true));
    }
    if (result.t_sink_source === 'unresolved') {
        flags.push(makeFlag(exports.FLAG_IDS_3A.T_SINK_UNRESOLVED, 'error', 'T_sink unresolved. §9.4, §13.3.', 'radiator', 't_sink_source', 'unresolved', null, true));
    }
    if (result.radiation_pressure_pa !== null && result.radiation_pressure_force_n !== null) {
        flags.push(makeFlagRadiationPressureWarning(result.radiation_pressure_pa, result.radiation_pressure_force_n));
    }
    return flags;
}
//# sourceMappingURL=flag-emitter.js.map