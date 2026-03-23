"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExtension3A = normalizeExtension3A;
const default_expander_1 = require("./default-expander");
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
function normalizeExtension3A(scenarioRaw, radiatorsRaw = []) {
    const transform_trace = ['extension-3a-normalizer: begin'];
    // ── Step 1: Scenario-level defaults ───────────────────────────────────────
    const scenarioDefaults = (0, default_expander_1.expand3ADefaults)({
        enable_model_extension_3a: scenarioRaw.enable_model_extension_3a,
        model_extension_3a_mode: scenarioRaw.model_extension_3a_mode,
        topology_validation_policy: scenarioRaw.topology_validation_policy,
        convergence_control: scenarioRaw.convergence_control,
        defaults_audit_version: scenarioRaw.defaults_audit_version,
    });
    const defaults_applied = [...scenarioDefaults.defaults_applied];
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
        };
    }
    transform_trace.push(`extension-3a-normalizer: mode=${scenarioDefaults.model_extension_3a_mode}`);
    // ── Step 3: Normalize thermal zones ───────────────────────────────────────
    const rawZones = scenarioRaw.thermal_zones ?? [];
    const normalized_zones = [];
    for (const zone of rawZones) {
        const z = { ...zone };
        const zoneDefaults = (0, default_expander_1.injectZone3ADefaults)(z);
        defaults_applied.push(...zoneDefaults);
        // Rule: if zone_role=convergence_exchange, convergence_enabled must be true (§6.4)
        if (z.zone_role === 'convergence_exchange' && !z.convergence_enabled) {
            z.convergence_enabled = true;
            defaults_applied.push(`thermal_zones[${z.zone_id}].convergence_enabled (forced true: zone_role=convergence_exchange per §6.4)`);
            transform_trace.push(`extension-3a-normalizer: zone[${z.zone_id}] convergence_enabled forced true per §6.4`);
        }
        normalized_zones.push(z);
    }
    transform_trace.push(`extension-3a-normalizer: normalized ${normalized_zones.length} zones`);
    // ── Step 4: Normalize radiators ────────────────────────────────────────────
    const normalized_radiators = [];
    for (const rad of radiatorsRaw) {
        const r = { ...rad };
        const radId = String(r.radiator_id ?? 'unknown');
        const radDefaults = (0, default_expander_1.injectRadiator3ADefaults)(r, radId);
        defaults_applied.push(...radDefaults);
        normalized_radiators.push(r);
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
    };
}
//# sourceMappingURL=extension-3a-normalizer.js.map