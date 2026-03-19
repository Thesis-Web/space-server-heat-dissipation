/**
 * power-cycle.ts
 * Power-cycle (heat engine) governing equations and Carnot bound enforcement.
 * Governing equations: §12.7, §12.10.
 * Validation rules: §30.2, §46 (efficiency > Carnot prohibited).
 */

export interface CarnotEngineInput {
  /** Hot source temperature (K). Must be > t_cold_k. */
  t_hot_k: number;
  /** Cold sink temperature (K). */
  t_cold_k: number;
}

export interface CarnotEngineResult {
  /** eta_carnot_engine = 1 - T_cold / T_hot. §12.7 */
  eta_carnot_engine: number;
  t_hot_k: number;
  t_cold_k: number;
}

export interface PowerCycleInput {
  /** Hot-source thermal input rate (W). Q_dot_hot_source. §12.10 */
  q_dot_hot_source_w: number;
  /** Declared actual cycle efficiency (dimensionless). Must not exceed Carnot. */
  eta_cycle_actual: number;
  /** Hot-source temperature (K) for Carnot bound check. */
  t_hot_source_k: number;
  /** Cold-sink temperature (K) for Carnot bound check. */
  t_cold_sink_k: number;
}

export interface PowerCycleResult {
  /** Work output rate (W). W_dot_cycle = eta_actual * Q_dot_hot_source. §12.10 */
  w_dot_cycle_w: number;
  /** Waste heat to cold sink (W). */
  q_dot_waste_w: number;
  /** Carnot efficiency bound for reference. */
  eta_carnot_engine: number;
  /** Whether declared efficiency obeys Carnot bound. */
  carnot_compliant: boolean;
  eta_cycle_actual: number;
  q_dot_hot_source_w: number;
  t_hot_source_k: number;
  t_cold_sink_k: number;
}

/**
 * eta_carnot_engine = 1 - T_cold / T_hot  §12.7
 */
export function computeCarnotEngineBound(input: CarnotEngineInput): CarnotEngineResult {
  if (input.t_hot_k <= input.t_cold_k) {
    throw new RangeError(
      `t_hot_k (${input.t_hot_k} K) must be > t_cold_k (${input.t_cold_k} K)`
    );
  }
  if (input.t_cold_k <= 0) {
    throw new RangeError(`t_cold_k must be > 0 K. Got ${input.t_cold_k}`);
  }

  const eta = 1 - input.t_cold_k / input.t_hot_k;
  return {
    eta_carnot_engine: eta,
    t_hot_k: input.t_hot_k,
    t_cold_k: input.t_cold_k,
  };
}

/**
 * W_dot_cycle = eta_cycle_actual * Q_dot_hot_source  §12.10
 * Q_dot_waste = Q_dot_hot_source - W_dot_cycle
 *
 * Enforces §30.2 and §46 prohibition: eta_actual must not exceed Carnot.
 * Enforces §30.1 source-quality rule (t_hot_source_k > t_cold_sink_k).
 * Throws RangeError on violation.
 */
export function computePowerCycle(input: PowerCycleInput): PowerCycleResult {
  if (input.q_dot_hot_source_w < 0) {
    throw new RangeError(`q_dot_hot_source_w must be >= 0. Got ${input.q_dot_hot_source_w}`);
  }
  if (input.eta_cycle_actual < 0 || input.eta_cycle_actual >= 1) {
    throw new RangeError(
      `eta_cycle_actual must be in [0, 1). Got ${input.eta_cycle_actual}`
    );
  }

  // §30.1 source-quality rule
  if (input.t_hot_source_k <= input.t_cold_sink_k) {
    throw new RangeError(
      `PROHIBITED (§30.1): t_hot_source_k (${input.t_hot_source_k} K) ` +
      `must exceed t_cold_sink_k (${input.t_cold_sink_k} K)`
    );
  }

  const carnot = computeCarnotEngineBound({
    t_hot_k: input.t_hot_source_k,
    t_cold_k: input.t_cold_sink_k,
  });

  // §46 prohibition — efficiency > Carnot is rejected
  if (input.eta_cycle_actual > carnot.eta_carnot_engine) {
    throw new RangeError(
      `PROHIBITED (§46): eta_cycle_actual (${input.eta_cycle_actual.toFixed(6)}) ` +
      `exceeds Carnot bound (${carnot.eta_carnot_engine.toFixed(6)}) ` +
      `for T_hot=${input.t_hot_source_k} K, T_cold=${input.t_cold_sink_k} K`
    );
  }

  const w_dot_cycle_w = input.eta_cycle_actual * input.q_dot_hot_source_w;
  const q_dot_waste_w = input.q_dot_hot_source_w - w_dot_cycle_w;

  return {
    w_dot_cycle_w,
    q_dot_waste_w,
    eta_carnot_engine: carnot.eta_carnot_engine,
    carnot_compliant: true,
    eta_cycle_actual: input.eta_cycle_actual,
    q_dot_hot_source_w: input.q_dot_hot_source_w,
    t_hot_source_k: input.t_hot_source_k,
    t_cold_sink_k: input.t_cold_sink_k,
  };
}
