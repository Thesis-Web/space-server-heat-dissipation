# Extension 3B Blueprint and Spec Drift Review Log v0.1.0

Reviewer: Claude (build agent — Session 5 close-out)
Date: 2026-03-22
Source files reviewed:
- `orbital-thermal-trade-system-model-extension-3b-blueprint-v0.1.0.md`
- `orbital-thermal-trade-system-model-extension-3b-engineering-spec-v0.1.0.md`
- `extension-3b-authoring-assembly-log-v0.1.0.md`
Repo ground truth: `space-server-heat-dissipation-main` (GitHub zip, post-3A commit ddb3319)

---

## VERDICT SUMMARY

Blueprint: **SOLID** — architecture, law sections, cohabitation matrix, and scope
boundaries are well-constructed. Four issues require correction before build.

Spec: **GOOD WITH GAPS** — seven issues require correction before build.
Two are blocking (build will drift or fail immediately without them).
Five are high (build will produce incorrect or unvalidatable artifacts).

No issues that invalidate the overall approach. All are correctable in a
spec patch document before the build session begins.

---

## CRITICAL ISSUES — Spec (build blocks immediately without these)

---

### DIFF-3B-REVIEW-001 — default-expander.ts missing from §4.2 patch list

**Type:** diff
**Spec ref:** §4.2 (Runtime files — patch list)
**Blueprint ref:** §13 (pre-build inventory gate)

**Finding:**
`runtime/transforms/default-expander.ts` is not listed in the spec §4.2 patch
file table, but 3B introduces at least 12 new optional fields across thermal-zone
and scenario that require runtime default injection:
- `vault_gas_environment_model.mode` → default `none`
- `transport_implementation.mode` → default `none`
- `transport_implementation.gas_management_mode` → default `not_applicable`
- `operating_state.current_state` → default `sunlit`
- `loop_model` defaults
- All null-default numeric fields on new nested objects

The 3A build established that `default-expander.ts` is the canonical home for
all default injection (dist-tree patch v0.4.2 §6, spec §12). Skipping it means
all 3B optional fields will be `undefined` at runtime instead of their declared
defaults — causing validation failures on every 3B run.

**Why build breaks:** validator and formula code will receive `undefined` where
the spec declares a default value. All 3B validation rules in §13 will fail.

**Required fix:** Add `runtime/transforms/default-expander.ts` to spec §4.2
patch list with explicit call-out: "add expand3BDefaults() following 3A
expand3ADefaults() pattern."

**Downstream systems affected:** All 3B validators, all 3B formula resolution,
defaults_applied[] output in extension_3b_result.

---

### DIFF-3B-REVIEW-002 — tools/conformance/lint-schemas.mjs classified IGNORES but requires patch

**Type:** diff
**Blueprint ref:** §14.2 cohabitation matrix (lint-schemas.mjs = IGNORES)
**Spec ref:** §4.1 (new catalog schemas), §4.3 (new catalog data files)

**Finding:**
Blueprint §14.2 classifies `tools/conformance/lint-schemas.mjs` as IGNORES.
However, spec §4.1 declares three new catalog schemas and spec §4.3 declares
three new catalog data files:

Catalog data files that will appear in `ui/app/catalogs/`:
- `vault-gas-environment-presets.v0.1.0.json`
- `transport-implementation-presets.v0.1.0.json`
- `eclipse-state-presets.v0.1.0.json`

The linter validates every `.json` in `ui/app/catalogs/` against the
`CATALOG_SCHEMA_MAP`. Without entries for these three catalog IDs, all three
will show `skip [no-schema-map]` — same gap that existed for working-fluids
and pickup-geometries in 3A (fixed in this session).

**Current CATALOG_SCHEMA_MAP keys confirmed in repo:** 14 entries. None of the
three 3B catalog IDs are present.

**Why build breaks:** `npm run lint:schemas` will report skips for all three
new 3B catalogs. This breaks the conformance gate and means catalog data
is never validated.

**Required fix:**
1. Change blueprint §14.2 classification of `tools/conformance/lint-schemas.mjs`
   from IGNORES to EXTENDS.
2. Add to spec §4.2 patch list: `tools/conformance/lint-schemas.mjs` — add
   three new CATALOG_SCHEMA_MAP entries following the 3A pattern from this
   session.
