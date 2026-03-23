# Orbital Thermal Trade System Model Extension 3B Blueprint v0.1.0

## 1. Document Control

- Document Type: Blueprint
- Project: space-server-heat-dissipation
- Version: v0.1.0
- Status: Draft for owner approval
- Owner: James
- Extension Class: Subsystem-depth and operational-mode package
- Canonical naming basis:
  - Baseline blueprint family: `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
  - Extension blueprint family: `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`
  - Extension blueprint family: `docs/blueprints/orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md`

### 1.1 Governing relationship

This document supplements, and is subordinate to where applicable, the following already-existing canonical governance artifacts:

- `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md`
- `docs/blueprints/orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1.md`
- `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md`
- `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md`

### 1.2 Canonical weight statement

The 3B blueprint is the governing architectural authority for Extension 3B. The 3B engineering spec shall be derived from this completed blueprint. If any conflict exists between the 3B blueprint and the 3B engineering spec, the blueprint wins.

### 1.3 Intended repo canonicalization statement

When implementation occurs and owner approval is granted, this file is intended to become the canonical Extension 3B blueprint under:

- `docs/blueprints/orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.0.md`

## 2. Intent

Extension 3B adds bounded subsystem depth on top of the canonical Extension 3A topology. Its purpose is to increase operational realism in places where 3A intentionally stopped short:

- vault gas environment assumptions
- transport implementation parasitics
- liquid-loop gas-management and bubble semantics
- bounded TEG handling
- explicit eclipse-state authority and downstream behavior

3B is not a clean-sheet redesign. It is a controlled additive package that must preserve the single canonical thermal network, single heat-flow authority, and additive extension result law already established by baseline and 3A.

## 3. Scope

### 3.1 In scope

3B authorizes bounded additions to canonical objects so the model can express:

- `vault_gas_environment_model` assumptions tied explicitly to existing resistance-chain placement
- pump or circulation parasitic ownership on transport implementation objects
- gas-management declarations for liquid and mixed-risk transport paths
- bubble-risk semantics that feed back into loop resistance and transport risk flags
- bounded TEG behavior as subordinate scavenging only
- explicit eclipse-mode authority on the operating-state layer
- preset-driven operator acceleration that never creates hidden state

### 3.2 Out of scope

3B does not authorize:

- a second thermal backbone
- a duplicate heat-flow path
- an alternate result object that replaces baseline or 3A
- a hidden branch-specific solver state
- metadata-only research catalogs with zero runtime relevance
- TPV radiator-surface recapture as an active 3B subsystem
- destructive repo redesign

## 4. Dependency closure and extension boundary

### 4.1 Dependency law

3B is sequenced after 3A and depends on 3A topology and convergence law. 3B may add bounded fields and derived terms to existing canonical objects. 3B shall not create a new parallel thermal network, alternate backbone graph, or duplicate heat-flow authority.

### 4.2 Dispatcher law

Dispatcher order remains:

1. baseline
2. extension 3A
3. extension 3B

### 4.3 Result-object law

Each extension attaches under its own result key.

- baseline result authority remains baseline
- `extension_3a_result` remains separate and additive
- `extension_3b_result` must be separate and additive

3B shall not mutate baseline result fields or `extension_3a_result`.

## 5. Core architectural law carried into 3B

### 5.1 Single-network law

All 3B calculations must be expressed as bounded additions on the existing canonical objects and existing canonical topology. No hidden shadow subsystem may own heat balance.

### 5.2 Resistance-chain coupling law

Any vault gas or bubble behavior that changes effective heat removal must feed into canonical 3A resistance-chain placement or additive heat-load bookkeeping. It may not live only in notes, presets, or UI convenience metadata.

### 5.3 Numeric ownership law

Primary numeric ownership for pump parasitics belongs to the transport implementation object. Loop objects may aggregate, but they do not own the primitive pump-power declaration. Working-fluid objects remain intrinsic-property objects, not hardware-identity objects. Where transport calculations need fluid density or heat-capacity terms, 3B shall reuse the existing canonical intrinsic-property fields already present on working-fluid objects. 3B shall not introduce duplicate nominal-density or nominal-cp fields for the same physical property.

### 5.4 Operator-acceleration law

Presets and dropdowns are allowed where they materially reduce operator burden, but they are UI accelerators only. Every preset must populate explicit canonical fields, every populated value must remain visible, every populated value must remain editable, and every preset must emit provenance in the run packet and result lineage.

### 5.5 Default-injection and conformance-gate law

Any new optional 3B field added to canonical schema must be wired into deterministic default expansion before validation. Any new 3B catalog file added under canonical catalog roots must also be wired into the existing schema-lint or conformance map so the file participates in the same gate family as existing catalog artifacts. 3B may not rely on unstated runtime omission behavior for optional-field safety.

### 5.6 Deterministic disabled and bypass semantics law

If 3B is disabled, or if a specific 3B subsystem resolves to a no-effect path such as `mode=none`, the resulting run output must still use a deterministic explicit structure with declared zero or null values and traceable reason codes. The builder may not invent disabled or bypass payload shapes at implementation time.

## 6. Canonical terminology and nomenclature

The following terms are canonical in 3B and must be used consistently across blueprint, engineering spec, runtime, schemas, catalogs, and UI:

- `vault_gas_environment_model`
- `transport_implementation`
- `loop_model`
- `operating_state`
- `gas_management_mode`
- `bubble_risk`
- `pump_parasitic`
- `eclipse_state`
- `preset_provenance`

The term `vault atmosphere model` is not canonical in 3B and shall not be used as the governing object name.

## 7. Best-solve architectural placement for 3B-owned data

### 7.1 Placement problem

The repo snapshot contains canonical top-level schemas for `scenario`, `thermal-zone`, `working-fluid`, `radiator`, `conversion-branch`, and `run-packet`, but does not contain standalone schema families for loop objects, transport implementation objects, or operating-state objects.

### 7.2 3B best-solve placement decision

To avoid a silent top-level schema-family expansion, 3B places new canonical 3B-owned objects as nested sub-objects under existing canonical schemas:

- `thermal-zone.loop_model`
- `thermal-zone.transport_implementation`
- `thermal-zone.vault_gas_environment_model`
- `scenario.operating_state`

This is a controlled best-solve, chosen because it preserves current schema-family boundaries while still creating explicit object homes for 3B-owned fields.

### 7.3 Approval condition

This placement is the governing 3B architectural choice for this draft, but remains subject to owner approval before implementation becomes canonical.

## 8. Object-family contract

### 8.1 `vault_gas_environment_model`

This object belongs on the thermal-zone object. It declares whether an internal gas environment is absent, preset-loaded, or custom-declared, and how any declared gas environment couples to the existing resistance chain.

It must support modes:

- `none`
- `preset`
- `custom`

It must expose, at minimum:

- gas presence semantics
- gas species semantics
- pressure semantics
- convection assumption semantics
- contamination or outgassing semantics
- preset provenance
- manual override disclosure

### 8.2 `transport_implementation`

This object belongs on the thermal-zone object. It owns primitive pump or circulation parasitic inputs and gas-management declarations. Fraction-named fields in this object must remain bounded to the closed interval `[0,1]` unless the field is renamed away from fraction semantics. It must be able to express:

- no active transport
- preset transport class
- custom transport declaration
- direct pump-power declaration
- pressure-drop-plus-flow declaration
- gas-management strategy
- allowable void or bubble tolerance
- downstream risk posture

### 8.3 `loop_model`

This object belongs on the thermal-zone object. It aggregates loop-level interpretations, not primitive pump ownership. It may contain derived totals and zone-coupling references, but it must not displace transport implementation ownership.

### 8.4 `operating_state`

This object belongs on the scenario object. It is the single canonical state authority for sunlit versus eclipse operation in 3B. Subsystems respond to this state. They do not own it.

## 9. Operator mode design

### 9.1 Required mode families

At minimum, 3B must support:

- gas presence mode
- gas species mode
- pressure band mode
- convection assumption mode
- contamination or outgassing mode
- pump mode
- gas-management mode
- eclipse-state mode

### 9.2 Mode law

Where meaningful, every 3B mode family must support:

- `none`
- `preset`
- `custom`

### 9.3 Visibility law

Preset-loaded values shall remain visible and editable after load. A preset may never hide the values it injected.

### 9.4 Provenance law

Preset application must emit:

- preset catalog id
- preset entry id
- preset version
- overridden fields after load

## 10. Bubble and gas-management law

### 10.1 Bubble semantics are modeled risk

For liquid systems, `liquid` does not imply benign single-phase behavior. Bubble presence, entrained gas, and gas lock are modeled risks, not ignored noise.

### 10.2 Bubble tolerance law

Bubble-tolerant equipment selection does not render bubbles harmless. 3B must retain visibility into:

- gas lock risk
- thermal blanketing risk
- flashing or void formation risk
- control instability risk
- dielectric breakdown relevance where electrically sensitive zones are declared

### 10.3 Coupling law

Bubble and gas-management behavior must feed back into loop resistance and total rejected heat bookkeeping. It may not exist only as a categorical note.

## 11. TEG law

3B treats TEG behavior as subordinate, conservative, and bounded.

- TEG may exist only as a scavenging branch
- TEG may not silently erase downstream rejection requirements
- TEG shall be modeled as a heat-through device with bounded electrical output
- residual heat remains on-node unless another declared branch carries it away

## 12. Eclipse-state law

### 12.1 Single authority

`scenario.operating_state` is the only 3B eclipse-state authority.

### 12.2 Required downstream effects

When eclipse is active, 3B may change downstream interpretation only through explicit declared rules, such as:

- solar-dependent source term suppression
- storage drawdown enablement if a storage object is declared
- noncritical branch disablement if declared
- compute derate if declared

No subsystem may silently infer eclipse behavior from its own local object alone.

## 13. Controls, gates, and stop conditions

### 13.1 Pre-build inventory gate

Before implementation, the builder must inventory the actual repo tree for at least:

- `runtime/constants/`
- `runtime/formulas/`
- `runtime/transforms/`
- `runtime/validators/`
- `runtime/runner/`
- `runtime/emitters/`
- `schemas/`
- `ui/app/`
- `tools/`

The spec file tables are intended targets. The actual repo tree is ground truth. Any mismatch requires a logged DIFF and owner resolution before build proceeds.

### 13.2 Schema visibility gate

No 3B field may exist in UI-only state without an explicit canonical schema home.

### 13.3 Hidden-state gate

If a preset or UI mode creates hidden fields, hidden equations, or hidden state outside canonical schema, implementation must stop.

### 13.4 Parallel-authority gate

If a proposed implementation creates a second heat-flow network, second eclipse-state authority, or second pump-power authority, implementation must stop.

## 14. READS / EXTENDS / REPLACES / IGNORES / DELETES contract

Every prior extension artifact and every touched repo file must be classified in exactly one category. No file may sit outside the contract.

### 14.1 Classification definitions

- `READS`: referenced for governance or data dependency only; not modified by 3B
- `EXTENDS`: patched or additively updated by 3B
- `REPLACES`: succeeded by a new canonical 3B-owned file taking over the same authority
- `IGNORES`: present in repo but not in 3B authority path
- `DELETES`: removed by 3B with explicit reason

### 14.2 Cohabitation matrix

| Path | Class | 3B rationale |
|---|---|---|
| `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md` | READS | Baseline architecture and product law remain governing context. |
| `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md` | READS | Baseline implementation law still governs shared families and equations. |
| `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md` | READS | Extension 2 remains additive context; 3B does not supersede spectral-stage law. |
| `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md` | READS | Extension 2 continues as separate additive branch. |
| `docs/blueprints/orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md` | READS | 3B depends on 3A topology and resistance-chain law. |
| `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1.md` | READS | 3B depends on 3A schema/runtime placement and additive result behavior. |
| `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md` | READS | 3B preset and UI acceleration rules must cohabit with current UI law. |
| `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md` | READS | 3B UI changes must fit current packet-builder architecture. |
| `schemas/thermal-zone/thermal-zone.schema.json` | EXTENDS | New nested 3B objects live here. |
| `schemas/working-fluid/working-fluid.schema.json` | EXTENDS | 3B requires bounded gas and transport-relevant intrinsic fields only. |
| `schemas/scenario/scenario.schema.json` | EXTENDS | `operating_state` and 3B enable/mode fields must live here. |
| `schemas/run-packet/run-packet.schema.json` | EXTENDS | 3B additive result and provenance must attach here. |
| `schemas/conversion-branch/conversion-branch.schema.json` | EXTENDS | TEG boundedness and subordinate behavior require explicit branch fields. |
| `runtime/transforms/catalog-resolution.ts` | EXTENDS | 3B preset catalogs require deterministic resolution. |
| `runtime/validators/cross-reference.ts` | EXTENDS | 3B references must resolve canonically. |
| `runtime/validators/operating-mode.ts` | EXTENDS | 3B modes must be validated without mutating existing extension modes. |
| `runtime/runner/run-packet.ts` | EXTENDS | Additive dispatch order baseline → 3A → 3B. |
| `runtime/runner/run-extension-3a.ts` | READS | 3A runner remains independent; 3B reads only shared outputs or inputs. |
| `runtime/formulas/resistance-chain.ts` | EXTENDS | 3B adds additive resistance terms but does not replace 3A chain law. |
| `runtime/formulas/heat-transport.ts` | EXTENDS | Transport and pump work equations belong to heat transport family. |
| `ui/app/app.js` | EXTENDS | 3B operator controls appear here. |
| `ui/app/state-compiler.js` | EXTENDS | 3B visible state must compile into canonical payloads. |
| `ui/app/catalog-loader.js` | EXTENDS | 3B preset catalogs require deterministic loading. |
| `ui/app/catalogs/working-fluids.v0.1.0.json` | READS | Existing working-fluid IDs remain the canonical fluid reference family. |
| `ui/app/catalogs/pickup-geometries.v0.1.0.json` | READS | 3A pickup geometry family remains canonical. |
| `runtime/transforms/default-expander.ts` | EXTENDS | New optional 3B fields require deterministic default injection before validation. |
| `runtime/emitters/flag-emitter.ts` | EXTENDS | 3B warnings and blocking conditions must emit through the canonical flag path. |
| `runtime/emitters/packet-metadata-emitter.ts` | EXTENDS | 3B preset provenance and catalog-version lineage must emit through packet metadata. |
| `runtime/emitters/comparison-emitter.ts` | IGNORES | Comparison output is not 3B authority in this draft. |
| `runtime/emitters/json-emitter.ts` | IGNORES | JSON emitter does not gain 3B-specific authority in blueprint law. |
| `runtime/emitters/markdown-emitter.ts` | IGNORES | Markdown emitter does not gain 3B-specific authority in blueprint law. |
| `runtime/emitters/topology-report.ts` | IGNORES | Topology reporting remains outside 3B authority. |
| `tools/conformance/lint-schemas.mjs` | EXTENDS | New 3B catalog files must remain inside the existing conformance gate map. |
| `tools/conformance/validate-schemas.js` | READS | Existing validation flow remains governing context unless implementation discovers an explicit patch need. |
| `docs/blueprints/orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.0.md` | REPLACES | Becomes the canonical 3B blueprint file once approved. |
| `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3b-engineering-spec-v0.1.0.md` | REPLACES | Becomes the canonical 3B engineering spec file once approved. |

### 14.3 Deletion statement

3B authorizes no deletions in this draft.

## 15. Risks and mitigations

| Risk | Why it matters | 3B mitigation |
|---|---|---|
| Hidden convection assumptions | Creates fake precision and silent authority drift | Force explicit `vault_gas_environment_model` mode and explicit field visibility |
| Pump-power double counting | Corrupts heat balance and result lineage | Fix primitive numeric ownership on `transport_implementation` only |
| Bubble semantics treated as notes only | Misses loop failure and resistance coupling | Require explicit gas-management object and additive resistance/load coupling |
| TEG optimism | Can erase real reject burden | Force subordinate bounded heat-through treatment |
| Eclipse inferred locally by subsystems | Creates multiple state authorities | Force `scenario.operating_state` as single authority |
| New top-level schema sprawl | Causes architecture drift | Use nested 3B sub-objects inside existing canonical schemas |
| UI presets creating hidden fields | Breaks deterministic payload compilation | Preset provenance and visible editable fields required |

## 16. Implementation-ready blueprint constraints

3B implementation must preserve all of the following:

- additive extension result law
- no baseline mutation
- no `extension_3a_result` mutation
- no hidden model variables
- no hidden equations
- no silent default convection
- no transport hardware identity on working-fluid objects
- no branch-owned eclipse authority

## 17. Blueprint completion statement

This blueprint completes the governing 3B architecture for subsystem-depth and operational-mode additions. The engineering spec shall derive from this blueprint and shall not introduce conflicting structure without a logged hole, diff, additive, or contra item.

