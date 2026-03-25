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
// ── Extension 3A packet metadata builder — 3A-spec §10.1–§10.2 (WIRE-3A-METADATA-001) ─
import { buildExtension3APacketMetadata, type Extension3APacketMetadataAddition, type RiskSummary } from "../emitters/packet-metadata-emitter";
// ── Extension 3B dispatch — additive per 3B-spec §15.3 ──────────────────────
import { runExtension3B, type Extension3BInput, type Extension3BResult } from "./run-extension-3b";
// ── Extension 4 dispatch — additive per ext4-spec §17.4 ─────────────────────
import { runExtension4, type Extension4Input as Ext4RunnerInput } from "./run-extension-4";
import type { Extension4Result } from "../../types/extension-4.d";

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

export interface MaterialResolved {
  material_family_id: string;
  label: string;
  maturity_class: string;
  nominal_temp_max_k: number | null;
  corrosion_sensitivity: string;
  contamination_sensitivity: string;
  vibration_sensitivity: string;
  estimated_areal_density_kg_per_m2: number | null;
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
  // ── Extension 3B — additive optional dispatch input, 3B-spec §15.3 ────────
  // Present only when enable_model_extension_3b=true on the scenario.
  // Dispatcher order: baseline → 3A → 3B. Result attaches as extension_3b_result.
  extension_3b_input?: Extension3BInput;
  // ── Extension 4 — additive optional dispatch input, ext4-spec §17.4 ────────
  // Present only when enable_model_extension_4=true on the scenario.
  // Dispatcher order: baseline → 3A → 3B → ext4.
  // ext4 reads 3A result if present; reads nothing from 3B for numeric authority.
  extension_4_input?: Ext4RunnerInput;
  // ── Resolved material fields — embedded by state-compiler for risk_summary computation ──
  // spec §22: risk_summary must be runtime-authoritative. Material catalog resolved at
  // compile time by UI, passed through for server-side risk derivation.
  material_resolved?: MaterialResolved | null;
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
  // ── Extension 3A packet metadata — 3A-spec §10.1–§10.2 (WIRE-3A-METADATA-001) ──
  // Present only when extension_3a_input was supplied and runExtension3A ran.
  // Carries topology_report_policy, defaults_audit_version, catalog versions,
  // and generated_artifacts[] per §10.2 visibility requirement.
  extension_3a_packet_metadata?: Extension3APacketMetadataAddition;
  // ── Extension 3B result — additive optional, 3B-spec §15.3 ──────────────
  // Present only when extension_3b_input was supplied and runExtension3B ran.
  // Must not contain copies of baseline_result or extension_3a_result.
  extension_3b_result?: Extension3BResult;
  // ── Extension 4 result — additive optional, ext4-spec §17.4, §6.1 ────────
  // Present only when extension_4_input was supplied and runExtension4 ran.
  // Contains only Extension 4 results. Prior extension result trees not copied.
  extension_4_result?: Extension4Result;
  // ── Risk summary — spec §22 — runtime-authoritative ──────────────────────
  // Computed server-side from resolved material fields + validation + research items.
  // BEST-SOLVE-RISK-001: ttl_class, thermal_cycling_risk, packaging_stress,
  // compactness_stress derived from catalog fields. Approved derivation — see diff log.
  risk_summary: RiskSummary;
}

/**
 * Derive risk_summary from resolved material fields + research items.
 * spec §22: risk fields are runtime-authoritative.
 * BEST-SOLVE-RISK-001: ttl_class, thermal_cycling_risk, packaging_stress,
 * compactness_stress derived from catalog fields — no direct catalog source.
 * Pinned: spec §22, blueprint §23.
 */
