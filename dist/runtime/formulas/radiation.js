"use strict";
/**
 * Radiation formula module — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.2, ui-expansion-spec-v0.1.5 §18.5–18.6, §18.10
 *
 * All formulas are authoritative runtime computations.
 * UI display-only previews are subordinate to these results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.radiatorEffectiveArea = radiatorEffectiveArea;
exports.radiatorAchievedRejection = radiatorAchievedRejection;
exports.verifyRegressionAnchor = verifyRegressionAnchor;
exports.computeRadiatorArea = computeRadiatorArea;
const constants_1 = require("../constants/constants");
/**
 * Compute effective radiator area required to reject q_dot_w.
 * Law: A = Q / (ε × σ × F × (T^4 - T_sink^4))
 * Spec §18.5
 */
function radiatorEffectiveArea(input) {
    const { q_dot_w, emissivity, view_factor, t_radiator_target_k, t_sink_k, reserve_margin_fraction } = input;
    const denom = emissivity * constants_1.STEFAN_BOLTZMANN * view_factor * (Math.pow(t_radiator_target_k, 4) - Math.pow(t_sink_k, 4));
    const a_effective = q_dot_w / denom;
    const a_with_margin = a_effective * (1 + reserve_margin_fraction);
    const q_check = emissivity * constants_1.STEFAN_BOLTZMANN * view_factor * a_effective * (Math.pow(t_radiator_target_k, 4) - Math.pow(t_sink_k, 4));
    return {
        a_radiator_effective_m2: a_effective,
        a_with_margin_m2: a_with_margin,
        q_dot_check_w: q_check,
        sigma: constants_1.STEFAN_BOLTZMANN,
    };
}
/**
 * Compute achieved rejection for a known radiator area.
 * Q = ε × σ × F × A × (T^4 - T_sink^4)
 */
function radiatorAchievedRejection(emissivity, view_factor, area_m2, t_radiator_k, t_sink_k) {
    return emissivity * constants_1.STEFAN_BOLTZMANN * view_factor * area_m2 * (Math.pow(t_radiator_k, 4) - Math.pow(t_sink_k, 4));
}
/**
 * Regression anchor verification per ui-expansion-spec-v0.1.5 §18.10.
 * Q=50000 W, ε=0.90, F=1.0, T=1200 K, T_sink=0 K → A = 0.4725 m² (4 decimals)
 */
function verifyRegressionAnchor() {
    const result = radiatorEffectiveArea({
        q_dot_w: 50_000,
        emissivity: 0.90,
        view_factor: 1.0,
        t_radiator_target_k: 1200,
        t_sink_k: 0,
        reserve_margin_fraction: 0,
    });
    const computed = Math.round(result.a_radiator_effective_m2 * 10_000) / 10_000;
    return { pass: computed === 0.4725, computed, expected: 0.4725 };
}
/**
 * Compute required radiator area for a given rejection requirement.
 * Delegates to radiatorEffectiveArea. view_factor defaults to 1.0 per §40.
 * FIX-002: adapter required by ANCHOR runner (run-scenario.ts).
 */
function computeRadiatorArea(input) {
    const result = radiatorEffectiveArea({
        q_dot_w: input.q_dot_required_w,
        emissivity: input.emissivity,
        view_factor: input.view_factor ?? 1.0,
        t_radiator_target_k: input.t_radiator_target_k,
        t_sink_k: input.t_sink_effective_k,
        reserve_margin_fraction: input.reserve_margin_fraction,
    });
    return {
        a_radiator_effective_m2: result.a_radiator_effective_m2,
        a_radiator_with_margin_m2: result.a_with_margin_m2,
    };
}
//# sourceMappingURL=radiation.js.map