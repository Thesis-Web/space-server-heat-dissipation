# File: docs/blueprints/orbital-thermal-trade-system-model-extension-4-blueprint-v0.1.4.md

## Metadata

- Document Type: Canonical Blueprint
- Document Status: canonical blueprint
- Volume: v0.1.4
- Extension ID: 4
- Extension Name: TPV Cells on Radiator Surface (Photon Recapture Loop)
- Canonical File Name: `docs/blueprints/orbital-thermal-trade-system-model-extension-4-blueprint-v0.1.4.md`
- Governing Priority: Extension 4 blueprint is higher law than the paired Extension 4 engineering spec
- Parent Baseline Authorities:
  - `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
  - `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- Upstream Extension Authorities:
  - `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`
  - `docs/blueprints/orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md`
  - `docs/blueprints/orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.1.md`
  - `docs/blueprints/orbital-thermal-trade-system-model-extension-3c-blueprint-v0.1.0.md`
- Primary Intake Artifact: `docs/cut-lists/extension-4-tpv-isolated-cut-list-v0.1.1.md`
- Research Lock Basis: `docs/extension-4-preblueprint-research-lock-log-v0.1.0.md`
- Paired Engineering Spec: `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md`
- Conflict Rule: If this blueprint conflicts with the paired Extension 4 engineering spec, this blueprint wins.

## Version Delta

| Version | Changes |
|---|---|
| v0.1.0 | First candidate. |
| v0.1.1 | Pinned repo-truth field names; pinned UI state-compilation seam; removed defective compressed summary law from paired spec. |
| v0.1.2 | Corrected energy-accounting test assertions; added zero-relief case; added state-compilation test file requirement. |
| v0.1.3 | Rolled parent authority references to confirmed-existing versions; Gate 7 backed by §20.7. |
| v0.1.4 | This document. Corrected document status from "repaired draft" to canonical. Added radiator-object selection law to canonical runtime sequence. Declared `extension_4_catalog_versions` as pass-through provenance with zero numeric authority. Added `EXT4-INFO-ONEPASS-NO-3A` to gate and risk register. Added `Q_base_ref ≤ 0` guard to equivalent-area risk. Added new invariant: all gates must have explicit spec-declared test coverage. |

## Executive Summary

Extension 4 defines a bounded, exploratory, radiator-coupled TPV recapture subsystem inside the orbital thermal trade system model. It does not prove hardware validity, eliminate the radiator, or silently create thermal credit. It creates a controlled additive branch for asking a narrow model question:

> If a bounded fraction of radiator-emitted photon power were intercepted by a TPV layer or TPV-coupled surface, what would that do to recovered electrical output, onboard returned heat, exported-power credit, and net radiator burden inside the model law?

Extension 4 is runtime-bearing, optional, off by default, and additive only. When disabled it has zero numeric authority. When enabled it supports:

- `one_pass` — bounded comparison / sanity mode
- `iterative` — canonical Extension 4 analysis mode under inherited 3A convergence law

## Problem Statement

Without Extension 4, the model lacks a canonical runtime-bearing place to evaluate a radiator-coupled TPV recapture loop. That creates:

1. concept-to-runtime gap,
2. hidden assumption drift,
3. authority leakage risk into 3B or 3C,
4. energy-accounting inconsistency,
5. UI/report/runtime routing ambiguity.

## Mission

Define Extension 4 as the canonical exploratory-option TPV recapture extension that models a radiator-coupled photon recapture loop with:

- explicit enable semantics,
- explicit accounting order,
- explicit cohabitation boundaries,
- explicit additive outputs,
- explicit UI/reporting visibility,
- explicit dependence on 3A convergence law,
- explicit repo-truth file seams for runtime and UI routing.

## Design Principles

1. **Exploratory-option discipline** — model a plausible analytical branch, not validated flight hardware.
2. **Radiator primacy preservation** — the radiator remains the primary heat rejection mechanism.
3. **Export-bounded truthfulness** — durable relief must be bounded by energy exported beyond the modeled thermal boundary.
4. **Explicit enablement** — disabled means zero numeric authority.
5. **Additive-only output law** — emit only an additive `extension_4_result` plus additive flags/report fields.
6. **3A convergence inheritance** — no independent packet-authoritative convergence family.
7. **Separate TPV authority family** — TPV is not collapsed into 3B branch ownership.
8. **Metadata non-authority** — 3C may annotate only; `extension_4_catalog_versions` is pass-through provenance and carries no numeric authority.
9. **Deterministic accounting order** — radiator emission → TPV intercept → electrical recovery → TPV local waste → export / onboard split → returned heat → recomputed radiator burden.
10. **Builder completeness** — blueprint and spec together must remove builder guesswork.
11. **Radiator-basis consistency** — Extension 4 uses the same radiator basis already resolved by the base model; it does not perform independent radiator selection.
12. **Gate completeness** — every control gate must have explicit spec-declared test coverage.

