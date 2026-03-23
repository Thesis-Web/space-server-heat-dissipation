/**
 * extension-3b-bounds.ts
 * Extension 3B — Bounds and Blocking Validation
 * Spec: 3B-spec §13, §13.1–§13.5
 * Blueprint: 3B-blueprint §13
 *
 * Additive validator. Does not mutate baseline or 3A validator behavior.
 */

import type { Normalized3BInputs } from '../transforms/extension-3b-normalizer';

export interface Extension3BBoundsResult {
  passed: boolean;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

/**
 * validateExtension3BBounds
 * Runs all spec §13 blocking rules against normalized 3B inputs.
 */
export function validateExtension3BBounds(norm: Normalized3BInputs): Extension3BBoundsResult {
  const blocking_errors: string[] = [...norm.blocking_errors];
  const warnings: string[] = [...norm.warnings];
  const trace: string[] = ['extension-3b-bounds: begin validation'];

  if (norm.disabled) {
    trace.push('3B disabled: bounds check skipped');
    return { passed: true, blocking_errors: [], warnings: [], trace };
  }

  // Spec §13.1: scenario-level blocking rules
  if (norm.enabled && norm.mode === 'disabled') {
    blocking_errors.push('BOUNDS-3B-001: enable_model_extension_3b=true requires model_extension_3b_mode != disabled');
  }

  const requiresEclipseSemantics =
    norm.mode === 'subsystem_depth_with_eclipse' || norm.mode === 'full_3b';

  if (requiresEclipseSemantics && (!norm.operating_state_declared || norm.operating_state == null)) {
    blocking_errors.push(
      `BOUNDS-3B-002: mode=${norm.mode} requires explicitly declared operating_state but none was provided`
    );
  }

  if (norm.operating_state?.storage_support_enabled && !norm.operating_state.storage_ref) {
    blocking_errors.push(
      'BOUNDS-3B-003: operating_state.storage_support_enabled=true requires resolvable storage_ref'
    );
  }

  // Spec §13.5: eclipse-state blocking
  if (norm.operating_state?.current_state === 'eclipse') {
    const derate = norm.operating_state.compute_derate_fraction;
    if (derate < 0 || derate > 1) {
      blocking_errors.push(
        `BOUNDS-3B-004: eclipse active, compute_derate_fraction=${derate} outside [0,1]`
      );
    }
    if (norm.operating_state.storage_support_enabled && !norm.operating_state.storage_ref) {
      blocking_errors.push(
        'BOUNDS-3B-005: eclipse active with storage_support_enabled=true but storage_ref unresolved'
      );
    }
  }

  // Per-zone validation
  for (const zone of norm.normalized_zones) {
    const zid = zone.zone_id;
    const vgem = zone.vault_gas_environment_model;
    const ti = zone.transport_implementation;

    // Spec §13.2: vault-gas blocking rules
    if (vgem.mode !== 'none' && vgem.convection_assumption_mode !== 'disabled') {
      if (vgem.effective_h_internal_w_per_m2_k == null || vgem.effective_h_internal_w_per_m2_k <= 0) {
        blocking_errors.push(
          `BOUNDS-3B-010: zone=${zid} convection enabled but effective_h_internal_w_per_m2_k missing or <= 0`
        );
      }
      if (vgem.exchange_area_m2 == null || vgem.exchange_area_m2 <= 0) {
        blocking_errors.push(
          `BOUNDS-3B-011: zone=${zid} convection enabled but exchange_area_m2 missing or <= 0`
        );
      }
    }

    if (vgem.pressure_pa != null && vgem.pressure_pa < 0) {
      blocking_errors.push(
        `BOUNDS-3B-012: zone=${zid} pressure_pa=${vgem.pressure_pa} < 0`
      );
    }

    if (vgem.gas_presence_mode !== 'none' && vgem.gas_species_ref == null) {
      warnings.push(
        `BOUNDS-3B-W001: zone=${zid} gas_presence_mode=${vgem.gas_presence_mode} but gas_species_ref is null`
      );
    }

    // Spec §13.3: transport blocking rules
    if (ti.mode !== 'none') {
      if (ti.pump_model_mode === 'direct_power' && (ti.pump_power_input_w == null || ti.pump_power_input_w < 0)) {
        blocking_errors.push(
          `BOUNDS-3B-020: zone=${zid} pump_model_mode=direct_power but pump_power_input_w missing or negative`
        );
      }

      if (ti.pump_model_mode === 'pressure_drop_flow') {
        if (ti.pressure_drop_pa == null) {
          blocking_errors.push(`BOUNDS-3B-021: zone=${zid} pressure_drop_flow missing pressure_drop_pa`);
        }
        if (ti.mass_flow_kg_per_s == null) {
          blocking_errors.push(`BOUNDS-3B-022: zone=${zid} pressure_drop_flow missing mass_flow_kg_per_s`);
        }
        if (ti.pump_efficiency_fraction == null || ti.pump_efficiency_fraction <= 0) {
          blocking_errors.push(`BOUNDS-3B-023: zone=${zid} pressure_drop_flow missing or invalid pump_efficiency_fraction`);
        }
      }

      if (ti.gas_management_mode === 'single_phase_intended' &&
          ti.declared_void_fraction != null && ti.allowable_void_fraction != null &&
          ti.declared_void_fraction > ti.allowable_void_fraction) {
        blocking_errors.push(
          `BOUNDS-3B-024: zone=${zid} declared_void_fraction (${ti.declared_void_fraction}) > allowable_void_fraction (${ti.allowable_void_fraction}) in single_phase_intended mode`
        );
      }

      for (const [field, val] of [
        ['bubble_blanketing_penalty_fraction', ti.bubble_blanketing_penalty_fraction],
        ['gas_lock_flow_derate_fraction', ti.gas_lock_flow_derate_fraction],
        ['allowable_void_fraction', ti.allowable_void_fraction],
        ['declared_void_fraction', ti.declared_void_fraction]
      ] as const) {
        if (val != null && (val < 0 || val > 1)) {
          blocking_errors.push(
            `BOUNDS-3B-025: zone=${zid} ${field}=${val} outside [0,1]`
          );
        }
      }
    }

    trace.push(`zone ${zid} bounds checked`);
  }

  trace.push(`bounds validation complete: ${blocking_errors.length} blocking errors, ${warnings.length} warnings`);
  return {
    passed: blocking_errors.length === 0,
    blocking_errors,
    warnings,
    trace
  };
}
