# Extension 3C Cut List

Status: draft-intake-updated  
Purpose: deterministic cut-list split for bounded implementation, merge, and test sequencing.  
Source basis: `extension-3-cut-list-v0.1.0.md` plus repo/hash-session alignment, approved 3C cohabitation clarifications, and owner-approved downstream isolation notes for planned extension 4 TPV ownership. Extension 4 is not read as upstream canonical law for 3C and need not be present in the repo for 3C authoring.  
Rule: this file is an intake artifact, not yet canonical blueprint/spec law.

## Version note

This file supersedes prior 3C intake revisions and should be treated as the current authoritative 3C cut-list source for pre-authoring audit and blueprint/spec build preparation.

## Split intent

This split separates:
- foundational model-hardening work,
- subsystem-depth work,
- metadata-only exploratory cataloging,
- TPV recapture as a fully isolated package.

## Deterministic boundary note

Extension 3C is intended to be:
1. buildable as a metadata-only catalog pack,
2. mergeable independently,
3. testable independently,
4. testable in combined form after merge sequencing,
5. non-authoritative for runtime thermal math,
6. non-authoritative for packet-bound numeric execution,
7. non-preemptive with respect to downstream isolated packages that later take runtime ownership of other discovery concepts.

## Logging note

If final blueprint/spec authoring introduces new fields, runtime branches, or architecture logic not already declared here, that change must be logged as a diff/hole/additive/contra item before it becomes canonical.

# Extension 3C — Metadata-Only Exploratory Catalog Pack

## Scope

Extension 3C holds exploratory concepts that should remain visible in the repo without becoming runtime-bearing authority in the same merge lane as core thermal architecture fixes.

3C is a catalog-plus-appendix extension, not a runtime extension.

## In-scope items

### EXT-DISC-007 — GEO Scavenging / Ambient Collection Concept
- Keep as metadata-only exploratory catalog or appendix.
- No runtime thermal credit.
- No implied local atmosphere creation.
- Confidence should remain explicitly low unless upgraded by evidence.

### EXT-DISC-018 — Near-Field Radiative Transfer Concept
- Keep as metadata-only exploratory note.
- No runtime enhancement factor in base model.
- Requires separate evidence and architecture law before any numeric integration.

### EXT-DISC-019 — Osmotic / Chemical Gradient Cooling Concept
- Keep as metadata-only exploratory note.
- No runtime authority in current engine.
- Separate from canonical thermal rejection logic until evidence and architecture basis are established.

## Discovery identifier note

The EXT-DISC identifiers used here are inherited discovery identifiers from prior ideation lineage.

For 3C scope, only the following identifiers are in scope:
- EXT-DISC-007,
- EXT-DISC-018,
- EXT-DISC-019.

Absent identifier numbers do not imply missing 3C deliverables.

EXT-DISC-012 is explicitly out of 3C scope and reserved to the downstream isolated TPV package planned for extension 4. This reservation is advisory/out-of-scope boundary law for 3C and does not require an extension 4 repo artifact to exist at 3C authoring time.

## Purpose
- Preserve ideas without contaminating numeric authority.
- Prevent speculative concepts from riding into merge scope under the same governance lane as structural model fixes.
- Preserve concept visibility for future research, evidence capture, and later promotion review.
- Prevent 3C from pre-owning semantics that belong to downstream isolated packages.

## Cohabitation contract

### 3C READS from prior extensions and repo state
3C may read and depend on the following as upstream context only:
- `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`,
- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`,
- `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`,
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md`,
- `docs/blueprints/orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md`,
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1.md`,
- `docs/blueprints/orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.1.md`,
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3b-engineering-spec-v0.1.1.md`,
- `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md`,
- `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md`,
- existing catalog loader and conformance patterns already present in repo state,
- existing research evidence taxonomy and supporting catalogs already present in repo state.

3C does not read extension 4 as upstream canonical law.

3C may acknowledge extension 4 only as a downstream planned owner of TPV runtime/accounting/convergence semantics that are outside 3C scope.

### 3C EXTENDS in place
3C may extend only metadata-bearing and documentation-bearing surfaces required to host exploratory concepts, including:
- `ui/app/catalog-loader.js`,
- `tools/conformance/lint-schemas.mjs` only where needed to register or validate new metadata-only catalogs,
- `tools/conformance/validate-schemas.js` only where needed to register or validate new metadata-only catalogs,
- catalog/schema registration manifests or equivalent non-runtime catalog indexing surfaces,
- operator/research guides and implementation ledger surfaces where needed,
- read-only UI/report visibility surfaces where such visibility is explicitly non-authoritative.

### 3C REPLACES
3C replaces no runtime authority and no canonical numeric behavior.

