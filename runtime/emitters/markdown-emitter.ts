/**
 * markdown-emitter.ts
 * Human-readable markdown summary emitter.
 * Governed by §26.6, §9.2, §34.
 * Must not emit a single viability verdict — descriptive outputs only. §9.2.
 */

import { RuntimeResult, Assumption } from './json-emitter';
import { Flag } from './flag-emitter';

// ─── Display unit helpers §10.3 ───────────────────────────────────────────────

function fmtW(w: number): string {
  if (Math.abs(w) >= 1e6) return `${(w / 1e6).toFixed(3)} MW`;
  if (Math.abs(w) >= 1e3) return `${(w / 1e3).toFixed(2)} kW`;
  return `${w.toFixed(1)} W`;
}

function fmtM2(m2: number): string {
  return `${m2.toFixed(2)} m²`;
}

function fmtK(k: number): string {
  return `${k.toFixed(1)} K  (${(k - 273.15).toFixed(1)} °C)`;
}

function fmtJ(j: number): string {
  if (j >= 1e9) return `${(j / 1e9).toFixed(3)} GJ`;
  if (j >= 1e6) return `${(j / 1e6).toFixed(3)} MJ`;
  if (j >= 1e3) return `${(j / 1e3).toFixed(2)} kJ`;
  return `${j.toFixed(1)} J`;
}

function fmtKg(kg: number | null): string {
  if (kg === null) return 'not estimated';
  return `${kg.toFixed(1)} kg`;
}

function flagSeverityIcon(severity: string): string {
  switch (severity) {
    case 'error': return '🔴';
    case 'review': return '🟠';
    case 'warning': return '🟡';
    default: return 'ℹ️';
  }
}

// ─── Main summary emitter ─────────────────────────────────────────────────────

/**
 * Emit human-readable markdown summary.
 * All numeric values include SI units. §10.3.
 * No single viability verdict emitted. §9.2.
 */
