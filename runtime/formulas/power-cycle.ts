/**
 * Power cycle and heat lift formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.7–18.9
 */

/**
 * Carnot efficiency for a power cycle.
 * Law per spec §18.7: η_carnot = 1 - (T_cold / T_hot)
 */
export function carnotEfficiency(t_hot_k: number, t_cold_k: number): number {
  if (t_hot_k <= 0 || t_cold_k <= 0) throw new Error("Temperatures must be > 0 K");
  if (t_hot_k <= t_cold_k) throw new Error("T_hot must be > T_cold for power cycle");
  return 1 - t_cold_k / t_hot_k;
}

/**
 * Carnot COP for a heat pump / heat lift.
 * Law per spec §18.8: COP_heating_carnot = T_hot / (T_hot - T_cold)
 */
export function carnotCopHeatLift(t_hot_k: number, t_cold_k: number): number {
  if (t_hot_k <= 0 || t_cold_k <= 0) throw new Error("Temperatures must be > 0 K");
  if (t_hot_k <= t_cold_k) throw new Error("T_hot must be > T_cold for heat lift");
  return t_hot_k / (t_hot_k - t_cold_k);
}

export interface CarnotValidationResult {
  valid: boolean;
  carnot_bound: number;
  actual_value: number;
  violation_message?: string;
}

/**
 * Validate power cycle efficiency against Carnot bound.
 * Spec §18.7: require 0 < η_actual <= η_carnot
 */
export function validatePowerCycleEfficiency(
  efficiency_or_cop: number,
  t_hot_k: number,
  t_cold_k: number
): CarnotValidationResult {
  const carnot = carnotEfficiency(t_hot_k, t_cold_k);
  if (efficiency_or_cop <= 0 || efficiency_or_cop > carnot) {
    return {
      valid: false,
      carnot_bound: carnot,
      actual_value: efficiency_or_cop,
      violation_message: `η_actual=${efficiency_or_cop.toFixed(4)} violates 0 < η <= η_carnot=${carnot.toFixed(4)}`,
    };
  }
  return { valid: true, carnot_bound: carnot, actual_value: efficiency_or_cop };
}

/**
 * Validate heat lift COP against Carnot bound.
 * Spec §18.8: require 1 < COP_actual <= COP_carnot
 */
export function validateHeatLiftCop(
  efficiency_or_cop: number,
  t_hot_k: number,
  t_cold_k: number
): CarnotValidationResult {
  const carnot = carnotCopHeatLift(t_hot_k, t_cold_k);
  if (efficiency_or_cop <= 1 || efficiency_or_cop > carnot) {
    return {
      valid: false,
      carnot_bound: carnot,
      actual_value: efficiency_or_cop,
      violation_message: `COP_actual=${efficiency_or_cop.toFixed(4)} violates 1 < COP <= COP_carnot=${carnot.toFixed(4)}`,
    };
  }
  return { valid: true, carnot_bound: carnot, actual_value: efficiency_or_cop };
}

/**
 * No silent uplift check.
 * Spec §18.9: if branch implies T lift or hot-side improvement,
 * at least one of work_input_w, external_heat_input_w, storage_drawdown_w > 0
 * OR research_required = true.
 */
export function checkNoSilentUplift(params: {
  mode_label: string;
  work_input_w: number;
  external_heat_input_w: number;
  storage_drawdown_w: number;
  research_required: boolean;
}): { compliant: boolean; message?: string } {
  const { mode_label, work_input_w, external_heat_input_w, storage_drawdown_w, research_required } = params;
  if (mode_label !== "heat_lift") return { compliant: true };
  const hasDeclaredSource = work_input_w > 0 || external_heat_input_w > 0 || storage_drawdown_w > 0 || research_required;
  if (!hasDeclaredSource) {
    return {
      compliant: false,
      message: "heat_lift branch must declare work_input_w, external_heat_input_w, storage_drawdown_w > 0, or research_required=true",
    };
  }
  return { compliant: true };
}

// ─── FIX-007: computeCarnotEngineBound adapter ───────────────────────────────
// operating-mode.ts (ANCHOR) imports computeCarnotEngineBound.
// BASE power-cycle.ts exports carnotEfficiency (same math, functional style).
// Adding object-input/output form to satisfy ANCHOR's import contract.
// FIX-007: required by runtime/validators/operating-mode.ts.

export interface CarnotEngineBoundInput {
  t_hot_k: number;
  t_cold_k: number;
}

export interface CarnotEngineBoundResult {
  eta_carnot_engine: number;
  t_hot_k: number;
  t_cold_k: number;
}

/**
 * Carnot engine efficiency bound. η = 1 - T_cold/T_hot.
 * Spec §12.7. FIX-007: object-form adapter for operating-mode.ts.
 */
export function computeCarnotEngineBound(input: CarnotEngineBoundInput): CarnotEngineBoundResult {
  const eta = carnotEfficiency(input.t_hot_k, input.t_cold_k);
  return {
    eta_carnot_engine: eta,
    t_hot_k: input.t_hot_k,
    t_cold_k: input.t_cold_k,
  };
}
