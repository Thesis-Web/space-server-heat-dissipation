/**
 * extension-3a-bounds.ts
 * Extension 3A numeric bounds and semantic validation.
 * Governing law: 3A-spec §13.2–§13.5.
 * Follows extension-2-bounds.ts naming pattern.
 *
 * Covers:
 *  §13.2 — catalog bounds (numeric fields in catalog entries)
 *  §13.3 — radiator validation (emissivity, view factors, T_sink, geometry)
 *  §13.4 — convergence validation (iteration params, tolerances, runaway)
 *  §13.5 — resistance validation (non-negative terms, pickup ref resolution)
 */

import {
  CONVERGENCE_RUNAWAY_MULTIPLIER_MIN,
} from '../constants/constants';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface BoundsViolation {
  rule: string;
  severity: 'error' | 'warning';
  field: string;
  value?: unknown;
  message: string;
}

export interface Extension3ABoundsReport {
  valid: boolean;
  violations: BoundsViolation[];
  warnings: BoundsViolation[];
}

// ── §13.2 Catalog numeric bounds ──────────────────────────────────────────────

/**
 * Validate pickup-geometry catalog entry numeric bounds.
 * §8.3, §13.2.
 */
export function validatePickupGeometryBounds(
  entry: { pickup_geometry_id: string; nominal_contact_area_fraction: number; nominal_spreading_factor: number; nominal_resistance_multiplier: number }
): BoundsViolation[] {
  const v: BoundsViolation[] = [];
  const id = entry.pickup_geometry_id;

  if (entry.nominal_contact_area_fraction <= 0 || entry.nominal_contact_area_fraction > 1) {
    v.push({ rule: '3A-spec §8.3', severity: 'error', field: `pickup[${id}].nominal_contact_area_fraction`, value: entry.nominal_contact_area_fraction,
      message: `nominal_contact_area_fraction must be in (0,1]. Got ${entry.nominal_contact_area_fraction}. §8.3` });
  }
  if (entry.nominal_spreading_factor < 1) {
    v.push({ rule: '3A-spec §8.3', severity: 'error', field: `pickup[${id}].nominal_spreading_factor`, value: entry.nominal_spreading_factor,
      message: `nominal_spreading_factor must be >= 1. Got ${entry.nominal_spreading_factor}. §8.3` });
  }
  if (entry.nominal_resistance_multiplier <= 0) {
    v.push({ rule: '3A-spec §8.3', severity: 'error', field: `pickup[${id}].nominal_resistance_multiplier`, value: entry.nominal_resistance_multiplier,
      message: `nominal_resistance_multiplier must be > 0. Got ${entry.nominal_resistance_multiplier}. §8.3` });
  }
  return v;
}

// ── §13.3 Radiator validation ─────────────────────────────────────────────────

/**
 * Validate all 3A radiator fields.
 * §9.3, §13.3.
 */
