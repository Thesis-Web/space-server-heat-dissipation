"use strict";
/**
 * Bounds validator — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §21
 * Blocking cases: §21.1
 * Warning cases: §21.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePacketForExport = validatePacketForExport;
exports.validateThermalZoneBounds = validateThermalZoneBounds;
exports.validateStorageBounds = validateStorageBounds;
exports.validateRadiatorBounds = validateRadiatorBounds;
exports.boundsViolationsToFlags = boundsViolationsToFlags;
function issue(severity, code, message, field) {
    return { severity, code, message, field };
}
/**
 * Run all blocking and warning validations per spec §21.
 * Returns a ValidationResult. export_allowed=false if any blocking issues exist.
 */
function validatePacketForExport(params) {
    const blocking = [];
    const warnings = [];
    const { research_required_items = [] } = params;
    // §21.1 — blocking cases
    if (!params.scenario_id)
        blocking.push(issue("blocking", "MISSING_SCENARIO_ID", "scenario_id is required", "scenario_id"));
    if (!params.packet_id)
        blocking.push(issue("blocking", "MISSING_PACKET_ID", "packet_id is required", "packet_id"));
    if (params.device_count !== undefined && params.device_count < 1) {
        blocking.push(issue("blocking", "DEVICE_COUNT_LT_1", "device_count must be >= 1", "device_count"));
    }
    if (params.power_fields) {
        for (const p of params.power_fields) {
            if (p < 0) {
                blocking.push(issue("blocking", "NEGATIVE_POWER", "Power fields must be >= 0", "power_fields"));
                break;
            }
        }
    }
    if (params.radiator_target_temp_k !== undefined && params.radiator_target_temp_k <= 0) {
        blocking.push(issue("blocking", "RADIATOR_TEMP_INVALID", "radiator target temperature must be > 0 K", "radiator_target_temp_k"));
    }
    if (params.emissivity !== undefined && (params.emissivity <= 0 || params.emissivity > 1)) {
        blocking.push(issue("blocking", "EMISSIVITY_OUT_OF_RANGE", "emissivity must be in (0, 1]", "emissivity"));
    }
    if (params.view_factor !== undefined && (params.view_factor <= 0 || params.view_factor > 1)) {
        blocking.push(issue("blocking", "VIEW_FACTOR_OUT_OF_RANGE", "view_factor must be in (0, 1]", "view_factor"));
    }
    if (params.target_surface_temp_k !== undefined && params.material_limit_temp_k !== undefined) {
        if (params.target_surface_temp_k > params.material_limit_temp_k) {
            blocking.push(issue("blocking", "TEMP_EXCEEDS_MATERIAL_LIMIT", "target_surface_temp_k > material_limit_temp_k", "target_surface_temp_k"));
        }
    }
    if (params.branch_mode_labels?.includes("power_cycle")) {
        if (params.t_hot_source_k !== undefined && params.t_cold_sink_k !== undefined) {
            if (params.t_hot_source_k <= params.t_cold_sink_k) {
                blocking.push(issue("blocking", "POWER_CYCLE_TEMP_INVALID", "power_cycle branch requires t_hot > t_cold", "t_hot_source_k"));
            }
        }
    }
    if (params.branch_mode_labels?.includes("heat_lift")) {
        if (!params.heat_lift_has_source_term && !params.heat_lift_research_required) {
            blocking.push(issue("blocking", "HEAT_LIFT_NO_SOURCE", "heat_lift branch must declare source term or research_required=true"));
        }
    }
    // §21.2 — warning cases
    if (params.branch_mode_labels?.includes("heat_lift") && params.branch_mode_labels?.includes("power_cycle")) {
        warnings.push(issue("warning", "SIMULTANEOUS_HEAT_LIFT_POWER_CYCLE", "Simultaneous heat_lift and power_cycle branch selections require careful accounting"));
    }
    if (params.has_speculative_device) {
        warnings.push(issue("warning", "SPECULATIVE_DEVICE", "One or more speculative device presets are in use"));
    }
    if (params.has_speculative_material) {
        warnings.push(issue("warning", "SPECULATIVE_MATERIAL", "One or more speculative material presets are in use"));
    }
    if (params.has_solar_polish_without_source) {
        warnings.push(issue("warning", "SOLAR_POLISH_NO_SOURCE", "Solar-polish architecture selected without solar source characterization"));
    }
    if (params.has_per_subsystem_duty_simplification) {
        warnings.push(issue("warning", "PER_SUBSYSTEM_DUTY_SIMPLIFIED", "Per-subsystem duty mode simplified to aggregate duty fraction for compatibility export"));
    }
    return {
        blocking,
        warnings,
        research_required_items,
        export_allowed: blocking.length === 0,
    };
}
// ─── FIX-004: Domain-specific bounds validators ───────────────────────────────
// run-scenario.ts (ANCHOR runner) expects validateThermalZoneBounds,
// validateStorageBounds, validateRadiatorBounds, and boundsViolationsToFlags.
// These are additive validators based on spec §19.3, §21.3, §22.3.
// FIX-004: required by run-scenario.ts.
const flag_emitter_1 = require("../emitters/flag-emitter");
/**
 * Validate thermal zone temperature bounds per spec §19.3.
 * FIX-004.
 */
