/**
 * app.js — UI controller for Orbital Thermal Trade System Packet Builder
 * Governing law: ui-expansion-spec-v0.1.5 §7, §17, §18 (preview math only), §21
 *
 * This module:
 *   - Wires tab navigation
 *   - Loads versioned catalogs and populates dropdowns
 *   - Manages additive payload block and branch block editors (Tab 3, Tab 6)
 *   - Computes display-only previews (radiator area, load totals)
 *   - Runs client-side blocking validation before packet export
 *   - Serialises state via state-compiler.js and builds downloadable bundle
 *
 * No authoritative engineering outputs are produced here.
 * All solver results require server-side runtime execution.
 */

import { loadAllCatalogs, lookupEntry, catalogVersionsUsed, catalogIdsUsed } from "./catalog-loader.js";
import { compileStateToPayloads } from "./state-compiler.js";
import { payloadBlockId, branchBlockId, scenarioIdFromSeed } from "./id-utils.js";

// ── Stefan-Boltzmann (display-only preview) ───────────────────────────────────
const SIGMA = 5.670374419e-8;

// ── State ─────────────────────────────────────────────────────────────────────
let CATALOGS = {};
let payloadBlocks = [];
let branchBlocks  = [];
let stageBlocks   = []; // Extension 2 spectral stage blocks — spec §11

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  wireTabBar();
  await loadCatalogs();
  wireAllFields();
  updateScenarioId();
  updateComputePreview();
  updateNonComputeAggregate();
  updateRadiatorPreview();
  updateOutputTab();
});

// ── Tab bar ───────────────────────────────────────────────────────────────────
function wireTabBar() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".pane").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.pane).classList.add("active");
      if (btn.dataset.pane === "pane-output") updateOutputTab();
    });
  });
}

// ── Catalog loading ───────────────────────────────────────────────────────────
async function loadCatalogs() {
  CATALOGS = await loadAllCatalogs(".");
  populateScenarioPresets();
  populateDevicePresets();
  populateMaterialFamilyDropdowns();
  populateBranchPresets();
  populateExt2Dropdowns();
  updateFooterVersions();
}

function populateScenarioPresets() {
  const sel = document.getElementById("scenario_preset_id");
  sel.innerHTML = '<option value="">— select preset —</option>';
  const cat = CATALOGS["scenario-presets"];
  if (!cat || cat.load_error) { sel.innerHTML = `<option value="">Error: ${cat?.load_error}</option>`; return; }
  for (const e of cat.entries) {
    const opt = document.createElement("option");
    opt.value = e.preset_id;
    opt.textContent = e.label;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => applyScenarioPreset(sel.value));
}

function applyScenarioPreset(preset_id) {
  const cat = CATALOGS["scenario-presets"];
  const entry = lookupEntry(cat, "preset_id", preset_id);
  const panel = document.getElementById("preset-summary");
  if (!entry) { panel.style.display = "none"; return; }
  setValue("node_class", entry.node_class);
  setValue("mission_mode", entry.mission_mode_default);
  setValue("architecture_class", entry.architecture_class_default);
  if (entry.compute_device_preset_id) applyDevicePreset(entry.compute_device_preset_id);
  if (entry.radiator_defaults) {
    const rd = entry.radiator_defaults;
    if (rd.emissivity !== undefined) setValue("emissivity", rd.emissivity);
    if (rd.target_surface_temp_k !== undefined) setValue("target_surface_temp_k", rd.target_surface_temp_k);
    if (rd.sink_temp_k !== undefined) setValue("sink_temp_k", rd.sink_temp_k);
    if (rd.view_factor !== undefined) setValue("view_factor", rd.view_factor);
    if (rd.reserve_margin_fraction !== undefined) setValue("reserve_margin_fraction", rd.reserve_margin_fraction);
  }
  panel.style.display = "block";
  panel.innerHTML = `<strong>Preset:</strong> ${entry.label} | Node: ${entry.node_class} | Mode: ${entry.mission_mode_default}<br>` +
    (entry.risk_notes?.length ? `<span style="color:var(--warn)">⚠ ${entry.risk_notes.join(" · ")}</span>` : "");
  updateScenarioId();
  updateComputePreview();
  updateRadiatorPreview();
  updateNonComputeAggregate();
}

function populateDevicePresets() {
  const sel = document.getElementById("compute_device_preset_id");
  sel.innerHTML = '<option value="">— select preset —</option>';
  const cat = CATALOGS["compute-device-presets"];
  if (!cat || cat.load_error) return;
  for (const e of cat.entries) {
    const opt = document.createElement("option");
    opt.value = e.preset_id;
    opt.textContent = e.label;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => applyDevicePreset(sel.value));
}

function applyDevicePreset(preset_id) {
  const cat = CATALOGS["compute-device-presets"];
  const entry = lookupEntry(cat, "preset_id", preset_id);
  const panel = document.getElementById("device-maturity-panel");
  if (!entry) { panel.style.display = "none"; return; }
  ["device_type","nominal_tdp_w","peak_tdp_w","allowable_junction_temp_k","allowable_package_temp_k",
   "allowable_coldplate_temp_min_k","allowable_coldplate_temp_max_k","heat_flux_w_per_cm2",
   "power_idle_w","power_light_w","power_medium_w","power_full_w",
   "cooling_pickup_class"].forEach((f) => {
    if (entry[f] !== undefined) setValue(f, entry[f]);
  });
  setValue("pickup_geometry_compute", entry.pickup_geometry ?? "");
  setValue("compute_device_preset_id", preset_id);
  panel.style.display = "block";
  const mc = entry.maturity_class ?? "experimental";
  panel.innerHTML = `<span class="maturity-tag maturity-${mc}">${mc}</span> ${entry.performance_basis_note ?? ""}<br>` +
    `<em>Thermal basis:</em> ${entry.thermal_basis_note ?? ""}` +
    (entry.research_required ? `<br><span style="color:var(--warn)">⚠ research_required</span>` : "");
  updateComputePreview();
}

function populateMaterialFamilyDropdowns() {
  const cat = CATALOGS["material-families"];
  ["zone_material_family_ref", "radiator_material_family_ref"].forEach((sel_id) => {
    const sel = document.getElementById(sel_id);
    sel.innerHTML = '<option value="">— none —</option>';
    if (!cat || cat.load_error) return;
    for (const e of cat.entries) {
      const opt = document.createElement("option");
      opt.value = e.material_family_id;
      opt.textContent = e.label;
      sel.appendChild(opt);
    }
  });
  document.getElementById("radiator_material_family_ref").addEventListener("change", (e) => {
    const cat2 = CATALOGS["material-families"];
    const entry = lookupEntry(cat2, "material_family_id", e.target.value);
    const note = document.getElementById("radiator-material-note");
    if (!entry) { note.style.display = "none"; return; }
    note.style.display = "block";
    note.innerHTML = `<strong>${entry.label}</strong> | ε≈${entry.default_emissivity} | T max: ${entry.nominal_temp_max_k} K | ` +
      `Areal density: ${entry.estimated_areal_density_kg_per_m2} kg/m² | <span class="maturity-tag maturity-${entry.maturity_class}">${entry.maturity_class}</span>` +
      (entry.research_required ? ` <span style="color:var(--warn)">⚠ research_required</span>` : "");
  });
}

function populateBranchPresets() {
  // Used in branch block editor below
  window._branchPresets = CATALOGS["branch-presets"]?.entries ?? [];
}

function updateFooterVersions() {
  const vers = catalogVersionsUsed(CATALOGS);
  const ids = catalogIdsUsed(CATALOGS);
  document.getElementById("footer-catalog-versions").textContent =
    "Catalogs: " + ids.map((id) => `${id}@${vers[id]}`).join(" | ");
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function val(id) { return document.getElementById(id)?.value ?? ""; }
function numVal(id, def = 0) { return parseFloat(document.getElementById(id)?.value) || def; }
function setValue(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

// ── Wire reactive fields ───────────────────────────────────────────────────────
function wireAllFields() {
  ["node_class","mission_mode","architecture_class","orbit_class"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", updateScenarioId);
  });
  ["device_count","target_load_state","power_idle_w","power_light_w","power_medium_w","power_full_w",
   "w_dot_memory_w","w_dot_storage_w","w_dot_network_w","w_dot_power_conversion_w","w_dot_control_w"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateComputePreview);
  });
  ["emissivity","view_factor","target_surface_temp_k","sink_temp_k","reserve_margin_fraction"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateRadiatorPreview);
  });
  document.getElementById("add-payload-block").addEventListener("click", addPayloadBlock);
  document.getElementById("add-branch-block").addEventListener("click", addBranchBlock);
  document.getElementById("add-stage-block")?.addEventListener("click", () => addStageBlock());
  document.getElementById("build-packet-btn").addEventListener("click", buildPacket);
  document.getElementById("solar_polish_enabled")?.addEventListener("change", (e) => {
    document.getElementById("solar-polish-warning").style.display = e.target.value === "true" ? "block" : "none";
  });
  // Extension 2 enable toggle — spec §5.3, §14.1
  document.getElementById("enable_model_extension_2")?.addEventListener("change", onExt2EnableChange);
  // Extension 2 mode change
  document.getElementById("model_extension_2_mode")?.addEventListener("change", updateExt2OutputSection);
  // Source spectral profile dropdown — spec §6, §14.2
  document.getElementById("source_spectral_profile_ref")?.addEventListener("change", updateTab2WienHelper);
  // Ext2 emitter family — spec §14.4
  document.getElementById("ext2_emitter_family_ref")?.addEventListener("change", updateExt2EmitterCard);
  // Ext2 mediator temp band — spec §14.4
  ["ext2_mediator_temp_band_low_k", "ext2_mediator_temp_band_high_k"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateExt2RadiatorComparison);
  });
}

// ── Scenario ID update ─────────────────────────────────────────────────────────
function updateScenarioId() {
  const id = scenarioIdFromSeed(val("scenario_preset_id") || "custom", val("node_class"), val("mission_mode"), val("architecture_class"));
  setValue("scenario_id_display", id);
}

// ── Compute preview (display only) ────────────────────────────────────────────
function getDevicePowerAtState() {
  const state = val("target_load_state");
  const map = { idle: "power_idle_w", light: "power_light_w", medium: "power_medium_w", full: "power_full_w" };
  return numVal(map[state] || "power_full_w");
}

