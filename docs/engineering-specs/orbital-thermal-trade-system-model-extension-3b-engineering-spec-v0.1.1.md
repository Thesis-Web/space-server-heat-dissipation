# Orbital Thermal Trade System Model Extension 3B Engineering Spec v0.1.0

## 1. Document Control

- Document Type: Engineering Spec
- Project: space-server-heat-dissipation
- Version: v0.1.0
- Status: Draft for owner approval
- Owner: James
- Derived from:
  - `docs/blueprints/orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.0.md`

### 1.1 Weight statement

This spec is implementation law for Extension 3B only to the extent it remains consistent with the 3B blueprint. If any conflict exists, the blueprint wins.

### 1.2 Purpose

This spec converts the 3B blueprint into deterministic implementation law with explicit:

- schema placement
- variable definitions
- units
- ranges
- defaults
- enum families
- effective-value resolution order
- validation rules
- core equations
- pseudocode
- additive result structure
- file targeting
- build stop conditions

## 2. Repo-state ground truth snapshot for this authoring pass

The uploaded repo snapshot contains the following relevant actual-tree families:

### 2.1 Runtime tree

- `runtime/constants/constants.ts`
- `runtime/formulas/exergy.ts`
- `runtime/formulas/heat-exchanger.ts`
- `runtime/formulas/heat-pump.ts`
- `runtime/formulas/heat-transport.ts`
- `runtime/formulas/loads.ts`
- `runtime/formulas/power-cycle.ts`
- `runtime/formulas/radiation.ts`
- `runtime/formulas/resistance-chain.ts`
- `runtime/formulas/storage.ts`
- `runtime/transforms/catalog-resolution.ts`
- `runtime/transforms/default-expander.ts`
- `runtime/transforms/extension-2-normalizer.ts`
- `runtime/transforms/extension-3a-normalizer.ts`
- `runtime/transforms/load-state-resolver.ts`
- `runtime/transforms/payload-aggregation.ts`
- `runtime/transforms/scenario-aggregation.ts`
- `runtime/transforms/scenario-aggregator.ts`
- `runtime/transforms/unit-normalizer.ts`
- `runtime/validators/bounds.ts`
- `runtime/validators/cross-reference.ts`
- `runtime/validators/extension-2-bounds.ts`
- `runtime/validators/extension-3a-bounds.ts`
- `runtime/validators/operating-mode.ts`
- `runtime/validators/schema.ts`
- `runtime/validators/topology.ts`
- `runtime/validators/units.ts`
- `runtime/runner/run-comparison.ts`
- `runtime/runner/run-extension-2.ts`
- `runtime/runner/run-extension-3a.ts`
- `runtime/runner/run-h200-baseline.ts`
- `runtime/runner/run-packet.ts`
- `runtime/runner/run-scenario.ts`
- `runtime/emitters/comparison-emitter.ts`
- `runtime/emitters/flag-emitter.ts`
- `runtime/emitters/json-emitter.ts`
- `runtime/emitters/markdown-emitter.ts`
- `runtime/emitters/packet-metadata-emitter.ts`
- `runtime/emitters/topology-report.ts`

### 2.2 Schema tree

Actual schema roots present in the repo snapshot include:

- `schemas/thermal-zone/thermal-zone.schema.json`
- `schemas/working-fluid/working-fluid.schema.json`
- `schemas/scenario/scenario.schema.json`
- `schemas/radiator/radiator.schema.json`
- `schemas/conversion-branch/conversion-branch.schema.json`
- `schemas/run-packet/run-packet.schema.json`
- catalog schema roots under `schemas/catalogs/`

### 2.3 UI tree

Actual UI tree includes:

- `ui/app/index.html`
- `ui/app/app.js`
- `ui/app/state-compiler.js`
- `ui/app/catalog-loader.js`
- existing catalog files under `ui/app/catalogs/`

### 2.4 Ground-truth rule

