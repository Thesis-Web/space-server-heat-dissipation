/**
 * run-extension-3b.ts
 * Extension 3B — Primary Runner
 * Spec: 3B-spec §14, §14.1, §14.2, §14A, §15.2
 * Blueprint: 3B-blueprint §4, §5
 *
 * Dispatcher order: baseline → extension_3A → extension_3B (spec §15.3)
 * Result attaches under extension_3b_result only.
 * Does NOT mutate baseline_result or extension_3a_result.
 */

import { normalizeExtension3B, type Extension3BCatalogs } from '../transforms/extension-3b-normalizer';
import { validateExtension3BBounds } from '../validators/extension-3b-bounds';
import { computeVaultGasResistance, type VaultGasEnvironmentResult } from '../formulas/vault-gas-environment';
import {
  computePumpParasitic,
  computeBubblePenalty,
  type TransportParasiticResult,
  type GasManagementResult
} from '../formulas/loop-parasitics';
import {
  computeTEGBoundedOutput,
  computeTotalRejectWith3B,
  applyOperatingStateEffects,
  type TEGBoundedResult,
  type OperatingStateEffects
} from '../formulas/gas-management';

// Spec §14A: explicit 3B input interface
export interface Extension3BInput {
  scenario: Record<string, unknown>;
  catalogs: Extension3BCatalogs;
  baselineOr3AContext: {
    extension3AResult?: Record<string, unknown> | null;
    radiatorResult?: Record<string, unknown> | null;
    aggregationResult?: Record<string, unknown> | null;
  };
}

export interface LoopResistanceAdjustment {
  zone_id: string;
  r_loop_to_sink_base_k_per_w: number | null;
  r_vault_gas_environment_k_per_w: number;
  r_bubble_penalty_k_per_w: number;
  r_loop_to_sink_effective_3b_k_per_w: number | null;
  trace: string[];
}

export interface Extension3BResult {
  extension_3b_enabled: boolean;
  model_extension_3b_mode: string;
  spec_version: string;
  blueprint_version: string;
  vault_gas_environment_results: VaultGasEnvironmentResult[];
  transport_parasitic_results: TransportParasiticResult[];
  gas_management_results: GasManagementResult[];
  loop_resistance_adjustments: LoopResistanceAdjustment[];
  teg_bounded_results: TEGBoundedResult[];
  operating_state_effects: OperatingStateEffects;
  q_dot_total_reject_3b_w: number | null;
  preset_provenance: unknown[];
  blocking_errors: string[];
  warnings: string[];
  transform_trace: string[];
}

const SPEC_VERSION = 'v0.1.1';
const BLUEPRINT_VERSION = 'v0.1.1';

/** Spec §14.1: deterministic disabled result shape */
function disabledResult(): Extension3BResult {
  return {
    extension_3b_enabled: false,
    model_extension_3b_mode: 'disabled',
    spec_version: SPEC_VERSION,
    blueprint_version: BLUEPRINT_VERSION,
    vault_gas_environment_results: [],
    transport_parasitic_results: [],
    gas_management_results: [],
    loop_resistance_adjustments: [],
    teg_bounded_results: [],
    operating_state_effects: { state: 'disabled', applied: false, solar_source_terms_suppressed: false, storage_drawdown_allowed: false, disabled_branch_refs: [], q_dot_compute_effective_w: null, q_dot_compute_nominal_w: null, compute_derate_fraction_applied: 0, blocking_errors: [], warnings: [], trace: [] },
    q_dot_total_reject_3b_w: null,
    preset_provenance: [],
    blocking_errors: [],
    warnings: [],
    transform_trace: ['extension_3b_disabled']
  };
}

/**
 * runExtension3B
 * Spec §15.2 execution flow.
 */
