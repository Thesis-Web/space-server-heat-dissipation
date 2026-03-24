/**
 * types/extension-4.d.ts
 * Extension 4 — TPV Cells on Radiator Surface (Photon Recapture Loop)
 * Stricter builder interfaces per spec §14.5.
 *
 * Governing law: engineering-spec-v0.1.4 §14.5, §5.3, §14.1, §15.1, §15.3
 * Blueprint law:  blueprint-v0.1.4 §Deliverables, §Build-Agent-Responsibilities
 *
 * ALL runtime modules (tpv-recapture.ts, extension-4-normalizer.ts,
 * extension-4-bounds.ts, run-extension-4.ts) SHALL import from this file.
 * No module shall duplicate these interface declarations independently.
 * The broad Record<string, unknown> boundary in run-extension-4.ts §15.1
 * is the final runtime tolerance layer only — not an invitation to bypass
 * these stricter interfaces internally.
 */

// ─── §5.3 — TpvRecaptureConfig ───────────────────────────────────────────────
// Canonical TPV configuration object. Declared in scenario as
// tpv_recapture_config. Normalized config is carried on Extension4Input.
// Required fields are validated by extension-4-bounds.ts per §13.1–§13.3.

export interface TpvRecaptureConfig {
  /** Stable identifier for this TPV model entry. Required. */
  tpv_model_id: string;
  /** Fraction of radiator surface covered by TPV cells. [0, 1]. §9.3. */
  coverage_fraction: number;
  /** Radiator-to-TPV view factor. [0, 1]. §9.3. */
  radiator_view_factor_to_tpv: number;
  /** Fraction of incident spectrum usable by TPV cells. [0, 1]. §9.3. */
  spectral_capture_fraction: number;
  /** Coupling derate factor for practical losses. [0, 1]. §9.3. */
  coupling_derate_fraction: number;
  /** Efficiency computation mode. §9.5–§9.6. */
  conversion_efficiency_mode: 'fixed' | 'carnot_bounded';
  /** Required when conversion_efficiency_mode='fixed'. [0, 1]. §9.5. */
  eta_tpv_fixed?: number | null;
  /** Required when conversion_efficiency_mode='carnot_bounded'. [0, 1]. §9.6. */
  eta_tpv_carnot_fraction?: number | null;
  /** Required when conversion_efficiency_mode='carnot_bounded'. > 0 K. §9.6. */
  tpv_cold_side_temperature_k?: number | null;
  /** Fraction of P_elec exported beyond modeled thermal boundary. [0, 1]. §9.8. */
  export_fraction: number;
  /** Fraction of onboard-used electrical power returned as heat. [0, 1]. §9.10. */
  onboard_return_heat_fraction: number;
  /** How TPV local loss heat is booked. §9.11. */
  cell_cooling_mode: 'separate_cooling' | 'returns_to_radiator';
  /** Detail level for iteration_history emission. Defaults to 'minimal'. §11.3, §12. */
  iteration_report_detail?: 'minimal' | 'full';
  /** Operator notes. Optional. */
  notes?: string[];
}

// ─── §14.1 — Extension4NormalizationResult ───────────────────────────────────
// Output of extension-4-normalizer.ts. Carries resolved enable gate, mode,
// normalized config with defaults applied, and accumulated errors/warnings.

export interface Extension4NormalizationResult {
  /** True when enable_model_extension_4=true and no blocking errors prevent normalization. */
  enabled: boolean;
  /** Resolved effective mode. */
  mode: 'disabled' | 'one_pass' | 'iterative';
  /** Normalized TPV config with allowed defaults applied. Null when disabled or blocked. */
  config: TpvRecaptureConfig | null;
  /** Names of fields where defaults were applied. §13.2. */
  defaults_applied: string[];
  /** Blocking error codes. Non-empty means runner must emit invalid result. */
  blocking_errors: string[];
  /** Warning codes. Non-blocking. */
  warnings: string[];
  /** Transform trace lines for this normalization pass. */
  trace: string[];
}