All file tables below are intended targets. The actual repo inventory above is ground truth. If implementation finds a mismatch between table intent and tree truth, the builder must stop and log a DIFF before proceeding.

## 3. Extension 3B implementation posture

### 3.1 Additive-only law

3B is additive. It may:

- patch existing schemas
- add new nested sub-objects inside existing schemas
- add new runtime formula modules
- add a new 3B runner
- add new catalog files

3B may not:

- replace the baseline runner family
- replace 3A result authority
- invent a second topology graph
- mutate baseline or 3A result objects

### 3.2 Best-solve object placement

Because the current repo lacks standalone loop, transport implementation, and operating-state schema families, 3B places new object homes as nested objects:

- `thermal_zone.vault_gas_environment_model`
- `thermal_zone.transport_implementation`
- `thermal_zone.loop_model`
- `scenario.operating_state`

This is a logged best-solve and is not a silent architecture change.

## 4. Required new and patched files

### 4.1 Schema files

#### Patch

- `schemas/thermal-zone/thermal-zone.schema.json`
- `schemas/working-fluid/working-fluid.schema.json`
- `schemas/scenario/scenario.schema.json`
- `schemas/conversion-branch/conversion-branch.schema.json`
- `schemas/run-packet/run-packet.schema.json`

#### New catalog schemas

- `schemas/catalogs/vault-gas-environment-preset-catalog.schema.json`
- `schemas/catalogs/transport-implementation-preset-catalog.schema.json`
- `schemas/catalogs/eclipse-state-preset-catalog.schema.json`

### 4.2 Runtime files

#### New

- `runtime/formulas/vault-gas-environment.ts`
- `runtime/formulas/loop-parasitics.ts`
- `runtime/formulas/gas-management.ts`
- `runtime/transforms/extension-3b-normalizer.ts`
- `runtime/validators/extension-3b-bounds.ts`
- `runtime/runner/run-extension-3b.ts`

#### Patch

- `runtime/formulas/resistance-chain.ts`
- `runtime/formulas/heat-transport.ts`
- `runtime/transforms/catalog-resolution.ts`
- `runtime/transforms/default-expander.ts`
- `runtime/validators/cross-reference.ts`
- `runtime/validators/operating-mode.ts`
- `runtime/runner/run-packet.ts`
- `runtime/emitters/flag-emitter.ts`
- `runtime/emitters/packet-metadata-emitter.ts`
- `tools/conformance/lint-schemas.mjs`

### 4.3 UI files

#### New catalogs

- `ui/app/catalogs/vault-gas-environment-presets.v0.1.0.json`
- `ui/app/catalogs/transport-implementation-presets.v0.1.0.json`
- `ui/app/catalogs/eclipse-state-presets.v0.1.0.json`

#### Patch

- `ui/app/app.js`
- `ui/app/state-compiler.js`
- `ui/app/catalog-loader.js`

### 4.4 No-delete statement

No file is deleted by 3B in this spec.

## 5. Scenario-level additions

### 5.1 Required new scenario fields

Patch `schemas/scenario/scenario.schema.json` with the following 3B fields:

| Field | Type | Required | Default | Notes |
|---|---|---:|---:|---|
| `enable_model_extension_3b` | boolean | no | `false` | 3B enable gate |
| `model_extension_3b_mode` | enum | no | `disabled` | 3B mode |
| `operating_state` | object \| null | no | `null` | single canonical eclipse-state authority |
| `extension_3b_catalog_versions` | object \| null | no | `null` | mirrored to run packet |

### 5.2 `model_extension_3b_mode` enum

Allowed values:

- `disabled`
- `subsystem_depth_only`
- `subsystem_depth_with_eclipse`
- `full_3b`

### 5.3 `operating_state` object

`operating_state` shall have:

