# Orbital Thermal Trade System Model Extension 3C Engineering Spec v0.1.0

## Metadata

- Document Type: Canonical Engineering Spec
- Document Status: Draft for Owner Review
- Extension ID: 3C
- Canonical File Name: `docs/engineering-specs/orbital-thermal-trade-system-model-extension-3c-engineering-spec-v0.1.0.md`
- Governing Blueprint: `docs/blueprints/orbital-thermal-trade-system-model-extension-3c-blueprint-v0.1.0.md`
- Conflict Rule: If this spec conflicts with the governing 3C blueprint, the blueprint wins
- Implementation Posture: Metadata-only, schema-heavy, validation-heavy, pseudocode-heavy, non-interference enforced
- Scope Type: Catalog-plus-appendix law, not runtime-extension law

## 1. Purpose

This spec defines the exact implementation contract for Extension 3C as a metadata-only exploratory concept catalog. It converts the governing blueprint into concrete schema, validation, loader, UI visibility, and non-interference requirements.

This spec does not authorize runtime execution semantics.

## 2. Governing Constraints

The following are invariant:

1. 3C creates no runtime thermal credit.
2. 3C creates no runtime enhancement factor.
3. 3C creates no packet authority.
4. 3C creates no scenario execution authority.
5. 3C creates no numeric change in baseline, Extension 2, Extension 3A, or Extension 3B outputs.
6. 3C creates no hidden variables, equations, or state.
7. 3C creates no parallel thermal network.
8. 3C excludes TPV / `EXT-DISC-012` ownership.
9. 3C may surface read-only visibility only.
10. current output effect class for all 3C concepts is metadata-only.

## 3. Canonical 3C Domain Objects

### 3.1 Primary object class

The canonical 3C domain object is:

- `ExploratoryConceptCatalogEntry`

No other new authoritative 3C domain object class is permitted without a future blueprint/spec update.

### 3.2 Object family separation

`ExploratoryConceptCatalogEntry` is not equivalent to and must remain schema-separated from:

- packet objects
- scenario config objects
- runtime constants
- runtime formulas
- runtime transforms
- runner state
- result objects
- emission/accounting objects
- convergence objects
- TPV-related objects

## 4. Canonical Schema

## 4.1 TypeScript shape

    export type EvidenceClass =
      | "tier1_primary"
      | "tier2_analyst"
      | "tier3_technical_press"
      | "tier4_operator_discussion"
      | "tier5_model_inference";

    export type MaturityState =
      | "concept_only"
      | "early_theoretical"
      | "bench_principle"
      | "prototype_candidate"
      | "research_watch";

    export type ConfidenceState =
      | "low"
      | "low_medium"
      | "medium"
      | "medium_high"
      | "high";

    export type OutputEffectClass =
      | "metadata_only_no_runtime_effect";

    export type PromotionRequirement =
      | "future_canonical_extension_required";

    export type RenderVisibility =
      | "hidden"
      | "catalog_read_only"
      | "appendix_read_only"
      | "catalog_and_appendix_read_only";

    export interface ExploratoryConceptCatalogEntry {
      schema_version: "3c-1";
      extension_id: "3c";
      concept_id: "EXT-DISC-007" | "EXT-DISC-018" | "EXT-DISC-019";
      title: string;
      short_label: string;
      summary: string;
      provenance_evidence_class: EvidenceClass;
      provenance_sources: string[];
      maturity_state: MaturityState;
      confidence_state: ConfidenceState;
      output_effect_class: OutputEffectClass;
      promotion_requirement: PromotionRequirement;
      no_current_runtime_authority: true;
      render_visibility: RenderVisibility;
      caveats: string[];
      notes: string[];
      explicit_non_goals: string[];
      tpv_exclusion_acknowledged: true;
      downstream_owner_hint?: "planned_extension_4";
      tags?: string[];
    }

## 4.2 Field law

