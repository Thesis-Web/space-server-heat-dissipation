/**
 * extension-3a-normalizer.ts
 * Extension 3A field normalization transform.
 * Governing law: 3A-spec §5.3, §6, §9, §12; dist-tree patch §8.
 * Follows extension-2-normalizer.ts naming and structural pattern.
 *
 * Responsibilities:
 *  - Inject 3A defaults for absent fields (delegates to default-expander)
 *  - Normalize zone_role / convergence_enabled consistency
 *  - Normalize radiator 3A fields
 *  - Return a transform_trace for every mutation
 *  - Enforce legacy packet backward compat: absent enable_model_extension_3a → false (§5.3)
 *
 * This normalizer does NOT validate — it only normalizes.
 * Validation is the responsibility of topology.ts / extension-3a-bounds.ts / cross-reference.ts.
 */

import { injectZone3ADefaults, injectRadiator3ADefaults, expand3ADefaults } from './default-expander';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NormalizedZone3A {
  zone_id: string;
  zone_label?: string;
  zone_role?: string;
  flow_direction: string;
  isolation_boundary: boolean;
  upstream_zone_ref: string | null;
  downstream_zone_ref: string | null;
  bridge_resistance_k_per_w: number | null;
  working_fluid_ref: string | null;
  pickup_geometry_ref: string | null;
  convergence_enabled: boolean;
  resistance_chain: Record<string, number | null> | null;
  target_temp_k?: number;
  temp_min_k?: number;
  temp_max_k?: number;
  [key: string]: unknown;
}

export interface NormalizedRadiator3A {
  radiator_id: string;
  geometry_mode: string;
  face_a_area_m2?: number;
  face_b_area_m2: number;
  face_a_view_factor?: number;
  face_b_view_factor: number;
  surface_emissivity_bol?: number;         // no default — must be declared
  surface_emissivity_eol_override: number | null;
  emissivity_degradation_fraction: number | null;
  cavity_emissivity_mode: string;
  cavity_view_factor: number | null;
  cavity_surface_emissivity: number | null;
  background_sink_temp_k_override: number | null;
  [key: string]: unknown;
}

export interface Extension3ANormalizationResult {
  enable_model_extension_3a: boolean;
  model_extension_3a_mode: string;
  topology_validation_policy: string;
  convergence_control: {
    max_iterations: number;
    tolerance_abs_w: number;
    tolerance_rel_fraction: number;
    runaway_multiplier: number;
    blocking_on_nonconvergence: boolean;
  };
  normalized_zones: NormalizedZone3A[];
  normalized_radiators: NormalizedRadiator3A[];
  defaults_applied: string[];
  transform_trace: string[];
  // §12.2, §10.1: audit version passes through to packet metadata
  defaults_audit_version: string | null;
}

// ── Main normalizer ───────────────────────────────────────────────────────────

/**
 * Normalize a scenario for Extension 3A processing.
 *
 * Backward compat (§5.3): a packet without enable_model_extension_3a is treated
 * as enable=false, mode=disabled — no 3A processing applied, no 3A errors raised.
 *
 * @param scenarioRaw  - parsed scenario object (may be pre-3A legacy)
 * @param radiatorsRaw - array of radiator objects (may be empty)
 * @returns normalized 3A fields + defaults audit trail
 */
export function normalizeExtension3A(
  scenarioRaw: Record<string, unknown>,
  radiatorsRaw: Array<Record<string, unknown>> = []
): Extension3ANormalizationResult {
  const transform_trace: string[] = ['extension-3a-normalizer: begin'];

  // ── Step 1: Scenario-level defaults ───────────────────────────────────────
  const scenarioDefaults = expand3ADefaults({
    enable_model_extension_3a: scenarioRaw.enable_model_extension_3a as boolean | null | undefined,
    model_extension_3a_mode: scenarioRaw.model_extension_3a_mode as string | null | undefined,
    topology_validation_policy: scenarioRaw.topology_validation_policy as string | null | undefined,
    convergence_control: scenarioRaw.convergence_control as Record<string, unknown> | null | undefined,
    defaults_audit_version: scenarioRaw.defaults_audit_version as string | null | undefined,
  });

  const defaults_applied: string[] = [...scenarioDefaults.defaults_applied];

  // ── Step 2: If 3A disabled, return minimal normalized form ─────────────────
  if (!scenarioDefaults.enable_model_extension_3a) {
    transform_trace.push('extension-3a-normalizer: enable_model_extension_3a=false — 3A fields bypassed per §5.3');
    return {
      enable_model_extension_3a: false,
      model_extension_3a_mode: 'disabled',
      topology_validation_policy: scenarioDefaults.topology_validation_policy,
      convergence_control: scenarioDefaults.convergence_control,
      normalized_zones: [],
      normalized_radiators: [],
      defaults_applied,
      transform_trace,
      defaults_audit_version: scenarioDefaults.defaults_audit_version,
    };
  }

  transform_trace.push(`extension-3a-normalizer: mode=${scenarioDefaults.model_extension_3a_mode}`);

  // ── Step 3: Normalize thermal zones ───────────────────────────────────────
  const rawZones = (scenarioRaw.thermal_zones as Array<Record<string, unknown>>) ?? [];
  const normalized_zones: NormalizedZone3A[] = [];

  for (const zone of rawZones) {
    const z = { ...zone };
    const zoneDefaults = injectZone3ADefaults(z);
    defaults_applied.push(...zoneDefaults);

    // Rule: if zone_role=convergence_exchange, convergence_enabled must be true (§6.4)
    if (z.zone_role === 'convergence_exchange' && !z.convergence_enabled) {
      z.convergence_enabled = true;
      defaults_applied.push(`thermal_zones[${z.zone_id}].convergence_enabled (forced true: zone_role=convergence_exchange per §6.4)`);
      transform_trace.push(`extension-3a-normalizer: zone[${z.zone_id}] convergence_enabled forced true per §6.4`);
    }

    normalized_zones.push(z as NormalizedZone3A);
  }

  transform_trace.push(`extension-3a-normalizer: normalized ${normalized_zones.length} zones`);

  // ── Step 4: Normalize radiators ────────────────────────────────────────────
  const normalized_radiators: NormalizedRadiator3A[] = [];

  for (const rad of radiatorsRaw) {
    const r = { ...rad };
    const radId = String(r.radiator_id ?? 'unknown');
    const radDefaults = injectRadiator3ADefaults(r, radId);
    defaults_applied.push(...radDefaults);
    normalized_radiators.push(r as NormalizedRadiator3A);
  }

  transform_trace.push(`extension-3a-normalizer: normalized ${normalized_radiators.length} radiators`);
  transform_trace.push('extension-3a-normalizer: complete');

  return {
    enable_model_extension_3a: true,
    model_extension_3a_mode: scenarioDefaults.model_extension_3a_mode,
    topology_validation_policy: scenarioDefaults.topology_validation_policy,
    convergence_control: scenarioDefaults.convergence_control,
    normalized_zones,
    normalized_radiators,
    defaults_applied,
    transform_trace,
    defaults_audit_version: scenarioDefaults.defaults_audit_version,
  };
}