function updateComputePreview() {
  const dc = numVal("device_count", 1);
  const dp = getDevicePowerAtState();
  const devices_total = dc * dp;
  const overhead = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") + numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const module_total = devices_total + overhead;
  const el = document.getElementById("compute-preview");
  el.style.display = "block";
  el.innerHTML = `<strong>Preview (display only):</strong> ${dc} × ${dp} W + ${overhead} W overhead = <strong>${module_total.toFixed(1)} W</strong> compute module total`;
}

// ── Non-compute aggregate preview ─────────────────────────────────────────────
function updateNonComputeAggregate() {
  let total = 0;
  for (const b of payloadBlocks) {
    const df = b.duty_mode === "continuous" ? 1.0 : (parseFloat(b.duty_fraction) || 0);
    total += ((parseFloat(b.rf_comms_power_w) || 0) + (parseFloat(b.telemetry_power_w) || 0) + (parseFloat(b.radar_power_w) || 0) + (parseFloat(b.optical_crosslink_power_w) || 0)) * df;
  }
  const el = document.getElementById("noncompute-aggregate");
  el.innerHTML = `<strong>Non-compute total (display only):</strong> ${total.toFixed(1)} W across ${payloadBlocks.length} block(s)`;
}

// ── Radiator area preview (display only) — spec §14 ─────────────────────────
function updateRadiatorPreview() {
  const eps = numVal("emissivity", 0.9);
  const F   = numVal("view_factor", 1.0);
  const T   = numVal("target_surface_temp_k", 1200);
  const Ts  = numVal("sink_temp_k", 0);
  const margin = numVal("reserve_margin_fraction", 0.15);
  const el  = document.getElementById("radiator-area-preview");
  if (T <= 0 || eps <= 0 || F <= 0) { el.style.display = "none"; return; }
  // Q placeholder — use compute+noncompute preview total
  const dc = numVal("device_count", 1);
  const dp = getDevicePowerAtState();
  const overhead = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") + numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const Q = dc * dp + overhead;
  const denom = eps * SIGMA * F * (Math.pow(T, 4) - Math.pow(Ts, 4));
  if (denom <= 0) { el.style.display = "none"; return; }
  const A_eff = Q / denom;
  const A_margin = A_eff * (1 + margin);
  el.style.display = "block";
  el.innerHTML = `<strong>Radiator area preview (display only, non-authoritative):</strong><br>Q≈${Q.toFixed(0)} W → A_eff≈<strong>${A_eff.toFixed(4)} m²</strong> · A+margin≈<strong>${A_margin.toFixed(4)} m²</strong>`;
}

// ── Payload block editor ───────────────────────────────────────────────────────
function payloadArchetypeOptions() {
  const cat = CATALOGS["payload-archetypes"];
  if (!cat || !cat.entries) return '<option value="">custom</option>';
  return ['<option value="">— select archetype —</option>',
    ...cat.entries.map((e) => `<option value="${e.archetype_id}">${e.label}</option>`)
  ].join("");
}

function addPayloadBlock(data = {}) {
  const idx = payloadBlocks.length;
  const block_id = data.payload_block_id || payloadBlockId(data.archetype_id || "custom", data.label || `block-${idx}`, idx);
  const block = {
    payload_block_id: block_id,
    archetype_id: data.archetype_id || "",
    label: data.label || `Payload Block ${idx + 1}`,
    rf_comms_power_w: data.rf_comms_power_w ?? 0,
    telemetry_power_w: data.telemetry_power_w ?? 0,
    radar_power_w: data.radar_power_w ?? 0,
    optical_crosslink_power_w: data.optical_crosslink_power_w ?? 0,
    duty_mode: data.duty_mode || "continuous",
    duty_fraction: data.duty_fraction ?? 1.0,
    thermal_coupling_zone_ref: data.thermal_coupling_zone_ref || "",
    research_required: data.research_required ?? false,
    notes: data.notes || "",
  };
  payloadBlocks.push(block);
  renderPayloadBlocks();
  updateNonComputeAggregate();
}

function renderPayloadBlocks() {
  const list = document.getElementById("payload-block-list");
  list.innerHTML = "";
  payloadBlocks.forEach((b, idx) => {
    const card = document.createElement("div");
    card.className = "block-card";
    card.innerHTML = `
      <div class="block-header">
        <span>Block ${idx + 1} — ${b.payload_block_id}</span>
        <button class="btn btn-secondary btn-sm" onclick="duplicatePayloadBlock(${idx})">Duplicate</button>
        <button class="btn btn-danger btn-sm" onclick="removePayloadBlock(${idx})">Remove</button>
      </div>
      <div class="block-grid">
        <div class="block-field"><label>Archetype</label><select onchange="payloadBlockChange(${idx},'archetype_id',this.value)">${payloadArchetypeOptions()}</select></div>
        <div class="block-field"><label>Label</label><input type="text" value="${b.label}" oninput="payloadBlockChange(${idx},'label',this.value)" /></div>
        <div class="block-field"><label>RF Comms (W)</label><input type="number" min="0" value="${b.rf_comms_power_w}" oninput="payloadBlockChange(${idx},'rf_comms_power_w',+this.value)" /></div>
        <div class="block-field"><label>Telemetry (W)</label><input type="number" min="0" value="${b.telemetry_power_w}" oninput="payloadBlockChange(${idx},'telemetry_power_w',+this.value)" /></div>
        <div class="block-field"><label>Radar (W)</label><input type="number" min="0" value="${b.radar_power_w}" oninput="payloadBlockChange(${idx},'radar_power_w',+this.value)" /></div>
        <div class="block-field"><label>Optical ISL (W)</label><input type="number" min="0" value="${b.optical_crosslink_power_w}" oninput="payloadBlockChange(${idx},'optical_crosslink_power_w',+this.value)" /></div>
        <div class="block-field"><label>Duty Mode</label>
          <select onchange="payloadBlockChange(${idx},'duty_mode',this.value)">
            <option value="continuous" ${b.duty_mode==="continuous"?"selected":""}>continuous</option>
            <option value="uniform" ${b.duty_mode==="uniform"?"selected":""}>uniform</option>
            <option value="per_subsystem" ${b.duty_mode==="per_subsystem"?"selected":""}>per_subsystem</option>
          </select>
        </div>
        <div class="block-field"><label>Duty Fraction</label><input type="number" min="0" max="1" step="0.01" value="${b.duty_fraction}" oninput="payloadBlockChange(${idx},'duty_fraction',+this.value)" /></div>
        <div class="block-field"><label>Notes</label><input type="text" value="${b.notes}" oninput="payloadBlockChange(${idx},'notes',this.value)" /></div>
      </div>`;
    // re-select archetype
    const archSel = card.querySelector("select");
    archSel.value = b.archetype_id;
    list.appendChild(card);
  });
}

window.payloadBlockChange = (idx, field, value) => {
  if (payloadBlocks[idx]) { payloadBlocks[idx][field] = value; updateNonComputeAggregate(); }
};
window.removePayloadBlock = (idx) => { payloadBlocks.splice(idx, 1); renderPayloadBlocks(); updateNonComputeAggregate(); };
window.duplicatePayloadBlock = (idx) => { addPayloadBlock({ ...payloadBlocks[idx], payload_block_id: undefined, label: payloadBlocks[idx].label + " (copy)" }); };

// Apply archetype preset to a payload block
window.applyPayloadArchetype = (idx, archetype_id) => {
  const entry = lookupEntry(CATALOGS["payload-archetypes"], "archetype_id", archetype_id);
  if (!entry) return;
  Object.assign(payloadBlocks[idx], {
    archetype_id,
    rf_comms_power_w: entry.rf_comms_power_w,
    telemetry_power_w: entry.telemetry_power_w,
    radar_power_w: entry.radar_power_w,
    optical_crosslink_power_w: entry.optical_crosslink_power_w,
    duty_mode: entry.default_duty_mode,
    duty_fraction: entry.default_duty_fraction,
    research_required: entry.research_required,
    notes: entry.notes,
  });
  renderPayloadBlocks();
  updateNonComputeAggregate();
};

// ── Branch block editor ────────────────────────────────────────────────────────
function branchPresetOptions() {
  const presets = window._branchPresets || [];
  return ['<option value="">— select preset —</option>',
    ...presets.map((e) => `<option value="${e.preset_id}">${e.label}</option>`)
  ].join("");
}

function addBranchBlock(data = {}) {
  const idx = branchBlocks.length;
  const block_id = data.branch_block_id || branchBlockId(data.branch_type || "custom", data.branch_variant || "base", idx);
  const block = {
    branch_block_id: block_id,
    preset_id: data.preset_id || "",
    branch_type: data.branch_type || "custom",
    branch_variant: data.branch_variant || "base",
    mode_label: data.mode_label || "scavenging",
    source_zone_ref: data.source_zone_ref || "",
    sink_zone_ref: data.sink_zone_ref || "",
    efficiency_fraction: data.efficiency_fraction ?? 0,
    efficiency_or_cop: data.efficiency_or_cop ?? 0,
    work_input_w: data.work_input_w ?? 0,
    external_heat_input_w: data.external_heat_input_w ?? 0,
    storage_drawdown_w: data.storage_drawdown_w ?? 0,
    requires_carnot_check: data.requires_carnot_check ?? false,
    maturity_class: data.maturity_class || "experimental",
    research_required: data.research_required ?? true,
    risk_notes: data.risk_notes || [],
  };
  branchBlocks.push(block);
  renderBranchBlocks();
}