3. Note: catalog data IDs must match `catalog_id` field inside the JSON files.
   Confirm the three catalog IDs before patching the map.

**Downstream systems affected:** `npm run lint:schemas` gate, CI gate.

---

## HIGH ISSUES — Spec (build will produce incorrect or ambiguous artifacts)

---

### DIFF-3B-REVIEW-003 — working-fluid nominal_ fields duplicate existing basis_ and default_ fields

**Type:** diff
**Spec ref:** §7 (Working-fluid additions)
**Blueprint ref:** §5.3 (numeric ownership law)

**Finding:**
Spec §7 proposes adding `nominal_density_kg_per_m3` and `nominal_cp_j_per_kg_k`
to the working-fluid schema. The actual schema (v0.2.0) already contains:

- `density_basis_kg_per_m3` — "Density basis kg/m³. Intrinsic. §7.1."
- `cp_basis_j_per_kgk` — "Specific heat capacity basis J/kg/K. Intrinsic. §7.1."
- `default_density_kg_per_m3` — "LEGACY: baseline density field. Use density_basis_kg_per_m3 for 3A."
- `default_cp_j_per_kgk` — "LEGACY: baseline cp field. Use cp_basis_j_per_kgk for 3A."

The schema has `additionalProperties: false`. Adding `nominal_` variants of
fields that already exist under `basis_` names creates a three-way naming family
(legacy `default_`, canonical `basis_`, new `nominal_`) for the same physical
properties. This will cause:
- Operator confusion about which field to use
- Pump parasitic formula drift (§11.3 says use `resolved_density` — which field
  does that resolve from?)
- Builder will have to guess which field the formula reads

**Required fix:**
Spec §7 must be corrected to read:
"3B pump parasitic pressure-drop derivation shall use `density_basis_kg_per_m3`
from the resolved working-fluid object as the canonical density source.
No new nominal_ density or cp field is added. If `density_basis_kg_per_m3`
is null, block with a validation error."

If a distinct override field is truly needed (e.g., zone-level density override),
it belongs on `transport_implementation.fluid_density_kg_per_m3_override` (which
the spec already declares at §6.2 — correct placement). Remove the working-fluid
nominal_ fields from §7.

**Downstream systems affected:** pump parasitic formula §11.3, working-fluid
catalog entries, density resolution order §12.2, lint-schemas gate.

---

### DIFF-3B-REVIEW-004 — bubble_blanketing_penalty_fraction range [0,5] is physically unsound

**Type:** diff
**Spec ref:** §6.2 (transport_implementation field table), §11.4 (bubble resistance addition)
**Blueprint ref:** §10.2 (bubble tolerance law)

**Finding:**
Spec §6.2 declares `bubble_blanketing_penalty_fraction` with allowed range `[0,5]`.
Spec §11.4 uses it as:
`r_bubble_penalty_k_per_w = r_loop_to_sink_base * bubble_blanketing_penalty_fraction`

A penalty fraction of 5 means the effective loop resistance is 6× the base value
(1 + 5 = 6×). This implies a 500% resistance increase from bubble blanketing —
physically extreme and likely to produce absurd temperature results without
any flag or block. A fraction greater than 1 means "bubbles more than doubled
the resistance." That is a legitimate severe scenario but should trigger
a mandatory warning at minimum, not be silently accepted up to 5.

**Required fix:**
Option A: Tighten range to `[0,1]` and document that values > 0.5 should
auto-emit a high-severity warning. If >100% resistance increase is genuinely
needed, require it to be declared via custom mode with explicit justification.

Option B: Keep `[0,5]` but add a validation rule: any value > 1.0 must emit
a `review` severity flag and note it in the transform trace. Add this to §13.3.

The spec must also clarify what units this is — it reads as a multiplier on
`r_loop_to_sink_base`, not a standalone resistance. The field name
`_fraction` implies `[0,1]`. If it can exceed 1 it should be called
`_multiplier` or `_factor`.

**Downstream systems affected:** §11.4 equation, §13.3 validation rules,
extension_3b_result.loop_resistance_adjustments, flag emission.

---

### DIFF-3B-REVIEW-005 — Spec §14 result bypass structure not specified for disabled path

