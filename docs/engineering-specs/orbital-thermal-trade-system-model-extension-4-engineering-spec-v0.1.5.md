# File: docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md

## 1. Document Control

| Field | Value |
|---|---|
| Document | Orbital Thermal Trade System Model Extension 4 Engineering Spec |
| Volume | v0.1.4 |
| Status | canonical engineering spec |
| Scope | Extension 4 only |
| Extension name | TPV Cells on Radiator Surface (Photon Recapture Loop) |
| Canonical filename | `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md` |
| Governing intake basis | `docs/cut-lists/extension-4-tpv-isolated-cut-list-v0.1.1.md` |
| Governing relation | If the paired Extension 4 blueprint differs from this spec, the blueprint wins. |
| Build intent | Deterministic additive extension with explicit enable gate and isolated result object |

### 1.1 Version Delta

| Version | Changes |
|---|---|
| v0.1.0 | First candidate. 22 audited defects. |
| v0.1.1 | Fixed 21 of 22 defects: doc files in required list, repo-truth field mapping (§10), state-compiler.js requirement, `blocking_on_nonconvergence` in input contract, defective compressed summary law removed, version constants, disabled/invalid/one-pass result shapes, `iteration_history` rules, `q_tpv_separate_cooling_load_w` in history entry, JSON Schema conditional, `types/extension-4.d.ts`, zero-intercept/zero-efficiency flag IDs, `Q_base_ref` symbol. Introduced energy-accounting test case 2 error. |
| v0.1.2 | Fixed 4 remaining: case 2 corrected to −P_elec, case 4 zero-relief case added, ε_rad EOL formula pinned, state-compilation test file added to §4.2. Left §20.7 assertions and §1.1 version delta unwritten; bumped authority and intake references to unconfirmed versions. |
| v0.1.3 | Added §20.7 state-compilation test assertions, corrected §1.1 version delta, rolled authority and intake references back to confirmed-existing versions. Left status language contradictory, radiator-object selection law absent, `extension_4_catalog_versions` operationally unbounded, one-pass-without-3A flag underspecified, `Q_base_ref ≤ 0` guard absent. |
| v0.1.4 | This document. Corrects status to canonical. Adds radiator-object selection law (§10.1). Declares `extension_4_catalog_versions` as pass-through provenance with zero numeric authority (§6.2, §7.3). Adds `EXT4-INFO-ONEPASS-NO-3A` flag (§8.4, §13.5, §18.3). Adds `Q_base_ref ≤ 0` guard and `EXT4-WARN-ZERO-BASE-REF` flag (§9.14, §18.3). Adds nullability summary (§16.6). Adds `types/extension-4.d.ts` stricter-interface mandate (§14.5). |

### 1.2 Purpose

Extension 4 adds a bounded exploratory radiator-coupled TPV recapture model that:

1. remains off by default,
2. never eliminates the radiator,
3. never silently shrinks radiator burden without declared exported-power semantics,
4. inherits convergence authority from Extension 3A,
5. remains structurally isolated from Extension 3B branch authority and Extension 3C metadata authority,
6. emits its own additive result block under `extension_4_result`, and
7. supports both one-pass and iterative TPV recapture analysis modes.

## 2. Scope

### 2.1 In Scope

- explicit enable gate,
- explicit mode selection,
- explicit TPV configuration object,
- one-pass analytical mode,
- iterative analytical mode,
- deterministic exported-power accounting,
- deterministic onboard-return-heat accounting,
- deterministic cell-loss accounting,
- additive result emission,
- additive flags/reporting/UI,
- isolated tests,
- bounded cohabitation with Extension 3A and packet/report/UI infrastructure.

### 2.2 Out of Scope

No flight-qualified TPV claims, full spectral transport, time propagation, storage/battery accumulation, bus optimization, 3B ownership transfer, 3C runtime authority, or overwrite of prior result objects.

### 2.3 Exploratory Authority Statement

Extension 4 is an exploratory-option subsystem inside the model law. It quantifies what a plausible recapture branch would do under explicit assumptions. It does not claim validated flight reality.

## 3. Non-Negotiable Rules

1. TPV does not eliminate the radiator.
2. Durable relief is bounded by exported energy beyond the modeled thermal boundary.
3. Disabled means zero numeric authority.
4. Attachment is additive only under `extension_4_result`.
5. TPV uses a separate authority family, not generic 3B ownership.
6. 3A remains the convergence authority.
7. Supported modes are exactly `disabled`, `one_pass`, `iterative`.
8. Disabled state still emits deterministic minimum result shape.
9. Accounting order is mandatory.
10. No hidden storage sink exists in v0.1.4.
11. 3C metadata is annotation-only.
12. Repo-truth radiator field mapping is mandatory.
13. UI scenario/run-packet compilation through `ui/app/state-compiler.js` is mandatory.
14. `extension_4_catalog_versions` is pass-through provenance metadata only and SHALL NOT affect numeric runtime behavior.

## 4. Repo-State Ground Truth and Required File Work

### 4.1 Existing Relevant Repo Families

- `runtime/runner/`
- `runtime/transforms/`
- `runtime/formulas/`
- `runtime/validators/`
- `runtime/emitters/`
- `schemas/scenario/`
- `schemas/run-packet/`
- `schemas/radiator/`
- `reference/`
- `types/`
- `ui/app/`
- `docs/blueprints/`
- `docs/engineering-specs/`
- flat logs under `docs/`

### 4.2 Required New Files

#### Docs

- `docs/blueprints/orbital-thermal-trade-system-model-extension-4-blueprint-v0.1.4.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md`

#### Types

- `types/extension-4.d.ts`

#### Runtime

- `runtime/formulas/tpv-recapture.ts`
- `runtime/transforms/extension-4-normalizer.ts`
- `runtime/validators/extension-4-bounds.ts`
- `runtime/runner/run-extension-4.ts`

#### Schemas

- `schemas/tpv-recapture-config/tpv-recapture-config.schema.json`
- `schemas/tpv-recapture-result/tpv-recapture-result.schema.json`

#### Tests

- `reference/extension-4-schema.test.ts`
- `reference/extension-4-energy-accounting.test.ts`
- `reference/extension-4-iteration.test.ts`
- `reference/extension-4-disabled-state.test.ts`
- `reference/extension-4-cohabitation.test.ts`
- `reference/extension-4-output.test.ts`
- `reference/extension-4-state-compilation.test.ts`

