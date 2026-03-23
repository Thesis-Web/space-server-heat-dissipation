"use strict";
/**
 * default-expander.ts
 * Default expansion transform — injects spec-declared defaults for omitted fields.
 * Governed by §26.4, §40, §4.3 (baseline).
 * Extension 3A defaults governed by 3A-spec §12.1–§12.2.
 * All injected defaults are surfaced as assumptions per §4.3 / §12.2.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandDefaults = expandDefaults;
exports.expand3ADefaults = expand3ADefaults;
exports.injectZone3ADefaults = injectZone3ADefaults;
exports.injectRadiator3ADefaults = injectRadiator3ADefaults;
const constants_1 = require("../constants/constants");
/**
 * Expand defaults for a scenario.
 * Every injected default is recorded as an assumption per §4.3 / §40.
 */
function expandDefaults(overrides) {
    const assumptions = [];
    const epsilon_rad = overrides.epsilon_rad ?? constants_1.EPSILON_RAD_DEFAULT;
    if (overrides.epsilon_rad === undefined) {
        assumptions.push({
            field: 'epsilon_rad',
            value: constants_1.EPSILON_RAD_DEFAULT,
            source: 'default',
            note: 'Default radiator emissivity per §40.',
        });
    }
    // Policy-aware margin
    const policy_margin = overrides.thermal_policy !== undefined
        ? (constants_1.THERMAL_POLICY_MARGINS[overrides.thermal_policy] ?? constants_1.RESERVE_MARGIN_DEFAULT)
        : constants_1.RESERVE_MARGIN_DEFAULT;
    const reserve_margin_fraction = overrides.reserve_margin_fraction ?? policy_margin;
    if (overrides.reserve_margin_fraction === undefined) {
        assumptions.push({
            field: 'reserve_margin_fraction',
            value: reserve_margin_fraction,
            source: 'default',
            note: `Default reserve margin for thermal policy '${overrides.thermal_policy ?? 'nominal'}' per §40 / §33.`,
        });
    }
    const t_sink_effective_k = overrides.t_sink_effective_k ?? constants_1.T_SINK_EFFECTIVE_DEFAULT_K;
    if (overrides.t_sink_effective_k === undefined) {
        assumptions.push({
            field: 't_sink_effective_k',
            value: constants_1.T_SINK_EFFECTIVE_DEFAULT_K,
            source: 'default',
            note: 'Deep-space first-order sizing assumption per §40.',
        });
    }
    const t_ref_k = overrides.t_ref_k ?? constants_1.T_REF_DEFAULT_K;
    if (overrides.t_ref_k === undefined) {
        assumptions.push({
            field: 't_ref_k',
            value: constants_1.T_REF_DEFAULT_K,
            source: 'default',
            note: 'Reference temperature for exergy calculation per §26.1.',
        });
    }
    return { epsilon_rad, reserve_margin_fraction, t_sink_effective_k, t_ref_k, assumptions };
}
/**
 * Expand all Extension 3A defaults for a scenario packet.
 * Applies §12.1 defaults table exactly. Every injection is recorded
 * in defaults_applied[] with field-path string per §14.1.
 *
 * NOTE: surface_emissivity_bol has NO silent default per §12.1 / §12.2.
 * If absent, the caller must block execution (§13.3 validation).
 *
 * @param overrides - any 3A fields already present in the packet
 * @returns full expanded 3A defaults + audit trail
 */
