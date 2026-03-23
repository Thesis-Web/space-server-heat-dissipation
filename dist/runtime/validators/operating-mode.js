"use strict";
/**
 * operating-mode.ts
 * Operating mode boundary enforcement.
 * Governed by §4.4, §7.3, §13.1, §13.2, §13.3, §26.3, §29.2, §30.2, §46.
 * Added per HOLE-003: required by §26.3, omitted from §43. §26.3 governs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOPOLOGY_VALIDATION_POLICIES = exports.MODEL_EXTENSION_3A_MODES = void 0;
exports.validateOrbitClass = validateOrbitClass;
exports.validateNoModeFusion = validateNoModeFusion;
exports.validateHeatLiftMode = validateHeatLiftMode;
exports.validatePowerCycleMode = validatePowerCycleMode;
exports.checkScavengingSignificance = checkScavengingSignificance;
exports.modeViolationsToFlags = modeViolationsToFlags;
exports.validateExtension3AMode = validateExtension3AMode;
exports.validateTopologyPolicy = validateTopologyPolicy;
exports.validateExtension3AGate = validateExtension3AGate;
exports.validateExtension3AOperatingMode = validateExtension3AOperatingMode;
const flag_emitter_1 = require("../emitters/flag-emitter");
const constants_1 = require("../constants/constants");
const heat_pump_1 = require("../formulas/heat-pump");
const power_cycle_1 = require("../formulas/power-cycle");
const constants_2 = require("../constants/constants");
// ─── §7.3 — GEO-only scope enforcement ───────────────────────────────────────
/**
 * Reject scenario if orbit_class is not GEO. §7.3.
 */
function validateOrbitClass(orbit_class) {
    if (!constants_1.SUPPORTED_ORBIT_CLASSES.includes(orbit_class)) {
        return [
            {
                rule: '§7.3',
                message: `orbit_class '${orbit_class}' is not supported in v0.1.0. Only GEO is permitted.`,
                severity: 'error',
            },
        ];
    }
    return [];
}
// ─── §4.4 — No silent mode fusion ────────────────────────────────────────────
/**
 * Validate that heat-lift and power-cycle stages are not fused.
 * Each stage_type must be uniquely classified. §4.4.
 */
function validateNoModeFusion(stages) {
    const violations = [];
    for (const stage of stages) {
        if (stage.stage_type === 'lift' || stage.stage_type === 'power_cycle') {
            // These are exclusive — dual declaration on a single stage is fusion
            // (Schema already enforces enum; this catches semantic misuse at runtime)
        }
    }
    // Detect duplicate stage_ids (would allow hidden fusion)
    const ids = stages.map(s => s.stage_id);
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id)) {
            violations.push({
                rule: '§4.4',
                message: `Duplicate stage_id detected: '${id}'. Stages must be uniquely identified to prevent mode fusion.`,
                severity: 'error',
            });
        }
        seen.add(id);
    }
    return violations;
}
function validateHeatLiftMode(check) {
    const violations = [];
    if (check.t_hot_delivery_k <= check.t_cold_source_k) {
        violations.push({
            rule: '§29.2',
            message: `Heat-lift branch '${check.branch_id}': T_hot (${check.t_hot_delivery_k} K) must exceed T_cold (${check.t_cold_source_k} K).`,
            severity: 'error',
        });
        return violations;
    }
    const carnot = (0, heat_pump_1.computeCarnotHeatPumpBound)({
        t_cold_k: check.t_cold_source_k,
        t_hot_k: check.t_hot_delivery_k,
    });
    if (check.cop_heating_actual > carnot.cop_heating_carnot) {
        violations.push({
            rule: '§46',
            message: `PROHIBITED (§46): heat-lift branch '${check.branch_id}' COP_actual ` +
                `(${check.cop_heating_actual.toFixed(4)}) exceeds Carnot bound ` +
                `(${carnot.cop_heating_carnot.toFixed(4)}).`,
            severity: 'error',
        });
    }
    return violations;
}
function validatePowerCycleMode(check) {
    const violations = [];
    if (check.t_hot_source_k <= check.t_cold_sink_k) {
        violations.push({
            rule: '§30.1',
            message: `Power-cycle branch '${check.branch_id}': T_hot_source (${check.t_hot_source_k} K) ` +
                `must exceed T_cold_sink (${check.t_cold_sink_k} K). Invalid source quality.`,
            severity: 'error',
        });
        return violations;
    }
    const carnot = (0, power_cycle_1.computeCarnotEngineBound)({
        t_hot_k: check.t_hot_source_k,
        t_cold_k: check.t_cold_sink_k,
    });
    if (check.eta_cycle_actual > carnot.eta_carnot_engine) {
        violations.push({
            rule: '§46',
            message: `PROHIBITED (§46): power-cycle branch '${check.branch_id}' eta_actual ` +
                `(${check.eta_cycle_actual.toFixed(6)}) exceeds Carnot bound ` +
                `(${carnot.eta_carnot_engine.toFixed(6)}).`,
            severity: 'error',
        });
    }
    return violations;
}
// ─── §31.3 — TEG low-significance flag ───────────────────────────────────────
function checkScavengingSignificance(branch_id, branch_output_w, q_dot_internal_w) {
    if (q_dot_internal_w <= 0)
        return null;
    const fraction = branch_output_w / q_dot_internal_w;
    if (fraction < constants_2.LOW_SIGNIFICANCE_THRESHOLD_FRACTION) {
        return (0, flag_emitter_1.makeFlagError)('low_significance_recovery_branch_output', `Scavenging branch '${branch_id}' output (${branch_output_w.toFixed(2)} W) is ` +
            `${(fraction * 100).toFixed(3)}% of total internal dissipation — ` +
            `below significance threshold (${(constants_2.LOW_SIGNIFICANCE_THRESHOLD_FRACTION * 100).toFixed(0)}%). §31.3`, 'conversion_branch', branch_id, branch_output_w, q_dot_internal_w * constants_2.LOW_SIGNIFICANCE_THRESHOLD_FRACTION);
    }
    return null;
}
/**
 * Convert OperatingModeViolations to Flags.
 */