During authoring, 3C may only replace prior draft versions of its own 3C blueprint/spec/cut-list artifacts as normal versioned document evolution.

### 3C IGNORES
3C does not modify or take authority over:
- `runtime/runner/*`,
- `runtime/formulas/*`,
- `runtime/validators/*`,
- packet execution authority,
- scenario execution authority,
- comparison numeric authority,
- baseline numeric ownership,
- extension 2 numeric ownership,
- extension 3A numeric ownership,
- extension 3B numeric ownership,
- TPV recapture runtime/accounting/convergence semantics,
- EXT-DISC-012 ownership,
- radiator recapture feedback semantics,
- onboard-use vs exported-power accounting semantics,
- rerun or iterative convergence semantics.

## Downstream isolated-package exclusion note

3C must not catalog, reserve, simulate, or partially-author TPV recapture behavior in a way that constrains extension 4.

3C must not define metadata contracts that imply:
- TPV promotion rules,
- TPV energy-accounting rules,
- TPV convergence rules,
- TPV radiator-size reduction semantics,
- TPV rerun-pass behavior,
- TPV export-vs-onboard disposition semantics.

Those semantics remain outside 3C scope and are reserved to the downstream isolated TPV package.

## Artifact family and location law

3C canonical implementation should be constrained to one or both of the following artifact families:
- metadata catalogs under existing catalog families and catalog schemas,
- appendix/documentation artifacts that are explicitly non-runtime and non-authoritative.

3C must not create a parallel runtime architecture.

Preferred locations are:
- `ui/app/catalogs/*` for exploratory concept catalogs,
- `schemas/catalogs/*` for metadata-only schema support if required,
- blueprint/spec appendices and supporting docs for explanatory or research-facing material.

## Schema separation and schema contract

3C must remain schema-separated from runtime-bearing packet/scenario/result objects.

3C should prefer reuse of existing catalog and evidence taxonomy patterns already present in the repo. If reuse is insufficient, any new schema must remain metadata-only and must not imply runtime promotion.

Any 3C concept entry should be designed to carry explicit non-authority markers, including the equivalent of:
- concept identifier,
- concept title,
- provenance/evidence class,
- maturity state,
- confidence state,
- output effect class set to metadata-only,
- research-required or promotion-required marker,
- notes/caveats,
- explicit statement that no current runtime authority exists.

Exact field names become blueprint/spec work, but the above semantic contract is mandatory.

### Prohibited 3C schema semantics
No 3C schema may include fields or semantics equivalent to:
- iteration count,
- convergence tolerance,
- non-convergence behavior,
- recaptured-power accounting,
- exported-power accounting,
- onboard-heat-return accounting,
- radiator-area-reduction authority,
- feedback-pass behavior,
- rerun behavior.

These are runtime/accounting/convergence semantics outside 3C scope.

## UI/render law

3C concepts may be visible only through read-only catalog/report/render surfaces.

3C concepts must not appear in any UI or emitted artifact in a way that implies:
- active runtime execution,
- numeric credit,
- active packet selection authority,
- active optimization authority,
- equivalence with baseline/3A/3B validated thermal architecture,
- hidden TPV-like runtime benefit,
- future isolated-package ownership has already been decided inside 3C.

## Rules
- Catalog-only or appendix-only.
- No packet field may imply active runtime use unless promoted into a future canonical extension.
- No runtime branch, validator, or formula may depend on 3C concepts in the current lane.
- Any promotion out of 3C requires explicit blueprint/spec update and logged justification.
- Any future promotion must establish evidence, architecture law, numeric scope, validation law, and ownership handoff before 3C concepts gain runtime authority.
- 3C must not preempt or partially author semantics that belong to downstream isolated packages.

## Minimum merge/test posture
- metadata file presence,
- schema separation from runtime-bearing objects,
- report/render visibility where desired,
- no runtime dependency on these items,
- schema/catalog conformance passes for all 3C metadata artifacts,
- no packet schema mutation that grants 3C runtime authority,
- no numeric change in baseline, extension 2, extension 3A, or extension 3B execution solely from the presence of 3C artifacts,
- no extension 4 TPV behavior implied or partially activated by the presence of 3C artifacts.

## Non-authority enforcement note

The existence of 3C artifacts in the repo must be non-interfering.

A repo containing 3C artifacts but no future promotion extension must continue to behave as though EXT-DISC-007, EXT-DISC-018, and EXT-DISC-019 are visible concepts only, not active thermal mechanisms.

## Extension 3C vs planned Extension 4 cohabitation note

3C does not read extension 4 as upstream law.

3C does not extend extension 4 surfaces.

3C does not replace extension 4 ownership.

3C explicitly ignores TPV recapture runtime/accounting/convergence semantics reserved to extension 4.