function expand3ADefaults(overrides) {
    const defaults_applied = [];
    function injectDefault(fieldPath, presentValue, defaultValue) {
        if (presentValue === undefined || presentValue === null) {
            defaults_applied.push(fieldPath);
            return defaultValue;
        }
        return presentValue;
    }
    // ── Scenario-level defaults ──────────────────────────────────────────────
    const enable_model_extension_3a = injectDefault('scenario.enable_model_extension_3a', overrides.enable_model_extension_3a, false);
    const model_extension_3a_mode = injectDefault('scenario.model_extension_3a_mode', overrides.model_extension_3a_mode, 'disabled');
    const topology_validation_policy = injectDefault('scenario.topology_validation_policy', overrides.topology_validation_policy, constants_1.TOPOLOGY_VALIDATION_POLICY_DEFAULT);
    // ── Convergence control sub-object ───────────────────────────────────────
    const cc = overrides.convergence_control ?? {};
    const convergence_control = {
        max_iterations: injectDefault('convergence_control.max_iterations', cc.max_iterations, constants_1.CONVERGENCE_MAX_ITERATIONS_DEFAULT),
        tolerance_abs_w: injectDefault('convergence_control.tolerance_abs_w', cc.tolerance_abs_w, constants_1.CONVERGENCE_TOLERANCE_ABS_W_DEFAULT),
        tolerance_rel_fraction: injectDefault('convergence_control.tolerance_rel_fraction', cc.tolerance_rel_fraction, constants_1.CONVERGENCE_TOLERANCE_REL_FRACTION_DEFAULT),
        runaway_multiplier: injectDefault('convergence_control.runaway_multiplier', cc.runaway_multiplier, constants_1.CONVERGENCE_RUNAWAY_MULTIPLIER_DEFAULT),
        blocking_on_nonconvergence: injectDefault('convergence_control.blocking_on_nonconvergence', cc.blocking_on_nonconvergence, true),
    };
    if (!overrides.convergence_control) {
        defaults_applied.push('convergence_control (full object — all sub-fields defaulted)');
    }
    const defaults_audit_version = injectDefault('scenario.defaults_audit_version', overrides.defaults_audit_version, null);
    return {
        // Scenario-level
        enable_model_extension_3a,
        model_extension_3a_mode,
        topology_validation_policy,
        convergence_control,
        defaults_audit_version,
        // Thermal-zone-level (per-zone, injected by normalizer before validation)
        zone_flow_direction: 'isolated',
        zone_isolation_boundary: false,
        zone_upstream_zone_ref: null,
        zone_downstream_zone_ref: null,
        zone_bridge_resistance_k_per_w: null,
        zone_working_fluid_ref: null,
        zone_pickup_geometry_ref: null,
        zone_convergence_enabled: false,
        zone_resistance_chain: null,
        // Radiator-level (per-radiator, injected by normalizer before validation)
        radiator_geometry_mode: 'single_sided',
        radiator_face_b_area_m2: 0,
        radiator_face_b_view_factor: 0,
        radiator_surface_emissivity_eol_override: null,
        radiator_emissivity_degradation_fraction: null,
        radiator_cavity_emissivity_mode: 'disabled',
        radiator_cavity_view_factor: null,
        radiator_cavity_surface_emissivity: null,
        radiator_background_sink_temp_k_override: null,
        // Audit
        defaults_applied,
    };
}
/**
 * Inject 3A per-zone defaults onto a mutable zone object.
 * Called by extension-3a-normalizer for each zone in thermal_zones[].
 * §12.1 zone-level defaults.
 * Returns array of field paths where defaults were injected.
 */
function injectZone3ADefaults(zone) {
    const injected = [];
    const zoneId = String(zone.zone_id ?? 'unknown');
    function injectField(field, defaultVal) {
        if (zone[field] === undefined || zone[field] === null) {
            zone[field] = defaultVal;
            injected.push(`thermal_zones[${zoneId}].${field}`);
        }
    }
    injectField('flow_direction', 'isolated');
    injectField('isolation_boundary', false);
    injectField('upstream_zone_ref', null);
    injectField('downstream_zone_ref', null);
    injectField('bridge_resistance_k_per_w', null);
    injectField('working_fluid_ref', null);
    injectField('pickup_geometry_ref', null);
    injectField('convergence_enabled', false);
    injectField('resistance_chain', null);
    return injected;
}
/**
 * Inject 3A per-radiator defaults onto a mutable radiator object.
 * Called by extension-3a-normalizer for each radiator.
 * NOTE: surface_emissivity_bol is NOT injected — it has no silent default per §12.2.
 * §12.1 radiator-level defaults.
 * Returns array of field paths where defaults were injected.
 */
function injectRadiator3ADefaults(radiator, radiatorId) {
    const injected = [];
    function injectField(field, defaultVal) {
        if (radiator[field] === undefined || radiator[field] === null) {
            radiator[field] = defaultVal;
            injected.push(`radiator[${radiatorId}].${field}`);
        }
    }
    injectField('geometry_mode', 'single_sided');
    injectField('face_b_area_m2', 0);
    injectField('face_b_view_factor', 0);
    injectField('surface_emissivity_eol_override', null);
    injectField('emissivity_degradation_fraction', null);
    injectField('cavity_emissivity_mode', 'disabled');
    injectField('cavity_view_factor', null);
    injectField('cavity_surface_emissivity', null);
    injectField('background_sink_temp_k_override', null);
    // surface_emissivity_bol: NO default injected per §12.2 — must be explicit
    return injected;
}
//# sourceMappingURL=default-expander.js.map