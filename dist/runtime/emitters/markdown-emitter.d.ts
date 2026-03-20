/**
 * markdown-emitter.ts
 * Human-readable markdown summary emitter.
 * Governed by §26.6, §9.2, §34.
 * Must not emit a single viability verdict — descriptive outputs only. §9.2.
 */
import { RuntimeResult, Assumption } from './json-emitter';
import { Flag } from './flag-emitter';
/**
 * Emit human-readable markdown summary.
 * All numeric values include SI units. §10.3.
 * No single viability verdict emitted. §9.2.
 */
export declare function emitMarkdownSummary(result: RuntimeResult): string;
/**
 * Emit a compact flag-only report (for packet attachment).
 */
export declare function emitFlagReport(run_id: string, scenario_id: string, flags: Flag[]): string;
/**
 * Emit a single assumption as a markdown line. §4.3.
 */
export declare function formatAssumption(a: Assumption): string;
//# sourceMappingURL=markdown-emitter.d.ts.map