function renderBranchBlocks() {
  const list = document.getElementById("branch-block-list");
  list.innerHTML = "";
  branchBlocks.forEach((b, idx) => {
    const card = document.createElement("div");
    card.className = "block-card";
    card.innerHTML = `
      <div class="block-header">
        <span>Branch ${idx + 1} — <span class="maturity-tag maturity-${b.maturity_class}">${b.maturity_class}</span> ${b.branch_type} / ${b.branch_variant}</span>
        <button class="btn btn-secondary btn-sm" onclick="duplicateBranchBlock(${idx})">Duplicate</button>
        <button class="btn btn-danger btn-sm" onclick="removeBranchBlock(${idx})">Remove</button>
      </div>
      <div class="block-grid">
        <div class="block-field"><label>Preset</label><select onchange="applyBranchPreset(${idx},this.value)">${branchPresetOptions()}</select></div>
        <div class="block-field"><label>Branch Type (display)</label><input type="text" readonly value="${b.branch_type}" style="color:var(--text-dim)" /></div>
        <div class="block-field"><label>Variant (display)</label><input type="text" readonly value="${b.branch_variant}" style="color:var(--text-dim)" /></div>
        <div class="block-field"><label>Mode (display)</label><input type="text" readonly value="${b.mode_label}" style="color:var(--text-dim)" /></div>
        <div class="block-field"><label>Efficiency / COP</label><input type="number" min="0" step="0.01" value="${b.efficiency_or_cop}" oninput="branchBlockChange(${idx},'efficiency_or_cop',+this.value)" /></div>
        <div class="block-field"><label>Efficiency Fraction</label><input type="number" min="0" max="1" step="0.01" value="${b.efficiency_fraction}" oninput="branchBlockChange(${idx},'efficiency_fraction',+this.value)" /></div>
        <div class="block-field"><label>Work Input (W)</label><input type="number" min="0" value="${b.work_input_w}" oninput="branchBlockChange(${idx},'work_input_w',+this.value)" /></div>
        <div class="block-field"><label>External Heat Input (W)</label><input type="number" min="0" value="${b.external_heat_input_w}" oninput="branchBlockChange(${idx},'external_heat_input_w',+this.value)" /></div>
        <div class="block-field"><label>Storage Drawdown (W)</label><input type="number" min="0" value="${b.storage_drawdown_w}" oninput="branchBlockChange(${idx},'storage_drawdown_w',+this.value)" /></div>
        <div class="block-field"><label>Source Zone Ref</label><input type="text" value="${b.source_zone_ref}" oninput="branchBlockChange(${idx},'source_zone_ref',this.value)" /></div>
        <div class="block-field"><label>Sink Zone Ref</label><input type="text" value="${b.sink_zone_ref}" oninput="branchBlockChange(${idx},'sink_zone_ref',this.value)" /></div>
      </div>
      ${b.risk_notes.length ? `<div class="note warn-note" style="margin-top:8px">⚠ ${b.risk_notes.join(" · ")}</div>` : ""}`;
    const presetSel = card.querySelector("select");
    if (presetSel) presetSel.value = b.preset_id;
    list.appendChild(card);
  });
}

window.branchBlockChange = (idx, field, value) => { if (branchBlocks[idx]) branchBlocks[idx][field] = value; };
window.removeBranchBlock = (idx) => { branchBlocks.splice(idx, 1); renderBranchBlocks(); };
window.duplicateBranchBlock = (idx) => { addBranchBlock({ ...branchBlocks[idx], branch_block_id: undefined }); };
window.applyBranchPreset = (idx, preset_id) => {
  const entry = (window._branchPresets || []).find((e) => e.preset_id === preset_id);
  if (!entry) return;
  Object.assign(branchBlocks[idx], {
    preset_id,
    branch_type: entry.branch_type,
    branch_variant: entry.branch_variant,
    mode_label: entry.mode_label,
    efficiency_fraction: entry.default_efficiency_fraction,
    efficiency_or_cop: entry.default_efficiency_or_cop,
    requires_carnot_check: entry.requires_carnot_check,
    maturity_class: entry.maturity_class,
    research_required: entry.research_required,
    risk_notes: entry.risk_notes,
    requires_work_input: entry.requires_work_input,
  });
  renderBranchBlocks();
};

// ── Output Tab ────────────────────────────────────────────────────────────────
function updateOutputTab() {
  updateScenarioId();
  updateComputePreview();
  updateNonComputeAggregate();
  updateRadiatorPreview();

  // Extension 2 output section visibility — spec §14.5
  const ext2Enabled = val("enable_model_extension_2") === "true";
  const ext2OutSec = document.getElementById("ext2-output-section");
  if (ext2OutSec) ext2OutSec.style.display = ext2Enabled ? "block" : "none";
  if (ext2Enabled) updateExt2OutputSection();

  // Recompute for compat spans (used by openPacketOutput)
  const dc = numVal("device_count", 1);
  const dp = getDevicePowerAtState();
  const overhead = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") +
    numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const compute_total = dc * dp + overhead;
  let nc_total = 0;
  for (const b of payloadBlocks) {
    const df = b.duty_mode === "continuous" ? 1.0 : (parseFloat(b.duty_fraction) || 0);
    nc_total += ((parseFloat(b.rf_comms_power_w)||0)+(parseFloat(b.telemetry_power_w)||0)+
                 (parseFloat(b.radar_power_w)||0)+(parseFloat(b.optical_crosslink_power_w)||0))*df;
  }
  const Q_total = compute_total + nc_total;
  const T   = numVal("target_surface_temp_k", 1200);
  const eps = numVal("emissivity", 0.9);
  const F   = numVal("view_factor", 1.0);
  const Ts  = numVal("sink_temp_k", 0);
  const mrg = numVal("reserve_margin_fraction", 0.15);
  const denom = eps * SIGMA * F * (Math.pow(T,4) - Math.pow(Ts,4));
  const A_eff = denom > 0 ? Q_total / denom : 0;

  // Compat span updates (hidden elements referenced by openPacketOutput)
  _setEl("sum-scenario-id",    val("scenario_id_display"));
  _setEl("sum-node-class",     val("node_class"));
  _setEl("sum-arch-class",     val("architecture_class"));
  _setEl("sum-device-total",   `${dc} × ${dp} W = ${(dc * dp).toFixed(0)} W`);
  _setEl("sum-radiator-temp",  `${T} K`);
  _setEl("sum-compute-total",  `${compute_total.toFixed(1)} W`);
  _setEl("sum-noncompute-total",`${nc_total.toFixed(1)} W`);
  _setEl("sum-radiator-area",  `${A_eff.toFixed(4)} m²`);
  _setEl("sum-radiator-margin",`${(A_eff*(1+mrg)).toFixed(4)} m²`);

  renderValidationPanel();
}

// ── Helper: set textContent safely ────────────────────────────────────────────
function _setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Populate polished output cards after buildPacket ─────────────────────────
function populateOutputCards(state, A_eff, A_margin, compute_total, nc_total, Q_total) {
  const T   = state.target_surface_temp_k;
  const eps = state.emissivity;
  const F   = state.view_factor;
  const Ts  = state.sink_temp_k;
  const mrg = state.reserve_margin_fraction;
  const dc  = state.device_count;
  const mat = val("radiator_material_family_ref");
  const matEntry = (CATALOGS["material-families"]?.entries || []).find((e) => e.material_family_id === mat);
  const matLabel = matEntry ? matEntry.label : (mat || "— not set —");

  _setEl("out-generated-at",        new Date().toISOString().replace("T"," ").slice(0,19) + " UTC");
  _setEl("out-scenario-id",         val("scenario_id_display") || "—");
  _setEl("out-label",               state.label || "—");
  _setEl("out-node-class",          state.node_class || "—");
  _setEl("out-arch-class",          state.architecture_class || "—");
  _setEl("out-orbit",               state.orbit_class || "—");
  _setEl("out-mission-mode",        state.mission_mode || "—");
  _setEl("out-device-count",        `${dc}`);
  _setEl("out-load-state",          state.target_load_state || "—");
  _setEl("out-device-power",        `${getDevicePowerAtState().toFixed(1)} W`);
  _setEl("out-compute-device-total",`${(dc * getDevicePowerAtState()).toFixed(1)} W`);
  _setEl("out-overhead",            `${(compute_total - dc * getDevicePowerAtState()).toFixed(1)} W`);
  _setEl("sum-compute-total",       `${compute_total.toFixed(1)} W`);
  _setEl("sum-noncompute-total",    `${nc_total.toFixed(1)} W`);
  _setEl("out-total-reject",        `${Q_total.toFixed(1)} W`);
  _setEl("out-rad-temp",            `${T} K`);
  _setEl("out-sink-temp",           `${Ts} K`);
  _setEl("out-emissivity",          `${eps}`);
  _setEl("out-view-factor",         `${F}`);
  _setEl("sum-radiator-area",       `${A_eff.toFixed(4)} m²`);
  _setEl("sum-radiator-margin",     `${A_margin.toFixed(4)} m²`);
  _setEl("out-reserve-margin",      `${(mrg * 100).toFixed(1)}%`);
  _setEl("out-material-family",     matLabel);

  // Radiator concern flag
  const mat_lim = numVal("material_limit_temp_k", 9999);
  const rc = document.getElementById("out-radiator-concern");
  if (rc) {
    if (T > mat_lim) {
      rc.style.display = "block";
      rc.className = "out-concern concern-block";
      rc.textContent = `⚠ Target surface temp (${T} K) exceeds declared material limit (${mat_lim} K). Review material family selection.`;
    } else if (T > mat_lim * 0.9) {
      rc.style.display = "block";
      rc.className = "out-concern";
      rc.textContent = `Note: Target surface temp (${T} K) is within 10% of material limit (${mat_lim} K). Monitor margin.`;
    } else {
      rc.style.display = "none";
    }
  }

  // Branches list
  const branchEl = document.getElementById("out-branches-list");
  if (branchEl) {
    branchEl.innerHTML = branchBlocks.length === 0
      ? "No optional branches defined."
      : branchBlocks.map((b) =>
          `<div style="padding:4px 0;border-bottom:1px solid var(--border);">` +
          `<span class="maturity-tag maturity-${b.maturity_class}">${b.maturity_class}</span> ` +
          `<strong>${b.branch_type}</strong> / ${b.branch_variant}` +
          (b.research_required ? ` <span style="color:var(--warn);">⚠ research required</span>` : "") +
          `</div>`).join("");
  }

  // Show all output card sections
  ["output-scenario-card","output-thermal-card","output-radiator-card",
   "output-branches-card","output-research-card","output-manifest-card",
   "output-trace-card","output-json-card"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
  });
}

// ── Toggle helpers for collapsed panels ───────────────────────────────────────
window.toggleTracePanel = () => {
  const wrap = document.getElementById("transform-trace-wrap");
  const lbl  = document.getElementById("trace-toggle-label");
  if (!wrap) return;
  const show = wrap.style.display === "none";
  wrap.style.display = show ? "block" : "none";
  if (lbl) lbl.textContent = show ? "▼ hide" : "▶ show";
};
window.toggleJsonPanel = () => {
  const wrap = document.getElementById("json-preview-wrap");
  const lbl  = document.getElementById("json-toggle-label");
  if (!wrap) return;
  const show = wrap.style.display === "none";
  wrap.style.display = show ? "block" : "none";
  if (lbl) lbl.textContent = show ? "▼ hide" : "▶ show";
};