| Field | Type | Units | Allowed range / enum | Default |
|---|---|---|---|---|
| `current_state` | string | n/a | `sunlit`, `eclipse`, `custom` | `sunlit` |
| `state_resolution_mode` | string | n/a | `explicit`, `preset`, `custom` | `explicit` |
| `preset_id` | string \| null | n/a | any catalog ID | `null` |
| `preset_version` | string \| null | n/a | version string | `null` |
| `storage_support_enabled` | boolean | n/a | boolean | `false` |
| `storage_ref` | string \| null | n/a | schema ref | `null` |
| `compute_derate_fraction` | number | fraction | `[0,1]` | `0` |
| `noncritical_branch_disable_refs` | string[] | n/a | branch ids | `[]` |
| `notes` | string | n/a | any | `""` |

### 5.4 Operating-state resolution order

1. If 3B disabled: ignore all 3B operating-state fields
2. If `operating_state.current_state` is declared: use it
3. Else if `operating_state.preset_id` is declared: resolve preset and use explicit values
4. Else: block if 3B mode requires eclipse semantics and state cannot be resolved

## 6. Thermal-zone additions

Patch `schemas/thermal-zone/thermal-zone.schema.json` with the following nested 3B objects:

- `vault_gas_environment_model`
- `transport_implementation`
- `loop_model`

### 6.1 `vault_gas_environment_model` object

| Field | Type | Units | Allowed range / enum | Default |
|---|---|---|---|---|
| `mode` | string | n/a | `none`, `preset`, `custom` | `none` |
| `preset_id` | string \| null | n/a | any catalog ID | `null` |
| `preset_version` | string \| null | n/a | version string | `null` |
| `gas_presence_mode` | string | n/a | `none`, `trace_fill`, `pressurized`, `custom` | `none` |
| `gas_species_ref` | string \| null | n/a | working-fluid ID or null | `null` |
| `pressure_pa` | number \| null | Pa | `>= 0` | `null` |
| `convection_assumption_mode` | string | n/a | `disabled`, `operator_fixed_h`, `preset_fixed_h`, `custom` | `disabled` |
| `effective_h_internal_w_per_m2_k` | number \| null | W/m²-K | `>= 0` | `null` |
| `exchange_area_m2` | number \| null | m² | `> 0` | `null` |
| `contamination_outgassing_mode` | string | n/a | `none`, `nominal_clean`, `elevated_unknown`, `custom` | `none` |
| `manual_override_fields` | string[] | n/a | field names | `[]` |
| `notes` | string | n/a | any | `""` |

#### 6.1.1 Convection authority rule

3B does not authorize silent convection inference. `effective_h_internal_w_per_m2_k` must be explicit after preset or custom resolution. If mode is not `none` and `exchange_area_m2` is missing while convection is enabled, validation blocks.

### 6.2 `transport_implementation` object

| Field | Type | Units | Allowed range / enum | Default |
|---|---|---|---|---|
| `mode` | string | n/a | `none`, `preset`, `custom` | `none` |
| `preset_id` | string \| null | n/a | any catalog ID | `null` |
| `preset_version` | string \| null | n/a | version string | `null` |
| `transport_class` | string | n/a | `passive`, `pumped_single_phase_liquid`, `pumped_gas`, `two_phase_managed`, `custom` | `passive` |
| `pump_model_mode` | string | n/a | `none`, `direct_power`, `pressure_drop_flow`, `preset`, `custom` | `none` |
| `pump_power_input_w` | number \| null | W | `>= 0` | `null` |
| `pump_efficiency_fraction` | number \| null | fraction | `(0,1]` | `null` |
| `pressure_drop_pa` | number \| null | Pa | `>= 0` | `null` |
| `mass_flow_kg_per_s` | number \| null | kg/s | `>= 0` | `null` |
| `fluid_density_kg_per_m3_override` | number \| null | kg/m³ | `> 0` | `null` |
| `gas_management_mode` | string | n/a | `not_applicable`, `single_phase_intended`, `gas_managed`, `custom` | `not_applicable` |
| `allowable_void_fraction` | number \| null | fraction | `[0,1]` | `null` |
| `declared_void_fraction` | number \| null | fraction | `[0,1]` | `null` |
| `bubble_blanketing_penalty_fraction` | number \| null | fraction | `[0,1]` | `null` |
| `gas_lock_flow_derate_fraction` | number \| null | fraction | `[0,1]` | `null` |
| `separator_type` | string | n/a | `none`, `membrane`, `vortex`, `capillary_trap`, `reservoir`, `custom` | `none` |
| `notes` | string | n/a | any | `""` |