### 4.3 Required Patched Files

#### Schemas

- `schemas/scenario/scenario.schema.json`
- `schemas/run-packet/run-packet.schema.json`

#### Runtime

- `runtime/runner/run-packet.ts`
- `runtime/emitters/json-emitter.ts`
- `runtime/emitters/markdown-emitter.ts`
- `runtime/emitters/flag-emitter.ts`
- `runtime/emitters/packet-metadata-emitter.ts`
- `runtime/emitters/topology-report.ts`

#### UI

- `ui/app/app.js`
- `ui/app/state-compiler.js`

### 4.4 No-Delete Statement

No existing file shall be deleted for Extension 4 v0.1.4.

### 4.5 Flat-Doc Log Naming

If authoring/build logs are created:

- `docs/extension-4-authoring-assembly-log-v0.1.4.md`
- `docs/extension-4-drift-review-log-v0.1.4.md`
- `docs/extension-4-build-issue-log-v0.1.4.md`

## 5. Scenario Contract Patch

### 5.1 Required New Scenario Fields

| Field | Type | Required | Default | Meaning |
|---|---|---:|---|---|
| `enable_model_extension_4` | boolean | no | `false` | Extension 4 enable gate |
| `model_extension_4_mode` | string enum | no | `disabled` | Ext4 runtime mode |
| `tpv_recapture_config` | object \| null | no | `null` | Canonical TPV configuration object |
| `extension_4_catalog_versions` | object \| null | no | `null` | Pass-through provenance object; no numeric authority |

### 5.2 `model_extension_4_mode` Enum

Allowed values:

- `disabled`
- `one_pass`
- `iterative`

Rules:

- if `enable_model_extension_4=false`, mode resolves to `disabled`
- if enabled, mode shall not be `disabled`
- `iterative` is canonical when enabled
- `one_pass` is allowed for comparison/testing and emits `EXT4-INFO-ONEPASS`

### 5.3 `tpv_recapture_config` Shape

```ts
interface TpvRecaptureConfig {
  tpv_model_id: string;
  coverage_fraction: number;
  radiator_view_factor_to_tpv: number;
  spectral_capture_fraction: number;
  coupling_derate_fraction: number;
  conversion_efficiency_mode: 'fixed' | 'carnot_bounded';
  eta_tpv_fixed?: number | null;
  eta_tpv_carnot_fraction?: number | null;
  tpv_cold_side_temperature_k?: number | null;
  export_fraction: number;
  onboard_return_heat_fraction: number;
  cell_cooling_mode: 'separate_cooling' | 'returns_to_radiator';
  iteration_report_detail?: 'minimal' | 'full';
  notes?: string[];
}
```

### 5.4 Required Behavior

- enabled ext4 requires present valid config
- iterative mode requires resolvable `convergence_control`
- `fixed` mode requires `eta_tpv_fixed`
- `carnot_bounded` mode requires `eta_tpv_carnot_fraction` and `tpv_cold_side_temperature_k`
- fractions are validated, not silently clamped

## 6. Run-Packet Contract Patch

### 6.1 Required Packet Additions

| Field | Type | Default | Meaning |
|---|---|---|---|
| `enable_model_extension_4` | boolean | `false` | scenario mirror |
| `model_extension_4_mode` | string | `disabled` | scenario mirror |
| `tpv_recapture_config` | object \| null | `null` | normalized effective ext4 config |
| `extension_4_catalog_versions` | object \| null | `null` | pass-through provenance mirror |
| `extension_4_result` | object \| null | `null` | additive structured result |

### 6.2 Packet Object Law

- `extension_4_result` contains only Extension 4 results.
- Prior extension result trees are not copied into `extension_4_result`.
- Normalized ext4 config may expand traceably, but declared values must be preserved.
- `extension_4_catalog_versions` is pass-through provenance metadata only. It SHALL be mirrored without mutation and SHALL NOT affect numeric runtime behavior, convergence logic, or emitted result values.

## 7. New Schema Contracts

### 7.1 `schemas/tpv-recapture-config/tpv-recapture-config.schema.json`

Requirements:

- `type: object`
- `additionalProperties: false`
- required fields:
  - `tpv_model_id`
  - `coverage_fraction`
  - `radiator_view_factor_to_tpv`
  - `spectral_capture_fraction`
  - `coupling_derate_fraction`
  - `conversion_efficiency_mode`
  - `export_fraction`
  - `onboard_return_heat_fraction`
  - `cell_cooling_mode`
- numeric bounds from §12.1
- conditional logic SHALL be expressed explicitly as JSON Schema:

```json
{
  "if": {
    "properties": {
      "conversion_efficiency_mode": { "const": "carnot_bounded" }
    }
  },
  "then": {
    "required": ["eta_tpv_carnot_fraction", "tpv_cold_side_temperature_k"]
  },
  "else": {
    "required": ["eta_tpv_fixed"]
  }
}
```

### 7.2 `schemas/tpv-recapture-result/tpv-recapture-result.schema.json`

This schema validates `extension_4_result` using the canonical emitted shape in §15 and §16 with `additionalProperties: false`.

### 7.3 Patch to `schemas/scenario/scenario.schema.json`

Add `enable_model_extension_4`, `model_extension_4_mode`, `tpv_recapture_config`, and `extension_4_catalog_versions`.

`extension_4_catalog_versions` SHALL be typed as:

```json
{ "type": ["object", "null"], "default": null }
```

No property contract is defined in v0.1.4. This field is pass-through provenance metadata only and SHALL NOT carry numeric authority into the runtime.

> **Shape-looseness acceptance note (§7.3):** The object shape of `extension_4_catalog_versions` is intentionally loose in v0.1.4. This looseness is accepted for this version. Shape tightening is deferred to a future owner-approved revision if reporting needs become concrete. The operative and non-negotiable constraint for v0.1.4 is the pass-through-only, zero-numeric-authority rule stated above. Reporting consistency risk from shape looseness is low; runtime correctness risk is closed by the pass-through declaration.

### 7.4 Patch to `schemas/run-packet/run-packet.schema.json`