export function runExtension3B(input: Extension3BInput): Extension3BResult {
  const transform_trace: string[] = ['run-extension-3b: start'];
  const all_blocking: string[] = [];
  const all_warnings: string[] = [];

  // Step 1: Normalize
  const norm = normalizeExtension3B(input.scenario, input.catalogs);
  transform_trace.push(...norm.trace);

  if (norm.disabled) {
    return disabledResult();
  }

  // Step 2: Bounds validation
  const boundsResult = validateExtension3BBounds(norm);
  transform_trace.push(...boundsResult.trace);
  all_blocking.push(...boundsResult.blocking_errors);
  all_warnings.push(...boundsResult.warnings);

  if (all_blocking.length > 0) {
    transform_trace.push('3B run blocked by bounds validation errors');
    const r = disabledResult();
    return {
      ...r,
      extension_3b_enabled: true,
      model_extension_3b_mode: norm.mode,
      blocking_errors: all_blocking,
      warnings: all_warnings,
      transform_trace,
      preset_provenance: norm.preset_provenance
    };
  }

  // Step 3: Per-zone computation
  const vault_gas_environment_results: VaultGasEnvironmentResult[] = [];
  const transport_parasitic_results: TransportParasiticResult[] = [];
  const gas_management_results: GasManagementResult[] = [];
  const loop_resistance_adjustments: LoopResistanceAdjustment[] = [];

  for (const zone of norm.normalized_zones) {
    const zoneId = zone.zone_id;
    transform_trace.push(`--- processing zone: ${zoneId} ---`);

    // Resolve base loop resistance from 3A context if available
    const rBase = resolveBaseLoopResistance(zoneId, input.baselineOr3AContext);
    transform_trace.push(`zone ${zoneId}: r_loop_to_sink_base=${rBase}`);

    // Vault gas resistance
    const vgResult = computeVaultGasResistance(zoneId, zone.vault_gas_environment_model);
    vault_gas_environment_results.push(vgResult);
    all_blocking.push(...vgResult.blocking_errors);
    all_warnings.push(...vgResult.warnings);

    // Pump parasitic
    const canonicalDensity = resolveCanonicalDensity(zone.zone_id, input.scenario);
    const pumpResult = computePumpParasitic(zoneId, zone.transport_implementation, canonicalDensity);
    transport_parasitic_results.push(pumpResult);
    all_blocking.push(...pumpResult.blocking_errors);
    all_warnings.push(...pumpResult.warnings);

    // Bubble / gas-management penalty
    const bubbleResult = computeBubblePenalty(zoneId, zone.transport_implementation, rBase ?? 0);
    gas_management_results.push(bubbleResult);
    all_blocking.push(...bubbleResult.blocking_errors);
    all_warnings.push(...bubbleResult.warnings);

    // Spec §11.6: effective 3B loop resistance
    const rVault = vgResult.r_vault_gas_environment_k_per_w;
    const rBubble = bubbleResult.r_bubble_penalty_k_per_w;
    const rEffective = rBase != null ? rBase + rVault + rBubble : null;
    const lraTrace: string[] = [
      `r_loop_to_sink_base=${rBase}, r_vault=${rVault.toFixed(6)}, r_bubble=${rBubble.toFixed(6)}, r_effective_3b=${rEffective?.toFixed(6)}`
    ];
    loop_resistance_adjustments.push({
      zone_id: zoneId,
      r_loop_to_sink_base_k_per_w: rBase,
      r_vault_gas_environment_k_per_w: rVault,
      r_bubble_penalty_k_per_w: rBubble,
      r_loop_to_sink_effective_3b_k_per_w: rEffective,
      trace: lraTrace
    });
  }

  // Step 4: TEG bounded results
  const teg_bounded_results: TEGBoundedResult[] = [];
  // TEG branches resolved from _resolved_conversion_branches by runner context
  const allBranches = input.scenario['_resolved_conversion_branches'] as Record<string, unknown>[] | undefined ?? [];
  for (const branch of allBranches) {
    if ((branch['branch_type'] as string) === 'teg') {
      const tegResult = computeTEGBoundedOutput({
        branch_id: branch['branch_id'] as string,
        branch_type: 'teg',
        enabled: !!(branch['enabled'] ?? true),
        q_dot_input_w: (branch['q_dot_input_w'] as number | null) ?? null,
        efficiency_fraction: (branch['efficiency_fraction'] as number | null) ?? null,
        t_hot_source_k: (branch['t_hot_source_k'] as number | null) ?? null,
        t_cold_sink_k: (branch['t_cold_sink_k'] as number | null) ?? null,
        teg_carnot_fraction_cap: (branch['teg_carnot_fraction_cap'] as number | null) ?? 0.20,
        teg_residual_heat_on_node: (branch['teg_residual_heat_on_node'] as boolean | null) ?? true,
        teg_subordinate_to_rejection: (branch['teg_subordinate_to_rejection'] as boolean | null) ?? true
      });
      teg_bounded_results.push(tegResult);
      all_blocking.push(...tegResult.blocking_errors);
      all_warnings.push(...tegResult.warnings);
    }
  }

  // Step 5: Operating state effects
  const qDotComputeNominal = resolveNominalComputeHeat(input.baselineOr3AContext);
  const operating_state_effects = applyOperatingStateEffects(norm.operating_state, qDotComputeNominal);
  all_blocking.push(...operating_state_effects.blocking_errors);
  all_warnings.push(...operating_state_effects.warnings);

  // Step 6: Total reject bookkeeping — Spec §11.7
  const wDotPumpTotal = transport_parasitic_results.reduce((s, r) => s + r.w_dot_pump_w, 0);
  const qDotBaseReject = resolveBaseRejectHeat(input.baselineOr3AContext);
  const rejectResult = computeTotalRejectWith3B(qDotBaseReject, wDotPumpTotal, teg_bounded_results);
  transform_trace.push(...rejectResult.trace);

  transform_trace.push('run-extension-3b: complete');

  return {
    extension_3b_enabled: true,
    model_extension_3b_mode: norm.mode,
    spec_version: SPEC_VERSION,
    blueprint_version: BLUEPRINT_VERSION,
    vault_gas_environment_results,
    transport_parasitic_results,
    gas_management_results,
    loop_resistance_adjustments,
    teg_bounded_results,
    operating_state_effects,
    q_dot_total_reject_3b_w: rejectResult.q_dot_total_reject_3b_w,
    preset_provenance: norm.preset_provenance,
    blocking_errors: all_blocking,
    warnings: all_warnings,
    transform_trace
  };
}

