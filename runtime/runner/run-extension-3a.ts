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

import { normalizeExtension3A, type Extension3ANormalizationResult } from '../transforms/extension-3a-normalizer';
import { resolveZoneCatalogRefs } from '../transforms/catalog-resolution';
import {
  validateZoneTopologyRefs,
  validateWorkingFluidRefs,
  validatePickupGeometryRefs,
  validateChainBoundaries,
} from '../validators/cross-reference';
import { validateTopology } from '../validators/topology';
import { validateConvergenceControl, validateRadiator3ABounds, validateResistanceChain } from '../validators/extension-3a-bounds';
import { validateExtension3AOperatingMode } from '../validators/operating-mode';
import { computeZoneResistanceTotals, computeBridgeHeatTransfer } from '../formulas/resistance-chain';
import {
  computeRadiator3ASizing,
  computeRadiationPressure,
  resolveRadiatorTSink,
  type Radiator3ASizingInput,
} from '../formulas/radiation';
import { EXTENSION_3A_SPEC_VERSION, EXTENSION_3A_BLUEPRINT_VERSION } from '../constants/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Extension3ACatalogInput {
  working_fluid_catalog: {
    catalog_id: string;
    catalog_version: string;
    entries: Array<Record<string, unknown>>;
  };
  pickup_geometry_catalog: {
    catalog_id: string;
    catalog_version: string;
    entries: Array<Record<string, unknown>>;
  };
}

export interface Extension3AInput {
  scenario: Record<string, unknown>;
  radiators: Array<Record<string, unknown>>;
  catalogs: Extension3ACatalogInput;
  /** From scenario.environment_profile.sink_temperature_k if present */
  environment_sink_temperature_k?: number | null;
}

export interface BridgeLossEntry {
  zone_id: string;
  q_dot_bridge_w: number;
  r_bridge_k_per_w: number;
  t_upstream_k: number;
  t_downstream_k: number;
}

export interface Extension3AResult {
  // Gate
  extension_3a_enabled: boolean;
  model_extension_3a_mode: string;
  spec_version: string;
  blueprint_version: string;

  // §10.1 packet metadata fields — HOLE-3A-METADATA-001: topology_report_policy
  // has no scenario field yet; defaults to 'always' per buildExtension3APacketMetadata fallback
  topology_report_policy: string;
  defaults_audit_version: string | null;

  // §14.1 required output fields
  topology_valid: boolean;
  topology_cycle_detected: boolean;
  topology_order: string[];
  convergence_attempted: boolean;
  convergence_iterations: number;
  convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
  bridge_losses_w: BridgeLossEntry[];
  bridge_losses_w_total: number;
  resistance_chain_totals: Record<string, { r_total_k_per_w: number; t_junction_k: number | null }>;
  t_sink_resolved_k: number | null;
  t_sink_source: 'override' | 'environment_profile' | 'unresolved';
  radiator_area_bol_required_m2: number | null;
  radiator_area_eol_required_m2: number | null;
  radiator_area_delta_m2: number | null;
  reserve_margin_sufficient: boolean | null;
  radiation_pressure_pa: number | null;
  radiation_pressure_force_n: number | null;
  defaults_applied: string[];

  // Topology and validation details
  topology_violations: Array<{ rule: string; severity: string; message: string; zone_id?: string }>;
  topology_warnings: Array<{ rule: string; severity: string; message: string; zone_id?: string }>;
  bounds_violations: Array<{ rule: string; field: string; message: string }>;
  bounds_warnings: Array<{ rule: string; field: string; message: string }>;

  // Blocking error list (non-empty → execution blocked)
  blocking_errors: string[];
  transform_trace: string[];
}

// ── Convergence iteration (§11.4) ─────────────────────────────────────────────

interface ConvergenceState {
  status: 'converged' | 'nonconverged' | 'runaway' | 'invalid';
  iterations: number;
}

