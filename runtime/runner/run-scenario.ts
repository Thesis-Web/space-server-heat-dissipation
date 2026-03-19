/**
 * run-scenario.ts
 * Single-scenario execution runner.
 * Governed by §26.5, §27 (full 11-step execution order).
 * This runner orchestrates all transforms, validators, formulas, and emitters.
 */

import { validateOrbitClass, validateNoModeFusion, validateHeatLiftMode, validatePowerCycleMode, checkScavengingSignificance, modeViolationsToFlags } from '../validators/operating-mode';
import { validateThermalZoneBounds, validateStorageBounds, validateRadiatorBounds, boundsViolationsToFlags } from '../validators/bounds';
import { aggregateInternalDissipation, ComputeModuleSpec, CommsPayloadSpec } from '../formulas/loads';
import { computeRadiatorArea } from '../formulas/radiation';
import { computeStorageEnergy } from '../formulas/storage';
import { aggregateSystemBalance, EnvironmentTerms } from '../transforms/scenario-aggregator';
import { expandDefaults } from '../transforms/default-expander';
import { emitStructuredResult, RuntimeResult, ThermalOutputs, ElectricalOutputs, PackagingOutputs, Assumption } from '../emitters/json-emitter';
import { emitFlags, Flag } from '../emitters/flag-emitter';
import { makeResearchRequiredFlag, makeFlagWarning, FLAG_IDS } from '../emitters/flag-emitter';
// HOLE-011: THERMAL_POLICY_MARGINS removed — flows through expandDefaults, not used directly here.

// ─── Scenario run input ───────────────────────────────────────────────────────

export interface ScenarioRunInput {
  scenario_id: string;
  orbit_class: string;
  thermal_policy: string;
  load_state: string;

  compute_modules: ComputeModuleSpec[];
  comms_payload: CommsPayloadSpec | null;

  env_terms: EnvironmentTerms | null;
  t_sink_effective_k?: number;
  epsilon_rad?: number;
  reserve_margin_fraction?: number;

  radiator: {
    radiator_id: string;
    target_surface_temp_k: number;
    emissivity?: number;
    effective_area_m2?: number;
    reserve_margin_fraction?: number;
    areal_mass_density_kg_per_m2?: number;
  };

  storage: {
    storage_id: string;
    mass_kg: number;
    cp_j_per_kgk: number;
    temp_min_k: number;
    temp_max_k: number;
    latent_heat_j_per_kg: number;
    latent_utilization_fraction: number;
  } | null;

  thermal_zones?: Array<{
    zone_id: string;
    zone_label: string;
    target_temp_k: number;
    temp_min_k: number;
    temp_max_k: number;
    pressure_min_pa?: number;
    pressure_max_pa?: number;
  }>;

  thermal_stages?: Array<{
    stage_id: string;
    stage_type: string;
    input_zone_ref: string;
    output_zone_ref: string;
    input_temp_k: number;
    output_temp_k: number;
    work_input_w: number;
    work_output_w: number;
    loss_w: number;
    cop_actual?: number;
    efficiency?: number;
    effectiveness?: number;
  }>;

  branches?: Array<{
    branch_id: string;
    branch_type: string;
    enabled: boolean;
    mode_label: string;
    cop_or_eta: number;
    output_class: string;
    t_cold_k?: number;
    t_hot_k?: number;
    q_dot_input_w?: number;
  }>;

  w_dot_parasitic_w?: number;
  additional_conversion_losses_w?: number;
  additional_control_losses_w?: number;
  w_dot_exported_equivalent_w?: number;

  sourcing_flags?: Record<string, 'operator-estimated' | 'sourced' | 'inferred' | 'research-required'>;
  packaging_notes?: string;
  operator_notes?: string;
}

// ─── Runner ───────────────────────────────────────────────────────────────────

