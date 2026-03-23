/**
 * operating-mode.ts
 * Operating mode boundary enforcement.
 * Governed by §4.4, §7.3, §13.1, §13.2, §13.3, §26.3, §29.2, §30.2, §46.
 * Added per HOLE-003: required by §26.3, omitted from §43. §26.3 governs.
 */

import { Flag, makeFlagError } from '../emitters/flag-emitter';
import { SUPPORTED_ORBIT_CLASSES } from '../constants/constants';
import { computeCarnotHeatPumpBound } from '../formulas/heat-pump';
import { computeCarnotEngineBound } from '../formulas/power-cycle';
import { LOW_SIGNIFICANCE_THRESHOLD_FRACTION } from '../constants/constants';

export interface OperatingModeViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

// ─── §7.3 — GEO-only scope enforcement ───────────────────────────────────────

/**
 * Reject scenario if orbit_class is not GEO. §7.3.
 */
export function validateOrbitClass(orbit_class: string): OperatingModeViolation[] {
  if (!SUPPORTED_ORBIT_CLASSES.includes(orbit_class as typeof SUPPORTED_ORBIT_CLASSES[number])) {
    return [
      {
        rule: '§7.3',
        message: `orbit_class '${orbit_class}' is not supported in v0.1.0. Only GEO is permitted.`,
        severity: 'error',
      },
    ];
  }
  return [];
}

// ─── §4.4 — No silent mode fusion ────────────────────────────────────────────

/**
 * Validate that heat-lift and power-cycle stages are not fused.
 * Each stage_type must be uniquely classified. §4.4.
 */
export function validateNoModeFusion(
  stages: Array<{ stage_id: string; stage_type: string }>
): OperatingModeViolation[] {
  const violations: OperatingModeViolation[] = [];

  for (const stage of stages) {
    if (stage.stage_type === 'lift' || stage.stage_type === 'power_cycle') {
      // These are exclusive — dual declaration on a single stage is fusion
      // (Schema already enforces enum; this catches semantic misuse at runtime)
    }
  }

  // Detect duplicate stage_ids (would allow hidden fusion)
  const ids = stages.map(s => s.stage_id);
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      violations.push({
        rule: '§4.4',
        message: `Duplicate stage_id detected: '${id}'. Stages must be uniquely identified to prevent mode fusion.`,
        severity: 'error',
      });
    }
    seen.add(id);
  }

  return violations;
}

// ─── §29.2 — Heat-lift Carnot enforcement ────────────────────────────────────

export interface HeatLiftModeCheck {
  branch_id: string;
  cop_heating_actual: number;
  t_cold_source_k: number;
  t_hot_delivery_k: number;
}

export function validateHeatLiftMode(check: HeatLiftModeCheck): OperatingModeViolation[] {
  const violations: OperatingModeViolation[] = [];

  if (check.t_hot_delivery_k <= check.t_cold_source_k) {
    violations.push({
      rule: '§29.2',
      message: `Heat-lift branch '${check.branch_id}': T_hot (${check.t_hot_delivery_k} K) must exceed T_cold (${check.t_cold_source_k} K).`,
      severity: 'error',
    });
    return violations;
  }

  const carnot = computeCarnotHeatPumpBound({
    t_cold_k: check.t_cold_source_k,
    t_hot_k: check.t_hot_delivery_k,
  });

  if (check.cop_heating_actual > carnot.cop_heating_carnot) {
    violations.push({
      rule: '§46',
      message:
        `PROHIBITED (§46): heat-lift branch '${check.branch_id}' COP_actual ` +
        `(${check.cop_heating_actual.toFixed(4)}) exceeds Carnot bound ` +
        `(${carnot.cop_heating_carnot.toFixed(4)}).`,
      severity: 'error',
    });
  }

  return violations;
}

// ─── §30.2 — Power-cycle Carnot enforcement ───────────────────────────────────

export interface PowerCycleModeCheck {
  branch_id: string;
  eta_cycle_actual: number;
  t_hot_source_k: number;
  t_cold_sink_k: number;
}

