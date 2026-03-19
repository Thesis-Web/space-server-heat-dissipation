/**
 * storage.ts
 * Thermal energy storage formulas.
 * Governing equations: §12.5, §21.2.
 */

export interface StorageEnergyInput {
  /** Storage mass (kg). */
  mass_kg: number;
  /** Specific heat capacity (J/kg·K). */
  cp_j_per_kgk: number;
  /** Sensible temperature swing lower bound (K). */
  temp_min_k: number;
  /** Sensible temperature swing upper bound (K). */
  temp_max_k: number;
  /** Latent heat (J/kg). 0 if no latent component. */
  latent_heat_j_per_kg: number;
  /** Latent utilization fraction [0, 1]. §12.5 */
  latent_utilization_fraction: number;
}

export interface StorageEnergyResult {
  /** E_storage_usable (J). §12.5 / §21.2 */
  e_storage_usable_j: number;
  /** Sensible component only (J). */
  e_sensible_j: number;
  /** Latent component only (J). */
  e_latent_j: number;
  mass_kg: number;
  delta_t_k: number;
}

/**
 * E_storage_usable = m * cp * ΔT + m * L * phi_latent  §12.5
 */
export function computeStorageEnergy(input: StorageEnergyInput): StorageEnergyResult {
  if (input.mass_kg < 0) {
    throw new RangeError(`mass_kg must be >= 0. Got ${input.mass_kg}`);
  }
  if (input.cp_j_per_kgk <= 0) {
    throw new RangeError(`cp_j_per_kgk must be > 0. Got ${input.cp_j_per_kgk}`);
  }
  if (input.temp_min_k >= input.temp_max_k) {
    throw new RangeError(
      `temp_min_k (${input.temp_min_k}) must be < temp_max_k (${input.temp_max_k})`
    );
  }
  if (input.latent_heat_j_per_kg < 0) {
    throw new RangeError(`latent_heat_j_per_kg must be >= 0. Got ${input.latent_heat_j_per_kg}`);
  }
  if (input.latent_utilization_fraction < 0 || input.latent_utilization_fraction > 1) {
    throw new RangeError(
      `latent_utilization_fraction must be in [0, 1]. Got ${input.latent_utilization_fraction}`
    );
  }

  const delta_t = input.temp_max_k - input.temp_min_k;
  const e_sensible = input.mass_kg * input.cp_j_per_kgk * delta_t;
  const e_latent = input.mass_kg * input.latent_heat_j_per_kg * input.latent_utilization_fraction;
  const e_storage_usable_j = e_sensible + e_latent;

  return {
    e_storage_usable_j,
    e_sensible_j: e_sensible,
    e_latent_j: e_latent,
    mass_kg: input.mass_kg,
    delta_t_k: delta_t,
  };
}

/**
 * Required mass to store a given energy quantity.
 * Inverse of §12.5 — sensible-only case.
 */
export function computeRequiredStorageMass(
  e_required_j: number,
  cp_j_per_kgk: number,
  delta_t_k: number,
  latent_heat_j_per_kg = 0,
  latent_utilization_fraction = 0
): number {
  if (delta_t_k <= 0) {
    throw new RangeError(`delta_t_k must be > 0. Got ${delta_t_k}`);
  }
  if (e_required_j < 0) {
    throw new RangeError(`e_required_j must be >= 0. Got ${e_required_j}`);
  }
  const energy_per_kg = cp_j_per_kgk * delta_t_k + latent_heat_j_per_kg * latent_utilization_fraction;
  if (energy_per_kg <= 0) {
    throw new RangeError('energy_per_kg must be > 0 to compute mass');
  }
  return e_required_j / energy_per_kg;
}