Add `enable_model_extension_4`, `model_extension_4_mode`, `tpv_recapture_config`, `extension_4_catalog_versions`, and `extension_4_result`.

## 8. Runtime Input Dependencies and Cohabitation Law

### 8.1 What Extension 4 Reads from Base Runtime

- normalized scenario object
- normalized radiator declarations
- effective run-packet metadata
- flag/report infrastructure
- baseline scenario result context as needed for emitted net comparisons

### 8.2 What Extension 4 Reads from Extension 3A

- `enable_model_extension_3a`
- resolved `convergence_control`
- `extension_3a_result.convergence_status`
- `extension_3a_result.convergence_attempted`
- `extension_3a_result.convergence_iterations`
- `extension_3a_result.t_sink_resolved_k`
- `extension_3a_result.radiator_area_bol_required_m2`
- `extension_3a_result.radiator_area_eol_required_m2`

`radiator_area_delta_m2` is intentionally not read in v0.1.4 because it is unused by the ext4 math.

### 8.3 3A Precondition Law

If mode is `iterative` and 3A is disabled, block with deterministic blocking error `EXT4-ERR-MISSING-3A-AUTHORITY`.

### 8.4 One-Pass Cohabitation Law

If mode is `one_pass` and 3A is disabled, execution is allowed only if a resolved baseline radiator emission basis and sink temperature basis are available from the base path. When execution proceeds without 3A iterative authority, the runner SHALL emit `EXT4-INFO-ONEPASS-NO-3A` as a deterministic informational flag and SHALL record `executed_without_3a_authority=true` in `transform_trace`.

### 8.5 What Extension 4 Reads from Extension 3B

Nothing for numeric authority. Allowed interactions: shared dispatch order, emitters, UI/report visibility, coexistence in final packet. Forbidden: importing 3B conversion-branch law as canonical TPV law.

### 8.6 What Extension 4 Reads from Extension 3C

Annotation only: concept IDs, lineage labels, descriptive report annotation.

## 9. Core Mathematical Definitions

### 9.1 Symbols

| Symbol | Meaning | Units |
|---|---|---|
| `σ` | Stefan-Boltzmann constant | W·m^-2·K^-4 |
| `ε_rad` | effective radiator emissivity | dimensionless |
| `A_rad` | effective emitting radiator area | m^2 |
| `T_rad` | effective radiator hot-side temperature | K |
| `T_space` | background sink temperature basis | K |
| `Q_rad_baseline` | baseline radiator-emitted thermal power basis | W |
| `χ_int` | effective TPV intercepted fraction | dimensionless |
| `Q_tpv_in` | TPV-intercepted thermal power | W |
| `η_tpv` | effective TPV conversion efficiency | dimensionless |
| `P_elec` | TPV electrical output | W |
| `Q_tpv_loss` | TPV local inefficiency heat | W |
| `f_exp` | exported electrical fraction | dimensionless |
| `P_export` | exported electrical power | W |
| `P_onboard` | onboard-used electrical power | W |
| `α_ret` | onboard-used electrical return-to-heat fraction | dimensionless |
| `Q_return` | returned onboard heat | W |
| `Q_rad_net` | net radiator burden after TPV accounting | W |
| `Q_base_ref` | baseline burden used as the 3A reference-area context basis | W |
| `k` | iteration index | integer |

### 9.2 Stefan-Boltzmann Radiator Basis

`Q_rad_baseline = ε_rad * σ * A_rad * (T_rad^4 - T_space^4)`

Rules:

- never negative; if expression yields negative due to invalid input, validation SHALL block
- `T_space` is sourced from the same sink-temperature authority used by 3A where available
- `A_rad`, `T_rad`, `ε_rad`, `T_space` must be resolved from actual repo fields per §10

### 9.3 Effective Intercepted Fraction

`χ_int = coverage_fraction * radiator_view_factor_to_tpv * spectral_capture_fraction * coupling_derate_fraction`

### 9.4 TPV Intercepted Thermal Power

`Q_tpv_in = χ_int * Q_rad_baseline`

### 9.5 Fixed-Efficiency Mode

If `conversion_efficiency_mode='fixed'`:

- `η_tpv = eta_tpv_fixed`
- `P_elec = η_tpv * Q_tpv_in`

### 9.6 Carnot-Bounded Mode

If `conversion_efficiency_mode='carnot_bounded'`:

`η_tpv = eta_tpv_carnot_fraction * max(0, 1 - T_cold / T_rad_eff)`

where:

- `T_cold = tpv_cold_side_temperature_k`
- `T_rad_eff = max(T_rad, T_cold + 1e-9)`

### 9.7 TPV Local Loss Heat

`Q_tpv_loss = Q_tpv_in - P_elec`

### 9.8 Export Split

`P_export = f_exp * P_elec`

### 9.9 Onboard-Use Split

`P_onboard = (1 - f_exp) * P_elec`

### 9.10 Onboard Returned Heat

`Q_return = α_ret * P_onboard`

### 9.11 TPV Local-Loss Booking by Cooling Mode

If `cell_cooling_mode='returns_to_radiator'`:

- `Q_tpv_local_to_radiator = Q_tpv_loss`
- `Q_tpv_separate_cooling_load = 0`

If `cell_cooling_mode='separate_cooling'`:

- `Q_tpv_local_to_radiator = 0`
- `Q_tpv_separate_cooling_load = Q_tpv_loss`

### 9.12 Net Radiator Burden Equation

`Q_rad_net = Q_rad_baseline - P_export + Q_return + Q_tpv_local_to_radiator`

Interpretation:

- exported power leaves the modeled thermal boundary
- onboard-used power returns as heat according to `α_ret`
- TPV inefficiency heat either returns to radiator burden or is booked separately

### 9.13 Radiator Relief Metric

`ΔQ_relief = Q_rad_baseline - Q_rad_net`

Positive means relief. Negative means burden worsened. Extension 4 SHALL never hide negative relief.

### 9.14 Equivalent Radiator Area Metrics

If 3A radiator sizing context is available and `Q_base_ref > 0`, emit equivalent burden-based radiator deltas:

`r_area = Q_rad_net / Q_base_ref`

where `Q_base_ref` SHALL be the same baseline burden basis used for the 3A reference area context.