#### 6.2.1 Pump numeric ownership rule

If `pump_model_mode=direct_power`, `pump_power_input_w` is the primitive numeric owner.

If `pump_model_mode=pressure_drop_flow`, primitive numeric ownership is the tuple:

- `pressure_drop_pa`
- `mass_flow_kg_per_s`
- `pump_efficiency_fraction`
- resolved density

Loop objects may aggregate the resulting power, but must not override these primitives.

### 6.3 `loop_model` object

| Field | Type | Units | Allowed range / enum | Default |
|---|---|---|---|---|
| `loop_id` | string \| null | n/a | any | `null` |
| `upstream_loop_ref` | string \| null | n/a | any | `null` |
| `downstream_loop_ref` | string \| null | n/a | any | `null` |
| `derived_total_parasitic_w` | number \| null | W | `>= 0` | `null` |
| `derived_effective_loop_resistance_addition_k_per_w` | number \| null | K/W | `>= 0` | `null` |
| `notes` | string | n/a | any | `""` |

`loop_model` is an aggregation object only. Primitive pump ownership must not move here.

## 7. Working-fluid additions

Patch `schemas/working-fluid/working-fluid.schema.json` with bounded intrinsic fields only. 3B may add:

| Field | Type | Units | Allowed range | Default | Purpose |
|---|---|---|---|---|---|
| `dielectric_relevance` | string | n/a | `not_applicable`, `low`, `moderate`, `high`, `custom` | `not_applicable` | bubble + electrical risk interpretation |
| `microgravity_gas_management_notes` | string | n/a | any | `""` | descriptive only |

3B shall reuse the existing canonical working-fluid density and heat-capacity fields already present in the repo schema family. 3B shall not add duplicate nominal-density or nominal-cp fields, and shall not add pump identity, separator identity, or loop ownership to working-fluid objects.

## 8. Conversion-branch additions for TEG boundedness

Patch `schemas/conversion-branch/conversion-branch.schema.json` with:

| Field | Type | Units | Range | Default |
|---|---|---|---|---|
| `teg_carnot_fraction_cap` | number \| null | fraction | `(0,1]` | `0.20` |
| `teg_residual_heat_on_node` | boolean \| null | n/a | boolean | `true` |
| `teg_subordinate_to_rejection` | boolean \| null | n/a | boolean | `true` |

### 8.1 TEG heuristic declaration

`teg_carnot_fraction_cap=0.20` is a conservative model heuristic, not a flight-certainty claim. It exists to prevent optimistic branch declarations from silently erasing downstream reject burden.

## 9. Run-packet additions

Patch `schemas/run-packet/run-packet.schema.json` with:

| Field | Type | Default | Purpose |
|---|---|---:|---|
| `enable_model_extension_3b` | boolean | `false` | mirrored scenario gate |
| `model_extension_3b_mode` | string | `disabled` | mirrored scenario mode |
| `extension_3b_catalog_versions` | object \| null | `null` | preset catalog provenance |
| `extension_3b_result` | object \| null | `null` | additive structured result |

## 10. Preset catalog contracts

### 10.1 Vault gas environment preset catalog

Each preset entry must contain only explicit canonical fields. Minimum fields:

- `preset_id`
- `preset_version`
- `label`
- `gas_presence_mode`
- `gas_species_ref`
- `pressure_pa`
- `convection_assumption_mode`
- `effective_h_internal_w_per_m2_k`
- `exchange_area_m2`
- `contamination_outgassing_mode`
- `notes`