## Scope

Extension 4 is in scope for:

- explicit scenario enable gate,
- explicit `disabled` / `one_pass` / `iterative` mode semantics,
- canonical TPV configuration object,
- runtime-bearing TPV recapture subsystem,
- deterministic exported-power and onboard-return accounting,
- deterministic additive result emission under `extension_4_result`,
- additive flag/report/UI visibility,
- isolated tests and disabled-state non-interference tests,
- repo-truth wiring through `runtime/runner/run-packet.ts`, `ui/app/state-compiler.js`, and `ui/app/app.js`.

## Non-Goals

Extension 4 is not authorized to:

- claim validated flight implementation,
- remove the radiator from the model,
- invent hidden storage or bus dispatch,
- assume permanent onboard-use relief,
- take 3B conversion-branch ownership,
- take 3C runtime authority,
- grant numeric authority to `extension_4_catalog_versions`,
- redefine packet-authoritative convergence controls,
- overwrite baseline or prior extension results,
- perform independent radiator selection from the scenario radiator array,
- introduce full spectral transport, Monte Carlo radiation, orbital time propagation, or mass/manufacturing law.

## Architectural Position

### Layer Type

Extension 4 is a **runtime-bearing, isolated additive extension**.

### Authority Boundary

Extension 4 authority begins at:

- TPV enablement semantics,
- TPV configuration semantics,
- TPV recapture runtime logic,
- TPV additive result semantics,
- TPV reporting and UI visibility semantics.

Extension 4 authority ends before:

- baseline radiator law replacement,
- independent packet-authoritative convergence law,
- 3B schema ownership transfer,
- 3C numeric authority,
- `extension_4_catalog_versions` numeric authority,
- storage law,
- radiator selection from scenario radiator array.

### Output Effect Law

- Disabled: `no_runtime_effect_disabled_state`
- Enabled: additive result production and additive reporting only

No mode authorizes overwrite of upstream outputs.

## Cohabitation Contract

### Extension 4 vs Baseline

Extension 4 reads baseline thermal and scenario context but does not replace baseline outputs. It uses the same radiator basis the base model already resolved.

### Extension 4 vs Extension 2

Additive cohabitation only. No ownership transfer.

### Extension 4 vs Extension 3A

Hard dependency for iterative mode. Extension 4 inherits:

- convergence control,
- status semantics,
- sink-temperature authority,
- radiator sizing context.

Extension 4 may add local observables, but may not create a separate authoritative convergence family.

### Extension 4 vs Extension 3B

Extension 4 does not transfer TPV ownership into 3B. Cohabitation is allowed only at shared packet/emitter/UI seams. Extension 4 reads nothing from 3B for numeric authority.

### Extension 4 vs Extension 3C

3C remains annotation-only. Extension 4 may reference lineage labels or metadata only.

### Disabled-State Preservation Law

When disabled, baseline and prior extension outputs remain exactly as they would without Extension 4, except for deterministic disabled-state reporting fields that declare non-participation.

## Functional Architecture

1. **Activation layer** — enable gate, mode selection, config validation
2. **Normalization layer** — normalize TPV config, apply allowed defaults, reject contradictions
3. **Recapture analysis layer** — compute radiator-emission basis using the base model's already-resolved radiator object; compute intercepted power, electrical recovery, TPV local waste heat
4. **Disposition layer** — split recovered electricity into exported and onboard-used fractions; compute returned onboard heat
5. **Recomputed burden layer** — determine net radiator burden and relief/worsening; guard equivalent-area computation against `Q_base_ref <= 0`
6. **Convergence layer** — one-pass solve or bounded iterative solve under 3A semantics
7. **Emission and UI layer** — emit `extension_4_result`, emit flags/reports, expose UI state and outputs

### Canonical Runtime Sequence

1. read scenario activation state
2. if disabled, emit deterministic disabled-state result and stop
3. normalize and validate Extension 4 config
4. acquire baseline radiator state from the same radiator object already resolved by the base model runtime, using repo-truth field names:
   - radiator temperature basis → `target_surface_temp_k`
   - baseline emissivity fallback → `emissivity`
   - 3A emissivity priority path → `surface_emissivity_bol` / `surface_emissivity_eol_override`
   - radiator area basis → `effective_area_m2`
   - sink temperature basis → `background_sink_temp_k_override` → `t_sink_resolved_k` → `sink_temp_k`