- `A_equiv_bol = r_area * extension_3a_result.radiator_area_bol_required_m2`
- `A_equiv_eol = r_area * extension_3a_result.radiator_area_eol_required_m2`
- `A_delta_bol = A_equiv_bol - extension_3a_result.radiator_area_bol_required_m2`
- `A_delta_eol = A_equiv_eol - extension_3a_result.radiator_area_eol_required_m2`

Guard rule: if `Q_base_ref <= 0` or is non-finite, all four equivalent area fields SHALL be `null` and `EXT4-WARN-ZERO-BASE-REF` SHALL be emitted. Division shall not be attempted.

No compressed summary law is authorized in v0.1.4. Reporting shall use the full §9.12 accounting.

## 10. Repo-Truth Radiator Field Mapping

### 10.1 Radiator-Object Selection Law

Extension 4 SHALL use the same radiator basis already resolved by the base model runtime for `Q_rad_baseline` computation. It does not perform independent radiator selection from the `radiators` array.

Specifically:

- if the base model uses a single primary radiator object, Extension 4 uses that same object,
- if the base model aggregates across multiple radiator objects to produce a single effective area and temperature basis, Extension 4 uses that same aggregate basis,
- Extension 4 SHALL NOT invent its own radiator selection logic or apply the §10.2 field mapping to a different radiator object than the one the base model resolved.

If the base model's radiator resolution cannot be determined deterministically from the upstream runtime context, stop and log per §21 condition 1.

### 10.2 Field Mapping

The ext4 runner SHALL resolve radiator inputs using these actual repo-truth fields from `schemas/radiator/radiator.schema.json`:

| Ext4 symbol | Primary repo field | Fallback / priority notes |
|---|---|---|
| `T_rad` | `target_surface_temp_k` | required |
| `A_rad` | `effective_area_m2` | if absent, use the same computed-area authority already used by the base path; do not invent ext4-only area |
| `ε_rad` | `surface_emissivity_eol_override` → derived EOL using `surface_emissivity_bol * (1 - emissivity_degradation_fraction)` with clamp into `(0, 1]` → `surface_emissivity_bol` → `emissivity` | use the same EOL derivation formula and priority chain already used by 3A; ext4 SHALL not reimplement a divergent emissivity path |
| `T_space` | `background_sink_temp_k_override` → `extension_3a_result.t_sink_resolved_k` → `sink_temp_k` | `sink_temp_k` baseline fallback only when no stronger authority exists |

Every ext4 run SHALL emit a trace note recording which source path provided each resolved value.

## 11. One-Pass Analytical Mode

### 11.1 Purpose

One-pass mode provides a bounded, non-self-updating estimate using a single baseline radiator state.

### 11.2 Mandatory Sequence

1. resolve baseline radiator basis per §10
2. compute `χ_int`
3. compute `Q_tpv_in`
4. compute `η_tpv`, `P_elec`, `Q_tpv_loss`
5. compute `P_export`, `P_onboard`, `Q_return`
6. compute `Q_rad_net`
7. compute equivalent area metrics if 3A references are available and `Q_base_ref > 0`
8. emit result

### 11.3 One-Pass Output Truth

- `convergence_attempted=false`
- `convergence_iterations=1`
- `convergence_status='not_required'`
- `nonconvergence_blocking_applied=false`
- `iteration_history` absent unless `iteration_report_detail='full'`, in which case it contains exactly one entry

## 12. Iterative Analytical Mode

### 12.1 Purpose

Iterative mode performs a bounded recapture / return-heat / burden-update loop using 3A convergence authority.

### 12.2 Iterative State Variables

At minimum track:

- `Q_rad_net^(0)`
- `Q_rad_basis^(k)`
- `Q_rad_net^(k)`
- `P_elec^(k)`
- `Q_tpv_loss^(k)`
- `Q_return^(k)`
- `η_tpv^(k)` if temperature-dependent
- `T_rad^(k)` if temperature-coupled basis is resolvable

### 12.3 Initial State

- `Q_rad_basis^(0) = Q_rad_baseline`
- `Q_rad_net^(0) = Q_rad_baseline`
- `T_rad^(0) = baseline radiator temperature basis`

`Q_rad_net^(0)` must be preserved for runaway-threshold computation.

### 12.4 Iterative Update Law

For each iteration `k`:

1. compute `χ_int^(k)` from static configuration
2. compute `Q_tpv_in^(k) = χ_int^(k) * Q_rad_basis^(k)`
3. compute `η_tpv^(k)`
   - if `conversion_efficiency_mode='carnot_bounded'`, use `T_rad^(k)` as the `T_rad` input to §9.6
4. compute `P_elec^(k)`, `Q_tpv_loss^(k)`, `P_export^(k)`, `P_onboard^(k)`, `Q_return^(k)`
5. compute `Q_rad_net^(k)` using §9.12
6. set next basis: `Q_rad_basis^(k+1) = Q_rad_net^(k)`
7. if a temperature-coupled mapping exists, update `T_rad^(k+1)` from the same radiator model basis used by the implementation
8. evaluate convergence

### 12.5 Iterative Burden Mapping Rule

v0.1.4 uses burden iteration as the canonical ext4 iterative state. No full geometric radiator redesign occurs inside the ext4 loop.

### 12.6 Convergence Test

Converged when both are true:

- `abs(Q_rad_net^(k) - Q_rad_net^(k-1)) <= tolerance_abs_w`
- `abs(Q_rad_net^(k) - Q_rad_net^(k-1)) / max(abs(Q_rad_net^(k)), 1.0) <= tolerance_rel_fraction`

Clarifying note: `Q_rad_net^(k-1)` is equivalent to `Q_rad_basis^(k)` — the basis value at the start of iteration `k`.

If temperature-dependent efficiency is active and `T_rad` is updated, also require:

- `abs(T_rad^(k) - T_rad^(k-1)) <= 1e-6 K`

### 12.7 Default Convergence Controls

Inherited from 3A. Recommended defaults:

- `max_iterations = 100`
- `tolerance_abs_w = 1.0`
- `tolerance_rel_fraction = 0.001`
- `runaway_multiplier = 4.0`

### 12.8 Runaway Behavior

Runaway if any occur:

