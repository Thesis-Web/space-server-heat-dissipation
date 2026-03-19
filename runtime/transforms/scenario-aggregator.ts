/**
 * scenario-aggregator.ts
 * Scenario aggregation transform — assembles system-level thermal balance.
 * Governed by §26.4, §12.1, §27.5, §27.6.
 */

import { Assumption } from '../emitters/json-emitter';

export interface EnvironmentTerms {
  solar_absorbed_w: number;
  earth_reflected_w: number;
  earth_ir_w: number;
  user_margin_w: number;
}

export interface AggregatedBalance {
  /** Q_dot_internal (W) — all on-node electrical draws. §12.1, §27.5 */
  q_dot_internal_w: number;
  /** Q_dot_external (W) — all modeled environmental terms. §12.1, §27.6 */
  q_dot_external_w: number;
  /** W_dot_parasitic (W) — treated as internal dissipation unless explicitly exported. §12.1 */
  w_dot_parasitic_w: number;
  /** Q_dot_branch_losses (W) — conversion losses remaining on-node. §12.1 */
  q_dot_branch_losses_w: number;
  /** W_dot_exported_equivalent (W) — only if a branch removes usable energy. §12.1 */
  w_dot_exported_equivalent_w: number;
  /** Q_dot_total_reject = sum per §12.1 */
  q_dot_total_reject_w: number;
  assumptions: Assumption[];
  notes: string[];
}

/**
 * System energy balance per §12.1:
 * Q_dot_total_reject = Q_dot_internal + Q_dot_external
 *                    + W_dot_parasitic + Q_dot_branch_losses
 *                    - W_dot_exported_equivalent
 */
export function aggregateSystemBalance(params: {
  q_dot_internal_w: number;
  env_terms: EnvironmentTerms | null;
  w_dot_parasitic_w: number;
  q_dot_branch_losses_w: number;
  w_dot_exported_equivalent_w: number;
}): AggregatedBalance {
  const assumptions: Assumption[] = [];
  const notes: string[] = [];

  // External term §27.6
  let q_dot_external_w = 0;
  if (params.env_terms) {
    q_dot_external_w =
      params.env_terms.solar_absorbed_w +
      params.env_terms.earth_reflected_w +
      params.env_terms.earth_ir_w +
      params.env_terms.user_margin_w;
  } else {
    assumptions.push({
      field: 'q_dot_external_w',
      value: 0,
      source: 'default',
      note: 'No environment profile provided. External thermal load set to 0 W for first-order sizing.',
    });
    notes.push(
      'No environment profile declared. External environmental load treated as 0 W. ' +
        'For GEO operational accuracy, supply solar_absorbed_w, earth_reflected_w, earth_ir_w. §7.2'
    );
  }

  // W_dot_exported equivalent — 0 if no export branch §12.1
  if (params.w_dot_exported_equivalent_w === 0) {
    notes.push('No export branch active. W_dot_exported_equivalent = 0 W per §12.1.');
  }

  const q_total =
    params.q_dot_internal_w +
    q_dot_external_w +
    params.w_dot_parasitic_w +
    params.q_dot_branch_losses_w -
    params.w_dot_exported_equivalent_w;

  return {
    q_dot_internal_w: params.q_dot_internal_w,
    q_dot_external_w,
    w_dot_parasitic_w: params.w_dot_parasitic_w,
    q_dot_branch_losses_w: params.q_dot_branch_losses_w,
    w_dot_exported_equivalent_w: params.w_dot_exported_equivalent_w,
    q_dot_total_reject_w: q_total,
    assumptions,
    notes,
  };
}
