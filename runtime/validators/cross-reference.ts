/**
 * cross-reference.ts
 * Cross-reference validation: referential integrity within a scenario bundle.
 * Governed by §15.3, §25.3, §26.3.
 * Added per HOLE-003: required by §26.3, omitted from §43.
 */

export interface CrossRefViolation {
  field: string;
  ref_value: string;
  message: string;
}

/**
 * Validate that all branch IDs in scenario.selected_branches exist in the
 * provided conversion_branch documents. §15.3.
 */
export function validateBranchRefs(
  selected_branches: string[],
  available_branch_ids: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const branchSet = new Set(available_branch_ids);

  for (const br of selected_branches) {
    if (br === 'none') continue;
    if (!branchSet.has(br) && !['reverse_brayton', 'brayton_power_cycle', 'stirling', 'tpv', 'teg', 'rf_export', 'laser_export', 'custom'].includes(br)) {
      violations.push({
        field: 'selected_branches',
        ref_value: br,
        message: `selected_branch '${br}' is not defined in any provided conversion-branch document. §15.3`,
      });
    }
  }
  return violations;
}

/**
 * Validate that all thermal stage zone refs resolve to declared zone IDs. §15.3.
 */
export function validateStageZoneRefs(
  stages: Array<{ stage_id: string; input_zone_ref: string; output_zone_ref: string }>,
  declared_zone_ids: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const zoneSet = new Set(declared_zone_ids);

  for (const stage of stages) {
    if (!zoneSet.has(stage.input_zone_ref)) {
      violations.push({
        field: `stage[${stage.stage_id}].input_zone_ref`,
        ref_value: stage.input_zone_ref,
        message: `Stage '${stage.stage_id}' input_zone_ref '${stage.input_zone_ref}' does not resolve to a declared zone.`,
      });
    }
    if (!zoneSet.has(stage.output_zone_ref)) {
      violations.push({
        field: `stage[${stage.stage_id}].output_zone_ref`,
        ref_value: stage.output_zone_ref,
        message: `Stage '${stage.stage_id}' output_zone_ref '${stage.output_zone_ref}' does not resolve to a declared zone.`,
      });
    }
  }
  return violations;
}

/**
 * Validate that all compute-module device_refs resolve to declared device_ids. §15.3.
 */
export function validateDeviceRefs(
  modules: Array<{ module_id: string; device_ref: string }>,
  declared_device_ids: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const deviceSet = new Set(declared_device_ids);

  for (const mod of modules) {
    if (!deviceSet.has(mod.device_ref)) {
      violations.push({
        field: `module[${mod.module_id}].device_ref`,
        ref_value: mod.device_ref,
        message: `Compute module '${mod.module_id}' device_ref '${mod.device_ref}' does not resolve to a declared compute-device.`,
      });
    }
  }
  return violations;
}

/**
 * Validate run-packet payload_file_refs against an actual file manifest. §25.3.
 */
export function validatePacketFileRefs(
  payload_file_refs: string[],
  available_files: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const fileSet = new Set(available_files);

  for (const ref of payload_file_refs) {
    if (!fileSet.has(ref)) {
      violations.push({
        field: 'payload_file_refs',
        ref_value: ref,
        message: `Run packet references file '${ref}' which is not present in the bundle. §25.3`,
      });
    }
  }
  return violations;
}

/**
 * Validate canonical version declarations in a run packet. §25.3, §6.3.
 */
export function validatePacketVersionDeclarations(packet: {
  blueprint_version: string;
  engineering_spec_version: string;
  schema_version: string;
}, expected: {
  blueprint_version: string;
  engineering_spec_version: string;
  schema_bundle_version: string;
}): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];

  if (packet.blueprint_version !== expected.blueprint_version) {
    violations.push({
      field: 'blueprint_version',
      ref_value: packet.blueprint_version,
      message: `Packet declares blueprint_version '${packet.blueprint_version}' but runtime expects '${expected.blueprint_version}'.`,
    });
  }
  if (packet.engineering_spec_version !== expected.engineering_spec_version) {
    violations.push({
      field: 'engineering_spec_version',
      ref_value: packet.engineering_spec_version,
      message: `Packet declares engineering_spec_version '${packet.engineering_spec_version}' but runtime expects '${expected.engineering_spec_version}'.`,
    });
  }

  return violations;
}