- non-finite `Q_rad_net`, `P_elec`, `Q_tpv_loss`, or `η_tpv`
- `abs(Q_rad_net^(k)) > runaway_multiplier * max(abs(Q_rad_net^(0)), 1.0)`
- forbidden negative burden appears
- oscillatory behavior exceeds hard guard without convergence

Example: `Q_rad_net^(0)=1000 W`, `runaway_multiplier=4.0` → `abs(Q_rad_net^(k)) > 4000 W` is runaway.

### 12.9 Non-Convergence Behavior

If max iterations are exhausted without convergence and no runaway:

- `convergence_status='nonconverged'`
- emit last iterate
- emit `EXT4-WARN-NONCONVERGED`
- set `nonconvergence_blocking_applied` according to inherited 3A `blocking_on_nonconvergence`; default `false` if absent and emit trace note

### 12.10 Status Mapping

| Condition | Status |
|---|---|
| disabled | `not_required` |
| one-pass | `not_required` |
| iterative converged | `converged` |
| iterative exhausted max iterations | `nonconverged` |
| iterative runaway / non-finite | `runaway` |
| invalid config / blocked preconditions | `invalid` |

## 13. Bounds, Defaults, and Validation Law

### 13.1 Numeric Bounds

All fractions in `[0,1]`. `tpv_cold_side_temperature_k > 0`.

### 13.2 Best-Solve Defaults for v0.1.4

| Field | Default |
|---|---|
| `coverage_fraction` | `0.10` |
| `radiator_view_factor_to_tpv` | `0.50` |
| `spectral_capture_fraction` | `0.50` |
| `coupling_derate_fraction` | `0.80` |
| `conversion_efficiency_mode` | `fixed` |
| `eta_tpv_fixed` | `0.15` |
| `export_fraction` | `0.00` |
| `onboard_return_heat_fraction` | `1.00` |
| `cell_cooling_mode` | `separate_cooling` |
| `iteration_report_detail` | `minimal` |

### 13.3 Blocking Validation Rules

Block for:

- enabled ext4 with mode `disabled`
- enabled ext4 with missing config
- any invalid bounds
- iterative mode without resolvable convergence-control authority
- `carnot_bounded` without required temperature fields
- missing baseline radiator basis
- impossible negative temperatures
- negative baseline radiator burden

### 13.4 Warning Rules

- one-pass used instead of canonical iterative mode
- zero exported fraction with full onboard return
- separate cooling load emitted but not integrated into broader system cooling path
- equivalent area metrics unavailable because 3A area basis absent or `Q_base_ref <= 0`
- extremely small TPV significance relative to baseline burden

### 13.5 Informational Rules and Stable IDs

- `EXT4-INFO-DISABLED` — disabled state emitted
- `EXT4-INFO-ONEPASS` — one-pass mode used
- `EXT4-INFO-ONEPASS-NO-3A` — one-pass executed without 3A iterative authority
- `EXT4-INFO-ZERO-INTERCEPT` — `χ_int = 0`
- `EXT4-INFO-ZERO-EFFICIENCY` — `η_tpv = 0` or `P_elec = 0`
- annotation from 3C metadata where present

## 14. Required Runtime Modules

### 14.1 `runtime/transforms/extension-4-normalizer.ts`

Responsibilities:

1. resolve enable gate and mode
2. validate presence of config
3. apply explicit allowed defaults
4. emit transform trace
5. return normalized ext4 config
6. declare whether iterative mode requires 3A hard dependency

```ts
interface Extension4NormalizationResult {
  enabled: boolean;
  mode: 'disabled' | 'one_pass' | 'iterative';
  config: TpvRecaptureConfig | null;
  defaults_applied: string[];
  blocking_errors: string[];
  warnings: string[];
  trace: string[];
}
```

### 14.2 `runtime/formulas/tpv-recapture.ts`

Pure functions only:

- `computeInterceptFraction(config)`
- `computeTpvEfficiency(params)`
- `computeTpvElectricalOutput(qIn, eta)`
- `computeTpvLossHeat(qIn, pElec)`
- `splitRecoveredElectricity(pElec, exportFraction)`
- `computeOnboardReturnHeat(pOnboard, alphaRet)`
- `computeNetRadiatorBurden(basis, pExport, qReturn, qTpvLocalToRadiator)`
- `runTpvOnePass(input)`
- `runTpvIterative(input)`

### 14.3 `runtime/validators/extension-4-bounds.ts`

Validate ext4-specific bounds and mode/config consistency.

### 14.4 `runtime/runner/run-extension-4.ts`

Responsibilities:

1. accept normalized ext4 config and upstream context
2. enforce blocking rules
3. execute one-pass or iterative path per §10.1 radiator-object selection law
4. emit deterministic disabled result when disabled
5. emit deterministic invalid result when blocked
6. return only `extension_4_result`

### 14.5 `types/extension-4.d.ts` — Stricter Builder Interfaces

The runner input contract in §15.1 uses broad `Record<string, unknown>` types for runtime tolerance. `types/extension-4.d.ts` SHALL contain stricter normalized interfaces to prevent builder guesswork. At minimum it SHALL declare:

- `TpvRecaptureConfig` — as defined in §5.3
- `Extension4NormalizationResult` — as defined in §14.1
- `Extension4Input` — with a stricter normalized scenario surface extracting all §5.1 fields by name, a normalized radiator basis interface with `target_surface_temp_k`, `effective_area_m2`, resolved emissivity, and resolved sink temperature, and a typed 3A dependency surface matching §15.1
- `Extension4Result` — as defined in §15.3

All runtime modules SHALL import from `types/extension-4.d.ts`. No module shall duplicate these interface declarations independently.

## 15. Exact Input and Output Interfaces

### 15.1 `runExtension4` Input Contract

The runner uses broad types internally for tolerance across upstream runtime variation. Build implementations SHALL reference the stricter interfaces in `types/extension-4.d.ts` per §14.5.

> **Strict-contract note (§15.1):** The broad `Record<string, unknown>` types here are a runtime boundary tolerance only. The authoritative normalized interface for `scenario`, `run_packet`, `radiators`, and the 3A dependency surface is declared in `types/extension-4.d.ts` (see §14.5). All internal module logic SHALL use those stricter types. The broad boundary here is the final tolerance layer only — not an invitation to bypass the stricter interface.