5. compute intercepted TPV power
6. compute TPV electrical recovery and TPV local waste heat
7. split electrical recovery into export and onboard-use branches
8. compute returned onboard heat
9. compute recomputed net radiator burden
10. if mode is `one_pass`, emit result and stop; if 3A was absent, emit `EXT4-INFO-ONEPASS-NO-3A`
11. if mode is `iterative`, repeat bounded analysis using 3A convergence law until converged, nonconverged, runaway, or invalid
12. emit additive result, flags, reports, and UI fields

## Workflow Phases

### Phase 1 — Intake and Validation

- inspect scenario activation fields
- validate mode
- validate TPV config
- reject contradictory values

### Phase 2 — Baseline State Acquisition

- acquire radiator-emission basis from the base model's resolved radiator object per §10.1 of paired spec
- acquire 3A convergence-control values

### Phase 3 — TPV One-Step Solve

- compute intercepted power
- compute electrical recovery
- compute TPV waste heat
- compute export and onboard-use split
- compute return heat and recomputed net burden

### Phase 4 — Mode Branch

- `one_pass` → emit bounded comparison result
- `iterative` → enter bounded feedback loop

### Phase 5 — Iterative Convergence Execution

- evaluate convergence variables under 3A law
- continue until convergence or stop condition
- record iteration history when detail mode requires it

### Phase 6 — Output and Render

- emit additive result block
- emit additive flags
- emit additive markdown/json/report fields
- expose UI-visible extension state and outcome

### Phase 7 — Validation and Non-Interference Proof

- verify disabled-state non-interference
- verify additive-only enabled-state behavior
- verify schema validity
- verify cohabitation with 3A and shared emitters
- verify state compilation through `ui/app/state-compiler.js` per §20.7 of the paired engineering spec

## Roles and Responsibilities

### Blueprint Responsibilities

This blueprint defines:

- extension purpose,
- authority boundaries,
- cohabitation law,
- additive-only posture,
- mandatory reporting/UI posture,
- deterministic repo-truth routing expectations,
- radiator-basis consistency law.

### Engineering-Spec Responsibilities

The paired engineering spec must define:

- exact variables and symbols,
- exact equations and bounded assumptions,
- exact schemas,
- exact runtime sequencing and pseudocode,
- exact result shape including nullability summary,
- exact file additions and patch targets,
- exact test matrix including state-compilation assertions,
- exact non-convergence mapping,
- explicit radiator-object selection law,
- explicit radiator-field mapping,
- explicit UI state-compilation patch requirement,
- explicit `Q_base_ref <= 0` guard,
- explicit `extension_4_catalog_versions` pass-through-only declaration.

### Build-Agent Responsibilities

The future build agent must:

- implement only the files and patches authorized by the engineering spec,
- preserve additive-only behavior,
- preserve 3A convergence inheritance,
- preserve 3C non-authority,
- use the base model's resolved radiator object — do not select independently,
- route ext4 scenario/run-packet state through `ui/app/state-compiler.js` and `ui/app/app.js`,
- add tests and reporting exactly as specified,
- implement `reference/extension-4-state-compilation.test.ts` with the minimum assertions declared in §20.7 of the paired engineering spec.

### Audit-Agent Responsibilities

The future audit agent must verify:

- disabled-state zero-authority behavior,
- additive-only enabled-state behavior,
- correct cohabitation boundaries,
- schema conformance,
- emitter/reporting completeness,
- UI visibility conformance,
- absence of hidden storage semantics,
- correct repo-truth radiator field usage and correct radiator-object selection,
- `extension_4_catalog_versions` carries no numeric authority,
- state-compilation test assertions pass,
- all gates have passing test coverage.

## Deliverables

Extension 4 deliverables are:

- canonical Extension 4 blueprint,
- canonical Extension 4 engineering spec,
- `types/extension-4.d.ts` with stricter builder interfaces,
- new TPV runtime files defined by the spec,
- patched shared runtime/schema/emitter/UI files defined by the spec,
- isolated Extension 4 tests,
- deterministic disabled-state output behavior,
- deterministic additive enabled-state reporting and UI visibility,
- passing state-compilation test suite per §20.7 of the paired engineering spec.

## Controls and Gates