// =============================================================================
// Extension 3A cross-reference validation
// Governing law: 3A-spec §13.1, §13.2; dist-tree patch §9 (cross-reference.ts patch target)
// =============================================================================

/**
 * Validate that upstream_zone_ref and downstream_zone_ref on each zone
 * resolve to declared zone_ids and are not self-referential.
 * §13.1 blocking rules: unresolved zone refs, self-referential refs.
 */
export function validateZoneTopologyRefs(
  zones: Array<{ zone_id: string; upstream_zone_ref?: string | null; downstream_zone_ref?: string | null }>
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const declaredIds = new Set(zones.map(z => z.zone_id));

  for (const zone of zones) {
    const { zone_id, upstream_zone_ref, downstream_zone_ref } = zone;

    if (upstream_zone_ref) {
      if (upstream_zone_ref === zone_id) {
        violations.push({
          field: `thermal_zones[${zone_id}].upstream_zone_ref`,
          ref_value: upstream_zone_ref,
          message: `Zone '${zone_id}' upstream_zone_ref is self-referential. §13.1`,
        });
      } else if (!declaredIds.has(upstream_zone_ref)) {
        violations.push({
          field: `thermal_zones[${zone_id}].upstream_zone_ref`,
          ref_value: upstream_zone_ref,
          message: `Zone '${zone_id}' upstream_zone_ref '${upstream_zone_ref}' does not resolve to a declared zone_id. §13.1`,
        });
      }
    }

    if (downstream_zone_ref) {
      if (downstream_zone_ref === zone_id) {
        violations.push({
          field: `thermal_zones[${zone_id}].downstream_zone_ref`,
          ref_value: downstream_zone_ref,
          message: `Zone '${zone_id}' downstream_zone_ref is self-referential. §13.1`,
        });
      } else if (!declaredIds.has(downstream_zone_ref)) {
        violations.push({
          field: `thermal_zones[${zone_id}].downstream_zone_ref`,
          ref_value: downstream_zone_ref,
          message: `Zone '${zone_id}' downstream_zone_ref '${downstream_zone_ref}' does not resolve to a declared zone_id. §13.1`,
        });
      }
    }
  }

  return violations;
}

/**
 * Validate that working_fluid_ref values resolve in the provided catalog id set.
 * §13.2 blocking rule: unresolved working_fluid_ref.
 */
export function validateWorkingFluidRefs(
  zones: Array<{ zone_id: string; working_fluid_ref?: string | null }>,
  availableFluidIds: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const fluidSet = new Set(availableFluidIds);

  for (const zone of zones) {
    if (zone.working_fluid_ref && !fluidSet.has(zone.working_fluid_ref)) {
      violations.push({
        field: `thermal_zones[${zone.zone_id}].working_fluid_ref`,
        ref_value: zone.working_fluid_ref,
        message: `Zone '${zone.zone_id}' working_fluid_ref '${zone.working_fluid_ref}' not found in working-fluid catalog. §13.2`,
      });
    }
  }
  return violations;
}

/**
 * Validate that pickup_geometry_ref values resolve in the provided catalog id set.
 * §13.2 blocking rule: unresolved pickup_geometry_ref.
 */
export function validatePickupGeometryRefs(
  zones: Array<{ zone_id: string; pickup_geometry_ref?: string | null }>,
  availableGeomIds: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const geomSet = new Set(availableGeomIds);

  for (const zone of zones) {
    if (zone.pickup_geometry_ref && !geomSet.has(zone.pickup_geometry_ref)) {
      violations.push({
        field: `thermal_zones[${zone.zone_id}].pickup_geometry_ref`,
        ref_value: zone.pickup_geometry_ref,
        message: `Zone '${zone.zone_id}' pickup_geometry_ref '${zone.pickup_geometry_ref}' not found in pickup-geometry catalog. §13.2`,
      });
    }
  }
  return violations;
}

