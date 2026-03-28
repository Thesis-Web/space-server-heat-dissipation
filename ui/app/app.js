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
let zoneBlocks    = []; // Extension 3A thermal zone blocks — spec §6, blueprint §11.1

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
  populateExt3aCatalogDropdowns(); // Extension 3A — blueprint §11.1
  populateExt3bCatalogDropdowns(); // Extension 3B — 3B-spec §16
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
  // Seed compute_module_defaults — device count, load state, redundancy from preset
  if (entry.compute_module_defaults) {
    const cm = entry.compute_module_defaults;
    if (cm.device_count !== undefined) { const el = document.getElementById("device_count"); if (el) el.value = cm.device_count; }
    if (cm.target_load_state)  setValue("target_load_state", cm.target_load_state);
    if (cm.redundancy_mode)    setValue("redundancy_mode", cm.redundancy_mode);
    updateComputePreview();
  }
  if (entry.radiator_defaults) {
    const rd = entry.radiator_defaults;
    if (rd.emissivity !== undefined) setValue("emissivity", rd.emissivity);
    if (rd.target_surface_temp_k !== undefined) setValue("target_surface_temp_k", rd.target_surface_temp_k);
    if (rd.sink_temp_k !== undefined) setValue("sink_temp_k", rd.sink_temp_k);
    if (rd.view_factor !== undefined) setValue("view_factor", rd.view_factor);
    if (rd.reserve_margin_fraction !== undefined) setValue("reserve_margin_fraction", rd.reserve_margin_fraction);
    // Seed radiator material family — deferred 150ms so catalog options are in DOM
    if (rd.material_family_ref) {
      const _matRef = rd.material_family_ref;
      setTimeout(() => {
        const _sel = document.getElementById("radiator_material_family_ref");
        if (_sel) { _sel.value = _matRef; _sel.dispatchEvent(new Event("change")); }
      }, 150);
    }
  }
  // Seed storage_defaults from preset — storage_class only; storage preset requires operator selection
  if (entry.storage_defaults?.storage_class) {
    setValue("storage_class", entry.storage_defaults.storage_class);
  }
  panel.style.display = "block";
  panel.innerHTML = `<strong>Preset:</strong> ${entry.label} | Node: ${entry.node_class} | Mode: ${entry.mission_mode_default}<br>` +
    (entry.risk_notes?.length ? `<span style="color:var(--warn)">⚠ ${entry.risk_notes.join(" · ")}</span>` : "");
  updateScenarioId();
  updateComputePreview();
  updateRadiatorPreview();
  updateNonComputeAggregate();

  // Seed topology template from preset — TOPO-TEMPLATE-001 / Option D
  // skipConfirm=true: operator chose preset, no additional confirm needed
  if (entry.topology_template_id) {
    // Sync template dropdown to reflect preset choice
    const tplSel = document.getElementById("topology-template-select");
    if (tplSel) tplSel.value = entry.topology_template_id;
    applyTopologyTemplate(entry.topology_template_id, true);
    // Show compatibility note on Tab 4 template selector
    const tplNote = document.getElementById("topology-template-note");
    if (tplNote) {
      const tpl = TOPOLOGY_TEMPLATES[entry.topology_template_id];
      if (tpl && entry.topology_template_id !== "custom") {
        const tierLabel = tpl.tier === 2 ? "⚠ EXPLORATORY — " : "✓ ";
        tplNote.style.display = "block";
        tplNote.className = tpl.tier === 2 ? "note warn-note" : "note";
        tplNote.innerHTML = `Seeded from scenario preset: <strong>${entry.label}</strong><br>` +
          `${tierLabel}${tpl.label} — ${tpl.description}<br>` +
          `<span style="color:var(--text-dim);font-size:11px;">Spawned ${tpl.zones.length} zone(s). All fields editable. Working fluids are suggestions.</span>`;
      }
    }
  }
  // Seed branch blocks from preset branch_defaults — clear and respawn per preset
  if (Array.isArray(entry.branch_defaults) && entry.branch_defaults.length > 0) {
    branchBlocks.length = 0;
    entry.branch_defaults.forEach((preset_id) => {
      addBranchBlock();
      const idx = branchBlocks.length - 1;
      // _branchPresets is populated by wireAllFields after catalog load — safe to call here
      if (window._branchPresets && window._branchPresets.length) {
        window.applyBranchPreset(idx, preset_id);
      }
    });
  } else if (Array.isArray(entry.branch_defaults) && entry.branch_defaults.length === 0) {
    // Preset explicitly declares no branches — clear any existing blocks
    branchBlocks.length = 0;
    renderBranchBlocks();
  }
  // Auto-derive branch source/sink zone refs from spawned topology.
  // source = first hot-side zone (accumulator/hx_hot_side/storage_buffer/hot_island)
  // sink   = first rejection zone (zone_role rejection or zone_type radiator_zone)
  // Operator can always override. Heuristic covers all current Tier 1 + Tier 2 templates.
  if (branchBlocks.length > 0 && zoneBlocks.length > 0) {
    const srcZone  = zoneBlocks.find(z =>
      z.loop_role === "accumulator" || z.loop_role === "hx_hot_side" ||
      z.zone_type === "storage_buffer" || z.zone_type === "hot_island"
    );
    const sinkZone = zoneBlocks.find(z =>
      z.zone_role === "rejection" || z.zone_type === "radiator_zone"
    );
    branchBlocks.forEach(b => {
      if (!b.source_zone_ref && srcZone)  b.source_zone_ref = srcZone.zone_id;
      if (!b.sink_zone_ref   && sinkZone) b.sink_zone_ref   = sinkZone.zone_id;
    });
    renderBranchBlocks();
  }
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
  // Prefill module overhead defaults from catalog — session 6
  if (entry.suggested_device_count !== undefined)            { const el=document.getElementById("device_count"); if(el) el.value=entry.suggested_device_count; }
  if (entry.suggested_memory_power_w !== undefined)          { const el=document.getElementById("w_dot_memory_w"); if(el) el.value=entry.suggested_memory_power_w; }
  if (entry.suggested_storage_power_w !== undefined)         { const el=document.getElementById("w_dot_storage_w"); if(el) el.value=entry.suggested_storage_power_w; }
  if (entry.suggested_network_power_w !== undefined)         { const el=document.getElementById("w_dot_network_w"); if(el) el.value=entry.suggested_network_power_w; }
  if (entry.suggested_power_conversion_overhead_w !== undefined) { const el=document.getElementById("w_dot_power_conversion_w"); if(el) el.value=entry.suggested_power_conversion_overhead_w; }
  if (entry.suggested_control_overhead_w !== undefined)      { const el=document.getElementById("w_dot_control_w"); if(el) el.value=entry.suggested_control_overhead_w; }
  updateComputePreview();
  setValue("compute_device_preset_id", preset_id);
  panel.style.display = "block";
  const mc = entry.maturity_class ?? "experimental";
  panel.innerHTML = `<span class="maturity-tag maturity-${mc}">${mc}</span> ${entry.performance_basis_note ?? ""}<br>` +
    `<em>Thermal basis:</em> ${entry.thermal_basis_note ?? ""}` +
    (entry.research_required ? `<br><span style="color:var(--warn)">⚠ research_required</span>` : "");
  updateComputePreview();
}

function applyStoragePreset(preset_id) {
  const cat = CATALOGS['storage-presets'];
  const entry = cat?.entries?.find((e) => e.preset_id === preset_id);
  if (entry.storage_class)                      setValue('storage_class', entry.storage_class);
  const cap  = document.getElementById('storage_capacity_j');    if (cap)  cap.value  = entry.storage_capacity_j  ?? 0;
  const chg  = document.getElementById('storage_charge_w');      if (chg)  chg.value  = entry.charge_power_limit_w ?? 0;
  const dis  = document.getElementById('storage_discharge_w');   if (dis)  dis.value  = entry.discharge_power_limit_w ?? 0;
  if (entry.topology_role !== undefined)        setValue('storage_topology_role', entry.topology_role);
  setValue('storage_research_required', entry.research_required ? 'true' : 'false');
  const note = document.getElementById('storage-preset-note');
  if (note) {
    note.style.display = entry.basis_note ? 'block' : 'none';
    note.innerHTML = entry.basis_note
      ? '<em>' + entry.label + ':</em> ' + entry.basis_note +
        (entry.research_required ? ' <span style="color:var(--warn)">⚠ research_required</span>' : '')
      : '';
  }
}