function renderValidationPanel() {
  const panel = document.getElementById("validation-panel");
  const issues = [];

  const T = numVal("target_surface_temp_k", 0);
  const eps = numVal("emissivity", 0);
  const F = numVal("view_factor", 0);
  const mat_lim = numVal("material_limit_temp_k", 9999);

  if (!val("scenario_id_display")) issues.push({ s: "blocking", m: "scenario_id missing" });
  if (numVal("device_count", 0) < 1) issues.push({ s: "blocking", m: "device_count must be ≥ 1" });
  if (T <= 0) issues.push({ s: "blocking", m: "radiator target temperature must be > 0 K" });
  if (eps <= 0 || eps > 1) issues.push({ s: "blocking", m: "emissivity must be in (0, 1]" });
  if (F <= 0 || F > 1) issues.push({ s: "blocking", m: "view_factor must be in (0, 1]" });
  if (T > mat_lim) issues.push({ s: "blocking", m: `target_surface_temp_k (${T}) > material_limit_temp_k (${mat_lim})` });

  // Warnings
  const hasHeatLift = branchBlocks.some((b) => b.mode_label === "heat_lift");
  const hasPowerCycle = branchBlocks.some((b) => b.mode_label === "power_cycle");
  if (hasHeatLift && hasPowerCycle) issues.push({ s: "warning", m: "Simultaneous heat_lift and power_cycle branches require careful accounting" });
  if (val("solar_polish_enabled") === "true") issues.push({ s: "warning", m: "Solar-polish source characterisation required" });
  const speculative_devices = branchBlocks.some((b) => b.maturity_class === "experimental");
  if (speculative_devices) issues.push({ s: "warning", m: "One or more experimental-maturity branches selected" });

  // Extension 2 validation — spec §15, §14.5
  if (val("enable_model_extension_2") === "true") {
    const mode = val("model_extension_2_mode");
    if (!mode || mode === "") issues.push({ s: "blocking", m: "Extension 2 enabled but model_extension_2_mode not set" });
    stageBlocks.forEach((s, i) => {
      if (!s.enabled) return;
      if (!s.absorber_family_ref) issues.push({ s: "blocking", m: `Stage ${i+1} (${s.label}): absorber_family_ref required` });
      if (!s.emitter_family_ref)  issues.push({ s: "blocking", m: `Stage ${i+1} (${s.label}): emitter_family_ref required` });
      if (!s.cavity_geometry_ref) issues.push({ s: "blocking", m: `Stage ${i+1} (${s.label}): cavity_geometry_ref required` });
      if (!s.mediator_family_ref) issues.push({ s: "blocking", m: `Stage ${i+1} (${s.label}): mediator_family_ref required` });
      if (s.thermal_loss_fraction >= 1) issues.push({ s: "blocking", m: `Stage ${i+1}: thermal_loss_fraction must be < 1` });
      if (s.capture_efficiency_fraction < 0 || s.capture_efficiency_fraction > 1) issues.push({ s: "blocking", m: `Stage ${i+1}: capture_efficiency_fraction out of [0,1]` });
      if (s.research_required && val("strict_research_enforcement") === "true") {
        issues.push({ s: "warning", m: `Stage ${i+1} (${s.label}): research_required — strict enforcement active` });
      }
    });
    if (stageBlocks.length === 0 && (mode === "exploratory_compare" || mode === "exploratory_only")) {
      issues.push({ s: "warning", m: "Extension 2 exploratory mode enabled but no stage blocks defined" });
    }
  }

  if (issues.length === 0) {
    panel.innerHTML = '<div class="validation-item v-ok"><span class="icon">✓</span>No blocking issues found. Packet export allowed.</div>';
    return;
  }
  panel.innerHTML = issues.map((i) =>
    `<div class="validation-item ${i.s === "blocking" ? "v-block" : "v-warn"}">
      <span class="icon">${i.s === "blocking" ? "✗" : "⚠"}</span>
      <span>${i.s === "blocking" ? "BLOCKING" : "WARNING"}: ${i.m}</span>
    </div>`
  ).join("");
}

// ── Build packet ───────────────────────────────────────────────────────────────
let _lastBundleFiles = null;

function buildPacket() {
  const state = {
    scenario_preset_id: val("scenario_preset_id"),
    label: val("label") || val("scenario_id_display"),
    node_class: val("node_class"),
    mission_mode: val("mission_mode"),
    architecture_class: val("architecture_class"),
    orbit_class: val("orbit_class"),
    thermal_policy_id: "default",
    compute_module_ref: "compute-module-01",
    thermal_architecture_ref: "thermal-arch-01",
    radiator_ref: "radiator-01",
    storage_ref: "storage-01",
    compute_device_preset_id: val("compute_device_preset_id"),
    device_type: val("device_type"),
    power_idle_w: numVal("power_idle_w"),
    power_light_w: numVal("power_light_w"),
    power_medium_w: numVal("power_medium_w"),
    power_full_w: numVal("power_full_w"),
    device_count: numVal("device_count", 1),
    target_load_state: val("target_load_state"),
    redundancy_mode: val("redundancy_mode"),
    cooling_pickup_class: val("cooling_pickup_class"),
    pickup_geometry: val("pickup_geometry"),
    memory_power_w: numVal("memory_power_w"),
    storage_power_w: numVal("storage_power_w"),
    network_power_w: numVal("network_power_w"),
    power_conversion_overhead_w: numVal("power_conversion_overhead_w"),
    control_overhead_w: numVal("control_overhead_w"),
    emissivity: numVal("emissivity", 0.9),
    view_factor: numVal("view_factor", 1.0),
    target_surface_temp_k: numVal("target_surface_temp_k"),
    sink_temp_k: numVal("sink_temp_k", 0),
    reserve_margin_fraction: numVal("reserve_margin_fraction", 0.15),
    storage_class: val("storage_class"),
    storage_capacity_j: numVal("storage_capacity_j", 0),
    comms_load_ref: "",
    selected_branches: branchBlocks.map((b) => b.branch_type),
    assumptions: (val("assumptions") || "").split("\n").map((s) => s.trim()).filter(Boolean),
    non_compute_payload_blocks: payloadBlocks,
    branch_blocks: branchBlocks,
    research_required_items: [
      ...(val("solar_polish_enabled") === "true" ? ["solar_polish_source_characterisation"] : []),
      ...payloadBlocks.filter((b) => b.research_required).map((b) => `payload_block:${b.payload_block_id}`),
      ...branchBlocks.filter((b) => b.research_required).map((b) => `branch_block:${b.branch_block_id}`),
      ...stageBlocks.filter((s) => s.research_required && s.enabled).map((s) => `spectral_stage:${s.spectral_stage_id}`),
    ],
    // Extension 2 fields — spec §16.1
    enable_model_extension_2: val("enable_model_extension_2") === "true",
    model_extension_2_mode: val("model_extension_2_mode") || "disabled",
    source_spectral_profile_ref: val("source_spectral_profile_ref") || null,
    spectral_stage_refs: stageBlocks.map((s) => s.spectral_stage_id),
    spectral_stage_blocks: stageBlocks,
    exploratory_result_policy: val("exploratory_result_policy") || "do_not_mix",
    research_packet_intent: val("research_packet_intent") || "engineering_trade",
    strict_research_enforcement: val("strict_research_enforcement") === "true",
    extension_2_catalog_ids_used: val("enable_model_extension_2") === "true"
      ? ["source-spectral-profiles", "absorber-families", "emitter-families", "cavity-geometries", "mediator-families"]
      : [],
    ext2_emitter_family_ref: val("ext2_emitter_family_ref") || null,
    ext2_hot_island_storage_class: val("ext2_hot_island_storage_class") || null,
    ext2_mediator_temp_band_low_k: numVal("ext2_mediator_temp_band_low_k", 800),
    ext2_mediator_temp_band_high_k: numVal("ext2_mediator_temp_band_high_k", 1200),
    operator_notes: "",
    branding_metadata: {
      organization_name: val("org_name"),
      contact_name: val("contact_name"),
      contact_email: val("contact_email"),
      confidentiality_notice: val("confidentiality_notice"),
    },
    validation_summary: {},
    risk_summary: {},
  };

  const { files, transform_trace, warnings } = compileStateToPayloads(state, CATALOGS);
  _lastBundleFiles = files;

  // -- Compute derived values for polished cards --
  const _dc  = numVal("device_count", 1);
  const _dp  = getDevicePowerAtState();
  const _oh  = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") +
               numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const _ct  = _dc * _dp + _oh;
  let   _nc  = 0;
  for (const b of payloadBlocks) {
    const df = b.duty_mode === "continuous" ? 1.0 : (parseFloat(b.duty_fraction) || 0);
    _nc += ((parseFloat(b.rf_comms_power_w)||0)+(parseFloat(b.telemetry_power_w)||0)+
            (parseFloat(b.radar_power_w)||0)+(parseFloat(b.optical_crosslink_power_w)||0))*df;
  }
  const _Qt  = _ct + _nc;
  const _T   = numVal("target_surface_temp_k", 1200);
  const _eps = numVal("emissivity", 0.9);
  const _F   = numVal("view_factor", 1.0);
  const _Ts  = numVal("sink_temp_k", 0);
  const _mrg = numVal("reserve_margin_fraction", 0.15);
  const _den = _eps * SIGMA * _F * (Math.pow(_T,4) - Math.pow(_Ts,4));
  const _Aef = _den > 0 ? _Qt / _den : 0;
  const _Amg = _Aef * (1 + _mrg);

  // Populate polished output cards
  populateOutputCards(state, _Aef, _Amg, _ct, _nc, _Qt);

  // manifest
  document.getElementById("manifest-preview").innerHTML =
    files.map((f) => `<span style="color:var(--accent);">${f.name}</span> — ${new TextEncoder().encode(f.content).length} B`).join("<br>");

  // transform trace
  document.getElementById("transform-trace-preview").textContent = transform_trace.join("\n") +
    (warnings.length ? "\n\nWARNINGS:\n" + warnings.map((w) => "⚠ " + w).join("\n") : "");

  // research required
  document.getElementById("research-required-preview").innerHTML =
    state.research_required_items.length
      ? state.research_required_items.map((r) => `<div style="padding:3px 0;border-bottom:1px solid var(--border);">⚠ ${r}</div>`).join("")
      : '<span style="color:var(--ok);">✓ No research-required items declared.</span>';

  // JSON preview (run-packet.json — in collapsed panel)
  const rp = files.find((f) => f.name === "run-packet.json");
  const opEl = document.getElementById("output-preview");
  if (opEl) opEl.textContent = rp ? rp.content : "(no run-packet generated)";

  // Build status banner
  const bsEl = document.getElementById("build-status");
  if (bsEl) {
    const hasBlock = document.getElementById("validation-panel")?.querySelector(".v-block");
    bsEl.style.display = "block";
    bsEl.style.borderLeftColor = hasBlock ? "var(--error)" : "var(--ok)";
    bsEl.innerHTML = hasBlock
      ? `<span style="color:var(--error);">⚠ Packet built with blocking validation issues. Resolve before submitting for runtime execution.</span>`
      : `<span style="color:var(--ok);">✓ Packet built — ${files.length} files. Download JSON bundle or open formatted report.</span>`;
  }

  // Show action buttons
  document.getElementById("download-packet-btn").style.display = "inline-block";
  document.getElementById("download-packet-btn").onclick = downloadBundle;
  document.getElementById("run-packet-btn").style.display = "inline-block";
  document.getElementById("run-packet-btn").onclick = openPacketOutput;

  updateOutputTab();
}