| Field | Required | Type | Allowed / Rule | Default |
|---|---:|---|---|---|
| `schema_version` | yes | literal | must equal `3c-1` | none |
| `extension_id` | yes | literal | must equal `3c` | none |
| `concept_id` | yes | enum | one of `EXT-DISC-007`, `EXT-DISC-018`, `EXT-DISC-019` | none |
| `title` | yes | string | 1..160 chars | none |
| `short_label` | yes | string | 1..64 chars | none |
| `summary` | yes | string | 1..1500 chars, descriptive only | none |
| `provenance_evidence_class` | yes | enum | evidence tier only | none |
| `provenance_sources` | yes | string[] | at least 1 source token or citation label | none |
| `maturity_state` | yes | enum | see schema enum | none |
| `confidence_state` | yes | enum | see schema enum | none |
| `output_effect_class` | yes | enum | must equal `metadata_only_no_runtime_effect` | none |
| `promotion_requirement` | yes | enum | must equal `future_canonical_extension_required` | none |
| `no_current_runtime_authority` | yes | literal true | must equal `true` | none |
| `render_visibility` | yes | enum | read-only options only | `catalog_read_only` |
| `caveats` | yes | string[] | may be empty, but field must exist | `[]` |
| `notes` | yes | string[] | may be empty, but field must exist | `[]` |
| `explicit_non_goals` | yes | string[] | must include at least packet/runtime/no-credit exclusions | none |
| `tpv_exclusion_acknowledged` | yes | literal true | must equal `true` | none |
| `downstream_owner_hint` | no | literal | if present, must equal `planned_extension_4` | omitted |
| `tags` | no | string[] | descriptive only | omitted |

## 4.3 Semantic invariants

For every `ExploratoryConceptCatalogEntry`:

- `output_effect_class` must be `metadata_only_no_runtime_effect`
- `promotion_requirement` must be `future_canonical_extension_required`
- `no_current_runtime_authority` must be `true`
- `tpv_exclusion_acknowledged` must be `true`
- `summary` must not claim active numeric benefit
- `explicit_non_goals` must include at least:
  - no runtime thermal credit
  - no packet authority
  - no scenario execution authority
  - no numeric output mutation

## 5. Catalog Collection Contract

### 5.1 Collection type

The canonical collection object is:

    export interface ExploratoryConceptCatalog {
      schema_version: "3c-catalog-1";
      extension_id: "3c";
      entries: ExploratoryConceptCatalogEntry[];
    }

### 5.2 Collection invariants

- `entries.length` must equal 3 at initial 3C release
- duplicate `concept_id` values are forbidden
- missing any of the three required concept IDs is forbidden
- extra concept IDs are forbidden in initial 3C release unless future canonical law expands scope

## 6. Initial Required Entries

The initial release must include exactly one entry for each:

- `EXT-DISC-007`
- `EXT-DISC-018`
- `EXT-DISC-019`

No inferred entries are allowed.

## 7. Prohibited Semantics Filter

No 3C schema, UI view model, result object, report field, or catalog entry may introduce semantics equivalent to:

- `iteration_count`
- `convergence_tolerance`
- `non_convergence_behavior`
- `recaptured_power_*`
- `exported_power_*`
- `onboard_heat_return_*`
- `radiator_area_reduction_*`
- `feedback_pass_*`
- `rerun_behavior_*`
- any hidden runtime authority

## 8. Intended Repo Target Families

These are intended target families only. They are not implementation authority until tree audit confirms exact paths.

### 8.1 Candidate additive files

- `schemas/exploratory-concept-catalog.schema.json`
- `schemas/exploratory-concept-catalog-entry.schema.json`
- `docs/catalogs/exploratory-concepts-extension-3c.json`
- `docs/appendices/exploratory-concepts-extension-3c.md`
- `runtime/validators/exploratory-concept-catalog-noninterference.ts`
- `runtime/validators/exploratory-concept-catalog-schema.ts`
- `ui/app/catalog/exploratoryConcepts.ts`
- `ui/app/components/ExploratoryConceptCatalogPanel.tsx`

### 8.2 Candidate patch targets

- docs index or registry files
- UI navigation or route registry files
- schema export index files
- validator aggregation files

### 8.3 Stop-on-diff rule

If any candidate file path does not map to actual repo tree truth, the build agent must stop and log a DIFF before proceeding.

## 9. Validation Rules

## 9.1 Schema validation

For each entry:

1. validate required fields present
2. validate enum membership
3. validate literal-true markers
4. validate `concept_id` membership in allowed 3C set
5. validate absence of prohibited runtime fields
6. validate summary language does not contain active-runtime claim tokens where parser rules are defined

### 9.2 Collection validation