function populateMaterialFamilyDropdowns() {
  const cat = CATALOGS["material-families"];
  // Zone card material_family_ref dropdowns are populated at render time
  // via materialFamilyOptions() in renderZoneBlocks — not here.
  // Only the static radiator dropdown is populated at init.
  const radSel = document.getElementById("radiator_material_family_ref");
  if (radSel) {
    radSel.innerHTML = '<option value="">— none —</option>';
    if (cat && !cat.load_error) {
      for (const e of cat.entries) {
        const opt = document.createElement("option");
        opt.value = e.material_family_id;
        opt.textContent = e.label;
        radSel.appendChild(opt);
      }
    }
  }
  document.getElementById("radiator_material_family_ref").addEventListener("change", (e) => {
    const cat2 = CATALOGS["material-families"];
    const entry = lookupEntry(cat2, "material_family_id", e.target.value);
    const note = document.getElementById("radiator-material-note");
    if (!entry) { note.style.display = "none"; return; }
    note.style.display = "block";
    note.innerHTML = `<strong>${entry.label}</strong> | ε≈${entry.default_emissivity} | T max: ${entry.nominal_temp_max_k} K | ` +
      `Areal density: ${entry.estimated_areal_density_kg_per_m2} kg/m² | <span class="maturity-tag maturity-${entry.maturity_class}">${entry.maturity_class}</span>` +
      (entry.research_required ? ` <span style="color:var(--warn)">⚠ research_required</span>` : "");
    if (entry.default_emissivity !== undefined) { setValue('emissivity', entry.default_emissivity); updateRadiatorPreview(); }
    if (entry.nominal_temp_max_k !== undefined) { setValue('material_limit_temp_k', entry.nominal_temp_max_k); }
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
  document.getElementById("storage_preset_id")?.addEventListener("change", (e) => applyStoragePreset(e.target.value));
  document.getElementById("add-payload-block").addEventListener("click", addPayloadBlock);
  document.getElementById("add-branch-block").addEventListener("click", addBranchBlock);
  document.getElementById("add-stage-block")?.addEventListener("click", () => addStageBlock());
  document.getElementById("build-packet-btn").addEventListener("click", buildPacket);
  document.getElementById("architecture_class")?.addEventListener("change", (e) => {
    const isSolar = e.target.value === "cold_loop_plus_dual_hot_island_plus_solar_polish";
    const row = document.getElementById("solar-polish-row");
    const warn = document.getElementById("solar-polish-warning");
    const sel = document.getElementById("solar_polish_enabled");
    if (row) row.style.display = isSolar ? "flex" : "none";
    if (!isSolar && sel) sel.value = "false";
    if (warn) warn.style.display = "none";
  });
  document.getElementById("solar_polish_enabled")?.addEventListener("change", (e) => {
    document.getElementById("solar-polish-warning").style.display = e.target.value === "true" ? "block" : "none";
  });
  // Extension 2 enable toggle — spec §5.3, §14.1
  document.getElementById("enable_model_extension_2")?.addEventListener("change", onExt2EnableChange);
  // Extension 3A enable toggle — blueprint §11.1
  document.getElementById("enable_model_extension_3a")?.addEventListener("change", onExt3aEnableChange);
  // Extension 3B enable toggle and preset event wiring — 3B-spec §16
  wireExt3bEvents();
  // Extension 4 enable toggle wiring — ext4-spec §19.1, §19.4
  wireExt4Events();
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
        <div class="block-field"><label>Thermal Coupling Zone</label>
          <select onchange="payloadBlockChange(${idx},'thermal_coupling_zone_ref',this.value)">
            ${zoneRefOptions(b.thermal_coupling_zone_ref||'')}
          </select></div>
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
    t_hot_source_k: data.t_hot_source_k ?? 0,
    output_class:   data.output_class || 'heat_lift',
    t_cold_sink_k: data.t_cold_sink_k ?? 0,
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
        <div class="block-field"><label>T Hot Source (K)</label><input type="number" min="0" step="1" value="${b.t_hot_source_k}" oninput="branchBlockChange(${idx},'t_hot_source_k',+this.value)" /></div>
        <div class="block-field"><label>T Cold Sink (K)</label><input type="number" min="0" step="1" value="${b.t_cold_sink_k}" oninput="branchBlockChange(${idx},'t_cold_sink_k',+this.value)" /></div>
        <div class="block-field"><label>Source Zone Ref</label>
          <select onchange="branchBlockChange(${idx},'source_zone_ref',this.value)">
            ${zoneRefOptions(b.source_zone_ref)}
          </select></div>
        <div class="block-field"><label>Sink Zone Ref</label>
          <select onchange="branchBlockChange(${idx},'sink_zone_ref',this.value)">
            ${zoneRefOptions(b.sink_zone_ref)}
          </select></div>
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

  // Extension 3A output section visibility — blueprint §11.4
  const ext3aEnabled = val("enable_model_extension_3a") === "true";
  const ext3aOutSec = document.getElementById("ext3a-output-section");
  if (ext3aOutSec) ext3aOutSec.style.display = ext3aEnabled ? "block" : "none";
  if (ext3aEnabled) updateExt3aOutputSection();

  // Extension 4 output section visibility — ext4-spec §19.1, §19.3
  const ext4Enabled = val("enable_model_extension_4") === "true";
  const ext4OutSec = document.getElementById("ext4-output-section");
  if (ext4OutSec) ext4OutSec.style.display = ext4Enabled ? "block" : "none";

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

window.toggleRuntimeJsonPanel = () => {
  const wrap = document.getElementById("runtime-json-wrap");
  const lbl  = document.getElementById("runtime-json-toggle-label");
  if (!wrap) return;
  const show = wrap.style.display === "none";
  wrap.style.display = show ? "block" : "none";
  if (lbl) lbl.textContent = show ? "▼ hide" : "▶ show";
};

/**
 * Populate Tab 7 thermal + radiator cards with runtime-authoritative values.
 * Replaces browser-math previews. spec §4.1, §22.
 */
function populateRuntimeCards(result) {
  // Flip "preview" labels to "runtime ✓"
  const thermalNote = document.getElementById("out-thermal-title-note");
  if (thermalNote) thermalNote.textContent = "runtime ✓";
  const radNote = document.getElementById("out-radiator-title-note");
  if (radNote) radNote.textContent = "runtime ✓";

  const agg = result.aggregation_result;
  if (agg) {
    _setEl("out-device-power",         `${(agg.w_dot_device_at_state_w  || 0).toFixed(1)} W`);
    _setEl("out-compute-device-total", `${(agg.w_dot_devices_total_w    || 0).toFixed(1)} W`);
    _setEl("out-overhead",             `${((agg.w_dot_compute_module_w  || 0) - (agg.w_dot_devices_total_w || 0)).toFixed(1)} W`);
    _setEl("sum-compute-total",        `${(agg.w_dot_compute_module_w   || 0).toFixed(1)} W`);
    _setEl("out-total-reject",         `${(agg.q_dot_total_reject_w     || 0).toFixed(1)} W`);
    const nc = (agg.q_dot_total_reject_w || 0) - (agg.w_dot_compute_module_w || 0);
    _setEl("sum-noncompute-total",     `${Math.max(0, nc).toFixed(1)} W`);
  }
  const rad = result.radiator_result;
  if (rad) {
    _setEl("sum-radiator-area",   `${(rad.a_radiator_effective_m2    || 0).toFixed(4)} m²`);
    _setEl("sum-radiator-margin", `${(rad.a_with_margin_m2  || 0).toFixed(4)} m²`);
  }
}

/**
 * Render the risk summary card from runtime result. spec §22.
 * BEST-SOLVE-RISK-001: ttl_class, thermal_cycling_risk, packaging_stress,
 * compactness_stress are derived fields — approved derivation per diff/hole log.
 */
function populateRiskSummaryCard(result) {
  const rs = result && result.risk_summary;
  if (!rs) return;
  const card = document.getElementById("output-risk-card");
  if (!card) return;
  card.style.display = "block";

  const riskRow = (label, value) => {
    const cls = value && value !== "unknown" && value !== "no_material_selected" ? `maturity-${value}` : "";
    return `<div class="out-kv"><span class="out-label">${label}</span>` +
           `<span class="out-value"><span class="maturity-tag ${cls}">${value || "—"}</span></span></div>`;
  };
  const items = rs.research_required_items && rs.research_required_items.length
    ? rs.research_required_items.map(r => `<div style="padding:2px 0">⚠ ${r}</div>`).join("")
    : `<span style="color:var(--ok)">✓ None declared</span>`;

  const body = document.getElementById("out-risk-body");
  if (body) body.innerHTML =
    `<div class="out-grid">
      ${riskRow("Maturity Class",       rs.maturity_class)}
      ${riskRow("TTL Class",            rs.ttl_class)}
      ${riskRow("Thermal Cycling Risk", rs.thermal_cycling_risk)}
      ${riskRow("Corrosion Risk",       rs.corrosion_risk)}
      ${riskRow("Contamination Risk",   rs.contamination_risk)}
      ${riskRow("Vibration Risk",       rs.vibration_risk)}
      ${riskRow("Packaging Stress",     rs.packaging_stress)}
      ${riskRow("Compactness Stress",   rs.compactness_stress)}
    </div>
    <div style="margin-top:10px;"><strong style="font-size:11px;">Research Required Items</strong>
      <div style="margin-top:4px;font-size:11px;">${items}</div>
    </div>`;
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

  // Device power validation — operator must set at least full-load power
  if (numVal("power_full_w", 0) <= 0) issues.push({ s: "blocking", m: "power_full_w must be > 0 — select a device preset or enter device power" });
  // Monotonic load-state power check
  const pI=numVal("power_idle_w",0), pL=numVal("power_light_w",0), pM=numVal("power_medium_w",0), pF=numVal("power_full_w",0);
  if (pF > 0 && !(pI <= pL && pL <= pM && pM <= pF)) issues.push({ s: "warning", m: `Load-state powers not monotonic: idle=${pI} light=${pL} medium=${pM} full=${pF} — spec §16.2` });

  // Zone topology warning — only when 3A enabled
  if (val("enable_model_extension_3a") === "true" && zoneBlocks.length === 0) {
    issues.push({ s: "warning", m: "Extension 3A enabled but no thermal zone blocks defined" });
  }
  if (val("enable_model_extension_3a") === "true") {
    const noTopology = zoneBlocks.filter(z => !z.upstream_zone_ref && !z.downstream_zone_ref);
    if (noTopology.length > 0 && zoneBlocks.length > 1) {
      issues.push({ s: "warning", m: `${noTopology.length} zone(s) have no topology refs — connect upstream/downstream to form the graph` });
    }
    // chain_id cross-chain warnings
    const chainsPresent = new Set(zoneBlocks.map(z => z.chain_id).filter(Boolean));
    if (chainsPresent.size > 1) {
      const crossEdges = zoneBlocks.filter(z => {
        if (!z.downstream_zone_ref || !z.chain_id) return false;
        const down = zoneBlocks.find(b => b.zone_id === z.downstream_zone_ref);
        return down && down.chain_id && down.chain_id !== z.chain_id &&
               z.zone_role !== 'convergence_exchange' && !z.convergence_enabled &&
               down.zone_role !== 'convergence_exchange' && !down.convergence_enabled;
      });
      if (crossEdges.length > 0) {
        issues.push({ s: "blocking", m: `ZC-001: ${crossEdges.length} cross-chain connection(s) without HX boundary — add convergence_exchange zone between chains` });
      }
    }
  }

  // research_required device warning
  if (val("compute_device_preset_id") && val("compute_device_preset_id") !== "custom") {
    const devEntry = (CATALOGS["compute-device-presets"]?.entries||[]).find(e => e.preset_id === val("compute_device_preset_id"));
    if (devEntry?.research_required) issues.push({ s: "warning", m: `Device preset '${devEntry.label}' is research_required — values are estimates` });
  }
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
let _lastRuntimeResult = null; // runtime result from /api/run-packet — session 6

async function buildPacket() {
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
    radiator_material_family_ref: val("radiator_material_family_ref"),
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
    // ── Extension 3A fields — spec §5.3, §6, §9, blueprint §11.1–§11.3 ─────
    enable_model_extension_3a: val("enable_model_extension_3a") === "true",
    model_extension_3a_mode: val("model_extension_3a_mode") || "topology_only",
    convergence_required: val("convergence_required") === "true",
    max_convergence_iterations: parseInt(val("max_convergence_iterations") || "50", 10),
    convergence_tolerance_k: parseFloat(val("convergence_tolerance_k") || "0.1"),
    runaway_multiplier: parseFloat(val("runaway_multiplier") || "10"),
    thermal_zones: zoneBlocks.map(compileZoneBlock),
    // Radiator lifecycle fields — spec §9, blueprint §11.3
    cavity_emissivity_mode: val("cavity_emissivity_mode") || "disabled",
    cavity_view_factor: parseFloat(val("cavity_view_factor") || "0.85") || 0.85,
    geometry_mode: val("geometry_mode") || "single_sided",
    face_a_view_factor: parseFloat(val("face_a_view_factor") || "1.0") || 1.0,
    face_b_view_factor: parseFloat(val("face_b_view_factor") || "1.0") || 1.0,
    surface_emissivity_bol: parseFloat(val("surface_emissivity_bol") || "0.90") || 0.90,
    emissivity_degradation_fraction: parseFloat(val("emissivity_degradation_fraction") || "0.05") || 0.05,
    surface_emissivity_eol_override: val("surface_emissivity_eol_override")
      ? parseFloat(val("surface_emissivity_eol_override")) : null,
    background_sink_temp_k_override: val("background_sink_temp_k_override")
      ? parseFloat(val("background_sink_temp_k_override")) : null,
    extension_3a_catalog_ids_used: val("enable_model_extension_3a") === "true"
      ? ["working-fluids", "pickup-geometries"] : [],
    operator_notes: "",
    branding_metadata: {
      organization_name: val("org_name"),
      contact_name: val("contact_name"),
      contact_email: val("contact_email"),
      confidentiality_notice: val("confidentiality_notice"),
    },
    validation_summary: {},
    risk_summary: {},
    // ── Extension 3B fields — 3B-spec §16.1, §16.2, §16.3 ───────────────────
    // All 3B state compiles into canonical payload fields only.
    // Preset-loaded values remain visible and editable per §16.2.
    enable_model_extension_3b: val("enable_model_extension_3b") === "true",
    model_extension_3b_mode: val("model_extension_3b_mode") || "disabled",
    // operating_state: populated from UI controls or preset load; null if not configured
    operating_state: _compile3BOperatingState(),
    // extension_3b_catalog_versions: populated from loaded catalogs
    extension_3b_catalog_versions: _compile3BCatalogVersions(),
    // preset provenance: collected from any 3B preset loads in this session
    extension_3b_preset_provenance: _ext3bPresetProvenance,
    // ── Extension 4 fields — ext4-spec §19.2, §19.4, §3 rule 13 ─────────────
    // All ext4 state compiles into canonical payload fields only. No hidden state.
    // UI state-compilation follows the same no-hidden-state rule used by 3B. §19.4.
    enable_model_extension_4: val("enable_model_extension_4") === "true",
    model_extension_4_mode: val("model_extension_4_mode") || "disabled",
    // tpv_recapture_config: compiled from individual UI controls; null when disabled
    tpv_recapture_config: _compileExt4TpvConfig(),
    // extension_4_catalog_versions: pass-through provenance only; no numeric authority
    extension_4_catalog_versions: _compileExt4CatalogVersions(),
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
  if (rp) {
    try {
      const rpObj = JSON.parse(rp.content);
      // DELIVERY-001: inject demo token from sessionStorage (set by gate.html)
      const _demoToken = (function() { try { return sessionStorage.getItem("orbital_token") || ""; } catch(e) { return ""; } })();
      const _fetchHeaders = { "Content-Type": "application/json" };
      if (_demoToken) _fetchHeaders["X-Demo-Token"] = _demoToken;
      const resp = await fetch("/api/run-packet", {
        method: "POST",
        headers: _fetchHeaders,
        body: JSON.stringify(rpObj)
      });
      const data = await resp.json();
      if (resp.status === 401 || resp.status === 429) {
        try { sessionStorage.removeItem("orbital_token"); } catch(e) {}
        alert((data && data.error) ? data.error : "Access token issue. Redirecting.");
        window.location.href = "/";
        return;
      }
      if (data.ok) {
        _lastRuntimeResult = data.result || null;
        // Wire runtime-authoritative values to Tab 7 — spec §22, §4.1
        if (data.result) {
          populateRuntimeCards(data.result);
          populateRiskSummaryCard(data.result);
          // Push runtime-output.json into bundle for download + history
          const rtJson = JSON.stringify(data.result, null, 2);
          if (_lastBundleFiles) {
            const existing = _lastBundleFiles.findIndex(f => f.name === "runtime-output.json");
            if (existing >= 0) _lastBundleFiles[existing].content = rtJson;
            else _lastBundleFiles.push({ name: "runtime-output.json", content: rtJson });
            document.getElementById("manifest-preview").innerHTML =
              _lastBundleFiles.map((f) => `<span style="color:var(--accent);">${f.name}</span> — ${new TextEncoder().encode(f.content).length} B`).join("<br>");
          }
          // Show runtime-output JSON panel
          const rtCard = document.getElementById("output-runtime-json-card");
          if (rtCard) rtCard.style.display = "block";
          const rtPre = document.getElementById("runtime-output-preview");
          if (rtPre) rtPre.textContent = rtJson;
        }
        renderExt4ResultPanel(data.result && data.result.extension_4_result ? data.result.extension_4_result : null);
        const rSec = document.getElementById("ext3a-output-section");
        if (rSec) rSec.dataset.runtimeResult = JSON.stringify(data.result);
      } else {
        console.warn("Runtime server error:", data.error);
      }
    } catch (e) {
      console.warn("Runtime server not available:", e.message);
    }
  }
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

  var hasRuntime = !!(_lastRuntimeResult && _lastRuntimeResult.runtime_authority_declaration);
  var rt   = _lastRuntimeResult || {};
  var agg  = rt.aggregation_result || {};
  var radr = rt.radiator_result   || {};
  var rs   = rt.risk_summary      || {};
  var pv = hasRuntime ? " <span style='color:#3fb950;font-size:11px;'>&#10003; runtime</span>" : " <span class='pv'>(preview)</span>";
  // Override browser math with runtime-authoritative values when available
  if (hasRuntime) {
    deviceW     = agg.w_dot_device_at_state_w  || deviceW;
    moduleTotal = agg.w_dot_compute_module_w   || moduleTotal;
    overheads   = moduleTotal - (agg.w_dot_devices_total_w || 0);
    Aeff        = radr.a_radiator_effective_m2 || 0;
    Amargin     = radr.a_with_margin_m2        || 0;
  }
  var ncTotal    = hasRuntime ? Math.max(0,(agg.q_dot_total_reject_w||0) - moduleTotal) : 0;
  var totalReject= hasRuntime ? (agg.q_dot_total_reject_w||0) : moduleTotal;
  var nowStr = esc(new Date().toISOString());
  var packetId = esc(packet.packet_id || "—");
  var filesJson = JSON.stringify(_lastBundleFiles);
  var runtimeJson = JSON.stringify(_lastRuntimeResult); // session 6
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
    hasRuntime
      ? "<div style='background:#0d2818;border:1px solid #3fb950;color:#3fb950;border-radius:6px;padding:10px 16px;margin-bottom:18px;font-size:13px;'>&#10003; Runtime-authoritative output. Values produced by server-side runtime engine per spec §4.1.<\/div>"
      : "<div class='warn'>&#9888; Runtime not yet available — values are browser-side previews.<\/div>",
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
    "<tr><td>Non-Compute Total<\/td><td>"+ncTotal.toFixed(1)+" W"+pv+"<\/td><\/tr>",
    "<tr><td><strong>Total Reject Load<\/strong><\/td><td><strong>"+totalReject.toFixed(1)+" W"+pv+"<\/strong><\/td><\/tr>",
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
    "<div class='sec'><div class='st'>Risk Summary"+( hasRuntime ? " <span style='color:#3fb950;font-size:10px;'>&#10003; runtime</span>" : "" )+"<\/div>",
    "<table><tr><th>Field<\/th><th>Value<\/th><\/tr>",
    "<tr><td>Maturity Class<\/td><td>"+esc(rs.maturity_class||'—')+"<\/td><\/tr>",
    "<tr><td>TTL Class<\/td><td>"+esc(rs.ttl_class||'—')+"<\/td><\/tr>",
    "<tr><td>Thermal Cycling Risk<\/td><td>"+esc(rs.thermal_cycling_risk||'—')+"<\/td><\/tr>",
    "<tr><td>Corrosion Risk<\/td><td>"+esc(rs.corrosion_risk||'—')+"<\/td><\/tr>",
    "<tr><td>Contamination Risk<\/td><td>"+esc(rs.contamination_risk||'—')+"<\/td><\/tr>",
    "<tr><td>Vibration Risk<\/td><td>"+esc(rs.vibration_risk||'—')+"<\/td><\/tr>",
    "<tr><td>Packaging Stress<\/td><td>"+esc(rs.packaging_stress||'—')+"<\/td><\/tr>",
    "<tr><td>Compactness Stress<\/td><td>"+esc(rs.compactness_stress||'—')+"<\/td><\/tr>",
    "<\/table><\/div>",
    "<div class='sec'><div class='st' style='cursor:pointer' onclick=\"this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'\">Runtime Output (raw) &#9654;<\/div><div style='display:none'><div id='rt-section'>",
    "<p style='font-size:13px;color:#8b949e;padding:4px 0;'>Runtime result not yet available.<\/p>",
    "<\/div><\/div><\/div>",
    "<div class='foot'>\u00a9 2026 Exnulla, a division of Lake Area LLC. All Rights Reserved. &nbsp;|&nbsp; Preview surface only \u2014 runtime-authoritative execution required.<\/div>",
    "<script>",
    "var _ef="+filesJson+";",
  "var _rt="+runtimeJson+";",
  "(function(){",
  "  var el=document.getElementById('rt-section');",
  "  if(!el)return;",
  "  if(!_rt){el.innerHTML='<p style=\"font-size:13px;color:#8b949e;\">Runtime result not yet available.</p>';return;}",
  "  var rows='';",
  "  var flat=function(obj,prefix){Object.entries(obj||{}).forEach(function(kv){",
  "    var k=prefix?prefix+'.'+kv[0]:kv[0],v=kv[1];",
  "    if(v!==null&&typeof v==='object'&&!Array.isArray(v)){flat(v,k);}",
  "    else{rows+='<tr><td>'+k+'</td><td>'+String(v)+'</td></tr>';}",
  "  });};",
  "  flat(_rt,'');",
  "  el.innerHTML='<table><tr><th>Field</th><th>Value (runtime)</th></tr>'+rows+'</table>';",
  "})();",

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
          <select onchange="stageBlockChange(${idx},'source_zone_ref',this.value)">
            ${zoneRefOptions(b.source_zone_ref)}
          </select></div>
        <div class="block-field"><label>Target Zone Ref</label>
          <select onchange="stageBlockChange(${idx},'target_zone_ref',this.value)">
            ${zoneRefOptions(b.target_zone_ref||'')}
          </select></div>
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

// =============================================================================
// EXTENSION 3A — UI FUNCTIONS
// Governing law: blueprint §11.1–§11.4, spec §5.3, §6, §9, §13, §14
// Additive — Extension 2 functions above are untouched.
// =============================================================================

// ── Catalog selectors ─────────────────────────────────────────────────────────

/**
 * Populate working-fluid and pickup-geometry dropdowns from 3A catalogs.
 * Blueprint §11.1 — catalog lookup for zone blocks.
 */
function populateExt3aCatalogDropdowns() {
  // Nothing to populate at the page level; catalog options are injected per
  // zone block on addZoneBlock(). Catalogs are available in CATALOGS at call time.
}

/**
 * Build <option> HTML for working-fluid catalog entries.
 * Spec §7, blueprint §11.1.
 */
function workingFluidOptions(selectedVal) {
  const cat = CATALOGS["working-fluids"];
  if (!cat || cat.load_error) return `<option value="">— catalog unavailable —</option>`;
  let html = `<option value="">— select fluid —</option>`;
  const phaseTag = {
    single_phase_gas:     "(gas)",
    single_phase_liquid:  "(liquid)",
    two_phase_allowed:    "(two-phase)",
    supercritical:        "(supercritical)"
  };
  for (const e of (cat.entries || [])) {
    const id    = e.working_fluid_id || e.fluid_id || "";
    const phase = phaseTag[e.phase_class] || "";
    const label = (e.label || e.fluid_class || id) + (phase ? " " + phase : "");
    const sel   = id === selectedVal ? " selected" : "";
    html += `<option value="${id}"${sel}>${label}</option>`;
  }
  return html;
}

/**
 * Build <option> HTML for pickup-geometry catalog entries.
 * Spec §8, blueprint §11.1.
 */
function pickupGeometryOptions(selectedVal) {
  const cat = CATALOGS["pickup-geometries"];
  if (!cat || cat.load_error) return `<option value="">— catalog unavailable —</option>`;
  let html = `<option value="">— select geometry —</option>`;
  for (const e of (cat.entries || [])) {
    const id = e.pickup_geometry_id || "";
    const label = e.display_name || e.geometry_class || id;
    const sel = id === selectedVal ? " selected" : "";
    html += `<option value="${id}"${sel}>${label}</option>`;
  }
  return html;
}

/**
 * Build <option> HTML for material-family catalog entries.
 * Used by zone card template at render time. Pattern: workingFluidOptions.
 * Zone chain spec §2.1; ui-expansion-spec §10.2.
 */
function materialFamilyOptions(selectedVal) {
  const cat = CATALOGS["material-families"];
  if (!cat || cat.load_error) return `<option value="">— catalog unavailable —</option>`;
  let html = `<option value="">— select material —</option>`;
  for (const e of (cat.entries || [])) {
    const id = e.material_family_id || "";
    const label = e.label || id;
    const sel = id === selectedVal ? " selected" : "";
    html += `<option value="${id}"${sel}>${label}</option>`;
  }
  return html;
}

/**
 * Build <option> HTML for zone ref selects — populated from live zoneBlocks[].
 * Used by upstream/downstream zone ref fields in zone cards,
 * source/sink zone ref fields in branch blocks, and source/target in stage blocks.
 * excludeIdx: omit this zone (self-reference guard). Pass -1 to include all.
 * Blueprint §11.1, spec §6.
 */
function zoneRefOptions(selectedVal, excludeIdx = -1) {
  let html = `<option value="">— none —</option>`;
  zoneBlocks.forEach((z, i) => {
    if (i === excludeIdx) return; // no self-reference in zone cards
    const id    = z.zone_id || "";
    const label = z.label  || z.zone_id || `Zone ${i + 1}`;
    const sel   = id === selectedVal ? " selected" : "";
    html += `<option value="${id}"${sel}>${label} (${id})</option>`;
  });
  if (zoneBlocks.length === 0) {
    html = `<option value="">— no zones declared —</option>`;
  }
  return html;
}

// ── Enable toggle ─────────────────────────────────────────────────────────────

/**
 * Handle Extension 3A enable/disable toggle.
 * Shows/hides scenario fields and thermal/radiator/output sections.
 * Blueprint §11.1–§11.4.
 */
function onExt3aEnableChange() {
  const enabled = val("enable_model_extension_3a") === "true";
  const scenFields = document.getElementById("ext3a-scenario-fields");
  if (scenFields) scenFields.style.display = enabled ? "block" : "none";
  const thermalSec = document.getElementById("ext3a-thermal-section");
  if (thermalSec) thermalSec.style.display = enabled ? "block" : "none";
  const radSec = document.getElementById("ext3a-radiator-section");
  if (radSec) radSec.style.display = enabled ? "block" : "none";
  const outSec = document.getElementById("ext3a-output-section");
  if (outSec) outSec.style.display = enabled ? "block" : "none";
  if (enabled) {
    renderZoneBlocks();
    updateExt3aOutputSection();
    updateBolEolPreview();
    wireExt3aRadiatorFields();
  }
  updateOutputTab();
}

// ── Zone block management ─────────────────────────────────────────────────────

/**
 * Return a deterministic zone_id for a new zone block.
 * Spec §6.1 — zone_id must be unique within the scenario.
 */
function zoneBlockId(idx) {
  return `zone-${String(idx).padStart(3, "0")}`;
}

// ── Topology Template Engine — TOPO-TEMPLATE-001 ──────────────────────────────
// Static template table. Each template declares a set of zone descriptors
// with pre-wired refs. Zone IDs are stable slugs within the template so
// upstream/downstream refs resolve correctly when all zones are spawned together.
// Tier 1: flight-proximate entries only. Tier 2: exploratory, research_required.
// Blueprint §11.1, spec §6. No runtime changes — zones compile identically
// to manually-built zones.

const TOPOLOGY_TEMPLATES = {
  simple_backbone: {
    label: "Simple Backbone",
    tier: 1,
    description: "Cold plate picks up heat from compute vault and delivers to hot backbone for direct radiator rejection. One fluid loop. Simplest valid topology.",
    enable_ext3a: true,
    enable_ext4: false,
    zones: [
      { zone_id: "tpl-vault-001",    label: "Compute Vault (Pickup)",  zone_role: "pickup",    zone_type: "compute_vault",  chain_id: "cold_loop",    loop_role: "evaporator",  working_fluid_ref: "fluid-water-v0",   hot_island_role: "none",    upstream_zone_ref: null,           downstream_zone_ref: "tpl-backbone-001" },
      { zone_id: "tpl-backbone-001", label: "Hot Backbone (Rejection)",zone_role: "rejection", zone_type: "hot_backbone",   chain_id: "cold_loop",    loop_role: "condenser",   working_fluid_ref: "fluid-water-v0",   hot_island_role: "none",    upstream_zone_ref: "tpl-vault-001",  downstream_zone_ref: null },
    ]
  },
  cold_hot_island: {
    label: "Cold Loop + Hot Island",
    tier: 1,
    description: "Cold loop collects heat from compute vault. HX boundary exchanges to hot island loop operating at elevated temperature. Hot island rejects to radiator. Two fluid loops at different temperature levels.",
    enable_ext3a: true,
    enable_ext4: false,
    zones: [
      { zone_id: "tpl-vault-001",    label: "Compute Vault (Pickup)",    zone_role: "pickup",              zone_type: "compute_vault",  chain_id: "cold_loop",    loop_role: "evaporator",  working_fluid_ref: "fluid-water-v0",  hot_island_role: "none",      upstream_zone_ref: null,              downstream_zone_ref: "tpl-hx-001"      },
      { zone_id: "tpl-hx-001",       label: "HX Boundary",               zone_role: "convergence_exchange", zone_type: "hx_boundary",    chain_id: "cold_loop",    loop_role: "hx_cold_side", working_fluid_ref: "fluid-water-v0",  hot_island_role: "none",      upstream_zone_ref: "tpl-vault-001",   downstream_zone_ref: "tpl-island-001", isolation_boundary: true },
      { zone_id: "tpl-island-001",   label: "Hot Island (Primary)",       zone_role: "storage",             zone_type: "hot_island",     chain_id: "hot_island",   loop_role: "accumulator", working_fluid_ref: "fluid-sodium-v0", hot_island_role: "hot_island_a",   upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-reject-001"  },
      { zone_id: "tpl-reject-001",   label: "Radiator Rejection",         zone_role: "rejection",           zone_type: "radiator_zone",  chain_id: "hot_island",   loop_role: "condenser",   working_fluid_ref: "fluid-sodium-v0", hot_island_role: "none",      upstream_zone_ref: "tpl-island-001",  downstream_zone_ref: null              },
    ]
  },
  cold_dual_hot_island: {
    label: "Cold Loop + Dual Hot Island",
    tier: 1,
    description: "Cold loop exchanges to two parallel hot islands via shared HX boundary. Islands operate independently at high temperature. Suitable for load-sharing or phased thermal storage strategies.",
    enable_ext3a: true,
    enable_ext4: false,
    zones: [
      { zone_id: "tpl-vault-001",    label: "Compute Vault (Pickup)",    zone_role: "pickup",              zone_type: "compute_vault",  chain_id: "cold_loop",      loop_role: "evaporator",   working_fluid_ref: "fluid-water-v0",  hot_island_role: "none",      upstream_zone_ref: null,              downstream_zone_ref: "tpl-hx-001"      },
      { zone_id: "tpl-hx-001",       label: "HX Boundary",               zone_role: "convergence_exchange", zone_type: "hx_boundary",    chain_id: "cold_loop",      loop_role: "hx_cold_side", working_fluid_ref: "fluid-water-v0",  hot_island_role: "none",      upstream_zone_ref: "tpl-vault-001",   downstream_zone_ref: "tpl-island-a",   isolation_boundary: true },
      { zone_id: "tpl-island-a",     label: "Hot Island A",               zone_role: "storage",             zone_type: "hot_island",     chain_id: "hot_island_a",   loop_role: "accumulator",  working_fluid_ref: "fluid-sodium-v0", hot_island_role: "hot_island_a",   upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-reject-001"  },
      { zone_id: "tpl-island-b",     label: "Hot Island B",               zone_role: "storage",             zone_type: "hot_island",     chain_id: "hot_island_b",   loop_role: "accumulator",  working_fluid_ref: "fluid-sodium-v0", hot_island_role: "hot_island_b", upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-reject-001"  },
      { zone_id: "tpl-reject-001",   label: "Radiator Rejection",         zone_role: "rejection",           zone_type: "radiator_zone",  chain_id: "hot_island_a",   loop_role: "condenser",    working_fluid_ref: "fluid-sodium-v0", hot_island_role: "none",      upstream_zone_ref: "tpl-island-a",    downstream_zone_ref: null              },
    ]
  },
  cold_hot_storage: {
    label: "Cold Loop + Storage Buffer",
    tier: 1,
    description: "Cold loop exchanges to hot island. PCM storage buffer absorbs transient thermal peaks from eclipse or burst compute loads. Storage charges during low-load periods and discharges during peak demand.",
    enable_ext3a: true,
    enable_ext4: false,
    zones: [
      { zone_id: "tpl-vault-001",    label: "Compute Vault (Pickup)",    zone_role: "pickup",              zone_type: "compute_vault",  chain_id: "cold_loop",    loop_role: "evaporator",   working_fluid_ref: "fluid-water-v0",         hot_island_role: "none",    upstream_zone_ref: null,              downstream_zone_ref: "tpl-hx-001"      },
      { zone_id: "tpl-hx-001",       label: "HX Boundary",               zone_role: "convergence_exchange", zone_type: "hx_boundary",    chain_id: "cold_loop",    loop_role: "hx_cold_side", working_fluid_ref: "fluid-water-v0",         hot_island_role: "none",    upstream_zone_ref: "tpl-vault-001",   downstream_zone_ref: "tpl-island-001", isolation_boundary: true },
      { zone_id: "tpl-island-001",   label: "Hot Island (Primary)",       zone_role: "storage",             zone_type: "hot_island",     chain_id: "hot_island",   loop_role: "accumulator",  working_fluid_ref: "fluid-sodium-v0",        hot_island_role: "hot_island_a", upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-storage-001" },
      { zone_id: "tpl-storage-001",  label: "PCM Storage Buffer",         zone_role: "storage",             zone_type: "storage_buffer", chain_id: "hot_island",   loop_role: "buffer",       working_fluid_ref: "fluid-sodium-v0",        hot_island_role: "none",    upstream_zone_ref: "tpl-island-001",  downstream_zone_ref: "tpl-reject-001"  },
      { zone_id: "tpl-reject-001",   label: "Radiator Rejection",         zone_role: "rejection",           zone_type: "radiator_zone",  chain_id: "hot_island",   loop_role: "condenser",    working_fluid_ref: "fluid-sodium-v0",        hot_island_role: "none",    upstream_zone_ref: "tpl-storage-001", downstream_zone_ref: null              },
    ]
  },
  hexe_brayton_cold: {
    label: "He/Xe Brayton + Cold Loop Exchange",
    tier: 2,
    description: "EXPLORATORY. He/Xe closed-loop Brayton cycle is the primary high-temperature transport loop. HX boundary exchanges heat to secondary cold-plate loop supplying compute vault. Brayton loop operates at 800–1200 K. Research required on He/Xe Cp at operating pressure.",
    enable_ext3a: true,
    enable_ext4: false,
    zones: [
      { zone_id: "tpl-vault-001",   label: "Compute Vault (Cold Side)",  zone_role: "pickup",              zone_type: "compute_vault",  chain_id: "cold_loop",    loop_role: "evaporator",   working_fluid_ref: "fluid-water-v0",   hot_island_role: "none", upstream_zone_ref: null,              downstream_zone_ref: "tpl-hx-001"     },
      { zone_id: "tpl-hx-001",      label: "HX Boundary (Cold/Brayton)", zone_role: "convergence_exchange", zone_type: "hx_boundary",    chain_id: "cold_loop",    loop_role: "hx_cold_side", working_fluid_ref: "fluid-water-v0",   hot_island_role: "none", upstream_zone_ref: "tpl-vault-001",   downstream_zone_ref: "tpl-brayton-001", isolation_boundary: true, convergence_enabled: true },
      { zone_id: "tpl-brayton-001", label: "He/Xe Brayton Loop",         zone_role: "transport",           zone_type: "brayton_loop",   chain_id: "brayton",      loop_role: "hx_hot_side",  working_fluid_ref: "fluid-hexe-v0",    hot_island_role: "none", upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-reject-001"   },
      { zone_id: "tpl-reject-001",  label: "Radiator Rejection",         zone_role: "rejection",           zone_type: "radiator_zone",  chain_id: "brayton",      loop_role: "condenser",    working_fluid_ref: "fluid-hexe-v0",    hot_island_role: "none", upstream_zone_ref: "tpl-brayton-001", downstream_zone_ref: null               },
    ]
  },
  hexe_eutectic_cold_pump: {
    label: "He/Xe + Eutectic Emitter + Cold Pump Return",
    tier: 2,
    description: "EXPLORATORY. Three-loop chain: He/Xe primary loop carries heat from high-temp source → HX to eutectic emitter loop (mid-temperature, high thermal mass) → second HX to cold pump return loop which resets cold-loop supply temperature to vault. Addresses return temperature creep. See FUTURE-THERMAL-RUNAWAY-001 for full physics model.",
    enable_ext3a: true,
    enable_ext4: false,
    zones: [
      { zone_id: "tpl-vault-001",    label: "Compute Vault (Pickup)",         zone_role: "pickup",              zone_type: "compute_vault",    chain_id: "cold_loop",    loop_role: "evaporator",   working_fluid_ref: "fluid-water-v0",  hot_island_role: "none", upstream_zone_ref: null,               downstream_zone_ref: "tpl-pump-hx-001" },
      { zone_id: "tpl-pump-hx-001",  label: "Cold Pump Return HX",            zone_role: "convergence_exchange", zone_type: "hx_boundary",      chain_id: "cold_loop",    loop_role: "hx_cold_side", working_fluid_ref: "fluid-water-v0",  hot_island_role: "none", upstream_zone_ref: "tpl-vault-001",    downstream_zone_ref: "tpl-eutectic-001", isolation_boundary: true },
      { zone_id: "tpl-eutectic-001", label: "Eutectic Emitter Loop",           zone_role: "transport",           zone_type: "hot_island",       chain_id: "eutectic",     loop_role: "hx_hot_side",  working_fluid_ref: "fluid-nak-v0",    hot_island_role: "hot_island_a", upstream_zone_ref: "tpl-pump-hx-001",  downstream_zone_ref: "tpl-hexe-hx-001"  },
      { zone_id: "tpl-hexe-hx-001",  label: "HX Boundary (Eutectic/He-Xe)",   zone_role: "convergence_exchange", zone_type: "hx_boundary",      chain_id: "eutectic",     loop_role: "hx_cold_side", working_fluid_ref: "fluid-nak-v0",    hot_island_role: "none", upstream_zone_ref: "tpl-eutectic-001", downstream_zone_ref: "tpl-hexe-001",     isolation_boundary: true },
      { zone_id: "tpl-hexe-001",     label: "He/Xe Primary Loop",              zone_role: "transport",           zone_type: "brayton_loop",     chain_id: "brayton",      loop_role: "hx_hot_side",  working_fluid_ref: "fluid-hexe-v0",   hot_island_role: "none", upstream_zone_ref: "tpl-hexe-hx-001",  downstream_zone_ref: "tpl-reject-001"    },
      { zone_id: "tpl-reject-001",   label: "Radiator Rejection",              zone_role: "rejection",           zone_type: "radiator_zone",    chain_id: "brayton",      loop_role: "condenser",    working_fluid_ref: "fluid-hexe-v0",   hot_island_role: "none", upstream_zone_ref: "tpl-hexe-001",     downstream_zone_ref: null                },
    ]
  },
  full_regen_brayton_export: {
    label: "Full Regen Dual Island + Brayton Export",
    tier: 2,
    description: "EXPLORATORY. Maximum complexity topology: dual hot islands in regen cycle, Brayton branch extracts work from hot loop, PCM storage buffer manages transients, TPV recapture on radiator. All exploratory branches active. See FUTURE-HOT-ISLAND-REGEN-001 for regen cycle physics model.",
    enable_ext3a: true,
    enable_ext4: true,
    zones: [
      { zone_id: "tpl-vault-001",   label: "Compute Vault (Pickup)",    zone_role: "pickup",              zone_type: "compute_vault",  chain_id: "cold_loop",    loop_role: "evaporator",   working_fluid_ref: "fluid-water-v0",  hot_island_role: "none",      upstream_zone_ref: null,              downstream_zone_ref: "tpl-hx-001"      },
      { zone_id: "tpl-hx-001",      label: "HX Boundary",               zone_role: "convergence_exchange", zone_type: "hx_boundary",    chain_id: "cold_loop",    loop_role: "hx_cold_side", working_fluid_ref: "fluid-water-v0",  hot_island_role: "none",      upstream_zone_ref: "tpl-vault-001",   downstream_zone_ref: "tpl-island-a",   isolation_boundary: true },
      { zone_id: "tpl-island-a",    label: "Hot Island A (Charge)",      zone_role: "storage",             zone_type: "hot_island",     chain_id: "hot_island_a", loop_role: "accumulator",  working_fluid_ref: "fluid-sodium-v0", hot_island_role: "hot_island_a",   upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-storage-001" },
      { zone_id: "tpl-island-b",    label: "Hot Island B (Discharge)",   zone_role: "storage",             zone_type: "hot_island",     chain_id: "hot_island_b", loop_role: "accumulator",  working_fluid_ref: "fluid-sodium-v0", hot_island_role: "hot_island_b", upstream_zone_ref: "tpl-hx-001",      downstream_zone_ref: "tpl-storage-001" },
      { zone_id: "tpl-storage-001", label: "PCM Storage Buffer",         zone_role: "storage",             zone_type: "storage_buffer", chain_id: "hot_island_a", loop_role: "buffer",       working_fluid_ref: "fluid-sodium-v0", hot_island_role: "none",      upstream_zone_ref: "tpl-island-a",    downstream_zone_ref: "tpl-brayton-001" },
      { zone_id: "tpl-brayton-001", label: "Brayton Export Branch",      zone_role: "transport",           zone_type: "brayton_loop",   chain_id: "brayton",      loop_role: "hx_hot_side",  working_fluid_ref: "fluid-hexe-v0",   hot_island_role: "none",      upstream_zone_ref: "tpl-storage-001", downstream_zone_ref: "tpl-reject-001"  },
      { zone_id: "tpl-reject-001",  label: "Radiator Rejection + TPV",   zone_role: "rejection",           zone_type: "radiator_zone",  chain_id: "brayton",      loop_role: "condenser",    working_fluid_ref: "fluid-hexe-v0",   hot_island_role: "none",      upstream_zone_ref: "tpl-brayton-001", downstream_zone_ref: null              },
    ]
  },
  cold_tpv_recapture: {
    label: "Cold Loop + TPV Recapture",
    tier: 2,
    description: "EXPLORATORY. Standard cold loop with Extension 4 TPV radiator recapture enabled. TPV cells mounted on radiator surface recapture a fraction of emitted photons as electrical power. All TPV outputs are non-authoritative per ext4-spec §2.3.",
    enable_ext3a: true,
    enable_ext4: true,
    zones: [
      { zone_id: "tpl-vault-001",   label: "Compute Vault (Pickup)",  zone_role: "pickup",    zone_type: "compute_vault",  chain_id: "cold_loop", loop_role: "evaporator", working_fluid_ref: "fluid-water-v0",  hot_island_role: "none", upstream_zone_ref: null,             downstream_zone_ref: "tpl-backbone-001" },
      { zone_id: "tpl-backbone-001",label: "Hot Backbone + TPV",      zone_role: "rejection", zone_type: "radiator_zone",  chain_id: "cold_loop", loop_role: "condenser",  working_fluid_ref: "fluid-water-v0",  hot_island_role: "none", upstream_zone_ref: "tpl-vault-001",  downstream_zone_ref: null               },
    ]
  },
  custom: {
    label: "Custom",
    tier: 0,
    description: "No zones spawned. Build your topology from scratch using the Add Zone Block button below.",
    enable_ext3a: false,
    enable_ext4: false,
    zones: []
  }
};

/**
 * Apply a topology template — clear existing zones, spawn template zones,
 * auto-enable required extensions, show template note.
 * TOPO-TEMPLATE-001. Blueprint §11.1, spec §6.
 */
function applyTopologyTemplate(templateId, skipConfirm = false) {
  if (!templateId) return;

  const tpl = TOPOLOGY_TEMPLATES[templateId];
  if (!tpl) return;

  // Confirm if zones already exist — avoid silent data loss
  // skipConfirm=true when called from applyScenarioPreset (operator already chose preset)
  if (!skipConfirm && zoneBlocks.length > 0) {
    if (!confirm(`Applying template "${tpl.label}" will replace your current ${zoneBlocks.length} zone(s). Continue?`)) {
      document.getElementById("topology-template-select").value = "";
      return;
    }
  }

  // Clear and spawn
  zoneBlocks.length = 0;
  for (const zd of tpl.zones) {
    // Auto-seed material_family_ref from ZONE_TYPE_MATERIAL_SUGGEST if not set on zone data
    // HOLE-WIRE-001 fix: operator sees the suggested material pre-filled, can override freely
    const matRef   = zd.material_family_ref   || ZONE_TYPE_MATERIAL_SUGGEST[zd.zone_type]?.id  || null;
    const geomRef  = zd.pickup_geometry_ref  || ZONE_TYPE_PICKUP_SUGGEST[zd.zone_type]       || null;
    addZoneBlock({ ...zd, material_family_ref: matRef, pickup_geometry_ref: geomRef });
  }

  // Auto-enable Extension 3A when template requires it
  if (tpl.enable_ext3a) {
    const el = document.getElementById("enable_model_extension_3a");
    if (el && el.value !== "true") {
      el.value = "true";
      el.dispatchEvent(new Event("change"));
    }
  }

  // Auto-enable Extension 4 for exploratory templates that use TPV
  if (tpl.enable_ext4) {
    const el = document.getElementById("enable_model_extension_4");
    if (el && el.value !== "true") {
      el.value = "true";
      el.dispatchEvent(new Event("change"));
    }
  }

  // Show template note
  const noteEl = document.getElementById("topology-template-note");
  if (noteEl) {
    const tierLabel = tpl.tier === 2 ? "⚠ EXPLORATORY — " : tpl.tier === 1 ? "✓ Flight-Proximate — " : "";
    noteEl.style.display = "block";
    noteEl.className = tpl.tier === 2 ? "note warn-note" : "note";
    noteEl.innerHTML = `<strong>${tierLabel}${tpl.label}</strong><br>${tpl.description}<br>` +
      `<span style="color:var(--text-dim);font-size:11px;">Spawned ${tpl.zones.length} zone(s). All fields editable. Working fluids are suggestions — verify for your operating conditions.</span>`;
  }

  renderZoneBlocks();
  updateTopologyStatus();
  renderValidationPanel();
}

/**
 * Add a new thermal zone block with defaults per spec §12.
 * Blueprint §11.1 — additive create control.
 */
function addZoneBlock(data = {}) {
  const idx = zoneBlocks.length;
  const block = {
    zone_id:                data.zone_id               || zoneBlockId(idx),
    label:                  data.label                 || `Zone ${idx + 1}`,
    zone_role:              data.zone_role             || "standard",
    isolation_boundary:     data.isolation_boundary    !== undefined ? data.isolation_boundary : false,
    upstream_zone_ref:      data.upstream_zone_ref     || null,
    downstream_zone_ref:    data.downstream_zone_ref   || null,
    working_fluid_ref:      data.working_fluid_ref     || null,
    pickup_geometry_ref:    data.pickup_geometry_ref   || null,
    convergence_enabled:    data.convergence_enabled   !== undefined ? data.convergence_enabled : false,
    // Resistance chain sub-object — spec §6.3, §11.2–§11.3
    resistance_chain: {
      r_junction_to_case_k_per_w:           data.resistance_chain?.r_junction_to_case_k_per_w           ?? null,
      r_case_to_spreader_k_per_w:           data.resistance_chain?.r_case_to_spreader_k_per_w           ?? null,
      r_spreader_to_pickup_nominal_k_per_w: data.resistance_chain?.r_spreader_to_pickup_nominal_k_per_w ?? null,
      r_pickup_to_loop_k_per_w:             data.resistance_chain?.r_pickup_to_loop_k_per_w             ?? null,
      r_loop_to_sink_k_per_w:               data.resistance_chain?.r_loop_to_sink_k_per_w               ?? null,
    },
    r_bridge_k_per_w: data.r_bridge_k_per_w ?? null,
    zone_type:          data.zone_type         || 'standard',
    hot_island_role:    data.hot_island_role   || 'none',
    target_temp_k:      data.target_temp_k     ?? null,
    chain_id:           data.chain_id          || null,
    loop_role:          data.loop_role         || null,
    material_family_ref: data.material_family_ref || null,
  };
  zoneBlocks.push(block);
  renderZoneBlocks();
  updateTopologyStatus();
  renderValidationPanel();
}

/**
 * Remove a zone block by index. Rerender. Blueprint §11.1 — delete control.
 */
function removeZoneBlock(idx) {
  zoneBlocks.splice(idx, 1);
  renderZoneBlocks();
  updateTopologyStatus();
}

/**
 * Duplicate a zone block by index. Blueprint §11.1 — duplicate control.
 */
function duplicateZoneBlock(idx) {
  const src = zoneBlocks[idx];
  const copy = JSON.parse(JSON.stringify(src));
  copy.zone_id = zoneBlockId(zoneBlocks.length);
  copy.label = src.label + " (copy)";
  zoneBlocks.splice(idx + 1, 0, copy);
  renderZoneBlocks();
  updateTopologyStatus();
}

/**
 * Move a zone block up or down. Blueprint §11.1 — reorder control.
 */
function moveZoneBlock(idx, direction) {
  const target = idx + direction;
  if (target < 0 || target >= zoneBlocks.length) return;
  const tmp = zoneBlocks[idx];
  zoneBlocks[idx] = zoneBlocks[target];
  zoneBlocks[target] = tmp;
  renderZoneBlocks();
  updateTopologyStatus();
}

/**
 * Read a zone card's current field values back into zoneBlocks[idx].
 * Called on every input change within a zone card.
 */
function syncZoneBlock(idx) {
  const b = zoneBlocks[idx];
  if (!b) return;
  b.label              = document.getElementById(`z${idx}_label`)?.value             || b.label;
  b.zone_role          = document.getElementById(`z${idx}_zone_role`)?.value         || b.zone_role;
  b.isolation_boundary = document.getElementById(`z${idx}_isolation_boundary`)?.value === "true";
  b.upstream_zone_ref  = document.getElementById(`z${idx}_upstream_zone_ref`)?.value  || null;
  b.downstream_zone_ref= document.getElementById(`z${idx}_downstream_zone_ref`)?.value|| null;
  b.working_fluid_ref  = document.getElementById(`z${idx}_working_fluid_ref`)?.value  || null;
  // Fluid phase note — warn operator of phase regime implications
  const _fluidNote = document.getElementById(`z${idx}_fluid_note`);
  if (_fluidNote) {
    const _fcat = CATALOGS["working-fluids"];
    const _fe = (_fcat?.entries || []).find(e => (e.working_fluid_id || e.fluid_id) === b.working_fluid_ref);
    if (!_fe) {
      _fluidNote.style.display = "none";
    } else if (_fe.phase_class === "two_phase_allowed") {
      _fluidNote.style.display = "block";
      _fluidNote.className = "note warn-note";
      _fluidNote.textContent = "⚠ Two-phase fluid — cavitation, bubble management, and microgravity phase separation must be addressed in design.";
    } else if (_fe.phase_class === "single_phase_liquid") {
      _fluidNote.style.display = "block";
      _fluidNote.className = "note";
      _fluidNote.textContent = `Liquid-phase loop (${_fe.fluid_class}). Freeze protection required if operating near melt point. Check compatibility notes.`;
    } else if (_fe.phase_class === "single_phase_gas") {
      _fluidNote.style.display = "block";
      _fluidNote.className = "note";
      _fluidNote.textContent = `Gas-phase loop (${_fe.fluid_class}). Pressure-dependent properties — verify Cp/density at operating pressure.`;
    } else {
      _fluidNote.style.display = "none";
    }
  }
  b.pickup_geometry_ref= document.getElementById(`z${idx}_pickup_geometry_ref`)?.value|| null;
  b.convergence_enabled= document.getElementById(`z${idx}_convergence_enabled`)?.value === "true";
  b.r_bridge_k_per_w   = parseFloat(document.getElementById(`z${idx}_r_bridge`)?.value) || null;
  b.zone_type          = document.getElementById(`z${idx}_zone_type`)?.value        || b.zone_type;
  b.hot_island_role    = document.getElementById(`z${idx}_hot_island_role`)?.value  || b.hot_island_role;
  b.target_temp_k      = parseFloat(document.getElementById(`z${idx}_target_temp_k`)?.value) || null;
  b.chain_id           = document.getElementById(`z${idx}_chain_id`)?.value?.trim() || null;
  b.loop_role          = document.getElementById(`z${idx}_loop_role`)?.value || null;
  b.material_family_ref= document.getElementById(`z${idx}_material_family_ref`)?.value || null;
  const chain = b.resistance_chain;
  chain.r_junction_to_case_k_per_w           = parseFloat(document.getElementById(`z${idx}_r_jc`)?.value)  || null;
  chain.r_case_to_spreader_k_per_w           = parseFloat(document.getElementById(`z${idx}_r_cs`)?.value)  || null;
  chain.r_spreader_to_pickup_nominal_k_per_w = parseFloat(document.getElementById(`z${idx}_r_spn`)?.value) || null;
  chain.r_pickup_to_loop_k_per_w             = parseFloat(document.getElementById(`z${idx}_r_pl`)?.value)  || null;
  chain.r_loop_to_sink_k_per_w               = parseFloat(document.getElementById(`z${idx}_r_ls`)?.value)  || null;
  updateTopologyStatus();
}

/**
 * Compile a zone block into the canonical thermal_zones[] entry format.
 * Spec §6 — all fields must be present and typed.
 */
function compileZoneBlock(b) {
  return {
    zone_id:               b.zone_id,
    label:                 b.label,
    zone_role:             b.zone_role,
    isolation_boundary:    b.isolation_boundary,
    upstream_zone_ref:     b.upstream_zone_ref   || null,
    downstream_zone_ref:   b.downstream_zone_ref || null,
    working_fluid_ref:     b.working_fluid_ref   || null,
    pickup_geometry_ref:   b.pickup_geometry_ref || null,
    convergence_enabled:   b.convergence_enabled,
    resistance_chain:      b.resistance_chain,
    r_bridge_k_per_w:      b.r_bridge_k_per_w   ?? null,
    zone_type:             b.zone_type          || 'standard',
    hot_island_role:       b.hot_island_role    || 'none',
    target_temp_k:         b.target_temp_k      ?? null,
    chain_id:              b.chain_id           ?? null,
    loop_role:             b.loop_role          ?? null,
    material_family_ref:   b.material_family_ref || null,
  };
}

const ZONE_TYPE_MATERIAL_SUGGEST = {
  compute_vault:  { id: "carbon_composite", note: "C/C suggested for cold-plate interface — low density, flight-proven-analog" },
  hot_backbone:   { id: "carbon_composite", note: "C/C or SiC suggested for high-temp backbone radiator surface" },
  hot_island:     { id: "sic",              note: "SiC suggested for hot island — stable at 1700K, high emissivity" },
  storage_buffer: { id: "eutectic_metal_compatible", note: "Eutectic metal suggested for PCM storage buffer — verify containment" },
  radiator_zone:  { id: "carbon_composite", note: "C/C suggested for radiator panel — lightweight, deployable" },
  brayton_loop:   { id: "refractory_metal_generic", note: "Refractory metal suggested for Brayton high-temp loop" },
  hx_boundary:    { id: "carbon_composite", note: "C/C or SiC suggested for HX boundary thermal interface" },
};

// Pickup geometry suggestions by zone_type — auto-seeded at template spawn.
// Only heat-exchange zones have a meaningful pickup geometry; transport/storage zones leave blank.
// Spec pin: ui-expansion-spec §8 (catalog-driven controls).
const ZONE_TYPE_PICKUP_SUGGEST = {
  compute_vault:  "geom-direct-cold-plate-v0",
  hx_boundary:    "geom-microchannel-v0",
  hot_backbone:   "geom-direct-cold-plate-v0",
  hot_island:     "geom-heat-pipe-v0",
};

/**
 * Render all zone cards into #zone-block-list.
 * Blueprint §11.1 — additive block editor.
 */
function renderZoneBlocks() {
  // After re-rendering zone cards, also refresh branch + stage selects
  // so their zone ref dropdowns reflect the current zone list.
  // Deferred via setTimeout to avoid re-entrancy during the current render.
  setTimeout(() => {
    if (typeof renderBranchBlocks === "function") renderBranchBlocks();
    if (typeof renderStageBlocks  === "function") renderStageBlocks();
  }, 0);
  const list = document.getElementById("zone-block-list");
  if (!list) return;
  list.innerHTML = "";

  zoneBlocks.forEach((b, idx) => {
    const chain = b.resistance_chain;
    const rTotal = [
      chain.r_junction_to_case_k_per_w,
      chain.r_case_to_spreader_k_per_w,
      chain.r_spreader_to_pickup_nominal_k_per_w,
      chain.r_pickup_to_loop_k_per_w,
      chain.r_loop_to_sink_k_per_w,
    ].reduce((s, v) => s + (v ?? 0), 0);

    const hasRef = b.upstream_zone_ref || b.downstream_zone_ref;
    const validityClass = hasRef ? "zone-validity-ok" : "zone-validity-warn";
    const validityText  = hasRef ? "✓ topology refs set" : "⚠ no topology refs";

    const card = document.createElement("div");
    card.className = "zone-card";
    card.innerHTML = `
      <div class="zone-header">
        <span>Zone ${idx + 1}</span>
        <input id="z${idx}_label" type="text" value="${b.label}"
          style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:3px;padding:3px 7px;color:var(--text);font-size:12px;"
          oninput="zoneBlocks[${idx}].label=this.value;updateTopologyStatus();" />
        <span class="zone-validity ${validityClass}">${validityText}</span>
        <button class="btn btn-secondary btn-sm" onclick="moveZoneBlock(${idx},-1)" title="Move up" style="padding:2px 7px;">▲</button>
        <button class="btn btn-secondary btn-sm" onclick="moveZoneBlock(${idx},1)" title="Move down" style="padding:2px 7px;">▼</button>
        <button class="btn btn-secondary btn-sm" onclick="duplicateZoneBlock(${idx})" title="Duplicate" style="padding:2px 7px;">⧉</button>
        <button class="btn btn-secondary btn-sm" onclick="removeZoneBlock(${idx})" title="Remove" style="padding:2px 7px;color:var(--warn);">✕</button>
      </div>
      <div class="field-row"><label>Zone Role</label>
        <select id="z${idx}_zone_role" onchange="syncZoneBlock(${idx})">
          <option value="standard"${b.zone_role==="standard"?" selected":""}>standard</option>
          <option value="convergence_exchange"${b.zone_role==="convergence_exchange"?" selected":""}>convergence_exchange</option>
          <option value="radiator_emitter"${b.zone_role==="radiator_emitter"?" selected":""}>radiator_emitter</option>
          <option value="pickup"${b.zone_role==="pickup"?" selected":""}>pickup</option>
          <option value="transport"${b.zone_role==="transport"?" selected":""}>transport</option>
          <option value="storage"${b.zone_role==="storage"?" selected":""}>storage</option>
          <option value="rejection"${b.zone_role==="rejection"?" selected":""}>rejection</option>
          <option value="custom"${b.zone_role==="custom"?" selected":""}>custom</option>
        </select>
      </div>
      <div class="field-row"><label>Zone Type</label>
        <select id="z${idx}_zone_type" onchange="syncZoneBlock(${idx})">
          <option value="standard"${b.zone_type==="standard"?" selected":""}>standard</option>
          <option value="compute_vault"${b.zone_type==="compute_vault"?" selected":""}>compute_vault</option>
          <option value="hx_boundary"${b.zone_type==="hx_boundary"?" selected":""}>hx_boundary</option>
          <option value="high_temp_backbone"${b.zone_type==="high_temp_backbone"?" selected":""}>high_temp_backbone</option>
          <option value="radiator_emitter"${b.zone_type==="radiator_emitter"?" selected":""}>radiator_emitter</option>
          <option value="hot_island"${b.zone_type==="hot_island"?" selected":""}>hot_island</option>
          <option value="hot_backbone"${b.zone_type==="hot_backbone"?" selected":""}>hot_backbone</option>
          <option value="storage_buffer"${b.zone_type==="storage_buffer"?" selected":""}>storage_buffer</option>
          <option value="radiator_zone"${b.zone_type==="radiator_zone"?" selected":""}>radiator_zone</option>
          <option value="brayton_loop"${b.zone_type==="brayton_loop"?" selected":""}>brayton_loop</option>
          <option value="custom"${b.zone_type==="custom"?" selected":""}>custom</option>
        </select>
      </div>
      <div class="field-row"><label>Hot Island Role</label>
        <select id="z${idx}_hot_island_role" onchange="syncZoneBlock(${idx})">
          <option value="none"${b.hot_island_role==="none"?" selected":""}>none</option>
          <option value="hot_island_a"${b.hot_island_role==="hot_island_a"?" selected":""}>hot_island_a</option>
          <option value="hot_island_b"${b.hot_island_role==="hot_island_b"?" selected":""}>hot_island_b</option>
          <option value="exchange_hub"${b.hot_island_role==="exchange_hub"?" selected":""}>exchange_hub</option>
          <option value="cold_loop"${b.hot_island_role==="cold_loop"?" selected":""}>cold_loop</option>
          <option value="custom"${b.hot_island_role==="custom"?" selected":""}>custom</option>
        </select>
      </div>
      <div class="field-row"><label>Target Temp (K)</label>
        <input id="z${idx}_target_temp_k" type="number" min="0" step="1"
          value="${b.target_temp_k??""}" placeholder="e.g. 330"
          oninput="syncZoneBlock(${idx})" />
      </div>
      <div class="field-row"><label>Chain ID</label>
        <input id="z${idx}_chain_id" type="text"
          value="${b.chain_id||''}" placeholder="e.g. cold_loop_hexe"
          oninput="syncZoneBlock(${idx})" />
      </div>
      <div class="field-row"><label>Loop Role</label>
        <select id="z${idx}_loop_role" onchange="syncZoneBlock(${idx})">
          <option value=""${!b.loop_role?' selected':''}>— none —</option>
          <option value="cold_loop"${b.loop_role==="cold_loop"?" selected":""}>cold_loop</option>
          <option value="hot_island"${b.loop_role==="hot_island"?" selected":""}>hot_island</option>
          <option value="hot_backbone"${b.loop_role==="hot_backbone"?" selected":""}>hot_backbone</option>
          <option value="regen_loop"${b.loop_role==="regen_loop"?" selected":""}>regen_loop</option>
          <option value="radiator_loop"${b.loop_role==="radiator_loop"?" selected":""}>radiator_loop</option>
          <option value="safety_loop"${b.loop_role==="safety_loop"?" selected":""}>safety_loop</option>
          <option value="evaporator"${b.loop_role==="evaporator"?" selected":""}>evaporator</option>
          <option value="condenser"${b.loop_role==="condenser"?" selected":""}>condenser</option>
          <option value="hx_cold_side"${b.loop_role==="hx_cold_side"?" selected":""}>hx_cold_side</option>
          <option value="hx_hot_side"${b.loop_role==="hx_hot_side"?" selected":""}>hx_hot_side</option>
          <option value="accumulator"${b.loop_role==="accumulator"?" selected":""}>accumulator</option>
          <option value="buffer"${b.loop_role==="buffer"?" selected":""}>buffer</option>
          <option value="custom"${b.loop_role==="custom"?" selected":""}>custom</option>
        </select>
      </div>
      <div class="field-row"><label>Material Family</label>
        <select id="z${idx}_material_family_ref" onchange="syncZoneBlock(${idx})">
          ${materialFamilyOptions(b.material_family_ref||"")}
        </select>
      </div>
      <div class="field-row"><label>Isolation Boundary</label>
        <select id="z${idx}_isolation_boundary" onchange="syncZoneBlock(${idx})">
          <option value="false"${!b.isolation_boundary?" selected":""}>No</option>
          <option value="true"${b.isolation_boundary?" selected":""}>Yes — bridge resistance applies</option>
        </select>
      </div>
      <div class="field-row"><label>Upstream Zone Ref</label>
        <select id="z${idx}_upstream_zone_ref" onchange="syncZoneBlock(${idx})">
          ${zoneRefOptions(b.upstream_zone_ref||"", idx)}
        </select>
      </div>
      <div class="field-row"><label>Downstream Zone Ref</label>
        <select id="z${idx}_downstream_zone_ref" onchange="syncZoneBlock(${idx})">
          ${zoneRefOptions(b.downstream_zone_ref||"", idx)}
        </select>
      </div>
      <div class="field-row"><label>Working Fluid</label>
        <select id="z${idx}_working_fluid_ref" onchange="syncZoneBlock(${idx})">
          ${workingFluidOptions(b.working_fluid_ref||"")}
        </select>
      </div>
      <div id="z${idx}_fluid_note" class="note" style="display:none;"></div>
      ${(()=>{ const sug = ZONE_TYPE_MATERIAL_SUGGEST[b.zone_type]; return (!b.material_family_ref && sug) ? `<div class="note" style="color:var(--text-dim);font-size:11px;margin-top:2px;">💡 Suggested: ${sug.note}</div>` : ''; })()}
      <div class="field-row"><label>Pickup Geometry</label>
        <select id="z${idx}_pickup_geometry_ref" onchange="syncZoneBlock(${idx})">
          ${pickupGeometryOptions(b.pickup_geometry_ref||"")}
        </select>
      </div>
      <div class="field-row"><label>Runtime Convergence Solve</label>
        <select id="z${idx}_convergence_enabled" onchange="syncZoneBlock(${idx})">
          <option value="false"${!b.convergence_enabled?" selected":""}>No — topology declared, no iteration</option>
          <option value="true"${b.convergence_enabled?" selected":""}>Yes — runtime iterates until convergence at this boundary</option>
        </select>
      </div>
      <div class="field-row"><label>Bridge Resistance (K/W)</label>
        <input id="z${idx}_r_bridge" type="number" min="0" step="0.001"
          value="${b.r_bridge_k_per_w??""}" placeholder="— n/a if no isolation boundary —"
          oninput="syncZoneBlock(${idx})" />
      </div>
      <div style="margin-top:8px;">
        <div class="section-title" style="font-size:11px;margin-bottom:4px;">
          Resistance Chain — spec §6.3, §11.2 &nbsp;|&nbsp; R_total ≈ ${rTotal.toFixed(4)} K/W
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div class="field-row"><label style="font-size:11px;">R junction→case (K/W)</label>
            <input id="z${idx}_r_jc" type="number" min="0" step="0.001"
              value="${chain.r_junction_to_case_k_per_w??""}" placeholder="null"
              oninput="syncZoneBlock(${idx})" /></div>
          <div class="field-row"><label style="font-size:11px;">R case→spreader (K/W)</label>
            <input id="z${idx}_r_cs" type="number" min="0" step="0.001"
              value="${chain.r_case_to_spreader_k_per_w??""}" placeholder="null"
              oninput="syncZoneBlock(${idx})" /></div>
          <div class="field-row"><label style="font-size:11px;">R spreader→pickup nominal (K/W)</label>
            <input id="z${idx}_r_spn" type="number" min="0" step="0.001"
              value="${chain.r_spreader_to_pickup_nominal_k_per_w??""}" placeholder="null"
              oninput="syncZoneBlock(${idx})" /></div>
          <div class="field-row"><label style="font-size:11px;">R pickup→loop (K/W)</label>
            <input id="z${idx}_r_pl" type="number" min="0" step="0.001"
              value="${chain.r_pickup_to_loop_k_per_w??""}" placeholder="null"
              oninput="syncZoneBlock(${idx})" /></div>
          <div class="field-row"><label style="font-size:11px;">R loop→sink (K/W)</label>
            <input id="z${idx}_r_ls" type="number" min="0" step="0.001"
              value="${chain.r_loop_to_sink_k_per_w??""}" placeholder="null"
              oninput="syncZoneBlock(${idx})" /></div>
        </div>
      </div>`;
    list.appendChild(card);
    // Force-set all selects post-render — selected attr in template literals unreliable
    const _zr = document.getElementById(`z${idx}_zone_role`);
    if (_zr && b.zone_role) _zr.value = b.zone_role;
    const _zt = document.getElementById(`z${idx}_zone_type`);
    if (_zt && b.zone_type) _zt.value = b.zone_type;
    const _hi = document.getElementById(`z${idx}_hot_island_role`);
    if (_hi && b.hot_island_role) _hi.value = b.hot_island_role;
    const _lr = document.getElementById(`z${idx}_loop_role`);
    if (_lr && b.loop_role) _lr.value = b.loop_role;
    const _wf = document.getElementById(`z${idx}_working_fluid_ref`);
    if (_wf && b.working_fluid_ref) _wf.value = b.working_fluid_ref;
  });

  // Wire the add-zone-block button (idempotent)
  const addBtn = document.getElementById("add-zone-block");
  if (addBtn && !addBtn._wired3a) {
    addBtn.addEventListener("click", () => addZoneBlock());
    addBtn._wired3a = true;
  }
}

/**
 * Update the topology status panel below the zone block list.
 * Lightweight client-side check — actual validation is runtime-authoritative.
 * Blueprint §11.1 — per-zone defaults provenance display.
 */
function updateTopologyStatus() {
  const el = document.getElementById("ext3a-topology-status");
  if (!el) return;
  if (zoneBlocks.length === 0) {
    el.innerHTML = "No zone blocks defined. Add zones to declare the thermal topology.";
    return;
  }
  const ids = new Set(zoneBlocks.map(b => b.zone_id));
  const unlinked = zoneBlocks.filter(b => !b.upstream_zone_ref && !b.downstream_zone_ref);
  const badRefs  = zoneBlocks.filter(b =>
    (b.upstream_zone_ref   && !ids.has(b.upstream_zone_ref)) ||
    (b.downstream_zone_ref && !ids.has(b.downstream_zone_ref))
  );
  const convergeZones = zoneBlocks.filter(b => b.convergence_enabled);
  let html = `<strong>${zoneBlocks.length} zone(s) declared.</strong>`;
  if (unlinked.length)
    html += ` <span style="color:var(--warn);">⚠ ${unlinked.length} zone(s) have no topology refs.</span>`;
  if (badRefs.length)
    html += ` <span style="color:#e05050;">✗ ${badRefs.length} zone(s) reference unknown zone_ids.</span>`;
  if (convergeZones.length)
    html += ` <span style="color:var(--accent);">↻ ${convergeZones.length} convergence-exchange zone(s).</span>`;
  if (!unlinked.length && !badRefs.length)
    html += ` <span style="color:#40c070;">✓ Topology refs valid (runtime will confirm).</span>`;
  el.innerHTML = html;
}

// ── Radiator lifecycle preview ────────────────────────────────────────────────

/**
 * Wire cavity mode and geometry mode change listeners for BOL/EOL preview.
 * Blueprint §11.3. Called once when 3A is enabled.
 */
function wireExt3aRadiatorFields() {
  ["cavity_emissivity_mode","geometry_mode",
   "surface_emissivity_bol","emissivity_degradation_fraction",
   "surface_emissivity_eol_override","background_sink_temp_k_override",
   "face_a_view_factor","face_b_view_factor","cavity_view_factor"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el._wired3a) {
      el.addEventListener("input",  updateBolEolPreview);
      el.addEventListener("change", updateBolEolPreview);
      el._wired3a = true;
    }
  });
  // Cavity fields visibility
  const cavMode = document.getElementById("cavity_emissivity_mode");
  if (cavMode && !cavMode._wired3aCav) {
    cavMode.addEventListener("change", () => {
      const show = cavMode.value === "gray_cavity_approx";
      const cf = document.getElementById("ext3a-cavity-fields");
      if (cf) cf.style.display = show ? "block" : "none";
    });
    cavMode._wired3aCav = true;
  }
  // Face B visibility
  const geomMode = document.getElementById("geometry_mode");
  if (geomMode && !geomMode._wired3aGeom) {
    geomMode.addEventListener("change", () => {
      const show = geomMode.value !== "single_sided";
      const fb = document.getElementById("ext3a-face-b-fields");
      if (fb) fb.style.display = show ? "block" : "none";
    });
    geomMode._wired3aGeom = true;
  }
  updateBolEolPreview();
}

/**
 * Compute and display BOL/EOL emissivity and area preview.
 * Display-only — all authoritative sizing is runtime per spec §3.1.
 * Blueprint §11.3 — BOL/EOL area preview and delta summary.
 */
function updateBolEolPreview() {
  const el = document.getElementById("ext3a-bol-eol-preview");
  if (!el) return;
  const eps_bol = parseFloat(val("surface_emissivity_bol") || "0.90") || 0.90;
  const deg     = parseFloat(val("emissivity_degradation_fraction") || "0.05");
  const eolOver = val("surface_emissivity_eol_override")
    ? parseFloat(val("surface_emissivity_eol_override")) : null;
  const eps_eol = eolOver !== null ? Math.max(1e-9, Math.min(1, eolOver))
    : Math.max(1e-9, Math.min(1, eps_bol * (1 - deg)));
  const Qt   = (() => {
    const dc = numVal("device_count", 1);
    const dp = getDevicePowerAtState();
    const oh = numVal("w_dot_memory_w")+numVal("w_dot_storage_w")+
               numVal("w_dot_network_w")+numVal("w_dot_power_conversion_w")+numVal("w_dot_control_w");
    let nc = 0;
    for (const b of payloadBlocks) {
      const df = b.duty_mode === "continuous" ? 1.0 : (parseFloat(b.duty_fraction)||0);
      nc += ((parseFloat(b.rf_comms_power_w)||0)+(parseFloat(b.telemetry_power_w)||0)+
             (parseFloat(b.radar_power_w)||0)+(parseFloat(b.optical_crosslink_power_w)||0))*df;
    }
    return dc*dp + oh + nc;
  })();
  const T   = numVal("target_surface_temp_k", 1200);
  const Ts  = numVal("sink_temp_k", 0);
  const Fv  = numVal("face_a_view_factor", 1.0);
  const geom = val("geometry_mode") || "single_sided";
  const Fvb  = geom !== "single_sided" ? numVal("face_b_view_factor", 1.0) : 0;
  const rad4 = Math.pow(T,4) - Math.pow(Ts,4);
  const denBol = (eps_bol * SIGMA * (Fv + Fvb) * rad4);
  const denEol = (eps_eol * SIGMA * (Fv + Fvb) * rad4);
  const A_bol = denBol > 0 ? Qt / denBol : 0;
  const A_eol = denEol > 0 ? Qt / denEol : 0;
  const delta = A_eol - A_bol;
  el.innerHTML =
    `BOL ε = <strong>${eps_bol.toFixed(4)}</strong> → A_BOL ≈ <strong>${A_bol.toFixed(4)} m²</strong> &nbsp;|&nbsp; ` +
    `EOL ε = <strong>${eps_eol.toFixed(4)}</strong> → A_EOL ≈ <strong>${A_eol.toFixed(4)} m²</strong> &nbsp;|&nbsp; ` +
    `Δ = <strong style="color:${delta > 0.01 ? "var(--warn)" : "#40c070"};">${delta >= 0 ? "+" : ""}${delta.toFixed(4)} m²</strong>` +
    `<br><span style="font-size:10px;color:var(--text-dim);">Display-only preview. Authoritative sizing requires runtime execution per spec §3.1.</span>`;
}

// ── Extension 3A output section ───────────────────────────────────────────────

/**
 * Populate the Extension 3A output section from current zoneBlocks state.
 * Display-only structural summary — all numeric results from runtime.
 * Blueprint §11.4.
 */
function updateExt3aOutputSection() {
  _renderExt3aTopologyReport();
  _renderExt3aConvergenceReport();
  _renderExt3aResistanceReport();
  _renderExt3aBolEolReport();
  _renderExt3aRadPressureReport();
  _renderExt3aDefaultsReport();
  _renderExt3aCatalogReport();
}

function _renderExt3aTopologyReport() {
  const el = document.getElementById("ext3a-topology-report");
  if (!el) return;
  if (zoneBlocks.length === 0) {
    el.innerHTML = "No zones declared. Add zone blocks in Tab 4 — Thermal Architecture."; return;
  }
  const ids = zoneBlocks.map(b => b.zone_id);
  let html = `<strong>${zoneBlocks.length} zone(s) declared.</strong><br>`;
  html += `Declared topology order (UI order — runtime may reorder per Kahn sort): `;
  html += ids.map((id,i) => `<code>${id}</code>${i < ids.length-1 ? " → " : ""}`).join("") + "<br>";
  const conv = zoneBlocks.filter(b => b.convergence_enabled);
  if (conv.length)
    html += `Convergence-exchange zones: ${conv.map(b=>`<code>${b.zone_id}</code>`).join(", ")}<br>`;
  const iso = zoneBlocks.filter(b => b.isolation_boundary);
  if (iso.length)
    html += `Isolation boundaries: ${iso.map(b=>`<code>${b.zone_id}</code>`).join(", ")}<br>`;
  html += `<span style="font-size:10px;color:var(--text-dim);">Topology validation (cycle detection, ref completeness) is runtime-authoritative per spec §13.1.</span>`;
  el.innerHTML = html;
}

function _renderExt3aConvergenceReport() {
  const el = document.getElementById("ext3a-convergence-report");
  if (!el) return;
  const convReq = val("convergence_required") === "true";
  const maxIter = parseInt(val("max_convergence_iterations")||"50", 10);
  const tol     = parseFloat(val("convergence_tolerance_k")||"0.1");
  const runaway = parseFloat(val("runaway_multiplier")||"10");
  if (!convReq) {
    el.innerHTML = "Convergence not required for this scenario. Declare convergence_required=true and add convergence_exchange zones to enable.";
    return;
  }
  el.innerHTML =
    `Convergence declared. Max iterations: <strong>${maxIter}</strong> &nbsp;|&nbsp; ` +
    `Tolerance: <strong>${tol} K</strong> &nbsp;|&nbsp; ` +
    `Runaway multiplier: <strong>${runaway}×</strong><br>` +
    `<span style="font-size:10px;color:var(--text-dim);">Actual convergence status (converged / nonconverged / runaway / invalid) produced by runtime per spec §11.4.</span>`;
}

function _renderExt3aResistanceReport() {
  const el = document.getElementById("ext3a-resistance-report");
  if (!el) return;
  if (zoneBlocks.length === 0) { el.innerHTML = "No zones declared."; return; }
  const rows = zoneBlocks.map(b => {
    const c = b.resistance_chain;
    const r = [c.r_junction_to_case_k_per_w, c.r_case_to_spreader_k_per_w,
               c.r_spreader_to_pickup_nominal_k_per_w,
               c.r_pickup_to_loop_k_per_w, c.r_loop_to_sink_k_per_w]
               .reduce((s,v) => s+(v??0), 0);
    const allNull = [c.r_junction_to_case_k_per_w, c.r_case_to_spreader_k_per_w,
                     c.r_spreader_to_pickup_nominal_k_per_w,
                     c.r_pickup_to_loop_k_per_w, c.r_loop_to_sink_k_per_w].every(v=>v===null);
    const flag = allNull ? " <span style='color:var(--warn);'>⚠ all null</span>" : "";
    return `<tr><td><code>${b.zone_id}</code></td><td>${b.label}</td><td>${r.toFixed(4)} K/W${flag}</td></tr>`;
  }).join("");
  el.innerHTML =
    `<table style="font-size:11px;width:100%;border-collapse:collapse;">` +
    `<tr><th style="text-align:left;padding:2px 6px;">Zone ID</th>` +
    `<th style="text-align:left;padding:2px 6px;">Label</th>` +
    `<th style="text-align:left;padding:2px 6px;">R_total (K/W)</th></tr>${rows}</table>` +
    `<span style="font-size:10px;color:var(--text-dim);">R_total shown is sum of declared terms. Junction temperature is runtime-authoritative per spec §11.3.</span>`;
}

function _renderExt3aBolEolReport() {
  const el = document.getElementById("ext3a-bol-eol-report");
  if (!el) return;
  const eps_bol = parseFloat(val("surface_emissivity_bol")||"0.90")||0.90;
  const deg     = parseFloat(val("emissivity_degradation_fraction")||"0.05");
  const eolOver = val("surface_emissivity_eol_override") ? parseFloat(val("surface_emissivity_eol_override")) : null;
  const eps_eol = eolOver !== null ? Math.max(1e-9,Math.min(1,eolOver))
    : Math.max(1e-9, Math.min(1, eps_bol*(1-deg)));
  const geom    = val("geometry_mode") || "single_sided";
  const cavMode = val("cavity_emissivity_mode") || "disabled";
  el.innerHTML =
    `Geometry: <strong>${geom}</strong> &nbsp;|&nbsp; Cavity emissivity mode: <strong>${cavMode}</strong><br>` +
    `BOL ε = <strong>${eps_bol.toFixed(4)}</strong> &nbsp;|&nbsp; EOL ε = <strong>${eps_eol.toFixed(4)}</strong>` +
    (eolOver !== null ? " <span style='font-size:10px;'>(EOL override applied)</span>" :
      ` &nbsp;|&nbsp; degradation fraction = ${(deg*100).toFixed(1)}%`) + `<br>` +
    `<span style="font-size:10px;color:var(--text-dim);">BOL/EOL radiator area delta is runtime-authoritative per spec §11.5–§11.9. Preview values in Tab 5.</span>`;
}

function _renderExt3aRadPressureReport() {
  const el = document.getElementById("ext3a-radpressure-report");
  if (!el) return;
  el.innerHTML =
    `Radiation-pressure metrics are flag-only outputs per spec §3.6. No propagation engine is added by 3A. ` +
    `Radiation pressure (Pa) and force (N) are computed by the runtime and emitted as warning flags only. ` +
    `<span style="font-size:10px;color:var(--text-dim);">See runtime output for computed values after packet execution.</span>`;
}

function _renderExt3aDefaultsReport() {
  const el = document.getElementById("ext3a-defaults-report");
  if (!el) return;
  // Report which zone-level fields are using runtime-injected defaults (null in UI)
  const defaulted = [];
  zoneBlocks.forEach(b => {
    const c = b.resistance_chain;
    if (!b.working_fluid_ref)   defaulted.push(`${b.zone_id}.working_fluid_ref`);
    if (!b.pickup_geometry_ref) defaulted.push(`${b.zone_id}.pickup_geometry_ref`);
    if (c.r_junction_to_case_k_per_w === null) defaulted.push(`${b.zone_id}.resistance_chain.r_junction_to_case_k_per_w`);
  });
  if (defaulted.length === 0) {
    el.innerHTML = `<span style="color:#40c070;">✓ All declared zone fields have explicit values.</span>`;
  } else {
    el.innerHTML =
      `${defaulted.length} field(s) will receive runtime defaults per spec §12:<br>` +
      defaulted.map(f => `<code style="font-size:10px;">${f}</code>`).join(", ") +
      `<br><span style="font-size:10px;color:var(--text-dim);">Defaults applied by runtime are listed in defaults_applied[] in the packet output.</span>`;
  }
}

function _renderExt3aCatalogReport() {
  const el = document.getElementById("ext3a-catalog-report");
  if (!el) return;
  const wfCat  = CATALOGS["working-fluids"];
  const pgCat  = CATALOGS["pickup-geometries"];
  const wfVer  = wfCat?.catalog_version  || "—";
  const pgVer  = pgCat?.catalog_version  || "—";
  const wfId   = wfCat?.catalog_id       || "working-fluids";
  const pgId   = pgCat?.catalog_id       || "pickup-geometries";
  el.innerHTML =
    `<code>${wfId}</code> v${wfVer} &nbsp;|&nbsp; ` +
    `<code>${pgId}</code> v${pgVer}<br>` +
    `<span style="font-size:10px;color:var(--text-dim);">Catalog IDs and versions are serialised into the run packet per blueprint §11.4.</span>`;
}

// =============================================================================
// EXTENSION 3B — UI FUNCTIONS
// Governing law: 3B-spec §16.1–§16.3
// Blueprint: 3B-blueprint §9 (operator mode design), §5.4 (operator-acceleration law)
//
// Operator controls for vault-gas environment, transport implementation,
// gas-management, TEG boundedness, and eclipse-state authority.
// Preset-loaded values remain visible and editable per §16.2.
// All state compiles into canonical payload fields only — no hidden UI state.
// =============================================================================

/** Session-scoped preset provenance accumulator. 3B-spec §16.3. */
let _ext3bPresetProvenance = [];

/**
 * Compile 3B operating_state from UI controls.
 * Returns null if 3B is disabled or operating_state not configured.
 * 3B-spec §16.1.
 */
function _compile3BOperatingState() {
  if (val("enable_model_extension_3b") !== "true") return null;
  const currentState = val("ext3b_current_state");
  if (!currentState) return null;
  return {
    current_state: currentState || "sunlit",
    state_resolution_mode: val("ext3b_state_resolution_mode") || "explicit",
    preset_id: val("ext3b_operating_state_preset_id") || null,
    preset_version: val("ext3b_operating_state_preset_version") || null,
    storage_support_enabled: val("ext3b_storage_support_enabled") === "true",
    storage_ref: val("ext3b_storage_ref") || null,
    compute_derate_fraction: parseFloat(val("ext3b_compute_derate_fraction") || "0") || 0,
    noncritical_branch_disable_refs: [],
    notes: val("ext3b_operating_state_notes") || ""
  };
}

/**
 * Compile 3B catalog versions from loaded catalogs.
 * 3B-spec §10.5.
 */
function _compile3BCatalogVersions() {
  if (val("enable_model_extension_3b") !== "true") return null;
  return {
    vault_gas_environment_presets: CATALOGS["vault-gas-environment-presets"]?.catalog_version ?? null,
    transport_implementation_presets: CATALOGS["transport-implementation-presets"]?.catalog_version ?? null,
    eclipse_state_presets: CATALOGS["eclipse-state-presets"]?.catalog_version ?? null
  };
}

/**
 * Load a vault-gas-environment preset into zone UI fields.
 * Preset values are written into visible form fields per §16.2.
 * Provenance is recorded per §16.3.
 * 3B-spec §10.1, §16.2, §16.3.
 */
function loadVaultGasPreset(zoneId, presetId) {
  const cat = CATALOGS["vault-gas-environment-presets"];
  if (!cat || !Array.isArray(cat.presets)) return;
  const entry = cat.presets.find(p => p.preset_id === presetId);
  if (!entry) { console.warn(`vault-gas preset not found: ${presetId}`); return; }

  // Write all preset values into visible form fields
  setVal(`ext3b_vge_mode_${zoneId}`, "preset");
  setVal(`ext3b_vge_gas_presence_mode_${zoneId}`, entry.gas_presence_mode);
  setVal(`ext3b_vge_gas_species_ref_${zoneId}`, entry.gas_species_ref || "");
  setVal(`ext3b_vge_pressure_pa_${zoneId}`, entry.pressure_pa ?? "");
  setVal(`ext3b_vge_convection_mode_${zoneId}`, entry.convection_assumption_mode);
  setVal(`ext3b_vge_h_internal_${zoneId}`, entry.effective_h_internal_w_per_m2_k ?? "");
  setVal(`ext3b_vge_exchange_area_${zoneId}`, entry.exchange_area_m2 ?? "");
  setVal(`ext3b_vge_contamination_mode_${zoneId}`, entry.contamination_outgassing_mode);
  setVal(`ext3b_vge_preset_id_${zoneId}`, presetId);
  setVal(`ext3b_vge_preset_version_${zoneId}`, entry.preset_version);

  // Record provenance per §16.3
  _ext3bPresetProvenance = _ext3bPresetProvenance.filter(
    p => !(p.zone_id === zoneId && p.object_type === "vault_gas_environment_model")
  );
  _ext3bPresetProvenance.push({
    zone_id: zoneId,
    object_type: "vault_gas_environment_model",
    preset_catalog_id: "vault-gas-environment-presets",
    preset_entry_id: presetId,
    preset_version: entry.preset_version,
    manual_override_fields: []
  });
  console.log(`3B: vault-gas preset loaded for zone ${zoneId}: ${presetId}`);
}

/**
 * Load a transport-implementation preset into zone UI fields.
 * 3B-spec §10.2, §16.2, §16.3.
 */
function loadTransportImplPreset(zoneId, presetId) {
  const cat = CATALOGS["transport-implementation-presets"];
  if (!cat || !Array.isArray(cat.presets)) return;
  const entry = cat.presets.find(p => p.preset_id === presetId);
  if (!entry) { console.warn(`transport-impl preset not found: ${presetId}`); return; }

  setVal(`ext3b_ti_mode_${zoneId}`, "preset");
  setVal(`ext3b_ti_transport_class_${zoneId}`, entry.transport_class);
  setVal(`ext3b_ti_pump_model_mode_${zoneId}`, entry.pump_model_mode);
  setVal(`ext3b_ti_pump_power_input_w_${zoneId}`, entry.pump_power_input_w ?? "");
  setVal(`ext3b_ti_pump_efficiency_${zoneId}`, entry.pump_efficiency_fraction ?? "");
  setVal(`ext3b_ti_pressure_drop_pa_${zoneId}`, entry.pressure_drop_pa ?? "");
  setVal(`ext3b_ti_mass_flow_${zoneId}`, entry.mass_flow_kg_per_s ?? "");
  setVal(`ext3b_ti_gas_mgmt_mode_${zoneId}`, entry.gas_management_mode);
  setVal(`ext3b_ti_allowable_void_${zoneId}`, entry.allowable_void_fraction ?? "");
  setVal(`ext3b_ti_declared_void_${zoneId}`, entry.declared_void_fraction ?? "");
  setVal(`ext3b_ti_bubble_penalty_${zoneId}`, entry.bubble_blanketing_penalty_fraction ?? "");
  setVal(`ext3b_ti_gas_lock_derate_${zoneId}`, entry.gas_lock_flow_derate_fraction ?? "");
  setVal(`ext3b_ti_separator_type_${zoneId}`, entry.separator_type);
  setVal(`ext3b_ti_preset_id_${zoneId}`, presetId);
  setVal(`ext3b_ti_preset_version_${zoneId}`, entry.preset_version);

  _ext3bPresetProvenance = _ext3bPresetProvenance.filter(
    p => !(p.zone_id === zoneId && p.object_type === "transport_implementation")
  );
  _ext3bPresetProvenance.push({
    zone_id: zoneId,
    object_type: "transport_implementation",
    preset_catalog_id: "transport-implementation-presets",
    preset_entry_id: presetId,
    preset_version: entry.preset_version,
    manual_override_fields: []
  });
  console.log(`3B: transport-impl preset loaded for zone ${zoneId}: ${presetId}`);
}

/**
 * Load an eclipse-state preset into scenario operating_state UI fields.
 * 3B-spec §10.3, §16.2, §16.3.
 */
function loadEclipseStatePreset(presetId) {
  const cat = CATALOGS["eclipse-state-presets"];
  if (!cat || !Array.isArray(cat.presets)) return;
  const entry = cat.presets.find(p => p.preset_id === presetId);
  if (!entry) { console.warn(`eclipse-state preset not found: ${presetId}`); return; }

  setVal("ext3b_current_state", entry.current_state);
  setVal("ext3b_state_resolution_mode", "preset");
  setVal("ext3b_operating_state_preset_id", presetId);
  setVal("ext3b_operating_state_preset_version", entry.preset_version);
  setVal("ext3b_storage_support_enabled", String(entry.storage_support_enabled));
  setVal("ext3b_compute_derate_fraction", String(entry.compute_derate_fraction));

  _ext3bPresetProvenance = _ext3bPresetProvenance.filter(
    p => !(p.zone_id === null && p.object_type === "operating_state")
  );
  _ext3bPresetProvenance.push({
    zone_id: null,
    object_type: "operating_state",
    preset_catalog_id: "eclipse-state-presets",
    preset_entry_id: presetId,
    preset_version: entry.preset_version,
    manual_override_fields: []
  });
  console.log(`3B: eclipse-state preset loaded: ${presetId}`);
}

/**
 * Populate 3B preset dropdowns from loaded catalogs.
 * Called on catalog load. 3B-spec §16.
 */
function populateExt3bCatalogDropdowns() {
  const vgeCat = CATALOGS["vault-gas-environment-presets"];
  const tiCat  = CATALOGS["transport-implementation-presets"];
  const esCat  = CATALOGS["eclipse-state-presets"];

  // Populate eclipse-state preset dropdown
  const esSelect = document.getElementById("ext3b_eclipse_state_preset_select");
  if (esSelect && esCat?.presets) {
    esSelect.innerHTML = `<option value="">-- Select preset --</option>` +
      esCat.presets.map(p => `<option value="${p.preset_id}">${p.label}</option>`).join("");
    esSelect.onchange = () => { if (esSelect.value) loadEclipseStatePreset(esSelect.value); };
  }

  console.log("3B: catalog dropdowns populated — vge:", vgeCat?.presets?.length ?? 0,
    "ti:", tiCat?.presets?.length ?? 0, "es:", esCat?.presets?.length ?? 0);
}

/**
 * Handle 3B enable toggle. 3B-spec §16.1.
 */
function onExt3bEnableChange() {
  const enabled = val("enable_model_extension_3b") === "true";
  const ext3bFields = document.getElementById("ext3b-scenario-fields");
  if (ext3bFields) ext3bFields.style.display = enabled ? "block" : "none";
  _ext3bPresetProvenance = [];
  updateSummary();
}

// Wire 3B event listeners — called from initPage()
function wireExt3bEvents() {
  document.getElementById("enable_model_extension_3b")
    ?.addEventListener("change", onExt3bEnableChange);
  document.getElementById("ext3b_eclipse_state_preset_select")
    ?.addEventListener("change", (e) => { if (e.target.value) loadEclipseStatePreset(e.target.value); });
}

/** Helper: setVal — set form element value safely */
function setVal(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") { el.checked = value === true || value === "true"; }
  else { el.value = value ?? ""; }
}

// =============================================================================
// EXTENSION 4 — UI FUNCTIONS
// Governing law: ext4-spec-v0.1.4 §19.1–§19.5
// Blueprint: blueprint-v0.1.4 §Build-Agent-Responsibilities, §Controls-and-Gates Gate 7
//
// §19.1 — ext4 must be visible in UI and runtime output.
// §19.2 — expose all editable scenario fields.
// §19.3 — display all required read-only result fields.
// §19.4 — state-compiler.js mirrors ext4 fields through canonical payload.
// §19.5 — forbidden behaviors: treat ext4 as proven hardware, hide disabled
//          state, hide worsening burden, silently infer export fraction,
//          present 3C metadata as runtime authority.
// =============================================================================

/**
 * _compileExt4TpvConfig
 * Compile tpv_recapture_config from individual UI controls.
 * Returns null when ext4 is disabled or no config fields are populated.
 * ext4-spec §19.4, §5.3.
 */
function _compileExt4TpvConfig() {
  if (val("enable_model_extension_4") !== "true") return null;
  const modelId = val("tpv_model_id");
  if (!modelId) return null;

  const effMode = val("conversion_efficiency_mode") || "fixed";
  const cfg = {
    tpv_model_id: modelId,
    coverage_fraction: parseFloat(val("tpv_coverage_fraction")) || 0.10,
    radiator_view_factor_to_tpv: parseFloat(val("tpv_radiator_view_factor")) || 0.50,
    spectral_capture_fraction: parseFloat(val("tpv_spectral_capture_fraction")) || 0.50,
    coupling_derate_fraction: parseFloat(val("tpv_coupling_derate_fraction")) || 0.80,
    conversion_efficiency_mode: effMode,
    export_fraction: parseFloat(val("tpv_export_fraction")) || 0.00,
    onboard_return_heat_fraction: parseFloat(val("tpv_onboard_return_heat_fraction")) || 1.00,
    cell_cooling_mode: val("tpv_cell_cooling_mode") || "separate_cooling",
    iteration_report_detail: val("tpv_iteration_report_detail") || "minimal",
  };
  // Efficiency-mode-conditional fields
  if (effMode === "fixed") {
    cfg.eta_tpv_fixed = parseFloat(val("tpv_eta_fixed")) || 0.15;
  } else if (effMode === "carnot_bounded") {
    cfg.eta_tpv_carnot_fraction = parseFloat(val("tpv_eta_carnot_fraction")) || null;
    cfg.tpv_cold_side_temperature_k = parseFloat(val("tpv_cold_side_temperature_k")) || null;
  }
  return cfg;
}

/**
 * _compileExt4CatalogVersions
 * Returns extension_4_catalog_versions as pass-through provenance object.
 * Zero numeric authority. ext4-spec §19.2, §6.2.
 */
function _compileExt4CatalogVersions() {
  if (val("enable_model_extension_4") !== "true") return null;
  const raw = val("extension_4_catalog_versions");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

/**
 * onExt4EnableChange
 * Handle ext4 enable toggle. Shows/hides ext4 config panel. §19.1, §19.5.
 * Must NOT hide disabled state — disabled state is always declared. §19.5.
 */
function onExt4EnableChange() {
  const enabled = val("enable_model_extension_4") === "true";
  const panel = document.getElementById("ext4-config-panel");
  if (panel) panel.style.display = enabled ? "block" : "none";
  // §19.5 — disabled state must always be visible; show disabled indicator
  const disabledNotice = document.getElementById("ext4-disabled-notice");
  if (disabledNotice) disabledNotice.style.display = enabled ? "none" : "block";
}

/**
 * renderExt4ResultPanel
 * Render read-only Extension 4 result fields into the UI result panel.
 * Required fields per §19.3. Must not hide worsening burden. §19.5.
 *
 * @param result  extension_4_result from the run-packet, or null.
 */
function renderExt4ResultPanel(result) {
  const panel = document.getElementById("ext4-result-panel");
  if (!panel) return;

  if (!result) {
    panel.innerHTML = "<p><em>Extension 4 result not available.</em></p>";
    return;
  }

  // §19.5 — must not hide disabled state
  if (!result.extension_4_enabled) {
    panel.innerHTML = [
      "<p><strong>Extension 4:</strong> <code>disabled</code> — zero numeric authority.</p>",
      "<p><em>Baseline and prior extension results are unchanged.</em></p>",
    ].join("");
    return;
  }

  // §19.5 — must not hide worsening burden; sign always shown
  const relief = result.q_relief_w;
  const reliefStr = relief !== null
    ? `${relief >= 0 ? "+" : ""}${relief.toFixed(2)} W ` +
      `<span style="color:${relief >= 0 ? "green" : "red"}">${relief >= 0 ? "(relief)" : "⚠ burden worsened"}</span>`
    : "—";

  const fmt = (v, unit) => v !== null ? `${Number(v).toFixed(2)} ${unit}` : "—";
  const fmtPct = (v) => v !== null ? `${(Number(v) * 100).toFixed(2)} %` : "—";

  // §19.3 — required read-only result fields
  const rows = [
    ["Mode",                        `<code>${result.model_extension_4_mode}</code>`],
    ["TPV model ID",                `<code>${result.tpv_model_id ?? "null"}</code>`],
    ["Baseline radiator burden",    fmt(result.q_rad_baseline_w, "W")],
    ["TPV intercepted power",       fmt(result.q_tpv_in_w, "W")],
    ["TPV electrical output",       fmt(result.p_elec_w, "W")],
    ["Exported power",              fmt(result.p_export_w, "W")],
    ["Onboard return heat",         fmt(result.q_return_w, "W")],
    ["TPV local loss heat",         fmt(result.q_tpv_loss_w, "W")],
    ["Separate cooling load",       fmt(result.q_tpv_separate_cooling_load_w, "W")],
    ["Net radiator burden",         `<strong>${fmt(result.q_rad_net_w, "W")}</strong>`],
    ["Burden relief ΔQ",           reliefStr],
    ["BOL area delta",              fmt(result.area_delta_bol_m2, "m²")],
    ["EOL area delta",              fmt(result.area_delta_eol_m2, "m²")],
    ["Convergence status",          `<code>${result.convergence_status}</code>`],
    ["Iterations",                  String(result.convergence_iterations)],
  ];

  let html = "<table><tbody>";
  for (const [label, val_] of rows) {
    html += `<tr><td><strong>${label}</strong></td><td>${val_}</td></tr>`;
  }
  html += "</tbody></table>";

  // §19.5 — warnings and errors must be visible
  if (result.blocking_errors && result.blocking_errors.length > 0) {
    html += "<p><strong>Blocking errors:</strong></p><ul>";
    for (const e of result.blocking_errors) html += `<li><code>${e}</code></li>`;
    html += "</ul>";
  }
  if (result.warnings && result.warnings.length > 0) {
    html += "<p><strong>Warnings:</strong></p><ul>";
    for (const w of result.warnings) html += `<li><code>${w}</code></li>`;
    html += "</ul>";
  }

  // §2.3 — exploratory labeling must be preserved in UI
  html += `<p><em>⚠ Exploratory model — not validated flight hardware. ext4-spec §2.3</em></p>`;

  panel.innerHTML = html;
}

// Wire ext4 event listeners — called from initPage()
function wireExt4Events() {
  document.getElementById("enable_model_extension_4")
    ?.addEventListener("change", onExt4EnableChange);
  document.getElementById("model_extension_4_mode")
    ?.addEventListener("change", onExt4EnableChange);
}
