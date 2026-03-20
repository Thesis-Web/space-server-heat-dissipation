"use strict";
/**
 * run-scenario.ts
 * Single-scenario execution runner.
 * Governed by §26.5, §27 (full 11-step execution order).
 * This runner orchestrates all transforms, validators, formulas, and emitters.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScenario = runScenario;
const operating_mode_1 = require("../validators/operating-mode");
const bounds_1 = require("../validators/bounds");
const loads_1 = require("../formulas/loads");
const radiation_1 = require("../formulas/radiation");
const storage_1 = require("../formulas/storage");
const scenario_aggregator_1 = require("../transforms/scenario-aggregator");
const default_expander_1 = require("../transforms/default-expander");
const json_emitter_1 = require("../emitters/json-emitter");
const flag_emitter_1 = require("../emitters/flag-emitter");
const flag_emitter_2 = require("../emitters/flag-emitter");
// ─── Runner ───────────────────────────────────────────────────────────────────
function runScenario(input) {
    const allFlags = [];
    const allAssumptions = [];
    const allNotes = [];
    // ── Step 1: schema load (caller responsibility — validated before run) ──────
    // Step 2: payload normalization — defaults expansion
    const defaults = (0, default_expander_1.expandDefaults)({
        epsilon_rad: input.epsilon_rad,
        reserve_margin_fraction: input.reserve_margin_fraction,
        t_sink_effective_k: input.t_sink_effective_k,
        thermal_policy: input.thermal_policy,
    });
    allAssumptions.push(...defaults.assumptions);
    // ── Step 3: operating-mode validation §27.3 ──────────────────────────────────
    const orbitViolations = (0, operating_mode_1.validateOrbitClass)(input.orbit_class);
    if (orbitViolations.length > 0) {
        allFlags.push(...(0, operating_mode_1.modeViolationsToFlags)(orbitViolations));
        // Cannot continue with invalid orbit class
        const flagSummary = (0, flag_emitter_1.emitFlags)(allFlags);
        return (0, json_emitter_1.emitStructuredResult)(input.scenario_id, input.load_state, emptyThermal(input.radiator.target_surface_temp_k), emptyElectrical(), emptyPackaging(input.packaging_notes ?? ''), allFlags, flagSummary, allAssumptions, allNotes);
    }
    // Mode fusion check §4.4
    if (input.thermal_stages) {
        const fusionViolations = (0, operating_mode_1.validateNoModeFusion)(input.thermal_stages);
        allFlags.push(...(0, operating_mode_1.modeViolationsToFlags)(fusionViolations));
    }
    // Branch Carnot checks §29.2, §30.2
    if (input.branches) {
        for (const branch of input.branches) {
            if (!branch.enabled)
                continue;
            if (['reverse_brayton', 'stirling'].includes(branch.branch_type)) {
                if (branch.t_cold_k && branch.t_hot_k) {
                    allFlags.push(...(0, operating_mode_1.modeViolationsToFlags)((0, operating_mode_1.validateHeatLiftMode)({
                        branch_id: branch.branch_id,
                        cop_heating_actual: branch.cop_or_eta,
                        t_cold_source_k: branch.t_cold_k,
                        t_hot_delivery_k: branch.t_hot_k,
                    })));
                }
            }
            if (['brayton_power_cycle', 'stirling', 'tpv'].includes(branch.branch_type)) {
                if (branch.t_cold_k && branch.t_hot_k) {
                    allFlags.push(...(0, operating_mode_1.modeViolationsToFlags)((0, operating_mode_1.validatePowerCycleMode)({
                        branch_id: branch.branch_id,
                        eta_cycle_actual: branch.cop_or_eta,
                        t_hot_source_k: branch.t_hot_k,
                        t_cold_sink_k: branch.t_cold_k,
                    })));
                }
            }
        }
    }
    // ── Step 4: load-state resolution §27.4 ─────────────────────────────────────
    // (resolved inside aggregateInternalDissipation via loads module)
    // ── Step 5: internal dissipation aggregation §27.5 ──────────────────────────
    const loadResult = (0, loads_1.aggregateInternalDissipation)(input.compute_modules, input.comms_payload, input.additional_conversion_losses_w ?? 0, input.additional_control_losses_w ?? 0);
    // ── Step 6: environmental term aggregation §27.6 ─────────────────────────────
    const w_parasitic = input.w_dot_parasitic_w ?? 0;
    const q_branch_losses = input.branches
        ? input.branches.filter(b => b.enabled).reduce((s, b) => s + (b.q_dot_input_w ?? 0) * (1 - b.cop_or_eta), 0)
        : 0;
    const w_exported = input.w_dot_exported_equivalent_w ?? 0;
    const balance = (0, scenario_aggregator_1.aggregateSystemBalance)({
        q_dot_internal_w: loadResult.q_dot_internal_w,
        env_terms: input.env_terms,
        w_dot_parasitic_w: w_parasitic,
        q_dot_branch_losses_w: q_branch_losses,
        w_dot_exported_equivalent_w: w_exported,
    });
    allAssumptions.push(...balance.assumptions);
    allNotes.push(...balance.notes);
    // ── Step 7: stage execution §27.7 ────────────────────────────────────────────
    let stage_losses_w = 0;
    if (input.thermal_stages) {
        for (const stage of input.thermal_stages) {
            stage_losses_w += stage.loss_w;
        }
    }
    // ── Step 8: branch execution §27.8 ───────────────────────────────────────────
    let w_branch_generated = 0;
    let w_branch_consumed = 0;
    if (input.branches) {
        for (const branch of input.branches) {
            if (!branch.enabled)
                continue;
            const q_in = branch.q_dot_input_w ?? 0;
            if (branch.output_class === 'electrical') {
                w_branch_generated += q_in * branch.cop_or_eta;
                w_branch_consumed += q_in;
            }
            else if (branch.output_class === 'directed_energy') {
                w_branch_consumed += q_in;
            }
            // Low-significance flag §31.3
            const sig_flag = (0, operating_mode_1.checkScavengingSignificance)(branch.branch_id, q_in * branch.cop_or_eta, loadResult.q_dot_internal_w);
            if (sig_flag)
                allFlags.push(sig_flag);
        }
    }
    // ── Step 9: radiator sizing §27.9 ────────────────────────────────────────────
    const epsilon = input.radiator.emissivity ?? defaults.epsilon_rad;
    const margin = input.radiator.reserve_margin_fraction ?? defaults.reserve_margin_fraction;
    const t_sink = defaults.t_sink_effective_k;
    const t_rad = input.radiator.target_surface_temp_k;
    // Radiator bounds check §22.3
    const radBoundsViolations = (0, bounds_1.validateRadiatorBounds)({
        emissivity: epsilon,
        target_surface_temp_k: t_rad,
        reserve_margin_fraction: margin,
    });
    allFlags.push(...(0, bounds_1.boundsViolationsToFlags)(radBoundsViolations, 'radiator'));
    let a_effective = 0;
    let a_with_margin = 0;
    if (input.radiator.effective_area_m2) {
        // User-specified area: compute achieved rejection mismatch §22.2
        a_effective = input.radiator.effective_area_m2;
        a_with_margin = a_effective * (1 + margin);
        allNotes.push(`User-specified radiator area: ${a_effective.toFixed(2)} m². ` +
            `Achieved rejection vs. required should be checked by comparison.`);
    }
    else {
        // Compute required area §12.2, §32.3
        const sizingResult = (0, radiation_1.computeRadiatorArea)({
            q_dot_required_w: balance.q_dot_total_reject_w,
            t_radiator_target_k: t_rad,
            emissivity: epsilon,
            t_sink_effective_k: t_sink,
            reserve_margin_fraction: margin,
        });
        a_effective = sizingResult.a_radiator_effective_m2;
        a_with_margin = sizingResult.a_radiator_with_margin_m2;
    }
    // Large radiator scale flag §35.1
    if (a_with_margin > 500) {
        allFlags.push((0, flag_emitter_2.makeFlagWarning)(flag_emitter_2.FLAG_IDS.REQUIRES_LARGE_RADIATOR, `Radiator area with margin (${a_with_margin.toFixed(1)} m²) exceeds 500 m². ` +
            `Verify structural packaging and mass budget.`, 'radiator', 'a_radiator_with_margin_m2', a_with_margin, 500));
    }
    // ── Step 10: flag generation §27.10 ──────────────────────────────────────────
    // Research-required flags §39
    if (input.sourcing_flags) {
        for (const [field, status] of Object.entries(input.sourcing_flags)) {
            if (status === 'research-required') {
                allFlags.push((0, flag_emitter_2.makeResearchRequiredFlag)(field, 'scenario'));
            }
        }
    }
    // Zone bounds §19.3
    if (input.thermal_zones) {
        for (const zone of input.thermal_zones) {
            const violations = (0, bounds_1.validateThermalZoneBounds)(zone);
            allFlags.push(...(0, bounds_1.boundsViolationsToFlags)(violations, `zone_${zone.zone_id}`));
        }
    }
    // High-parasitic flag §35.1
    if (w_parasitic > 0.1 * balance.q_dot_total_reject_w) {
        allFlags.push((0, flag_emitter_2.makeFlagWarning)(flag_emitter_2.FLAG_IDS.REQUIRES_HIGH_PARASITIC, `Parasitic work (${w_parasitic.toFixed(1)} W) is >10% of total rejection requirement. ` +
            `Review heat-lift architecture efficiency.`, 'system', 'w_dot_parasitic_w', w_parasitic, 0.1 * balance.q_dot_total_reject_w));
    }
    // ── Step 11: output emission §27.11 ─────────────────────────────────────────
    // Storage
    let storage_e_j = 0;
    let mass_storage_kg = null;
    if (input.storage) {
        const storBounds = (0, bounds_1.validateStorageBounds)(input.storage);
        allFlags.push(...(0, bounds_1.boundsViolationsToFlags)(storBounds, 'storage'));
        const storResult = (0, storage_1.computeStorageEnergy)({
            mass_kg: input.storage.mass_kg,
            cp_j_per_kgk: input.storage.cp_j_per_kgk,
            temp_min_k: input.storage.temp_min_k,
            temp_max_k: input.storage.temp_max_k,
            latent_heat_j_per_kg: input.storage.latent_heat_j_per_kg,
            latent_utilization_fraction: input.storage.latent_utilization_fraction,
        });
        storage_e_j = storResult.e_storage_usable_j;
        mass_storage_kg = input.storage.mass_kg;
    }
    // Mass estimates §34.4
    let mass_radiator_kg = null;
    if (input.radiator.areal_mass_density_kg_per_m2) {
        mass_radiator_kg = a_with_margin * input.radiator.areal_mass_density_kg_per_m2;
    }
    const mass_total_kg = mass_radiator_kg !== null && mass_storage_kg !== null
        ? mass_radiator_kg + mass_storage_kg
        : mass_radiator_kg ?? mass_storage_kg;
    // Resolve zone temperatures
    const zones = input.thermal_zones ?? [];
    const getZoneTemp = (idx) => zones[idx] ? zones[idx].target_temp_k : null;
    const thermal = {
        q_dot_internal_w: balance.q_dot_internal_w,
        q_dot_external_w: balance.q_dot_external_w,
        q_dot_total_reject_w: balance.q_dot_total_reject_w,
        t_zone_a_k: getZoneTemp(0),
        t_zone_b_k: getZoneTemp(1),
        t_zone_c_k: getZoneTemp(2),
        t_zone_d_k: getZoneTemp(3),
        t_radiator_target_k: t_rad,
        a_radiator_effective_m2: a_effective,
        a_radiator_with_margin_m2: a_with_margin,
        storage_energy_usable_j: storage_e_j,
        stage_losses_w,
    };
    const electrical = {
        w_dot_compute_w: loadResult.w_dot_compute_w,
        w_dot_non_compute_w: loadResult.w_dot_non_compute_w,
        w_dot_parasitic_w: w_parasitic,
        w_dot_branch_generated_w: w_branch_generated,
        w_dot_branch_consumed_w: w_branch_consumed,
        w_dot_net_margin_w: w_branch_generated > 0 ? w_branch_generated - w_branch_consumed : null,
    };
    const packaging = {
        mass_estimate_total_kg: mass_total_kg ?? null,
        mass_estimate_radiator_kg: mass_radiator_kg,
        mass_estimate_storage_kg: mass_storage_kg,
        packaging_notes: input.packaging_notes ?? '',
    };
    const flagSummary = (0, flag_emitter_1.emitFlags)(allFlags);
    return (0, json_emitter_1.emitStructuredResult)(input.scenario_id, input.load_state, thermal, electrical, packaging, allFlags, flagSummary, allAssumptions, allNotes);
}
// ─── Empty output helpers for early-exit paths ───────────────────────────────
function emptyThermal(t_rad_k) {
    return {
        q_dot_internal_w: 0, q_dot_external_w: 0, q_dot_total_reject_w: 0,
        t_zone_a_k: null, t_zone_b_k: null, t_zone_c_k: null, t_zone_d_k: null,
        t_radiator_target_k: t_rad_k, a_radiator_effective_m2: 0,
        a_radiator_with_margin_m2: 0, storage_energy_usable_j: 0, stage_losses_w: 0,
    };
}
function emptyElectrical() {
    return {
        w_dot_compute_w: 0, w_dot_non_compute_w: 0, w_dot_parasitic_w: 0,
        w_dot_branch_generated_w: 0, w_dot_branch_consumed_w: 0, w_dot_net_margin_w: null,
    };
}
function emptyPackaging(notes) {
    return {
        mass_estimate_total_kg: null, mass_estimate_radiator_kg: null,
        mass_estimate_storage_kg: null, packaging_notes: notes,
    };
}
//# sourceMappingURL=run-scenario.js.map