```ts
interface Extension4Input {
  scenario: Record<string, unknown>;
  run_packet: Record<string, unknown>;
  radiators: Array<Record<string, unknown>>;
  baseline_result?: Record<string, unknown> | null;
  extension_3a_result?: {
    extension_3a_enabled: boolean;
    convergence_attempted: boolean;
    convergence_iterations: number;
    convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
    blocking_on_nonconvergence?: boolean;
    t_sink_resolved_k: number | null;
    radiator_area_bol_required_m2: number | null;
    radiator_area_eol_required_m2: number | null;
  } | null;
}
```

### 15.2 Required Upstream-Resolved Basis Fields

The runner must resolve using §10.1 (radiator-object selection) and §10.2 (field mapping). If any mapping cannot be completed deterministically, stop and log per §21.

### 15.3 `extension_4_result` Canonical TypeScript Shape

```ts
interface Extension4Result {
  extension_4_enabled: boolean;
  model_extension_4_mode: 'disabled' | 'one_pass' | 'iterative';
  spec_version: 'v0.1.4';
  blueprint_version: 'v0.1.4' | null;

  convergence_attempted: boolean;
  convergence_iterations: number;
  convergence_status: 'not_required' | 'converged' | 'nonconverged' | 'runaway' | 'invalid';
  nonconvergence_blocking_applied: boolean;

  tpv_model_id: string | null;
  intercept_fraction: number | null;
  q_rad_baseline_w: number | null;
  q_tpv_in_w: number | null;
  eta_tpv_effective: number | null;
  p_elec_w: number | null;
  p_export_w: number | null;
  p_onboard_w: number | null;
  q_return_w: number | null;
  q_tpv_loss_w: number | null;
  q_tpv_local_to_radiator_w: number | null;
  q_tpv_separate_cooling_load_w: number | null;
  q_rad_net_w: number | null;
  q_relief_w: number | null;

  area_equivalent_bol_m2: number | null;
  area_equivalent_eol_m2: number | null;
  area_delta_bol_m2: number | null;
  area_delta_eol_m2: number | null;

  baseline_sink_temperature_k: number | null;
  baseline_radiator_temperature_k: number | null;
  tpv_cold_side_temperature_k: number | null;

  iteration_history?: Array<{
    iteration_index: number;
    q_rad_basis_w: number;
    q_tpv_in_w: number;
    eta_tpv_effective: number;
    p_elec_w: number;
    p_export_w: number;
    p_onboard_w: number;
    q_return_w: number;
    q_tpv_loss_w: number;
    q_tpv_local_to_radiator_w: number;
    q_tpv_separate_cooling_load_w: number;
    q_rad_net_w: number;
    abs_delta_w: number | null;
    rel_delta_fraction: number | null;
  }>;

  defaults_applied: string[];
  warnings: string[];
  blocking_errors: string[];
  transform_trace: string[];
}
```

## 16. Deterministic Result Shapes

### 16.1 Version Constants

| Mode | `spec_version` | `blueprint_version` |
|---|---|---|
| `disabled` | `v0.1.4` | `null` |
| `one_pass` | `v0.1.4` | `v0.1.4` |
| `iterative` | `v0.1.4` | `v0.1.4` |
| `invalid` | `v0.1.4` | `v0.1.4` |

### 16.2 Disabled-State Result Shape

Required minimum:

- `extension_4_enabled=false`
- `model_extension_4_mode='disabled'`
- `spec_version='v0.1.4'`
- `blueprint_version=null`
- `convergence_attempted=false`
- `convergence_iterations=0`
- `convergence_status='not_required'`
- `nonconvergence_blocking_applied=false`
- `tpv_model_id=null`
- all numeric TPV fields = `null`
- `defaults_applied=[]`
- `warnings=[]`
- `blocking_errors=[]`
- `transform_trace` includes disabled-gate trace line
- `iteration_history` absent

### 16.3 Invalid Blocked-Result Shape

Guaranteed populated:

- `extension_4_enabled=true`
- `model_extension_4_mode` mirror retained
- `spec_version='v0.1.4'`
- `blueprint_version='v0.1.4'`
- `convergence_attempted=false`
- `convergence_iterations=0`
- `convergence_status='invalid'`
- `nonconvergence_blocking_applied=false`
- `tpv_model_id=null`
- `blocking_errors` non-empty
- `transform_trace` populated

All numeric TPV fields = `null`. `iteration_history` absent.

### 16.4 One-Pass Result Shape

- populated first-order values
- `convergence_attempted=false`
- `convergence_iterations=1`
- `convergence_status='not_required'`
- `nonconvergence_blocking_applied=false`
- if `iteration_report_detail='minimal'`, `iteration_history` absent
- if `iteration_report_detail='full'`, `iteration_history` present with exactly one entry

### 16.5 Iterative Result Shape

- populated final-iterate values
- `convergence_attempted=true`
- `convergence_iterations>=1`
- canonical status from §12.10
- if `iteration_report_detail='minimal'`, `iteration_history` absent
- if `iteration_report_detail='full'`, `iteration_history` present with all iteration entries

Absent, not empty array, is the canonical minimal form.

### 16.6 Field Nullability Summary

| Field group | disabled | invalid | one_pass | iterative |
|---|---|---|---|---|
| `extension_4_enabled` | `false` | `true` | `true` | `true` |
| `spec_version` | populated | populated | populated | populated |
| `blueprint_version` | `null` | populated | populated | populated |
| `convergence_attempted` | `false` | `false` | `false` | `true` |
| `convergence_iterations` | `0` | `0` | `1` | `>=1` |
| `convergence_status` | `not_required` | `invalid` | `not_required` | from §12.10 |
| `nonconvergence_blocking_applied` | `false` | `false` | `false` | conditional |
| `tpv_model_id` | `null` | `null` | populated | populated |
| All numeric TPV fields | `null` | `null` | populated | populated |
| Area equivalent fields | `null` | `null` | populated or `null` | populated or `null` |
| Temperature fields | `null` | `null` | populated | populated |
| `defaults_applied` | `[]` | populated | populated | populated |
| `warnings` | `[]` | populated | populated | populated |
| `blocking_errors` | `[]` | non-empty | `[]` | `[]` |
| `transform_trace` | gate trace | populated | populated | populated |
| `iteration_history` | absent | absent | absent or 1-entry | absent or full |

