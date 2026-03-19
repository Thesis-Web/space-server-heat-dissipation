/**
 * run-comparison.ts
 * Comparison execution runner.
 * Governed by §26.5, §34.5.
 */

import { ScenarioRunInput, runScenario } from './run-scenario';
import { computeComparison, ComparisonResult, emitComparisonMarkdown } from '../emitters/comparison-emitter';

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
export function runComparison(input: ComparisonRunInput): ComparisonRunOutput {
  const base_result = runScenario(input.base);
  const variant_result = runScenario(input.variant);

  const comparison = computeComparison(base_result, variant_result, input.label);
  const markdown = emitComparisonMarkdown(comparison);

  return {
    comparison,
    markdown,
    base_run_id: base_result.run_id,
    variant_run_id: variant_result.run_id,
  };
}
