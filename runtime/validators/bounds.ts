/**
 * bounds.ts
 * Physical bounds validation for all schema domain types.
 * Governed by §26.3, §16.2, §19.3, §21.3, §22.3, §23.3.
 */

import { Flag, makeFlagError } from '../emitters/flag-emitter';

export interface BoundsViolation {
  field: string;
  message: string;
  value: number;
  bound?: number;
}

// ─── Compute device bounds §16.2 ─────────────────────────────────────────────

export function validateComputeDeviceBounds(device: {
  nominal_tdp_w: number;
  peak_tdp_w: number;
  allowable_junction_temp_k: number;
  allowable_package_temp_k: number;
  allowable_coldplate_temp_max_k: number;
  power_idle_w: number;
  power_light_w: number;
  power_medium_w: number;
  power_full_w: number;
}): BoundsViolation[] {
  const violations: BoundsViolation[] = [];

  if (device.peak_tdp_w < device.nominal_tdp_w) {
    violations.push({
      field: 'peak_tdp_w',
      message: 'peak_tdp_w must be >= nominal_tdp_w',
      value: device.peak_tdp_w,
      bound: device.nominal_tdp_w,
    });
  }
  if (device.allowable_junction_temp_k <= device.allowable_package_temp_k) {
    violations.push({
      field: 'allowable_junction_temp_k',
      message: 'allowable_junction_temp_k must be > allowable_package_temp_k',
      value: device.allowable_junction_temp_k,
      bound: device.allowable_package_temp_k,
    });
  }
  if (device.allowable_coldplate_temp_max_k > device.allowable_package_temp_k) {
    violations.push({
      field: 'allowable_coldplate_temp_max_k',
      message: 'allowable_coldplate_temp_max_k must be <= allowable_package_temp_k',
      value: device.allowable_coldplate_temp_max_k,
      bound: device.allowable_package_temp_k,
    });
  }
  // Monotonically non-decreasing load states §16.2
  const powers = [
    device.power_idle_w,
    device.power_light_w,
    device.power_medium_w,
    device.power_full_w,
  ];
  const names = ['power_idle_w', 'power_light_w', 'power_medium_w', 'power_full_w'];
  for (let i = 1; i < powers.length; i++) {
    if (powers[i] < powers[i - 1]) {
      violations.push({
        field: names[i],
        message: `Load states must be monotonically non-decreasing. ${names[i]} < ${names[i - 1]}`,
        value: powers[i],
        bound: powers[i - 1],
      });
    }
  }

  return violations;
}

// ─── Thermal zone bounds §19.3 ───────────────────────────────────────────────

export function validateThermalZoneBounds(zone: {
  zone_id: string;
  target_temp_k: number;
  temp_min_k: number;
  temp_max_k: number;
  pressure_min_pa?: number;
  pressure_max_pa?: number;
}): BoundsViolation[] {
  const violations: BoundsViolation[] = [];

  if (zone.temp_min_k > zone.target_temp_k) {
    violations.push({
      field: 'temp_min_k',
      message: `temp_min_k (${zone.temp_min_k}) must be <= target_temp_k (${zone.target_temp_k})`,
      value: zone.temp_min_k,
      bound: zone.target_temp_k,
    });
  }
  if (zone.target_temp_k > zone.temp_max_k) {
    violations.push({
      field: 'target_temp_k',
      message: `target_temp_k (${zone.target_temp_k}) must be <= temp_max_k (${zone.temp_max_k})`,
      value: zone.target_temp_k,
      bound: zone.temp_max_k,
    });
  }
  if (
    zone.pressure_min_pa !== undefined &&
    zone.pressure_max_pa !== undefined &&
    zone.pressure_min_pa > zone.pressure_max_pa
  ) {
    violations.push({
      field: 'pressure_min_pa',
      message: 'pressure_min_pa must be <= pressure_max_pa',
      value: zone.pressure_min_pa,
      bound: zone.pressure_max_pa,
    });
  }

  return violations;
}

