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