export function runScenario(input: ScenarioRunInput): RuntimeResult {
  const allFlags: Flag[] = [];
  const allAssumptions: Assumption[] = [];
  const allNotes: string[] = [];

  // ── Step 1: schema load (caller responsibility — validated before run) ──────
  // Step 2: payload normalization — defaults expansion
  const defaults = expandDefaults({
    epsilon_rad: input.epsilon_rad,
    reserve_margin_fraction: input.reserve_margin_fraction,
    t_sink_effective_k: input.t_sink_effective_k,
    thermal_policy: input.thermal_policy,
  });
  allAssumptions.push(...defaults.assumptions);

  // ── Step 3: operating-mode validation §27.3 ──────────────────────────────────
  const orbitViolations = validateOrbitClass(input.orbit_class);
  if (orbitViolations.length > 0) {
    allFlags.push(...modeViolationsToFlags(orbitViolations));
    // Cannot continue with invalid orbit class
    const flagSummary = emitFlags(allFlags);
    return emitStructuredResult(
      input.scenario_id, input.load_state,
      emptyThermal(input.radiator.target_surface_temp_k),
      emptyElectrical(), emptyPackaging(input.packaging_notes ?? ''),
      allFlags, flagSummary, allAssumptions, allNotes
    );
  }

  // Mode fusion check §4.4
  if (input.thermal_stages) {
    const fusionViolations = validateNoModeFusion(input.thermal_stages);
    allFlags.push(...modeViolationsToFlags(fusionViolations));
  }

  // Branch Carnot checks §29.2, §30.2
  if (input.branches) {
    for (const branch of input.branches) {
      if (!branch.enabled) continue;
      if (['reverse_brayton', 'stirling'].includes(branch.branch_type)) {
        if (branch.t_cold_k && branch.t_hot_k) {
          allFlags.push(
            ...modeViolationsToFlags(
              validateHeatLiftMode({
                branch_id: branch.branch_id,
                cop_heating_actual: branch.cop_or_eta,
                t_cold_source_k: branch.t_cold_k,
                t_hot_delivery_k: branch.t_hot_k,
              })
            )
          );
        }
      }
      if (['brayton_power_cycle', 'stirling', 'tpv'].includes(branch.branch_type)) {
        if (branch.t_cold_k && branch.t_hot_k) {
          allFlags.push(
            ...modeViolationsToFlags(
              validatePowerCycleMode({
                branch_id: branch.branch_id,
                eta_cycle_actual: branch.cop_or_eta,
                t_hot_source_k: branch.t_hot_k,
                t_cold_sink_k: branch.t_cold_k,
              })
            )
          );
        }
      }
    }
  }

  // ── Step 4: load-state resolution §27.4 ─────────────────────────────────────
  // (resolved inside aggregateInternalDissipation via loads module)

  // ── Step 5: internal dissipation aggregation §27.5 ──────────────────────────
  const loadResult = aggregateInternalDissipation(
    input.compute_modules,
    input.comms_payload,
    input.additional_conversion_losses_w ?? 0,
    input.additional_control_losses_w ?? 0
  );

  // ── Step 6: environmental term aggregation §27.6 ─────────────────────────────
  const w_parasitic = input.w_dot_parasitic_w ?? 0;
  const q_branch_losses = input.branches
    ? input.branches.filter(b => b.enabled).reduce((s, b) => s + (b.q_dot_input_w ?? 0) * (1 - b.cop_or_eta), 0)
    : 0;
  const w_exported = input.w_dot_exported_equivalent_w ?? 0;

  const balance = aggregateSystemBalance({
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
      if (!branch.enabled) continue;
      const q_in = branch.q_dot_input_w ?? 0;
      if (branch.output_class === 'electrical') {
        w_branch_generated += q_in * branch.cop_or_eta;
        w_branch_consumed += q_in;
      } else if (branch.output_class === 'directed_energy') {
        w_branch_consumed += q_in;
      }
      // Low-significance flag §31.3
      const sig_flag = checkScavengingSignificance(
        branch.branch_id,
        q_in * branch.cop_or_eta,
        loadResult.q_dot_internal_w
      );
      if (sig_flag) allFlags.push(sig_flag);
    }
  }

  // ── Step 9: radiator sizing §27.9 ────────────────────────────────────────────
  const epsilon = input.radiator.emissivity ?? defaults.epsilon_rad;
  const margin = input.radiator.reserve_margin_fraction ?? defaults.reserve_margin_fraction;
  const t_sink = defaults.t_sink_effective_k;
  const t_rad = input.radiator.target_surface_temp_k;

  // Radiator bounds check §22.3
  const radBoundsViolations = validateRadiatorBounds({
    emissivity: epsilon,
    target_surface_temp_k: t_rad,
    reserve_margin_fraction: margin,
  });
  allFlags.push(...boundsViolationsToFlags(radBoundsViolations, 'radiator'));

  let a_effective = 0;
  let a_with_margin = 0;

  if (input.radiator.effective_area_m2) {
    // User-specified area: compute achieved rejection mismatch §22.2
    a_effective = input.radiator.effective_area_m2;
    a_with_margin = a_effective * (1 + margin);
    allNotes.push(
      `User-specified radiator area: ${a_effective.toFixed(2)} m². ` +
        `Achieved rejection vs. required should be checked by comparison.`
    );
  } else {
    // Compute required area §12.2, §32.3
    const sizingResult = computeRadiatorArea({
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
    allFlags.push(
      makeFlagWarning(
        FLAG_IDS.REQUIRES_LARGE_RADIATOR,
        `Radiator area with margin (${a_with_margin.toFixed(1)} m²) exceeds 500 m². ` +
          `Verify structural packaging and mass budget.`,
        'radiator',
        'a_radiator_with_margin_m2',
        a_with_margin,
        500
      )
    );
  }

  // ── Step 10: flag generation §27.10 ──────────────────────────────────────────
  // Research-required flags §39
  if (input.sourcing_flags) {
    for (const [field, status] of Object.entries(input.sourcing_flags)) {
      if (status === 'research-required') {
        allFlags.push(makeResearchRequiredFlag(field, 'scenario'));
      }
    }
  }

  // Zone bounds §19.3
  if (input.thermal_zones) {
    for (const zone of input.thermal_zones) {
      const violations = validateThermalZoneBounds(zone);
      allFlags.push(...boundsViolationsToFlags(violations, `zone_${zone.zone_id}`));
    }
  }

  // High-parasitic flag §35.1
  if (w_parasitic > 0.1 * balance.q_dot_total_reject_w) {
    allFlags.push(
      makeFlagWarning(
        FLAG_IDS.REQUIRES_HIGH_PARASITIC,
        `Parasitic work (${w_parasitic.toFixed(1)} W) is >10% of total rejection requirement. ` +
          `Review heat-lift architecture efficiency.`,
        'system',
        'w_dot_parasitic_w',
        w_parasitic,
        0.1 * balance.q_dot_total_reject_w
      )
    );
  }

  // ── Step 11: output emission §27.11 ─────────────────────────────────────────
  // Storage
  let storage_e_j = 0;
  let mass_storage_kg: number | null = null;
  if (input.storage) {
    const storBounds = validateStorageBounds(input.storage);
    allFlags.push(...boundsViolationsToFlags(storBounds, 'storage'));
    const storResult = computeStorageEnergy({
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
  let mass_radiator_kg: number | null = null;
  if (input.radiator.areal_mass_density_kg_per_m2) {
    mass_radiator_kg = a_with_margin * input.radiator.areal_mass_density_kg_per_m2;
  }
  const mass_total_kg =
    mass_radiator_kg !== null && mass_storage_kg !== null
      ? mass_radiator_kg + mass_storage_kg
      : mass_radiator_kg ?? mass_storage_kg;

  // Resolve zone temperatures
  const zones = input.thermal_zones ?? [];
  const getZoneTemp = (idx: number): number | null =>
    zones[idx] ? zones[idx].target_temp_k : null;

  const thermal: ThermalOutputs = {
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

  const electrical: ElectricalOutputs = {
    w_dot_compute_w: loadResult.w_dot_compute_w,
    w_dot_non_compute_w: loadResult.w_dot_non_compute_w,
    w_dot_parasitic_w: w_parasitic,
    w_dot_branch_generated_w: w_branch_generated,
    w_dot_branch_consumed_w: w_branch_consumed,
    w_dot_net_margin_w: w_branch_generated > 0 ? w_branch_generated - w_branch_consumed : null,
  };

  const packaging: PackagingOutputs = {
    mass_estimate_total_kg: mass_total_kg ?? null,
    mass_estimate_radiator_kg: mass_radiator_kg,
    mass_estimate_storage_kg: mass_storage_kg,
    packaging_notes: input.packaging_notes ?? '',
  };

  const flagSummary = emitFlags(allFlags);
  return emitStructuredResult(
    input.scenario_id, input.load_state,
    thermal, electrical, packaging,
    allFlags, flagSummary, allAssumptions, allNotes
  );
}

// ─── Empty output helpers for early-exit paths ───────────────────────────────

function emptyThermal(t_rad_k: number): ThermalOutputs {
  return {
    q_dot_internal_w: 0, q_dot_external_w: 0, q_dot_total_reject_w: 0,
    t_zone_a_k: null, t_zone_b_k: null, t_zone_c_k: null, t_zone_d_k: null,
    t_radiator_target_k: t_rad_k, a_radiator_effective_m2: 0,
    a_radiator_with_margin_m2: 0, storage_energy_usable_j: 0, stage_losses_w: 0,
  };
}

function emptyElectrical(): ElectricalOutputs {
  return {
    w_dot_compute_w: 0, w_dot_non_compute_w: 0, w_dot_parasitic_w: 0,
    w_dot_branch_generated_w: 0, w_dot_branch_consumed_w: 0, w_dot_net_margin_w: null,
  };
}

function emptyPackaging(notes: string): PackagingOutputs {
  return {
    mass_estimate_total_kg: null, mass_estimate_radiator_kg: null,
    mass_estimate_storage_kg: null, packaging_notes: notes,
  };
}
