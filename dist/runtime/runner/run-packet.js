"use strict";
/**
 * Run-packet runner — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.5, §27; ui-expansion-spec-v0.1.5 §24
 *
 * Executes a scenario against the runtime formula family.
 * All outputs from this module are authoritative.
 * UI preview values are display-only and subordinate to these results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeRunPacket = executeRunPacket;
const scenario_aggregation_1 = require("../transforms/scenario-aggregation");
const radiation_1 = require("../formulas/radiation");
const bounds_1 = require("../validators/bounds");
const power_cycle_1 = require("../formulas/power-cycle");
const constants_1 = require("../constants/constants");
// ── Extension 3A dispatch — additive per spec §14.1, DIFF-3A-EXT2-COHABIT-001 ─
const run_extension_3a_1 = require("./run-extension-3a");
/**
 * Execute a run packet through all runtime steps per spec §27.
 */
function executeRunPacket(input) {
    const transform_trace = [];
    // Step 1–4: load, normalize, validate, load-state resolution (via aggregation)
    const aggregation_result = (0, scenario_aggregation_1.aggregateScenario)(input.aggregation);
    transform_trace.push(...aggregation_result.transform_trace);
    // Step 9: radiator sizing
    const radiator_result = (0, radiation_1.radiatorEffectiveArea)(input.radiator);
    transform_trace.push(`radiator-sizing: Q=${input.radiator.q_dot_w} W T=${input.radiator.t_radiator_target_k} K ` +
        `A_eff=${radiator_result.a_radiator_effective_m2.toFixed(4)} m² A_margin=${radiator_result.a_with_margin_m2.toFixed(4)} m²`);
    // Step 8: branch validation
    const branch_validations = [];
    const branch_mode_labels = [];
    let t_hot_for_validation;
    let t_cold_for_validation;
    let heat_lift_has_source = false;
    let heat_lift_research_required = false;
    for (const branch of input.branches) {
        branch_mode_labels.push(branch.mode_label);
        if (branch.mode_label === "power_cycle" && branch.requires_carnot_check) {
            const r = (0, power_cycle_1.validatePowerCycleEfficiency)(branch.efficiency_or_cop, branch.t_hot_source_k, branch.t_cold_sink_k);
            branch_validations.push({ branch_id: branch.branch_id, valid: r.valid, message: r.violation_message });
            t_hot_for_validation = branch.t_hot_source_k;
            t_cold_for_validation = branch.t_cold_sink_k;
        }
        else if (branch.mode_label === "heat_lift" && branch.requires_carnot_check) {
            const r = (0, power_cycle_1.validateHeatLiftCop)(branch.efficiency_or_cop, branch.t_hot_source_k, branch.t_cold_sink_k);
            branch_validations.push({ branch_id: branch.branch_id, valid: r.valid, message: r.violation_message });
        }
        else {
            branch_validations.push({ branch_id: branch.branch_id, valid: true });
        }
        if (branch.mode_label === "heat_lift") {
            const uplift = (0, power_cycle_1.checkNoSilentUplift)({
                mode_label: branch.mode_label,
                work_input_w: branch.work_input_w,
                external_heat_input_w: branch.external_heat_input_w,
                storage_drawdown_w: branch.storage_drawdown_w,
                research_required: branch.research_required,
            });
            heat_lift_has_source = uplift.compliant;
            heat_lift_research_required = branch.research_required;
        }
    }
    // Step 10: validation
    const validation = (0, bounds_1.validatePacketForExport)({
        scenario_id: input.scenario_id,
        packet_id: input.packet_id,
        device_count: input.aggregation.device_count,
        power_fields: [
            input.aggregation.w_dot_memory_w,
            input.aggregation.w_dot_storage_w,
            input.aggregation.w_dot_network_w,
            input.aggregation.w_dot_power_conversion_w,
            input.aggregation.w_dot_control_w,
            input.aggregation.w_dot_non_compute_total_w,
        ],
        radiator_target_temp_k: input.radiator.t_radiator_target_k,
        emissivity: input.radiator.emissivity,
        view_factor: input.radiator.view_factor,
        branch_mode_labels,
        t_hot_source_k: t_hot_for_validation,
        t_cold_sink_k: t_cold_for_validation,
        heat_lift_has_source_term: heat_lift_has_source,
        heat_lift_research_required,
        has_speculative_device: input.has_speculative_device,
        has_speculative_material: input.has_speculative_material,
        has_solar_polish_without_source: input.has_solar_polish_without_source,
        has_per_subsystem_duty_simplification: input.has_per_subsystem_duty_simplification,
        research_required_items: input.research_required_items,
    });
    transform_trace.push(`validation: blocking=${validation.blocking.length} warnings=${validation.warnings.length}`);
    // ── Extension 3A dispatch — spec §14.1, DIFF-3A-EXT2-COHABIT-001 ─────────
    // Purely additive. Extension-2 path above is untouched.
    // Runs only when caller supplies extension_3a_input (i.e. scenario has
    // enable_model_extension_3a=true). Result attaches as extension_3a_result.
    let extension_3a_result;
    if (input.extension_3a_input !== undefined) {
        extension_3a_result = (0, run_extension_3a_1.runExtension3A)(input.extension_3a_input);
        transform_trace.push(`extension-3a: enabled=${extension_3a_result.extension_3a_enabled}` +
            ` topology_valid=${extension_3a_result.topology_valid}` +
            ` convergence_status=${extension_3a_result.convergence_status}` +
            ` blocking_errors=${extension_3a_result.blocking_errors.length}`);
    }
    return {
        packet_id: input.packet_id,
        scenario_id: input.scenario_id,
        aggregation_result,
        radiator_result,
        branch_validations,
        validation,
        transform_trace,
        runtime_authority_declaration: "runtime",
        versions: constants_1.RUNTIME_VERSIONS,
        ...(extension_3a_result !== undefined ? { extension_3a_result } : {}),
    };
}
//# sourceMappingURL=run-packet.js.map