export function validateRadiator3ABounds(
  rad: {
    radiator_id: string;
    geometry_mode?: string | null;
    face_a_view_factor?: number | null;
    face_b_view_factor?: number | null;
    surface_emissivity_bol?: number | null;
    surface_emissivity_eol_override?: number | null;
    emissivity_degradation_fraction?: number | null;
    cavity_emissivity_mode?: string | null;
    cavity_view_factor?: number | null;
    cavity_surface_emissivity?: number | null;
    background_sink_temp_k_override?: number | null;
  },
  tSinkResolvable: boolean
): BoundsViolation[] {
  const v: BoundsViolation[] = [];
  const id = rad.radiator_id;

  // surface_emissivity_bol — required, no silent default
  if (rad.surface_emissivity_bol === null || rad.surface_emissivity_bol === undefined) {
    v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].surface_emissivity_bol`,
      message: `surface_emissivity_bol is missing. No silent default. §9.1, §12.2, §13.3` });
  } else if (rad.surface_emissivity_bol <= 0 || rad.surface_emissivity_bol > 1) {
    v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].surface_emissivity_bol`, value: rad.surface_emissivity_bol,
      message: `surface_emissivity_bol must be in (0,1]. Got ${rad.surface_emissivity_bol}. §9.3` });
  }

  // eol_override bounds if present
  if (rad.surface_emissivity_eol_override !== null && rad.surface_emissivity_eol_override !== undefined) {
    if (rad.surface_emissivity_eol_override <= 0 || rad.surface_emissivity_eol_override > 1) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].surface_emissivity_eol_override`, value: rad.surface_emissivity_eol_override,
        message: `surface_emissivity_eol_override must be in (0,1]. Got ${rad.surface_emissivity_eol_override}. §9.3` });
    }
  }

  // degradation fraction bounds if present
  if (rad.emissivity_degradation_fraction !== null && rad.emissivity_degradation_fraction !== undefined) {
    if (rad.emissivity_degradation_fraction < 0 || rad.emissivity_degradation_fraction > 1) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].emissivity_degradation_fraction`, value: rad.emissivity_degradation_fraction,
        message: `emissivity_degradation_fraction must be in [0,1]. Got ${rad.emissivity_degradation_fraction}. §9.3` });
    }
  }

  // face_a_view_factor
  if (rad.face_a_view_factor !== null && rad.face_a_view_factor !== undefined) {
    if (rad.face_a_view_factor <= 0 || rad.face_a_view_factor > 1) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].face_a_view_factor`, value: rad.face_a_view_factor,
        message: `face_a_view_factor must be in (0,1]. Got ${rad.face_a_view_factor}. §9.3` });
    }
  }

  // face_b_view_factor
  if (rad.face_b_view_factor !== null && rad.face_b_view_factor !== undefined) {
    if (rad.face_b_view_factor < 0 || rad.face_b_view_factor > 1) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].face_b_view_factor`, value: rad.face_b_view_factor,
        message: `face_b_view_factor must be in [0,1]. Got ${rad.face_b_view_factor}. §9.3` });
    }
  }

  // double_sided modes require face B inputs
  const gMode = rad.geometry_mode ?? 'single_sided';
  if (gMode === 'double_sided_symmetric' || gMode === 'double_sided_asymmetric') {
    if (!rad.face_b_view_factor && rad.face_b_view_factor !== 0) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].face_b_view_factor`,
        message: `geometry_mode=${gMode} requires face_b_view_factor to be declared. §13.3` });
    }
  }

  // gray_cavity_approx requires cavity inputs
  if (rad.cavity_emissivity_mode === 'gray_cavity_approx') {
    if (!rad.cavity_view_factor) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].cavity_view_factor`,
        message: `cavity_emissivity_mode=gray_cavity_approx requires cavity_view_factor. §9.3, §13.3` });
    } else if (rad.cavity_view_factor <= 0 || rad.cavity_view_factor > 1) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].cavity_view_factor`, value: rad.cavity_view_factor,
        message: `cavity_view_factor must be in (0,1]. Got ${rad.cavity_view_factor}. §9.3` });
    }
    if (!rad.cavity_surface_emissivity) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].cavity_surface_emissivity`,
        message: `cavity_emissivity_mode=gray_cavity_approx requires cavity_surface_emissivity. §9.3, §13.3` });
    } else if (rad.cavity_surface_emissivity <= 0 || rad.cavity_surface_emissivity > 1) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].cavity_surface_emissivity`, value: rad.cavity_surface_emissivity,
        message: `cavity_surface_emissivity must be in (0,1]. Got ${rad.cavity_surface_emissivity}. §9.3` });
    }
  }

  // background_sink_temp_k_override positive if present
  if (rad.background_sink_temp_k_override !== null && rad.background_sink_temp_k_override !== undefined) {
    if (rad.background_sink_temp_k_override <= 0) {
      v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].background_sink_temp_k_override`, value: rad.background_sink_temp_k_override,
        message: `background_sink_temp_k_override must be > 0 K. Got ${rad.background_sink_temp_k_override}. §9.3` });
    }
  }

  // T_sink must be resolvable
  if (!tSinkResolvable) {
    v.push({ rule: '3A-spec §13.3', severity: 'error', field: `radiator[${id}].t_sink`,
      message: `No T_sink source resolvable for radiator '${id}'. Provide background_sink_temp_k_override or environment_profile.sink_temperature_k. §9.4, §13.3` });
  }

  return v;
}

// ── §13.4 Convergence validation ──────────────────────────────────────────────

/**
 * Validate convergence_control object bounds.
 * §5.4, §13.4.
 */
export function validateConvergenceControl(
  cc: {
    max_iterations: number;
    tolerance_abs_w: number;
    tolerance_rel_fraction: number;
    runaway_multiplier: number;
    blocking_on_nonconvergence: boolean;
  }
): BoundsViolation[] {
  const v: BoundsViolation[] = [];

  if (cc.max_iterations < 1) {
    v.push({ rule: '3A-spec §13.4', severity: 'error', field: 'convergence_control.max_iterations', value: cc.max_iterations,
      message: `max_iterations must be >= 1. Got ${cc.max_iterations}. §5.4, §13.4` });
  }
  if (cc.tolerance_abs_w <= 0) {
    v.push({ rule: '3A-spec §13.4', severity: 'error', field: 'convergence_control.tolerance_abs_w', value: cc.tolerance_abs_w,
      message: `tolerance_abs_w must be > 0. Got ${cc.tolerance_abs_w}. §5.4, §13.4` });
  }
  if (cc.tolerance_rel_fraction <= 0 || cc.tolerance_rel_fraction > 1) {
    v.push({ rule: '3A-spec §13.4', severity: 'error', field: 'convergence_control.tolerance_rel_fraction', value: cc.tolerance_rel_fraction,
      message: `tolerance_rel_fraction must be in (0,1]. Got ${cc.tolerance_rel_fraction}. §5.4, §13.4` });
  }
  if (cc.runaway_multiplier < CONVERGENCE_RUNAWAY_MULTIPLIER_MIN) {
    v.push({ rule: '3A-spec §13.4', severity: 'error', field: 'convergence_control.runaway_multiplier', value: cc.runaway_multiplier,
      message: `runaway_multiplier must be >= ${CONVERGENCE_RUNAWAY_MULTIPLIER_MIN}. Got ${cc.runaway_multiplier}. §5.4, §13.4` });
  }
  return v;
}

