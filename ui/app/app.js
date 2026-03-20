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
  document.getElementById("build-packet-btn").addEventListener("click", buildPacket);
  document.getElementById("solar_polish_enabled")?.addEventListener("change", (e) => {
    document.getElementById("solar-polish-warning").style.display = e.target.value === "true" ? "block" : "none";
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

  // Derived summary table
  const sid = val("scenario_id_display");
  document.getElementById("sum-scenario-id").textContent = sid;
  document.getElementById("sum-node-class").textContent = val("node_class");
  document.getElementById("sum-arch-class").textContent = val("architecture_class");
  const dc = numVal("device_count", 1);
  const dp = getDevicePowerAtState();
  document.getElementById("sum-device-total").textContent = `${dc} × ${dp} W = ${(dc * dp).toFixed(0)} W`;
  const overhead = numVal("w_dot_memory_w") + numVal("w_dot_storage_w") + numVal("w_dot_network_w") + numVal("w_dot_power_conversion_w") + numVal("w_dot_control_w");
  const compute_total = dc * dp + overhead;
  document.getElementById("sum-compute-total").textContent = `${compute_total.toFixed(1)} W (preview)`;

  let nc_total = 0;
  for (const b of payloadBlocks) {
    const df = b.duty_mode === "continuous" ? 1.0 : (parseFloat(b.duty_fraction) || 0);
    nc_total += ((parseFloat(b.rf_comms_power_w) || 0) + (parseFloat(b.telemetry_power_w) || 0) + (parseFloat(b.radar_power_w) || 0) + (parseFloat(b.optical_crosslink_power_w) || 0)) * df;
  }
  document.getElementById("sum-noncompute-total").textContent = `${nc_total.toFixed(1)} W (preview)`;

  const T   = numVal("target_surface_temp_k", 1200);
  const eps = numVal("emissivity", 0.9);
  const F   = numVal("view_factor", 1.0);
  const Ts  = numVal("sink_temp_k", 0);
  const mrg = numVal("reserve_margin_fraction", 0.15);
  document.getElementById("sum-radiator-temp").textContent = `${T} K`;
  const Q = compute_total + nc_total;
  const denom = eps * SIGMA * F * (Math.pow(T,4) - Math.pow(Ts,4));
  if (denom > 0) {
    const A_eff = Q / denom;
    document.getElementById("sum-radiator-area").textContent = `${A_eff.toFixed(4)} m² (preview)`;
    document.getElementById("sum-radiator-margin").textContent = `${(A_eff * (1 + mrg)).toFixed(4)} m² (preview)`;
  }

  // Validation panel (client-side blocking checks per spec §21.1)
  renderValidationPanel();
}

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
    ],
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

  // manifest preview
  document.getElementById("manifest-preview").innerHTML =
    files.map((f) => `${f.name} — ${new TextEncoder().encode(f.content).length} bytes`).join("<br>");

  // transform trace
  document.getElementById("transform-trace-preview").textContent = transform_trace.join("\n");

  // research required
  document.getElementById("research-required-preview").innerHTML =
    state.research_required_items.length ? state.research_required_items.map((r) => `• ${r}`).join("<br>") : "None declared";

  // output preview (run-packet.json)
  const rp = files.find((f) => f.name === "run-packet.json");
  document.getElementById("output-preview").textContent = rp ? rp.content : "(no run-packet generated)";

  // show download
  document.getElementById("download-packet-btn").style.display = "inline-block";
  document.getElementById("download-packet-btn").onclick = downloadBundle;

  // warnings
  if (warnings.length) {
    document.getElementById("transform-trace-preview").textContent +=
      "\n\nWARNINGS:\n" + warnings.map((w) => "⚠ " + w).join("\n");
  }

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

function downloadBlob(blob, filename, type) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
