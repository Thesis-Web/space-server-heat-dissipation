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
exports.resolveEpsilonEol = resolveEpsilonEol;
exports.computeGrayCavityEmissivity = computeGrayCavityEmissivity;
exports.resolveEffectiveEmissivity = resolveEffectiveEmissivity;
exports.computeFaceRejection = computeFaceRejection;
exports.computeTwoSidedRejection = computeTwoSidedRejection;
exports.computeRadiator3ASizing = computeRadiator3ASizing;
exports.resolveRadiatorTSink = resolveRadiatorTSink;
exports.computeRadiationPressure = computeRadiationPressure;
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
// =============================================================================
// Extension 3A radiator math patch
// Governing law: 3A-spec §11.5–§11.9; dist-tree patch §13 (patch radiation.ts, not new file)
// sigma imported from constants — not re-declared here per dist-tree patch rule.
// =============================================================================
const constants_2 = require("../constants/constants");
// ── §11.5–§11.7: Emissivity resolution ────────────────────────────────────────
/**
 * Compute epsilon_eol from declared inputs. §11.7.
 * Priority: eol_override > bol*(1-degradation) > bol (when degradation=null).
 */
function resolveEpsilonEol(epsilon_bol, eol_override, degradation_fraction) {
    if (eol_override !== null && eol_override !== undefined) {
        return Math.max(1e-9, Math.min(1, eol_override)); // clamp to (0,1]
    }
    if (degradation_fraction !== null && degradation_fraction !== undefined) {
        return Math.max(1e-9, Math.min(1, epsilon_bol * (1 - degradation_fraction)));
    }
    return epsilon_bol; // no degradation declared → eol = bol
}
/**
 * Gray cavity effective emissivity approximation. §11.6.
 * epsilon_cavity = 1 / ( (1/epsilon_surface) + ((1 - F_cavity) / F_cavity) )
 * Clamp to (0,1].
 * Physical basis: two-surface gray-body enclosure exchange factor. Incropera & DeWitt Ch.13.
 */
function computeGrayCavityEmissivity(epsilon_surface, f_cavity) {
    const result = 1 / ((1 / epsilon_surface) + ((1 - f_cavity) / f_cavity));
    return Math.max(1e-9, Math.min(1, result));
}
/**
 * Resolve effective emissivity for a single face considering cavity mode.
 * §11.5 (surface_only), §11.6 (gray_cavity_approx).
 */
function resolveEffectiveEmissivity(epsilon, cavity_emissivity_mode, cavity_view_factor, cavity_surface_emissivity) {
    if (cavity_emissivity_mode === 'surface_only') {
        return epsilon; // §11.5: epsilon_effective = surface emissivity
    }
    if (cavity_emissivity_mode === 'gray_cavity_approx') {
        if (cavity_view_factor && cavity_surface_emissivity) {
            return computeGrayCavityEmissivity(cavity_surface_emissivity, cavity_view_factor);
        }
        // Missing inputs — return surface emissivity as fallback (validator blocks upstream)
        return epsilon;
    }
    return epsilon; // disabled: use surface emissivity directly
}
/**
 * Compute heat rejection for one radiator face. §11.8.
 * Q_face = epsilon_eff * sigma * A * F * (T_rad^4 - T_sink^4)
 */
function computeFaceRejection(face, t_rad_k, t_sink_k) {
    const dT4 = Math.pow(t_rad_k, 4) - Math.pow(t_sink_k, 4);
    return face.epsilon_effective * constants_1.STEFAN_BOLTZMANN * face.area_m2 * face.view_factor * dT4;
}
/**
 * Compute total radiator heat rejection (two-sided). §11.8.
 * Face B area=0 and F_b=0 for single_sided — no special case needed.
 */
function computeTwoSidedRejection(face_a, face_b, t_rad_k, t_sink_k) {
    const q_a = computeFaceRejection(face_a, t_rad_k, t_sink_k);
    const q_b = computeFaceRejection(face_b, t_rad_k, t_sink_k);
    return { q_face_a_w: q_a, q_face_b_w: q_b, q_total_w: q_a + q_b };
}
/**
 * Compute BOL and EOL radiator area requirements. §11.9.
 * Uses §11.7 for epsilon_eol and §11.6 for cavity effective emissivity.
 * Works for single_sided and double_sided_symmetric. Asymmetric: assigns all to face A.
 */