// =============================================================================
// Extension 3B cross-reference validation
// Governing law: 3B-spec §13, §5.3, §6.1, §6.2, §12
// Blueprint: 3B-blueprint §13
// Additive. Does not mutate baseline or 3A cross-reference validators.
// =============================================================================

/**
 * Validate 3B vault-gas-environment preset_id references.
 * Blocks if preset_id declared but not found in catalog.
 * 3B-spec §13.2.
 */
export function validateVaultGasPresetRefs(
  zones: Array<{ zone_id: string; vault_gas_environment_model?: { mode: string; preset_id?: string | null } | null }>,
  availablePresetIds: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const presetSet = new Set(availablePresetIds);

  for (const zone of zones) {
    const vgem = zone.vault_gas_environment_model;
    if (vgem?.mode === 'preset' && vgem.preset_id && !presetSet.has(vgem.preset_id)) {
      violations.push({
        field: `thermal_zones[${zone.zone_id}].vault_gas_environment_model.preset_id`,
        ref_value: vgem.preset_id,
        message: `Zone '${zone.zone_id}' vault_gas_environment_model.preset_id '${vgem.preset_id}' not found in vault-gas-environment-presets catalog. 3B-spec §13.2`,
      });
    }
  }
  return violations;
}

/**
 * Validate 3B transport-implementation preset_id references.
 * 3B-spec §13.3.
 */
export function validateTransportImplPresetRefs(
  zones: Array<{ zone_id: string; transport_implementation?: { mode: string; preset_id?: string | null } | null }>,
  availablePresetIds: string[]
): CrossRefViolation[] {
  const violations: CrossRefViolation[] = [];
  const presetSet = new Set(availablePresetIds);

  for (const zone of zones) {
    const ti = zone.transport_implementation;
    if (ti?.mode === 'preset' && ti.preset_id && !presetSet.has(ti.preset_id)) {
      violations.push({
        field: `thermal_zones[${zone.zone_id}].transport_implementation.preset_id`,
        ref_value: ti.preset_id,
        message: `Zone '${zone.zone_id}' transport_implementation.preset_id '${ti.preset_id}' not found in transport-implementation-presets catalog. 3B-spec §13.3`,
      });
    }
  }
  return violations;
}

/**
 * Validate 3B eclipse-state preset_id reference on scenario.operating_state.
 * 3B-spec §5.4.
 */
export function validateEclipseStatePresetRef(
  operatingState: { state_resolution_mode: string; preset_id?: string | null } | null | undefined,
  availablePresetIds: string[]
): CrossRefViolation[] {
  if (!operatingState || operatingState.state_resolution_mode !== 'preset') return [];
  if (!operatingState.preset_id) return [];
  const presetSet = new Set(availablePresetIds);
  if (!presetSet.has(operatingState.preset_id)) {
    return [{
      field: 'scenario.operating_state.preset_id',
      ref_value: operatingState.preset_id,
      message: `scenario.operating_state.preset_id '${operatingState.preset_id}' not found in eclipse-state-presets catalog. 3B-spec §5.4`,
    }];
  }
  return [];
}

/**
 * Validate 3B storage_ref resolves when storage_support_enabled.
 * 3B-spec §13.1.
 */
export function validateStorageRef3B(
  operatingState: { storage_support_enabled: boolean; storage_ref?: string | null } | null | undefined
): CrossRefViolation[] {
  if (!operatingState?.storage_support_enabled) return [];
  if (!operatingState.storage_ref) {
    return [{
      field: 'scenario.operating_state.storage_ref',
      ref_value: '(null)',
      message: 'operating_state.storage_support_enabled=true but storage_ref is null or unresolved. 3B-spec §13.1',
    }];
  }
  return [];
}
