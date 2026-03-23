/**
 * default-expander.ts
 * Default expansion transform — injects spec-declared defaults for omitted fields.
 * Governed by §26.4, §40, §4.3 (baseline).
 * Extension 3A defaults governed by 3A-spec §12.1–§12.2.
 * All injected defaults are surfaced as assumptions per §4.3 / §12.2.
 */

import {
  EPSILON_RAD_DEFAULT,
  RESERVE_MARGIN_DEFAULT,
  T_SINK_EFFECTIVE_DEFAULT_K,
  T_REF_DEFAULT_K,
  THERMAL_POLICY_MARGINS,
  CONVERGENCE_MAX_ITERATIONS_DEFAULT,
  CONVERGENCE_TOLERANCE_ABS_W_DEFAULT,
  CONVERGENCE_TOLERANCE_REL_FRACTION_DEFAULT,
  CONVERGENCE_RUNAWAY_MULTIPLIER_DEFAULT,
  TOPOLOGY_VALIDATION_POLICY_DEFAULT,
} from '../constants/constants';
import { Assumption } from '../emitters/json-emitter';

export interface ExpandedDefaults {
  epsilon_rad: number;
  reserve_margin_fraction: number;
  t_sink_effective_k: number;
  t_ref_k: number;
  assumptions: Assumption[];
}

/**
 * Expand defaults for a scenario.
 * Every injected default is recorded as an assumption per §4.3 / §40.
 */
export function expandDefaults(overrides: {
  epsilon_rad?: number;
  reserve_margin_fraction?: number;
  t_sink_effective_k?: number;
  t_ref_k?: number;
  thermal_policy?: string;
}): ExpandedDefaults {
  const assumptions: Assumption[] = [];

  const epsilon_rad = overrides.epsilon_rad ?? EPSILON_RAD_DEFAULT;
  if (overrides.epsilon_rad === undefined) {
    assumptions.push({
      field: 'epsilon_rad',
      value: EPSILON_RAD_DEFAULT,
      source: 'default',
      note: 'Default radiator emissivity per §40.',
    });
  }

  // Policy-aware margin
  const policy_margin =
    overrides.thermal_policy !== undefined
      ? (THERMAL_POLICY_MARGINS[overrides.thermal_policy] ?? RESERVE_MARGIN_DEFAULT)
      : RESERVE_MARGIN_DEFAULT;

  const reserve_margin_fraction = overrides.reserve_margin_fraction ?? policy_margin;
  if (overrides.reserve_margin_fraction === undefined) {
    assumptions.push({
      field: 'reserve_margin_fraction',
      value: reserve_margin_fraction,
      source: 'default',
      note: `Default reserve margin for thermal policy '${overrides.thermal_policy ?? 'nominal'}' per §40 / §33.`,
    });
  }

  const t_sink_effective_k = overrides.t_sink_effective_k ?? T_SINK_EFFECTIVE_DEFAULT_K;
  if (overrides.t_sink_effective_k === undefined) {
    assumptions.push({
      field: 't_sink_effective_k',
      value: T_SINK_EFFECTIVE_DEFAULT_K,
      source: 'default',
      note: 'Deep-space first-order sizing assumption per §40.',
    });
  }

  const t_ref_k = overrides.t_ref_k ?? T_REF_DEFAULT_K;
  if (overrides.t_ref_k === undefined) {
    assumptions.push({
      field: 't_ref_k',
      value: T_REF_DEFAULT_K,
      source: 'default',
      note: 'Reference temperature for exergy calculation per §26.1.',
    });
  }

  return { epsilon_rad, reserve_margin_fraction, t_sink_effective_k, t_ref_k, assumptions };
}

// =============================================================================
// Extension 3A default expansion
// Governing law: 3A-spec §12.1 (defaults table), §12.2 (default rules)
// dist-tree patch: default-expander.ts is the correct patch target (not a new file)
// =============================================================================

/**
 * 3A resistance chain sub-object with all terms defaulted to null.
 * §12.1: thermal-zone.resistance_chain defaults all sub-fields to null.
 */
export interface ResistanceChainDefaults {
  r_junction_to_case_k_per_w: null;
  r_case_to_spreader_k_per_w: null;
  r_spreader_to_pickup_nominal_k_per_w: null;
  r_pickup_to_loop_k_per_w: null;
  r_loop_to_sink_k_per_w: null;
}