Area equivalent fields are `null` when 3A area basis is unavailable or `Q_base_ref <= 0`.

## 17. Pseudocode

### 17.1 Normalization Flow

```text
function normalizeExtension4(scenario):
  enabled = bool(scenario.enable_model_extension_4 ?? false)
  mode = scenario.model_extension_4_mode ?? 'disabled'

  if not enabled:
    return disabled normalization result

  if mode == 'disabled':
    add blocking error EXT4-ERR-INVALID-BOUNDS

  config = scenario.tpv_recapture_config ?? null
  if config is null:
    add blocking error EXT4-ERR-MISSING-CONFIG

  apply allowed defaults to missing config fields
  validate mode/config coherence
  validate bounds

  return normalization result
```

### 17.2 One-Pass Execution Flow

```text
function runTpvOnePass(input):
  resolve radiator basis per §10.1 and §10.2
  q_rad_baseline = epsilon * sigma * area * (T_rad^4 - T_space^4)
  chi_int = coverage * view_factor * spectral_capture * coupling_derate
  q_tpv_in = chi_int * q_rad_baseline
  eta = resolve eta_tpv
  p_elec = eta * q_tpv_in
  q_tpv_loss = q_tpv_in - p_elec
  p_export = export_fraction * p_elec
  p_onboard = p_elec - p_export
  q_return = onboard_return_heat_fraction * p_onboard
  q_tpv_local_to_radiator = q_tpv_loss if cell_cooling_mode == returns_to_radiator else 0
  q_tpv_separate_cooling_load = q_tpv_loss if cell_cooling_mode == separate_cooling else 0
  q_rad_net = q_rad_baseline - p_export + q_return + q_tpv_local_to_radiator
  if q_base_ref > 0:
    compute equivalent area metrics
  else:
    set area fields null, emit EXT4-WARN-ZERO-BASE-REF
  emit one-pass result
```

### 17.3 Iterative Execution Flow

```text
function runTpvIterative(input, cc):
  resolve radiator basis per §10.1 and §10.2
  q_rad_baseline = epsilon * sigma * area * (T_rad^4 - T_space^4)
  q_basis_prev = q_rad_baseline
  q_rad_net_0 = q_rad_baseline
  t_rad_prev = resolved baseline T_rad

  for k in 1..cc.max_iterations:
    chi_int = static intercept fraction
    q_tpv_in = chi_int * q_basis_prev
    eta = resolve eta_tpv using t_rad_prev if carnot_bounded
    p_elec = eta * q_tpv_in
    q_tpv_loss = q_tpv_in - p_elec
    p_export = export_fraction * p_elec
    p_onboard = p_elec - p_export
    q_return = onboard_return_heat_fraction * p_onboard
    q_tpv_local_to_radiator = q_tpv_loss if cell_cooling_mode == returns_to_radiator else 0
    q_tpv_separate_cooling_load = q_tpv_loss if cell_cooling_mode == separate_cooling else 0
    q_rad_net = q_basis_prev - p_export + q_return + q_tpv_local_to_radiator

    abs_delta = abs(q_rad_net - q_basis_prev)
    rel_delta = abs_delta / max(abs(q_rad_net), 1.0)

    record iteration history if detail == full

    if any non-finite or abs(q_rad_net) > cc.runaway_multiplier * max(abs(q_rad_net_0), 1.0):
      return runaway result

    if abs_delta <= cc.tolerance_abs_w and rel_delta <= cc.tolerance_rel_fraction:
      return converged result using q_rad_net

    q_basis_prev = q_rad_net
    if temperature-coupled mapping exists:
      t_rad_prev = update radiator temperature basis

  return nonconverged result using last iterate
```

### 17.4 `run-packet.ts` Dispatcher Patch

Dispatcher order:

1. baseline
2. Extension 2
3. Extension 3A
4. Extension 3B
5. Extension 4

Rules:

- ext4 reads 3A result if present
- ext4 does not read 3B numerically
- final packet includes `extension_4_result` under its own key only
- existing packet outputs remain unchanged except for additive ext4 mirrors and result object

## 18. Emitters and Reporting Law

### 18.1 JSON Emitter

Serialize ext4 through packet serialization only. Do not flatten into unrelated top-level fields.

### 18.2 Markdown Emitter

Must surface at minimum:

- ext4 enabled state
- mode
- baseline radiator burden
- TPV intercepted power
- TPV electrical output
- exported power
- onboard return heat
- TPV local loss heat
- separate cooling load if applicable
- net radiator burden
- burden relief/worsening (sign always shown)
- equivalent area deltas if available
- convergence status and iteration count
- warnings/errors

### 18.3 Flag IDs

Minimum required IDs:

| Flag ID | Trigger |
|---|---|
| `EXT4-INFO-DISABLED` | disabled state emitted |
| `EXT4-INFO-ONEPASS` | one-pass mode used |
| `EXT4-INFO-ONEPASS-NO-3A` | one-pass executed without 3A authority |
| `EXT4-INFO-ZERO-INTERCEPT` | `χ_int = 0` |
| `EXT4-INFO-ZERO-EFFICIENCY` | `η_tpv = 0` or `P_elec = 0` |
| `EXT4-WARN-NO-EXPORT` | zero export fraction with full onboard return |
| `EXT4-WARN-SEPARATE-COOLING-UNINTEGRATED` | separate cooling load emitted but unintegrated |
| `EXT4-WARN-NONCONVERGED` | max iterations exhausted |
| `EXT4-WARN-ZERO-BASE-REF` | `Q_base_ref <= 0`; area metrics nulled |
| `EXT4-ERR-MISSING-CONFIG` | enabled with no config |
| `EXT4-ERR-MISSING-3A-AUTHORITY` | iterative mode without 3A |
| `EXT4-ERR-INVALID-BOUNDS` | out-of-bounds inputs |
| `EXT4-ERR-RUNAWAY` | runaway detected |

### 18.4 Packet Metadata Emitter

Add ext4 enable gate, mode, config model ID, defaults applied, `executed_without_3a_authority` trace token when applicable, and ext4 catalog versions mirror.

