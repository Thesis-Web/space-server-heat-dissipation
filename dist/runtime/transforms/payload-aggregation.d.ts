/**
 * Payload aggregation transform — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §9.3–9.5, §18.1, §20
 *
 * Compiles additive UI payload blocks into a deterministic canonical comms-load object.
 * Generated file disclosed in transform_trace per spec §20.
 */
import { DutyMode } from "../formulas/loads";
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
export declare function deterministicPayloadId(blocks: AdditivePayloadBlock[], schema_version: string): string;
/**
 * Compile additive payload blocks to a canonical comms-load aggregate.
 * Spec §9.3: duty_factor continuous→1.0, uniform→duty_fraction, per_subsystem→duty_fraction.
 * Generated object disclosed in transform_trace.
 */
export declare function compileAdditivePayloads(blocks: AdditivePayloadBlock[], schema_version: string): {
    payload: GeneratedCommsLoad;
    transform_trace_entry: string;
    has_per_subsystem: boolean;
};
//# sourceMappingURL=payload-aggregation.d.ts.map