/**
 * 3A convergence control with all spec-declared defaults injected.
 * §5.4, §12.1.
 */
export interface ConvergenceControlDefaults {
  max_iterations: number;
  tolerance_abs_w: number;
  tolerance_rel_fraction: number;
  runaway_multiplier: number;
  blocking_on_nonconvergence: boolean;
}

/**
 * Full 3A defaults expansion result.
 * Every injected default is recorded in defaults_applied[] per §12.2, §14.1.
 */
export interface Expanded3ADefaults {
  // Scenario-level
  enable_model_extension_3a: false;
  model_extension_3a_mode: 'disabled';
  topology_validation_policy: string;
  convergence_control: ConvergenceControlDefaults;
  defaults_audit_version: string | null;
  // Thermal-zone-level
  zone_flow_direction: 'isolated';
  zone_isolation_boundary: false;
  zone_upstream_zone_ref: null;
  zone_downstream_zone_ref: null;
  zone_bridge_resistance_k_per_w: null;
  zone_working_fluid_ref: null;
  zone_pickup_geometry_ref: null;
  zone_convergence_enabled: false;
  zone_resistance_chain: null;
  // Radiator-level
  radiator_geometry_mode: 'single_sided';
  radiator_face_b_area_m2: 0;
  radiator_face_b_view_factor: 0;
  radiator_surface_emissivity_eol_override: null;
  radiator_emissivity_degradation_fraction: null;
  radiator_cavity_emissivity_mode: 'disabled';
  radiator_cavity_view_factor: null;
  radiator_cavity_surface_emissivity: null;
  radiator_background_sink_temp_k_override: null;
  // Audit record
  defaults_applied: string[];
}

/**
 * Expand all Extension 3A defaults for a scenario packet.
 * Applies §12.1 defaults table exactly. Every injection is recorded
 * in defaults_applied[] with field-path string per §14.1.
 *
 * NOTE: surface_emissivity_bol has NO silent default per §12.1 / §12.2.
 * If absent, the caller must block execution (§13.3 validation).
 *
 * @param overrides - any 3A fields already present in the packet
 * @returns full expanded 3A defaults + audit trail
 */
export function expand3ADefaults(overrides: {
  enable_model_extension_3a?: boolean | null;
  model_extension_3a_mode?: string | null;
  topology_validation_policy?: string | null;
  convergence_control?: Partial<ConvergenceControlDefaults> | null;
  defaults_audit_version?: string | null;
}): Expanded3ADefaults {
  const defaults_applied: string[] = [];

  function injectDefault<T>(
    fieldPath: string,
    presentValue: T | undefined | null,
    defaultValue: T
  ): T {
    if (presentValue === undefined || presentValue === null) {
      defaults_applied.push(fieldPath);
      return defaultValue;
    }
    return presentValue;
  }

  // ── Scenario-level defaults ──────────────────────────────────────────────
  const enable_model_extension_3a = injectDefault(
    'scenario.enable_model_extension_3a',
    overrides.enable_model_extension_3a,
    false
  ) as false;

  const model_extension_3a_mode = injectDefault(
    'scenario.model_extension_3a_mode',
    overrides.model_extension_3a_mode,
    'disabled'
  ) as 'disabled';

  const topology_validation_policy = injectDefault(
    'scenario.topology_validation_policy',
    overrides.topology_validation_policy,
    TOPOLOGY_VALIDATION_POLICY_DEFAULT
  );

  // ── Convergence control sub-object ───────────────────────────────────────
  const cc = overrides.convergence_control ?? {};
  const convergence_control: ConvergenceControlDefaults = {
    max_iterations: injectDefault(
      'convergence_control.max_iterations', cc.max_iterations, CONVERGENCE_MAX_ITERATIONS_DEFAULT
    ),
    tolerance_abs_w: injectDefault(
      'convergence_control.tolerance_abs_w', cc.tolerance_abs_w, CONVERGENCE_TOLERANCE_ABS_W_DEFAULT
    ),
    tolerance_rel_fraction: injectDefault(
      'convergence_control.tolerance_rel_fraction', cc.tolerance_rel_fraction, CONVERGENCE_TOLERANCE_REL_FRACTION_DEFAULT
    ),
    runaway_multiplier: injectDefault(
      'convergence_control.runaway_multiplier', cc.runaway_multiplier, CONVERGENCE_RUNAWAY_MULTIPLIER_DEFAULT
    ),
    blocking_on_nonconvergence: injectDefault(
      'convergence_control.blocking_on_nonconvergence', cc.blocking_on_nonconvergence, true
    ),
  };
  if (!overrides.convergence_control) {
    defaults_applied.push('convergence_control (full object — all sub-fields defaulted)');
  }

  const defaults_audit_version = injectDefault(
    'scenario.defaults_audit_version', overrides.defaults_audit_version, null
  );

  return {
    // Scenario-level
    enable_model_extension_3a,
    model_extension_3a_mode,
    topology_validation_policy,
    convergence_control,
    defaults_audit_version,
    // Thermal-zone-level (per-zone, injected by normalizer before validation)
    zone_flow_direction: 'isolated',
    zone_isolation_boundary: false,
    zone_upstream_zone_ref: null,
    zone_downstream_zone_ref: null,
    zone_bridge_resistance_k_per_w: null,
    zone_working_fluid_ref: null,
    zone_pickup_geometry_ref: null,
    zone_convergence_enabled: false,
    zone_resistance_chain: null,
    // Radiator-level (per-radiator, injected by normalizer before validation)
    radiator_geometry_mode: 'single_sided',
    radiator_face_b_area_m2: 0,
    radiator_face_b_view_factor: 0,
    radiator_surface_emissivity_eol_override: null,
    radiator_emissivity_degradation_fraction: null,
    radiator_cavity_emissivity_mode: 'disabled',
    radiator_cavity_view_factor: null,
    radiator_cavity_surface_emissivity: null,
    radiator_background_sink_temp_k_override: null,
    // Audit
    defaults_applied,
  };
}

