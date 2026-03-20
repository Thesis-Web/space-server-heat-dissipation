"use strict";
/**
 * run-comparison.ts
 * Comparison execution runner.
 * Governed by §26.5, §34.5.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.runComparison = runComparison;
const run_scenario_1 = require("./run-scenario");
const comparison_emitter_1 = require("../emitters/comparison-emitter");
/**
 * Execute both scenarios and produce a comparison. §34.5.
 */
function runComparison(input) {
    const base_result = (0, run_scenario_1.runScenario)(input.base);
    const variant_result = (0, run_scenario_1.runScenario)(input.variant);
    const comparison = (0, comparison_emitter_1.computeComparison)(base_result, variant_result, input.label);
    const markdown = (0, comparison_emitter_1.emitComparisonMarkdown)(comparison);
    return {
        comparison,
        markdown,
        base_run_id: base_result.run_id,
        variant_run_id: variant_result.run_id,
    };
}
//# sourceMappingURL=run-comparison.js.map