# Extension 3A — Dist Tree Analysis and Spec Patch v0.4.2

## Document Control

- Type: Targeted spec patch + dist tree analysis
- Applies to: `orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1.md`
- Produces: spec v0.4.2 (Z increment — §4.3 corrected, §17 corrected, no new architecture added)
- Status: pending owner approval
- Companion log update: `extension-3a-authoring-issue-log-v0.2.1.md`

---

## Dist Tree Analysis

The actual dist tree is significantly richer than HOLE-001 assumed. Below is the complete inventory
with implications for 3A.

### dist/runtime/constants/
- `constants.js / .d.ts`
  - Implication: sigma and other physical constants are already extracted into a constants module.
    The 3A spec declares `sigma = 5.670374419e-8` as a literal in §11. The implementation must
    import from this module instead of re-declaring. No spec change required — the equations are
    correct — but the builder must not re-declare sigma as a formula-local constant.

### dist/runtime/formulas/
- `radiation.js / .d.ts` — **already exists**
  - Implication: the 3A radiator math patches an existing module, not a new file.
    Spec §4.3 listed `runtime/formulas/radiator-3a.ts` as if it were a new standalone file.
    That is wrong. The correct call is a patch to the existing `radiation.ts` source.
- `exergy.js`, `heat-exchanger.js`, `heat-pump.js`, `heat-transport.js`,
  `loads.js`, `power-cycle.js`, `storage.js` — present but not patched by 3A.
  Implication: 3A does not touch these.

### dist/runtime/transforms/
- `default-expander.js / .d.ts` — **already exists**
  - Implication: default expansion is an existing module. 3A must patch this module, not create
    a new `defaults.ts` validator. Spec §4.3 listed `runtime/validators/defaults.ts` — that is
    wrong. The correct call is a patch to `transforms/default-expander.ts`.
- `catalog-resolution.js / .d.ts` — **already exists**
  - Implication: catalog resolution is an existing module. The working-fluid and pickup-geometry
    catalog refs must be wired into this module, not a new catalog resolver. Spec §4.3 did not
    list this file at all. That is a gap.
- `extension-2-normalizer.js / .d.ts` — **already exists, pattern-defining**
  - Implication: the 3A normalizer should follow this naming and structure convention:
    `transforms/extension-3a-normalizer.ts`. Spec §4.3 listed
    `transforms/topology-normalizer.ts` — that name breaks the established pattern.
- `load-state-resolver.js`, `scenario-aggregation.js`, `scenario-aggregator.js`,
  `payload-aggregation.js`, `unit-normalizer.js` — present but not patched by 3A.

### dist/runtime/validators/
- `bounds.js / .d.ts` — **already exists**
  - Implication: general bounds validation is an existing module. 3A may extend it.
- `extension-2-bounds.js / .d.ts` — **already exists, pattern-defining**
  - Implication: extension-specific bounds live in their own file following the pattern
    `validators/extension-2-bounds.ts`. 3A must follow this:
    `validators/extension-3a-bounds.ts`. Spec §4.3 listed `validators/defaults.ts` for this
    purpose — that is wrong on two counts: wrong name and wrong directory intent.
- `cross-reference.js / .d.ts` — **already exists**
  - Implication: cross-reference validation is an existing module. Zone ref validation (upstream,
    downstream, working_fluid_ref, pickup_geometry_ref) patches here. Spec §4.3 did not list
    this as a patch target. That is a gap.
- `operating-mode.js / .d.ts` — **already exists**
  - Implication: operating mode validation is an existing module. The `model_extension_3a_mode`
    enum additions patch here. Spec §4.3 did not list this as a patch target. That is a gap.
- `schema.js / .d.ts` — **already exists**
  - Implication: schema validation is an existing module. New schema refs (working-fluid,
    pickup-geometry) patch here. Spec §4.3 did not list this. Gap.
- `units.js / .d.ts` — present but not patched by 3A.

### dist/runtime/runner/
- `run-extension-2.js / .d.ts` — **already exists, pattern-defining**
  - Implication: each extension has its own runner entry point. 3A must add
    `runner/run-extension-3a.ts`. Spec §4.3 did not list this at all. That is a significant gap —
    without a dedicated runner, the 3A scenario execution path has no entry point.
- `run-h200-baseline.js / .d.ts` — present, baseline runner.
- `run-packet.js`, `run-scenario.js` — present, general runners.
- `run-comparison.js` — present in both `runner/` and `comparison/`. Likely a build artifact
  duplicate. Not patched by 3A.

### dist/runtime/emitters/
- `flag-emitter.js / .d.ts` — **already exists**
  - Implication: flag emission is an existing module. The radiation-pressure warning and
    convergence/topology warning flags patch here rather than going into a new emitter.
    The topology report can be new, but flag-level warnings go here.
- `comparison-emitter.js`, `json-emitter.js`, `markdown-emitter.js`,
  `packet-metadata-emitter.js` — present. `packet-metadata-emitter.js` is relevant to the
  packet contract patch in §10 (generated artifact visibility). Not creating new emitters for
  this — patch packet-metadata-emitter.

---

## Corrected §4.3 — Runtime Files (replaces spec v0.4.1 §4.3)

### New files

| File | Purpose |
|---|---|
| `runtime/formulas/resistance-chain.ts` | junction-to-sink chain math per §11.3 |
| `runtime/runner/run-extension-3a.ts` | 3A runner entry point, follows run-extension-2 pattern |
| `runtime/emitters/topology-report.ts` | topology report emitter |
| `runtime/validators/topology.ts` | topology graph validation per §13.1 |
| `runtime/validators/extension-3a-bounds.ts` | 3A-specific bounds, follows extension-2-bounds pattern |

### Patched files (existing, extend not replace)

