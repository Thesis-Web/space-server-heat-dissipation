/**
 * Thermal storage formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */

/**
 * Sensible heat capacity of a solid/liquid storage mass.
 * Q = m × cp × ΔT
 */
export function sensibleCapacity(mass_kg: number, cp_j_per_kg_k: number, delta_t_k: number): number {
  return mass_kg * cp_j_per_kg_k * delta_t_k;
}

/**
 * Latent heat capacity for a PCM storage mass.
 * Q = m × h_fusion
 */
export function latentCapacity(mass_kg: number, h_fusion_j_per_kg: number): number {
  return mass_kg * h_fusion_j_per_kg;
}

/**
 * Discharge duration given stored energy and discharge rate.
 * t = Q_stored / P_discharge
 */
export function dischargeDuration(q_stored_j: number, p_discharge_w: number): number {
  if (p_discharge_w <= 0) throw new Error("Discharge power must be > 0");
  return q_stored_j / p_discharge_w;
}

/**
 * Charge duration given capacity and charge rate.
 * t = Q_capacity / P_charge
 */
export function chargeDuration(q_capacity_j: number, p_charge_w: number): number {
  if (p_charge_w <= 0) throw new Error("Charge power must be > 0");
  return q_capacity_j / p_charge_w;
}

/**
 * Required storage mass for a latent storage target.
 * m = Q_required / h_fusion
 */
export function requiredPcmMass(q_required_j: number, h_fusion_j_per_kg: number): number {
  if (h_fusion_j_per_kg <= 0) throw new Error("h_fusion must be > 0");
  return q_required_j / h_fusion_j_per_kg;
}

// ─── FIX-003: computeStorageEnergy composite function ─────────────────────────
// run-scenario.ts (ANCHOR runner) expects computeStorageEnergy combining
// sensible and latent capacity per spec §21.2.
// Formula: E_usable = m*cp*(T_max-T_min) + m*h_fusion*latent_fraction
// FIX-003: required by run-scenario.ts.

export interface StorageEnergyInput {
  mass_kg: number;
  cp_j_per_kgk: number;
  temp_min_k: number;
  temp_max_k: number;
  latent_heat_j_per_kg: number;
  latent_utilization_fraction: number;
}

export interface StorageEnergyResult {
  e_storage_usable_j: number;
  e_sensible_j: number;
  e_latent_j: number;
}

/**
 * Total usable storage energy per spec §21.2.
 * E_storage_usable = m*cp*(T_max-T_min) + m*h_fusion*latent_utilization_fraction
 * FIX-003: composite function required by ANCHOR runner.
 */
export function computeStorageEnergy(input: StorageEnergyInput): StorageEnergyResult {
  const delta_t = input.temp_max_k - input.temp_min_k;
  if (delta_t < 0) throw new RangeError(`temp_max_k must be >= temp_min_k`);
  const e_sensible = sensibleCapacity(input.mass_kg, input.cp_j_per_kgk, delta_t);
  const e_latent = input.mass_kg * input.latent_heat_j_per_kg * input.latent_utilization_fraction;
  return {
    e_storage_usable_j: e_sensible + e_latent,
    e_sensible_j: e_sensible,
    e_latent_j: e_latent,
  };
}
