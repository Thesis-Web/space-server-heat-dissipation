/**
 * state-compiler.js — compiles UI state to canonical payload files
 * Governing law: ui-expansion-spec-v0.1.5 §5.3, §9.3–9.5, §19, §20, §24
 *
 * The UI state model is an intermediate representation.
 * This module serialises it to the canonical runtime payload family.
 * All generated compatibility artifacts are disclosed in transform_trace.
 * No solver arithmetic is performed here; all engineering outputs are runtime-authoritative.
 */

"use strict";

import { generatedCommsLoadId, packetId, scenarioIdFromSeed } from "./id-utils.js";

/**
 * Resolve duty factor for a payload block.
 * Spec §9.3.
 */
function dutyFactor(block) {
  if (block.duty_mode === "continuous") return 1.0;
  return block.duty_fraction ?? 1.0;
}

/**
 * Compile additive payload blocks to a canonical comms-load aggregate.
 * Spec §9.3–9.5: aggregation transform + generated file disclosure.
 * Returns { comms_load_object, transform_trace_entry, has_per_subsystem }
 */
export function compilePayloadBlocks(blocks, schema_version) {
  let rf = 0, tel = 0, radar = 0, opt = 0;
  let has_per_subsystem = false;

  for (const b of blocks) {
    const df = dutyFactor(b);
    rf    += (b.rf_comms_power_w ?? 0) * df;
    tel   += (b.telemetry_power_w ?? 0) * df;
    radar += (b.radar_power_w ?? 0) * df;
    opt   += (b.optical_crosslink_power_w ?? 0) * df;
    if (b.duty_mode === "per_subsystem") has_per_subsystem = true;
  }

  const block_ids = blocks.map((b) => b.payload_block_id);
  const block_values_json = JSON.stringify(blocks.map((b) => [b.rf_comms_power_w, b.telemetry_power_w, b.radar_power_w, b.optical_crosslink_power_w, b.duty_mode, b.duty_fraction]));
  const payload_id = generatedCommsLoadId(block_ids, block_values_json, schema_version);

  const comms_load_object = {
    payload_id,
    label: "Generated aggregate non-compute payload",
    rf_comms_power_w: rf,
    telemetry_power_w: tel,
    radar_power_w: radar,
    optical_crosslink_power_w: opt,
    duty_mode: "continuous",
    duty_fraction: 1.0,
    generated_from_additive_blocks: true,
    source_block_ids: block_ids,
  };

  const trace = `additive-payload-aggregation: ${blocks.length} block(s) → ${payload_id}` +
    (has_per_subsystem ? " [per_subsystem simplified to aggregate duty_fraction]" : "");

  return { comms_load_object, transform_trace_entry: trace, has_per_subsystem };
}

/**
 * Serialise complete UI state to the canonical payload file set.
 * Returns { files: [{name, content}], transform_trace: string[], warnings: string[] }
 *
 * Spec §24.1: bundle must include scenario.json, run-packet.json, scenario-summary.md,
 * plus generated aggregate payload file if additive UI payload mode used.
 */
