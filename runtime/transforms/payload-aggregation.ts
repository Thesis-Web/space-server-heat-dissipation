/**
 * Payload aggregation transform — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §9.3–9.5, §18.1, §20
 *
 * Compiles additive UI payload blocks into a deterministic canonical comms-load object.
 * Generated file disclosed in transform_trace per spec §20.
 */

import { aggregateCommsLoad, DutyMode } from "../formulas/loads";
import { createHash } from "crypto";

export interface AdditivePayloadBlock {
  payload_block_id: string;
  archetype_id: string;
  label: string;
  rf_comms_power_w: number;
  telemetry_power_w: number;
  radar_power_w: number;
  optical_crosslink_power_w: number;
  duty_mode: DutyMode;
  duty_fraction: number;
  thermal_coupling_zone_ref: string;
  research_required: boolean;
  notes: string;
}

export interface GeneratedCommsLoad {
  payload_id: string;
  label: string;
  rf_comms_power_w: number;
  telemetry_power_w: number;
  radar_power_w: number;
  optical_crosslink_power_w: number;
  duty_mode: "continuous";
  duty_fraction: 1.0;
  generated_from_additive_blocks: true;
  source_block_ids: string[];
}

/**
 * Deterministic id for generated aggregate payload.
 * Spec §19.2: stable ordered digest over type + ordered block ids + ordered values + schema version.
 */
export function deterministicPayloadId(blocks: AdditivePayloadBlock[], schema_version: string): string {
  const ordered = blocks.map((b) =>
    [b.payload_block_id, b.rf_comms_power_w, b.telemetry_power_w, b.radar_power_w, b.optical_crosslink_power_w, b.duty_mode, b.duty_fraction].join("|")
  );
  const digest_input = `comms-load-aggregate|${schema_version}|${ordered.join(",")}`;
  return "gen-comms-" + createHash("sha256").update(digest_input).digest("hex").slice(0, 16);
}

/**
 * Compile additive payload blocks to a canonical comms-load aggregate.
 * Spec §9.3: duty_factor continuous→1.0, uniform→duty_fraction, per_subsystem→duty_fraction.
 * Generated object disclosed in transform_trace.
 */
export function compileAdditivePayloads(
  blocks: AdditivePayloadBlock[],
  schema_version: string
): { payload: GeneratedCommsLoad; transform_trace_entry: string; has_per_subsystem: boolean } {
  const aggregated = aggregateCommsLoad(blocks);
  const has_per_subsystem = blocks.some((b) => b.duty_mode === "per_subsystem");
  const payload_id = deterministicPayloadId(blocks, schema_version);

  const payload: GeneratedCommsLoad = {
    payload_id,
    label: "Generated aggregate non-compute payload",
    rf_comms_power_w: aggregated.rf_comms_power_w,
    telemetry_power_w: aggregated.telemetry_power_w,
    radar_power_w: aggregated.radar_power_w,
    optical_crosslink_power_w: aggregated.optical_crosslink_power_w,
    duty_mode: "continuous",
    duty_fraction: 1.0,
    generated_from_additive_blocks: true,
    source_block_ids: blocks.map((b) => b.payload_block_id),
  };

  const trace = `additive-payload-aggregation: ${blocks.length} block(s) → ${payload_id}${has_per_subsystem ? " [per_subsystem simplified to aggregate duty_fraction]" : ""}`;

  return { payload, transform_trace_entry: trace, has_per_subsystem };
}
