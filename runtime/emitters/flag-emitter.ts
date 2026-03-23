/**
 * flag-emitter.ts
 * Structured flag generation contract.
 * Governing spec: §35, §35.1, §35.2.
 * This module has no internal imports — it is the leaf dependency for all
 * validators. Build order: flag-emitter first, then bounds, operating-mode.
 */

// ─── Flag type contract §35 ───────────────────────────────────────────────────

export type FlagSeverity = 'info' | 'warning' | 'review' | 'error';

export interface Flag {
  /** Stable flag identifier. §35 */
  flag_id: string;
  /** Severity classification. §35.2 */
  severity: FlagSeverity;
  /** Human-readable explanation. §35 */
  message: string;
  /** Subsystem that triggered the flag. §35 */
  related_subsystem: string;
  /** Specific field or rule reference. §35 */
  related_field: string;
  /** Value that triggered the flag, if applicable. §35 */
  trigger_value: number | string | null;
  /** Threshold or limit that was exceeded. §35 */
  threshold_value: number | string | null;
  /** Whether human review is required before accepting output. §35 */
  review_required: boolean;
}

// ─── Minimum supported flag IDs §35.1 ─────────────────────────────────────────

export const FLAG_IDS = {
  EXCEEDS_MATERIAL_RANGE: 'exceeds_selected_material_range',
  EXCEEDS_FLUID_RANGE: 'exceeds_selected_fluid_range',
  EXCEEDS_DEVICE_THERMAL_POLICY: 'exceeds_selected_device_thermal_policy',
  REQUIRES_EXTREME_TEMP: 'requires_extreme_target_surface_temperature',
  REQUIRES_LARGE_RADIATOR: 'requires_large_radiator_scale',
  REQUIRES_HIGH_PARASITIC: 'requires_high_parasitic_work_input',
  LOW_SIGNIFICANCE_BRANCH: 'low_significance_recovery_branch_output',
  ASSUMPTION_INCOMPLETE: 'assumption_incompleteness',
  RESEARCH_REQUIRED: 'research_confirmation_required',
  ORBIT_CLASS_REJECTED: 'orbit_class_rejected',
  CARNOT_VIOLATION: 'carnot_violation',
  SCHEMA_VALIDATION_FAILED: 'schema_validation_failed',
  BOUNDS_VIOLATION: 'bounds_violation',
} as const;

// ─── Factory helpers ──────────────────────────────────────────────────────────

export function makeFlag(
  flag_id: string,
  severity: FlagSeverity,
  message: string,
  related_subsystem: string,
  related_field: string,
  trigger_value: number | string | null = null,
  threshold_value: number | string | null = null,
  review_required = false
): Flag {
  return {
    flag_id,
    severity,
    message,
    related_subsystem,
    related_field,
    trigger_value,
    threshold_value,
    review_required,
  };
}

export function makeFlagInfo(
  flag_id: string,
  message: string,
  subsystem: string,
  field: string,
  trigger?: number | string,
  threshold?: number | string
): Flag {
  return makeFlag(flag_id, 'info', message, subsystem, field, trigger ?? null, threshold ?? null, false);
}

export function makeFlagWarning(
  flag_id: string,
  message: string,
  subsystem: string,
  field: string,
  trigger?: number | string,
  threshold?: number | string
): Flag {
  return makeFlag(flag_id, 'warning', message, subsystem, field, trigger ?? null, threshold ?? null, false);
}

export function makeFlagReview(
  flag_id: string,
  message: string,
  subsystem: string,
  field: string,
  trigger?: number | string,
  threshold?: number | string
): Flag {
  return makeFlag(flag_id, 'review', message, subsystem, field, trigger ?? null, threshold ?? null, true);
}

export function makeFlagError(
  flag_id: string,
  message: string,
  subsystem: string,
  field: string,
  trigger?: number | string,
  threshold?: number | string
): Flag {
  return makeFlag(flag_id, 'error', message, subsystem, field, trigger ?? null, threshold ?? null, true);
}