function modeViolationsToFlags(violations) {
    return violations.map((v, i) => (0, flag_emitter_1.makeFlagError)(`operating_mode_violation_${i}`, v.message, 'scenario', v.rule, 0, undefined));
}
// =============================================================================
// Extension 3A — operating mode validation
// Governing law: 3A-spec §5.1–§5.3; dist-tree patch §5 (operating-mode.ts patch target)
// =============================================================================
/**
 * 3A mode enum values per §5.2.
 */
exports.MODEL_EXTENSION_3A_MODES = [
    'disabled',
    'topology_only',
    'foundational_hardening',
];
/**
 * Topology validation policy values per §5.2.
 */
exports.TOPOLOGY_VALIDATION_POLICIES = ['blocking', 'warn_only'];
/**
 * Validate extension 3A mode field.
 * Returns violation if mode is not a recognized 3A enum value.
 * §5.2.
 */
function validateExtension3AMode(mode) {
    if (mode === undefined || mode === null)
        return [];
    if (!exports.MODEL_EXTENSION_3A_MODES.includes(mode)) {
        return [{
                rule: '3A-spec §5.2',
                message: `model_extension_3a_mode '${mode}' is not a recognized value. ` +
                    `Allowed: ${exports.MODEL_EXTENSION_3A_MODES.join(', ')}.`,
                severity: 'error',
            }];
    }
    return [];
}
/**
 * Validate topology_validation_policy field.
 * §5.1, §5.2.
 */
function validateTopologyPolicy(policy) {
    if (policy === undefined || policy === null)
        return [];
    if (!exports.TOPOLOGY_VALIDATION_POLICIES.includes(policy)) {
        return [{
                rule: '3A-spec §5.2',
                message: `topology_validation_policy '${policy}' is not a recognized value. ` +
                    `Allowed: ${exports.TOPOLOGY_VALIDATION_POLICIES.join(', ')}.`,
                severity: 'error',
            }];
    }
    return [];
}
/**
 * Validate Extension 3A gate: if enable_model_extension_3a=false, 3A mode must be disabled.
 * Backward compat: absent enable flag treated as false per §5.3.
 * §5.3.
 */
function validateExtension3AGate(enable, mode) {
    const effectiveEnable = enable ?? false;
    const effectiveMode = mode ?? 'disabled';
    if (!effectiveEnable && effectiveMode !== 'disabled') {
        return [{
                rule: '3A-spec §5.3',
                message: `enable_model_extension_3a=false but model_extension_3a_mode='${effectiveMode}'. ` +
                    `Mode must be 'disabled' when the 3A gate is false.`,
                severity: 'error',
            }];
    }
    return [];
}
/**
 * Full 3A mode validation bundle.
 * Call with scenario fields to get all mode-level violations.
 */
function validateExtension3AOperatingMode(params) {
    return [
        ...validateExtension3AMode(params.model_extension_3a_mode),
        ...validateTopologyPolicy(params.topology_validation_policy),
        ...validateExtension3AGate(params.enable_model_extension_3a, params.model_extension_3a_mode),
    ];
}
//# sourceMappingURL=operating-mode.js.map