1. **Enable-gate control** — no runtime authority unless explicitly enabled.
2. **Radiator-preservation control** — no implementation may imply radiator elimination.
3. **Export-bounded relief control** — onboard use cannot masquerade as durable relief.
4. **No-hidden-storage control** — only exported and onboard-used sinks in v0.1.4.
5. **Additive-only control** — no overwrite of baseline or prior extension results.
6. **Convergence-inheritance control** — no independent packet-authoritative convergence family.
7. **Cohabitation control** — no silent absorption into 3B and no runtime authority to 3C metadata or `extension_4_catalog_versions`.
8. **State-compilation control** — UI state compilation must emit ext4 fields through canonical payload objects.
9. **Radiator-basis-consistency control** — ext4 must use the same radiator basis the base model already resolved; independent radiator selection is forbidden.

### Gates

- Gate 1 — schema gate
- Gate 2 — runtime gate
- Gate 3 — accounting gate
- Gate 4 — convergence gate
- Gate 5 — reporting gate
- Gate 6 — non-interference gate
- Gate 7 — UI/state-compilation gate; validated by `reference/extension-4-state-compilation.test.ts` per §20.7 of `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md`

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Overclaiming physical certainty | Preserve exploratory-option labeling in blueprint, spec, reports, and UI |
| Hidden heat-return optimism | Enforce export-bounded relief and explicit return-heat accounting |
| Schema drift into 3B | Preserve separate TPV authority family |
| Convergence drift | Require 3A convergence inheritance |
| Disabled-state leakage | Require deterministic disabled-state result and tests |
| Incomplete UI/report exposure | Require both runtime reporting and UI visibility |
| Wrong radiator-field binding | Pin actual repo field names in spec §10.2 and trace resolution path |
| Wrong radiator-object selection | Require base-model-resolved radiator object per §10.1; block if undetermined |
| `extension_4_catalog_versions` gaining numeric authority | Declare pass-through-only in rules, spec, and schema |
| Gate without test | All gates must have explicit spec-declared test coverage; Gate 7 is backed by §20.7 |
| Dead authority references | Parent authority versions are pinned only to confirmed-existing files |
| `Q_base_ref <= 0` producing divide-by-zero | Guard in spec §9.14; null area fields and emit `EXT4-WARN-ZERO-BASE-REF` |

## Future Evolution

Future owner-approved revisions may:

- refine TPV efficiency modeling,
- add temperature tables,
- add stronger local TPV thermal-coupling treatment,
- add storage semantics,
- add view-factor / spectral refinements,
- add mission-specific export scenarios,
- bump parent authority references as upstream documents are published and confirmed.

No such future work is implied by this blueprint.

## Appendices

### Appendix A — Required Invariants

- Extension 4 is off by default
- Extension 4 is additive only
- TPV does not eliminate the radiator
- durable relief is export-bounded
- onboard use is heat-return-bearing
- no hidden storage exists in v0.1.4
- `iterative` is canonical when enabled
- `one_pass` remains available as bounded comparison mode
- 3A owns convergence law
- 3C remains annotation-only
- `extension_4_catalog_versions` is pass-through provenance with zero numeric authority
- radiator source fields must be resolved from actual repo schema names
- Extension 4 uses the same radiator basis the base model already resolved
- ext4 UI state must compile through canonical payload generation
- all gates must have explicit spec-declared test coverage
- `Q_base_ref <= 0` nulls equivalent-area fields; no division is attempted

### Appendix B — Required Repo Artifact Naming

- `docs/blueprints/orbital-thermal-trade-system-model-extension-4-blueprint-v0.1.4.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md`

Authoring/build logs follow the flat docs pattern already present in repo truth.

### Appendix C — Required Builder Handoff Expectations

The engineering spec must tell the builder exactly:

- what files to create,
- what files to patch,
- what schemas to add or extend,
- what equations to implement,
- what result object to emit,
- what flags to emit,
- what UI surfaces to render,
- what tests must pass,
- what non-interference conditions must hold,
- what radiator object to use and how it is selected,
- what radiator source fields to read,
- what UI state-compilation seams to patch,
- what assertions the state-compilation test file must contain,
- what stricter interfaces `types/extension-4.d.ts` must declare,
- how `Q_base_ref <= 0` must be guarded,
- that `extension_4_catalog_versions` is pass-through only,
- that the cut-list phrase "radiator area recalculation tests" is fully satisfied in v0.1.4 by equivalent burden-based area metric validation under §9.14 of the paired engineering spec and the related output test assertions in §20.6; v0.1.4 does not authorize in-loop geometric radiator redesign (see spec §12.5); a builder reading the cut-list shall not implement additional geometric recalculation behavior on the basis of that phrase.
