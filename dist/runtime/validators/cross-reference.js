"use strict";
/**
 * cross-reference.ts
 * Cross-reference validation: referential integrity within a scenario bundle.
 * Governed by §15.3, §25.3, §26.3.
 * Added per HOLE-003: required by §26.3, omitted from §43.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBranchRefs = validateBranchRefs;
exports.validateStageZoneRefs = validateStageZoneRefs;
exports.validateDeviceRefs = validateDeviceRefs;
exports.validatePacketFileRefs = validatePacketFileRefs;
exports.validatePacketVersionDeclarations = validatePacketVersionDeclarations;
/**
 * Validate that all branch IDs in scenario.selected_branches exist in the
 * provided conversion_branch documents. §15.3.
 */
function validateBranchRefs(selected_branches, available_branch_ids) {
    const violations = [];
    const branchSet = new Set(available_branch_ids);
    for (const br of selected_branches) {
        if (br === 'none')
            continue;
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
function validateStageZoneRefs(stages, declared_zone_ids) {
    const violations = [];
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
function validateDeviceRefs(modules, declared_device_ids) {
    const violations = [];
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
function validatePacketFileRefs(payload_file_refs, available_files) {
    const violations = [];
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
function validatePacketVersionDeclarations(packet, expected) {
    const violations = [];
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
//# sourceMappingURL=cross-reference.js.map