1. validate `entries.length === 3`
2. validate each required concept ID present exactly once
3. validate no extra concept IDs
4. validate all entries are 3C entries
5. validate all output effect classes equal metadata-only

### 9.3 UI visibility validation

1. only read-only visibility options allowed
2. no action binding for activation, selection, enablement, or scenario injection
3. no result-binding to numeric summary widgets
4. no write path from UI state into runtime packet or scenario objects

## 10. Non-Interference Law

3C presence must produce zero numeric delta in all pre-existing canonical execution paths.

### 10.1 Required comparison sets

Run canonical scenario sets for:

- baseline
- Extension 2
- Extension 3A
- Extension 3B

### 10.2 Comparison mode

For each scenario set:

- execute once in control mode without 3C data loaded
- execute once with 3C catalog data loaded and read-only UI/catalog enabled
- compare all numeric outputs
- compare all packet objects
- compare all result objects
- compare all exported summary metrics

### 10.3 Required result

All compared numeric and operative structures must be identical except for descriptive catalog-presence metadata that is explicitly outside runtime results.

## 11. Conformance Pseudocode

### 11.1 Loader pseudocode

    function loadExploratoryConceptCatalog(rawCatalog):
      assert rawCatalog.schema_version == "3c-catalog-1"
      assert rawCatalog.extension_id == "3c"
      assert length(rawCatalog.entries) == 3

      requiredIds = set(["EXT-DISC-007", "EXT-DISC-018", "EXT-DISC-019"])
      seenIds = emptySet()

      for entry in rawCatalog.entries:
        validateExploratoryConceptCatalogEntry(entry)
        assert entry.concept_id not in seenIds
        add entry.concept_id to seenIds

      assert seenIds == requiredIds

      return freeze(rawCatalog)

### 11.2 Entry validation pseudocode

    function validateExploratoryConceptCatalogEntry(entry):
      assert entry.schema_version == "3c-1"
      assert entry.extension_id == "3c"
      assert entry.concept_id in ["EXT-DISC-007", "EXT-DISC-018", "EXT-DISC-019"]
      assert entry.output_effect_class == "metadata_only_no_runtime_effect"
      assert entry.promotion_requirement == "future_canonical_extension_required"
      assert entry.no_current_runtime_authority == true
      assert entry.tpv_exclusion_acknowledged == true

      prohibitedKeys = [
        "iteration_count",
        "convergence_tolerance",
        "non_convergence_behavior",
        "recaptured_power",
        "exported_power",
        "onboard_heat_return",
        "radiator_area_reduction",
        "feedback_pass",
        "rerun_behavior"
      ]

      for key in keys(entry):
        for prohibitedKey in prohibitedKeys:
          assert not key startsWith prohibitedKey

      assert isArray(entry.provenance_sources)
      assert length(entry.provenance_sources) >= 1
      assert isArray(entry.caveats)
      assert isArray(entry.notes)
      assert isArray(entry.explicit_non_goals)
      assert containsRequiredNonGoals(entry.explicit_non_goals)

### 11.3 Read-only UI projection pseudocode

    function projectExploratoryConceptForUI(entry):
      return {
        conceptId: entry.concept_id,
        title: entry.title,
        shortLabel: entry.short_label,
        summary: entry.summary,
        evidenceClass: entry.provenance_evidence_class,
        maturityState: entry.maturity_state,
        confidenceState: entry.confidence_state,
        renderVisibility: entry.render_visibility,
        caveats: entry.caveats,
        notes: entry.notes,
        activeRuntimeEffect: false,
        selectable: false,
        scenarioInjectable: false
      }

### 11.4 Runtime isolation pseudocode

    function ensureCatalogDoesNotEnterRuntimePacket(packet, catalog):
      assert packet does not contain "exploratoryConcepts"
      assert packet does not contain any catalog concept_id as active selector
      return packet

    function ensureCatalogDoesNotAlterScenarioConfig(config, catalog):
      assert config has no fields derived from catalog entries
      return config

    function ensureCatalogDoesNotAlterResults(results, catalog):
      assert results contain no credited runtime metric from catalog
      return results

### 11.5 Non-interference test pseudocode

    function assertNonInterference(runControl, runWithCatalog):
      assert deepNumericEqual(runControl.outputs, runWithCatalog.outputs)
      assert deepEqual(runControl.packets, runWithCatalog.packets)
      assert deepEqual(runControl.results, runWithCatalog.results)
      return true