function runConvergenceIteration(
  convergenceZones: Array<{
    zone_id: string;
    target_temp_k: number;
    temp_min_k?: number;
    temp_max_k?: number;
    bridge_resistance_k_per_w: number;
    r_total_k_per_w: number;
    q_dot_load_w: number;
  }>,
  edgesConvergence: Array<{ from: string; to: string; r_bridge: number }>,
  cc: { max_iterations: number; tolerance_abs_w: number; tolerance_rel_fraction: number; runaway_multiplier: number; blocking_on_nonconvergence: boolean },
  t_sink_k: number
): ConvergenceState {
  if (edgesConvergence.length === 0) {
    return { status: 'converged', iterations: 0 };
  }

  // §11.4: State vector = Q_ij for each convergence edge
  const zoneMap = new Map(convergenceZones.map(z => [z.zone_id, z]));

  // Initial state §11.4: Q_ij^(0) = (T_target_i - T_target_j) / R_bridge_ij
  const q: Map<string, number> = new Map();
  for (const edge of edgesConvergence) {
    const zi = zoneMap.get(edge.from);
    const zj = zoneMap.get(edge.to);
    if (!zi || !zj) continue;
    const key = `${edge.from}→${edge.to}`;
    q.set(key, (zi.target_temp_k - zj.target_temp_k) / edge.r_bridge);
  }

  const q0MaxMag = Math.max(...Array.from(q.values()).map(Math.abs), 1.0);
  const runaway_threshold = cc.runaway_multiplier * q0MaxMag;

  for (let k = 0; k < cc.max_iterations; k++) {
    // Step 1: resolve zone temperatures from current exchange flows §11.4
    const tResolved = new Map<string, number>();
    for (const zone of convergenceZones) {
      let q_net = 0;
      for (const edge of edgesConvergence) {
        const keyIn  = `${edge.to}→${zone.zone_id}`;
        const keyOut = `${zone.zone_id}→${edge.to}`;
        if (q.has(keyIn))  q_net += q.get(keyIn)!;
        if (q.has(keyOut)) q_net -= q.get(keyOut)!;
      }
      let t_res = t_sink_k + (zone.q_dot_load_w - q_net) * zone.r_total_k_per_w;
      // Clamp to declared bounds §11.4
      if (zone.temp_min_k !== undefined && zone.temp_max_k !== undefined) {
        t_res = Math.max(zone.temp_min_k, Math.min(zone.temp_max_k, t_res));
      }
      tResolved.set(zone.zone_id, t_res);
    }

    // Step 2: recompute exchange flows §11.4
    const q_next = new Map<string, number>();
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

    for (const [k2, v] of q_next) q.set(k2, v);

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
export function runExtension3A(input: Extension3AInput): Extension3AResult {
  const trace: string[] = ['run-extension-3a: begin'];
  const blockingErrors: string[] = [];

  // ── Gate: if 3A not enabled, return clean bypass ──────────────────────────
  const rawEnable = input.scenario.enable_model_extension_3a;
  const effectiveEnable = rawEnable === true;
  if (!effectiveEnable) {
    trace.push('run-extension-3a: enable_model_extension_3a=false — bypass §5.3');
    return {
      extension_3a_enabled: false,
      model_extension_3a_mode: 'disabled',
      spec_version: EXTENSION_3A_SPEC_VERSION,
      blueprint_version: EXTENSION_3A_BLUEPRINT_VERSION,
      // §10.1 metadata fields — HOLE-3A-METADATA-001: topology_report_policy has no scenario field; defaults 'always'
      topology_report_policy: 'always',
      defaults_audit_version: null,
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
  const norm: Extension3ANormalizationResult = normalizeExtension3A(
    input.scenario,
    input.radiators
  );
  trace.push(...norm.transform_trace);
  const defaults_applied = [...norm.defaults_applied];
  const cc = norm.convergence_control;

  // ── Phase 2: Operating mode validation ────────────────────────────────────
  const modeViolations = validateExtension3AOperatingMode({
    enable_model_extension_3a: effectiveEnable,
    model_extension_3a_mode: norm.model_extension_3a_mode,
    topology_validation_policy: norm.topology_validation_policy,
  });
  for (const mv of modeViolations) {
    if (mv.severity === 'error') blockingErrors.push(mv.message);
  }

  // ── Phase 3: Convergence control bounds ───────────────────────────────────
  const ccViolations = validateConvergenceControl(cc);
  for (const v of ccViolations) {
    if (v.severity === 'error') blockingErrors.push(v.message);
  }

  // ── Phase 4: Catalog resolution ───────────────────────────────────────────
  const catalogResult = resolveZoneCatalogRefs(
    norm.normalized_zones,
    input.catalogs.working_fluid_catalog,
    input.catalogs.pickup_geometry_catalog
  );
  trace.push(...catalogResult.transform_trace);
  blockingErrors.push(...catalogResult.blocking_errors);

  // Build pickup multiplier map
  const pickupMultiplierMap = new Map<string, number>();
  for (const [zoneId, pgRes] of catalogResult.pickupGeometryResults) {
    pickupMultiplierMap.set(zoneId, pgRes.nominal_resistance_multiplier);
  }

  // ── Phase 5: Cross-reference validation ───────────────────────────────────
  const zoneRefViolations = validateZoneTopologyRefs(norm.normalized_zones);
  const availableFluidIds = (input.catalogs.working_fluid_catalog.entries as Array<Record<string, unknown>>)
    .map(e => String(e.working_fluid_id ?? ''));
  const availableGeomIds = (input.catalogs.pickup_geometry_catalog.entries as Array<Record<string, unknown>>)
    .map(e => String(e.pickup_geometry_id ?? ''));
  const wfRefViolations = validateWorkingFluidRefs(norm.normalized_zones, availableFluidIds);
  const chainViolations = validateChainBoundaries(norm.normalized_zones);
  const chainBlocking = chainViolations.filter(v => !v.message.startsWith('[WARNING-ZC-003]'));
  const chainWarnings = chainViolations.filter(v => v.message.startsWith('[WARNING-ZC-003]'));
  const pgRefViolations = validatePickupGeometryRefs(norm.normalized_zones, availableGeomIds);

  const allCrossRefViolations = [...zoneRefViolations, ...wfRefViolations, ...pgRefViolations];
  for (const v of allCrossRefViolations) {
    blockingErrors.push(v.message);
  }

  // ── Phase 6: Topology validation ─────────────────────────────────────────
  const topoPolicy = (norm.topology_validation_policy as 'blocking' | 'warn_only') ?? 'blocking';
  const topoResult = validateTopology(norm.normalized_zones, topoPolicy);
  const topoViolations = topoResult.violations.filter(v => v.severity === 'error');
  for (const v of topoViolations) blockingErrors.push(v.message);
  trace.push(`run-extension-3a: topology valid=${topoResult.valid} cycle=${topoResult.cycle_detected} order=[${topoResult.topology_order.join(',')}]`);

  // ── Phase 7: Resistance chain computation ────────────────────────────────
  const resistanceTotals = computeZoneResistanceTotals(norm.normalized_zones, pickupMultiplierMap);
  const resistanceSummary: Record<string, { r_total_k_per_w: number; t_junction_k: number | null }> = {};
  for (const [zoneId, res] of resistanceTotals) {
    resistanceSummary[zoneId] = {
      r_total_k_per_w: res.r_total_k_per_w,
      t_junction_k: res.t_junction_k,
    };
  }

  // Resistance bounds validation
  const resistanceBoundsViolations: Array<{ rule: string; field: string; message: string }> = [];
  for (const zone of norm.normalized_zones) {
    const pgResolved = catalogResult.pickupGeometryResults.has(zone.zone_id);
    const rViolations = validateResistanceChain(zone, pgResolved);
    resistanceBoundsViolations.push(...rViolations.map(v => ({ rule: v.rule, field: v.field, message: v.message })));
    for (const v of rViolations) {
      if (v.severity === 'error') blockingErrors.push(v.message);
    }
  }

  // ── Phase 8: Bridge losses ────────────────────────────────────────────────
  const bridgeLosses: BridgeLossEntry[] = [];
  for (const zone of norm.normalized_zones) {
    if (zone.isolation_boundary && zone.bridge_resistance_k_per_w) {
      const upRef = zone.upstream_zone_ref;
      const downRef = zone.downstream_zone_ref;
      const upZone = norm.normalized_zones.find(z => z.zone_id === upRef);
      const downZone = norm.normalized_zones.find(z => z.zone_id === downRef);
      const t_up = (upZone?.target_temp_k as number | undefined) ?? 0;
      const t_down = (downZone?.target_temp_k as number | undefined) ?? 0;
      if (t_up && t_down) {
        const q_bridge = computeBridgeHeatTransfer(t_up, t_down, zone.bridge_resistance_k_per_w);
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
  let convergenceStatus: Extension3AResult['convergence_status'] = 'not_required';
  let convergenceIterations = 0;
  let convergenceAttempted = false;

  if (convergenceZones.length > 0 && norm.model_extension_3a_mode !== 'topology_only') {
    convergenceAttempted = true;
    // Build convergence edges: zones that share upstream/downstream refs
    const convEdges: Array<{ from: string; to: string; r_bridge: number }> = [];
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
      target_temp_k: (z.target_temp_k as number | undefined) ?? 300,
      temp_min_k: z.temp_min_k as number | undefined,
      temp_max_k: z.temp_max_k as number | undefined,
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
  let t_sink_resolved: number | null = null;
  let t_sink_source: Extension3AResult['t_sink_source'] = 'unresolved';
  let a_bol: number | null = null;
  let a_eol: number | null = null;
  let a_delta: number | null = null;
  let reserve_sufficient: boolean | null = null;
  let rad_pres_pa: number | null = null;
  let rad_pres_n: number | null = null;
  const boundsViolations: Array<{ rule: string; field: string; message: string }> = [...resistanceBoundsViolations];
  const boundsWarnings: Array<{ rule: string; field: string; message: string }> = [];

  if (norm.normalized_radiators.length > 0) {
    const firstRad = norm.normalized_radiators[0];
    const radId = String(firstRad.radiator_id ?? 'radiator-0');

    // §9.4 T_sink resolution
    const sinkRes = resolveRadiatorTSink(
      firstRad.background_sink_temp_k_override as number | null | undefined,
      input.environment_sink_temperature_k
    );
    t_sink_resolved = sinkRes.t_sink_k;
    t_sink_source = sinkRes.source;
    defaults_applied.push(`radiator[${radId}].t_sink → source=${sinkRes.source}`);

    const tSinkResolvable = t_sink_resolved !== null;

    // Radiator bounds validation
    const radBoundsViolations = validateRadiator3ABounds(
      {
        radiator_id: radId,
        geometry_mode: firstRad.geometry_mode as string,
        face_a_view_factor: firstRad.face_a_view_factor as number | null,
        face_b_view_factor: firstRad.face_b_view_factor as number,
        surface_emissivity_bol: firstRad.surface_emissivity_bol as number | null,
        surface_emissivity_eol_override: firstRad.surface_emissivity_eol_override as number | null,
        emissivity_degradation_fraction: firstRad.emissivity_degradation_fraction as number | null,
        cavity_emissivity_mode: firstRad.cavity_emissivity_mode as string,
        cavity_view_factor: firstRad.cavity_view_factor as number | null,
        cavity_surface_emissivity: firstRad.cavity_surface_emissivity as number | null,
        background_sink_temp_k_override: firstRad.background_sink_temp_k_override as number | null,
      },
      tSinkResolvable
    );

    for (const v of radBoundsViolations) {
      if (v.severity === 'error') {
        blockingErrors.push(v.message);
        boundsViolations.push({ rule: v.rule, field: v.field, message: v.message });
      } else {
        boundsWarnings.push({ rule: v.rule, field: v.field, message: v.message });
      }
    }

    // Only compute sizing if no blocking radiator errors and T_sink resolved
    if (tSinkResolvable && blockingErrors.length === 0 && firstRad.surface_emissivity_bol) {
      const q_required = (firstRad['q_dot_required_w'] as number | undefined) ?? 0;
      const t_rad_k = (firstRad.target_surface_temp_k as number | undefined) ?? 1200;
      const fav = (firstRad.face_a_view_factor as number | undefined) ?? 1.0;
      const fbv = firstRad.face_b_view_factor ?? 0;

      const sizingInput: Radiator3ASizingInput = {
        radiator_id: radId,
        geometry_mode: (firstRad.geometry_mode as Radiator3ASizingInput['geometry_mode']) ?? 'single_sided',
        face_a_view_factor: fav,
        face_b_view_factor: fbv,
        surface_emissivity_bol: firstRad.surface_emissivity_bol as number,
        surface_emissivity_eol_override: firstRad.surface_emissivity_eol_override as number | null,
        emissivity_degradation_fraction: firstRad.emissivity_degradation_fraction as number | null,
        cavity_emissivity_mode: (firstRad.cavity_emissivity_mode as Radiator3ASizingInput['cavity_emissivity_mode']) ?? 'disabled',
        cavity_view_factor: firstRad.cavity_view_factor as number | null,
        cavity_surface_emissivity: firstRad.cavity_surface_emissivity as number | null,
        t_sink_resolved_k: t_sink_resolved ?? 0,
        t_rad_k,
        q_dot_required_w: q_required,
        reserve_margin_fraction: (firstRad.reserve_margin_fraction as number | undefined) ?? 0.15,
        declared_area_m2: (firstRad.face_a_area_m2 as number | undefined) ?? null,
      };

      const sizingResult = computeRadiator3ASizing(sizingInput);
      a_bol = sizingResult.a_bol_required_m2;
      a_eol = sizingResult.a_eol_required_m2;
      a_delta = sizingResult.a_delta_m2;
      reserve_sufficient = sizingResult.reserve_margin_sufficient;

      // §11.10 radiation pressure
      const a_projected = (firstRad.face_a_area_m2 as number | undefined) ?? a_bol ?? 1;
      const radPres = computeRadiationPressure(q_required, a_projected);
      rad_pres_pa = radPres.p_rad_pa;
      rad_pres_n = radPres.f_rad_n;
    }
  }

  trace.push(`run-extension-3a: blocking_errors=${blockingErrors.length}`);
  trace.push('run-extension-3a: complete');

  return {
    extension_3a_enabled: true,
    model_extension_3a_mode: norm.model_extension_3a_mode,
    spec_version: EXTENSION_3A_SPEC_VERSION,
    blueprint_version: EXTENSION_3A_BLUEPRINT_VERSION,
    // §10.1 metadata fields — HOLE-3A-METADATA-001: topology_report_policy has no scenario field; defaults 'always'
    topology_report_policy: 'always',
    defaults_audit_version: norm.defaults_audit_version,
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