### 10.2 Transport implementation preset catalog

Minimum fields:

- `preset_id`
- `preset_version`
- `label`
- `transport_class`
- `pump_model_mode`
- one explicit numeric ownership set
- `gas_management_mode`
- `allowable_void_fraction`
- `bubble_blanketing_penalty_fraction`
- `gas_lock_flow_derate_fraction`
- `separator_type`
- `notes`

### 10.3 Eclipse-state preset catalog

Minimum fields:

- `preset_id`
- `preset_version`
- `label`
- `current_state`
- `storage_support_enabled`
- `compute_derate_fraction`
- `noncritical_branch_disable_refs`
- `notes`

### 10.4 Catalog lint-map and schema-gate requirement

All three new 3B catalog data files shall be added to the canonical schema-lint or conformance map used by `tools/conformance/lint-schemas.mjs`. A 3B catalog file may not exist in the repo while remaining outside that gate.

### 10.5 Preset metadata emission requirement

Resolved 3B preset IDs, preset versions, and catalog-version lineage shall be emitted through the canonical packet-metadata emitter path in addition to being present on `extension_3b_result.preset_provenance`.

## 11. Core equations

### 11.1 Vault gas resistance addition

If `vault_gas_environment_model.mode=none` or `convection_assumption_mode=disabled`:

- `r_vault_gas_environment_k_per_w = 0`

Else:

- `r_vault_gas_environment_k_per_w = 1 / (h_internal * A_exchange)`

Where:

- `h_internal = effective_h_internal_w_per_m2_k`
- `A_exchange = exchange_area_m2`

Constraints:

- if `h_internal <= 0` and convection is enabled: block
- if `A_exchange <= 0` and convection is enabled: block

### 11.2 Pump parasitic from direct-power ownership

If `pump_model_mode=direct_power`:

- `w_dot_pump_w = pump_power_input_w`

### 11.3 Pump parasitic from pressure-drop ownership

If `pump_model_mode=pressure_drop_flow`:

- `v_dot_m3_per_s = m_dot / rho`
- `w_dot_ideal = delta_p * v_dot`
- `w_dot_pump_w = w_dot_ideal / eta_pump`

Expanded:

- `m_dot = mass_flow_kg_per_s`
- `rho = resolved_density_kg_per_m3`
- `delta_p = pressure_drop_pa`
- `eta_pump = pump_efficiency_fraction`

Validation:

- `rho > 0`
- `eta_pump > 0`
- if any primitive field missing: block

### 11.4 Bubble resistance addition

3B does not infer multiphase correlation coefficients silently. It uses explicit bounded penalty fractions.

If `declared_void_fraction = 0` or `gas_management_mode=not_applicable`:

- `r_bubble_penalty_k_per_w = 0`

Else:

- `r_bubble_penalty_k_per_w = r_loop_to_sink_base * bubble_blanketing_penalty_fraction`

Where `bubble_blanketing_penalty_fraction` is explicit after preset/custom resolution and must satisfy `0 <= bubble_blanketing_penalty_fraction <= 1`. Because the field carries fraction semantics in its canonical name, values above `1.0` are invalid and block.

### 11.5 Flow derate and risk flags

If `declared_void_fraction > allowable_void_fraction`:

- emit blocking error when policy is strict
- else emit warning

Derived flow-availability fraction:

- `flow_availability_fraction = 1 - gas_lock_flow_derate_fraction`

### 11.6 Effective 3B loop resistance

Let:

- `r_loop_to_sink_base` = existing 3A `r_loop_to_sink_k_per_w`
- `r_vault` = 3B vault gas addition
- `r_bubble` = 3B bubble addition

Then:

- `r_loop_to_sink_effective_3b = r_loop_to_sink_base + r_vault + r_bubble`

