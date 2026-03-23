# Orbital Thermal Trade System Model Extension 3C Blueprint v0.1.0

## Metadata

- Document Type: Canonical Blueprint
- Document Status: Draft for Owner Review
- Extension ID: 3C
- Canonical File Name: `docs/blueprints/orbital-thermal-trade-system-model-extension-3c-blueprint-v0.1.0.md`
- Governing Priority: Extension 3C blueprint is higher law than the paired Extension 3C engineering spec
- Parent Baseline Authorities:
  - `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
  - `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- Upstream Extension Context:
  - Extension 2 canonical law
  - Extension 3A canonical law
  - Extension 3B canonical law
  - UI expansion canonical law
- Primary Intake Artifact: `docs/cut-lists/extension-3c-cut-list-v0.1.4.md`
- Authoring Mode: Deterministic, blueprint-first, spec-second
- Conflict Rule: If this blueprint conflicts with the paired Extension 3C engineering spec, this blueprint wins
- Project Rule Carry-Through:
  - metadata-only exploratory catalog pack
  - no runtime thermal credit
  - no runtime enhancement factor
  - no packet authority
  - no scenario execution authority
  - no mutation of baseline, Extension 2, Extension 3A, or Extension 3B numeric outputs
  - no hidden runtime state
  - no hidden equations
  - no parallel thermal network

## Executive Summary

Extension 3C establishes a **metadata-only concept catalog** for three exploratory concepts inherited from prior discovery lineage:

- `EXT-DISC-007` — GEO scavenging / ambient collection concept
- `EXT-DISC-018` — near-field radiative transfer concept
- `EXT-DISC-019` — osmotic / chemical gradient cooling concept

Extension 3C does **not** introduce runtime authority. It is not a thermal credit extension, not a packet-field extension, not a scenario-control extension, and not a numeric-output extension. It exists to preserve exploratory concepts in canonical form, with evidence and caveat metadata, without allowing those concepts to alter model execution or outputs.

The architectural purpose of 3C is to create a canonical, schema-governed, read-only concept layer that remains isolated from runtime-bearing artifacts. This provides governance value, evidence traceability, and optional UI visibility while preserving strict non-interference with all prior runtime-bearing law.

## Problem Statement

Prior ideation lineage contains concept identifiers and exploratory mechanisms that are useful to preserve for reasoning, research continuity, and evidence mapping. However, directly placing these concepts into runtime-bearing structures would create drift, hidden authority, and silent model expansion. The system therefore requires a canonical layer that can store exploratory concepts **without** conferring any execution semantics.

Absent 3C, the system faces four governance risks:

1. Concept drift risk: concepts appear in notes, appendices, or UI surfaces without canonical metadata law.
2. Runtime leakage risk: a later builder may incorrectly convert exploratory concepts into active numeric credit or packet authority.
3. Cohabitation risk: future TPV or other runtime-bearing extensions may be preempted by premature exploratory semantics.
4. Auditability risk: evidence class, maturity state, confidence state, and promotion requirements may remain implicit instead of explicit.

## Mission

Define Extension 3C as the canonical metadata-only exploratory catalog pack for specific discovery concepts, preserving evidence lineage and read-only visibility while enforcing complete non-authority over runtime execution, packet semantics, numeric outputs, and scenario control.

## Stakeholders

- Project owner
- Future build agent implementing the repo changes
- Future audit agent validating conformance
- UI/render layer readers
- Future extension authors, especially runtime-bearing extension authors
- Planned downstream Extension 4 owner(s), including TPV ownership pathways

## Design Principles

### 1. Metadata-only isolation

Every 3C artifact must remain metadata-bearing and non-runtime-bearing.

### 2. Explicit non-authority

Non-authority is not inferred. It must be stated, encoded, validated, and tested.

### 3. No silent promotion

A concept in 3C remains non-authoritative even if it is visible in UI, reports, or catalogs. Promotion requires a future explicit canonical extension.

### 4. Schema separation

3C objects must be schema-separated from packets, scenario configs, runtime transforms, result objects, emitters, and convergence/accounting logic.

### 5. Downstream coexistence

3C must preserve future design space for runtime-bearing extensions, including planned TPV isolation work, without claiming that ownership.

### 6. Deterministic implementation

Every 3C file change must be classifiable, inventory-checked, and drift-auditable before implementation.

## Scope

Extension 3C is in scope for:

- canonical metadata schema for concept entries
- evidence/provenance classification for 3C concepts
- maturity and confidence state recording
- caveat and notes handling
- explicit no-current-runtime-authority marker
- output-effect classification constrained to metadata-only / read-only semantics
- promotion-required contract
- read-only UI visibility contract
- appendix/catalog/report visibility law, provided it remains read-only
- file classification of touched or referenced repo artifacts
- non-interference control law
- implementation gating for future build agent work

## Non-Goals

Extension 3C is not authorized to do any of the following:

