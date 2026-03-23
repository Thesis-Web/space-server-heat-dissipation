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
export declare function validateBranchRefs(selected_branches: string[], available_branch_ids: string[]): CrossRefViolation[];
/**
 * Validate that all thermal stage zone refs resolve to declared zone IDs. §15.3.
 */
export declare function validateStageZoneRefs(stages: Array<{
    stage_id: string;
    input_zone_ref: string;
    output_zone_ref: string;
}>, declared_zone_ids: string[]): CrossRefViolation[];
/**
 * Validate that all compute-module device_refs resolve to declared device_ids. §15.3.
 */
export declare function validateDeviceRefs(modules: Array<{
    module_id: string;
    device_ref: string;
}>, declared_device_ids: string[]): CrossRefViolation[];
/**
 * Validate run-packet payload_file_refs against an actual file manifest. §25.3.
 */
export declare function validatePacketFileRefs(payload_file_refs: string[], available_files: string[]): CrossRefViolation[];
/**
 * Validate canonical version declarations in a run packet. §25.3, §6.3.
 */
export declare function validatePacketVersionDeclarations(packet: {
    blueprint_version: string;
    engineering_spec_version: string;
    schema_version: string;
}, expected: {
    blueprint_version: string;
    engineering_spec_version: string;
    schema_bundle_version: string;
}): CrossRefViolation[];
/**
 * Validate that upstream_zone_ref and downstream_zone_ref on each zone
 * resolve to declared zone_ids and are not self-referential.
 * §13.1 blocking rules: unresolved zone refs, self-referential refs.
 */
export declare function validateZoneTopologyRefs(zones: Array<{
    zone_id: string;
    upstream_zone_ref?: string | null;
    downstream_zone_ref?: string | null;
}>): CrossRefViolation[];
/**
 * Validate that working_fluid_ref values resolve in the provided catalog id set.
 * §13.2 blocking rule: unresolved working_fluid_ref.
 */
export declare function validateWorkingFluidRefs(zones: Array<{
    zone_id: string;
    working_fluid_ref?: string | null;
}>, availableFluidIds: string[]): CrossRefViolation[];
/**
 * Validate that pickup_geometry_ref values resolve in the provided catalog id set.
 * §13.2 blocking rule: unresolved pickup_geometry_ref.
 */
export declare function validatePickupGeometryRefs(zones: Array<{
    zone_id: string;
    pickup_geometry_ref?: string | null;
}>, availableGeomIds: string[]): CrossRefViolation[];
//# sourceMappingURL=cross-reference.d.ts.map