/**
 * run-packet.ts
 * Packet execution runner.
 * Governed by §26.5, §25, §37.
 * Added per HOLE-004: required by §26.5, omitted from §43.
 */

import { runScenario, ScenarioRunInput } from './run-scenario';
import { runComparison } from './run-comparison';
import { serializeResult, RuntimeResult } from '../emitters/json-emitter';
import { emitMarkdownSummary, emitFlagReport } from '../emitters/markdown-emitter';
import { BLUEPRINT_VERSION, ENGINEERING_SPEC_VERSION, RUNTIME_VERSION, SCHEMA_BUNDLE_VERSION } from '../constants/constants';

export interface PacketRunInput {
  packet_id: string;
  blueprint_version: string;
  engineering_spec_version: string;
  scenario: ScenarioRunInput;
  requested_outputs: Array<'structured_json' | 'summary_markdown' | 'comparison_report' | 'flag_report' | 'packet_bundle'>;
  comparison_requests?: Array<{
    label: string;
    variant_scenario: ScenarioRunInput;
  }>;
  operator_notes?: string;
}

export interface PacketRunOutput {
  packet_id: string;
  primary_result: RuntimeResult;
  artifacts: Record<string, string>;
  file_manifest: Array<{ filename: string; byte_length: number }>;
  version_check: { ok: boolean; warnings: string[] };
}

/**
 * Execute a run packet — runs the primary scenario and any comparison
 * requests, then emits all requested output artifacts. §37.
 */
export function runPacket(input: PacketRunInput): PacketRunOutput {
  const artifacts: Record<string, string> = {};
  const manifest: Array<{ filename: string; byte_length: number }> = [];
  const versionWarnings: string[] = [];

  // Version check §25.3, §6.3
  if (input.blueprint_version !== BLUEPRINT_VERSION) {
    versionWarnings.push(
      `Packet declares blueprint_version '${input.blueprint_version}'; ` +
        `runtime expects '${BLUEPRINT_VERSION}'.`
    );
  }
  if (input.engineering_spec_version !== ENGINEERING_SPEC_VERSION) {
    versionWarnings.push(
      `Packet declares engineering_spec_version '${input.engineering_spec_version}'; ` +
        `runtime expects '${ENGINEERING_SPEC_VERSION}'.`
    );
  }

  // Primary scenario run
  const primary = runScenario(input.scenario);

  // Requested outputs §25.1
  if (input.requested_outputs.includes('structured_json')) {
    const content = serializeResult(primary);
    const filename = `result-${primary.scenario_id}.json`;
    artifacts[filename] = content;
    manifest.push({ filename, byte_length: Buffer.byteLength(content, 'utf8') });
  }

  if (input.requested_outputs.includes('summary_markdown')) {
    const content = emitMarkdownSummary(primary);
    const filename = `summary-${primary.scenario_id}.md`;
    artifacts[filename] = content;
    manifest.push({ filename, byte_length: Buffer.byteLength(content, 'utf8') });
  }

  if (input.requested_outputs.includes('flag_report')) {
    const content = emitFlagReport(primary.run_id, primary.scenario_id, primary.flags);
    const filename = `flags-${primary.scenario_id}.md`;
    artifacts[filename] = content;
    manifest.push({ filename, byte_length: Buffer.byteLength(content, 'utf8') });
  }

  if (input.requested_outputs.includes('comparison_report') && input.comparison_requests) {
    for (const cr of input.comparison_requests) {
      const cmpOut = runComparison({
        base: input.scenario,
        variant: cr.variant_scenario,
        label: cr.label,
      });
      const filename = `comparison-${cr.label.replace(/\s+/g, '-')}.md`;
      artifacts[filename] = cmpOut.markdown;
      manifest.push({ filename, byte_length: Buffer.byteLength(cmpOut.markdown, 'utf8') });
    }
  }

  // Emit run-packet receipt §37.1
  const receipt = JSON.stringify({
    packet_id: input.packet_id,
    run_id: primary.run_id,
    runtime_version: RUNTIME_VERSION,
    blueprint_version: BLUEPRINT_VERSION,
    engineering_spec_version: ENGINEERING_SPEC_VERSION,
    schema_bundle_version: SCHEMA_BUNDLE_VERSION,
    scenario_id: primary.scenario_id,
    generated_at: primary.generated_at,
    file_manifest: manifest,
    operator_notes: input.operator_notes ?? '',
    version_warnings: versionWarnings,
  }, null, 2);
  const receiptFilename = `run-packet-${input.packet_id}.json`;
  artifacts[receiptFilename] = receipt;
  manifest.push({ filename: receiptFilename, byte_length: Buffer.byteLength(receipt, 'utf8') });

  return {
    packet_id: input.packet_id,
    primary_result: primary,
    artifacts,
    file_manifest: manifest,
    version_check: { ok: versionWarnings.length === 0, warnings: versionWarnings },
  };
}
