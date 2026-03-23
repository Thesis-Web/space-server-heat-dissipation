"use strict";
/**
 * Packet metadata emitter — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §6.2–6.4, §22, §23, §24
 *
 * Assembles run-packet metadata fields: file_manifest, catalog metadata,
 * transform_trace, risk_summary, validation_summary, branding_metadata.
 * All fields are report-only per spec §23: branding does not alter runtime results.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.utf8ByteLength = utf8ByteLength;
exports.makeManifestEntry = makeManifestEntry;
exports.emitPacketMetadata = emitPacketMetadata;
exports.emitScenarioSummaryMarkdown = emitScenarioSummaryMarkdown;
exports.buildExtension3APacketMetadata = buildExtension3APacketMetadata;
/**
 * Compute UTF-8 byte length of a string.
 * Spec §6.4: byte_length is the UTF-8 encoded byte length of the exact serialised file content.
 */
function utf8ByteLength(content) {
    return Buffer.byteLength(content, "utf8");
}
/**
 * Build a file manifest entry from file name and serialised content.
 * Spec §6.3: every file in payload_file_refs must appear in file_manifest.
 */
function makeManifestEntry(name, content) {
    return { name, byte_length: utf8ByteLength(content) };
}
/**
 * Assemble the complete packet metadata object.
 * Spec §24.3: required packet metadata fields.
 * Spec §23: branding is report-only — no branding field changes runtime results.
 */
function emitPacketMetadata(params) {
    const file_manifest = params.files.map((f) => makeManifestEntry(f.name, f.content));
    return {
        file_manifest,
        catalog_ids_used: params.catalog_ids_used,
        catalog_versions_used: params.catalog_versions_used,
        catalog_checksums_sha256: params.catalog_checksums_sha256,
        transform_trace: params.transform_trace,
        runtime_authority_declaration: "runtime",
        validation_summary: params.validation,
        risk_summary: params.risk_summary,
        branding_metadata: params.branding,
        research_required_items: params.research_required_items,
    };
}
/**
 * Emit a human-readable scenario summary in Markdown.
 * Spec §24.1: bundle must include scenario-summary.md.
 */
function emitScenarioSummaryMarkdown(params) {
    const p = params;
    const lines = [
        `# Scenario Summary`,
        ``,
        `**Scenario ID:** ${p.scenario_id}`,
        `**Label:** ${p.label}`,
        `**Node Class:** ${p.node_class}`,
        `**Architecture Class:** ${p.architecture_class}`,
        `**Mission Mode:** ${p.mission_mode}`,
        ``,
        `## Load Summary`,
        ``,
        `| Item | Value |`,
        `|---|---|`,
        `| Compute module total | ${p.w_dot_compute_module_w.toFixed(1)} W |`,
        `| Non-compute total | ${p.w_dot_non_compute_total_w.toFixed(1)} W |`,
        `| Total reject burden | ${p.q_dot_total_reject_w.toFixed(1)} W |`,
        ``,
        `## Radiator Sizing`,
        ``,
        `| Item | Value |`,
        `|---|---|`,
        `| Target radiator temperature | ${p.radiator_target_temp_k} K |`,
        `| Effective area (no margin) | ${p.a_radiator_effective_m2.toFixed(4)} m² |`,
        `| Reserve margin | ${(p.reserve_margin_fraction * 100).toFixed(1)}% |`,
        `| Area with margin | ${p.a_with_margin_m2.toFixed(4)} m² |`,
        ``,
        `## Transform Trace`,
        ``,
        ...p.transform_trace.map((t) => `- ${t}`),
        ``,
        `## Research Required Items`,
        ``,
        p.research_required_items.length > 0
            ? p.research_required_items.map((r) => `- ${r}`).join("\n")
            : "- None declared",
        ``,
        `---`,
        ``,
        `*Runtime authority: ${p.runtime_authority_declaration}. All engineering outputs are derived by the authoritative runtime engine.*`,
    ];
    return lines.join("\n");
}
/**
 * Build 3A addition to packet metadata.
 * §10.1: topology_report_policy, defaults_audit_version, catalog_versions, generated_artifacts[].
 * §10.2: any generated report must appear in packet metadata and file manifest.
 */
function buildExtension3APacketMetadata(params) {
    const artifacts = [];
    if (params.topology_report_content) {
        artifacts.push({
            artifact_type: 'topology_report',
            name: 'extension-3a-topology-report.md',
            byte_length: Buffer.byteLength(params.topology_report_content, 'utf8'),
            spec_section: '§14.1',
        });
    }
    if (params.defaults_audit_content) {
        artifacts.push({
            artifact_type: 'defaults_audit',
            name: 'extension-3a-defaults-audit.json',
            byte_length: Buffer.byteLength(params.defaults_audit_content, 'utf8'),
            spec_section: '§12.2',
        });
    }
    if (params.convergence_trace_content) {
        artifacts.push({
            artifact_type: 'convergence_trace',
            name: 'extension-3a-convergence-trace.json',
            byte_length: Buffer.byteLength(params.convergence_trace_content, 'utf8'),
            spec_section: '§11.4',
        });
    }
    return {
        enable_model_extension_3a: params.enable_model_extension_3a,
        model_extension_3a_mode: params.model_extension_3a_mode,
        topology_report_policy: params.topology_report_policy ?? 'always',
        defaults_audit_version: params.defaults_audit_version ?? null,
        extension_3a_catalog_versions: {
            working_fluids: params.working_fluids_catalog_version ?? null,
            pickup_geometries: params.pickup_geometries_catalog_version ?? null,
        },
        generated_artifacts_3a: artifacts,
    };
}
//# sourceMappingURL=packet-metadata-emitter.js.map