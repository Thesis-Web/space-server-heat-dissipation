/**
 * Run-packet runner — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.5, §27; ui-expansion-spec-v0.1.5 §24
 *
 * Executes a scenario against the runtime formula family.
 * All outputs from this module are authoritative.
 * UI preview values are display-only and subordinate to these results.
 */

import { aggregateScenario, type ScenarioAggregationInput } from "../transforms/scenario-aggregation";
import { radiatorEffectiveArea, type RadiatorSizingInput } from "../formulas/radiation";
import { validatePacketForExport, type ValidationResult } from "../validators/bounds";
import { validatePowerCycleEfficiency, validateHeatLiftCop, checkNoSilentUplift } from "../formulas/power-cycle";
import { RUNTIME_VERSIONS } from "../constants/constants";
// ── Extension 3A dispatch — additive per spec §14.1, DIFF-3A-EXT2-COHABIT-001 ─
import { runExtension3A, type Extension3AInput, type Extension3AResult } from "./run-extension-3a";

export interface BranchInput {
  branch_id: string;
  mode_label: string;
  t_hot_source_k: number;
  t_cold_sink_k: number;
  efficiency_or_cop: number;
  requires_carnot_check: boolean;
  work_input_w: number;
  external_heat_input_w: number;
  storage_drawdown_w: number;
  research_required: boolean;
}

export interface RunPacketInput {
  packet_id: string;
  scenario_id: string;
  aggregation: ScenarioAggregationInput;
  radiator: RadiatorSizingInput;
  branches: BranchInput[];
  research_required_items: string[];
  has_speculative_device: boolean;
  has_speculative_material: boolean;
  has_solar_polish_without_source: boolean;
  has_per_subsystem_duty_simplification: boolean;
  // ── Extension 3A — additive optional dispatch input, spec §14.1 ──────────
  // Present only when enable_model_extension_3a=true on the scenario.
  // If absent the 3A runner is not called and baseline path is unchanged.
  extension_3a_input?: Extension3AInput;
}

export interface RunPacketOutput {
  packet_id: string;
  scenario_id: string;
  aggregation_result: ReturnType<typeof aggregateScenario>;
  radiator_result: ReturnType<typeof radiatorEffectiveArea>;
  branch_validations: Array<{ branch_id: string; valid: boolean; message?: string }>;
  validation: ValidationResult;
  transform_trace: string[];
  runtime_authority_declaration: "runtime";
  versions: typeof RUNTIME_VERSIONS;
  // ── Extension 3A result — additive optional, spec §14.1 ─────────────────
  // Present only when extension_3a_input was supplied and runExtension3A ran.
  extension_3a_result?: Extension3AResult;
}

/**
 * Execute a run packet through all runtime steps per spec §27.
 */
export function executeRunPacket(input: RunPacketInput): RunPacketOutput {
  const transform_trace: string[] = [];

  // Step 1–4: load, normalize, validate, load-state resolution (via aggregation)
  const aggregation_result = aggregateScenario(input.aggregation);
  transform_trace.push(...aggregation_result.transform_trace);

  // Step 9: radiator sizing
  const radiator_result = radiatorEffectiveArea(input.radiator);
  transform_trace.push(
    `radiator-sizing: Q=${input.radiator.q_dot_w} W T=${input.radiator.t_radiator_target_k} K ` +
    `A_eff=${radiator_result.a_radiator_effective_m2.toFixed(4)} m² A_margin=${radiator_result.a_with_margin_m2.toFixed(4)} m²`
  );

  // Step 8: branch validation
  const branch_validations: RunPacketOutput["branch_validations"] = [];
  const branch_mode_labels: string[] = [];
  let t_hot_for_validation: number | undefined;
  let t_cold_for_validation: number | undefined;
  let heat_lift_has_source = false;
  let heat_lift_research_required = false;

  for (const branch of input.branches) {
    branch_mode_labels.push(branch.mode_label);

    if (branch.mode_label === "power_cycle" && branch.requires_carnot_check) {
      const r = validatePowerCycleEfficiency(branch.efficiency_or_cop, branch.t_hot_source_k, branch.t_cold_sink_k);
      branch_validations.push({ branch_id: branch.branch_id, valid: r.valid, message: r.violation_message });
      t_hot_for_validation = branch.t_hot_source_k;
      t_cold_for_validation = branch.t_cold_sink_k;
    } else if (branch.mode_label === "heat_lift" && branch.requires_carnot_check) {
      const r = validateHeatLiftCop(branch.efficiency_or_cop, branch.t_hot_source_k, branch.t_cold_sink_k);
      branch_validations.push({ branch_id: branch.branch_id, valid: r.valid, message: r.violation_message });
    } else {
      branch_validations.push({ branch_id: branch.branch_id, valid: true });
    }

    if (branch.mode_label === "heat_lift") {
      const uplift = checkNoSilentUplift({
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
  const validation = validatePacketForExport({
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
  let extension_3a_result: Extension3AResult | undefined;
  if (input.extension_3a_input !== undefined) {
    extension_3a_result = runExtension3A(input.extension_3a_input);
    transform_trace.push(
      `extension-3a: enabled=${extension_3a_result.extension_3a_enabled}` +
      ` topology_valid=${extension_3a_result.topology_valid}` +
      ` convergence_status=${extension_3a_result.convergence_status}` +
      ` blocking_errors=${extension_3a_result.blocking_errors.length}`
    );
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
    versions: RUNTIME_VERSIONS,
    ...(extension_3a_result !== undefined ? { extension_3a_result } : {}),
  };
}