| File | What is patched |
|---|---|
| `runtime/formulas/radiation.ts` (source of `radiation.js`) | add cavity emissivity, two-sided geometry, BOL/EOL sizing per §§11.5–11.9 |
| `runtime/transforms/default-expander.ts` | add all 3A default expansions per §12 |
| `runtime/transforms/catalog-resolution.ts` | add working-fluid and pickup-geometry ref resolution |
| `runtime/transforms/extension-3a-normalizer.ts` (new, follows extension-2-normalizer pattern) | 3A-specific normalization of topology and resistance chain fields |
| `runtime/validators/cross-reference.ts` | add zone_id ref validation, working_fluid_ref, pickup_geometry_ref |
| `runtime/validators/operating-mode.ts` | add model_extension_3a_mode enum values |
| `runtime/validators/schema.ts` | add working-fluid and pickup-geometry schema refs |
| `runtime/emitters/flag-emitter.ts` | add radiation-pressure, convergence, bridge-loss warning flags |
| `runtime/emitters/packet-metadata-emitter.ts` | add generated artifact entries for topology report and defaults audit |
| `runtime/constants/constants.ts` | add any 3A-specific constants if absent; sigma must be imported from here not re-declared |

Note: `runtime/transforms/extension-3a-normalizer.ts` is listed as both "new" and "patched" because
it is a new file that follows the established extension-2-normalizer pattern. It is new to the repo
but not architecturally novel.

---

## Corrected §17 — Patch Order (replaces spec v0.4.1 §17)

Patch order respects the existing module dependency graph inferred from the dist tree.
Lower-level modules (constants, schemas, catalogs) before higher-level modules (validators,
transforms, formulas) before runners and emitters.

1. Patch `runtime/constants/constants.ts` — add any missing 3A constants; confirm sigma present
2. Patch schemas: `thermal-zone.schema.json`, `radiator.schema.json`, `scenario.schema.json`, `run-packet.schema.json` (patch); add `working-fluid.schema.json`, `pickup-geometry.schema.json` (new)
3. Add working-fluid and pickup-geometry starter catalogs (`ui/app/catalogs/`)
4. Patch `runtime/validators/schema.ts` — register new schema files
5. Patch `runtime/validators/operating-mode.ts` — add 3A mode enum
6. Patch `runtime/transforms/default-expander.ts` — add all 3A defaults
7. Patch `runtime/transforms/catalog-resolution.ts` — add working-fluid and pickup-geometry resolution
8. Add `runtime/transforms/extension-3a-normalizer.ts` — 3A field normalization
9. Patch `runtime/validators/cross-reference.ts` — add zone ref and catalog ref validation
10. Add `runtime/validators/topology.ts` — topology graph validation
11. Add `runtime/validators/extension-3a-bounds.ts` — 3A numeric bounds
12. Add `runtime/formulas/resistance-chain.ts` — chain math
13. Patch `runtime/formulas/radiation.ts` — cavity, two-sided, BOL/EOL math
14. Add `runtime/runner/run-extension-3a.ts` — runner entry point
15. Add `runtime/emitters/topology-report.ts` — topology report
16. Patch `runtime/emitters/flag-emitter.ts` — 3A warning flags
17. Patch `runtime/emitters/packet-metadata-emitter.ts` — generated artifact entries
18. Patch UI: additive zone and stage blocks, radiator life controls, resistance chain editor
19. Run defaults audit gate (requires default-expander patch complete)
20. Execute full test suite (§16)

---

## Issue Log Updates (see companion issue log v0.2.1)

### HOLE-001 — Updated (resolved, richer inventory)

HOLE-001 is now resolved with the full dist tree in hand. The best-solve stands (use dist as
repo-state evidence), but the inventory is richer than initially assumed. The following additional
modules were discovered and affect the file list:
- `constants.js` — sigma must be imported, not re-declared
- `radiation.js` — patch not create for radiator math
- `default-expander.js` — patch not create for defaults
- `catalog-resolution.js` — patch not create, was missing from spec §4.3
- `extension-2-normalizer.js` — pattern for 3A normalizer naming
- `extension-2-bounds.js` — pattern for 3A bounds naming
- `operating-mode.js` — patch target for mode enum, was missing from spec §4.3
- `schema.js` — patch target for schema refs, was missing from spec §4.3
- `cross-reference.js` — patch target for zone refs, was missing from spec §4.3
- `run-extension-2.js` — pattern for 3A runner, runner was entirely missing from spec §4.3
- `flag-emitter.js` — patch target for 3A warnings
- `packet-metadata-emitter.js` — patch target for artifact metadata

### DIFF-007 — Spec §4.3 file list corrected against actual dist tree

- Type: diff
- Why: spec v0.4.1 §4.3 contained several wrong file names (broken patterns) and missing patch
  targets, discovered by dist tree inspection.
- Changes:
  - `runtime/formulas/radiator-3a.ts` → patch `runtime/formulas/radiation.ts`
  - `runtime/validators/defaults.ts` → patch `runtime/transforms/default-expander.ts`
  - `runtime/transforms/topology-normalizer.ts` → `runtime/transforms/extension-3a-normalizer.ts`
  - Added: `runtime/runner/run-extension-3a.ts` (was entirely missing)
  - Added patch targets: `catalog-resolution.ts`, `operating-mode.ts`, `schema.ts`,
    `cross-reference.ts`, `flag-emitter.ts`, `packet-metadata-emitter.ts`, `constants.ts`
- Downstream systems affected: builder will follow wrong file names without this correction;
  runner gap would have left 3A with no execution entry point

---

## Spec Version Note

Spec moves to v0.4.2 (Z increment). Only §4.3 and §17 change. All other sections from v0.4.1
remain authoritative. This patch document governs §4.3 and §17 until the full v0.4.2 spec is
assembled.
