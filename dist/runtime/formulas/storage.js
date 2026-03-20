"use strict";
/**
 * Thermal storage formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sensibleCapacity = sensibleCapacity;
exports.latentCapacity = latentCapacity;
exports.dischargeDuration = dischargeDuration;
exports.chargeDuration = chargeDuration;
exports.requiredPcmMass = requiredPcmMass;
exports.computeStorageEnergy = computeStorageEnergy;
/**
 * Sensible heat capacity of a solid/liquid storage mass.
 * Q = m × cp × ΔT
 */
function sensibleCapacity(mass_kg, cp_j_per_kg_k, delta_t_k) {
    return mass_kg * cp_j_per_kg_k * delta_t_k;
}
/**
 * Latent heat capacity for a PCM storage mass.
 * Q = m × h_fusion
 */
function latentCapacity(mass_kg, h_fusion_j_per_kg) {
    return mass_kg * h_fusion_j_per_kg;
}
/**
 * Discharge duration given stored energy and discharge rate.
 * t = Q_stored / P_discharge
 */
function dischargeDuration(q_stored_j, p_discharge_w) {
    if (p_discharge_w <= 0)
        throw new Error("Discharge power must be > 0");
    return q_stored_j / p_discharge_w;
}
/**
 * Charge duration given capacity and charge rate.
 * t = Q_capacity / P_charge
 */
function chargeDuration(q_capacity_j, p_charge_w) {
    if (p_charge_w <= 0)
        throw new Error("Charge power must be > 0");
    return q_capacity_j / p_charge_w;
}
/**
 * Required storage mass for a latent storage target.
 * m = Q_required / h_fusion
 */
function requiredPcmMass(q_required_j, h_fusion_j_per_kg) {
    if (h_fusion_j_per_kg <= 0)
        throw new Error("h_fusion must be > 0");
    return q_required_j / h_fusion_j_per_kg;
}
/**
 * Total usable storage energy per spec §21.2.
 * E_storage_usable = m*cp*(T_max-T_min) + m*h_fusion*latent_utilization_fraction
 * FIX-003: composite function required by ANCHOR runner.
 */
function computeStorageEnergy(input) {
    const delta_t = input.temp_max_k - input.temp_min_k;
    if (delta_t < 0)
        throw new RangeError(`temp_max_k must be >= temp_min_k`);
    const e_sensible = sensibleCapacity(input.mass_kg, input.cp_j_per_kgk, delta_t);
    const e_latent = input.mass_kg * input.latent_heat_j_per_kg * input.latent_utilization_fraction;
    return {
        e_storage_usable_j: e_sensible + e_latent,
        e_sensible_j: e_sensible,
        e_latent_j: e_latent,
    };
}
//# sourceMappingURL=storage.js.map