async function downloadBundle() {
  if (!_lastBundleFiles) return;
  // Use JSZip if available; otherwise download each file individually
  if (typeof JSZip !== "undefined") {
    const zip = new JSZip();
    for (const f of _lastBundleFiles) zip.file(f.name, f.content);
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `runbundle-${val("scenario_id_display") || "packet"}-${new Date().toISOString().slice(0,10)}.zip`, "application/zip");
  } else {
    // Fallback: download run-packet.json only
    const rp = _lastBundleFiles.find((f) => f.name === "run-packet.json");
    if (rp) {
      const blob = new Blob([rp.content], { type: "application/json" });
      downloadBlob(blob, "run-packet.json", "application/json");
    }
  }
}

function openPacketOutput() {
  if (!_lastBundleFiles) return;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var rp  = _lastBundleFiles.find(function(f) { return f.name === "run-packet.json"; });
  var sc  = _lastBundleFiles.find(function(f) { return f.name === "scenario.json"; });
  var cm  = _lastBundleFiles.find(function(f) { return f.name === "compute-module-01.json"; });
  var rad = _lastBundleFiles.find(function(f) { return f.name === "radiator-01.json"; });

  var packet  = rp  ? JSON.parse(rp.content)  : {};
  var scenario= sc  ? JSON.parse(sc.content)  : {};
  var compute = cm  ? JSON.parse(cm.content)  : {};
  var radiator= rad ? JSON.parse(rad.content) : {};

  var loadMap = {idle:"power_idle_w",light:"power_light_w",medium:"power_medium_w",full:"power_full_w"};
  var lk = loadMap[compute.target_load_state] || "power_full_w";
  var deviceW = compute[lk] || 0;
  var dc = compute.device_count || 1;
  var overheads = (compute.memory_power_w||0)+(compute.storage_power_w||0)+
    (compute.network_power_w||0)+(compute.power_conversion_overhead_w||0)+
    (compute.control_overhead_w||0);
  var moduleTotal = dc * deviceW + overheads;
  var sigma = 5.670374419e-8;
  var eps  = radiator.emissivity || 0;
  var Trad = radiator.target_surface_temp_k || 0;
  var Tsink= radiator.sink_temp_k || 0;
  var mrg  = radiator.reserve_margin_fraction || 0.15;
  var Aeff = 0, Amargin = 0;
  if (Trad > 0 && eps > 0 && moduleTotal > 0) {
    Aeff    = moduleTotal / (eps * sigma * (Math.pow(Trad,4) - Math.pow(Tsink,4)));
    Amargin = Aeff * (1 + mrg);
  }

  var manifRows = (packet.file_manifest || []).map(function(f) {
    return "<tr><td>"+esc(f.name)+"</td><td>"+f.byte_length+" B</td></tr>";
  }).join("");
  var traceItems = (packet.transform_trace || []).map(function(t) {
    return "<li>"+esc(t)+"</li>";
  }).join("");
  var reqItems = (packet.research_required_items || []).length
    ? (packet.research_required_items||[]).map(function(r){return "<li>"+esc(r)+"</li>";}).join("")
    : "<li>None declared</li>";
  var branchText = (Array.isArray(scenario.selected_branches) && scenario.selected_branches.length)
    ? scenario.selected_branches.map(esc).join(", ") : "none";

  var pv = " <span class='pv'>(preview)</span>";
  var nowStr = esc(new Date().toISOString());
  var packetId = esc(packet.packet_id || "—");
  var filesJson = JSON.stringify(_lastBundleFiles);
  var bundleName = "runbundle-" + (scenario.scenario_id || "packet") + "-" +
    new Date().toISOString().slice(0,10) + ".zip";

  var parts = [
    "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'>",
    "<title>Run Packet Output \u2014 " + packetId + "<\/title>",
    "<script src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'><\/script>",
    "<style>",
    "* { box-sizing:border-box; margin:0; padding:0; }",
    "body { background:#0f1117; color:#c9d1d9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; font-size:14px; padding:24px; }",
    "h1 { font-size:18px; color:#58a6ff; margin-bottom:4px; }",
    ".sub { font-size:12px; color:#8b949e; margin-bottom:18px; }",
    ".warn { background:#2d1e00; border:1px solid #d97706; color:#fbbf24; border-radius:6px; padding:10px 16px; margin-bottom:18px; font-size:13px; }",
    ".dl { background:#238636; color:#fff; border:none; padding:8px 22px; border-radius:6px; cursor:pointer; font-size:14px; margin-bottom:24px; }",
    ".dl:hover { background:#2ea043; }",
    ".sec { margin-bottom:22px; }",
    ".st { font-size:11px; font-weight:600; color:#58a6ff; text-transform:uppercase; letter-spacing:.08em; margin-bottom:6px; border-bottom:1px solid #21262d; padding-bottom:4px; }",
    "table { width:100%; border-collapse:collapse; font-size:13px; }",
    "th { background:#161b22; color:#8b949e; text-align:left; padding:6px 10px; font-weight:500; border:1px solid #21262d; }",
    "td { padding:6px 10px; border:1px solid #21262d; }",
    "tr:nth-child(even) td { background:#0d1117; }",
    ".pv { color:#8b949e; font-size:11px; font-style:italic; }",
    "ul { list-style:disc; padding-left:20px; font-size:13px; line-height:1.9; }",
    ".mono { font-family:monospace; font-size:12px; color:#79c0ff; word-break:break-all; }",
    ".foot { margin-top:28px; font-size:11px; color:#444; border-top:1px solid #21262d; padding-top:10px; }",
    "<\/style><\/head><body>",
    "<h1>Orbital Thermal Trade System \u2014 Run Packet Output<\/h1>",
    "<div class='sub'>Generated: "+nowStr+" &nbsp;|&nbsp; Runtime authority: server-side execution required<\/div>",
    "<div class='warn'>&#9888; All numeric values are browser-side previews only. Authoritative outputs require server-side runtime execution per governing spec \u00a74.1 and \u00a714.<\/div>",
    "<button class='dl' onclick='dlBundle()'>&#8595; Download Bundle (.zip)<\/button>",
    "<div class='sec'><div class='st'>Packet Identity<\/div>",
    "<table><tr><th>Field<\/th><th>Value<\/th><\/tr>",
    "<tr><td>Packet ID<\/td><td class='mono'>"+packetId+"<\/td><\/tr>",
    "<tr><td>Schema Version<\/td><td>"+esc(packet.schema_version||"—")+"<\/td><\/tr>",
    "<tr><td>Blueprint Version<\/td><td>"+esc(packet.blueprint_version||"—")+"<\/td><\/tr>",
    "<tr><td>Spec Version<\/td><td>"+esc(packet.engineering_spec_version||"—")+"<\/td><\/tr>",
    "<tr><td>Generated<\/td><td>"+nowStr+"<\/td><\/tr>",
    "<\/table><\/div>",
    "<div class='sec'><div class='st'>Scenario Summary<\/div>",
    "<table><tr><th>Field<\/th><th>Value<\/th><\/tr>",
    "<tr><td>Scenario ID<\/td><td class='mono'>"+esc(scenario.scenario_id||"—")+"<\/td><\/tr>",
    "<tr><td>Label<\/td><td>"+esc(scenario.label||"—")+"<\/td><\/tr>",
    "<tr><td>Node Class<\/td><td>"+esc(scenario.node_class||"—")+"<\/td><\/tr>",
    "<tr><td>Architecture Class<\/td><td>"+esc(scenario.architecture_class||"—")+"<\/td><\/tr>",
    "<tr><td>Orbit Class<\/td><td>"+esc(scenario.orbit_class||"—")+"<\/td><\/tr>",
    "<tr><td>Mission Mode<\/td><td>"+esc(scenario.mission_mode||"—")+"<\/td><\/tr>",
    "<\/table><\/div>",
    "<div class='sec'><div class='st'>Compute Payload<\/div>",
    "<table><tr><th>Field<\/th><th>Value<\/th><\/tr>",
    "<tr><td>Device Preset<\/td><td>"+esc(compute.compute_device_preset_id||"—")+"<\/td><\/tr>",
    "<tr><td>Device Count<\/td><td>"+esc(dc)+"<\/td><\/tr>",
    "<tr><td>Target Load State<\/td><td>"+esc(compute.target_load_state||"—")+"<\/td><\/tr>",
    "<tr><td>Per-Device Load<\/td><td>"+deviceW.toFixed(1)+" W"+pv+"<\/td><\/tr>",
    "<tr><td>Device Subtotal<\/td><td>"+(dc*deviceW).toFixed(1)+" W"+pv+"<\/td><\/tr>",
    "<tr><td>Overheads (mem+stor+net+pdu+ctrl)<\/td><td>"+overheads.toFixed(1)+" W"+pv+"<\/td><\/tr>",
    "<tr><td><strong>Compute Module Total<\/strong><\/td><td><strong>"+moduleTotal.toFixed(1)+" W"+pv+"<\/strong><\/td><\/tr>",
    "<\/table><\/div>",
    "<div class='sec'><div class='st'>Radiator Configuration<\/div>",
    "<table><tr><th>Field<\/th><th>Value<\/th><\/tr>",
    "<tr><td>Target Surface Temp<\/td><td>"+esc(Trad)+" K<\/td><\/tr>",
    "<tr><td>Sink Temp<\/td><td>"+esc(Tsink)+" K<\/td><\/tr>",
    "<tr><td>Emissivity<\/td><td>"+esc(eps)+"<\/td><\/tr>",
    "<tr><td>Reserve Margin<\/td><td>"+(mrg*100).toFixed(1)+"%<\/td><\/tr>",
    "<tr><td>Effective Area<\/td><td>"+Aeff.toFixed(5)+" m\u00b2"+pv+"<\/td><\/tr>",
    "<tr><td>Area with Margin<\/td><td>"+Amargin.toFixed(5)+" m\u00b2"+pv+"<\/td><\/tr>",
    "<tr><td>Material Family<\/td><td>"+esc(radiator.material_family_ref||"—")+"<\/td><\/tr>",
    "<\/table><\/div>",
    "<div class='sec'><div class='st'>Branches<\/div><p style='font-size:13px;padding:4px 0;'>"+esc(branchText)+"<\/p><\/div>",
    "<div class='sec'><div class='st'>Research Required Items<\/div><ul>"+reqItems+"<\/ul><\/div>",
    "<div class='sec'><div class='st'>Bundle Manifest<\/div>",
    "<table><tr><th>File<\/th><th>Size<\/th><\/tr>"+manifRows+"<\/table><\/div>",
    "<div class='sec'><div class='st'>Transform Trace<\/div><ul>"+traceItems+"<\/ul><\/div>",
    "<div class='foot'>\u00a9 2026 Exnulla, a division of Lake Area LLC. All Rights Reserved. &nbsp;|&nbsp; Preview surface only \u2014 runtime-authoritative execution required.<\/div>",
    "<script>",
    "var _ef="+filesJson+";",
    "var _bn="+JSON.stringify(bundleName)+";",
    "async function dlBundle(){",
    "  if(typeof JSZip!=='undefined'){",
    "    var z=new JSZip();",
    "    _ef.forEach(function(f){z.file(f.name,f.content);});",
    "    z.generateAsync({type:'blob'}).then(function(b){",
    "      var u=URL.createObjectURL(b);var a=document.createElement('a');",
    "      a.href=u;a.download=_bn;a.click();",
    "    });",
    "  } else {",
    "    var rp=_ef.find(function(f){return f.name==='run-packet.json';});",
    "    if(rp){var b=new Blob([rp.content],{type:'application/json'});",
    "      var u=URL.createObjectURL(b);var a=document.createElement('a');",
    "      a.href=u;a.download='run-packet.json';a.click();}",
    "  }",
    "}",
    "<\/script><\/body><\/html>"
  ];

  var html = parts.join("\n");
  var blob = new Blob([html], {type: "text/html"});
  var url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

function downloadBlob(blob, filename, type) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Extension 2 — Populate dropdowns  spec §4.1, §14.2, §14.3, §14.4 ────────

function populateExt2Dropdowns() {
  // Source spectral profiles — spec §6, §14.2
  const ssp = CATALOGS["source-spectral-profiles"];
  const sspSel = document.getElementById("source_spectral_profile_ref");
  if (sspSel && ssp && !ssp.load_error) {
    sspSel.innerHTML = '<option value="">— none / use derived profile —</option>';
    for (const e of (ssp.entries || [])) {
      const opt = document.createElement("option");
      opt.value = e.profile_id;
      opt.textContent = e.label;
      sspSel.appendChild(opt);
    }
  }

  // Absorber families — spec §7
  window._absorberFamilies = CATALOGS["absorber-families"]?.entries ?? [];
  window._emitterFamilies  = CATALOGS["emitter-families"]?.entries ?? [];
  window._cavityGeometries = CATALOGS["cavity-geometries"]?.entries ?? [];
  window._mediatorFamilies = CATALOGS["mediator-families"]?.entries ?? [];

  // Ext2 emitter family dropdown in Tab 5 — spec §14.4
  const ef2Sel = document.getElementById("ext2_emitter_family_ref");
  if (ef2Sel) {
    ef2Sel.innerHTML = '<option value="">— none —</option>';
    for (const e of window._emitterFamilies) {
      const opt = document.createElement("option");
      opt.value = e.emitter_family_id;
      opt.textContent = e.label;
      ef2Sel.appendChild(opt);
    }
  }
}

// ── Extension 2 — Enable / disable toggle  spec §5.3, §14.1 ─────────────────

function onExt2EnableChange() {
  const enabled = val("enable_model_extension_2") === "true";
  document.getElementById("ext2-scenario-fields").style.display = enabled ? "block" : "none";
  document.getElementById("ext2-compute-section").style.display = enabled ? "block" : "none";
  document.getElementById("ext2-thermal-section").style.display = enabled ? "block" : "none";
  document.getElementById("ext2-radiator-section").style.display = enabled ? "block" : "none";
  document.getElementById("ext2-output-section").style.display = enabled ? "block" : "none";
  if (enabled) {
    updateTab2WienHelper();
    updateExt2OutputSection();
  }
}

// ── Extension 2 — Tab 2 Wien helper  spec §6.4, §14.2 ───────────────────────

function updateTab2WienHelper() {
  const ssp = CATALOGS["source-spectral-profiles"];
  const profileRef = val("source_spectral_profile_ref");
  const card = document.getElementById("ext2-profile-card");
  const wienCard = document.getElementById("ext2-wien-card");
  const derivedBadge = document.getElementById("ext2-derived-badge");
  if (!card || !wienCard) return;

  if (!profileRef) {
    card.style.display = "none";
    wienCard.style.display = "none";
    if (derivedBadge) derivedBadge.style.display = "block";
    return;
  }
  if (derivedBadge) derivedBadge.style.display = "none";

  const entry = (ssp?.entries || []).find((e) => e.profile_id === profileRef);
  if (!entry) { card.style.display = "none"; wienCard.style.display = "none"; return; }

  card.style.display = "block";
  card.innerHTML =
    `<strong>${entry.label}</strong> | Class: <code>${entry.profile_class}</code> | ` +
    `T<sub>nom</sub>: ${entry.temperature_basis_nominal_k} K | ` +
    `Band: ${entry.wavelength_band_min_um}–${entry.wavelength_band_max_um} µm | ` +
    `ε: ${entry.emissivity_basis} | ` +
    `<span class="maturity-tag maturity-${entry.maturity_class ?? 'experimental'}">${entry.maturity_class ?? 'unknown'}</span>` +
    (entry.research_required ? ` <span style="color:var(--warn)">⚠ research_required</span>` : "") +
    `<br><em>${entry.source_note ?? ""}</em>`;

  // Wien-law helper — spec §6.4 — display-only
  const T_nom = entry.temperature_basis_nominal_k;
  if (T_nom > 0) {
    const lambda_peak = 2897.771955 / T_nom;
    wienCard.style.display = "block";
    wienCard.innerHTML =
      `<strong>Wien λ<sub>peak</sub> helper (display-only, spec §6.4):</strong> ` +
      `At T = ${T_nom} K → λ<sub>peak</sub> ≈ <strong>${lambda_peak.toFixed(3)} µm</strong> | ` +
      `Declared peak: ${entry.wavelength_band_peak_um} µm` +
      (entry.temperature_basis_min_k !== entry.temperature_basis_max_k
        ? ` | T range: ${entry.temperature_basis_min_k}–${entry.temperature_basis_max_k} K`
        : "");
  } else {
    wienCard.style.display = "none";
  }
}

// ── Extension 2 — Tab 4 Stage block editor  spec §11, §14.3 ─────────────────

function stageDropdownOpts(entries, idField, labelField, selectedVal) {
  return ['<option value="">— none —</option>',
    ...(entries || []).map((e) =>
      `<option value="${e[idField]}" ${e[idField] === selectedVal ? "selected" : ""}>${e[labelField]}</option>`)
  ].join("");
}

function sspDropdownOpts(selectedVal) {
  const entries = CATALOGS["source-spectral-profiles"]?.entries ?? [];
  return ['<option value="">— none —</option>',
    ...entries.map((e) =>
      `<option value="${e.profile_id}" ${e.profile_id === selectedVal ? "selected" : ""}>${e.label}</option>`)
  ].join("");
}

function stageBlockId(label, idx) {
  const slug = (label || "stage").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `stage-${slug}-${String(idx).padStart(3, "0")}`;
}

function addStageBlock(data = {}) {
  const idx = stageBlocks.length;
  const block = {
    spectral_stage_id: data.spectral_stage_id || stageBlockId(data.label || `stage-${idx}`, idx),
    label: data.label || `Stage ${idx + 1}`,
    enabled: data.enabled !== undefined ? data.enabled : true,
    source_zone_ref: data.source_zone_ref || "",
    target_zone_ref: data.target_zone_ref || "",
    source_spectral_profile_ref: data.source_spectral_profile_ref || val("source_spectral_profile_ref") || "",
    absorber_family_ref: data.absorber_family_ref || "",
    emitter_family_ref: data.emitter_family_ref || "",
    cavity_geometry_ref: data.cavity_geometry_ref || "",
    mediator_family_ref: data.mediator_family_ref || "",
    stage_mode: data.stage_mode || "passive_capture",
    capture_efficiency_fraction: data.capture_efficiency_fraction ?? 0.1,
    band_match_score: data.band_match_score ?? 0.5,
    geometry_coupling_score: data.geometry_coupling_score ?? 0.5,
    mediator_transfer_score: data.mediator_transfer_score ?? 0.5,
    regeneration_effectiveness: data.regeneration_effectiveness ?? 0.0,
    thermal_loss_fraction: data.thermal_loss_fraction ?? 0.05,
    work_input_w: data.work_input_w ?? 0,
    external_heat_input_w: data.external_heat_input_w ?? 0,
    storage_drawdown_w: data.storage_drawdown_w ?? 0,
    source_capture_fraction_override: data.source_capture_fraction_override ?? 0,
    provenance_class: data.provenance_class || "placeholder",
    maturity_class: data.maturity_class || "concept_only",
    confidence_class: data.confidence_class || "low",
    research_required: data.research_required !== undefined ? data.research_required : true,
    notes: data.notes || "",
  };
  stageBlocks.push(block);
  renderStageBlocks();
}

function stageValidityCheck(b) {
  const issues = [];
  if (!b.absorber_family_ref) issues.push("absorber_family_ref not set");
  if (!b.emitter_family_ref) issues.push("emitter_family_ref not set");
  if (!b.cavity_geometry_ref) issues.push("cavity_geometry_ref not set");
  if (!b.mediator_family_ref) issues.push("mediator_family_ref not set");
  if (!b.source_zone_ref) issues.push("source_zone_ref not set");
  if (b.capture_efficiency_fraction <= 0) issues.push("capture_efficiency_fraction is 0");
  if (b.research_required) issues.push("research_required flagged");
  const isBlock = issues.filter((i) => !i.includes("research_required")).length > 0;
  return { issues, severity: isBlock ? "block" : (issues.length > 0 ? "warn" : "ok") };
}

function renderStageBlocks() {
  const list = document.getElementById("stage-block-list");
  if (!list) return;
  list.innerHTML = "";
  stageBlocks.forEach((b, idx) => {
    const validity = stageValidityCheck(b);
    const validityHtml = validity.severity === "ok"
      ? `<div class="stage-validity stage-validity-ok">✓ Stage inputs complete</div>`
      : validity.severity === "warn"
      ? `<div class="stage-validity stage-validity-warn">⚠ ${validity.issues.join(" · ")}</div>`
      : `<div class="stage-validity stage-validity-block">✗ ${validity.issues.join(" · ")}</div>`;

    const card = document.createElement("div");
    card.className = "stage-card";
    card.innerHTML = `
      <div class="stage-header">
        <span>Stage ${idx + 1} — <code>${b.spectral_stage_id}</code>
          <span class="ext2-badge" style="margin-left:6px;">${b.maturity_class}</span>
          ${b.enabled ? "" : '<span style="color:var(--text-dim);margin-left:4px;">[disabled]</span>'}
        </span>
        <button class="btn btn-secondary btn-sm" onclick="duplicateStageBlock(${idx})">Dup</button>
        <button class="btn btn-secondary btn-sm" onclick="moveStageBlock(${idx},-1)">↑</button>
        <button class="btn btn-secondary btn-sm" onclick="moveStageBlock(${idx},1)">↓</button>
        <button class="btn btn-danger btn-sm" onclick="removeStageBlock(${idx})">Remove</button>
      </div>
      <div class="block-grid">
        <div class="block-field"><label>Label</label>
          <input type="text" value="${b.label}" oninput="stageBlockChange(${idx},'label',this.value)" /></div>
        <div class="block-field"><label>Enabled</label>
          <select onchange="stageBlockChange(${idx},'enabled',this.value==='true')">
            <option value="true" ${b.enabled?"selected":""}>Yes</option>
            <option value="false" ${!b.enabled?"selected":""}>No</option>
          </select></div>
        <div class="block-field"><label>Source Zone Ref</label>
          <input type="text" value="${b.source_zone_ref}" oninput="stageBlockChange(${idx},'source_zone_ref',this.value)" /></div>
        <div class="block-field"><label>Target Zone Ref</label>
          <input type="text" value="${b.target_zone_ref}" oninput="stageBlockChange(${idx},'target_zone_ref',this.value)" /></div>
        <div class="block-field"><label>Source Spectral Profile</label>
          <select onchange="stageBlockChange(${idx},'source_spectral_profile_ref',this.value)">${sspDropdownOpts(b.source_spectral_profile_ref)}</select></div>
        <div class="block-field"><label>Absorber Family</label>
          <select onchange="stageBlockChange(${idx},'absorber_family_ref',this.value)">${stageDropdownOpts(window._absorberFamilies,'absorber_family_id','label',b.absorber_family_ref)}</select></div>
        <div class="block-field"><label>Emitter Family</label>
          <select onchange="stageBlockChange(${idx},'emitter_family_ref',this.value)">${stageDropdownOpts(window._emitterFamilies,'emitter_family_id','label',b.emitter_family_ref)}</select></div>
        <div class="block-field"><label>Cavity Geometry</label>
          <select onchange="stageBlockChange(${idx},'cavity_geometry_ref',this.value)">${stageDropdownOpts(window._cavityGeometries,'cavity_geometry_id','label',b.cavity_geometry_ref)}</select></div>
        <div class="block-field"><label>Mediator Family</label>
          <select onchange="stageBlockChange(${idx},'mediator_family_ref',this.value)">${stageDropdownOpts(window._mediatorFamilies,'mediator_family_id','label',b.mediator_family_ref)}</select></div>
        <div class="block-field"><label>Stage Mode</label>
          <select onchange="stageBlockChange(${idx},'stage_mode',this.value)">
            <option value="passive_capture" ${b.stage_mode==="passive_capture"?"selected":""}>passive_capture</option>
            <option value="capture_to_regen_store" ${b.stage_mode==="capture_to_regen_store"?"selected":""}>capture_to_regen_store</option>
            <option value="capture_to_active_hot_island" ${b.stage_mode==="capture_to_active_hot_island"?"selected":""}>capture_to_active_hot_island</option>
            <option value="capture_plus_solar_polish" ${b.stage_mode==="capture_plus_solar_polish"?"selected":""}>capture_plus_solar_polish</option>
            <option value="custom" ${b.stage_mode==="custom"?"selected":""}>custom</option>
          </select></div>
        <div class="block-field"><label>Capture Efficiency (0–1)</label>
          <input type="number" min="0" max="1" step="0.01" value="${b.capture_efficiency_fraction}" oninput="stageBlockChange(${idx},'capture_efficiency_fraction',+this.value)" /></div>
        <div class="block-field"><label>Band Match Score (0–1)</label>
          <input type="number" min="0" max="1" step="0.01" value="${b.band_match_score}" oninput="stageBlockChange(${idx},'band_match_score',+this.value)" /></div>
        <div class="block-field"><label>Geometry Coupling (0–1)</label>
          <input type="number" min="0" max="1" step="0.01" value="${b.geometry_coupling_score}" oninput="stageBlockChange(${idx},'geometry_coupling_score',+this.value)" /></div>
        <div class="block-field"><label>Mediator Transfer (0–1)</label>
          <input type="number" min="0" max="1" step="0.01" value="${b.mediator_transfer_score}" oninput="stageBlockChange(${idx},'mediator_transfer_score',+this.value)" /></div>
        <div class="block-field"><label>Regen Effectiveness (0–1)</label>
          <input type="number" min="0" max="1" step="0.01" value="${b.regeneration_effectiveness}" oninput="stageBlockChange(${idx},'regeneration_effectiveness',+this.value)" /></div>
        <div class="block-field"><label>Thermal Loss Fraction (0–1)</label>
          <input type="number" min="0" max="0.999" step="0.01" value="${b.thermal_loss_fraction}" oninput="stageBlockChange(${idx},'thermal_loss_fraction',+this.value)" /></div>
        <div class="block-field"><label>Work Input (W)</label>
          <input type="number" min="0" value="${b.work_input_w}" oninput="stageBlockChange(${idx},'work_input_w',+this.value)" /></div>
        <div class="block-field"><label>External Heat Input (W)</label>
          <input type="number" min="0" value="${b.external_heat_input_w}" oninput="stageBlockChange(${idx},'external_heat_input_w',+this.value)" /></div>
        <div class="block-field"><label>Storage Drawdown (W)</label>
          <input type="number" min="0" value="${b.storage_drawdown_w}" oninput="stageBlockChange(${idx},'storage_drawdown_w',+this.value)" /></div>
        <div class="block-field"><label>Source Capture Override (0–1)</label>
          <input type="number" min="0" max="1" step="0.01" value="${b.source_capture_fraction_override}" oninput="stageBlockChange(${idx},'source_capture_fraction_override',+this.value)" /></div>
        <div class="block-field"><label>Provenance Class</label>
          <select onchange="stageBlockChange(${idx},'provenance_class',this.value)">
            <option value="measured" ${b.provenance_class==="measured"?"selected":""}>measured</option>
            <option value="literature_derived" ${b.provenance_class==="literature_derived"?"selected":""}>literature_derived</option>
            <option value="analog_estimated" ${b.provenance_class==="analog_estimated"?"selected":""}>analog_estimated</option>
            <option value="placeholder" ${b.provenance_class==="placeholder"?"selected":""}>placeholder</option>
            <option value="hypothesis_only" ${b.provenance_class==="hypothesis_only"?"selected":""}>hypothesis_only</option>
          </select></div>
        <div class="block-field"><label>Maturity Class</label>
          <select onchange="stageBlockChange(${idx},'maturity_class',this.value)">
            <option value="concept_only" ${b.maturity_class==="concept_only"?"selected":""}>concept_only</option>
            <option value="bench_evidence" ${b.maturity_class==="bench_evidence"?"selected":""}>bench_evidence</option>
            <option value="modeled_only" ${b.maturity_class==="modeled_only"?"selected":""}>modeled_only</option>
            <option value="heritage_analog" ${b.maturity_class==="heritage_analog"?"selected":""}>heritage_analog</option>
            <option value="qualified_estimate" ${b.maturity_class==="qualified_estimate"?"selected":""}>qualified_estimate</option>
            <option value="custom" ${b.maturity_class==="custom"?"selected":""}>custom</option>
          </select></div>
        <div class="block-field"><label>Confidence Class</label>
          <select onchange="stageBlockChange(${idx},'confidence_class',this.value)">
            <option value="low" ${b.confidence_class==="low"?"selected":""}>low</option>
            <option value="medium" ${b.confidence_class==="medium"?"selected":""}>medium</option>
            <option value="high" ${b.confidence_class==="high"?"selected":""}>high</option>
            <option value="unknown" ${b.confidence_class==="unknown"?"selected":""}>unknown</option>
          </select></div>
        <div class="block-field"><label>Research Required</label>
          <select onchange="stageBlockChange(${idx},'research_required',this.value==='true')">
            <option value="true" ${b.research_required?"selected":""}>Yes — flag for review</option>
            <option value="false" ${!b.research_required?"selected":""}>No</option>
          </select></div>
        <div class="block-field" style="grid-column:1/-1;"><label>Notes</label>
          <input type="text" value="${b.notes}" oninput="stageBlockChange(${idx},'notes',this.value)" /></div>
      </div>
      ${validityHtml}`;
    list.appendChild(card);
  });
  updateExt2OutputSection();
}

window.stageBlockChange = (idx, field, value) => {
  if (stageBlocks[idx]) { stageBlocks[idx][field] = value; renderStageBlocks(); }
};
window.removeStageBlock = (idx) => { stageBlocks.splice(idx, 1); renderStageBlocks(); };
window.duplicateStageBlock = (idx) => { addStageBlock({ ...stageBlocks[idx], spectral_stage_id: undefined, label: stageBlocks[idx].label + " (copy)" }); };
window.moveStageBlock = (idx, dir) => {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= stageBlocks.length) return;
  [stageBlocks[idx], stageBlocks[newIdx]] = [stageBlocks[newIdx], stageBlocks[idx]];
  renderStageBlocks();
};