// ─── Research-required flag factory §39 ───────────────────────────────────────

export function makeResearchRequiredFlag(field: string, subsystem: string): Flag {
  return makeFlagReview(
    FLAG_IDS.RESEARCH_REQUIRED,
    `Field '${field}' in subsystem '${subsystem}' is marked research-required. ` +
      `Output dependent on this field cannot be treated as final. §39`,
    subsystem,
    field
  );
}

// ─── Emitter: emit flags to structured array ──────────────────────────────────

export interface FlagEmitResult {
  flags: Flag[];
  error_count: number;
  review_count: number;
  warning_count: number;
  info_count: number;
  has_blocking_flags: boolean;
}

export function emitFlags(flags: Flag[]): FlagEmitResult {
  const error_count = flags.filter(f => f.severity === 'error').length;
  const review_count = flags.filter(f => f.severity === 'review').length;
  const warning_count = flags.filter(f => f.severity === 'warning').length;
  const info_count = flags.filter(f => f.severity === 'info').length;

  return {
    flags,
    error_count,
    review_count,
    warning_count,
    info_count,
    has_blocking_flags: error_count > 0,
  };
}

// =============================================================================
// Extension 3A flag IDs and factory helpers
// Governing law: 3A-spec §11.10, §13.1, §13.4; dist-tree patch §16 (flag-emitter.ts patch target)
// =============================================================================

export const FLAG_IDS_3A = {
  // Topology
  TOPOLOGY_CYCLE_DETECTED:       'topology_cycle_detected',
  TOPOLOGY_DISCONNECTED_ZONE:    'topology_disconnected_zone',
  TOPOLOGY_SINGLE_NEIGHBOR_BIDI: 'topology_single_neighbor_bidirectional',
  TOPOLOGY_NO_CONVERGENCE_PEER:  'topology_no_convergence_peer',

  // Convergence
  CONVERGENCE_NONCONVERGED:      'convergence_nonconverged',
  CONVERGENCE_RUNAWAY:           'convergence_runaway',
  CONVERGENCE_TEMP_CLAMPED:      'convergence_temp_clamped',

  // Radiator / radiation
  RADIATION_PRESSURE_WARNING:    'radiation_pressure_screening_warning',
  RESERVE_MARGIN_INSUFFICIENT:   'reserve_margin_insufficient',
  T_SINK_UNRESOLVED:             't_sink_unresolved',

  // Resistance
  RESISTANCE_ALL_NULL_WITH_LOAD: 'resistance_all_null_with_load',

  // Bridge
  BRIDGE_LOSS_HIGH:              'bridge_loss_high',
} as const;

/**
 * Emit radiation-pressure warning flag. §11.10, §3.6.
 * Flag-only: no propagation engine is triggered.
 */
export function makeFlagRadiationPressureWarning(
  p_rad_pa: number,
  f_rad_n: number,
  subsystem = 'radiator'
): Flag {
  return makeFlag(
    FLAG_IDS_3A.RADIATION_PRESSURE_WARNING,
    'warning',
    `Radiation pressure screening: p_rad=${p_rad_pa.toExponential(3)} Pa, F_rad=${f_rad_n.toExponential(3)} N. Flag-only per 3A-spec §11.10, §3.6.`,
    subsystem,
    'radiation_pressure_pa',
    p_rad_pa,
    null,
    true
  );
}

/**
 * Emit convergence failure warning flag. §13.4.
 */
export function makeFlagConvergenceNonconverged(
  iterations: number,
  subsystem = 'convergence'
): Flag {
  return makeFlag(
    FLAG_IDS_3A.CONVERGENCE_NONCONVERGED,
    'error',
    `Convergence failed after ${iterations} iterations. §13.4.`,
    subsystem,
    'convergence_status',
    'nonconverged',
    null,
    true
  );
}