export function emitMarkdownSummary(result: RuntimeResult): string {
  const t = result.outputs.thermal;
  const e = result.outputs.electrical;
  const p = result.outputs.packaging;
  const lines: string[] = [];

  lines.push(`# Scenario Run Summary`);
  lines.push(``);
  lines.push(`**Scenario ID:** \`${result.scenario_id}\``);
  lines.push(`**Run ID:** \`${result.run_id}\``);
  lines.push(`**Load State:** ${result.load_state}`);
  lines.push(`**Generated:** ${result.generated_at}`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  // Version block §6.3
  lines.push(`## Version Declarations`);
  lines.push(``);
  lines.push(`| Artifact | Version |`);
  lines.push(`|---|---|`);
  lines.push(`| Runtime | ${result.runtime_version} |`);
  lines.push(`| Blueprint | ${result.blueprint_version} |`);
  lines.push(`| Engineering Spec | ${result.engineering_spec_version} |`);
  lines.push(`| Schema Bundle | ${result.schema_bundle_version} |`);
  lines.push(``);

  // Thermal outputs §34.2
  lines.push(`## Thermal Outputs`);
  lines.push(``);
  lines.push(`| Parameter | Value (SI) |`);
  lines.push(`|---|---|`);
  lines.push(`| Q̇ internal | ${fmtW(t.q_dot_internal_w)} |`);
  lines.push(`| Q̇ external | ${fmtW(t.q_dot_external_w)} |`);
  lines.push(`| Q̇ total reject required | ${fmtW(t.q_dot_total_reject_w)} |`);
  lines.push(`| Radiator target temp | ${fmtK(t.t_radiator_target_k)} |`);
  lines.push(`| Radiator effective area | ${fmtM2(t.a_radiator_effective_m2)} |`);
  lines.push(`| Radiator area (with margin) | ${fmtM2(t.a_radiator_with_margin_m2)} |`);
  lines.push(`| Storage usable energy | ${fmtJ(t.storage_energy_usable_j)} |`);
  lines.push(`| Stage losses (total) | ${fmtW(t.stage_losses_w)} |`);
  lines.push(``);

  // Zone temperatures
  lines.push(`### Zone Temperatures`);
  lines.push(``);
  if (t.t_zone_a_k !== null) lines.push(`- Zone A: ${fmtK(t.t_zone_a_k)}`);
  if (t.t_zone_b_k !== null) lines.push(`- Zone B: ${fmtK(t.t_zone_b_k)}`);
  if (t.t_zone_c_k !== null) lines.push(`- Zone C: ${fmtK(t.t_zone_c_k)}`);
  if (t.t_zone_d_k !== null) lines.push(`- Zone D: ${fmtK(t.t_zone_d_k)}`);
  lines.push(``);

  // Electrical outputs §34.3
  lines.push(`## Electrical Outputs`);
  lines.push(``);
  lines.push(`| Parameter | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Ẇ compute | ${fmtW(e.w_dot_compute_w)} |`);
  lines.push(`| Ẇ non-compute | ${fmtW(e.w_dot_non_compute_w)} |`);
  lines.push(`| Ẇ parasitic | ${fmtW(e.w_dot_parasitic_w)} |`);
  lines.push(`| Ẇ branch generated | ${fmtW(e.w_dot_branch_generated_w)} |`);
  lines.push(`| Ẇ branch consumed | ${fmtW(e.w_dot_branch_consumed_w)} |`);
  if (e.w_dot_net_margin_w !== null) {
    lines.push(`| Ẇ net margin | ${fmtW(e.w_dot_net_margin_w)} |`);
  }
  lines.push(``);

  // Packaging / mass §34.4
  lines.push(`## Packaging & Mass Estimates`);
  lines.push(``);
  lines.push(`| Item | Estimate |`);
  lines.push(`|---|---|`);
  lines.push(`| Radiator mass | ${fmtKg(p.mass_estimate_radiator_kg)} |`);
  lines.push(`| Storage mass | ${fmtKg(p.mass_estimate_storage_kg)} |`);
  lines.push(`| Total (estimated) | ${fmtKg(p.mass_estimate_total_kg)} |`);
  if (p.packaging_notes) {
    lines.push(``);
    lines.push(`**Notes:** ${p.packaging_notes}`);
  }
  lines.push(``);

  // Flags §35
  const hasFlags = result.flags.length > 0;
  lines.push(`## Flags`);
  lines.push(``);
  lines.push(
    `Errors: ${result.flag_summary.error_count} | ` +
    `Review: ${result.flag_summary.review_count} | ` +
    `Warnings: ${result.flag_summary.warning_count} | ` +
    `Info: ${result.flag_summary.info_count}`
  );
  lines.push(``);
  if (hasFlags) {
    for (const flag of result.flags) {
      lines.push(
        `${flagSeverityIcon(flag.severity)} **[${flag.severity.toUpperCase()}]** ` +
        `\`${flag.flag_id}\`  `
      );
      lines.push(`  ${flag.message}`);
      if (flag.trigger_value !== null) {
        lines.push(`  Trigger value: ${flag.trigger_value}`);
      }
      lines.push(``);
    }
  } else {
    lines.push(`_No flags raised._`);
    lines.push(``);
  }

  // Assumptions §4.3, §9.2
  lines.push(`## Declared Assumptions`);
  lines.push(``);
  if (result.assumptions.length > 0) {
    lines.push(`| Field | Value | Source |`);
    lines.push(`|---|---|---|`);
    for (const a of result.assumptions) {
      lines.push(`| ${a.field} | ${a.value} | ${a.source} |`);
    }
    lines.push(``);
    const researchRequired = result.assumptions.filter(a => a.source === 'research-required');
    if (researchRequired.length > 0) {
      lines.push(`> ⚠️ **${researchRequired.length} field(s) marked research-required.** Outputs dependent on these fields require confirmation before use.`);
      lines.push(``);
    }
  } else {
    lines.push(`_No assumptions declared._`);
    lines.push(``);
  }

  // Notes
  if (result.notes.length > 0) {
    lines.push(`## Notes`);
    lines.push(``);
    for (const note of result.notes) {
      lines.push(`- ${note}`);
    }
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`_Generated by orbital thermal trade runtime ${result.runtime_version}. ` +
    `Spec: ${result.engineering_spec_version}. This report is descriptive — no single viability verdict is emitted per §9.2._`);

  return lines.join('\n');
}

/**
 * Emit a compact flag-only report (for packet attachment).
 */
export function emitFlagReport(run_id: string, scenario_id: string, flags: Flag[]): string {
  const lines: string[] = [];
  lines.push(`# Flag Report`);
  lines.push(``);
  lines.push(`**Run:** \`${run_id}\`  **Scenario:** \`${scenario_id}\``);
  lines.push(``);
  if (flags.length === 0) {
    lines.push(`No flags raised.`);
  } else {
    for (const f of flags) {
      lines.push(
        `- ${flagSeverityIcon(f.severity)} \`${f.flag_id}\` [${f.severity}] — ${f.message}`
      );
    }
  }
  return lines.join('\n');
}

/**
 * Emit a single assumption as a markdown line. §4.3.
 */
export function formatAssumption(a: Assumption): string {
  return `- **${a.field}**: ${a.value} _(${a.source})_${a.note ? ' — ' + a.note : ''}`;
}
