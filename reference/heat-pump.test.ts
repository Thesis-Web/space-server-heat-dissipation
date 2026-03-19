/**
 * heat-pump.test.ts
 * Reference cases for heat-pump Carnot bounds and heat-lift.
 * Governing spec: §14.4 (Appendix B cases 4–5), §29.2, §46 (case 8).
 * Tolerance: ±0.5% per §42.
 */

import { computeCarnotHeatPumpBound, computeHeatLift } from '../runtime/formulas/heat-pump';

const TOL = 0.005;

function assertWithinTol(actual: number, expected: number, label: string): void {
  const relErr = Math.abs(actual - expected) / expected;
  expect(relErr).toBeLessThanOrEqual(TOL);
}

describe('Reference cases — heat pump Carnot bounds (§14.4, Appendix B)', () => {

  // ── §14.4 — Carnot heat-pump bound examples ───────────────────────────────
  it('T_cold=330K, T_hot=800K → COP_carnot ≈ 1.702', () => {
    const r = computeCarnotHeatPumpBound({ t_cold_k: 330, t_hot_k: 800 });
    assertWithinTol(r.cop_heating_carnot, 1.702, 'COP_carnot 330→800K');
  });

  it('T_cold=330K, T_hot=1000K → COP_carnot ≈ 1.493', () => {
    const r = computeCarnotHeatPumpBound({ t_cold_k: 330, t_hot_k: 1000 });
    assertWithinTol(r.cop_heating_carnot, 1.493, 'COP_carnot 330→1000K');
  });

  // ── Appendix B case 8 — §46 prohibition ──────────────────────────────────
  it('Appendix B case 8: runtime rejects COP > Carnot bound (§46)', () => {
    const carnot = computeCarnotHeatPumpBound({ t_cold_k: 330, t_hot_k: 800 });
    const over_carnot_cop = carnot.cop_heating_carnot + 0.001;
    expect(() =>
      computeHeatLift({
        q_dot_cold_w: 50_000,
        cop_heating_actual: over_carnot_cop,
        t_cold_source_k: 330,
        t_hot_delivery_k: 800,
      })
    ).toThrow(/PROHIBITED.*§46/);
  });

  // ── Heat-lift energy balance §12.9 ───────────────────────────────────────
  it('Heat-lift energy balance: Q_hot = Q_cold + W_in (§12.9)', () => {
    const r = computeHeatLift({
      q_dot_cold_w: 40_000,
      cop_heating_actual: 1.5,
      t_cold_source_k: 330,
      t_hot_delivery_k: 800,
    });
    expect(Math.abs(r.q_dot_hot_w - (r.q_dot_cold_w + r.w_dot_input_w))).toBeLessThan(0.01);
  });

  it('T_hot must be > T_cold or error', () => {
    expect(() =>
      computeCarnotHeatPumpBound({ t_cold_k: 800, t_hot_k: 330 })
    ).toThrow(/must be > t_cold_k/);
  });
});