- create runtime thermal credit
- create enhancement factors
- create packet fields implying active runtime use
- create scenario execution authority
- modify baseline, Extension 2, Extension 3A, or Extension 3B numeric outputs
- define convergence behavior
- define TPV behavior
- define recaptured/exported power behavior
- define onboard heat return behavior
- define radiator area reduction behavior
- define feedback pass or rerun behavior
- define hidden equations or hidden state
- create a second or parallel thermal network
- require Extension 4 files to exist in-repo before 3C can be authored

## Canonical 3C Coverage

### Included concepts

Only the following discovery identifiers are in 3C scope:

- `EXT-DISC-007`
- `EXT-DISC-018`
- `EXT-DISC-019`

These are inherited discovery IDs. Missing identifiers are not implied deliverables.

### Explicit exclusion

`EXT-DISC-012` / TPV semantics are outside 3C ownership.

3C must not define, constrain, preempt, or partially own TPV runtime, accounting, or convergence behavior.

## Architectural Position

### 3C layer type

Extension 3C is a **catalog-plus-appendix extension**, not a runtime extension.

### 3C authority boundary

3C authority ends at:

- concept catalog records
- read-only render surfaces
- appendix/report annotations that clearly preserve non-authority

3C authority does not extend into:

- runtime constants
- runtime formulas
- runtime transforms
- runtime runner logic
- validators that alter execution
- packet selection logic
- scenario result calculation
- numeric output mutation

### Output effect law

Any 3C entry may have an output effect class only in the sense of descriptive metadata about current state. Under 3C, the only canonical current-state output effect is:

- `metadata_only_no_runtime_effect`

No 3C concept may claim or imply current runtime effect.

## Cohabitation Contract

### 3C vs baseline / Extension 2 / Extension 3A / Extension 3B

3C reads upstream canonical law for context and compatibility, but does not mutate upstream numeric or execution behavior.

### 3C vs UI expansion

3C may provide read-only data for UI rendering. UI visibility is descriptive only and cannot create authority.

### 3C vs planned Extension 4

Planned Extension 4 is a downstream owner of TPV semantics. Extension 3C does not read Extension 4 as upstream law and does not require an Extension 4 cut file to exist for 3C authoring. Extension 3C also does not preempt TPV ownership.

### 3C preservation law

Even if no future promotion extension is ever authored, 3C concepts remain permanently non-authoritative under canonical law unless later superseded by an explicit canonical extension.

## Semantic Contract for 3C Concept Entries

Each concept entry must carry semantics for:

- concept identifier
- title / short label
- provenance/evidence class
- maturity state
- confidence state
- output effect class
- promotion requirement
- caveat/notes handling
- no-current-runtime-authority marker

These semantics are mandatory. Exact field law is delegated to the paired engineering spec.

## Render Visibility Law

3C concepts may appear in read-only surfaces such as:

- concept catalog screens
- appendix sections
- evidence reports
- informational UI panels

Read-only visibility is allowed only if all of the following remain true:

1. no user control path can activate the concept into a scenario
2. no packet field carries the concept as active runtime authority
3. no numeric summary or result field attributes credit to the concept
4. UI labeling preserves metadata-only semantics
5. visibility is explainable as descriptive, not operative

## Promotion Law

A concept stored in 3C may only gain runtime-bearing authority through a future explicit canonical extension that:

- declares promotion scope
- defines new runtime law
- logs justification
- identifies downstream impacts
- introduces or updates relevant runtime schemas
- adds numeric and non-interference tests
- supersedes the non-authority boundary only in the explicitly promoted areas

Until that occurs, 3C concepts remain non-authoritative.

## READS / EXTENDS / REPLACES / IGNORES / DELETES Classification

No file may fall outside these categories.

### READS

3C reads these governance artifacts as upstream context:

- `docs/cut-lists/extension-3c-cut-list-v0.1.4.md`
- `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md`
- `docs/blueprints/orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1.md`
- `docs/blueprints/orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3b-engineering-spec-v0.1.1.md`
- `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md`
- `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md`

### EXTENDS

3C may extend in place, additively, only if the target exists in actual repo inventory and the implementation stays metadata-only:

- concept catalog source files
- metadata schemas
- read-only UI catalog render files
- docs index or docs registry files
- appendix/report templates that remain non-authoritative
- validation files enforcing non-interference and read-only visibility

No extension is authorized until the future build agent completes the pre-build tree audit and confirms exact file existence.

### REPLACES

3C creates and owns the following canonical documents going forward for Extension 3C:

- `docs/blueprints/orbital-thermal-trade-system-model-extension-3c-blueprint-v0.1.0.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3c-engineering-spec-v0.1.0.md`

If later revised, the newer 3C blueprint/spec file pair replace earlier 3C blueprint/spec revisions according to repo versioning conventions.

### IGNORES

3C ignores all repo files unrelated to metadata-only concept catalog behavior, including but not limited to:

- thermal numeric engine files unrelated to catalog metadata
- accounting or convergence files
- TPV-specific design files
- launch packaging math
- baseline and prior extension result fixtures unless used for non-interference comparison
- unrelated docs not needed for governance compatibility

