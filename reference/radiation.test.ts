/**
 * Radiation formula tests — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §18.10 (regression anchor), §41.6 (reference-case gate)
 * Tolerance: ±0.5% for closed-form equations per engineering-spec-v0.1.0 §42.
 */

import { radiatorEffectiveArea, verifyRegressionAnchor, radiatorAchievedRejection } from "../runtime/formulas/radiation";
import { STEFAN_BOLTZMANN } from "../runtime/constants/constants";

describe("radiation formula module", () => {
  describe("regression anchor — spec §18.10", () => {
    test("50 kW @ 1200 K ε=0.90 F=1.0 T_sink=0 K → A = 0.4725 m² (4 decimal places)", () => {
      const result = verifyRegressionAnchor();
      expect(result.pass).toBe(true);
      expect(result.computed).toBe(0.4725);
      expect(result.expected).toBe(0.4725);
    });

    test("radiatorEffectiveArea matches anchor directly", () => {
      const out = radiatorEffectiveArea({
        q_dot_w: 50_000,
        emissivity: 0.90,
        view_factor: 1.0,
        t_radiator_target_k: 1200,
        t_sink_k: 0,
        reserve_margin_fraction: 0,
      });
      // Exact 4-decimal check per spec §18.10
      expect(Math.round(out.a_radiator_effective_m2 * 10_000) / 10_000).toBe(0.4725);
    });
  });

  describe("radiatorEffectiveArea", () => {
    test("area scales inversely with T^4", () => {
      const base = radiatorEffectiveArea({ q_dot_w: 1000, emissivity: 0.9, view_factor: 1.0, t_radiator_target_k: 1000, t_sink_k: 0, reserve_margin_fraction: 0 });
      const hotter = radiatorEffectiveArea({ q_dot_w: 1000, emissivity: 0.9, view_factor: 1.0, t_radiator_target_k: 1200, t_sink_k: 0, reserve_margin_fraction: 0 });
      expect(hotter.a_radiator_effective_m2).toBeLessThan(base.a_radiator_effective_m2);
    });

    test("margin adds area correctly", () => {
      const out = radiatorEffectiveArea({ q_dot_w: 50_000, emissivity: 0.90, view_factor: 1.0, t_radiator_target_k: 1200, t_sink_k: 0, reserve_margin_fraction: 0.15 });
      const expected_with_margin = out.a_radiator_effective_m2 / (out.a_radiator_effective_m2 / out.a_with_margin_m2);
      // a_with_margin = a_eff * 1.15
      expect(Math.abs(out.a_with_margin_m2 - out.a_radiator_effective_m2 * 1.15)).toBeLessThan(1e-9);
    });

    test("sigma constant matches pinned value", () => {
      const out = radiatorEffectiveArea({ q_dot_w: 1, emissivity: 1, view_factor: 1, t_radiator_target_k: 1000, t_sink_k: 0, reserve_margin_fraction: 0 });
      expect(out.sigma).toBe(STEFAN_BOLTZMANN);
      expect(out.sigma).toBe(5.670374419e-8);
    });

    test("check back-calculation of Q within ±0.5%", () => {
      const out = radiatorEffectiveArea({ q_dot_w: 50_000, emissivity: 0.90, view_factor: 1.0, t_radiator_target_k: 1200, t_sink_k: 0, reserve_margin_fraction: 0 });
      const tolerance = 50_000 * 0.005;
      expect(Math.abs(out.q_dot_check_w - 50_000)).toBeLessThan(tolerance);
    });
  });

  describe("radiatorAchievedRejection", () => {
    test("achieved rejection for anchor area equals 50 kW within ±0.5%", () => {
      const q = radiatorAchievedRejection(0.90, 1.0, 0.4725, 1200, 0);
      expect(Math.abs(q - 50_000)).toBeLessThan(50_000 * 0.005);
    });
  });
});