**Type:** diff
**Spec ref:** §14 (Required additive result structure), §15.1 (normalization pseudocode)
**Blueprint ref:** §4.3 (result-object law)

**Finding:**
The 3A runner establishes a critical pattern: when `enable_model_extension_3a=false`,
the runner returns a full valid result object with `extension_3a_enabled=false`
and all required fields set to clean bypass values (empty arrays, nulls, safe
defaults). This ensures the caller never receives undefined fields even on bypass.

Spec §14 defines the `extension_3b_result` fields but does not specify what
values each field takes when `extension_3b_enabled=false` (the bypass path).
Spec §15.1 only says "return disabled result" without defining the shape.

Without explicit bypass values, the builder will either:
(a) return a minimal object missing required fields — breaking type safety, or
(b) invent bypass values — violating Rule 8 (no guessing).

**Required fix:**
Add a §14.1 bypass table to the spec explicitly mapping every `extension_3b_result`
field to its bypass value. Follow the exact 3A pattern from
`run-extension-3a.ts` lines 219–250. Minimum bypass values needed:
- `extension_3b_enabled: false`
- `model_extension_3b_mode: 'disabled'`
- All array fields: `[]`
- All object fields: `null`
- `q_dot_total_reject_3b_w: null`
- `blocking_errors: []`
- `warnings: []`
- `transform_trace: [<bypass message>]`

**Downstream systems affected:** `run-extension-3b.ts` implementation,
`run-packet.ts` dispatch, all downstream consumers of extension_3b_result.

---

### DIFF-3B-REVIEW-006 — emitters classification IGNORES is incomplete for 3B result

