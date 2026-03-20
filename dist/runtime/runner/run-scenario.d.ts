/**
 * run-scenario.ts
 * Single-scenario execution runner.
 * Governed by §26.5, §27 (full 11-step execution order).
 * This runner orchestrates all transforms, validators, formulas, and emitters.
 */
import { ComputeModuleSpec, CommsPayloadSpec } from '../formulas/loads';
import { EnvironmentTerms } from '../transforms/scenario-aggregator';
import { RuntimeResult } from '../emitters/json-emitter';
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
export declare function runScenario(input: ScenarioRunInput): RuntimeResult;
//# sourceMappingURL=run-scenario.d.ts.map