/**
 * Extension 3A resistance chain tests — 3A-spec §16.4
 */

import { computeResistanceChain, computeBridgeHeatTransfer } from '../runtime/formulas/resistance-chain';
import { validateResistanceChain } from '../runtime/validators/extension-3a-bounds';

describe('3A resistance chain — spec §16.4', () => {

  test('full chain with all terms produces correct R_total and T_junction — §11.3, §16.4', () => {
    const result = computeResistanceChain(
      {
        r_junction_to_case_k_per_w: 0.005,
        r_case_to_spreader_k_per_w: 0.003,
        r_spreader_to_pickup_nominal_k_per_w: 0.008,
        r_pickup_to_loop_k_per_w: 0.004,
        r_loop_to_sink_k_per_w: 0.002,
        nominal_resistance_multiplier: 1.0,
        bridge_resistance_k_per_w_if_isolated: 0.0,
      },
      1000,   // Q_load = 1000 W
      300,    // T_sink = 300 K
    );
    // R_total = 0.005+0.003+0.008+0.004+0.002 = 0.022 K/W
    expect(result.r_total_k_per_w).toBeCloseTo(0.022, 6);
    // T_junction = 300 + 1000*0.022 = 322 K
    expect(result.t_junction_k).toBeCloseTo(322.0, 4);
  });

  test('pickup geometry multiplier changes effective resistance — §8.4, §16.4', () => {
    const resultBaseline = computeResistanceChain({
      r_junction_to_case_k_per_w: null,
      r_case_to_spreader_k_per_w: null,
      r_spreader_to_pickup_nominal_k_per_w: 0.01,
      r_pickup_to_loop_k_per_w: null,
      r_loop_to_sink_k_per_w: null,
      nominal_resistance_multiplier: 1.0,
      bridge_resistance_k_per_w_if_isolated: 0,
    });
    const resultDoubled = computeResistanceChain({
      r_junction_to_case_k_per_w: null,
      r_case_to_spreader_k_per_w: null,
      r_spreader_to_pickup_nominal_k_per_w: 0.01,
      r_pickup_to_loop_k_per_w: null,
      r_loop_to_sink_k_per_w: null,
      nominal_resistance_multiplier: 2.0,
      bridge_resistance_k_per_w_if_isolated: 0,
    });
    expect(resultDoubled.r_total_k_per_w).toBeCloseTo(resultBaseline.r_total_k_per_w * 2, 6);
  });

  test('null resistance chain (all terms absent) produces zero total — §11.3, §16.4', () => {
    const result = computeResistanceChain({
      r_junction_to_case_k_per_w: null,
      r_case_to_spreader_k_per_w: null,
      r_spreader_to_pickup_nominal_k_per_w: null,
      r_pickup_to_loop_k_per_w: null,
      r_loop_to_sink_k_per_w: null,
      nominal_resistance_multiplier: 1.0,
      bridge_resistance_k_per_w_if_isolated: 0,
    });
    expect(result.r_total_k_per_w).toBe(0);
  });

  test('null chain with declared load emits warning — §13.5, §16.4', () => {
    const violations = validateResistanceChain(
      { zone_id: 'zone-null-chain', resistance_chain: {
        r_junction_to_case_k_per_w: null,
        r_case_to_spreader_k_per_w: null,
        r_spreader_to_pickup_nominal_k_per_w: null,
        r_pickup_to_loop_k_per_w: null,
        r_loop_to_sink_k_per_w: null,
      }},
      true
    );
    expect(violations.some(v => v.severity === 'warning')).toBe(true);
  });

  test('negative resistance term is blocking error — §13.5, §16.4', () => {
    const violations = validateResistanceChain(
      { zone_id: 'zone-neg', resistance_chain: {
        r_junction_to_case_k_per_w: -0.001,
        r_case_to_spreader_k_per_w: null,
        r_spreader_to_pickup_nominal_k_per_w: null,
        r_pickup_to_loop_k_per_w: null,
        r_loop_to_sink_k_per_w: null,
      }},
      true
    );
    expect(violations.some(v => v.severity === 'error' && v.field.includes('r_junction_to_case'))).toBe(true);
  });

  test('bridge heat transfer law: Q = (T_up - T_down) / R — §11.2', () => {
    const q = computeBridgeHeatTransfer(900, 800, 0.015);
    // Q = (900-800)/0.015 = 6666.67 W
    expect(q).toBeCloseTo(6666.67, 1);
  });

  test('bridge R=0 throws — §11.2', () => {
    expect(() => computeBridgeHeatTransfer(900, 800, 0)).toThrow();
  });
});
