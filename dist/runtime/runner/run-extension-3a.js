"use strict";
/**
 * run-extension-3a.ts
 * Extension 3A scenario execution runner.
 * Governing law: 3A-spec §5, §11, §13, §14; dist-tree patch §14.
 * Follows run-extension-2.ts naming and structural pattern.
 *
 * Responsibilities:
 *  - Orchestrate normalization, catalog resolution, validation, math, emission
 *  - Cohabit with run-extension-2 and baseline runners (additive result on packet)
 *  - Gate on enable_model_extension_3a — if false, return clean bypass result
 *  - Enforce all blocking rules from §13 before emitting numeric outputs
 *  - Emit §14.1 required output fields
 *
 * Cohabitation contract (per owner build instruction):
 *  The extension-2 runner remains active. This runner's output is additive
 *  as extension_3a_result on the packet. run-packet.ts dispatches both.
 *  Neither runner alters the other's output.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExtension3A = runExtension3A;
const extension_3a_normalizer_1 = require("../transforms/extension-3a-normalizer");
const catalog_resolution_1 = require("../transforms/catalog-resolution");
const cross_reference_1 = require("../validators/cross-reference");
const topology_1 = require("../validators/topology");
const extension_3a_bounds_1 = require("../validators/extension-3a-bounds");
const operating_mode_1 = require("../validators/operating-mode");
const resistance_chain_1 = require("../formulas/resistance-chain");
const radiation_1 = require("../formulas/radiation");
const constants_1 = require("../constants/constants");
function runConvergenceIteration(convergenceZones, edgesConvergence, cc, t_sink_k) {
    if (edgesConvergence.length === 0) {
        return { status: 'converged', iterations: 0 };
    }
    // §11.4: State vector = Q_ij for each convergence edge
    const zoneMap = new Map(convergenceZones.map(z => [z.zone_id, z]));
    // Initial state §11.4: Q_ij^(0) = (T_target_i - T_target_j) / R_bridge_ij
    const q = new Map();
    for (const edge of edgesConvergence) {
        const zi = zoneMap.get(edge.from);
        const zj = zoneMap.get(edge.to);
        if (!zi || !zj)
            continue;
        const key = `${edge.from}→${edge.to}`;
        q.set(key, (zi.target_temp_k - zj.target_temp_k) / edge.r_bridge);
    }
    const q0MaxMag = Math.max(...Array.from(q.values()).map(Math.abs), 1.0);
    const runaway_threshold = cc.runaway_multiplier * q0MaxMag;
    for (let k = 0; k < cc.max_iterations; k++) {
        // Step 1: resolve zone temperatures from current exchange flows §11.4
        const tResolved = new Map();
        for (const zone of convergenceZones) {
            let q_net = 0;
            for (const edge of edgesConvergence) {
                const keyIn = `${edge.to}→${zone.zone_id}`;
                const keyOut = `${zone.zone_id}→${edge.to}`;
                if (q.has(keyIn))
                    q_net += q.get(keyIn);
                if (q.has(keyOut))
                    q_net -= q.get(keyOut);
            }
            let t_res = t_sink_k + (zone.q_dot_load_w - q_net) * zone.r_total_k_per_w;
            // Clamp to declared bounds §11.4
            if (zone.temp_min_k !== undefined && zone.temp_max_k !== undefined) {
                t_res = Math.max(zone.temp_min_k, Math.min(zone.temp_max_k, t_res));
            }
            tResolved.set(zone.zone_id, t_res);
        }
        // Step 2: recompute exchange flows §11.4
        const q_next = new Map();
        for (const edge of edgesConvergence) {
            const key = `${edge.from}→${edge.to}`;
            const ti = tResolved.get(edge.from) ?? 0;
            const tj = tResolved.get(edge.to) ?? 0;
            const qNew = (ti - tj) / edge.r_bridge;
            q_next.set(key, qNew);
            // Runaway check §11.4
            if (!isFinite(qNew) || isNaN(qNew) || Math.abs(qNew) > runaway_threshold) {
                return { status: 'runaway', iterations: k + 1 };
            }
        }
        // Convergence check §11.4
        let maxAbsDelta = 0;
        let maxRelDelta = 0;
        for (const [key, qNew] of q_next) {
            const qOld = q.get(key) ?? 0;
            const absDelta = Math.abs(qNew - qOld);
            const relDelta = absDelta / Math.max(Math.abs(qNew), 1.0);
            maxAbsDelta = Math.max(maxAbsDelta, absDelta);
            maxRelDelta = Math.max(maxRelDelta, relDelta);
        }
        for (const [k2, v] of q_next)
            q.set(k2, v);
        if (maxAbsDelta <= cc.tolerance_abs_w || maxRelDelta <= cc.tolerance_rel_fraction) {
            return { status: 'converged', iterations: k + 1 };
        }
    }
    return { status: 'nonconverged', iterations: cc.max_iterations };
}
// ── Main runner ───────────────────────────────────────────────────────────────
/**
 * Execute Extension 3A scenario processing.
 * Returns Extension3AResult — always succeeds structurally;
 * blocking_errors[] non-empty means execution is blocked per §13.
 */