function validateThermalZoneBounds(zone) {
    const v = [];
    if (zone.target_temp_k <= 0)
        v.push({ severity: 'error', field: 'target_temp_k', message: `Zone ${zone.zone_id}: target_temp_k must be > 0 K` });
    if (zone.temp_min_k <= 0)
        v.push({ severity: 'error', field: 'temp_min_k', message: `Zone ${zone.zone_id}: temp_min_k must be > 0 K` });
    if (zone.temp_max_k <= zone.temp_min_k)
        v.push({ severity: 'error', field: 'temp_max_k', message: `Zone ${zone.zone_id}: temp_max_k must be > temp_min_k` });
    if (zone.target_temp_k < zone.temp_min_k || zone.target_temp_k > zone.temp_max_k)
        v.push({ severity: 'warning', field: 'target_temp_k', message: `Zone ${zone.zone_id}: target_temp_k outside [temp_min_k, temp_max_k]` });
    return v;
}
/**
 * Validate storage bounds per spec §21.3.
 * FIX-004.
 */
function validateStorageBounds(storage) {
    const v = [];
    if (storage.mass_kg < 0)
        v.push({ severity: 'error', field: 'mass_kg', message: 'Storage mass_kg must be >= 0' });
    if (storage.cp_j_per_kgk <= 0)
        v.push({ severity: 'error', field: 'cp_j_per_kgk', message: 'cp_j_per_kgk must be > 0' });
    if (storage.temp_min_k >= storage.temp_max_k)
        v.push({ severity: 'error', field: 'temp_min_k', message: 'temp_min_k must be < temp_max_k per §21.3' });
    if (storage.latent_utilization_fraction < 0 || storage.latent_utilization_fraction > 1)
        v.push({ severity: 'error', field: 'latent_utilization_fraction', message: 'latent_utilization_fraction must be in [0, 1] per §21.3' });
    return v;
}
/**
 * Validate radiator configuration bounds per spec §22.3.
 * FIX-004.
 */
function validateRadiatorBounds(radiator) {
    const v = [];
    if (radiator.emissivity <= 0 || radiator.emissivity > 1)
        v.push({ severity: 'error', field: 'emissivity', message: 'emissivity must be in (0, 1]' });
    if (radiator.target_surface_temp_k <= 0)
        v.push({ severity: 'error', field: 'target_surface_temp_k', message: 'target_surface_temp_k must be > 0 K' });
    if (radiator.reserve_margin_fraction < 0)
        v.push({ severity: 'warning', field: 'reserve_margin_fraction', message: 'reserve_margin_fraction < 0 is unusual' });
    return v;
}
/**
 * Convert BoundsViolation[] to Flag[] for use in run-scenario.ts.
 * FIX-004.
 */
function boundsViolationsToFlags(violations, subsystem) {
    return violations.map(v => v.severity === 'error'
        ? (0, flag_emitter_1.makeFlagError)(flag_emitter_1.FLAG_IDS.BOUNDS_VIOLATION, v.message, subsystem, v.field ?? 'unknown')
        : (0, flag_emitter_1.makeFlagWarning)(flag_emitter_1.FLAG_IDS.BOUNDS_VIOLATION, v.message, subsystem, v.field ?? 'unknown'));
}
//# sourceMappingURL=bounds.js.map