// ── Extension 2 — Tab 5 emitter card + radiator comparison  spec §14.4 ───────

function updateExt2EmitterCard() {
  const ref = val("ext2_emitter_family_ref");
  const card = document.getElementById("ext2-emitter-card");
  if (!card) return;
  if (!ref) { card.style.display = "none"; return; }
  const entry = (window._emitterFamilies || []).find((e) => e.emitter_family_id === ref);
  if (!entry) { card.style.display = "none"; return; }
  card.style.display = "block";
  card.innerHTML =
    `<strong>${entry.label}</strong> | ε: ${entry.emissivity_target} | ` +
    `T range: ${entry.emission_temp_range_min_k}–${entry.emission_temp_range_max_k} K | ` +
    `<span class="maturity-tag maturity-${entry.maturity_class ?? 'experimental'}">${entry.maturity_class ?? 'unknown'}</span>` +
    (entry.research_required ? ` <span style="color:var(--warn)">⚠ research_required</span>` : "") +
    `<br><em>${entry.description_note ?? ""}</em>`;
  updateExt2RadiatorComparison();
}

function updateExt2RadiatorComparison() {
  // spec §14.4 — display-only baseline vs exploratory radiator summary
  const card = document.getElementById("ext2-radiator-comparison");
  if (!card) return;
  if (val("enable_model_extension_2") !== "true") { card.style.display = "none"; return; }

  const eps_baseline = numVal("emissivity", 0.9);
  const F = numVal("view_factor", 1.0);
  const T_rad = numVal("target_surface_temp_k", 1200);
  const T_sink = numVal("sink_temp_k", 0);
  const dc = numVal("device_count", 1);
  const dp = getDevicePowerAtState();
  const overhead = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") + numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const Q_baseline = dc * dp + overhead;

  const denom_base = eps_baseline * SIGMA * F * (Math.pow(T_rad, 4) - Math.pow(T_sink, 4));
  if (denom_base <= 0 || Q_baseline <= 0) { card.style.display = "none"; return; }
  const A_baseline = Q_baseline / denom_base;

  // Exploratory: compute simple eta product from enabled stages (display preview)
  const enabledStages = stageBlocks.filter((s) => s.enabled);
  let q_recovered = 0;
  for (const s of enabledStages) {
    const eta = s.capture_efficiency_fraction * s.band_match_score * s.geometry_coupling_score *
      s.mediator_transfer_score * (1 - s.thermal_loss_fraction);
    const cap_frac = s.source_capture_fraction_override > 0 ? s.source_capture_fraction_override : s.capture_efficiency_fraction;
    const q_avail = Q_baseline * cap_frac;
    q_recovered += q_avail * eta + s.external_heat_input_w + s.storage_drawdown_w - s.work_input_w;
  }
  const Q_exploratory = Math.max(0, Q_baseline - q_recovered);
  const A_exploratory = Q_exploratory / denom_base;
  const delta_A = A_exploratory - A_baseline;

  card.style.display = "block";
  card.innerHTML =
    `<strong>Radiator Comparison Preview (display-only, spec §14.4):</strong><br>` +
    `Baseline: Q≈${Q_baseline.toFixed(0)} W → A≈${A_baseline.toFixed(4)} m²<br>` +
    `Exploratory: Q≈${Q_exploratory.toFixed(0)} W → A≈${A_exploratory.toFixed(4)} m² ` +
    `(<span class="${delta_A < 0 ? "delta-negative" : delta_A > 0 ? "delta-positive" : "delta-zero"}">${delta_A >= 0 ? "+" : ""}${delta_A.toFixed(4)} m²</span>)` +
    `<br><em>Stage count: ${enabledStages.length} enabled / ${stageBlocks.length} total — EXPLORATORY_ONLY</em>`;
}

