"use strict";
/**
 * Payload aggregation transform — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §9.3–9.5, §18.1, §20
 *
 * Compiles additive UI payload blocks into a deterministic canonical comms-load object.
 * Generated file disclosed in transform_trace per spec §20.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deterministicPayloadId = deterministicPayloadId;
exports.compileAdditivePayloads = compileAdditivePayloads;
const loads_1 = require("../formulas/loads");
const crypto_1 = require("crypto");
/**
 * Deterministic id for generated aggregate payload.
 * Spec §19.2: stable ordered digest over type + ordered block ids + ordered values + schema version.
 */
function deterministicPayloadId(blocks, schema_version) {
    const ordered = blocks.map((b) => [b.payload_block_id, b.rf_comms_power_w, b.telemetry_power_w, b.radar_power_w, b.optical_crosslink_power_w, b.duty_mode, b.duty_fraction].join("|"));
    const digest_input = `comms-load-aggregate|${schema_version}|${ordered.join(",")}`;
    return "gen-comms-" + (0, crypto_1.createHash)("sha256").update(digest_input).digest("hex").slice(0, 16);
}
/**
 * Compile additive payload blocks to a canonical comms-load aggregate.
 * Spec §9.3: duty_factor continuous→1.0, uniform→duty_fraction, per_subsystem→duty_fraction.
 * Generated object disclosed in transform_trace.
 */
function compileAdditivePayloads(blocks, schema_version) {
    const aggregated = (0, loads_1.aggregateCommsLoad)(blocks);
    const has_per_subsystem = blocks.some((b) => b.duty_mode === "per_subsystem");
    const payload_id = deterministicPayloadId(blocks, schema_version);
    const payload = {
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
//# sourceMappingURL=payload-aggregation.js.map