export function compileStateToPayloads(state, catalogs) {
  const transform_trace = [];
  const warnings = [];

  // scenario-id
  const scenario_id = state.scenario_id ||
    scenarioIdFromSeed(state.scenario_preset_id || "custom", state.node_class || "custom", state.mission_mode || "full_compute", state.architecture_class || "custom");

  // catalog preset trace
  if (state.scenario_preset_id && state.scenario_preset_id !== "custom_blank") {
    transform_trace.push(`scenario-preset-application: preset=${state.scenario_preset_id}`);
  }
  if (state.compute_device_preset_id) {
    transform_trace.push(`compute-device-preset-application: preset=${state.compute_device_preset_id}`);
  }

  // payload compilation
  let comms_load_ref = state.comms_load_ref || "";
  let generated_aggregate_ref = "";
  const extra_files = [];

  if (state.non_compute_payload_blocks && state.non_compute_payload_blocks.length > 0) {
    const { comms_load_object, transform_trace_entry, has_per_subsystem } = compilePayloadBlocks(state.non_compute_payload_blocks, "v0.1.5");
    transform_trace.push(transform_trace_entry);
    if (has_per_subsystem) warnings.push("Per-subsystem duty mode simplified to aggregate duty fraction for compatibility export");
    comms_load_ref = comms_load_object.payload_id;
    generated_aggregate_ref = comms_load_object.payload_id;
    const fname = `${comms_load_object.payload_id}.json`;
    extra_files.push({ name: fname, content: JSON.stringify(comms_load_object, null, 2) });
    transform_trace.push(`generated-compatibility-artifact: ${fname}`);
  }

  // schema normalisation trace
  transform_trace.push("schema-normalisation: v0.1.5");

  // scenario object
  const scenario = {
    scenario_id,
    scenario_version: "v0.1.5",
    label: state.label || scenario_id,
    orbit_class: state.orbit_class || "GEO",
    mission_mode: state.mission_mode || "full_compute",
    node_class: state.node_class || "custom",
    architecture_class: state.architecture_class || "custom",
    thermal_policy_id: state.thermal_policy_id || "default",
    compute_module_ref: state.compute_module_ref || "",
    non_compute_load_ref: comms_load_ref,
    thermal_architecture_ref: state.thermal_architecture_ref || "",
    selected_branches: state.selected_branches || [],
    radiator_ref: state.radiator_ref || "",
    storage_ref: state.storage_ref || "",
    comms_load_ref,
    assumptions: state.assumptions || [],
    scenario_preset_id: state.scenario_preset_id,
    scenario_preset_version: "v0.1.0",
    non_compute_payload_refs: (state.non_compute_payload_blocks || []).map((b) => b.payload_block_id),
    branch_block_refs: (state.branch_blocks || []).map((b) => b.branch_block_id),
    generated_aggregate_payload_ref: generated_aggregate_ref,
    transform_trace,
    research_required_items: state.research_required_items || [],
  };

  const scenario_content = JSON.stringify(scenario, null, 2);
  const ts = new Date().toISOString();
  const pkt_id = packetId(scenario_id, ts);

  const payload_file_refs = [
    "scenario.json",
    ...(generated_aggregate_ref ? [`${generated_aggregate_ref}.json`] : []),
  ];

  const all_files_for_manifest = [
    { name: "scenario.json", content: scenario_content },
    ...extra_files,
  ];

  // run-packet
  const run_packet = {
    packet_id: pkt_id,
    schema_version: "v0.1.5",
    blueprint_version: "v0.1.1",
    engineering_spec_version: "v0.1.0",
    scenario_ref: "scenario.json",
    payload_file_refs,
    operator_notes: state.operator_notes || "",
    requested_outputs: ["radiator_sizing", "load_summary", "flag_report"],
    branch_selection_summary: (state.selected_branches || []).join(", ") || "none",
    comparison_requests: [],
    ai_role_instructions: "Execute this packet against the authoritative runtime formula family. All outputs are runtime-authoritative.",
    runtime_authority_declaration: "runtime",
    file_manifest: all_files_for_manifest.map((f) => ({ name: f.name, byte_length: new TextEncoder().encode(f.content).length })),
    catalog_ids_used: Object.keys(catalogs || {}),
    catalog_versions_used: Object.fromEntries(Object.entries(catalogs || {}).map(([k, v]) => [k, v.catalog_version || "unknown"])),
    catalog_checksums_sha256: {},
    transform_trace,
    branding_metadata: state.branding_metadata || {},
    validation_summary: state.validation_summary || {},
    risk_summary: state.risk_summary || {},
    research_required_items: state.research_required_items || [],
  };

  const run_packet_content = JSON.stringify(run_packet, null, 2);

  const files = [
    { name: "scenario.json", content: scenario_content },
    { name: "run-packet.json", content: run_packet_content },
    ...extra_files,
  ];

  return { files, transform_trace, warnings, scenario_id, packet_id: pkt_id };
}
