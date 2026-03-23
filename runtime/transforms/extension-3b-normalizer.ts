/**
 * extension-3b-normalizer.ts
 * Extension 3B — Normalization / Default Expansion / Preset Resolution
 * Spec: 3B-spec §12, §12A, §15.1, §5.4, §6, §7, §8, §10
 * Blueprint: 3B-blueprint §5.4, §5.5, §9
 *
 * Resolves presets, injects defaults for all optional 3B fields, and returns
 * a normalized 3B inputs object with trace.
 * Additive-only. Does not touch baseline or 3A fields.
 */

import type { VaultGasEnvironmentModel } from '../formulas/vault-gas-environment';
import type { TransportImplementation } from '../formulas/loop-parasitics';
import type { OperatingState } from '../formulas/gas-management';

export interface VaultGasEnvironmentPresetEntry {
  preset_id: string;
  preset_version: string;
  label: string;
  gas_presence_mode: string;
  gas_species_ref: string | null;
  pressure_pa: number | null;
  convection_assumption_mode: string;
  effective_h_internal_w_per_m2_k: number | null;
  exchange_area_m2: number | null;
  contamination_outgassing_mode: string;
  notes: string;
}

export interface TransportImplementationPresetEntry {
  preset_id: string;
  preset_version: string;
  label: string;
  transport_class: string;
  pump_model_mode: string;
  pump_power_input_w: number | null;
  pump_efficiency_fraction: number | null;
  pressure_drop_pa: number | null;
  mass_flow_kg_per_s: number | null;
  fluid_density_kg_per_m3_override: number | null;
  gas_management_mode: string;
  allowable_void_fraction: number | null;
  declared_void_fraction: number | null;
  bubble_blanketing_penalty_fraction: number | null;
  gas_lock_flow_derate_fraction: number | null;
  separator_type: string;
  notes: string;
}

export interface EclipseStatePresetEntry {
  preset_id: string;
  preset_version: string;
  label: string;
  current_state: string;
  storage_support_enabled: boolean;
  storage_ref: string | null;
  compute_derate_fraction: number;
  noncritical_branch_disable_refs: string[];
  notes: string;
}

export interface Extension3BCatalogs {
  vaultGasEnvironmentPresets: { presets: VaultGasEnvironmentPresetEntry[] };
  transportImplementationPresets: { presets: TransportImplementationPresetEntry[] };
  eclipseStatePresets: { presets: EclipseStatePresetEntry[] };
}

export interface NormalizedZone3B {
  zone_id: string;
  vault_gas_environment_model: VaultGasEnvironmentModel;
  transport_implementation: TransportImplementation;
  loop_model: {
    loop_id: string | null;
    upstream_loop_ref: string | null;
    downstream_loop_ref: string | null;
    derived_total_parasitic_w: number | null;
    derived_effective_loop_resistance_addition_k_per_w: number | null;
    notes: string;
  };
}