// ── Extension 2 — Tab 7 output section  spec §14.5 ───────────────────────────

function updateExt2OutputSection() {
  if (val("enable_model_extension_2") !== "true") return;

  const mode = val("model_extension_2_mode") || "disabled";
  const eps = numVal("emissivity", 0.9);
  const F = numVal("view_factor", 1.0);
  const T_rad = numVal("target_surface_temp_k", 1200);
  const T_sink = numVal("sink_temp_k", 0);
  const dc = numVal("device_count", 1);
  const dp = getDevicePowerAtState();
  const overhead = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") + numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const Q_baseline = dc * dp + overhead;
  const denom = eps * SIGMA * F * (Math.pow(T_rad, 4) - Math.pow(T_sink, 4));
  const A_baseline = denom > 0 ? Q_baseline / denom : 0;

  // Baseline summary — spec §14.5
  const bsEl = document.getElementById("ext2-baseline-summary");
  if (bsEl) {
    bsEl.innerHTML =
      `<strong>Baseline:</strong> Q = ${Q_baseline.toFixed(1)} W | ` +
      `T_rad = ${T_rad} K | ε = ${eps} | F = ${F} | ` +
      `A_eff ≈ ${A_baseline.toFixed(4)} m² (display preview, not authoritative)`;
  }

  // Exploratory summary + delta — spec §14.5
  const enabledStages = stageBlocks.filter((s) => s.enabled);
  let q_recovered = 0;
  const stageDetails = [];
  for (const s of enabledStages) {
    const eta = s.capture_efficiency_fraction * s.band_match_score * s.geometry_coupling_score *
      s.mediator_transfer_score * (1 - s.thermal_loss_fraction);
    const cap_frac = s.source_capture_fraction_override > 0 ? s.source_capture_fraction_override : s.capture_efficiency_fraction;
    const q_avail = Q_baseline * cap_frac;
    const q_useful = q_avail * eta + s.external_heat_input_w + s.storage_drawdown_w - s.work_input_w;
    const q_residual = q_avail - q_useful;
    q_recovered += q_useful;
    stageDetails.push({ id: s.spectral_stage_id, label: s.label, eta, q_avail, q_useful, q_residual });
  }
  const Q_exploratory = Math.max(0, Q_baseline - q_recovered);
  const A_exploratory = denom > 0 ? Q_exploratory / denom : 0;
  const delta_A = A_exploratory - A_baseline;
  const delta_Q = Q_exploratory - Q_baseline;

  const exEl = document.getElementById("ext2-exploratory-summary");
  if (exEl) {
    exEl.innerHTML = mode === "disabled"
      ? `Extension 2 mode is <strong>disabled</strong>. No exploratory computation.`
      : `<strong>Exploratory (${mode}):</strong> Q_exploratory ≈ ${Q_exploratory.toFixed(1)} W | ` +
        `A_exploratory ≈ ${A_exploratory.toFixed(4)} m² | ` +
        `Q_recovered ≈ ${q_recovered.toFixed(1)} W from ${enabledStages.length} stage(s) — EXPLORATORY_ONLY`;
  }

  // Delta table — spec §14.5
  const dtEl = document.getElementById("ext2-delta-table");
  if (dtEl) {
    const deltaQClass = delta_Q < 0 ? "delta-negative" : delta_Q > 0 ? "delta-positive" : "delta-zero";
    const deltaAClass = delta_A < 0 ? "delta-negative" : delta_A > 0 ? "delta-positive" : "delta-zero";
    dtEl.innerHTML = mode === "disabled" ? "" : `
      <table class="delta-table">
        <tr><th>Metric</th><th>Baseline</th><th>Exploratory</th><th>Delta</th></tr>
        <tr><td>Q reject (W)</td><td>${Q_baseline.toFixed(1)}</td><td>${Q_exploratory.toFixed(1)}</td><td class="${deltaQClass}">${delta_Q >= 0 ? "+" : ""}${delta_Q.toFixed(1)}</td></tr>
        <tr><td>A radiator (m²)</td><td>${A_baseline.toFixed(4)}</td><td>${A_exploratory.toFixed(4)}</td><td class="${deltaAClass}">${delta_A >= 0 ? "+" : ""}${delta_A.toFixed(4)}</td></tr>
        <tr><td colspan="4" style="font-size:10px;color:var(--text-dim);font-style:italic;">EXPLORATORY_ONLY — Not proven hardware performance</td></tr>
      </table>`;
  }

  // Stage manifest summary — spec §14.5
  const smEl = document.getElementById("ext2-stage-manifest");
  if (smEl) {
    if (stageBlocks.length === 0) {
      smEl.innerHTML = "No spectral stage blocks defined.";
    } else {
      smEl.innerHTML = stageDetails.map((s) =>
        `• <strong>${s.label}</strong> (${s.id}) | η≈${s.eta.toFixed(4)} | Q_useful≈${s.q_useful.toFixed(1)} W`
      ).join("<br>") + (enabledStages.length < stageBlocks.length
        ? `<br><em>${stageBlocks.length - enabledStages.length} stage(s) disabled</em>` : "");
    }
  }

  // Research confidence summary — spec §14.5
  const rcEl = document.getElementById("ext2-confidence-summary");
  if (rcEl) {
    const confMap = { high: 0, medium: 0, low: 0, unknown: 0 };
    const provMap = {};
    stageBlocks.forEach((s) => {
      if (confMap[s.confidence_class] !== undefined) confMap[s.confidence_class]++;
      provMap[s.provenance_class] = (provMap[s.provenance_class] || 0) + 1;
    });
    const researchRequired = stageBlocks.filter((s) => s.research_required).length;
    rcEl.innerHTML =
      `Confidence: ` +
      Object.entries(confMap).map(([k, v]) => v > 0
        ? `<span class="confidence-bar conf-${k}" style="width:${v * 10}px;">&nbsp;</span>${k}: ${v}`
        : ""
      ).filter(Boolean).join(" | ") +
      `<br>Provenance: ${Object.entries(provMap).map(([k, v]) => `${k}: ${v}`).join(" | ") || "none"}` +
      `<br>Research-required stages: <strong>${researchRequired} / ${stageBlocks.length}</strong>`;
  }

  // Blocking validation list — spec §14.5
  const blEl = document.getElementById("ext2-blocking-list");
  if (blEl) {
    const blockIssues = [];
    stageBlocks.forEach((s, i) => {
      const v = stageValidityCheck(s);
      v.issues.filter((iss) => !iss.includes("research_required")).forEach((iss) => {
        blockIssues.push({ label: `Stage ${i + 1} (${s.label})`, issue: iss });
      });
    });
    if (blockIssues.length === 0) {
      blEl.innerHTML = '<div class="validation-item v-ok"><span class="icon">✓</span>No Extension 2 blocking issues.</div>';
    } else {
      blEl.innerHTML = blockIssues.map((bi) =>
        `<div class="validation-item v-block"><span class="icon">✗</span>BLOCKING [${bi.label}]: ${bi.issue}</div>`
      ).join("");
    }
  }
}
