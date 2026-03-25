/**
 * state-compiler.js — compiles UI state to canonical payload files
 * Governing law: ui-expansion-spec-v0.1.5 §5.3, §9.3–9.5, §19, §20, §24
 * 3B-spec §16: 3B fields compiled into canonical payload objects only.
 *   No browser-only hidden 3B state permitted (§16.1).
 *   Preset-loaded values remain visible and editable (§16.2).
 *   Preset provenance emitted on payload and run packet (§16.3).
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

  // --- UI-FIX-001: emit compute-module-01.json and radiator-01.json ---
  const compute_module_obj = {
    compute_module_id: "compute-module-01",
    schema_version: "v0.1.5",
    compute_device_preset_id: state.compute_device_preset_id || null,
    device_type: state.device_type || null,
    device_count: state.device_count || 1,
    power_idle_w: state.power_idle_w ?? 0,
    power_light_w: state.power_light_w ?? 0,
    power_medium_w: state.power_medium_w ?? 0,
    power_full_w: state.power_full_w ?? 0,
    target_load_state: state.target_load_state || "full",
    redundancy_mode: state.redundancy_mode || "none",
    cooling_pickup_class: state.cooling_pickup_class || null,
    pickup_geometry: state.pickup_geometry || null,
    memory_power_w: state.memory_power_w ?? 0,
    storage_power_w: state.storage_power_w ?? 0,
    network_power_w: state.network_power_w ?? 0,
    power_conversion_overhead_w: state.power_conversion_overhead_w ?? 0,
    control_overhead_w: state.control_overhead_w ?? 0,
  };
  const compute_module_content = JSON.stringify(compute_module_obj, null, 2);
  extra_files.push({ name: "compute-module-01.json", content: compute_module_content });
  transform_trace.push("emitted-canonical-file: compute-module-01.json");

  // Resolve material catalog entry — embedded into run_packet for runtime risk_summary
  // spec §22: risk fields must be runtime-authoritative, derived from resolved material.
  // BEST-SOLVE-RISK-001: ttl_class, thermal_cycling_risk, packaging_stress, compactness_stress
  // derived from available catalog fields — no direct catalog source. See diff/hole log.
  const _matCat = catalogs && catalogs["material-families"];
  const _matEntry = (_matCat && Array.isArray(_matCat.entries))
    ? _matCat.entries.find(e => e.material_family_id === (state.radiator_material_family_ref || ""))
    : null;
  const _matResolved = _matEntry ? {
    material_family_id:                _matEntry.material_family_id,
    label:                             _matEntry.label,
    maturity_class:                    _matEntry.maturity_class || "unknown",
    nominal_temp_max_k:                _matEntry.nominal_temp_max_k ?? null,
    corrosion_sensitivity:             _matEntry.corrosion_sensitivity || "unknown",
    contamination_sensitivity:         _matEntry.contamination_sensitivity || "unknown",
    vibration_sensitivity:             _matEntry.vibration_sensitivity || "unknown",
    estimated_areal_density_kg_per_m2: _matEntry.estimated_areal_density_kg_per_m2 ?? null,
    research_required:                 _matEntry.research_required ?? false,
    // Option 2 catalog fields — spec §22, catalog v0.1.1
    ttl_class:             _matEntry.ttl_class             || "unknown",
    thermal_cycling_risk:  _matEntry.thermal_cycling_risk  || "unknown",
    packaging_stress:      _matEntry.packaging_stress      || "unknown",
    compactness_stress:    _matEntry.compactness_stress    || "unknown",
  } : null;

  const radiator_obj = {
    radiator_id: "radiator-01",
    schema_version: "v0.1.5",
    emissivity: state.emissivity ?? 0.9,
    target_surface_temp_k: state.target_surface_temp_k ?? 0,
    sink_temp_k: state.sink_temp_k ?? 0,
    reserve_margin_fraction: state.reserve_margin_fraction ?? 0.15,
    material_family_ref: state.radiator_material_family_ref || null,
    geometry_class: state.radiator_geometry_class || null,
  };
  const radiator_content = JSON.stringify(radiator_obj, null, 2);
  extra_files.push({ name: "radiator-01.json", content: radiator_content });
  transform_trace.push("emitted-canonical-file: radiator-01.json");

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
    // ── Extension 3B scenario fields — 3B-spec §16.1 ─────────────────────────
    // All 3B fields emitted into canonical payload. No browser-only hidden state.
    // Preset-loaded values remain explicit and visible per §16.2.
    enable_model_extension_3b: state.enable_model_extension_3b ?? false,
    model_extension_3b_mode: state.model_extension_3b_mode ?? "disabled",
    operating_state: state.operating_state ?? null,
    extension_3b_catalog_versions: state.extension_3b_catalog_versions ?? null,
    // ── Extension 4 scenario fields — ext4-spec §19.4, §5.1 ──────────────────
    // No hidden state. All ext4 fields emitted into canonical payload. §3 rule 13.
    enable_model_extension_4: state.enable_model_extension_4 ?? false,
    model_extension_4_mode: state.model_extension_4_mode ?? "disabled",
    tpv_recapture_config: state.tpv_recapture_config ?? null,
    extension_4_catalog_versions: state.extension_4_catalog_versions ?? null,
  };

  const scenario_content = JSON.stringify(scenario, null, 2);
  const ts = new Date().toISOString();
  const pkt_id = packetId(scenario_id, ts);

  const payload_file_refs = [
    "scenario.json",
    "compute-module-01.json",
    "radiator-01.json",
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
    // ── Extension 3B run-packet fields — 3B-spec §16.1, §16.3 ────────────────
    // Mirrored gate and mode. Preset provenance emitted per §16.3.
    enable_model_extension_3b: state.enable_model_extension_3b ?? false,
    model_extension_3b_mode: state.model_extension_3b_mode ?? "disabled",
    extension_3b_catalog_versions: state.extension_3b_catalog_versions ?? null,
    // preset_provenance: compiled from resolved preset loads in state.
    // Must carry preset_catalog_id, preset_entry_id, preset_version, overridden_fields per §16.3.
    extension_3b_preset_provenance: state.extension_3b_preset_provenance ?? [],
    extension_3b_result: null, // populated by runtime runner after dispatch
    // ── Extension 4 run-packet fields — ext4-spec §19.4, §6.1 ────────────────
    // Mirrors scenario gate and mode. tpv_recapture_config carries normalized config.
    // extension_4_catalog_versions: pass-through provenance only; zero numeric authority. §6.2.
    enable_model_extension_4: state.enable_model_extension_4 ?? false,
    model_extension_4_mode: state.model_extension_4_mode ?? "disabled",
    tpv_recapture_config: state.tpv_recapture_config ?? null,
    extension_4_catalog_versions: state.extension_4_catalog_versions ?? null,
    extension_4_result: null, // populated by runtime runner after dispatch
  };

  // ── Runtime execution fields for executeRunPacket (spec §26.5, §27) ──────────
  const _ls  = state.target_load_state || "full";
  const _dc  = state.device_count || 1;
  const _dpf = { idle: state.power_idle_w ?? 0, light: state.power_light_w ?? 0,
                 medium: state.power_medium_w ?? 0, full: state.power_full_w ?? 0 };
  const _dpv = _dpf[_ls] !== undefined ? _dpf[_ls] : (_dpf.full || 0);
  const _mem = state.memory_power_w ?? 0;
  const _sto = state.storage_power_w ?? 0;
  const _net = state.network_power_w ?? 0;
  const _pco = state.power_conversion_overhead_w ?? 0;
  const _ctl = state.control_overhead_w ?? 0;
  const _ncw = (state.non_compute_payload_blocks || []).reduce((sum, b) => {
    const duty = b.duty_mode === "continuous" ? 1.0 : (parseFloat(b.duty_fraction) || 0);
    return sum + ((parseFloat(b.rf_comms_power_w)||0) + (parseFloat(b.telemetry_power_w)||0)
      + (parseFloat(b.radar_power_w)||0) + (parseFloat(b.optical_crosslink_power_w)||0)) * duty;
  }, 0);
  const _qt  = _dc * _dpv + _mem + _sto + _net + _pco + _ctl + _ncw;
  Object.assign(run_packet, {
    scenario_id,
    aggregation: {
      device_powers: { power_idle_w: _dpf.idle, power_light_w: _dpf.light,
                       power_medium_w: _dpf.medium, power_full_w: _dpf.full },
      device_count:               _dc,
      target_load_state:          _ls,
      w_dot_memory_w:             _mem,
      w_dot_storage_w:            _sto,
      w_dot_network_w:            _net,
      w_dot_power_conversion_w:   _pco,
      w_dot_control_w:            _ctl,
      w_dot_non_compute_total_w:  _ncw,
      w_dot_conversion_losses_w:  0,
      w_dot_control_losses_w:     0,
      q_dot_external_w:           0,
      q_dot_branch_losses_w:      0,
      w_dot_exported_equivalent_w: 0,
    },
    radiator: {
      q_dot_w:                 _qt,
      emissivity:              state.emissivity ?? 0.9,
      view_factor:             state.view_factor ?? 1.0,
      t_radiator_target_k:     state.target_surface_temp_k ?? 0,
      t_sink_k:                state.sink_temp_k ?? 0,
      reserve_margin_fraction: state.reserve_margin_fraction ?? 0.15,
    },
    branches: (state.branch_blocks || []).map((b) => ({
      branch_id:             b.branch_block_id,
      mode_label:            b.mode_label || "scavenging",
      t_hot_source_k:        b.t_hot_source_k ?? 0,
      t_cold_sink_k:         b.t_cold_sink_k ?? 0,
      efficiency_or_cop:     b.efficiency_or_cop ?? 0,
      requires_carnot_check: b.requires_carnot_check ?? false,
      work_input_w:          b.work_input_w ?? 0,
      external_heat_input_w: b.external_heat_input_w ?? 0,
      storage_drawdown_w:    b.storage_drawdown_w ?? 0,
      research_required:     b.research_required ?? true,
      output_class:          b.output_class || 'heat_lift',
    })),
    has_speculative_device:                false,
    has_speculative_material:              false,
    has_solar_polish_without_source:       state.solar_polish_enabled === "true" || state.solar_polish_enabled === true,
    has_per_subsystem_duty_simplification: false,
    material_resolved: _matResolved,
    ...((state.enable_model_extension_4) ? { extension_4_input: {
      scenario:    scenario,
      run_packet:  { packet_id: pkt_id, schema_version: "v0.1.5",
                     model_extension_4_mode: state.model_extension_4_mode || "disabled",
                     tpv_recapture_config: state.tpv_recapture_config ?? null },
      radiators:   [radiator_obj],
      baseline_result: null,
      extension_3a_result: null,
    } } : {}),
  });
  const run_packet_content = JSON.stringify(run_packet, null, 2);

  const files = [
    { name: "scenario.json", content: scenario_content },
    { name: "run-packet.json", content: run_packet_content },
    ...extra_files,
  ];

  return { files, transform_trace, warnings, scenario_id, packet_id: pkt_id };
}