// ─── §14.5 / §15.1 — Stricter Extension4Input interfaces ────────────────────
// Used by all internal logic. The runtime boundary in run-extension-4.ts uses
// broad Record<string, unknown> for tolerance; internal logic SHALL use these.

/** Stricter scenario surface: all §5.1 fields by name. */
export interface Extension4ScenarioSurface {
  enable_model_extension_4: boolean;
  model_extension_4_mode: 'disabled' | 'one_pass' | 'iterative';
  tpv_recapture_config: TpvRecaptureConfig | null;
  extension_4_catalog_versions: Record<string, unknown> | null;
}

/**
 * Normalized radiator basis resolved per §10.1 (radiator-object selection)
 * and §10.2 (field mapping). All fields are post-resolution scalars.
 * Trace must record which source path provided each value.
 */
export interface Extension4RadiatorBasis {
  /** Resolved from target_surface_temp_k. Required. §10.2. */
  target_surface_temp_k: number;
  /** Resolved from effective_area_m2 or base-model computed area. §10.2. */
  effective_area_m2: number;
  /**
   * Resolved emissivity using priority chain:
   * surface_emissivity_eol_override →
   * derived EOL (surface_emissivity_bol * (1 - emissivity_degradation_fraction), clamped to (0,1]) →
   * surface_emissivity_bol → emissivity.
   * Same EOL derivation formula already used by 3A. §10.2.
   */
  resolved_emissivity: number;
  /**
   * Resolved from priority chain:
   * background_sink_temp_k_override → extension_3a_result.t_sink_resolved_k → sink_temp_k.
   * §10.2.
   */
  resolved_sink_temperature_k: number;
  /** Trace lines recording which source path provided each resolved value. §10.2. */
  resolution_trace: string[];
}

/**
 * Typed 3A dependency surface. Matches §15.1 and §8.2.
 * Used by iterative mode for convergence control and area metric computation.
 */
export interface Extension4Dependency3A {
  extension_3a_enabled: boolean;
  convergence_attempted: boolean;
  convergence_iterations: number;
  convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
  /** Inherited for nonconvergence blocking. Default false if absent; emit trace. §12.9. */
  blocking_on_nonconvergence?: boolean;
  /** Resolved sink temperature from 3A. Used as T_space priority. §8.2, §10.2. */
  t_sink_resolved_k: number | null;
  /** Used for equivalent area metric computation. §9.14. */
  radiator_area_bol_required_m2: number | null;
  /** Used for equivalent area metric computation. §9.14. */
  radiator_area_eol_required_m2: number | null;
}

/**
 * Stricter Extension4Input for internal module logic.
 * The runtime boundary in run-extension-4.ts uses broad types per §15.1;
 * this stricter form is the authoritative shape for all internal computation.
 */
export interface Extension4Input {
  scenario: Extension4ScenarioSurface;
  run_packet: Record<string, unknown>;
  radiators: Array<Record<string, unknown>>;
  baseline_result?: Record<string, unknown> | null;
  extension_3a_result?: Extension4Dependency3A | null;
}

// ─── §15.3 — Extension4Result ─────────────────────────────────────────────────
// Canonical output shape. Emitted under extension_4_result on the run-packet.
// Nullability rules per §16.6 govern field population by mode.

/** One entry per iteration when iteration_report_detail='full'. §15.3, §16.5. */
export interface Extension4IterationHistoryEntry {
  iteration_index: number;
  q_rad_basis_w: number;
  q_tpv_in_w: number;
  eta_tpv_effective: number;
  p_elec_w: number;
  p_export_w: number;
  p_onboard_w: number;
  q_return_w: number;
  q_tpv_loss_w: number;
  q_tpv_local_to_radiator_w: number;
  q_tpv_separate_cooling_load_w: number;
  q_rad_net_w: number;
  /** null on first iteration (no prior basis to delta against). */
  abs_delta_w: number | null;
  /** null on first iteration. */
  rel_delta_fraction: number | null;
}

