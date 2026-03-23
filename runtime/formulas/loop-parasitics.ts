/**
 * loop-parasitics.ts
 * Extension 3B — Loop Transport Parasitic and Bubble Resistance Computation
 * Spec: 3B-spec §11.2, §11.3, §11.4, §11.5, §11.6, §11.10, §6.2, §13.3
 * Blueprint: 3B-blueprint §5.3, §10, §8.2
 *
 * Primitive pump-power ownership belongs to transport_implementation only.
 * loop_model is aggregation only (spec §6.3, blueprint §8.3).
 * Additive-only: does not mutate baseline or 3A resistance terms.
 */

export interface TransportImplementation {
  mode: 'none' | 'preset' | 'custom';
  preset_id: string | null;
  preset_version: string | null;
  transport_class: 'passive' | 'pumped_single_phase_liquid' | 'pumped_gas' | 'two_phase_managed' | 'custom';
  pump_model_mode: 'none' | 'direct_power' | 'pressure_drop_flow' | 'preset' | 'custom';
  pump_power_input_w: number | null;
  pump_efficiency_fraction: number | null;
  pressure_drop_pa: number | null;
  mass_flow_kg_per_s: number | null;
  fluid_density_kg_per_m3_override: number | null;
  gas_management_mode: 'not_applicable' | 'single_phase_intended' | 'gas_managed' | 'custom';
  allowable_void_fraction: number | null;
  declared_void_fraction: number | null;
  bubble_blanketing_penalty_fraction: number | null;
  gas_lock_flow_derate_fraction: number | null;
  separator_type: string;
  notes: string;
}

