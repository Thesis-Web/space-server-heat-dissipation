/**
 * operating-mode.ts
 * Operating mode boundary enforcement.
 * Governed by §4.4, §7.3, §13.1, §13.2, §13.3, §26.3, §29.2, §30.2, §46.
 * Added per HOLE-003: required by §26.3, omitted from §43. §26.3 governs.
 */
import { Flag } from '../emitters/flag-emitter';
export interface OperatingModeViolation {
    rule: string;
    message: string;
    severity: 'error' | 'warning';
}
/**
 * Reject scenario if orbit_class is not GEO. §7.3.
 */
export declare function validateOrbitClass(orbit_class: string): OperatingModeViolation[];
/**
 * Validate that heat-lift and power-cycle stages are not fused.
 * Each stage_type must be uniquely classified. §4.4.
 */
export declare function validateNoModeFusion(stages: Array<{
    stage_id: string;
    stage_type: string;
}>): OperatingModeViolation[];
export interface HeatLiftModeCheck {
    branch_id: string;
    cop_heating_actual: number;
    t_cold_source_k: number;
    t_hot_delivery_k: number;
}
export declare function validateHeatLiftMode(check: HeatLiftModeCheck): OperatingModeViolation[];
export interface PowerCycleModeCheck {
    branch_id: string;
    eta_cycle_actual: number;
    t_hot_source_k: number;
    t_cold_sink_k: number;
}
export declare function validatePowerCycleMode(check: PowerCycleModeCheck): OperatingModeViolation[];
export declare function checkScavengingSignificance(branch_id: string, branch_output_w: number, q_dot_internal_w: number): Flag | null;
/**
 * Convert OperatingModeViolations to Flags.
 */
export declare function modeViolationsToFlags(violations: OperatingModeViolation[]): Flag[];
/**
 * 3A mode enum values per §5.2.
 */
export declare const MODEL_EXTENSION_3A_MODES: readonly ["disabled", "topology_only", "foundational_hardening"];
export type ModelExtension3AMode = typeof MODEL_EXTENSION_3A_MODES[number];
/**
 * Topology validation policy values per §5.2.
 */
export declare const TOPOLOGY_VALIDATION_POLICIES: readonly ["blocking", "warn_only"];
export type TopologyValidationPolicy = typeof TOPOLOGY_VALIDATION_POLICIES[number];
/**
 * Validate extension 3A mode field.
 * Returns violation if mode is not a recognized 3A enum value.
 * §5.2.
 */
export declare function validateExtension3AMode(mode: string | undefined | null): OperatingModeViolation[];
/**
 * Validate topology_validation_policy field.
 * §5.1, §5.2.
 */
export declare function validateTopologyPolicy(policy: string | undefined | null): OperatingModeViolation[];
/**
 * Validate Extension 3A gate: if enable_model_extension_3a=false, 3A mode must be disabled.
 * Backward compat: absent enable flag treated as false per §5.3.
 * §5.3.
 */
export declare function validateExtension3AGate(enable: boolean | undefined | null, mode: string | undefined | null): OperatingModeViolation[];
/**
 * Full 3A mode validation bundle.
 * Call with scenario fields to get all mode-level violations.
 */
export declare function validateExtension3AOperatingMode(params: {
    enable_model_extension_3a?: boolean | null;
    model_extension_3a_mode?: string | null;
    topology_validation_policy?: string | null;
}): OperatingModeViolation[];
//# sourceMappingURL=operating-mode.d.ts.map