3B must report the additive components separately. It must not overwrite stored 3A base terms.

### 11.7 Total rejected heat with pump and TEG bookkeeping

Let:

- `q_dot_base_reject_w` = baseline or 3A reject burden entering 3B
- `w_dot_pump_total_w` = total transport parasitic power added on-node
- `q_dot_teg_input_w` = heat entering TEG branch
- `p_dot_teg_electrical_w` = TEG electrical output
- `q_dot_teg_residual_w = q_dot_teg_input_w - p_dot_teg_electrical_w`

If TEG residual is on-node:

- `q_dot_total_reject_3b_w = q_dot_base_reject_w + w_dot_pump_total_w + q_dot_teg_residual_w`

If no active TEG:

- `q_dot_total_reject_3b_w = q_dot_base_reject_w + w_dot_pump_total_w`

### 11.8 TEG bounded electrical output

For branch type `teg`:

- `eta_carnot = 1 - (T_cold / T_hot)`
- `eta_teg_cap = min(eta_declared, eta_carnot, teg_carnot_fraction_cap)`
- `p_dot_teg_electrical_w = q_dot_teg_input_w * eta_teg_cap`

Validation:

- if `T_hot <= T_cold`: block
- if `eta_declared > eta_carnot`: warning or block per existing Carnot policy
- if `teg_residual_heat_on_node=true`, residual stays in reject bookkeeping

### 11.9 Eclipse-state downstream effects

If `operating_state.current_state = eclipse`:

- solar-dependent source terms are suppressed if and only if they are declared solar-dependent
- storage drawdown is allowed only if `storage_support_enabled=true` and `storage_ref` resolves
- any branch in `noncritical_branch_disable_refs` is marked disabled for the 3B run view
- compute derate is applied as:
  - `q_dot_compute_effective_w = q_dot_compute_nominal_w * (1 - compute_derate_fraction)`

3B reports these as state effects. It does not mutate the original baseline or 3A inputs in-place.


### 11.10 Canonical property-source resolution

For 3B transport calculations, the property-source order is:

1. `transport_implementation.fluid_density_kg_per_m3_override` when present
2. existing canonical working-fluid density field in the current repo schema family
3. block if density is required and unresolved

Heat-capacity terms used by any additive 3B transport logic shall resolve from the existing canonical working-fluid heat-capacity field family already present in the repo schema. 3B does not create a duplicate cp field.

## 12. Effective-value resolution order

### 12.1 Vault gas environment

1. If `mode=none`: all 3B gas-environment numeric additions resolve to zero
2. If `mode=preset`: load preset values into explicit fields
3. Apply manual overrides listed by actual field value presence
4. Validate explicit fields
5. Compute derived resistance addition

### 12.2 Transport implementation

1. If `mode=none`: resolve transport parasitic to zero and gas-management to `not_applicable`
2. If `mode=preset`: load preset values into explicit fields
3. Apply manual overrides
4. Resolve density from `fluid_density_kg_per_m3_override` first, else from the existing canonical working-fluid density field family already present in the repo schema
5. Resolve pump parasitic from primitive owner set
6. Resolve gas-management penalties and risk flags

### 12.3 Operating state

1. Explicit `current_state`
2. Preset-loaded `current_state`
3. Block if unresolved and 3B mode requires eclipse semantics

## 12A. Default expansion requirements

`runtime/transforms/default-expander.ts` shall be patched so every new optional 3B field is injected deterministically before schema and bounds validation. At minimum, default expansion shall cover:

- scenario-level: `enable_model_extension_3b`, `model_extension_3b_mode`, `operating_state`, `extension_3b_catalog_versions`
- thermal-zone level: `vault_gas_environment_model`, `transport_implementation`, `loop_model`
- conversion-branch level: `teg_carnot_fraction_cap`, `teg_residual_heat_on_node`, `teg_subordinate_to_rejection`
- run-packet level: `enable_model_extension_3b`, `model_extension_3b_mode`, `extension_3b_catalog_versions`, `extension_3b_result`