export interface Extension4Result {
  // ── Identity and version ──────────────────────────────────────────────────
  extension_4_enabled: boolean;
  model_extension_4_mode: 'disabled' | 'one_pass' | 'iterative';
  /** Always 'v0.1.4'. §16.1. */
  spec_version: 'v0.1.4';
  /** 'v0.1.4' when active; null when disabled. §16.1. */
  blueprint_version: 'v0.1.4' | null;

  // ── Convergence status ────────────────────────────────────────────────────
  convergence_attempted: boolean;
  /** 0 when disabled or invalid. 1 for one-pass. ≥1 for iterative. §16.4–§16.5. */
  convergence_iterations: number;
  convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
  nonconvergence_blocking_applied: boolean;

  // ── TPV configuration identity ────────────────────────────────────────────
  /** null when disabled or invalid. §16.6. */
  tpv_model_id: string | null;

  // ── First-order thermal accounting — null when disabled/invalid. §16.6. ──
  /** χ_int = coverage * view_factor * spectral_capture * coupling_derate. §9.3. */
  intercept_fraction: number | null;
  /** Baseline radiator emission. §9.2. */
  q_rad_baseline_w: number | null;
  /** Q_tpv_in = χ_int * Q_rad_baseline. §9.4. */
  q_tpv_in_w: number | null;
  /** Effective TPV conversion efficiency. §9.5–§9.6. */
  eta_tpv_effective: number | null;
  /** P_elec = η_tpv * Q_tpv_in. §9.5. */
  p_elec_w: number | null;
  /** P_export = f_exp * P_elec. §9.8. */
  p_export_w: number | null;
  /** P_onboard = (1 - f_exp) * P_elec. §9.9. */
  p_onboard_w: number | null;
  /** Q_return = α_ret * P_onboard. §9.10. */
  q_return_w: number | null;
  /** Q_tpv_loss = Q_tpv_in - P_elec. §9.7. */
  q_tpv_loss_w: number | null;
  /** Q_tpv_loss when cell_cooling_mode='returns_to_radiator'; else 0. §9.11. */
  q_tpv_local_to_radiator_w: number | null;
  /** Q_tpv_loss when cell_cooling_mode='separate_cooling'; else 0. §9.11. */
  q_tpv_separate_cooling_load_w: number | null;
  /** Q_rad_net = Q_rad_baseline - P_export + Q_return + Q_tpv_local_to_radiator. §9.12. */
  q_rad_net_w: number | null;
  /** ΔQ_relief = Q_rad_baseline - Q_rad_net. Negative means burden worsened. §9.13. */
  q_relief_w: number | null;

  // ── Equivalent radiator area metrics — null when 3A basis absent or Q_base_ref ≤ 0. §9.14. ──
  area_equivalent_bol_m2: number | null;
  area_equivalent_eol_m2: number | null;
  area_delta_bol_m2: number | null;
  area_delta_eol_m2: number | null;

  // ── Resolved temperature basis fields ─────────────────────────────────────
  baseline_sink_temperature_k: number | null;
  baseline_radiator_temperature_k: number | null;
  tpv_cold_side_temperature_k: number | null;

  // ── Iteration history — absent in minimal mode. §11.3, §16.5. ────────────
  // Absent (not empty array) is the canonical minimal form. §16.5.
  iteration_history?: Extension4IterationHistoryEntry[];

  // ── Audit and trace fields — always present. ──────────────────────────────
  defaults_applied: string[];
  warnings: string[];
  blocking_errors: string[];
  transform_trace: string[];
}

// ─── Transform trace token — §8.4 ────────────────────────────────────────────
// Emitted on transform_trace when one-pass executes without 3A authority.

export const EXT4_EXECUTED_WITHOUT_3A_AUTHORITY_TRACE =
  'executed_without_3a_authority=true';
