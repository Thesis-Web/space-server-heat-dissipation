/**
 * gas-management.ts
 * Extension 3B — TEG Boundedness, Eclipse Effects, and Total Reject Bookkeeping
 * Spec: 3B-spec §11.7, §11.8, §11.9, §8, §8.1, §13.4, §13.5
 * Blueprint: 3B-blueprint §11, §12
 *
 * TEG is subordinate scavenging only. It does not erase downstream reject burden.
 * Eclipse authority is scenario.operating_state only — no subsystem infers eclipse state locally.
 */

export interface ConversionBranch3B {
  branch_id: string;
  branch_type: string;
  enabled: boolean;
  q_dot_input_w: number | null;
  efficiency_fraction: number | null;
  t_hot_source_k: number | null;
  t_cold_sink_k: number | null;
  teg_carnot_fraction_cap: number | null;
  teg_residual_heat_on_node: boolean | null;
  teg_subordinate_to_rejection: boolean | null;
}

export interface TEGBoundedResult {
  branch_id: string;
  eta_carnot: number | null;
  eta_teg_cap: number | null;
  p_dot_teg_electrical_w: number;
  q_dot_teg_residual_w: number;
  residual_on_node: boolean;
  reason_code: string;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

export interface OperatingState {
  current_state: 'sunlit' | 'eclipse' | 'custom';
  state_resolution_mode: 'explicit' | 'preset' | 'custom';
  preset_id: string | null;
  preset_version: string | null;
  storage_support_enabled: boolean;
  storage_ref: string | null;
  compute_derate_fraction: number;
  noncritical_branch_disable_refs: string[];
  notes: string;
}

export interface OperatingStateEffects {
  state: string;
  applied: boolean;
  solar_source_terms_suppressed: boolean;
  storage_drawdown_allowed: boolean;
  disabled_branch_refs: string[];
  q_dot_compute_effective_w: number | null;
  q_dot_compute_nominal_w: number | null;
  compute_derate_fraction_applied: number;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

/**
 * computeTEGBoundedOutput
 * Spec §11.8:
 *   eta_carnot = 1 - T_cold/T_hot
 *   eta_teg_cap = min(eta_declared, eta_carnot, teg_carnot_fraction_cap)
 *   p_dot_teg = q_dot_input * eta_teg_cap
 *   residual heat remains on-node if teg_residual_heat_on_node=true
 */
export function computeTEGBoundedOutput(branch: ConversionBranch3B): TEGBoundedResult {
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const trace: string[] = [];

  if (!branch.enabled || branch.branch_type !== 'teg') {
    trace.push(`branch ${branch.branch_id} not enabled or not teg type: no TEG output`);
    return {
      branch_id: branch.branch_id,
      eta_carnot: null,
      eta_teg_cap: null,
      p_dot_teg_electrical_w: 0,
      q_dot_teg_residual_w: branch.q_dot_input_w ?? 0,
      residual_on_node: true,
      reason_code: 'not_applicable',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Spec §13.4 blocking rules
  const subordinate = branch.teg_subordinate_to_rejection ?? true;
  if (!subordinate) {
    blocking_errors.push(
      `TEG-001: branch=${branch.branch_id} teg_subordinate_to_rejection=false is not permitted; TEG must be subordinate scavenging only`
    );
  }

  const tHot = branch.t_hot_source_k;
  const tCold = branch.t_cold_sink_k;
  if (tHot == null || tCold == null) {
    blocking_errors.push(
      `TEG-002: branch=${branch.branch_id} T_hot_source_k or T_cold_sink_k missing`
    );
  }
  if (tHot != null && tCold != null && tHot <= tCold) {
    blocking_errors.push(
      `TEG-003: branch=${branch.branch_id} T_hot (${tHot}) <= T_cold (${tCold}): invalid for TEG operation`
    );
  }

  if (blocking_errors.length > 0) {
    trace.push('TEG computation blocked — see blocking_errors');
    return {
      branch_id: branch.branch_id,
      eta_carnot: null,
      eta_teg_cap: null,
      p_dot_teg_electrical_w: 0,
      q_dot_teg_residual_w: branch.q_dot_input_w ?? 0,
      residual_on_node: branch.teg_residual_heat_on_node ?? true,
      reason_code: 'blocked',
      blocking_errors,
      warnings,
      trace
    };
  }

  const etaCarnot = 1.0 - tCold! / tHot!;
  const etaDeclared = branch.efficiency_fraction ?? etaCarnot;
  const etaCap = branch.teg_carnot_fraction_cap ?? 0.20;

  if (etaDeclared > etaCarnot) {
    warnings.push(
      `TEG-W001: branch=${branch.branch_id} eta_declared (${etaDeclared.toFixed(4)}) > eta_carnot (${etaCarnot.toFixed(4)}): capped to Carnot limit`
    );
  }

  // Spec §11.8: cap is min of all three
  const etaTegCap = Math.min(etaDeclared, etaCarnot, etaCap);
  const qIn = branch.q_dot_input_w ?? 0;
  const pElec = qIn * etaTegCap;
  const qResidual = qIn - pElec;
  const residualOnNode = branch.teg_residual_heat_on_node ?? true;

  trace.push(`eta_carnot=${etaCarnot.toFixed(4)}, eta_declared=${etaDeclared.toFixed(4)}, teg_carnot_fraction_cap=${etaCap}`);
  trace.push(`eta_teg_cap=min(${etaDeclared.toFixed(4)},${etaCarnot.toFixed(4)},${etaCap})=${etaTegCap.toFixed(4)}`);
  trace.push(`p_dot_teg=${pElec.toFixed(4)} W, q_residual=${qResidual.toFixed(4)} W, residual_on_node=${residualOnNode}`);

  // Spec §13.4: residual heat off-node requires declared carrier branch
  if (!residualOnNode) {
    warnings.push(
      `TEG-W002: branch=${branch.branch_id} teg_residual_heat_on_node=false; ensure a declared carrier branch handles residual heat`
    );
  }

  return {
    branch_id: branch.branch_id,
    eta_carnot: etaCarnot,
    eta_teg_cap: etaTegCap,
    p_dot_teg_electrical_w: pElec,
    q_dot_teg_residual_w: qResidual,
    residual_on_node: residualOnNode,
    reason_code: 'computed',
    blocking_errors,
    warnings,
    trace
  };
}

/**
 * computeTotalRejectWith3B
 * Spec §11.7
 */
export function computeTotalRejectWith3B(
  qDotBaseRejectW: number,
  wDotPumpTotalW: number,
  tegResults: TEGBoundedResult[]
): { q_dot_total_reject_3b_w: number; trace: string[] } {
  const trace: string[] = [];
  let qTotal = qDotBaseRejectW + wDotPumpTotalW;
  trace.push(`q_dot_base=${qDotBaseRejectW} W + w_dot_pump=${wDotPumpTotalW} W`);

  for (const teg of tegResults) {
    if (teg.residual_on_node) {
      qTotal += teg.q_dot_teg_residual_w;
      trace.push(`+ teg_residual branch=${teg.branch_id}: ${teg.q_dot_teg_residual_w.toFixed(4)} W on-node`);
    }
  }

  trace.push(`q_dot_total_reject_3b_w = ${qTotal.toFixed(4)} W`);
  return { q_dot_total_reject_3b_w: qTotal, trace };
}

/**
 * applyOperatingStateEffects
 * Spec §11.9, §12 blueprint
 * scenario.operating_state is the only eclipse-state authority.
 */
export function applyOperatingStateEffects(
  operatingState: OperatingState | null | undefined,
  qDotComputeNominalW: number | null
): OperatingStateEffects {
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const trace: string[] = [];

  if (operatingState == null) {
    trace.push('operating_state absent: effects not applied');
    return {
      state: 'disabled',
      applied: false,
      solar_source_terms_suppressed: false,
      storage_drawdown_allowed: false,
      disabled_branch_refs: [],
      q_dot_compute_effective_w: qDotComputeNominalW,
      q_dot_compute_nominal_w: qDotComputeNominalW,
      compute_derate_fraction_applied: 0,
      blocking_errors,
      warnings,
      trace
    };
  }

  const state = operatingState.current_state;
  trace.push(`operating_state.current_state=${state}`);

  if (state === 'sunlit') {
    trace.push('sunlit: no eclipse effects applied');
    return {
      state,
      applied: true,
      solar_source_terms_suppressed: false,
      storage_drawdown_allowed: false,
      disabled_branch_refs: [],
      q_dot_compute_effective_w: qDotComputeNominalW,
      q_dot_compute_nominal_w: qDotComputeNominalW,
      compute_derate_fraction_applied: 0,
      blocking_errors,
      warnings,
      trace
    };
  }

  if (state === 'eclipse') {
    // Spec §13.5: storage support enabled requires resolvable storage_ref
    if (operatingState.storage_support_enabled && !operatingState.storage_ref) {
      blocking_errors.push(
        'ECLIPSE-001: operating_state.current_state=eclipse, storage_support_enabled=true, but storage_ref is null or unresolved'
      );
    }

    const derate = operatingState.compute_derate_fraction;
    if (derate < 0 || derate > 1) {
      blocking_errors.push(
        `ECLIPSE-002: compute_derate_fraction=${derate} is outside [0,1]`
      );
    }

    const qEff = qDotComputeNominalW != null
      ? qDotComputeNominalW * (1.0 - derate)
      : null;

    trace.push(`eclipse: compute_derate=${derate}, q_dot_compute_effective=${qEff}`);
    trace.push(`solar_source_terms_suppressed=true (declared solar-dependent sources)`);
    trace.push(`disabled_branch_refs=${JSON.stringify(operatingState.noncritical_branch_disable_refs)}`);

    return {
      state,
      applied: true,
      solar_source_terms_suppressed: true,
      storage_drawdown_allowed: operatingState.storage_support_enabled && !!operatingState.storage_ref,
      disabled_branch_refs: operatingState.noncritical_branch_disable_refs,
      q_dot_compute_effective_w: qEff,
      q_dot_compute_nominal_w: qDotComputeNominalW,
      compute_derate_fraction_applied: derate,
      blocking_errors,
      warnings,
      trace
    };
  }

  // custom state — pass through nominal with trace
  warnings.push(`ECLIPSE-W001: operating_state.current_state=custom; effects not automatically applied`);
  trace.push('custom operating_state: effects require operator declaration');
  return {
    state,
    applied: false,
    solar_source_terms_suppressed: false,
    storage_drawdown_allowed: false,
    disabled_branch_refs: [],
    q_dot_compute_effective_w: qDotComputeNominalW,
    q_dot_compute_nominal_w: qDotComputeNominalW,
    compute_derate_fraction_applied: 0,
    blocking_errors,
    warnings,
    trace
  };
}
