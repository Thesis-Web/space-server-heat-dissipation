/**
 * vault-gas-environment.ts
 * Extension 3B — Vault Gas Environment Resistance Computation
 * Spec: 3B-spec §11.1, §6.1, §13.2
 * Blueprint: 3B-blueprint §8.1, §5.1, §5.2
 *
 * Additive-only. Does not replace or mutate baseline or 3A resistance terms.
 * Computes r_vault_gas_environment_k_per_w as an additive term.
 */

export interface VaultGasEnvironmentModel {
  mode: 'none' | 'preset' | 'custom';
  preset_id: string | null;
  preset_version: string | null;
  gas_presence_mode: 'none' | 'trace_fill' | 'pressurized' | 'custom';
  gas_species_ref: string | null;
  pressure_pa: number | null;
  convection_assumption_mode: 'disabled' | 'operator_fixed_h' | 'preset_fixed_h' | 'custom';
  effective_h_internal_w_per_m2_k: number | null;
  exchange_area_m2: number | null;
  contamination_outgassing_mode: 'none' | 'nominal_clean' | 'elevated_unknown' | 'custom';
  manual_override_fields: string[];
  notes: string;
}

export interface VaultGasEnvironmentResult {
  zone_id: string;
  mode: string;
  convection_assumption_mode: string;
  r_vault_gas_environment_k_per_w: number;
  h_internal_resolved: number | null;
  exchange_area_resolved_m2: number | null;
  reason_code: string;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

/**
 * computeVaultGasResistance
 * Spec §11.1:
 *   If mode=none OR convection_assumption_mode=disabled → r = 0
 *   Else: r = 1 / (h_internal * A_exchange)
 *   Blocks if h_internal <= 0 or A_exchange <= 0 when convection enabled.
 */
export function computeVaultGasResistance(
  zoneId: string,
  model: VaultGasEnvironmentModel | null | undefined
): VaultGasEnvironmentResult {
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const trace: string[] = [];

  // Spec §14.2: no-effect path → deterministic result with reason_code
  if (model == null || model.mode === 'none') {
    trace.push('vault_gas_environment_model mode=none or absent: r_vault=0');
    return {
      zone_id: zoneId,
      mode: model?.mode ?? 'none',
      convection_assumption_mode: model?.convection_assumption_mode ?? 'disabled',
      r_vault_gas_environment_k_per_w: 0,
      h_internal_resolved: null,
      exchange_area_resolved_m2: null,
      reason_code: 'mode_none',
      blocking_errors,
      warnings,
      trace
    };
  }

  trace.push(`vault_gas_environment_model mode=${model.mode}`);

  if (model.convection_assumption_mode === 'disabled') {
    trace.push('convection_assumption_mode=disabled: r_vault=0');
    return {
      zone_id: zoneId,
      mode: model.mode,
      convection_assumption_mode: model.convection_assumption_mode,
      r_vault_gas_environment_k_per_w: 0,
      h_internal_resolved: null,
      exchange_area_resolved_m2: null,
      reason_code: 'convection_disabled',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Spec §13.2 blocking rules: convection enabled requires both fields present and valid
  const h = model.effective_h_internal_w_per_m2_k;
  const A = model.exchange_area_m2;

  if (h == null || h <= 0) {
    blocking_errors.push(
      `VAULT-GAS-001: zone=${zoneId} convection enabled but effective_h_internal_w_per_m2_k is missing or <= 0`
    );
  }
  if (A == null || A <= 0) {
    blocking_errors.push(
      `VAULT-GAS-002: zone=${zoneId} convection enabled but exchange_area_m2 is missing or <= 0`
    );
  }

  if (blocking_errors.length > 0) {
    trace.push('vault gas computation blocked — see blocking_errors');
    return {
      zone_id: zoneId,
      mode: model.mode,
      convection_assumption_mode: model.convection_assumption_mode,
      r_vault_gas_environment_k_per_w: 0,
      h_internal_resolved: h ?? null,
      exchange_area_resolved_m2: A ?? null,
      reason_code: 'blocked',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Spec §11.1: r = 1 / (h * A)
  const r = 1.0 / (h! * A!);
  trace.push(`r_vault_gas = 1/(${h} * ${A}) = ${r.toFixed(6)} K/W`);

  if (model.contamination_outgassing_mode === 'elevated_unknown') {
    warnings.push(
      `VAULT-GAS-W001: zone=${zoneId} contamination_outgassing_mode=elevated_unknown; gas environment assumption carries elevated uncertainty`
    );
  }

  return {
    zone_id: zoneId,
    mode: model.mode,
    convection_assumption_mode: model.convection_assumption_mode,
    r_vault_gas_environment_k_per_w: r,
    h_internal_resolved: h!,
    exchange_area_resolved_m2: A!,
    reason_code: 'computed',
    blocking_errors,
    warnings,
    trace
  };
}
