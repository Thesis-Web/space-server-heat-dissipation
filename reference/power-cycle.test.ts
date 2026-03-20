/**
 * Power cycle formula tests — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §18.7–18.9
 */

import {
  carnotEfficiency,
  carnotCopHeatLift,
  validatePowerCycleEfficiency,
  validateHeatLiftCop,
  checkNoSilentUplift,
} from "../runtime/formulas/power-cycle";

describe("power-cycle formula module", () => {
  describe("carnotEfficiency — spec §18.7", () => {
    test("η = 1 - T_cold/T_hot", () => {
      expect(carnotEfficiency(1200, 300)).toBeCloseTo(0.75, 6);
    });
    test("throws if T_hot <= T_cold", () => {
      expect(() => carnotEfficiency(300, 300)).toThrow();
      expect(() => carnotEfficiency(200, 300)).toThrow();
    });
  });

  describe("carnotCopHeatLift — spec §18.8", () => {
    test("COP = T_hot / (T_hot - T_cold)", () => {
      expect(carnotCopHeatLift(400, 300)).toBeCloseTo(4.0, 6);
    });
    test("throws if T_hot <= T_cold", () => {
      expect(() => carnotCopHeatLift(300, 300)).toThrow();
    });
  });

  describe("validatePowerCycleEfficiency — spec §18.7", () => {
    test("valid when 0 < η <= η_carnot", () => {
      const r = validatePowerCycleEfficiency(0.30, 1200, 300);
      expect(r.valid).toBe(true);
    });
    test("invalid when η > η_carnot", () => {
      const r = validatePowerCycleEfficiency(0.99, 1200, 300);
      expect(r.valid).toBe(false);
    });
    test("invalid when η <= 0", () => {
      const r = validatePowerCycleEfficiency(0, 1200, 300);
      expect(r.valid).toBe(false);
    });
  });

  describe("validateHeatLiftCop — spec §18.8", () => {
    test("valid when 1 < COP <= COP_carnot", () => {
      const r = validateHeatLiftCop(3.0, 400, 300);
      expect(r.valid).toBe(true);
    });
    test("invalid when COP > COP_carnot", () => {
      const r = validateHeatLiftCop(99, 400, 300);
      expect(r.valid).toBe(false);
    });
    test("invalid when COP <= 1", () => {
      const r = validateHeatLiftCop(1.0, 400, 300);
      expect(r.valid).toBe(false);
    });
  });

  describe("checkNoSilentUplift — spec §18.9", () => {
    test("non-heat_lift mode is always compliant", () => {
      const r = checkNoSilentUplift({ mode_label: "power_cycle", work_input_w: 0, external_heat_input_w: 0, storage_drawdown_w: 0, research_required: false });
      expect(r.compliant).toBe(true);
    });
    test("heat_lift with work_input_w > 0 is compliant", () => {
      const r = checkNoSilentUplift({ mode_label: "heat_lift", work_input_w: 100, external_heat_input_w: 0, storage_drawdown_w: 0, research_required: false });
      expect(r.compliant).toBe(true);
    });
    test("heat_lift with research_required=true is compliant", () => {
      const r = checkNoSilentUplift({ mode_label: "heat_lift", work_input_w: 0, external_heat_input_w: 0, storage_drawdown_w: 0, research_required: true });
      expect(r.compliant).toBe(true);
    });
    test("heat_lift with no source and no research flag is not compliant", () => {
      const r = checkNoSilentUplift({ mode_label: "heat_lift", work_input_w: 0, external_heat_input_w: 0, storage_drawdown_w: 0, research_required: false });
      expect(r.compliant).toBe(false);
    });
  });
});