If a parent 3B object is absent, the default expander shall materialize the object with the exact field defaults defined in this spec rather than leaving sparse undefined state for later validators.

## 13. Validation rules and errors

### 13.1 Scenario-level blocking rules

- `enable_model_extension_3b=true` requires `model_extension_3b_mode != disabled`
- `subsystem_depth_with_eclipse` or `full_3b` requires resolvable `operating_state`
- `operating_state.storage_support_enabled=true` requires resolvable `storage_ref`

### 13.2 Vault-gas blocking rules

- convection enabled with missing `effective_h_internal_w_per_m2_k`
- convection enabled with missing `exchange_area_m2`
- `pressure_pa < 0`
- `gas_species_ref` unresolved when gas is declared present

### 13.3 Transport blocking rules

- `pump_model_mode=direct_power` with missing `pump_power_input_w`
- `pump_model_mode=pressure_drop_flow` with missing one or more primitive fields
- `declared_void_fraction > allowable_void_fraction` when `gas_management_mode=single_phase_intended`
- negative or out-of-range penalty fractions

### 13.4 TEG blocking rules

- TEG branch marked subordinate false
- TEG branch residual heat configured off-node without declared carrier branch
- TEG efficiency cap field outside `(0,1]`

### 13.5 Eclipse blocking rules

- eclipse state active with unresolved storage support ref when storage support enabled
- eclipse state active with derate fraction outside `[0,1]`

## 14. Required additive result structure

`extension_3b_result` shall contain at minimum:

| Field | Type | Notes |
|---|---|---|
| `extension_3b_enabled` | boolean | gate mirror |
| `model_extension_3b_mode` | string | mode mirror |
| `spec_version` | string | spec version |
| `blueprint_version` | string | blueprint version |
| `vault_gas_environment_results` | array | per-zone resolved gas model outputs |
| `transport_parasitic_results` | array | per-zone primitive and derived pump outputs |
| `gas_management_results` | array | per-zone void, penalties, and flags |
| `loop_resistance_adjustments` | array | per-zone additive resistance components |
| `teg_bounded_results` | array | per-branch bounded TEG outputs |
| `operating_state_effects` | object | eclipse or sunlit downstream effects |
| `q_dot_total_reject_3b_w` | number \| null | total 3B reject burden |
| `preset_provenance` | array | all preset loads and overrides |
| `blocking_errors` | string[] | hard-stop list |
| `warnings` | string[] | non-blocking issues |
| `transform_trace` | string[] | deterministic trace |

3B result shall not contain embedded copies of baseline or 3A result objects.

### 14.1 Deterministic disabled-result shape

If 3B is disabled at scenario gate, `extension_3b_result` shall still be emitted with this deterministic minimum shape:

- `extension_3b_enabled=false`
- `model_extension_3b_mode="disabled"`
- `vault_gas_environment_results=[]`
- `transport_parasitic_results=[]`
- `gas_management_results=[]`
- `loop_resistance_adjustments=[]`
- `teg_bounded_results=[]`
- `operating_state_effects={"state":"disabled","applied":false}`
- `q_dot_total_reject_3b_w=null`
- `preset_provenance=[]`
- `blocking_errors=[]`
- `warnings=[]`
- `transform_trace` includes `"extension_3b_disabled"`

### 14.2 Deterministic no-effect subsystem shape

If 3B is enabled but a subsystem resolves to a no-effect path such as `vault_gas_environment_model.mode=none`, `transport_implementation.mode=none`, or no applicable TEG branch, the subsystem result entry shall still be emitted with explicit zero or null derived values plus a reason code of `"not_applicable"` or `"mode_none"` as appropriate. The implementation may not omit the entry and may not invent an ad hoc bypass payload shape.

## 14A. TypeScript interface contract

