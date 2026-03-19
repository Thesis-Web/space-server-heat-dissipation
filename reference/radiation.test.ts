/**
 * radiation.test.ts
 * Mandatory reference cases for radiator sizing.
 * Governing spec: §14.1, §14.2, §14.3 (Appendix B cases 1–3).
 * Tolerance: ±0.5% for closed-form; ±2% for rounded displayed values. §42.
 */

import { computeRadiatorArea } from '../runtime/formulas/radiation';

const TOL = 0.005; // ±0.5% per §42

function assertWithinTol(actual: number, expected: number, label: string): void {
  const relErr = Math.abs(actual - expected) / expected;
  if (relErr > TOL) {
    throw new Error(
      `REFERENCE CASE FAIL: ${label}\n` +
      `  Expected: ${expected.toFixed(4)}\n` +
      `  Actual:   ${actual.toFixed(4)}\n` +
      `  Rel err:  ${(relErr * 100).toFixed(4)}%  (limit: ${(TOL * 100).toFixed(1)}%)`
    );
  }
}

describe('Reference cases — radiator sizing (§14.1–14.3, Appendix B)', () => {

  const EPSILON = 0.9;
  const T_SINK = 0;
  const NO_MARGIN = 0;

  // ── §14.1 — 1 MW reference cases ─────────────────────────────────────────
  describe('§14.1 — 1 MW radiator cases', () => {
    it('1 MW at 350 K → A ≈ 1306 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 1_000_000,
        t_radiator_target_k: 350,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 1306, '1MW@350K');
    });

    it('1 MW at 600 K → A ≈ 151 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 1_000_000,
        t_radiator_target_k: 600,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 151, '1MW@600K');
    });

    it('1 MW at 800 K → A ≈ 48 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 1_000_000,
        t_radiator_target_k: 800,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 48, '1MW@800K');
    });
  });

  // ── §14.2 — 300 kW reference cases ───────────────────────────────────────
  describe('§14.2 — 300 kW radiator cases', () => {
    it('300 kW at 600 K → A ≈ 45.36 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 300_000,
        t_radiator_target_k: 600,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 45.36, '300kW@600K');
    });

    it('300 kW at 800 K → A ≈ 14.35 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 300_000,
        t_radiator_target_k: 800,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 14.35, '300kW@800K');
    });

    it('300 kW at 1000 K → A ≈ 5.88 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 300_000,
        t_radiator_target_k: 1000,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 5.88, '300kW@1000K');
    });
  });

  // ── §14.3 — 50 kW reference cases ────────────────────────────────────────
  describe('§14.3 — 50 kW radiator cases', () => {
    it('50 kW at 600 K → A ≈ 7.56 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 50_000,
        t_radiator_target_k: 600,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 7.56, '50kW@600K');
    });

    it('50 kW at 800 K → A ≈ 2.39 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 50_000,
        t_radiator_target_k: 800,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 2.39, '50kW@800K');
    });

    it('50 kW at 1200 K → A ≈ 0.4725 m²', () => {
      const r = computeRadiatorArea({
        q_dot_required_w: 50_000,
        t_radiator_target_k: 1200,
        emissivity: EPSILON,
        t_sink_effective_k: T_SINK,
        reserve_margin_fraction: NO_MARGIN,
      });
      assertWithinTol(r.a_radiator_effective_m2, 0.4725, '50kW@1200K');
    });
  });

  // ── Margin application §32.3 ─────────────────────────────────────────────
  it('Margin is correctly applied to effective area (§32.3)', () => {
    const r = computeRadiatorArea({
      q_dot_required_w: 300_000,
      t_radiator_target_k: 800,
      emissivity: EPSILON,
      t_sink_effective_k: T_SINK,
      reserve_margin_fraction: 0.15,
    });
    const expected_margined = r.a_radiator_effective_m2 * 1.15;
    expect(Math.abs(r.a_radiator_with_margin_m2 - expected_margined)).toBeLessThan(1e-6);
  });
});