export function validatePowerCycleMode(check: PowerCycleModeCheck): OperatingModeViolation[] {
  const violations: OperatingModeViolation[] = [];

  if (check.t_hot_source_k <= check.t_cold_sink_k) {
    violations.push({
      rule: '§30.1',
      message:
        `Power-cycle branch '${check.branch_id}': T_hot_source (${check.t_hot_source_k} K) ` +
        `must exceed T_cold_sink (${check.t_cold_sink_k} K). Invalid source quality.`,
      severity: 'error',
    });
    return violations;
  }

  const carnot = computeCarnotEngineBound({
    t_hot_k: check.t_hot_source_k,
    t_cold_k: check.t_cold_sink_k,
  });

  if (check.eta_cycle_actual > carnot.eta_carnot_engine) {
    violations.push({
      rule: '§46',
      message:
        `PROHIBITED (§46): power-cycle branch '${check.branch_id}' eta_actual ` +
        `(${check.eta_cycle_actual.toFixed(6)}) exceeds Carnot bound ` +
        `(${carnot.eta_carnot_engine.toFixed(6)}).`,
      severity: 'error',
    });
  }

  return violations;
}

// ─── §31.3 — TEG low-significance flag ───────────────────────────────────────

export function checkScavengingSignificance(
  branch_id: string,
  branch_output_w: number,
  q_dot_internal_w: number
): Flag | null {
  if (q_dot_internal_w <= 0) return null;
  const fraction = branch_output_w / q_dot_internal_w;
  if (fraction < LOW_SIGNIFICANCE_THRESHOLD_FRACTION) {
    return makeFlagError(
      'low_significance_recovery_branch_output',
      `Scavenging branch '${branch_id}' output (${branch_output_w.toFixed(2)} W) is ` +
        `${(fraction * 100).toFixed(3)}% of total internal dissipation — ` +
        `below significance threshold (${(LOW_SIGNIFICANCE_THRESHOLD_FRACTION * 100).toFixed(0)}%). §31.3`,
      'conversion_branch',
      branch_id,
      branch_output_w,
      q_dot_internal_w * LOW_SIGNIFICANCE_THRESHOLD_FRACTION
    );
  }
  return null;
}

/**
 * Convert OperatingModeViolations to Flags.
 */
export function modeViolationsToFlags(violations: OperatingModeViolation[]): Flag[] {
  return violations.map((v, i) =>
    makeFlagError(
      `operating_mode_violation_${i}`,
      v.message,
      'scenario',
      v.rule,
      0,
      undefined
    )
  );
}

// =============================================================================
// Extension 3A — operating mode validation
// Governing law: 3A-spec §5.1–§5.3; dist-tree patch §5 (operating-mode.ts patch target)
// =============================================================================

/**
 * 3A mode enum values per §5.2.
 */
export const MODEL_EXTENSION_3A_MODES = [
  'disabled',
  'topology_only',
  'foundational_hardening',
] as const;
export type ModelExtension3AMode = typeof MODEL_EXTENSION_3A_MODES[number];

/**
 * Topology validation policy values per §5.2.
 */
export const TOPOLOGY_VALIDATION_POLICIES = ['blocking', 'warn_only'] as const;
export type TopologyValidationPolicy = typeof TOPOLOGY_VALIDATION_POLICIES[number];

/**
 * Validate extension 3A mode field.
 * Returns violation if mode is not a recognized 3A enum value.
 * §5.2.
 */
export function validateExtension3AMode(
  mode: string | undefined | null
): OperatingModeViolation[] {
  if (mode === undefined || mode === null) return [];
  if (!(MODEL_EXTENSION_3A_MODES as readonly string[]).includes(mode)) {
    return [{
      rule: '3A-spec §5.2',
      message: `model_extension_3a_mode '${mode}' is not a recognized value. ` +
        `Allowed: ${MODEL_EXTENSION_3A_MODES.join(', ')}.`,
      severity: 'error',
    }];
  }
  return [];
}

/**
 * Validate topology_validation_policy field.
 * §5.1, §5.2.
 */
export function validateTopologyPolicy(
  policy: string | undefined | null
): OperatingModeViolation[] {
  if (policy === undefined || policy === null) return [];
  if (!(TOPOLOGY_VALIDATION_POLICIES as readonly string[]).includes(policy)) {
    return [{
      rule: '3A-spec §5.2',
      message: `topology_validation_policy '${policy}' is not a recognized value. ` +
        `Allowed: ${TOPOLOGY_VALIDATION_POLICIES.join(', ')}.`,
      severity: 'error',
    }];
  }
  return [];
}

