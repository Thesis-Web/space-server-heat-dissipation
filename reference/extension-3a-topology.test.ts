/**
 * Extension 3A topology tests — 3A-spec §16.2
 * Tests: acyclic chains, self-loop, cycles, disconnected isolated, parallel zones
 */

import { validateTopology, type TopologyZoneInput } from '../runtime/validators/topology';

describe('3A topology validation — spec §16.2', () => {

  test('acyclic 3-zone chain passes — spec §16.2', () => {
    const zones: TopologyZoneInput[] = [
      { zone_id: 'zone-a', upstream_zone_ref: null,     downstream_zone_ref: 'zone-b', flow_direction: 'source' },
      { zone_id: 'zone-b', upstream_zone_ref: 'zone-a', downstream_zone_ref: 'zone-c', flow_direction: 'bidirectional' },
      { zone_id: 'zone-c', upstream_zone_ref: 'zone-b', downstream_zone_ref: null,     flow_direction: 'sink' },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.cycle_detected).toBe(false);
    expect(result.valid).toBe(true);
    expect(result.topology_order).toHaveLength(3);
    expect(result.topology_order[0]).toBe('zone-a');
    expect(result.topology_order[2]).toBe('zone-c');
  });

  test('self-loop fails — spec §16.2', () => {
    // Cross-reference validator catches self-ref before topology
    // topology builds graph; self-edge creates degree issue
    const zones: TopologyZoneInput[] = [
      { zone_id: 'zone-self', upstream_zone_ref: 'zone-self', downstream_zone_ref: null, flow_direction: 'source' },
    ];
    // Self-ref creates an in-degree of 1 on the only node, Kahn cannot drain it → cycle
    const result = validateTopology(zones, 'blocking');
    expect(result.cycle_detected).toBe(true);
    expect(result.valid).toBe(false);
  });

  test('3-zone directed cycle fails under blocking policy — spec §16.2', () => {
    const zones: TopologyZoneInput[] = [
      { zone_id: 'zone-a', upstream_zone_ref: 'zone-c', downstream_zone_ref: 'zone-b', flow_direction: 'bidirectional' },
      { zone_id: 'zone-b', upstream_zone_ref: 'zone-a', downstream_zone_ref: 'zone-c', flow_direction: 'bidirectional' },
      { zone_id: 'zone-c', upstream_zone_ref: 'zone-b', downstream_zone_ref: 'zone-a', flow_direction: 'bidirectional' },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.cycle_detected).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.severity === 'error')).toBe(true);
  });

  test('3-zone cycle downgrades to warning under warn_only policy — spec §16.2', () => {
    const zones: TopologyZoneInput[] = [
      { zone_id: 'zone-a', upstream_zone_ref: 'zone-c', downstream_zone_ref: 'zone-b', flow_direction: 'bidirectional' },
      { zone_id: 'zone-b', upstream_zone_ref: 'zone-a', downstream_zone_ref: 'zone-c', flow_direction: 'bidirectional' },
      { zone_id: 'zone-c', upstream_zone_ref: 'zone-b', downstream_zone_ref: 'zone-a', flow_direction: 'bidirectional' },
    ];
    const result = validateTopology(zones, 'warn_only');
    expect(result.cycle_detected).toBe(true);
    expect(result.valid).toBe(true); // no blocking errors under warn_only
    expect(result.warnings.some(w => w.severity === 'warning')).toBe(true);
  });

  test('disconnected isolated zone warns only — spec §16.2', () => {
    const zones: TopologyZoneInput[] = [
      { zone_id: 'zone-isolated', upstream_zone_ref: null, downstream_zone_ref: null, flow_direction: 'isolated' },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.valid).toBe(true);
    // No error — isolated with no neighbors is permitted
    expect(result.violations.filter(v => v.severity === 'error')).toHaveLength(0);
  });

  test('disconnected non-isolated zone warns — spec §16.2', () => {
    const zones: TopologyZoneInput[] = [
      { zone_id: 'zone-lone', upstream_zone_ref: null, downstream_zone_ref: null, flow_direction: 'source' },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.valid).toBe(true); // warning not blocking
    expect(result.warnings.some(w => w.zone_id === 'zone-lone')).toBe(true);
  });

  test('parallel zones at same level pass as distinct zone objects — spec §16.2', () => {
    // Two hot islands with no declared upstream/downstream between them — both valid
    const zones: TopologyZoneInput[] = [
      { zone_id: 'hot-island-a', upstream_zone_ref: null, downstream_zone_ref: 'zone-rad', flow_direction: 'source', isolation_boundary: false },
      { zone_id: 'hot-island-b', upstream_zone_ref: null, downstream_zone_ref: 'zone-rad', flow_direction: 'source', isolation_boundary: false },
      { zone_id: 'zone-rad',     upstream_zone_ref: null, downstream_zone_ref: null,       flow_direction: 'sink',   isolation_boundary: false },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.cycle_detected).toBe(false);
    expect(result.valid).toBe(true);
  });

  test('isolation_boundary=true with missing bridge_resistance blocks — spec §13.1', () => {
    const zones = [
      { zone_id: 'zone-iso', upstream_zone_ref: null, downstream_zone_ref: null,
        flow_direction: 'isolated' as const, isolation_boundary: true,
        bridge_resistance_k_per_w: null },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.valid).toBe(false);
    expect(result.violations.some(v => v.severity === 'error' && v.zone_id === 'zone-iso')).toBe(true);
  });

  test('isolation_boundary=true with valid bridge_resistance passes — spec §13.1', () => {
    const zones = [
      { zone_id: 'zone-iso', upstream_zone_ref: null, downstream_zone_ref: null,
        flow_direction: 'isolated' as const, isolation_boundary: true,
        bridge_resistance_k_per_w: 0.015 },
    ];
    const result = validateTopology(zones, 'blocking');
    expect(result.violations.filter(v => v.severity === 'error')).toHaveLength(0);
  });
});