The builder shall implement an explicit 3B input interface rather than inferring shape from pseudocode alone. Minimum contract:

```ts
export interface Extension3BInput {
  scenario: Scenario;
  catalogs: {
    vaultGasEnvironmentPresets: VaultGasEnvironmentPresetCatalog;
    transportImplementationPresets: TransportImplementationPresetCatalog;
    eclipseStatePresets: EclipseStatePresetCatalog;
  };
  baselineOr3AContext: {
    extension3AResult?: Extension3AResult | null;
    radiatorResult?: RadiatorResult | null;
    aggregationResult?: AggregationResult | null;
  };
}
```

Implementation may refine imported type names to match the repo, but it may not remove any of the three top-level groups above or infer them implicitly.

## 15. Pseudocode

### 15.1 Normalization flow

```text
function normalizeExtension3B(scenario, catalogs):
  if scenario.enable_model_extension_3b != true:
    return deterministic disabled result

  resolve scenario.operating_state by explicit fields then preset
  for each thermal_zone:
    resolve vault_gas_environment_model
    resolve transport_implementation
    resolve loop_model
  resolve TEG branch caps
  return normalized 3B inputs + trace
```

### 15.2 Execution flow

```text
function runExtension3B(input, baseline_or_3a_context):
  norm = normalizeExtension3B(input.scenario, input.catalogs)
  if norm.disabled:
    return deterministic disabled result

  validate scenario-level rules
  for each zone:
    validate vault gas object
    validate transport object
    validate gas-management object

    r_vault = computeVaultGasResistance(...)
    w_pump = computePumpParasitic(...)
    r_bubble = computeBubblePenalty(...)

    r_effective = r_loop_to_sink_base + r_vault + r_bubble
    accumulate zone outputs
    accumulate on-node parasitic heat

  for each TEG branch:
    compute bounded electrical output
    accumulate residual heat

  apply operating_state effects
  compute q_dot_total_reject_3b_w
  emit additive result
```

### 15.3 Run-packet dispatcher patch

```text
function executeRunPacket(input):
  run baseline path
  if extension_3a_input present:
    extension_3a_result = runExtension3A(...)
  if extension_3b_input present:
    extension_3b_result = runExtension3B(
      scenario=input.extension_3b_input.scenario,
      catalogs=input.extension_3b_input.catalogs,
      baseline_or_3a_context={
        extension_3a_result,
        radiator_result,
        aggregation_result
      }
    )
  attach extension_3b_result under its own key only
```

## 16. UI compilation law

### 16.1 State compiler requirements

`ui/app/state-compiler.js` must emit 3B fields into canonical payload objects only. No browser-only hidden 3B state is permitted.

### 16.2 Required visible editability

If the UI applies a preset, the generated scenario or thermal-zone object must still contain the explicit loaded values, and the visible form must continue to display them.

### 16.3 Preset provenance fields

The compiled payload or run packet must carry:

- preset catalog ID
- preset entry ID
- preset version
- list of manually overridden fields

## 17. Test posture

Minimum 3B test coverage shall include:

- vault gas environment preset load + manual override
- pump direct-power ownership
- pump pressure-drop ownership
- liquid-loop single-phase intended with declared void fraction > allowable
- bubble-risk additive resistance penalty
- TEG boundedness with residual heat on-node
- eclipse-state storage drawdown gating
- additive run-packet dispatch ordering baseline → 3A → 3B

## 18. Stop conditions for the build agent

The build agent must stop and log a DIFF before proceeding if:

- a file named here already exists where the spec declares it new
- a patched file named here does not exist in the actual repo tree
- a required preset catalog cannot be loaded or versioned
- any 3B field lacks an explicit schema home
- any implementation attempts to write into baseline or `extension_3a_result`

## 19. Engineering-spec completion statement

This spec completes the implementation law for Extension 3B as derived from the 3B blueprint. Any unresolved hole discovered during implementation shall fall back to the blueprint and be logged before build continuation.

