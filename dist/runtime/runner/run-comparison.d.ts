/**
 * run-comparison.ts
 * Comparison execution runner.
 * Governed by §26.5, §34.5.
 */
import { ScenarioRunInput } from './run-scenario';
import { ComparisonResult } from '../emitters/comparison-emitter';
export interface ComparisonRunInput {
    base: ScenarioRunInput;
    variant: ScenarioRunInput;
    label?: string;
}
export interface ComparisonRunOutput {
    comparison: ComparisonResult;
    markdown: string;
    base_run_id: string;
    variant_run_id: string;
}
/**
 * Execute both scenarios and produce a comparison. §34.5.
 */
export declare function runComparison(input: ComparisonRunInput): ComparisonRunOutput;
//# sourceMappingURL=run-comparison.d.ts.map