// ─── Storage bounds §21.3 ────────────────────────────────────────────────────

export function validateStorageBounds(storage: {
  mass_kg: number;
  temp_min_k: number;
  temp_max_k: number;
  latent_utilization_fraction: number;
}): BoundsViolation[] {
  const violations: BoundsViolation[] = [];

  if (storage.mass_kg < 0) {
    violations.push({ field: 'mass_kg', message: 'mass_kg must be >= 0', value: storage.mass_kg });
  }
  if (storage.temp_min_k >= storage.temp_max_k) {
    violations.push({
      field: 'temp_min_k',
      message: 'temp_min_k must be < temp_max_k',
      value: storage.temp_min_k,
      bound: storage.temp_max_k,
    });
  }
  if (storage.latent_utilization_fraction < 0 || storage.latent_utilization_fraction > 1) {
    violations.push({
      field: 'latent_utilization_fraction',
      message: 'latent_utilization_fraction must be in [0, 1]',
      value: storage.latent_utilization_fraction,
    });
  }

  return violations;
}

// ─── Radiator bounds §22.3 ───────────────────────────────────────────────────

export function validateRadiatorBounds(radiator: {
  emissivity: number;
  target_surface_temp_k: number;
  reserve_margin_fraction: number;
}): BoundsViolation[] {
  const violations: BoundsViolation[] = [];

  if (radiator.emissivity <= 0 || radiator.emissivity > 1) {
    violations.push({
      field: 'emissivity',
      message: 'emissivity must be in (0, 1]',
      value: radiator.emissivity,
    });
  }
  if (radiator.target_surface_temp_k <= 0) {
    violations.push({
      field: 'target_surface_temp_k',
      message: 'target_surface_temp_k must be > 0 K',
      value: radiator.target_surface_temp_k,
    });
  }
  if (radiator.reserve_margin_fraction < 0) {
    violations.push({
      field: 'reserve_margin_fraction',
      message: 'reserve_margin_fraction must be >= 0',
      value: radiator.reserve_margin_fraction,
    });
  }

  return violations;
}

// ─── Thermal stage bounds §23.3 ──────────────────────────────────────────────

export function validateThermalStageBounds(stage: {
  stage_id: string;
  stage_type: string;
  work_input_w: number;
  loss_w: number;
  input_temp_k: number;
  output_temp_k: number;
  cop_actual?: number;
  efficiency?: number;
  effectiveness?: number;
}): BoundsViolation[] {
  const violations: BoundsViolation[] = [];

  if (stage.loss_w < 0) {
    violations.push({ field: 'loss_w', message: 'loss_w must be >= 0', value: stage.loss_w });
  }
  if (stage.stage_type === 'lift' && stage.work_input_w < 0) {
    violations.push({
      field: 'work_input_w',
      message: 'lift stage must have work_input_w >= 0',
      value: stage.work_input_w,
    });
  }
  if (stage.cop_actual !== undefined && stage.cop_actual < 0) {
    violations.push({ field: 'cop_actual', message: 'cop_actual must be >= 0', value: stage.cop_actual });
  }
  if (stage.efficiency !== undefined && (stage.efficiency < 0 || stage.efficiency > 1)) {
    violations.push({ field: 'efficiency', message: 'efficiency must be in [0, 1]', value: stage.efficiency });
  }
  if (stage.effectiveness !== undefined && (stage.effectiveness < 0 || stage.effectiveness > 1)) {
    violations.push({ field: 'effectiveness', message: 'effectiveness must be in [0, 1]', value: stage.effectiveness });
  }

  return violations;
}

/**
 * Convert BoundsViolations to Flags for the flag emitter.
 */
export function boundsViolationsToFlags(
  violations: BoundsViolation[],
  subsystem: string
): Flag[] {
  return violations.map((v, i) =>
    makeFlagError(
      `bounds_violation_${subsystem}_${i}`,
      v.message,
      subsystem,
      v.field,
      v.value,
      v.bound
    )
  );
}
