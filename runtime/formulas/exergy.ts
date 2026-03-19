/**
 * exergy.ts
 * Thermal exergy upper bound.
 * Governing equation: §12.6. Interpretation rules per §12.6.
 */

import { T_REF_DEFAULT_K } from '../constants/constants';

export interface ExergyInput {
  /** Thermal source heat flow rate (W). */
  q_dot_source_w: number;
  /** Source temperature (K). Must be > t_ref_k. */
  t_source_k: number;
  /** Reference (sink/environment) temperature (K). Defaults to T_REF_DEFAULT_K. */
  t_ref_k?: number;
}

export interface ExergyResult {
  /** Maximum extractable work rate (W). W_dot_exergy_max. §12.6 */
  w_dot_exergy_max_w: number;
  /** Exergy fraction (dimensionless). */
  exergy_fraction: number;
  t_source_k: number;
  t_ref_k: number;
  q_dot_source_w: number;
  physical: boolean;
}

/**
 * W_dot_exergy_max = Q_dot_source * (1 - T_ref / T_source)
 * §12.6 — if T_source <= T_ref, result is non-physical for positive work.
 */
export function computeExergyUpperBound(input: ExergyInput): ExergyResult {
  const t_ref = input.t_ref_k ?? T_REF_DEFAULT_K;

  if (input.q_dot_source_w < 0) {
    throw new RangeError(`q_dot_source_w must be >= 0. Got ${input.q_dot_source_w}`);
  }
  if (input.t_source_k <= 0) {
    throw new RangeError(`t_source_k must be > 0 K. Got ${input.t_source_k}`);
  }
  if (t_ref <= 0) {
    throw new RangeError(`t_ref_k must be > 0 K. Got ${t_ref}`);
  }

  const physical = input.t_source_k > t_ref;
  if (!physical) {
    // §12.6: runtime must reject as non-physical for positive work extraction.
    return {
      w_dot_exergy_max_w: 0,
      exergy_fraction: 0,
      t_source_k: input.t_source_k,
      t_ref_k: t_ref,
      q_dot_source_w: input.q_dot_source_w,
      physical: false,
    };
  }

  const exergy_fraction = 1 - t_ref / input.t_source_k;
  const w_dot_exergy_max_w = input.q_dot_source_w * exergy_fraction;

  return {
    w_dot_exergy_max_w,
    exergy_fraction,
    t_source_k: input.t_source_k,
    t_ref_k: t_ref,
    q_dot_source_w: input.q_dot_source_w,
    physical: true,
  };
}