export interface TransportParasiticResult {
  zone_id: string;
  mode: string;
  pump_model_mode: string;
  w_dot_pump_w: number;
  v_dot_m3_per_s: number | null;
  w_dot_ideal_w: number | null;
  resolved_density_kg_per_m3: number | null;
  reason_code: string;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

export interface GasManagementResult {
  zone_id: string;
  gas_management_mode: string;
  declared_void_fraction: number | null;
  allowable_void_fraction: number | null;
  flow_availability_fraction: number;
  r_bubble_penalty_k_per_w: number;
  void_fraction_exceeded: boolean;
  reason_code: string;
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}

/**
 * resolveFluidDensity
 * Spec §11.10 property-source resolution order:
 *   1. transport_implementation.fluid_density_kg_per_m3_override
 *   2. canonical working-fluid density field from repo schema
 *   3. block if required and unresolved
 */
export function resolveFluidDensity(
  transportImpl: TransportImplementation,
  canonicalWorkingFluidDensity: number | null | undefined
): { density: number | null; source: string } {
  if (transportImpl.fluid_density_kg_per_m3_override != null &&
      transportImpl.fluid_density_kg_per_m3_override > 0) {
    return {
      density: transportImpl.fluid_density_kg_per_m3_override,
      source: 'fluid_density_kg_per_m3_override'
    };
  }
  if (canonicalWorkingFluidDensity != null && canonicalWorkingFluidDensity > 0) {
    return {
      density: canonicalWorkingFluidDensity,
      source: 'canonical_working_fluid_density_basis_kg_per_m3'
    };
  }
  return { density: null, source: 'unresolved' };
}

/**
 * computePumpParasitic
 * Spec §11.2: direct_power → w_dot = pump_power_input_w
 * Spec §11.3: pressure_drop_flow → v_dot = m_dot/rho; w_ideal = dP*v_dot; w_dot = w_ideal/eta
 */
export function computePumpParasitic(
  zoneId: string,
  transportImpl: TransportImplementation | null | undefined,
  canonicalWorkingFluidDensity: number | null | undefined
): TransportParasiticResult {
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const trace: string[] = [];

  // Spec §14.2: mode=none → zero result
  if (transportImpl == null || transportImpl.mode === 'none') {
    trace.push('transport_implementation mode=none or absent: w_dot_pump=0');
    return {
      zone_id: zoneId,
      mode: transportImpl?.mode ?? 'none',
      pump_model_mode: transportImpl?.pump_model_mode ?? 'none',
      w_dot_pump_w: 0,
      v_dot_m3_per_s: null,
      w_dot_ideal_w: null,
      resolved_density_kg_per_m3: null,
      reason_code: 'mode_none',
      blocking_errors,
      warnings,
      trace
    };
  }

  trace.push(`transport_implementation mode=${transportImpl.mode}, pump_model_mode=${transportImpl.pump_model_mode}`);

  if (transportImpl.pump_model_mode === 'none') {
    trace.push('pump_model_mode=none: w_dot_pump=0');
    return {
      zone_id: zoneId,
      mode: transportImpl.mode,
      pump_model_mode: 'none',
      w_dot_pump_w: 0,
      v_dot_m3_per_s: null,
      w_dot_ideal_w: null,
      resolved_density_kg_per_m3: null,
      reason_code: 'pump_mode_none',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Spec §11.2: direct_power
  if (transportImpl.pump_model_mode === 'direct_power') {
    const pw = transportImpl.pump_power_input_w;
    if (pw == null || pw < 0) {
      blocking_errors.push(
        `TRANSPORT-001: zone=${zoneId} pump_model_mode=direct_power but pump_power_input_w is missing or negative`
      );
      trace.push('direct_power blocked: pump_power_input_w missing or negative');
      return {
        zone_id: zoneId,
        mode: transportImpl.mode,
        pump_model_mode: 'direct_power',
        w_dot_pump_w: 0,
        v_dot_m3_per_s: null,
        w_dot_ideal_w: null,
        resolved_density_kg_per_m3: null,
        reason_code: 'blocked',
        blocking_errors,
        warnings,
        trace
      };
    }
    trace.push(`direct_power: w_dot_pump = ${pw} W`);
    return {
      zone_id: zoneId,
      mode: transportImpl.mode,
      pump_model_mode: 'direct_power',
      w_dot_pump_w: pw,
      v_dot_m3_per_s: null,
      w_dot_ideal_w: null,
      resolved_density_kg_per_m3: null,
      reason_code: 'computed_direct_power',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Spec §11.3: pressure_drop_flow
  if (transportImpl.pump_model_mode === 'pressure_drop_flow') {
    const dP = transportImpl.pressure_drop_pa;
    const mDot = transportImpl.mass_flow_kg_per_s;
    const eta = transportImpl.pump_efficiency_fraction;

    if (dP == null) blocking_errors.push(`TRANSPORT-002: zone=${zoneId} pressure_drop_pa missing`);
    if (mDot == null) blocking_errors.push(`TRANSPORT-003: zone=${zoneId} mass_flow_kg_per_s missing`);
    if (eta == null || eta <= 0) blocking_errors.push(`TRANSPORT-004: zone=${zoneId} pump_efficiency_fraction missing or <= 0`);

    const { density: rho, source: densitySource } = resolveFluidDensity(transportImpl, canonicalWorkingFluidDensity);
    if (rho == null || rho <= 0) {
      blocking_errors.push(`TRANSPORT-005: zone=${zoneId} fluid density unresolved or <= 0`);
    }
    trace.push(`density resolved from: ${densitySource} = ${rho}`);

    if (blocking_errors.length > 0) {
      trace.push('pressure_drop_flow blocked');
      return {
        zone_id: zoneId,
        mode: transportImpl.mode,
        pump_model_mode: 'pressure_drop_flow',
        w_dot_pump_w: 0,
        v_dot_m3_per_s: null,
        w_dot_ideal_w: null,
        resolved_density_kg_per_m3: rho,
        reason_code: 'blocked',
        blocking_errors,
        warnings,
        trace
      };
    }

    const vDot = mDot! / rho!;
    const wIdeal = dP! * vDot;
    const wDot = wIdeal / eta!;
    trace.push(`v_dot=${vDot.toExponential(4)} m³/s, w_ideal=${wIdeal.toFixed(4)} W, w_dot_pump=${wDot.toFixed(4)} W`);

    return {
      zone_id: zoneId,
      mode: transportImpl.mode,
      pump_model_mode: 'pressure_drop_flow',
      w_dot_pump_w: wDot,
      v_dot_m3_per_s: vDot,
      w_dot_ideal_w: wIdeal,
      resolved_density_kg_per_m3: rho,
      reason_code: 'computed_pressure_drop_flow',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Any other pump_model_mode (preset/custom) — operator must resolve at normalization
  warnings.push(`TRANSPORT-W001: zone=${zoneId} pump_model_mode=${transportImpl.pump_model_mode} requires preset/custom resolution before parasitic can be computed`);
  trace.push(`pump_model_mode=${transportImpl.pump_model_mode}: parasitic not computed here`);
  return {
    zone_id: zoneId,
    mode: transportImpl.mode,
    pump_model_mode: transportImpl.pump_model_mode,
    w_dot_pump_w: 0,
    v_dot_m3_per_s: null,
    w_dot_ideal_w: null,
    resolved_density_kg_per_m3: null,
    reason_code: 'not_applicable',
    blocking_errors,
    warnings,
    trace
  };
}

/**
 * computeBubblePenalty
 * Spec §11.4, §11.5
 * Uses explicit bounded penalty fractions only. No silent correlation inference.
 */
export function computeBubblePenalty(
  zoneId: string,
  transportImpl: TransportImplementation | null | undefined,
  r_loop_to_sink_base: number
): GasManagementResult {
  const blocking_errors: string[] = [];
  const warnings: string[] = [];
  const trace: string[] = [];

  if (transportImpl == null || transportImpl.mode === 'none' ||
      transportImpl.gas_management_mode === 'not_applicable') {
    trace.push('gas_management_mode=not_applicable or mode=none: r_bubble=0');
    return {
      zone_id: zoneId,
      gas_management_mode: transportImpl?.gas_management_mode ?? 'not_applicable',
      declared_void_fraction: null,
      allowable_void_fraction: null,
      flow_availability_fraction: 1.0,
      r_bubble_penalty_k_per_w: 0,
      void_fraction_exceeded: false,
      reason_code: 'not_applicable',
      blocking_errors,
      warnings,
      trace
    };
  }

  const dvf = transportImpl.declared_void_fraction ?? 0;
  const avf = transportImpl.allowable_void_fraction ?? null;
  const bbp = transportImpl.bubble_blanketing_penalty_fraction ?? 0;
  const gldf = transportImpl.gas_lock_flow_derate_fraction ?? 0;

  // Spec §11.4: if declared_void_fraction=0 → r_bubble=0
  if (dvf === 0) {
    trace.push('declared_void_fraction=0: r_bubble=0');
    return {
      zone_id: zoneId,
      gas_management_mode: transportImpl.gas_management_mode,
      declared_void_fraction: dvf,
      allowable_void_fraction: avf,
      flow_availability_fraction: 1.0 - gldf,
      r_bubble_penalty_k_per_w: 0,
      void_fraction_exceeded: false,
      reason_code: 'zero_void_fraction',
      blocking_errors,
      warnings,
      trace
    };
  }

  // Spec §13.3 blocking: void fraction exceeded in single_phase_intended
  let voidExceeded = false;
  if (avf != null && dvf > avf && transportImpl.gas_management_mode === 'single_phase_intended') {
    blocking_errors.push(
      `GAS-MGMT-001: zone=${zoneId} declared_void_fraction (${dvf}) > allowable_void_fraction (${avf}) in single_phase_intended mode`
    );
    voidExceeded = true;
  } else if (avf != null && dvf > avf) {
    warnings.push(
      `GAS-MGMT-W001: zone=${zoneId} declared_void_fraction (${dvf}) > allowable_void_fraction (${avf})`
    );
    voidExceeded = true;
  }

  // Spec §11.4: bubble_blanketing_penalty_fraction must be in [0,1]
  if (bbp < 0 || bbp > 1) {
    blocking_errors.push(
      `GAS-MGMT-002: zone=${zoneId} bubble_blanketing_penalty_fraction=${bbp} outside [0,1]`
    );
  }

  const rBubble = r_loop_to_sink_base * bbp;
  const flowAvail = 1.0 - gldf;
  trace.push(`r_bubble = ${r_loop_to_sink_base} * ${bbp} = ${rBubble.toFixed(6)} K/W`);
  trace.push(`flow_availability_fraction = 1 - ${gldf} = ${flowAvail.toFixed(4)}`);

  return {
    zone_id: zoneId,
    gas_management_mode: transportImpl.gas_management_mode,
    declared_void_fraction: dvf,
    allowable_void_fraction: avf,
    flow_availability_fraction: flowAvail,
    r_bubble_penalty_k_per_w: rBubble,
    void_fraction_exceeded: voidExceeded,
    reason_code: 'computed',
    blocking_errors,
    warnings,
    trace
  };
}
