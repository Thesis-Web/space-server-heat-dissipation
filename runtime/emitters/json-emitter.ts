/**
 * json-emitter.ts
 * Structured JSON result emitter.
 * Output contract: §34. Governed by §26.6, §9.2.
 * The runtime must not emit a single final viability truth value. §9.2.
 */

import { Flag, FlagEmitResult } from './flag-emitter';
import {
  RUNTIME_VERSION,
  BLUEPRINT_VERSION,
  ENGINEERING_SPEC_VERSION,
  SCHEMA_BUNDLE_VERSION,
} from '../constants/constants';

// ─── Output contract root §34.1 ───────────────────────────────────────────────

export interface ThermalOutputs {
  /** Q_dot_internal (W). §34.2 */
  q_dot_internal_w: number;
  /** Q_dot_external (W). §34.2 */
  q_dot_external_w: number;
  /** Q_dot_total_reject (W). §34.2 */
  q_dot_total_reject_w: number;
  /** Zone temperatures (K). §34.2 */
  t_zone_a_k: number | null;
  t_zone_b_k: number | null;
  t_zone_c_k: number | null;
  t_zone_d_k: number | null;
  /** Radiator target temperature (K). §34.2 */
  t_radiator_target_k: number;
  /** Radiator effective area (m²) before margin. §34.2 */
  a_radiator_effective_m2: number;
  /** Radiator area with reserve margin (m²). §34.2 */
  a_radiator_with_margin_m2: number;
  /** Storage usable energy (J). §34.2 */
  storage_energy_usable_j: number;
  /** Sum of all stage losses (W). §34.2 */
  stage_losses_w: number;
}

export interface ElectricalOutputs {
  /** Compute electrical draw (W). §34.3 */
  w_dot_compute_w: number;
  /** Non-compute electrical draw (W). §34.3 */
  w_dot_non_compute_w: number;
  /** Parasitic draw (W). §34.3 */
  w_dot_parasitic_w: number;
  /** Branch-generated power (W). §34.3 */
  w_dot_branch_generated_w: number;
  /** Branch-consumed power (W). §34.3 */
  w_dot_branch_consumed_w: number;
  /** Net electrical margin (W) if modeled. §34.3 */
  w_dot_net_margin_w: number | null;
}

export interface PackagingOutputs {
  /** Total mass estimate (kg) if sufficient fields available. §34.4 */
  mass_estimate_total_kg: number | null;
  /** Radiator mass estimate (kg). §34.4 */
  mass_estimate_radiator_kg: number | null;
  /** Storage mass estimate (kg). §34.4 */
  mass_estimate_storage_kg: number | null;
  /** Packaging notes. §34.4 */
  packaging_notes: string;
}

export interface Assumption {
  field: string;
  value: number | string;
  source: 'operator-estimated' | 'sourced' | 'inferred' | 'default' | 'research-required';
  note?: string;
}

export interface RuntimeResult {
  /** Unique run identifier. §34.1 */
  run_id: string;
  /** Version declarations. §34.1, §6.3 */
  runtime_version: string;
  blueprint_version: string;
  engineering_spec_version: string;
  schema_bundle_version: string;
  /** Scenario reference. §34.1 */
  scenario_id: string;
  load_state: string;
  /** Outputs. §34.1 */
  outputs: {
    thermal: ThermalOutputs;
    electrical: ElectricalOutputs;
    packaging: PackagingOutputs;
  };
  /** Structured flags. §34.1, §35 */
  flags: Flag[];
  flag_summary: FlagEmitResult;
  /** Declared assumptions surfaced in output. §4.3, §9.2, §34.1 */
  assumptions: Assumption[];
  /** Uncertainty and derivation notes. §9.2, §34.1 */
  notes: string[];
  /** ISO timestamp of run. */
  generated_at: string;
}

// ─── Emitter function ─────────────────────────────────────────────────────────

export function emitStructuredResult(
  scenario_id: string,
  load_state: string,
  thermal: ThermalOutputs,
  electrical: ElectricalOutputs,
  packaging: PackagingOutputs,
  flags: Flag[],
  flag_summary: FlagEmitResult,
  assumptions: Assumption[],
  notes: string[],
  run_id?: string
): RuntimeResult {
  return {
    run_id: run_id ?? `run-${scenario_id}-${Date.now()}`,
    runtime_version: RUNTIME_VERSION,
    blueprint_version: BLUEPRINT_VERSION,
    engineering_spec_version: ENGINEERING_SPEC_VERSION,
    schema_bundle_version: SCHEMA_BUNDLE_VERSION,
    scenario_id,
    load_state,
    outputs: { thermal, electrical, packaging },
    flags,
    flag_summary,
    assumptions,
    notes,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Serialize result to indented JSON string.
 * §9.2 — SI values must remain present in structured output.
 */
export function serializeResult(result: RuntimeResult): string {
  return JSON.stringify(result, null, 2);
}

// =============================================================================
// Extension 4 JSON serialization path
// Governing law: ext4-spec-v0.1.4 §18.1
// Blueprint: blueprint-v0.1.4 §Phase-6-Output-and-Render
//
// Serialize ext4 through packet serialization only.
// Do not flatten extension_4_result into unrelated top-level fields. §18.1.
// =============================================================================

import type { Extension4Result } from '../../types/extension-4.d';

/**
 * Attach extension_4_result to a run-packet JSON payload object.
 * Called during packet serialization when ext4 was executed.
 * Per §18.1: serialize through packet only — no top-level flattening.
 *
 * @param packet  Mutable packet object being assembled for serialization.
 * @param result  Extension4Result from runExtension4.
 */
export function attachExt4ResultToPacket(
  packet: Record<string, unknown>,
  result: Extension4Result
): void {
  // §6.1 — attaches under extension_4_result only
  packet['extension_4_result'] = result;
  // Mirror scenario fields per §6.1 packet contract
  packet['enable_model_extension_4'] = result.extension_4_enabled;
  packet['model_extension_4_mode']   = result.model_extension_4_mode;
}

/**
 * Serialize extension_4_result to a standalone JSON string.
 * For use in run-packet bundle emission or debug output.
 * §18.1 — no flattening into unrelated top-level fields.
 */
export function serializeExt4Result(result: Extension4Result): string {
  return JSON.stringify(result, null, 2);
}