### DELETES

This blueprint authorizes no mandatory source-file deletions at authoring time.

A later implementation may delete only clearly superseded draft or staging artifacts created specifically for non-canonical 3C work, and only if such deletions are logged and do not remove canonical upstream law.

## File and Tree Truth Policy

The spec file tables are intended targets. The actual repo tree is ground truth.

Before implementation, the build agent must recursively inventory at least:

- `runtime/constants/`
- `runtime/formulas/`
- `runtime/transforms/`
- `runtime/validators/`
- `runtime/runner/`
- `runtime/emitters/`
- `schemas/`
- `ui/app/`
- `tools/`
- `docs/`

If a file named by the spec does not exist where declared, the builder must stop and log a DIFF.

If a new file declared by the spec already exists, the builder must stop and log a DIFF.

The builder may not silently choose between file-table intent and actual tree truth.

No implementation proceeds until the inventory output is appended to the build issue log and owner sign-off is achieved.

## Controls and Gates

### Gate 0 — Intake completeness

Required:
- 3C cut list present
- current repo snapshot available
- upstream canonical documents identified

Failure action:
- stop and log hole if repo snapshot cannot be fully inventoried

### Gate 1 — Cohabitation integrity

Required:
- 3C scope limited to metadata-only concepts
- TPV ownership explicitly excluded
- prior extension numeric authority preserved

Failure action:
- stop and log contra or diff item

### Gate 2 — Schema isolation integrity

Required:
- no 3C object leaks into packets, scenario configs, result calculations, or runtime transforms

Failure action:
- stop and log architecture drift

### Gate 3 — UI non-authority integrity

Required:
- any UI surfacing is read-only
- no activation controls
- no numeric credit display

Failure action:
- stop and log runtime leakage

### Gate 4 — Non-interference integrity

Required:
- identical outputs for baseline / Ext 2 / Ext 3A / Ext 3B scenarios with and without 3C artifacts present

Failure action:
- stop implementation and log hard failure

### Gate 5 — Canonical document consistency

Required:
- 3C blueprint and 3C spec terminology aligned
- spec derived from blueprint
- no blueprint/spec conflict unresolved

Failure action:
- blueprint wins; spec must be revised

## Risks and Mitigations

### Risk 1: exploratory concept treated as active physics credit

Mitigation:
- mandatory no-current-runtime-authority marker
- output effect class locked to metadata-only
- non-interference tests

### Risk 2: UI control path creates stealth activation

Mitigation:
- read-only visibility law
- explicit prohibition on selection authority
- validator checks on UI config/state

### Risk 3: TPV ownership blurred

Mitigation:
- explicit 3C exclusion of TPV/EXT-DISC-012 semantics
- explicit downstream Extension 4 cohabitation clause

### Risk 4: spec names files that do not match actual tree

Mitigation:
- pre-build tree audit requirement
- stop-on-diff enforcement
- issue-log append requirement

### Risk 5: missing uploaded repo zip causes inaccurate path targeting

Mitigation:
- authoring hole logged
- spec marks all path tables as intended targets pending actual inventory
- build agent must stop on any mismatch

## Future Evolution

3C may later support:

- broader concept catalog coverage
- richer evidence annotation
- future promotion workflows

But any move from descriptive metadata to operative runtime authority requires a new canonical extension or explicit superseding law.

## Artifact Authority

This blueprint is intended to become the canonical 3C blueprint file in the repo when implementation occurs.

The paired engineering spec must be derived from this blueprint and may not exceed this blueprint’s authority.

## Deterministic Naming Basis

The chosen file name pattern follows existing repo conventions shown by the upstream extension files referenced in the intake prompt:

- `orbital-thermal-trade-system-model-extension-<id>-blueprint-v<semver>.md`
- `orbital-thermal-trade-system-model-extension-<id>-engineering-spec-v<semver>.md`

Therefore 3C canonical naming is:

- `orbital-thermal-trade-system-model-extension-3c-blueprint-v0.1.0.md`
- `orbital-thermal-trade-system-model-extension-3c-engineering-spec-v0.1.0.md`

## Authoring Holes Resolved at Blueprint Level

### Hole 3C-BP-001 — current repo zip not visible in sandbox during authoring

Resolution:
Blueprint proceeds using intake prompt, stated canonical file references, and prior known repo conventions. Actual implementation targeting is deferred behind mandatory pre-build tree audit and stop-on-diff behavior.

Downstream impact:
The future build agent cannot silently trust file tables in the spec and must reconcile them against actual repo inventory before changing source files.

### Hole 3C-BP-002 — exact existing metadata/catalog file locations unknown at authoring time

Resolution:
This blueprint authorizes category-level extension only, not assumed file-level extension. The engineering spec may define intended target families, but all file paths remain provisional until live inventory confirms them.

Downstream impact:
Implementation may require additive file creation instead of in-place patching, or vice versa, depending on actual tree truth.