**Type:** diff
**Blueprint ref:** §14.2 cohabitation matrix (runtime/emitters/* = IGNORES)
**Spec ref:** §14 (result structure includes transform_trace, blocking_errors, warnings)

**Finding:**
Blueprint §14.2 classifies all `runtime/emitters/*` as IGNORES. The 3A build
created `topology-report.ts` as a new emitter for the topology report output.

3B produces `extension_3b_result` with per-zone arrays and operating-state
effects. The spec §14 result structure includes `transform_trace`, `blocking_errors`,
and `warnings` — but does not declare whether these are emitted via
`flag-emitter.ts` (which handles 3A warning flags) or handled inside the
runner only.

Specifically:
- `flag-emitter.ts` is the established home for warning and review flags.
  If 3B adds new flag types (bubble risk, gas lock, TEG optimism), they
  belong in `flag-emitter.ts` — but that file is classified IGNORES.
- `packet-metadata-emitter.ts` carries artifact metadata. If 3B adds
  catalog provenance to the packet, it likely needs a patch here too.

**Required fix:**
Blueprint §14.2 must explicitly resolve the emitter question.
Recommended correction:
- `runtime/emitters/flag-emitter.ts` → EXTENDS (add 3B warning flag types)
- `runtime/emitters/packet-metadata-emitter.ts` → EXTENDS (add 3B catalog
  provenance metadata entries)
- `runtime/emitters/*` (others) → IGNORES (unchanged)

The blanket IGNORES classification is too coarse for the emitter family.

**Downstream systems affected:** flag emission for bubble risk, gas lock,
TEG optimism flags; packet metadata provenance tracking.

---

### HOLE-3B-REVIEW-001 — 3B runner needs 3A context input — input interface not specified

**Type:** hole
**Spec ref:** §15.2 (execution flow pseudocode), §15.3 (run-packet dispatcher patch)
**Blueprint ref:** §4.1 (dependency law), §4.3 (result-object law)

**Finding:**
Spec §15.3 shows the dispatcher calling:
```
runExtension3B(
  scenario=input.extension_3b_input.scenario,
  catalogs=input.extension_3b_input.catalogs,
  baseline_or_3a_context={
    extension_3a_result,
    radiator_result,
    aggregation_result
  }
)
```

This is architecturally correct but the spec does not define the
`Extension3BInput` interface (analogous to `Extension3AInput` in
`run-extension-3a.ts`). Specifically:

1. What is the exact shape of `extension_3b_input` on `RunPacketInput`?
2. What fields does `baseline_or_3a_context` contain and what are their types?
3. How does the runner access `r_loop_to_sink_k_per_w` from the 3A
   resistance chain — via `extension_3a_result.resistance_chain_totals`
   (per-zone map) or via the raw zone objects in the input?

The 3A runner input interface is fully defined in the spec (§4.1 of 3A spec
and implemented in `run-extension-3a.ts` lines 41–69). Without the equivalent
for 3B the builder must invent the interface structure.

**Best-solve direction:**
Spec §4.2 should add a TypeScript-style interface block for `Extension3BInput`
and `Extension3BContext` following the 3A pattern. At minimum:
```
Extension3BInput {
  scenario: Record<string, unknown>  // full scenario with 3B fields
  radiators: Array<Record<string, unknown>>
  catalogs: Extension3BCatalogInput
}
Extension3BCatalogInput {
  vault_gas_environment_preset_catalog: { catalog_id, catalog_version, entries[] }
  transport_implementation_preset_catalog: { catalog_id, catalog_version, entries[] }
  eclipse_state_preset_catalog: { catalog_id, catalog_version, entries[] }
}
Extension3BContext {
  extension_3a_result: Extension3AResult | undefined
  radiator_result: ...  (from run-packet)
  aggregation_result: ... (from run-packet)
}
```

**Why needed:** Without this the builder must infer the interface from the
pseudocode — that is guessing, which is prohibited by Rule 8.

**Downstream systems affected:** `run-extension-3b.ts` implementation,
`run-packet.ts` RunPacketInput interface extension, all 3B tests that
construct runner inputs.

---

## INFORMATIONAL ITEMS — No blocking action required before build, but
## must be logged and confirmed before implementation reaches the affected section

---

### INFO-3B-REVIEW-001 — r_loop_to_sink_base source path should be pinned in §11.6

**Spec ref:** §11.6 (Effective 3B loop resistance)

Spec §11.6 states:
"`r_loop_to_sink_base` = existing 3A `r_loop_to_sink_k_per_w`"

The actual 3A resistance chain result in `extension_3a_result.resistance_chain_totals`
is a map keyed by `zone_id` with `{ r_total_k_per_w, t_junction_k }` — it does
NOT individually expose `r_loop_to_sink_k_per_w`. The per-term breakdown is
computed internally in `resistance-chain.ts` but only `r_total` is in the
published result.

To read the base `r_loop_to_sink_k_per_w` the 3B runner must read it from
the raw zone input object (`zone.resistance_chain.r_loop_to_sink_k_per_w`),
not from the 3A result object. Spec §11.6 should pin this explicitly.

No structural change required — just a clarification in the spec text.

---

### INFO-3B-REVIEW-002 — HOLE-3B-001 approval status

**Authoring assembly log ref:** HOLE-3B-001
**Blueprint ref:** §7 (best-solve placement)

HOLE-3B-001 (nested sub-objects vs new top-level schema families) is correctly
documented in the assembly log and in blueprint §7. The assembly log correctly
notes this requires owner approval before implementation becomes canonical.

Confirmed from repo inspection: all five patch-target schemas have
`additionalProperties: false`. This means the builder MUST add the new nested
3B object properties explicitly to each schema's `properties` block before
any document containing those fields will validate. The placement decision
(nested vs top-level) is locked by HOLE-3B-001 approval — do not start
the schema patch step until that approval is recorded.

No action required before build starts, but the approval must be confirmed
at build session open.

---

### INFO-3B-REVIEW-003 — ADDITIVE-3B-002 TEG cap heuristic confirmed reasonable

**Spec ref:** §8.1 (TEG heuristic declaration)

`teg_carnot_fraction_cap = 0.20` is conservative and physically defensible
for a thermal model heuristic. The declaration that it is a model heuristic,
not a flight-certainty claim, is correct and sufficient. No change needed.
Owner has been informed per assembly log. This item is clean.

---

### INFO-3B-REVIEW-004 — Spec §2 ground truth snapshot matches repo exactly

**Spec ref:** §2 (Repo-state ground truth snapshot)

All 36 runtime files listed in spec §2.1 were verified against the fresh
GitHub repo zip. All present. Zero mismatches. The pre-build inventory
gate in blueprint §13.1 and spec §18 will pass cleanly for all listed files
when the build session opens.

---

## ISSUE SUMMARY TABLE

| ID | Type | Severity | Section | One-line summary |
|---|---|---|---|---|
| DIFF-3B-REVIEW-001 | diff | CRITICAL | Spec §4.2 | default-expander.ts missing from patch list |
| DIFF-3B-REVIEW-002 | diff | CRITICAL | Blueprint §14.2, Spec §4.2 | lint-schemas.mjs classified IGNORES but needs CATALOG_SCHEMA_MAP patch |
| DIFF-3B-REVIEW-003 | diff | HIGH | Spec §7 | nominal_ density/cp fields duplicate existing basis_ fields |
| DIFF-3B-REVIEW-004 | diff | HIGH | Spec §6.2, §11.4 | bubble_blanketing_penalty_fraction range [0,5] is unsound; name implies fraction |
| DIFF-3B-REVIEW-005 | diff | HIGH | Spec §14, §15.1 | disabled/bypass result values not specified |
| DIFF-3B-REVIEW-006 | diff | HIGH | Blueprint §14.2 | emitters/* IGNORES classification too coarse — flag-emitter and packet-metadata-emitter need EXTENDS |
| HOLE-3B-REVIEW-001 | hole | HIGH | Spec §15.2, §15.3 | Extension3BInput interface not defined — builder must not invent it |
| INFO-3B-REVIEW-001 | info | LOW | Spec §11.6 | r_loop_to_sink_base source path should be pinned |
| INFO-3B-REVIEW-002 | info | LOW | HOLE-3B-001 | Nested placement approval required before schema patch step |
| INFO-3B-REVIEW-003 | info | LOW | Spec §8.1 | TEG cap heuristic confirmed reasonable |
| INFO-3B-REVIEW-004 | info | LOW | Spec §2 | Ground truth snapshot verified exact match |

---

## REQUIRED PRE-BUILD ACTIONS

Before a build session opens on 3B, the blueprint/spec authors must resolve:

1. **DIFF-3B-REVIEW-001** — Add `default-expander.ts` to spec §4.2 patch list
2. **DIFF-3B-REVIEW-002** — Change `lint-schemas.mjs` to EXTENDS in blueprint §14.2,
   add to spec §4.2 patch list
3. **DIFF-3B-REVIEW-003** — Remove `nominal_density_kg_per_m3` and
   `nominal_cp_j_per_kg_k` from spec §7; pin density resolution to
   `density_basis_kg_per_m3` in §12.2
4. **DIFF-3B-REVIEW-004** — Clarify or tighten `bubble_blanketing_penalty_fraction`
   range and rename if it can exceed 1.0
5. **DIFF-3B-REVIEW-005** — Add explicit bypass result table to spec §14
6. **DIFF-3B-REVIEW-006** — Correct blueprint §14.2 emitter classification
7. **HOLE-3B-REVIEW-001** — Add `Extension3BInput` and `Extension3BContext`
   interface definitions to spec §4.2 or a new §4.5
8. Confirm owner approval of **HOLE-3B-001** (nested placement) is recorded
   before the build session starts schema patching

The 2 CRITICAL items (001, 002) will cause immediate build failure or gate
failure if not resolved. The 5 HIGH items (003–006, HOLE-001) will cause
drift, incorrect results, or Rule 8 violations during implementation.

---

## WHAT IS CLEAN — NO ACTION NEEDED

- Blueprint architecture (§3–§5): sound
- Cohabitation matrix (§14): correct except emitter classification and linter
- Terminology and nomenclature (§6): correct and consistent
- Scope boundaries (§3): well-drawn
- Dispatcher order law (§4.2): correct
- Result-object separation law (§4.3): correct
- Pre-build inventory gate (§13.1): correctly specified
- HOLE-3B-001 best-solve documented: correct
- ADDITIVE-3B-002 TEG cap: reasonable and declared
- Spec §2 ground truth: accurate
- All three nested object schemas (§6.1, §6.2, §6.3): well-structured
- Preset catalog contracts (§10): complete and consistent
- Core equations (§11.1–§11.9): logically sound except bubble range issue
- Validation rules (§13): complete except bypass path gap
- Test posture (§17): adequate minimum coverage declared
- Stop conditions (§18): correctly specified
