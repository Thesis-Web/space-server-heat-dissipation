"use strict";
/**
 * comparison-emitter.ts
 * Comparison output emitter.
 * Governing spec: §34.5, §26.6.
 * Added per HOLE-008: required by §26.6, omitted from §43.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeComparison = computeComparison;
exports.emitComparisonMarkdown = emitComparisonMarkdown;
// ─── Delta computation ────────────────────────────────────────────────────────
function snapshotFromResult(r) {
    return {
        scenario_id: r.scenario_id,
        q_dot_total_reject_w: r.outputs.thermal.q_dot_total_reject_w,
        a_radiator_effective_m2: r.outputs.thermal.a_radiator_effective_m2,
        a_radiator_with_margin_m2: r.outputs.thermal.a_radiator_with_margin_m2,
        t_radiator_target_k: r.outputs.thermal.t_radiator_target_k,
        w_dot_compute_w: r.outputs.electrical.w_dot_compute_w,
        w_dot_parasitic_w: r.outputs.electrical.w_dot_parasitic_w,
        mass_estimate_total_kg: r.outputs.packaging.mass_estimate_total_kg,
        flag_ids: r.flags.map(f => f.flag_id),
    };
}
/**
 * Compute a comparison between base and variant run results. §34.5.
 * Positive delta means variant is larger/worse; negative means smaller/better.
 */
function computeComparison(base, variant, label) {
    const base_snap = snapshotFromResult(base);
    const variant_snap = snapshotFromResult(variant);
    const delta_mass = base_snap.mass_estimate_total_kg !== null && variant_snap.mass_estimate_total_kg !== null
        ? variant_snap.mass_estimate_total_kg - base_snap.mass_estimate_total_kg
        : null;
    const base_flag_ids = new Set(base.flags.map(f => f.flag_id));
    const variant_flag_ids = new Set(variant.flags.map(f => f.flag_id));
    const delta_flags = variant.flags.filter(f => !base_flag_ids.has(f.flag_id));
    const resolved_flags = base.flags.filter(f => !variant_flag_ids.has(f.flag_id));
    return {
        base_scenario_id: base.scenario_id,
        variant_scenario_id: variant.scenario_id,
        label: label ?? `${base.scenario_id} vs ${variant.scenario_id}`,
        delta_q_dot_total_reject_w: variant_snap.q_dot_total_reject_w - base_snap.q_dot_total_reject_w,
        delta_a_radiator_effective_m2: variant_snap.a_radiator_effective_m2 - base_snap.a_radiator_effective_m2,
        delta_a_radiator_with_margin_m2: variant_snap.a_radiator_with_margin_m2 - base_snap.a_radiator_with_margin_m2,
        delta_w_dot_parasitic_w: variant_snap.w_dot_parasitic_w - base_snap.w_dot_parasitic_w,
        delta_mass_estimate_total_kg: delta_mass,
        delta_flags,
        resolved_flags,
        base_snapshot: base_snap,
        variant_snapshot: variant_snap,
        generated_at: new Date().toISOString(),
    };
}
// ─── Markdown comparison report ───────────────────────────────────────────────
function fmtDelta(val, unit) {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)} ${unit}`;
}
function emitComparisonMarkdown(cmp) {
    const lines = [];
    lines.push(`# Comparison Report`);
    lines.push(``);
    lines.push(`**${cmp.label}**`);
    lines.push(`Generated: ${cmp.generated_at}`);
    lines.push(``);
    lines.push(`## Scenario Pair`);
    lines.push(``);
    lines.push(`| | Base | Variant |`);
    lines.push(`|---|---|---|`);
    lines.push(`| Scenario ID | \`${cmp.base_scenario_id}\` | \`${cmp.variant_scenario_id}\` |`);
    lines.push(`| Q̇ total reject | ${(cmp.base_snapshot.q_dot_total_reject_w / 1000).toFixed(2)} kW | ${(cmp.variant_snapshot.q_dot_total_reject_w / 1000).toFixed(2)} kW |`);
    lines.push(`| Radiator area (eff.) | ${cmp.base_snapshot.a_radiator_effective_m2.toFixed(2)} m² | ${cmp.variant_snapshot.a_radiator_effective_m2.toFixed(2)} m² |`);
    lines.push(`| Radiator area (w/ margin) | ${cmp.base_snapshot.a_radiator_with_margin_m2.toFixed(2)} m² | ${cmp.variant_snapshot.a_radiator_with_margin_m2.toFixed(2)} m² |`);
    lines.push(`| Radiator target temp | ${cmp.base_snapshot.t_radiator_target_k.toFixed(1)} K | ${cmp.variant_snapshot.t_radiator_target_k.toFixed(1)} K |`);
    lines.push(`| Ẇ parasitic | ${cmp.base_snapshot.w_dot_parasitic_w.toFixed(1)} W | ${cmp.variant_snapshot.w_dot_parasitic_w.toFixed(1)} W |`);
    lines.push(`| Mass (total est.) | ${cmp.base_snapshot.mass_estimate_total_kg?.toFixed(1) ?? 'N/A'} kg | ${cmp.variant_snapshot.mass_estimate_total_kg?.toFixed(1) ?? 'N/A'} kg |`);
    lines.push(``);
    lines.push(`## Deltas (Variant − Base)`);
    lines.push(``);
    lines.push(`| Parameter | Delta |`);
    lines.push(`|---|---|`);
    lines.push(`| Q̇ total reject | ${fmtDelta(cmp.delta_q_dot_total_reject_w / 1000, 'kW')} |`);
    lines.push(`| Radiator area (eff.) | ${fmtDelta(cmp.delta_a_radiator_effective_m2, 'm²')} |`);
    lines.push(`| Radiator area (w/ margin) | ${fmtDelta(cmp.delta_a_radiator_with_margin_m2, 'm²')} |`);
    lines.push(`| Ẇ parasitic | ${fmtDelta(cmp.delta_w_dot_parasitic_w, 'W')} |`);
    if (cmp.delta_mass_estimate_total_kg !== null) {
        lines.push(`| Mass total | ${fmtDelta(cmp.delta_mass_estimate_total_kg, 'kg')} |`);
    }
    lines.push(``);
    if (cmp.delta_flags.length > 0) {
        lines.push(`## New Flags in Variant`);
        lines.push(``);
        for (const f of cmp.delta_flags) {
            lines.push(`- 🆕 \`${f.flag_id}\` [${f.severity}] — ${f.message}`);
        }
        lines.push(``);
    }
    if (cmp.resolved_flags.length > 0) {
        lines.push(`## Flags Resolved in Variant`);
        lines.push(``);
        for (const f of cmp.resolved_flags) {
            lines.push(`- ✅ \`${f.flag_id}\` — ${f.message}`);
        }
        lines.push(``);
    }
    lines.push(`---`);
    lines.push(`_Positive delta = variant is larger/worse; negative = smaller/better._`);
    return lines.join('\n');
}
//# sourceMappingURL=comparison-emitter.js.map