/**
 * Run-packet runner — orbital-thermal-trade-system v0.1.5
 * Governing law: engineering-spec-v0.1.0 §26.5, §27; ui-expansion-spec-v0.1.5 §24
 *
 * Executes a scenario against the runtime formula family.
 * All outputs from this module are authoritative.
 * UI preview values are display-only and subordinate to these results.
 */
import { aggregateScenario, type ScenarioAggregationInput } from "../transforms/scenario-aggregation";
import { radiatorEffectiveArea, type RadiatorSizingInput } from "../formulas/radiation";
import { type ValidationResult } from "../validators/bounds";
import { RUNTIME_VERSIONS } from "../constants/constants";
import { type Extension3AInput, type Extension3AResult } from "./run-extension-3a";
export interface BranchInput {
    branch_id: string;
    mode_label: string;
    t_hot_source_k: number;
    t_cold_sink_k: number;
    efficiency_or_cop: number;
    requires_carnot_check: boolean;
    work_input_w: number;
    external_heat_input_w: number;
    storage_drawdown_w: number;
    research_required: boolean;
}
export interface RunPacketInput {
    packet_id: string;
    scenario_id: string;
    aggregation: ScenarioAggregationInput;
    radiator: RadiatorSizingInput;
    branches: BranchInput[];
    research_required_items: string[];
    has_speculative_device: boolean;
    has_speculative_material: boolean;
    has_solar_polish_without_source: boolean;
    has_per_subsystem_duty_simplification: boolean;
    extension_3a_input?: Extension3AInput;
}
export interface RunPacketOutput {
    packet_id: string;
    scenario_id: string;
    aggregation_result: ReturnType<typeof aggregateScenario>;
    radiator_result: ReturnType<typeof radiatorEffectiveArea>;
    branch_validations: Array<{
        branch_id: string;
        valid: boolean;
        message?: string;
    }>;
    validation: ValidationResult;
    transform_trace: string[];
    runtime_authority_declaration: "runtime";
    versions: typeof RUNTIME_VERSIONS;
    extension_3a_result?: Extension3AResult;
}
/**
 * Execute a run packet through all runtime steps per spec §27.
 */
export declare function executeRunPacket(input: RunPacketInput): RunPacketOutput;
//# sourceMappingURL=run-packet.d.ts.map