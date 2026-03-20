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
export function utf8ByteLength(content: string): number {
  return Buffer.byteLength(content, "utf8");
}

/**
 * Build a file manifest entry from file name and serialised content.
 * Spec §6.3: every file in payload_file_refs must appear in file_manifest.
 */
export function makeManifestEntry(name: string, content: string): FileManifestEntry {
  return { name, byte_length: utf8ByteLength(content) };
}

/**
 * Assemble the complete packet metadata object.
 * Spec §24.3: required packet metadata fields.
 * Spec §23: branding is report-only — no branding field changes runtime results.
 */
export function emitPacketMetadata(params: {
  files: Array<{ name: string; content: string }>;
  catalog_ids_used: string[];
  catalog_versions_used: Record<string, string>;
  catalog_checksums_sha256: Record<string, string>;
  transform_trace: string[];
  validation: ValidationResult;
  risk_summary: RiskSummary;
  branding: BrandingMetadata;
  research_required_items: string[];
}): PacketMetadata {
  const file_manifest: FileManifestEntry[] = params.files.map((f) => makeManifestEntry(f.name, f.content));

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
export function emitScenarioSummaryMarkdown(params: {
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
}): string {
  const p = params;
  const lines: string[] = [
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