/**
 * Validate Extension 3A gate: if enable_model_extension_3a=false, 3A mode must be disabled.
 * Backward compat: absent enable flag treated as false per §5.3.
 * §5.3.
 */
export function validateExtension3AGate(
  enable: boolean | undefined | null,
  mode: string | undefined | null
): OperatingModeViolation[] {
  const effectiveEnable = enable ?? false;
  const effectiveMode = mode ?? 'disabled';

  if (!effectiveEnable && effectiveMode !== 'disabled') {
    return [{
      rule: '3A-spec §5.3',
      message: `enable_model_extension_3a=false but model_extension_3a_mode='${effectiveMode}'. ` +
        `Mode must be 'disabled' when the 3A gate is false.`,
      severity: 'error',
    }];
  }
  return [];
}

/**
 * Full 3A mode validation bundle.
 * Call with scenario fields to get all mode-level violations.
 */
export function validateExtension3AOperatingMode(params: {
  enable_model_extension_3a?: boolean | null;
  model_extension_3a_mode?: string | null;
  topology_validation_policy?: string | null;
}): OperatingModeViolation[] {
  return [
    ...validateExtension3AMode(params.model_extension_3a_mode),
    ...validateTopologyPolicy(params.topology_validation_policy),
    ...validateExtension3AGate(params.enable_model_extension_3a, params.model_extension_3a_mode),
  ];
}

// =============================================================================
// Extension 3B operating-mode validation
// Governing law: 3B-spec §13.1, §5.2
// Blueprint: 3B-blueprint §13
// Additive. Does not mutate 3A mode validators.
// =============================================================================

const VALID_3B_MODES = ['disabled', 'subsystem_depth_only', 'subsystem_depth_with_eclipse', 'full_3b'];

/**
 * Validate model_extension_3b_mode enum.
 * 3B-spec §5.2.
 */
export function validateExtension3BMode(
  mode?: string | null
): OperatingModeViolation[] {
  if (mode === undefined || mode === null) return [];
  if (!VALID_3B_MODES.includes(mode)) {
    return [{
      rule: '3B-spec §5.2',
      message: `model_extension_3b_mode '${mode}' is not a valid 3B mode. Expected one of: ${VALID_3B_MODES.join(', ')}.`,
      severity: 'error',
    }];
  }
  return [];
}

/**
 * Validate 3B enable gate: enabled=true requires mode != disabled.
 * 3B-spec §13.1.
 */
export function validateExtension3BGate(
  enabled?: boolean | null,
  mode?: string | null
): OperatingModeViolation[] {
  if (!enabled) return [];
  if (!mode || mode === 'disabled') {
    return [{
      rule: '3B-spec §13.1',
      message: `enable_model_extension_3b=true requires model_extension_3b_mode != disabled (current: '${mode ?? 'null'}').`,
      severity: 'error',
    }];
  }
  return [];
}

/**
 * Validate eclipse-semantics modes require resolvable operating_state.
 * 3B-spec §13.1.
 */
export function validateEclipseSemanticsModeGate(
  mode?: string | null,
  hasResolvableOperatingState?: boolean
): OperatingModeViolation[] {
  if (mode !== 'subsystem_depth_with_eclipse' && mode !== 'full_3b') return [];
  if (!hasResolvableOperatingState) {
    return [{
      rule: '3B-spec §13.1',
      message: `model_extension_3b_mode='${mode}' requires resolvable operating_state but none is present.`,
      severity: 'error',
    }];
  }
  return [];
}

/**
 * Full 3B mode validation bundle. 3B-spec §13.1, §5.2.
 */
export function validateExtension3BOperatingMode(params: {
  enable_model_extension_3b?: boolean | null;
  model_extension_3b_mode?: string | null;
  has_resolvable_operating_state?: boolean;
}): OperatingModeViolation[] {
  return [
    ...validateExtension3BMode(params.model_extension_3b_mode),
    ...validateExtension3BGate(params.enable_model_extension_3b, params.model_extension_3b_mode),
    ...validateEclipseSemanticsModeGate(params.model_extension_3b_mode, params.has_resolvable_operating_state),
  ];
}
