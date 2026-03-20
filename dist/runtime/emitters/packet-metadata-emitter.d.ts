/**
 * Packet metadata emitter — orbital-thermal-trade-system v0.1.5
 * Governing law: ui-expansion-spec-v0.1.5 §6.2–6.4, §22, §23, §24
 *
 * Assembles run-packet metadata fields: file_manifest, catalog metadata,
 * transform_trace, risk_summary, validation_summary, branding_metadata.
 * All fields are report-only per spec §23: branding does not alter runtime results.
 */
import type { ValidationResult } from "../validators/bounds";
export interface FileManifestEntry {
    name: string;
    byte_length: number;
}
export interface RiskSummary {
    maturity_class: string;
    ttl_class: string;
    thermal_cycling_risk: string;
    corrosion_risk: string;
    contamination_risk: string;
    vibration_risk: string;
    packaging_stress: string;
    compactness_stress: string;
    research_required_items: string[];
}
export interface BrandingMetadata {
    organization_name: string;
    contact_name: string;
    contact_email: string;
    rights_notice: string;
    confidentiality_notice: string;
    recipient_notice: string;
    default_packet_footer: string;
}
export interface PacketMetadata {
    file_manifest: FileManifestEntry[];
    catalog_ids_used: string[];
    catalog_versions_used: Record<string, string>;
    catalog_checksums_sha256: Record<string, string>;
    transform_trace: string[];
    runtime_authority_declaration: "runtime";
    validation_summary: ValidationResult;
    risk_summary: RiskSummary;
    branding_metadata: BrandingMetadata;
    research_required_items: string[];
}
/**
 * Compute UTF-8 byte length of a string.
 * Spec §6.4: byte_length is the UTF-8 encoded byte length of the exact serialised file content.
 */
export declare function utf8ByteLength(content: string): number;
/**
 * Build a file manifest entry from file name and serialised content.
 * Spec §6.3: every file in payload_file_refs must appear in file_manifest.
 */
export declare function makeManifestEntry(name: string, content: string): FileManifestEntry;
/**
 * Assemble the complete packet metadata object.
 * Spec §24.3: required packet metadata fields.
 * Spec §23: branding is report-only — no branding field changes runtime results.
 */
export declare function emitPacketMetadata(params: {
    files: Array<{
        name: string;
        content: string;
    }>;
    catalog_ids_used: string[];
    catalog_versions_used: Record<string, string>;
    catalog_checksums_sha256: Record<string, string>;
    transform_trace: string[];
    validation: ValidationResult;
    risk_summary: RiskSummary;
    branding: BrandingMetadata;
    research_required_items: string[];
}): PacketMetadata;
/**
 * Emit a human-readable scenario summary in Markdown.
 * Spec §24.1: bundle must include scenario-summary.md.
 */
export declare function emitScenarioSummaryMarkdown(params: {
    scenario_id: string;
    label: string;
    node_class: string;
    architecture_class: string;
    mission_mode: string;
    w_dot_compute_module_w: number;
    w_dot_non_compute_total_w: number;
    q_dot_total_reject_w: number;
    a_radiator_effective_m2: number;
    a_with_margin_m2: number;
    radiator_target_temp_k: number;
    reserve_margin_fraction: number;
    transform_trace: string[];
    research_required_items: string[];
    runtime_authority_declaration: string;
}): string;
//# sourceMappingURL=packet-metadata-emitter.d.ts.map