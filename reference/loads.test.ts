/**
 * Loads formula tests — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §18.1–18.4, §8.3, §9.3–9.4
 */

import {
  devicePowerAtState,
  computeModuleTotal,
  nonComputeTotal,
  aggregateCommsLoad,
  internalRejectTotal,
  totalRejectBurden,
  type PayloadBlock,
} from "../runtime/formulas/loads";

const DEVICE_POWERS = { power_idle_w: 100, power_light_w: 350, power_medium_w: 600, power_full_w: 700 };

describe("loads formula module", () => {
  describe("devicePowerAtState", () => {
    test("returns correct power for each state", () => {
      expect(devicePowerAtState(DEVICE_POWERS, "idle")).toBe(100);
      expect(devicePowerAtState(DEVICE_POWERS, "light")).toBe(350);
      expect(devicePowerAtState(DEVICE_POWERS, "medium")).toBe(600);
      expect(devicePowerAtState(DEVICE_POWERS, "full")).toBe(700);
    });
  });

  describe("computeModuleTotal — spec §18.2 / §8.3", () => {
    test("sums device×count + all overhead", () => {
      const total = computeModuleTotal({
        device_count: 8,
        w_dot_device_at_state_w: 700,
        w_dot_memory_w: 200,
        w_dot_storage_w: 50,
        w_dot_network_w: 100,
        w_dot_power_conversion_w: 80,
        w_dot_control_w: 20,
      });
      // 8×700 + 200 + 50 + 100 + 80 + 20 = 6050
      expect(total).toBe(6050);
    });
  });

  describe("nonComputeTotal — spec §18.1 / §9.4", () => {
    test("continuous duty → full power", () => {
      const blocks: PayloadBlock[] = [
        { rf_comms_power_w: 40, telemetry_power_w: 10, radar_power_w: 0, optical_crosslink_power_w: 0, duty_mode: "continuous", duty_fraction: 1.0 },
      ];
      expect(nonComputeTotal(blocks)).toBe(50);
    });

    test("uniform duty → scales by fraction", () => {
      const blocks: PayloadBlock[] = [
        { rf_comms_power_w: 100, telemetry_power_w: 0, radar_power_w: 0, optical_crosslink_power_w: 0, duty_mode: "uniform", duty_fraction: 0.5 },
      ];
      expect(nonComputeTotal(blocks)).toBe(50);
    });

    test("multiple blocks sum correctly", () => {
      const blocks: PayloadBlock[] = [
        { rf_comms_power_w: 40, telemetry_power_w: 10, radar_power_w: 0, optical_crosslink_power_w: 0, duty_mode: "continuous", duty_fraction: 1.0 },
        { rf_comms_power_w: 200, telemetry_power_w: 0, radar_power_w: 0, optical_crosslink_power_w: 0, duty_mode: "uniform", duty_fraction: 0.5 },
      ];
      // 50 + 100 = 150
      expect(nonComputeTotal(blocks)).toBe(150);
    });
  });

  describe("aggregateCommsLoad — spec §9.3", () => {
    test("aggregates per-subsystem fields with duty factor", () => {
      const blocks: PayloadBlock[] = [
        { rf_comms_power_w: 100, telemetry_power_w: 20, radar_power_w: 0, optical_crosslink_power_w: 0, duty_mode: "uniform", duty_fraction: 0.5 },
        { rf_comms_power_w: 0, telemetry_power_w: 0, radar_power_w: 0, optical_crosslink_power_w: 80, duty_mode: "continuous", duty_fraction: 1.0 },
      ];
      const agg = aggregateCommsLoad(blocks);
      expect(agg.rf_comms_power_w).toBe(50);
      expect(agg.telemetry_power_w).toBe(10);
      expect(agg.optical_crosslink_power_w).toBe(80);
    });
  });

  describe("internalRejectTotal — spec §18.3", () => {
    test("sums all internal terms", () => {
      expect(internalRejectTotal(6050, 150, 100, 50)).toBe(6350);
    });
  });

  describe("totalRejectBurden — spec §18.4", () => {
    test("subtracts exported equivalent", () => {
      expect(totalRejectBurden(6350, 0, 200, 500)).toBe(6050);
    });
  });
});