/**
 * Inject 3A per-zone defaults onto a mutable zone object.
 * Called by extension-3a-normalizer for each zone in thermal_zones[].
 * §12.1 zone-level defaults.
 * Returns array of field paths where defaults were injected.
 */
export function injectZone3ADefaults(
  zone: Record<string, unknown>
): string[] {
  const injected: string[] = [];
  const zoneId = String(zone.zone_id ?? 'unknown');

  function injectField(field: string, defaultVal: unknown): void {
    if (zone[field] === undefined || zone[field] === null) {
      zone[field] = defaultVal;
      injected.push(`thermal_zones[${zoneId}].${field}`);
    }
  }

  injectField('flow_direction', 'isolated');
  injectField('isolation_boundary', false);
  injectField('upstream_zone_ref', null);
  injectField('downstream_zone_ref', null);
  injectField('bridge_resistance_k_per_w', null);
  injectField('working_fluid_ref', null);
  injectField('pickup_geometry_ref', null);
  injectField('convergence_enabled', false);
  injectField('resistance_chain', null);

  return injected;
}

/**
 * Inject 3A per-radiator defaults onto a mutable radiator object.
 * Called by extension-3a-normalizer for each radiator.
 * NOTE: surface_emissivity_bol is NOT injected — it has no silent default per §12.2.
 * §12.1 radiator-level defaults.
 * Returns array of field paths where defaults were injected.
 */
export function injectRadiator3ADefaults(
  radiator: Record<string, unknown>,
  radiatorId: string
): string[] {
  const injected: string[] = [];

  function injectField(field: string, defaultVal: unknown): void {
    if (radiator[field] === undefined || radiator[field] === null) {
      radiator[field] = defaultVal;
      injected.push(`radiator[${radiatorId}].${field}`);
    }
  }

  injectField('geometry_mode', 'single_sided');
  injectField('face_b_area_m2', 0);
  injectField('face_b_view_factor', 0);
  injectField('surface_emissivity_eol_override', null);
  injectField('emissivity_degradation_fraction', null);
  injectField('cavity_emissivity_mode', 'disabled');
  injectField('cavity_view_factor', null);
  injectField('cavity_surface_emissivity', null);
  injectField('background_sink_temp_k_override', null);
  // surface_emissivity_bol: NO default injected per §12.2 — must be explicit

  return injected;
}