export interface Normalized3BInputs {
  enabled: boolean;
  disabled: boolean;
  mode: string;
  operating_state: OperatingState | null;
  operating_state_declared: boolean;
  normalized_zones: NormalizedZone3B[];
  preset_provenance: PresetProvenanceEntry[];
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

export interface PresetProvenanceEntry {
  zone_id: string | null;
  object_type: string;
  preset_catalog_id: string;
  preset_entry_id: string;
  preset_version: string;
  manual_override_fields: string[];
}

/** Default factories — Spec §12A */
function defaultVaultGasEnvironmentModel(): VaultGasEnvironmentModel {
  return {
    mode: 'none',
    preset_id: null,
    preset_version: null,
    gas_presence_mode: 'none',
    gas_species_ref: null,
    pressure_pa: null,
    convection_assumption_mode: 'disabled',
    effective_h_internal_w_per_m2_k: null,
    exchange_area_m2: null,
    contamination_outgassing_mode: 'none',
    manual_override_fields: [],
    notes: ''
  };
}

function defaultTransportImplementation(): TransportImplementation {
  return {
    mode: 'none',
    preset_id: null,
    preset_version: null,
    transport_class: 'passive',
    pump_model_mode: 'none',
    pump_power_input_w: null,
    pump_efficiency_fraction: null,
    pressure_drop_pa: null,
    mass_flow_kg_per_s: null,
    fluid_density_kg_per_m3_override: null,
    gas_management_mode: 'not_applicable',
    allowable_void_fraction: null,
    declared_void_fraction: null,
    bubble_blanketing_penalty_fraction: null,
    gas_lock_flow_derate_fraction: null,
    separator_type: 'none',
    notes: ''
  };
}

function defaultOperatingState(): OperatingState {
  return {
    current_state: 'sunlit',
    state_resolution_mode: 'explicit',
    preset_id: null,
    preset_version: null,
    storage_support_enabled: false,
    storage_ref: null,
    compute_derate_fraction: 0,
    noncritical_branch_disable_refs: [],
    notes: ''
  };
}

/**
 * normalizeExtension3B
 * Spec §15.1 normalization flow.
 * Injects defaults (§12A), resolves presets (§12.1, §12.2, §12.3),
 * and returns Normalized3BInputs with full trace.
 */
export function normalizeExtension3B(
  scenario: Record<string, unknown>,
  catalogs: Extension3BCatalogs
): Normalized3BInputs {
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const trace: string[] = [];
  const preset_provenance: PresetProvenanceEntry[] = [];

  // Spec §12A: inject defaults at scenario level
  const enabled = !!(scenario['enable_model_extension_3b'] ?? false);
  const mode = (scenario['model_extension_3b_mode'] as string) ?? 'disabled';

  trace.push(`enable_model_extension_3b=${enabled}, model_extension_3b_mode=${mode}`);

  // Spec §15.1: if not enabled → return deterministic disabled result
  if (!enabled || mode === 'disabled') {
    trace.push('extension_3b_disabled: returning deterministic disabled result');
    return {
      enabled: false,
      disabled: true,
      mode: 'disabled',
      operating_state: null,
      operating_state_declared: false,
      normalized_zones: [],
      preset_provenance: [],
      blocking_errors: [],
      warnings: [],
      trace
    };
  }

  // Spec §12.3: resolve operating_state
  let operatingState: OperatingState = defaultOperatingState();
  let operatingStateDeclared = false;
  const rawOpState = scenario['operating_state'] as Record<string, unknown> | null | undefined;
  if (rawOpState != null) {
    operatingStateDeclared = true;
    operatingState = { ...operatingState, ...rawOpState } as OperatingState;
    trace.push(`operating_state.current_state=${operatingState.current_state}, resolution_mode=${operatingState.state_resolution_mode}`);

    if (operatingState.state_resolution_mode === 'preset' && operatingState.preset_id) {
      const eclipsePreset = catalogs.eclipseStatePresets.presets.find(
        p => p.preset_id === operatingState.preset_id
      );
      if (eclipsePreset) {
        operatingState = {
          ...operatingState,
          current_state: eclipsePreset.current_state as 'sunlit' | 'eclipse' | 'custom',
          storage_support_enabled: eclipsePreset.storage_support_enabled,
          storage_ref: eclipsePreset.storage_ref ?? operatingState.storage_ref,
          compute_derate_fraction: eclipsePreset.compute_derate_fraction,
          noncritical_branch_disable_refs: eclipsePreset.noncritical_branch_disable_refs
        };
        preset_provenance.push({
          zone_id: null,
          object_type: 'operating_state',
          preset_catalog_id: 'eclipse-state-presets',
          preset_entry_id: eclipsePreset.preset_id,
          preset_version: eclipsePreset.preset_version,
          manual_override_fields: []
        });
        trace.push(`eclipse preset loaded: ${eclipsePreset.preset_id}`);
      } else {
        blocking_errors.push(
          `NORM-001: operating_state preset_id=${operatingState.preset_id} not found in eclipse-state-presets catalog`
        );
      }
    }
  } else {
    trace.push('operating_state absent: materializing default (sunlit)');
  }

  // Spec §5.4 blocking: eclipse semantics required but state unresolvable
  if ((mode === 'subsystem_depth_with_eclipse' || mode === 'full_3b') &&
      operatingState.current_state !== 'eclipse' && operatingState.current_state !== 'sunlit' &&
      operatingState.current_state !== 'custom') {
    blocking_errors.push(
      `NORM-002: mode=${mode} requires resolvable operating_state but state is unresolvable`
    );
  }

  // Spec §12A: iterate thermal zones and resolve all 3B nested objects
  const rawZones = scenario['thermal_zones'] as Record<string, unknown>[] | null | undefined ?? [];
  const normalized_zones: NormalizedZone3B[] = [];

  for (const zone of rawZones) {
    const zoneId = (zone['zone_id'] as string) ?? 'unknown';
    trace.push(`--- normalizing zone: ${zoneId} ---`);

    // vault_gas_environment_model
    let vgem: VaultGasEnvironmentModel = defaultVaultGasEnvironmentModel();
    const rawVgem = zone['vault_gas_environment_model'] as Record<string, unknown> | null | undefined;
    if (rawVgem != null) {
      vgem = { ...vgem, ...rawVgem } as VaultGasEnvironmentModel;
    } else {
      trace.push(`zone ${zoneId}: vault_gas_environment_model absent, materialized default (mode=none)`);
    }

    // Resolve preset for vault_gas_environment_model
    if (vgem.mode === 'preset' && vgem.preset_id) {
      const vgePreset = catalogs.vaultGasEnvironmentPresets.presets.find(
        p => p.preset_id === vgem.preset_id
      );
      if (vgePreset) {
        const manualOverrides = vgem.manual_override_fields ?? [];
        vgem = {
          ...vgem,
          gas_presence_mode: manualOverrides.includes('gas_presence_mode') ? vgem.gas_presence_mode : vgePreset.gas_presence_mode as typeof vgem.gas_presence_mode,
          gas_species_ref: manualOverrides.includes('gas_species_ref') ? vgem.gas_species_ref : vgePreset.gas_species_ref,
          pressure_pa: manualOverrides.includes('pressure_pa') ? vgem.pressure_pa : vgePreset.pressure_pa,
          convection_assumption_mode: manualOverrides.includes('convection_assumption_mode') ? vgem.convection_assumption_mode : vgePreset.convection_assumption_mode as typeof vgem.convection_assumption_mode,
          effective_h_internal_w_per_m2_k: manualOverrides.includes('effective_h_internal_w_per_m2_k') ? vgem.effective_h_internal_w_per_m2_k : vgePreset.effective_h_internal_w_per_m2_k,
          exchange_area_m2: manualOverrides.includes('exchange_area_m2') ? vgem.exchange_area_m2 : vgePreset.exchange_area_m2,
          contamination_outgassing_mode: manualOverrides.includes('contamination_outgassing_mode') ? vgem.contamination_outgassing_mode : vgePreset.contamination_outgassing_mode as typeof vgem.contamination_outgassing_mode
        };
        preset_provenance.push({
          zone_id: zoneId,
          object_type: 'vault_gas_environment_model',
          preset_catalog_id: 'vault-gas-environment-presets',
          preset_entry_id: vgePreset.preset_id,
          preset_version: vgePreset.preset_version,
          manual_override_fields: manualOverrides
        });
        trace.push(`zone ${zoneId}: vault_gas_environment_model preset loaded: ${vgePreset.preset_id}`);
      } else {
        blocking_errors.push(
          `NORM-003: zone=${zoneId} vault_gas_environment_model preset_id=${vgem.preset_id} not found`
        );
      }
    }

    // transport_implementation
    let ti: TransportImplementation = defaultTransportImplementation();
    const rawTi = zone['transport_implementation'] as Record<string, unknown> | null | undefined;
    if (rawTi != null) {
      ti = { ...ti, ...rawTi } as TransportImplementation;
    } else {
      trace.push(`zone ${zoneId}: transport_implementation absent, materialized default (mode=none)`);
    }

    // Resolve preset for transport_implementation
    if (ti.mode === 'preset' && ti.preset_id) {
      const tiPreset = catalogs.transportImplementationPresets.presets.find(
        p => p.preset_id === ti.preset_id
      );
      if (tiPreset) {
        ti = { ...ti, ...(tiPreset as unknown as Partial<TransportImplementation>), mode: 'preset' };
        preset_provenance.push({
          zone_id: zoneId,
          object_type: 'transport_implementation',
          preset_catalog_id: 'transport-implementation-presets',
          preset_entry_id: tiPreset.preset_id,
          preset_version: tiPreset.preset_version,
          manual_override_fields: []
        });
        trace.push(`zone ${zoneId}: transport_implementation preset loaded: ${tiPreset.preset_id}`);
      } else {
        blocking_errors.push(
          `NORM-004: zone=${zoneId} transport_implementation preset_id=${ti.preset_id} not found`
        );
      }
    }

    // loop_model — aggregation only; materialized from zone or defaults
    const rawLm = zone['loop_model'] as Record<string, unknown> | null | undefined;
    const loop_model = {
      loop_id: (rawLm?.['loop_id'] as string | null) ?? null,
      upstream_loop_ref: (rawLm?.['upstream_loop_ref'] as string | null) ?? null,
      downstream_loop_ref: (rawLm?.['downstream_loop_ref'] as string | null) ?? null,
      derived_total_parasitic_w: (rawLm?.['derived_total_parasitic_w'] as number | null) ?? null,
      derived_effective_loop_resistance_addition_k_per_w: (rawLm?.['derived_effective_loop_resistance_addition_k_per_w'] as number | null) ?? null,
      notes: (rawLm?.['notes'] as string) ?? ''
    };

    normalized_zones.push({ zone_id: zoneId, vault_gas_environment_model: vgem, transport_implementation: ti, loop_model });
  }

  return {
    enabled: true,
    disabled: false,
    mode,
    operating_state: operatingState,
    operating_state_declared: operatingStateDeclared,
    normalized_zones,
    preset_provenance,
    blocking_errors,
    warnings,
    trace
  };
}