// ── §13.5 Resistance validation ────────────────────────────────────────────────

/**
 * Validate a zone's resistance_chain sub-object.
 * §6.5, §13.5.
 */
export function validateResistanceChain(
  zone: {
    zone_id: string;
    resistance_chain?: Record<string, number | null> | null;
    pickup_geometry_ref?: string | null;
  },
  pickupGeometryResolved: boolean
): BoundsViolation[] {
  const v: BoundsViolation[] = [];
  const w: BoundsViolation[] = [];
  const id = zone.zone_id;
  const chain = zone.resistance_chain;

  if (!chain) {
    // null resistance_chain is allowed — warn if zone has a load (caller adds load info)
    return [];
  }

  const fields = [
    'r_junction_to_case_k_per_w',
    'r_case_to_spreader_k_per_w',
    'r_spreader_to_pickup_nominal_k_per_w',
    'r_pickup_to_loop_k_per_w',
    'r_loop_to_sink_k_per_w',
  ];

  let allNull = true;
  for (const field of fields) {
    const val = chain[field];
    if (val !== null && val !== undefined) {
      allNull = false;
      if (val < 0) {
        v.push({ rule: '3A-spec §13.5', severity: 'error', field: `thermal_zones[${id}].resistance_chain.${field}`, value: val,
          message: `Resistance term ${field} must be >= 0. Got ${val}. §13.5` });
      }
    }
  }

  // r_spreader_to_pickup_nominal declared but pickup geometry ref does not resolve
  const spreaderVal = chain['r_spreader_to_pickup_nominal_k_per_w'];
  if (spreaderVal !== null && spreaderVal !== undefined && zone.pickup_geometry_ref && !pickupGeometryResolved) {
    v.push({ rule: '3A-spec §13.5', severity: 'error', field: `thermal_zones[${id}].resistance_chain.r_spreader_to_pickup_nominal_k_per_w`,
      message: `r_spreader_to_pickup_nominal declared but pickup_geometry_ref '${zone.pickup_geometry_ref}' does not resolve. §13.5` });
  }

  // Warning: all terms null with declared load
  if (allNull) {
    w.push({ rule: '3A-spec §13.5', severity: 'warning', field: `thermal_zones[${id}].resistance_chain`,
      message: `Zone '${id}' has resistance_chain object but all terms are null. Zero total resistance with non-zero load implies infinite heat flow. §13.5` });
  }

  return [...v, ...w];
}

// ── Aggregate bounds check ────────────────────────────────────────────────────

/**
 * Run all 3A bounds checks and return a unified report.
 */
export function validateExtension3ABounds(params: {
  convergence_control?: Parameters<typeof validateConvergenceControl>[0] | null;
  radiators?: Array<Parameters<typeof validateRadiator3ABounds>[0] & { tSinkResolvable: boolean }>;
  zones?: Array<Parameters<typeof validateResistanceChain>[0] & { pickupGeometryResolved: boolean }>;
  pickupGeometryEntries?: Array<Parameters<typeof validatePickupGeometryBounds>[0]>;
}): Extension3ABoundsReport {
  const allViolations: BoundsViolation[] = [];

  if (params.convergence_control) {
    allViolations.push(...validateConvergenceControl(params.convergence_control));
  }

  for (const rad of params.radiators ?? []) {
    const { tSinkResolvable, ...radFields } = rad;
    allViolations.push(...validateRadiator3ABounds(radFields, tSinkResolvable));
  }

  for (const zone of params.zones ?? []) {
    const { pickupGeometryResolved, ...zoneFields } = zone;
    allViolations.push(...validateResistanceChain(zoneFields, pickupGeometryResolved));
  }

  for (const pg of params.pickupGeometryEntries ?? []) {
    allViolations.push(...validatePickupGeometryBounds(pg));
  }

  const violations = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');

  return {
    valid: violations.length === 0,
    violations,
    warnings,
  };
}
