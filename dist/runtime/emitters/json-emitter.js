"use strict";
/**
 * json-emitter.ts
 * Structured JSON result emitter.
 * Output contract: §34. Governed by §26.6, §9.2.
 * The runtime must not emit a single final viability truth value. §9.2.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitStructuredResult = emitStructuredResult;
exports.serializeResult = serializeResult;
const constants_1 = require("../constants/constants");
// ─── Emitter function ─────────────────────────────────────────────────────────
function emitStructuredResult(scenario_id, load_state, thermal, electrical, packaging, flags, flag_summary, assumptions, notes, run_id) {
    return {
        run_id: run_id ?? `run-${scenario_id}-${Date.now()}`,
        runtime_version: constants_1.RUNTIME_VERSION,
        blueprint_version: constants_1.BLUEPRINT_VERSION,
        engineering_spec_version: constants_1.ENGINEERING_SPEC_VERSION,
        schema_bundle_version: constants_1.SCHEMA_BUNDLE_VERSION,
        scenario_id,
        load_state,
        outputs: { thermal, electrical, packaging },
        flags,
        flag_summary,
        assumptions,
        notes,
        generated_at: new Date().toISOString(),
    };
}
/**
 * Serialize result to indented JSON string.
 * §9.2 — SI values must remain present in structured output.
 */
function serializeResult(result) {
    return JSON.stringify(result, null, 2);
}
//# sourceMappingURL=json-emitter.js.map