/**
 * Emit convergence runaway flag. §13.4.
 */
export function makeFlagConvergenceRunaway(
  iterations: number,
  subsystem = 'convergence'
): Flag {
  return makeFlag(
    FLAG_IDS_3A.CONVERGENCE_RUNAWAY,
    'error',
    `Convergence runaway detected at iteration ${iterations}. State vector exceeded runaway multiplier threshold. §13.4.`,
    subsystem,
    'convergence_status',
    'runaway',
    null,
    true
  );
}

/**
 * Emit reserve margin insufficient flag. §11.9.
 */
export function makeFlagReserveMarginInsufficient(
  radiator_id: string,
  a_eol: number,
  declared_area: number
): Flag {
  return makeFlag(
    FLAG_IDS_3A.RESERVE_MARGIN_INSUFFICIENT,
    'warning',
    `Radiator '${radiator_id}' EOL required area ${a_eol.toFixed(4)} m² exceeds declared area ${declared_area.toFixed(4)} m² with margin. §11.9.`,
    'radiator',
    `radiator[${radiator_id}].reserve_margin`,
    a_eol,
    declared_area,
    true
  );
}

/**
 * Emit T_sink unresolved blocking flag. §9.4, §13.3.
 */
export function makeFlagTSinkUnresolved(radiator_id: string): Flag {
  return makeFlag(
    FLAG_IDS_3A.T_SINK_UNRESOLVED,
    'error',
    `T_sink unresolved for radiator '${radiator_id}'. Provide background_sink_temp_k_override or environment_profile.sink_temperature_k. §9.4.`,
    'radiator',
    `radiator[${radiator_id}].background_sink_temp_k_override`,
    null,
    null,
    true
  );
}

/**
 * Emit topology cycle detected flag. §13.1.
 */
export function makeFlagTopologyCycle(): Flag {
  return makeFlag(
    FLAG_IDS_3A.TOPOLOGY_CYCLE_DETECTED,
    'error',
    'Directed cycle detected in thermal zone topology graph. Execution blocked under blocking policy. §11.1, §13.1.',
    'topology',
    'thermal_zones',
    null,
    null,
    true
  );
}

/**
 * Emit all 3A flags for an Extension3AResult.
 * Convenience bundler — caller adds these flags to the runtime flag list.
 */
export function emit3AFlags(result: {
  topology_cycle_detected: boolean;
  convergence_status: string;
  convergence_iterations: number;
  reserve_margin_sufficient: boolean | null;
  t_sink_source: string;
  radiation_pressure_pa: number | null;
  radiation_pressure_force_n: number | null;
}): Flag[] {
  const flags: Flag[] = [];

  if (result.topology_cycle_detected) {
    flags.push(makeFlagTopologyCycle());
  }
  if (result.convergence_status === 'nonconverged') {
    flags.push(makeFlagConvergenceNonconverged(result.convergence_iterations));
  }
  if (result.convergence_status === 'runaway') {
    flags.push(makeFlagConvergenceRunaway(result.convergence_iterations));
  }
  if (result.reserve_margin_sufficient === false) {
    flags.push(makeFlag(FLAG_IDS_3A.RESERVE_MARGIN_INSUFFICIENT, 'warning',
      'Reserve margin insufficient for EOL radiator area requirement. §11.9.',
      'radiator', 'reserve_margin_sufficient', 'false', null, true));
  }
  if (result.t_sink_source === 'unresolved') {
    flags.push(makeFlag(FLAG_IDS_3A.T_SINK_UNRESOLVED, 'error',
      'T_sink unresolved. §9.4, §13.3.', 'radiator', 't_sink_source', 'unresolved', null, true));
  }
  if (result.radiation_pressure_pa !== null && result.radiation_pressure_force_n !== null) {
    flags.push(makeFlagRadiationPressureWarning(result.radiation_pressure_pa, result.radiation_pressure_force_n));
  }

  return flags;
}