// ---- Internal resolution helpers ----

function resolveBaseLoopResistance(
  zoneId: string,
  ctx: Extension3BInput['baselineOr3AContext']
): number | null {
  // Attempt to pull from 3A result zone outputs
  const result3A = ctx.extension3AResult as Record<string, unknown> | null | undefined;
  if (result3A) {
    const zoneResults = result3A['zone_results'] as Record<string, unknown>[] | undefined;
    if (zoneResults) {
      const zr = zoneResults.find(z => (z['zone_id'] as string) === zoneId);
      if (zr) {
        const rChain = zr['resistance_chain'] as Record<string, number | null> | undefined;
        return (rChain?.['r_loop_to_sink_k_per_w'] as number | null) ?? null;
      }
    }
  }
  return null;
}

function resolveCanonicalDensity(
  _zoneId: string,
  scenario: Record<string, unknown>
): number | null {
  // Attempt to pull density from working_fluid attached to scenario
  const fluids = scenario['_resolved_working_fluids'] as Record<string, unknown>[] | undefined;
  if (fluids && fluids.length > 0) {
    return (fluids[0]['density_basis_kg_per_m3'] as number | null) ?? null;
  }
  return null;
}

function resolveBaseRejectHeat(ctx: Extension3BInput['baselineOr3AContext']): number {
  const agg = ctx.aggregationResult as Record<string, unknown> | null | undefined;
  if (agg) {
    return (agg['q_dot_total_reject_w'] as number | null) ?? 0;
  }
  return 0;
}

function resolveNominalComputeHeat(ctx: Extension3BInput['baselineOr3AContext']): number | null {
  const agg = ctx.aggregationResult as Record<string, unknown> | null | undefined;
  if (agg) {
    return (agg['q_dot_compute_total_w'] as number | null) ?? null;
  }
  return null;
}
