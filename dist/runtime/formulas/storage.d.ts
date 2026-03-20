/**
 * Thermal storage formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */
/**
 * Sensible heat capacity of a solid/liquid storage mass.
 * Q = m × cp × ΔT
 */
export declare function sensibleCapacity(mass_kg: number, cp_j_per_kg_k: number, delta_t_k: number): number;
/**
 * Latent heat capacity for a PCM storage mass.
 * Q = m × h_fusion
 */
export declare function latentCapacity(mass_kg: number, h_fusion_j_per_kg: number): number;
/**
 * Discharge duration given stored energy and discharge rate.
 * t = Q_stored / P_discharge
 */
export declare function dischargeDuration(q_stored_j: number, p_discharge_w: number): number;
/**
 * Charge duration given capacity and charge rate.
 * t = Q_capacity / P_charge
 */
export declare function chargeDuration(q_capacity_j: number, p_charge_w: number): number;
/**
 * Required storage mass for a latent storage target.
 * m = Q_required / h_fusion
 */
export declare function requiredPcmMass(q_required_j: number, h_fusion_j_per_kg: number): number;
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
export declare function computeStorageEnergy(input: StorageEnergyInput): StorageEnergyResult;
//# sourceMappingURL=storage.d.ts.map