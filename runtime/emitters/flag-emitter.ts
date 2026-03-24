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

// =============================================================================
// Extension 3B flag emission
// Governing law: 3B-spec §13, §14 (blocking_errors, warnings)
// Blueprint: 3B-blueprint §5.6
// 3B warnings and blocking errors must emit through the canonical flag path.
// Additive. Does not mutate baseline or 3A flag IDs.
// =============================================================================

export const FLAG_IDS_3B = {
  VAULT_GAS_CONVECTION_MISSING_H:     '3B-VAULT-GAS-001',
  VAULT_GAS_CONVECTION_MISSING_AREA:  '3B-VAULT-GAS-002',
  VAULT_GAS_ELEVATED_OUTGASSING:      '3B-VAULT-GAS-W001',
  TRANSPORT_DIRECT_POWER_MISSING:     '3B-TRANSPORT-001',
  TRANSPORT_PRESSURE_DROP_MISSING:    '3B-TRANSPORT-002',
  TRANSPORT_DENSITY_UNRESOLVED:       '3B-TRANSPORT-005',
  GAS_MGMT_VOID_EXCEEDED_BLOCKING:    '3B-GAS-MGMT-001',
  GAS_MGMT_VOID_EXCEEDED_WARNING:     '3B-GAS-MGMT-W001',
  GAS_MGMT_PENALTY_OUT_OF_RANGE:      '3B-GAS-MGMT-002',
  TEG_NOT_SUBORDINATE:                '3B-TEG-001',
  TEG_TEMPS_MISSING:                  '3B-TEG-002',
  TEG_THOT_LEQ_TCOLD:                 '3B-TEG-003',
  TEG_ETA_EXCEEDS_CARNOT:             '3B-TEG-W001',
  TEG_RESIDUAL_OFF_NODE:              '3B-TEG-W002',
  ECLIPSE_STORAGE_REF_MISSING:        '3B-ECLIPSE-001',
  ECLIPSE_DERATE_OUT_OF_RANGE:        '3B-ECLIPSE-002',
  ECLIPSE_STATE_CUSTOM:               '3B-ECLIPSE-W001',
  NORM_PRESET_NOT_FOUND:              '3B-NORM-001',
  MODE_GATE_VIOLATION:                '3B-BOUNDS-001',
} as const;

/**
 * Emit 3B flags from extension_3b_result blocking_errors and warnings.
 * 3B-spec §13, §14.
 */
export function emit3BFlags(result: {
  blocking_errors: string[];
  warnings: string[];
}): Flag[] {
  const flags: Flag[] = [];

  for (const err of result.blocking_errors) {
    flags.push(makeFlag(
      err.split(':')[0]?.trim() ?? '3B-ERROR',
      'error',
      err,
      'extension_3b',
      'blocking_errors',
      err,
      null,
      true
    ));
  }

  for (const warn of result.warnings) {
    flags.push(makeFlag(
      warn.split(':')[0]?.trim() ?? '3B-WARN',
      'warning',
      warn,
      'extension_3b',
      'warnings',
      warn,
      null,
      false
    ));
  }

  return flags;
}

// =============================================================================
// Extension 4 flag IDs and factory helpers
// Governing law: ext4-spec-v0.1.4 §13.3–§13.5, §18.3
// Blueprint: blueprint-v0.1.4 §Controls-and-Gates
// Minimum required IDs per §18.3. Additive only. Does not mutate baseline,
// 3A, or 3B flag IDs.
// =============================================================================

export const FLAG_IDS_EXT4 = {
  // Informational — §13.5, §18.3
  INFO_DISABLED:                      'EXT4-INFO-DISABLED',
  INFO_ONEPASS:                       'EXT4-INFO-ONEPASS',
  INFO_ONEPASS_NO_3A:                 'EXT4-INFO-ONEPASS-NO-3A',
  INFO_ZERO_INTERCEPT:                'EXT4-INFO-ZERO-INTERCEPT',
  INFO_ZERO_EFFICIENCY:               'EXT4-INFO-ZERO-EFFICIENCY',

  // Warnings — §13.4, §18.3
  WARN_NO_EXPORT:                     'EXT4-WARN-NO-EXPORT',
  WARN_SEPARATE_COOLING_UNINTEGRATED: 'EXT4-WARN-SEPARATE-COOLING-UNINTEGRATED',
  WARN_NONCONVERGED:                  'EXT4-WARN-NONCONVERGED',
  WARN_ZERO_BASE_REF:                 'EXT4-WARN-ZERO-BASE-REF',

  // Errors — §13.3, §18.3
  ERR_MISSING_CONFIG:                 'EXT4-ERR-MISSING-CONFIG',
  ERR_MISSING_3A_AUTHORITY:           'EXT4-ERR-MISSING-3A-AUTHORITY',
  ERR_INVALID_BOUNDS:                 'EXT4-ERR-INVALID-BOUNDS',
  ERR_RUNAWAY:                        'EXT4-ERR-RUNAWAY',
} as const;

/**
 * Emit Extension 4 flags from extension_4_result blocking_errors and warnings.
 * ext4-spec §13.3–§13.5, §18.3. Additive — does not mutate 3A/3B flags.
 *
 * Routes known stable flag IDs to their declared severity.
 * Unknown codes default to 'warning' for warnings, 'error' for blocking errors.
 */
export function emit4Flags(result: {
  extension_4_enabled: boolean;
  model_extension_4_mode: string;
  blocking_errors: string[];
  warnings: string[];
}): Flag[] {
  const flags: Flag[] = [];

  // Disabled informational flag §13.5
  if (!result.extension_4_enabled) {
    flags.push(makeFlagInfo(
      FLAG_IDS_EXT4.INFO_DISABLED,
      'Extension 4 disabled — zero numeric authority. ext4-spec §3 rule 3.',
      'extension_4',
      'enable_model_extension_4'
    ));
    return flags;
  }

  // Blocking errors → error severity
  for (const err of result.blocking_errors) {
    const flag_id = err.split(':')[0]?.trim() ?? 'EXT4-ERR-UNKNOWN';
    flags.push(makeFlagError(
      flag_id,
      err,
      'extension_4',
      'blocking_errors',
      err
    ));
  }

  // Warnings — route INFO_ prefixed codes to info severity, rest to warning
  for (const warn of result.warnings) {
    const flag_id = warn.split(':')[0]?.trim() ?? 'EXT4-WARN-UNKNOWN';
    const isInfo = flag_id.startsWith('EXT4-INFO-');
    if (isInfo) {
      flags.push(makeFlagInfo(flag_id, warn, 'extension_4', 'warnings', warn));
    } else {
      flags.push(makeFlagWarning(flag_id, warn, 'extension_4', 'warnings', warn));
    }
  }

  return flags;
}