### 18.5 Topology/Report Emitter

Append a dedicated `Extension 4 — TPV Recapture` section. Do not merge into unrelated sections.

## 19. UI Compilation Law

### 19.1 UI Visibility Requirement

Ext4 must be visible in UI and runtime output.

### 19.2 Required Editable Scenario Fields

UI shall expose:

- `enable_model_extension_4`
- `model_extension_4_mode`
- all `tpv_recapture_config` fields
- `extension_4_catalog_versions`

### 19.3 Required Read-Only Result Fields

Display at minimum:

- `q_rad_baseline_w`
- `q_tpv_in_w`
- `p_elec_w`
- `p_export_w`
- `p_onboard_w`
- `q_return_w`
- `q_tpv_loss_w`
- `q_tpv_separate_cooling_load_w`
- `q_rad_net_w`
- `q_relief_w`
- equivalent area metrics when available
- convergence status
- blocking errors and warnings

### 19.4 Required UI Patch Behavior

`ui/app/state-compiler.js` SHALL mirror ext4 scenario and run-packet fields into canonical payload objects, following the same visible/no-hidden-state rule already used for 3B.

### 19.5 Forbidden UI Behavior

UI must not:

- treat ext4 as proven hardware
- hide disabled state
- hide worsening radiator burden
- silently infer export fraction
- present 3C metadata as runtime authority

## 20. Validation and Test Plan

### 20.1 Schema Tests

Validate:

- disabled minimal scenario acceptance
- enabled one-pass acceptance
- enabled iterative acceptance
- invalid fraction rejection
- conditional efficiency field enforcement
- run-packet result shape validation
- explicit invalid-bounds cases from §13.3

### 20.2 Disabled-State Tests

Assert:

- deterministic disabled result per §16.2
- no numeric ext4 fields populated
- no blocking error in disabled state
- `nonconvergence_blocking_applied=false`
- `tpv_model_id=null`
- prior extension results unchanged

### 20.3 Energy-Accounting Tests

Assert:

1. all-export + `separate_cooling` decreases burden by `P_elec`
2. all-onboard-return + `separate_cooling` yields **negative relief equal to `−P_elec`** when `α_ret=1` and no export
3. all-onboard-return + `returns_to_radiator` yields **negative relief** beyond case 2 because TPV local loss also returns to the radiator path
4. no-export + `separate_cooling` + `α_ret=0` yields **zero relief** because nothing is exported and no onboard-used power returns as heat
5. partial export books correct split
6. `returns_to_radiator` books TPV loss into burden
7. `separate_cooling` separates TPV loss bookkeeping

### 20.4 Iteration Tests

Assert:

- converged case reaches `converged`
- exhausted max iterations reaches `nonconverged`
- runaway/non-finite case reaches `runaway`; example: `Q_rad_net^(0)=1000 W`, `runaway_multiplier=4.0`
- one-pass remains `not_required`
- iterative mode honors inherited tolerances

### 20.5 Cohabitation Tests

Assert:

- ext4 packet coexists with `extension_3a_result`
- ext4 packet coexists with `extension_3b_result`
- ext4 does not mutate 3A/3B result objects
- iterative mode blocks when required 3A authority absent
- 3C annotations do not alter numeric outputs

### 20.6 Output Tests

Assert:

- markdown includes ext4 section
- JSON packet includes `extension_4_result`
- flags include ext4 IDs where appropriate
- equivalent area fields null correctly when unavailable or `Q_base_ref <= 0`
- `iteration_history` absent in minimal mode and present only in full detail mode

> **Cut-list trace note (§20.6):** The cut-list phrase "radiator area recalculation tests" is satisfied in v0.1.4 by the equivalent burden-based area metric validation assertions above (area fields null correctly when 3A area basis is unavailable or `Q_base_ref <= 0`) together with the §9.14 metric computation. No in-loop geometric radiator redesign is required or authorized; see §12.5. Builders shall not implement additional geometric recalculation behavior on the basis of that cut-list phrase. This trace note closes the cut-to-spec path and is also pinned in blueprint Appendix C as higher-law authority.

### 20.7 State-Compilation Tests

`reference/extension-4-state-compilation.test.ts` validates Gate 7 (Blueprint Control 8). Required minimum assertions:

1. **Scenario field pass-through:** when `enable_model_extension_4=true`, `model_extension_4_mode='iterative'`, and a valid `tpv_recapture_config` are set in the scenario, the compiled state-compiler output payload contains all three fields with their declared values.

2. **Run-packet mirror pass-through:** when ext4 is enabled, the compiled run-packet object contains `enable_model_extension_4`, `model_extension_4_mode`, and `tpv_recapture_config` at correct values.

3. **No silent field drop:** all ext4 scenario and run-packet fields declared in §5.1 and §6.1 must be present in the output payload with either their declared value or their declared default.

4. **Disabled state produces no numeric authority:** when `enable_model_extension_4=false`, compiled payload reflects `enable_model_extension_4=false` and `model_extension_4_mode='disabled'`. No ext4 numeric result fields populated.

5. **`extension_4_catalog_versions` pass-through:** when set to a non-null object, the compiled payload preserves it without mutation and does not route it to any numeric computation path.

6. **Conformance with 3B pattern:** ext4 compilation follows the same no-hidden-state pattern already used by 3B field compilation.

## 21. Stop Conditions for the Builder

Stop and log if:

1. no resolvable upstream radiator basis exists under §10 mapping
2. actual 3A result field names differ materially from this spec and cannot be mapped without ambiguity
3. packet/report infrastructure forbids additive result-object attachment
4. UI architecture cannot expose nested ext4 object fields without broader refactor
5. a later blueprint lands and conflicts materially with this spec
6. scenario or packet schema patterns require a different naming family than this spec declares

## 22. Canonical Outcome

A conforming Extension 4 build under this spec produces:

- deterministic schema support for ext4 scenario and packet fields
- deterministic runtime for one-pass and iterative TPV recapture analysis
- deterministic disabled / invalid / converged / nonconverged / runaway result shapes
- additive packet attachment under `extension_4_result`
- additive flags and markdown/UI visibility
- isolated reference tests including state-compilation conformance
- zero mutation of prior extension result objects
- explicit exploratory labeling and export-bounded radiator relief law