function computeRadiator3ASizing(input) {
    const cavityMode = input.cavity_emissivity_mode;
    const cVF = input.cavity_view_factor;
    const cSE = input.cavity_surface_emissivity;
    // BOL emissivities
    const eps_bol_raw = input.surface_emissivity_bol;
    const eps_bol = resolveEffectiveEmissivity(eps_bol_raw, cavityMode, cVF, cSE);
    // EOL emissivities
    const eps_eol_raw = resolveEpsilonEol(input.surface_emissivity_bol, input.surface_emissivity_eol_override, input.emissivity_degradation_fraction);
    const eps_eol = resolveEffectiveEmissivity(eps_eol_raw, cavityMode, cVF, cSE);
    const fa = input.face_a_view_factor;
    const fb = input.geometry_mode === 'single_sided' ? 0 : input.face_b_view_factor;
    // §11.9: effective_emissive_factor
    const eef_bol = eps_bol * fa + eps_bol * fb;
    const eef_eol = eps_eol * fa + eps_eol * fb;
    const dT4 = Math.pow(input.t_rad_k, 4) - Math.pow(input.t_sink_resolved_k, 4);
    // §11.9: required area equations
    const a_bol = input.q_dot_required_w / (constants_1.STEFAN_BOLTZMANN * dT4 * eef_bol);
    const a_eol = input.q_dot_required_w / (constants_1.STEFAN_BOLTZMANN * dT4 * eef_eol);
    const a_delta = a_eol - a_bol;
    // Reserve margin check
    let reserve_margin_sufficient = null;
    if (input.declared_area_m2 !== null && input.declared_area_m2 !== undefined) {
        const required_with_margin = a_eol * (1 + input.reserve_margin_fraction);
        reserve_margin_sufficient = input.declared_area_m2 >= required_with_margin;
    }
    return {
        radiator_id: input.radiator_id,
        epsilon_effective_bol: eps_bol,
        epsilon_effective_eol: eps_eol,
        effective_emissive_factor_bol: eef_bol,
        effective_emissive_factor_eol: eef_eol,
        a_bol_required_m2: a_bol,
        a_eol_required_m2: a_eol,
        a_delta_m2: a_delta,
        reserve_margin_sufficient,
        t_sink_resolved_k: input.t_sink_resolved_k,
        sigma_used: constants_1.STEFAN_BOLTZMANN,
    };
}
// ── §9.4: T_sink resolution ───────────────────────────────────────────────────
/**
 * Resolve T_sink per §9.4 priority chain:
 * 1. background_sink_temp_k_override on radiator
 * 2. environment_profile.sink_temperature_k on scenario
 * 3. Block — return null (caller must block execution)
 */
function resolveRadiatorTSink(background_sink_temp_k_override, environment_profile_sink_temperature_k) {
    if (background_sink_temp_k_override !== null && background_sink_temp_k_override !== undefined) {
        return { t_sink_k: background_sink_temp_k_override, source: 'override' };
    }
    if (environment_profile_sink_temperature_k !== null && environment_profile_sink_temperature_k !== undefined) {
        return { t_sink_k: environment_profile_sink_temperature_k, source: 'environment_profile' };
    }
    return { t_sink_k: null, source: 'unresolved' };
}
/**
 * Compute radiation-pressure screening metrics. §11.10.
 * Flag-only — no propagation engine. §3.6.
 *
 * p_rad = q'' / c
 * F_rad = p_rad * A_projected * C_r
 * C_r defaults to 1.0 per §11.10.
 */
function computeRadiationPressure(q_dot_total_w, a_projected_m2, c_r = 1.0) {
    const q_doubleprime = q_dot_total_w / a_projected_m2;
    const p_rad = q_doubleprime / constants_2.SPEED_OF_LIGHT_M_PER_S;
    const f_rad = p_rad * a_projected_m2 * c_r;
    return {
        q_doubleprime_w_per_m2: q_doubleprime,
        p_rad_pa: p_rad,
        f_rad_n: f_rad,
    };
}
//# sourceMappingURL=radiation.js.map