## 12. UI and Report Visibility Rules

### 12.1 Allowed UI displays

Allowed:

- catalog table
- appendix card
- evidence tag panel
- caveat banner
- maturity/confidence display
- promotion-required notice

### 12.2 Forbidden UI displays

Forbidden:

- toggle to enable concept in scenario
- slider/input to set concept performance
- computed thermal credit from concept
- result widget claiming runtime effect
- packet selection UI bound to 3C concept IDs

### 12.3 Allowed report displays

Allowed:

- appendix section listing concept metadata
- report footnote stating metadata-only status
- evidence/provenance summary
- future-promotion-required note

### 12.4 Forbidden report displays

Forbidden:

- ROI or performance delta attributed to 3C concept
- radiator area reduction claim attributed to 3C concept
- onboard heat return credited to 3C concept
- TPV ownership implication

## 13. Result and Export Behavior

3C data may be exported only as descriptive catalog metadata. It may not be embedded into runtime result objects in a way that implies operative model state.

Permitted export families:

- standalone catalog export
- appendix export
- evidence ledger reference
- UI cache for read-only rendering

Forbidden export families:

- runtime packet export
- scenario active-config export
- performance result export
- accounting/convergence export

## 14. Error Handling and Stop Conditions

Stop and log hard failure when any of the following occur:

- actual repo tree differs from required path assumption
- a named target file already exists with incompatible content or role
- 3C data introduces prohibited field names
- any UI binding permits active selection
- any numeric output changes under 3C-presence comparison
- TPV semantics appear inside 3C schema or UI
- a required concept ID is missing or duplicated

## 15. Build-Agent Pre-Build Audit Procedure

Before implementation, builder must recursively inventory at least:

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

The inventory output must be appended to the build issue log before source changes begin.

No implementation may proceed until owner sign-off is achieved on the inventory and any resulting DIFF items.

## 16. Minimal Example Entry Skeletons

### 16.1 `EXT-DISC-007`

    {
      "schema_version": "3c-1",
      "extension_id": "3c",
      "concept_id": "EXT-DISC-007",
      "title": "GEO Scavenging / Ambient Collection",
      "short_label": "GEO Scavenging",
      "summary": "Exploratory concept entry preserved as metadata only. No current runtime thermal credit or scenario authority is granted.",
      "provenance_evidence_class": "tier5_model_inference",
      "provenance_sources": ["ext-disc-007-lineage"],
      "maturity_state": "concept_only",
      "confidence_state": "low",
      "output_effect_class": "metadata_only_no_runtime_effect",
      "promotion_requirement": "future_canonical_extension_required",
      "no_current_runtime_authority": true,
      "render_visibility": "catalog_and_appendix_read_only",
      "caveats": ["No active runtime authority under Extension 3C."],
      "notes": ["Preserved for exploratory lineage only."],
      "explicit_non_goals": [
        "no runtime thermal credit",
        "no packet authority",
        "no scenario execution authority",
        "no numeric output mutation"
      ],
      "tpv_exclusion_acknowledged": true,
      "downstream_owner_hint": "planned_extension_4"
    }

### 16.2 `EXT-DISC-018` and `EXT-DISC-019`

Apply the same field law, changing only concept-specific descriptive metadata. No concept-specific numeric fields are allowed.

## 17. Blueprint Fallback Holes

### Hole 3C-SP-001 — actual repo path truth unavailable during authoring

Fallback:
Use intended target families only. Exact implementation path selection is deferred to pre-build audit.

Blueprint authority source:
3C blueprint `File and Tree Truth Policy`.

### Hole 3C-SP-002 — exact existing schema/export aggregation files unknown

Fallback:
Builder must stop on first mismatch, log DIFF, and seek owner sign-off rather than improvising file placement.

Blueprint authority source:
3C blueprint `READS / EXTENDS / REPLACES / IGNORES / DELETES Classification` and `Controls and Gates`.

## 18. Canonical Outcome

A conforming Extension 3C implementation is one in which:

- all three concept entries exist in canonical metadata form
- all 3C schema invariants pass
- any UI/report visibility remains read-only
- no packet/scenario/result/runtime authority is introduced
- all pre-existing numeric outputs remain unchanged
- TPV ownership remains outside 3C
