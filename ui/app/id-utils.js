/**
 * id-utils.js — deterministic identifier helpers
 * Governing law: ui-expansion-spec-v0.1.5 §19
 *
 * All ids for payload blocks, branch blocks, zones, and generated compatibility
 * objects must be stable and order-sensitive per spec §19.3.
 * Browser environment: uses SubtleCrypto for SHA-256 where available,
 * falls back to a deterministic djb2-based hex string.
 */

"use strict";

/**
 * djb2-based deterministic 16-char hex string (browser fallback).
 * Not cryptographic; used only when SubtleCrypto is unavailable.
 */
function djb2Hex(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  // produce 16 hex chars by hashing again with a salt
  let h2 = 0xdeadbeef;
  for (let i = str.length - 1; i >= 0; i--) {
    h2 = ((h2 << 5) + h2) ^ str.charCodeAt(i);
    h2 = h2 >>> 0;
  }
  return (h.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0"));
}

/**
 * Deterministic payload block id.
 * Spec §19.1: stable ids required for payload blocks.
 * Spec §19.3: reordering blocks produces a new id.
 */
export function payloadBlockId(archetype_id, label, index) {
  const basis = `payload-block|${index}|${archetype_id}|${label}`;
  return "pb-" + djb2Hex(basis);
}

/**
 * Deterministic branch block id.
 */
export function branchBlockId(branch_type, branch_variant, index) {
  const basis = `branch-block|${index}|${branch_type}|${branch_variant}`;
  return "bb-" + djb2Hex(basis);
}

/**
 * Deterministic scenario id from seed + node_class + mission_mode.
 * Spec §19.1: scenario id is stable over unchanged ordered inputs.
 */
export function scenarioIdFromSeed(seed, node_class, mission_mode, architecture_class) {
  const basis = `scenario|${seed}|${node_class}|${mission_mode}|${architecture_class}`;
  return "sc-" + djb2Hex(basis);
}

/**
 * Deterministic generated comms-load aggregate payload id.
 * Spec §9.5 / §19.2: id basis is type + ordered block ids + values + schema version.
 */
export function generatedCommsLoadId(block_ids, block_values_json, schema_version) {
  const basis = `comms-load-aggregate|${schema_version}|${block_ids.join(",")}|${block_values_json}`;
  return "gen-comms-" + djb2Hex(basis);
}

/**
 * Packet id from scenario id + timestamp.
 * Spec §19.1: bundle ids may include timestamp component.
 */
export function packetId(scenario_id, iso_timestamp) {
  return `pkt-${scenario_id}-${iso_timestamp.replace(/[^0-9TZ]/g, "")}`;
}
