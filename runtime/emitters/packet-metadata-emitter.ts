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

// =============================================================================
// Extension 3A packet metadata additions
// Governing law: 3A-spec §10.1–§10.2; dist-tree patch §17 (packet-metadata-emitter.ts patch target)
// =============================================================================

export interface Extension3AGeneratedArtifact {
  artifact_type: 'topology_report' | 'defaults_audit' | 'convergence_trace';
  name: string;
  byte_length: number;
  spec_section: string;
}

export interface Extension3APacketMetadataAddition {
  enable_model_extension_3a: boolean;
  model_extension_3a_mode: string;
  topology_report_policy: string;
  defaults_audit_version: string | null;
  extension_3a_catalog_versions: {
    working_fluids: string | null;
    pickup_geometries: string | null;
  };
  generated_artifacts_3a: Extension3AGeneratedArtifact[];
}

/**
 * Build 3A addition to packet metadata.
 * §10.1: topology_report_policy, defaults_audit_version, catalog_versions, generated_artifacts[].
 * §10.2: any generated report must appear in packet metadata and file manifest.
 */
export function buildExtension3APacketMetadata(params: {
  enable_model_extension_3a: boolean;
  model_extension_3a_mode: string;
  topology_report_policy?: string;
  defaults_audit_version?: string | null;
  working_fluids_catalog_version?: string | null;
  pickup_geometries_catalog_version?: string | null;
  topology_report_content?: string | null;
  defaults_audit_content?: string | null;
  convergence_trace_content?: string | null;
}): Extension3APacketMetadataAddition {
  const artifacts: Extension3AGeneratedArtifact[] = [];

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

// =============================================================================
// Extension 3B packet metadata additions
// Governing law: 3B-spec §10.5 — resolved 3B preset IDs, preset versions, and
// catalog-version lineage must emit through the canonical packet-metadata emitter
// path in addition to being present on extension_3b_result.preset_provenance.
// Blueprint: 3B-blueprint §5.4 (provenance law)
// =============================================================================

export interface Extension3BPresetProvenanceEntry {
  zone_id: string | null;
  object_type: string;
  preset_catalog_id: string;
  preset_entry_id: string;
  preset_version: string;
  manual_override_fields: string[];
}

export interface Extension3BPacketMetadataAddition {
  enable_model_extension_3b: boolean;
  model_extension_3b_mode: string;
  extension_3b_catalog_versions: {
    vault_gas_environment_presets: string | null;
    transport_implementation_presets: string | null;
    eclipse_state_presets: string | null;
  };
  preset_provenance: Extension3BPresetProvenanceEntry[];
  spec_version: string;
  blueprint_version: string;
}

/**
 * buildExtension3BPacketMetadata
 * 3B-spec §10.5: emit resolved 3B preset IDs, versions, and catalog-version
 * lineage through the canonical packet-metadata emitter path.
 * This is called in addition to extension_3b_result.preset_provenance —
 * both surfaces must carry the provenance data.
 */
export function buildExtension3BPacketMetadata(params: {
  enable_model_extension_3b: boolean;
  model_extension_3b_mode: string;
  spec_version?: string;
  blueprint_version?: string;
  vault_gas_environment_presets_catalog_version?: string | null;
  transport_implementation_presets_catalog_version?: string | null;
  eclipse_state_presets_catalog_version?: string | null;
  preset_provenance?: Extension3BPresetProvenanceEntry[];
}): Extension3BPacketMetadataAddition {
  return {
    enable_model_extension_3b: params.enable_model_extension_3b,
    model_extension_3b_mode: params.model_extension_3b_mode,
    extension_3b_catalog_versions: {
      vault_gas_environment_presets: params.vault_gas_environment_presets_catalog_version ?? null,
      transport_implementation_presets: params.transport_implementation_presets_catalog_version ?? null,
      eclipse_state_presets: params.eclipse_state_presets_catalog_version ?? null,
    },
    preset_provenance: params.preset_provenance ?? [],
    spec_version: params.spec_version ?? 'v0.1.1',
    blueprint_version: params.blueprint_version ?? 'v0.1.1',
  };
}
