/**
 * extension-3a-chain-topology.test.ts
 * Reference tests for zone chain boundary validation rules ZC-001, ZC-002, ZC-003.
 * Governing law: zone-chain-spec-addition-v0.1.2 §3.
 * Pinned: engineering-spec-v0.1.0 §19.3, §28.1; blueprint-v0.1.1 §14.1.
 */

import { validateChainBoundaries } from '../runtime/validators/cross-reference';

test('ZC-001 PASS: two chains via convergence_exchange — no violation', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: 'cold_hexe',   zone_role: 'standard',            convergence_enabled: false, downstream_zone_ref: 'zone-002', upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: 'cold_hexe',   zone_role: 'convergence_exchange', convergence_enabled: true,  downstream_zone_ref: 'zone-003', upstream_zone_ref: 'zone-001' },
    { zone_id: 'zone-003', chain_id: 'backbone_nak',zone_role: 'standard',            convergence_enabled: false, downstream_zone_ref: null,       upstream_zone_ref: 'zone-002' },
  ];
  const v = validateChainBoundaries(zones).filter(x => !x.message.startsWith('[WARNING-ZC-003]'));
  expect(v).toHaveLength(0);
});

test('ZC-001 PASS: two chains via convergence_enabled=true — no violation', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: 'cold_hexe',   zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: 'zone-002', upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: 'cold_hexe',   zone_role: 'standard', convergence_enabled: true,  downstream_zone_ref: 'zone-003', upstream_zone_ref: 'zone-001' },
    { zone_id: 'zone-003', chain_id: 'backbone_nak',zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: null,       upstream_zone_ref: 'zone-002' },
  ];
  const v = validateChainBoundaries(zones).filter(x => !x.message.startsWith('[WARNING-ZC-003]'));
  expect(v).toHaveLength(0);
});

test('ZC-001 FAIL: cross-chain without HX — blocking violation', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: 'cold_hexe',   zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: 'zone-002', upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: 'backbone_nak',zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: null,       upstream_zone_ref: 'zone-001' },
  ];
  const v = validateChainBoundaries(zones).filter(x => !x.message.startsWith('[WARNING-ZC-003]'));
  expect(v).toHaveLength(1);
  expect(v[0].message).toContain('cross_chain_handoff_without_hx_declared');
});

test('ZC-002 PASS: singleton (no chain_id) connects freely', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: null,          zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: 'zone-002', upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: 'backbone_nak',zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: null,       upstream_zone_ref: 'zone-001' },
  ];
  const v = validateChainBoundaries(zones).filter(x => !x.message.startsWith('[WARNING-ZC-003]'));
  expect(v).toHaveLength(0);
});

test('ZC-002 PASS: all zones without chain_id — no violations', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: null, zone_role: 'compute_vault',   convergence_enabled: false, downstream_zone_ref: 'zone-002', upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: null, zone_role: 'hx_boundary',     convergence_enabled: false, downstream_zone_ref: 'zone-003', upstream_zone_ref: 'zone-001' },
    { zone_id: 'zone-003', chain_id: null, zone_role: 'radiator_emitter', convergence_enabled: false, downstream_zone_ref: null,       upstream_zone_ref: 'zone-002' },
  ];
  expect(validateChainBoundaries(zones)).toHaveLength(0);
});

test('ZC-003 WARNING: same chain_id, no connection — warning emitted', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: 'cold_hexe', zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: null, upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: 'cold_hexe', zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: null, upstream_zone_ref: null },
  ];
  const w = validateChainBoundaries(zones).filter(x => x.message.startsWith('[WARNING-ZC-003]'));
  expect(w.length).toBeGreaterThan(0);
});

test('ZC-003 PASS: same chain connected — no warning', () => {
  const zones = [
    { zone_id: 'zone-001', chain_id: 'cold_hexe', zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: 'zone-002', upstream_zone_ref: null },
    { zone_id: 'zone-002', chain_id: 'cold_hexe', zone_role: 'standard', convergence_enabled: false, downstream_zone_ref: null,       upstream_zone_ref: 'zone-001' },
  ];
  const w = validateChainBoundaries(zones).filter(x => x.message.startsWith('[WARNING-ZC-003]'));
  expect(w).toHaveLength(0);
});

test('Three-loop: He-Xe -> eutectic -> NaK with two HX boundaries — all pass', () => {
  const zones = [
    { zone_id: 'z1', chain_id: 'cold_hexe',      zone_role: 'standard',            convergence_enabled: false, downstream_zone_ref: 'z2', upstream_zone_ref: null },
    { zone_id: 'z2', chain_id: 'cold_hexe',      zone_role: 'convergence_exchange', convergence_enabled: true,  downstream_zone_ref: 'z3', upstream_zone_ref: 'z1' },
    { zone_id: 'z3', chain_id: 'regen_eutectic', zone_role: 'standard',            convergence_enabled: false, downstream_zone_ref: 'z4', upstream_zone_ref: 'z2' },
    { zone_id: 'z4', chain_id: 'regen_eutectic', zone_role: 'convergence_exchange', convergence_enabled: true,  downstream_zone_ref: 'z5', upstream_zone_ref: 'z3' },
    { zone_id: 'z5', chain_id: 'backbone_nak',   zone_role: 'standard',            convergence_enabled: false, downstream_zone_ref: 'z6', upstream_zone_ref: 'z4' },
    { zone_id: 'z6', chain_id: 'backbone_nak',   zone_role: 'radiator_emitter',    convergence_enabled: false, downstream_zone_ref: null,  upstream_zone_ref: 'z5' },
  ];
  const blocking = validateChainBoundaries(zones).filter(x => !x.message.startsWith('[WARNING-ZC-003]'));
  expect(blocking).toHaveLength(0);
});
