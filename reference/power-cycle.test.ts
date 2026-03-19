/**
 * power-cycle.test.ts
 * Reference cases for power-cycle Carnot bounds.
 * Governing spec: §12.7, §14.4, Appendix B cases 4, 7.
 * §46 prohibition tested here (case 7).
 */

import { computeCarnotEngineBound, computePowerCycle } from '../runtime/formulas/power-cycle';

describe('Reference cases — power cycle (Appendix B, §46)', () => {

  // ── Appendix B case 4 — Carnot engine bound ───────────────────────────────
  it('Appendix B case 4: Carnot engine at T_hot=350K, T_cold=300K', () => {
    const r = computeCarnotEngineBound({ t_hot_k: 350, t_cold_k: 300 });
    // eta = 1 - 300/350 = 0.142857...
    expect(Math.abs(r.eta_carnot_engine - (1 - 300 / 350))).toBeLessThan(1e-9);
  });

  // ── Appendix B case 7 — §46 rejection of invalid source logic ────────────
  it('Appendix B case 7: rejects power-cycle with T_hot <= T_cold (§30.1)', () => {
    expect(() =>
      computePowerCycle({
        q_dot_hot_source_w: 100_000,
        eta_cycle_actual: 0.1,
        t_hot_source_k: 300,
        t_cold_sink_k: 300,
      })
    ).toThrow(/PROHIBITED.*§30.1/);
  });

  it('Appendix B case 7b: rejects eta > Carnot (§46)', () => {
    const carnot = computeCarnotEngineBound({ t_hot_k: 800, t_cold_k: 330 });
    expect(() =>
      computePowerCycle({
        q_dot_hot_source_w: 100_000,
        eta_cycle_actual: carnot.eta_carnot_engine + 0.001,
        t_hot_source_k: 800,
        t_cold_sink_k: 330,
      })
    ).toThrow(/PROHIBITED.*§46/);
  });

  // ── Power-cycle energy balance §12.10 ─────────────────────────────────────
  it('W_dot_cycle = eta * Q_dot_hot_source (§12.10)', () => {
    const r = computePowerCycle({
      q_dot_hot_source_w: 200_000,
      eta_cycle_actual: 0.25,
      t_hot_source_k: 800,
      t_cold_sink_k: 330,
    });
    expect(Math.abs(r.w_dot_cycle_w - 50_000)).toBeLessThan(0.01);
    expect(Math.abs(r.q_dot_waste_w - 150_000)).toBeLessThan(0.01);
  });
});