function computeRiskSummary(
  material: MaterialResolved | null | undefined,
  research_required_items: string[]
): RiskSummary {
  const maturity_class = material?.maturity_class ?? "no_material_selected";

  // ttl_class — BEST-SOLVE-RISK-001: derived from maturity_class mapping
  const ttl_map: Record<string, string> = {
    flight_proven:        "high",
    flight_proven_analog: "medium_high",
    trl_7_8:              "medium",
    trl_5_6:              "medium_low",
    experimental:         "low",
    unknown:              "unknown",
  };
  const ttl_class = ttl_map[maturity_class] ?? "unknown";

  // thermal_cycling_risk — BEST-SOLVE-RISK-001: derived from maturity + temp ceiling
  const temp_max = material?.nominal_temp_max_k ?? 0;
  let thermal_cycling_risk = "unknown";
  if (material) {
    if (maturity_class === "flight_proven" || maturity_class === "flight_proven_analog") {
      thermal_cycling_risk = temp_max > 1500 ? "medium" : "low";
    } else if (maturity_class === "experimental") {
      thermal_cycling_risk = "high";
    } else {
      thermal_cycling_risk = "medium";
    }
  }

  // corrosion, contamination, vibration — direct from catalog sensitivity fields
  const corrosion_risk     = material?.corrosion_sensitivity     ?? "unknown";
  const contamination_risk = material?.contamination_sensitivity ?? "unknown";
  const vibration_risk     = material?.vibration_sensitivity     ?? "unknown";

  // packaging_stress — BEST-SOLVE-RISK-001: derived from areal density
  const density = material?.estimated_areal_density_kg_per_m2 ?? null;
  const packaging_stress = density === null ? "unknown"
    : density < 4   ? "low"
    : density <= 10 ? "medium"
    : "high";

  // compactness_stress — BEST-SOLVE-RISK-001: derived from areal density
  const compactness_stress = density === null ? "unknown"
    : density < 4  ? "low"
    : density <= 8 ? "medium"
    : "high";

  return {
    maturity_class,
    ttl_class,
    thermal_cycling_risk,
    corrosion_risk,
    contamination_risk,
    vibration_risk,
    packaging_stress,
    compactness_stress,
    research_required_items,
  };
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
  let extension_3a_packet_metadata: Extension3APacketMetadataAddition | undefined;
  if (input.extension_3a_input !== undefined) {
    extension_3a_result = runExtension3A(input.extension_3a_input);
    transform_trace.push(
      `extension-3a: enabled=${extension_3a_result.extension_3a_enabled}` +
      ` topology_valid=${extension_3a_result.topology_valid}` +
      ` convergence_status=${extension_3a_result.convergence_status}` +
      ` blocking_errors=${extension_3a_result.blocking_errors.length}`
    );
    // §10.1–§10.2: build packet metadata envelope (WIRE-3A-METADATA-001)
    // catalog versions pulled from catalogs input if present; graceful null fallback
    const cats = input.extension_3a_input.catalogs;
    extension_3a_packet_metadata = buildExtension3APacketMetadata({
      enable_model_extension_3a: extension_3a_result.extension_3a_enabled,
      model_extension_3a_mode: extension_3a_result.model_extension_3a_mode,
      topology_report_policy: extension_3a_result.topology_report_policy,
      defaults_audit_version: extension_3a_result.defaults_audit_version,
      working_fluids_catalog_version: cats?.working_fluid_catalog?.catalog_version ?? null,
      pickup_geometries_catalog_version: cats?.pickup_geometry_catalog?.catalog_version ?? null,
    });
    transform_trace.push(
      `extension-3a-metadata: artifacts=${extension_3a_packet_metadata.generated_artifacts_3a.length}` +
      ` defaults_audit_version=${extension_3a_packet_metadata.defaults_audit_version ?? 'null'}`
    );
  }

  // ── Extension 3B dispatch — 3B-spec §15.3 ───────────────────────────────
  // Purely additive. Baseline and 3A paths above are untouched.
  // Runs only when caller supplies extension_3b_input.
  // Dispatcher order enforced: baseline → 3A → 3B.
  // Result attaches under extension_3b_result only; must not mutate
  // baseline_result or extension_3a_result (3B-spec §14, blueprint §4.3).
  let extension_3b_result: Extension3BResult | undefined;
  if (input.extension_3b_input !== undefined) {
    // Wire 3A outputs into the 3B baseline-or-3A context per spec §14A
    const b3bInput: Extension3BInput = {
      ...input.extension_3b_input,
      baselineOr3AContext: {
        extension3AResult: (extension_3a_result ?? null) as Record<string, unknown> | null,
        radiatorResult: (radiator_result ?? null) as unknown as Record<string, unknown> | null,
        aggregationResult: (aggregation_result ?? null) as unknown as Record<string, unknown> | null,
      },
    };
    extension_3b_result = runExtension3B(b3bInput);
    transform_trace.push(
      `extension-3b: enabled=${extension_3b_result.extension_3b_enabled}` +
      ` mode=${extension_3b_result.model_extension_3b_mode}` +
      ` blocking_errors=${extension_3b_result.blocking_errors.length}` +
      ` q_dot_total_reject_3b_w=${extension_3b_result.q_dot_total_reject_3b_w}`
    );
  }

  // ── Extension 4 dispatch — ext4-spec §17.4 ───────────────────────────────
  // Dispatcher order step 5: baseline → ext2 → ext3A → ext3B → ext4.
  // Purely additive. Baseline and 3A/3B paths above are untouched.
  // Runs only when caller supplies extension_4_input.
  // ext4 reads 3A result if present; reads nothing from 3B for numeric authority
  // (ext4-spec §8.5). Result attaches under extension_4_result only.
  let extension_4_result: Extension4Result | undefined;
  if (input.extension_4_input !== undefined) {
    // Wire 3A result into ext4 input per §8.2
    const ext4Input: Ext4RunnerInput = {
      ...input.extension_4_input,
      extension_3a_result: (extension_3a_result ?? null) as Ext4RunnerInput['extension_3a_result'],
    };
    extension_4_result = runExtension4(ext4Input);
    transform_trace.push(
      `extension-4: enabled=${extension_4_result.extension_4_enabled}` +
      ` mode=${extension_4_result.model_extension_4_mode}` +
      ` convergence_status=${extension_4_result.convergence_status}` +
      ` blocking_errors=${extension_4_result.blocking_errors.length}` +
      ` q_rad_net_w=${extension_4_result.q_rad_net_w}`
    );
  }

  // Compute risk_summary — spec §22, BEST-SOLVE-RISK-001
  const risk_summary = computeRiskSummary(input.material_resolved, input.research_required_items);

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
    risk_summary,
    ...(extension_3a_result !== undefined ? { extension_3a_result } : {}),
    ...(extension_3a_packet_metadata !== undefined ? { extension_3a_packet_metadata } : {}),
    ...(extension_3b_result !== undefined ? { extension_3b_result } : {}),
    ...(extension_4_result !== undefined ? { extension_4_result } : {}),
  };
}
