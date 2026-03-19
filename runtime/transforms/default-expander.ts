/**
 * default-expander.ts
 * Default expansion transform — injects spec-declared defaults for omitted fields.
 * Governed by §26.4, §40, §4.3.
 * All injected defaults are surfaced as assumptions per §4.3.
 */

import {
  EPSILON_RAD_DEFAULT,
  RESERVE_MARGIN_DEFAULT,
  T_SINK_EFFECTIVE_DEFAULT_K,
  T_REF_DEFAULT_K,
  THERMAL_POLICY_MARGINS,
} from '../constants/constants';
import { Assumption } from '../emitters/json-emitter';

export interface ExpandedDefaults {
  epsilon_rad: number;
  reserve_margin_fraction: number;
  t_sink_effective_k: number;
  t_ref_k: number;
  assumptions: Assumption[];
}

/**
 * Expand defaults for a scenario.
 * Every injected default is recorded as an assumption per §4.3 / §40.
 */
export function expandDefaults(overrides: {
  epsilon_rad?: number;
  reserve_margin_fraction?: number;
  t_sink_effective_k?: number;
  t_ref_k?: number;
  thermal_policy?: string;
}): ExpandedDefaults {
  const assumptions: Assumption[] = [];

  const epsilon_rad = overrides.epsilon_rad ?? EPSILON_RAD_DEFAULT;
  if (overrides.epsilon_rad === undefined) {
    assumptions.push({
      field: 'epsilon_rad',
      value: EPSILON_RAD_DEFAULT,
      source: 'default',
      note: 'Default radiator emissivity per §40.',
    });
  }

  // Policy-aware margin
  const policy_margin =
    overrides.thermal_policy !== undefined
      ? (THERMAL_POLICY_MARGINS[overrides.thermal_policy] ?? RESERVE_MARGIN_DEFAULT)
      : RESERVE_MARGIN_DEFAULT;

  const reserve_margin_fraction = overrides.reserve_margin_fraction ?? policy_margin;
  if (overrides.reserve_margin_fraction === undefined) {
    assumptions.push({
      field: 'reserve_margin_fraction',
      value: reserve_margin_fraction,
      source: 'default',
      note: `Default reserve margin for thermal policy '${overrides.thermal_policy ?? 'nominal'}' per §40 / §33.`,
    });
  }

  const t_sink_effective_k = overrides.t_sink_effective_k ?? T_SINK_EFFECTIVE_DEFAULT_K;
  if (overrides.t_sink_effective_k === undefined) {
    assumptions.push({
      field: 't_sink_effective_k',
      value: T_SINK_EFFECTIVE_DEFAULT_K,
      source: 'default',
      note: 'Deep-space first-order sizing assumption per §40.',
    });
  }

  const t_ref_k = overrides.t_ref_k ?? T_REF_DEFAULT_K;
  if (overrides.t_ref_k === undefined) {
    assumptions.push({
      field: 't_ref_k',
      value: T_REF_DEFAULT_K,
      source: 'default',
      note: 'Reference temperature for exergy calculation per §26.1.',
    });
  }

  return { epsilon_rad, reserve_margin_fraction, t_sink_effective_k, t_ref_k, assumptions };
}