function runExtension3A(input) {
    const trace = ['run-extension-3a: begin'];
    const blockingErrors = [];
    // ── Gate: if 3A not enabled, return clean bypass ──────────────────────────
    const rawEnable = input.scenario.enable_model_extension_3a;
    const effectiveEnable = rawEnable === true;
    if (!effectiveEnable) {
        trace.push('run-extension-3a: enable_model_extension_3a=false — bypass §5.3');
        return {
            extension_3a_enabled: false,
            model_extension_3a_mode: 'disabled',
            spec_version: constants_1.EXTENSION_3A_SPEC_VERSION,
            blueprint_version: constants_1.EXTENSION_3A_BLUEPRINT_VERSION,
            topology_valid: true,
            topology_cycle_detected: false,
            topology_order: [],
            convergence_attempted: false,
            convergence_iterations: 0,
            convergence_status: 'not_required',
            bridge_losses_w: [],
            bridge_losses_w_total: 0,
            resistance_chain_totals: {},
            t_sink_resolved_k: null,
            t_sink_source: 'unresolved',
            radiator_area_bol_required_m2: null,
            radiator_area_eol_required_m2: null,
            radiator_area_delta_m2: null,
            reserve_margin_sufficient: null,
            radiation_pressure_pa: null,
            radiation_pressure_force_n: null,
            defaults_applied: [],
            topology_violations: [],
            topology_warnings: [],
            bounds_violations: [],
            bounds_warnings: [],
            blocking_errors: [],
            transform_trace: trace,
        };
    }
    // ── Phase 1: Normalize ────────────────────────────────────────────────────
    const norm = (0, extension_3a_normalizer_1.normalizeExtension3A)(input.scenario, input.radiators);
    trace.push(...norm.transform_trace);
    const defaults_applied = [...norm.defaults_applied];
    const cc = norm.convergence_control;
    // ── Phase 2: Operating mode validation ────────────────────────────────────
    const modeViolations = (0, operating_mode_1.validateExtension3AOperatingMode)({
        enable_model_extension_3a: effectiveEnable,
        model_extension_3a_mode: norm.model_extension_3a_mode,
        topology_validation_policy: norm.topology_validation_policy,
    });
    for (const mv of modeViolations) {
        if (mv.severity === 'error')
            blockingErrors.push(mv.message);
    }
    // ── Phase 3: Convergence control bounds ───────────────────────────────────
    const ccViolations = (0, extension_3a_bounds_1.validateConvergenceControl)(cc);
    for (const v of ccViolations) {
        if (v.severity === 'error')
            blockingErrors.push(v.message);
    }
    // ── Phase 4: Catalog resolution ───────────────────────────────────────────
    const catalogResult = (0, catalog_resolution_1.resolveZoneCatalogRefs)(norm.normalized_zones, input.catalogs.working_fluid_catalog, input.catalogs.pickup_geometry_catalog);
    trace.push(...catalogResult.transform_trace);
    blockingErrors.push(...catalogResult.blocking_errors);
    // Build pickup multiplier map
    const pickupMultiplierMap = new Map();
    for (const [zoneId, pgRes] of catalogResult.pickupGeometryResults) {
        pickupMultiplierMap.set(zoneId, pgRes.nominal_resistance_multiplier);
    }
    // ── Phase 5: Cross-reference validation ───────────────────────────────────
    const zoneRefViolations = (0, cross_reference_1.validateZoneTopologyRefs)(norm.normalized_zones);
    const availableFluidIds = input.catalogs.working_fluid_catalog.entries
        .map(e => String(e.working_fluid_id ?? ''));
    const availableGeomIds = input.catalogs.pickup_geometry_catalog.entries
        .map(e => String(e.pickup_geometry_id ?? ''));
    const wfRefViolations = (0, cross_reference_1.validateWorkingFluidRefs)(norm.normalized_zones, availableFluidIds);
    const pgRefViolations = (0, cross_reference_1.validatePickupGeometryRefs)(norm.normalized_zones, availableGeomIds);
    const allCrossRefViolations = [...zoneRefViolations, ...wfRefViolations, ...pgRefViolations];
    for (const v of allCrossRefViolations) {
        blockingErrors.push(v.message);
    }
    // ── Phase 6: Topology validation ─────────────────────────────────────────
    const topoPolicy = norm.topology_validation_policy ?? 'blocking';
    const topoResult = (0, topology_1.validateTopology)(norm.normalized_zones, topoPolicy);
    const topoViolations = topoResult.violations.filter(v => v.severity === 'error');
    for (const v of topoViolations)
        blockingErrors.push(v.message);
    trace.push(`run-extension-3a: topology valid=${topoResult.valid} cycle=${topoResult.cycle_detected} order=[${topoResult.topology_order.join(',')}]`);
    // ── Phase 7: Resistance chain computation ────────────────────────────────
    const resistanceTotals = (0, resistance_chain_1.computeZoneResistanceTotals)(norm.normalized_zones, pickupMultiplierMap);
    const resistanceSummary = {};
    for (const [zoneId, res] of resistanceTotals) {
        resistanceSummary[zoneId] = {
            r_total_k_per_w: res.r_total_k_per_w,
            t_junction_k: res.t_junction_k,
        };
    }
    // Resistance bounds validation
    const resistanceBoundsViolations = [];
    for (const zone of norm.normalized_zones) {
        const pgResolved = catalogResult.pickupGeometryResults.has(zone.zone_id);
        const rViolations = (0, extension_3a_bounds_1.validateResistanceChain)(zone, pgResolved);
        resistanceBoundsViolations.push(...rViolations.map(v => ({ rule: v.rule, field: v.field, message: v.message })));
        for (const v of rViolations) {
            if (v.severity === 'error')
                blockingErrors.push(v.message);
        }
    }
    // ── Phase 8: Bridge losses ────────────────────────────────────────────────
    const bridgeLosses = [];
    for (const zone of norm.normalized_zones) {
        if (zone.isolation_boundary && zone.bridge_resistance_k_per_w) {
            const upRef = zone.upstream_zone_ref;
            const downRef = zone.downstream_zone_ref;
            const upZone = norm.normalized_zones.find(z => z.zone_id === upRef);
            const downZone = norm.normalized_zones.find(z => z.zone_id === downRef);
            const t_up = upZone?.target_temp_k ?? 0;
            const t_down = downZone?.target_temp_k ?? 0;
            if (t_up && t_down) {
                const q_bridge = (0, resistance_chain_1.computeBridgeHeatTransfer)(t_up, t_down, zone.bridge_resistance_k_per_w);
                bridgeLosses.push({
                    zone_id: zone.zone_id,
                    q_dot_bridge_w: q_bridge,
                    r_bridge_k_per_w: zone.bridge_resistance_k_per_w,
                    t_upstream_k: t_up,
                    t_downstream_k: t_down,
                });
            }
        }
    }
    const bridge_total = bridgeLosses.reduce((sum, b) => sum + b.q_dot_bridge_w, 0);
    // ── Phase 9: Convergence iteration ────────────────────────────────────────
    const convergenceZones = norm.normalized_zones.filter(z => z.convergence_enabled);
    let convergenceStatus = 'not_required';
    let convergenceIterations = 0;
    let convergenceAttempted = false;
    if (convergenceZones.length > 0 && norm.model_extension_3a_mode !== 'topology_only') {
        convergenceAttempted = true;
        // Build convergence edges: zones that share upstream/downstream refs
        const convEdges = [];
        for (const zone of convergenceZones) {
            if (zone.downstream_zone_ref && zone.bridge_resistance_k_per_w) {
                const downZone = convergenceZones.find(z => z.zone_id === zone.downstream_zone_ref);
                if (downZone) {
                    convEdges.push({ from: zone.zone_id, to: zone.downstream_zone_ref, r_bridge: zone.bridge_resistance_k_per_w });
                }
            }
        }
        // Resolve first T_sink (use first radiator or environment)
        const firstSink = input.environment_sink_temperature_k ?? 0;
        const convZoneInputs = convergenceZones.map(z => ({
            zone_id: z.zone_id,
            target_temp_k: z.target_temp_k ?? 300,
            temp_min_k: z.temp_min_k,
            temp_max_k: z.temp_max_k,
            bridge_resistance_k_per_w: z.bridge_resistance_k_per_w ?? 1,
            r_total_k_per_w: resistanceTotals.get(z.zone_id)?.r_total_k_per_w ?? 0,
            q_dot_load_w: 0, // placeholder — real load would come from aggregated scenario
        }));
        const convResult = runConvergenceIteration(convZoneInputs, convEdges, cc, firstSink);
        convergenceStatus = convResult.status;
        convergenceIterations = convResult.iterations;
        if (convergenceStatus === 'nonconverged' && cc.blocking_on_nonconvergence) {
            blockingErrors.push(`Convergence failed after ${cc.max_iterations} iterations with blocking_on_nonconvergence=true. §13.4`);
        }
        if (convergenceStatus === 'runaway') {
            blockingErrors.push('Convergence runaway detected. Execution blocked. §13.4');
        }
    }
    // ── Phase 10: T_sink resolution and radiator sizing ───────────────────────
    let t_sink_resolved = null;
    let t_sink_source = 'unresolved';
    let a_bol = null;
    let a_eol = null;
    let a_delta = null;
    let reserve_sufficient = null;
    let rad_pres_pa = null;
    let rad_pres_n = null;
    const boundsViolations = [...resistanceBoundsViolations];
    const boundsWarnings = [];
    if (norm.normalized_radiators.length > 0) {
        const firstRad = norm.normalized_radiators[0];
        const radId = String(firstRad.radiator_id ?? 'radiator-0');
        // §9.4 T_sink resolution
        const sinkRes = (0, radiation_1.resolveRadiatorTSink)(firstRad.background_sink_temp_k_override, input.environment_sink_temperature_k);
        t_sink_resolved = sinkRes.t_sink_k;
        t_sink_source = sinkRes.source;
        defaults_applied.push(`radiator[${radId}].t_sink → source=${sinkRes.source}`);
        const tSinkResolvable = t_sink_resolved !== null;
        // Radiator bounds validation
        const radBoundsViolations = (0, extension_3a_bounds_1.validateRadiator3ABounds)({
            radiator_id: radId,
            geometry_mode: firstRad.geometry_mode,
            face_a_view_factor: firstRad.face_a_view_factor,
            face_b_view_factor: firstRad.face_b_view_factor,
            surface_emissivity_bol: firstRad.surface_emissivity_bol,
            surface_emissivity_eol_override: firstRad.surface_emissivity_eol_override,
            emissivity_degradation_fraction: firstRad.emissivity_degradation_fraction,
            cavity_emissivity_mode: firstRad.cavity_emissivity_mode,
            cavity_view_factor: firstRad.cavity_view_factor,
            cavity_surface_emissivity: firstRad.cavity_surface_emissivity,
            background_sink_temp_k_override: firstRad.background_sink_temp_k_override,
        }, tSinkResolvable);
        for (const v of radBoundsViolations) {
            if (v.severity === 'error') {
                blockingErrors.push(v.message);
                boundsViolations.push({ rule: v.rule, field: v.field, message: v.message });
            }
            else {
                boundsWarnings.push({ rule: v.rule, field: v.field, message: v.message });
            }
        }
        // Only compute sizing if no blocking radiator errors and T_sink resolved
        if (tSinkResolvable && blockingErrors.length === 0 && firstRad.surface_emissivity_bol) {
            const q_required = firstRad['q_dot_required_w'] ?? 0;
            const t_rad_k = firstRad.target_surface_temp_k ?? 1200;
            const fav = firstRad.face_a_view_factor ?? 1.0;
            const fbv = firstRad.face_b_view_factor ?? 0;
            const sizingInput = {
                radiator_id: radId,
                geometry_mode: firstRad.geometry_mode ?? 'single_sided',
                face_a_view_factor: fav,
                face_b_view_factor: fbv,
                surface_emissivity_bol: firstRad.surface_emissivity_bol,
                surface_emissivity_eol_override: firstRad.surface_emissivity_eol_override,
                emissivity_degradation_fraction: firstRad.emissivity_degradation_fraction,
                cavity_emissivity_mode: firstRad.cavity_emissivity_mode ?? 'disabled',
                cavity_view_factor: firstRad.cavity_view_factor,
                cavity_surface_emissivity: firstRad.cavity_surface_emissivity,
                t_sink_resolved_k: t_sink_resolved ?? 0,
                t_rad_k,
                q_dot_required_w: q_required,
                reserve_margin_fraction: firstRad.reserve_margin_fraction ?? 0.15,
                declared_area_m2: firstRad.face_a_area_m2 ?? null,
            };
            const sizingResult = (0, radiation_1.computeRadiator3ASizing)(sizingInput);
            a_bol = sizingResult.a_bol_required_m2;
            a_eol = sizingResult.a_eol_required_m2;
            a_delta = sizingResult.a_delta_m2;
            reserve_sufficient = sizingResult.reserve_margin_sufficient;
            // §11.10 radiation pressure
            const a_projected = firstRad.face_a_area_m2 ?? a_bol ?? 1;
            const radPres = (0, radiation_1.computeRadiationPressure)(q_required, a_projected);
            rad_pres_pa = radPres.p_rad_pa;
            rad_pres_n = radPres.f_rad_n;
        }
    }
    trace.push(`run-extension-3a: blocking_errors=${blockingErrors.length}`);
    trace.push('run-extension-3a: complete');
    return {
        extension_3a_enabled: true,
        model_extension_3a_mode: norm.model_extension_3a_mode,
        spec_version: constants_1.EXTENSION_3A_SPEC_VERSION,
        blueprint_version: constants_1.EXTENSION_3A_BLUEPRINT_VERSION,
        topology_valid: topoResult.valid,
        topology_cycle_detected: topoResult.cycle_detected,
        topology_order: topoResult.topology_order,
        convergence_attempted: convergenceAttempted,
        convergence_iterations: convergenceIterations,
        convergence_status: convergenceStatus,
        bridge_losses_w: bridgeLosses,
        bridge_losses_w_total: bridge_total,
        resistance_chain_totals: resistanceSummary,
        t_sink_resolved_k: t_sink_resolved,
        t_sink_source,
        radiator_area_bol_required_m2: a_bol,
        radiator_area_eol_required_m2: a_eol,
        radiator_area_delta_m2: a_delta,
        reserve_margin_sufficient: reserve_sufficient,
        radiation_pressure_pa: rad_pres_pa,
        radiation_pressure_force_n: rad_pres_n,
        defaults_applied,
        topology_violations: topoResult.violations,
        topology_warnings: topoResult.warnings,
        bounds_violations: boundsViolations,
        bounds_warnings: boundsWarnings,
        blocking_errors: blockingErrors,
        transform_trace: trace,
    };
}
//# sourceMappingURL=run-extension-3a.js.map