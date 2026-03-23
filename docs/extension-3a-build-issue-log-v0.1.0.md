# Extension 3A Build Issue Log v0.1.0

Attached to build: `space-server-heat-dissipation` Extension 3A
Spec: `orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1`
Blueprint: `orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1`
Dist-tree patch: `extension-3a-spec-patch-dist-tree-v0.4.2`

---

## DIFF-3A-001 — working-fluid schema field migration
- **Status: OWNER APPROVED**
- **Type:** diff
- **Spec ref:** §4.1, §7.1 | **Blueprint ref:** §7.6
- **Finding:** Existing `schemas/working-fluid/working-fluid.schema.json` used `fluid_id` (not `working_fluid_id`), `medium_class` (not `fluid_class`), and lacked 13 §7.1 required fields.
- **Resolution:** Patched to v0.2.0. `working_fluid_id` is canonical 3A ID. `fluid_id` preserved as optional deprecated backward-compat field. All §7.1 fields added.
- **Downstream systems affected:** Existing WF catalog entries using `fluid_id` still validate. Catalog resolution uses `working_fluid_id` for 3A lookups.

## DIFF-3A-002 — run-extension-2.ts re-declares sigma locally
- **Status: OWNER APPROVED — INFO ONLY**
- **Type:** diff / informational
- **Finding:** `runtime/runner/run-extension-2.ts` contains `const SIGMA = 5.670374419e-8` as module-local. Dist-tree patch requires sigma imported from constants, not re-declared.
- **Resolution:** Extension-2 runner is demoted (not active canon for 3A) and **untouched**. Extension-3A runner imports `SIGMA_W_M2_K4` from constants per spec. No patch to run-extension-2.ts — it cohabits as-is.
- **Downstream systems affected:** None. Extension-2 local sigma does not affect 3A runtime path.

## DIFF-3A-003 — Test import paths needed `../runtime/` prefix
- **Status: OWNER APPROVED — RESOLVED**
- **Type:** diff / build fix
- **Finding:** Test files in `reference/` used `../runner/` and `../emitters/` paths. Correct path from `reference/` is `../runtime/runner/` and `../runtime/emitters/`.
- **Resolution:** Paths corrected with sed. All tests pass.

## DIFF-3A-EXT2-COHABIT-001 — Extension 2 Runner Cohabitation Architecture
- **Status: OWNER APPROVED — IMPLEMENTED**
- **Type:** additive / architecture
- **Owner clarification (session 2):** Extension 2 is merged base — must cohabit, not be replaced.
- **Design:** `run-extension-3a.ts` produces `extension_3a_result` additively. `run-extension-2.ts` untouched. `run-packet.ts` is the integration dispatch point — patching it to call both runners is the remaining open item.
- **Downstream systems affected:** `run-packet.ts` requires one additive dispatch call when `enable_model_extension_3a=true`. No other system affected.

## HOLE-3A-001 — pickup-geometry schema did not exist
- **Status: OWNER APPROVED — RESOLVED**
- **Type:** hole
- **Spec ref:** §4.1, §8 | **Blueprint ref:** §9.11
- **Finding:** `schemas/pickup-geometry/` entirely absent from repo.
- **Resolution:** Created `schemas/pickup-geometry/pickup-geometry.schema.json` v0.1.0 following `schemas/{family}/{family}.schema.json` repo pattern. All §8.1–§8.3 fields implemented.

## BUG-3A-001 — Topology graph builder double-counted edges
- **Status: FOUND AND FIXED — no approval needed (internal build bug)**
- **Type:** build bug found during test gate
- **Finding:** `topology.ts` `buildGraph()` added both `upstream_zone_ref → zone_id` AND `zone_id → downstream_zone_ref` edges separately. In a correctly declared chain (A→B→C, each zone declaring both refs), every edge was added twice, inflating in-degrees and producing false cycle detection.
- **Fix:** Collect all (from, to) pairs into a `Set<string>` keyed by `\x00`-delimited string before incrementing in-degrees. Deduplicates cross-declared relationships before Kahn runs.
- **Spec ref:** §11.1 — "The graph is valid if…the graph is acyclic"
- **Test:** 3-zone acyclic chain test passes; 3-zone directed cycle test still correctly fails.

---

## Items Requiring Owner Approval Before Next Merge

None outstanding. All logged items resolved or approved.

---

## Best-Solve Items (per §18 of spec — PENDING OWNER APPROVAL)

These items are from the spec's own §18 list — proposed implementation law, not yet active canon:

- ADDITIVE-001 through ADDITIVE-005
- DIFF-001 through DIFF-006

See `orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1 §18` for full list. Owner approval of the spec itself makes these canonical.

---

## Session 5 — 2026-03-22

### ENV-GATE-001 — node_modules @types stubs empty (no network)
- **Status: OWNER APPROVED — RESOLVED**
- **Type:** environment hole
- **Spec ref:** spec §26.3 (schema validator uses fs + path), §26.4 (crypto), §26.5 (runner), §26.6 (packet-metadata-emitter)
- **Finding:** Session 4 build zip packaged without node_modules (correct practice). This build environment has no network access (EAI_AGAIN). @types dirs were empty stubs. tsc TS2688 errors on 13 implicit type libraries.
- **Resolution:** Created `types/node-builtins.d.ts` (fs: existsSync + readFileSync; path: resolve + join; crypto: createHash; Buffer: byteLength; Node globals: __dirname, __filename, process.stdout) and `types/ajv.d.ts` (Ajv class, ValidateFunction, ErrorObject). Patched `tsconfig.json` with `typeRoots: ["./types"]` and `types/**/*.d.ts` in include. **Zero logic change — environment normalization only.**
- **Downstream systems affected:** None. Type stubs satisfy compiler. Runtime logic unchanged. Droplet will have full @types via npm install.

### HOLE-SESSION5-002 — jest/ts-jest/ajv absent, no network, no cache
- **Status: OWNER APPROVED — DEFERRED TO STAGING**
- **Type:** environment hole
- **Spec ref:** Session 4 gate: 95/95 tests passing
- **Finding:** node_modules contains 0 files (all empty directory stubs). jest, ts-jest, ajv binaries absent system-wide. No npm cache. Network blocked.
- **Resolution:** Owner approved Option A — tsc ✅ governs as in-environment gate. npm test (95/95) confirmed passing in Session 4 and will be re-verified on droplet after scp + npm install. Build proceeds to zip.
- **Downstream systems affected:** None. Test logic unchanged. Staging gate required before merge.

### Session 5 Completed Work
- `run-packet.ts` — Extension 3A dispatch added (spec §14.1, DIFF-3A-EXT2-COHABIT-001). Extension-2 path untouched.
- `ui/app/index.html` — §11.1–§11.4 UI sections added (Tab 1 enable block, Tab 4 zone blocks, Tab 5 radiator lifecycle, Tab 7 output report). Badge CSS and zone card styles added.
- `ui/app/app.js` — zoneBlocks state, onExt3aEnableChange, addZoneBlock, removeZoneBlock, duplicateZoneBlock, moveZoneBlock, syncZoneBlock, compileZoneBlock, renderZoneBlocks, updateTopologyStatus, populateExt3aCatalogDropdowns, workingFluidOptions, pickupGeometryOptions, wireExt3aRadiatorFields, updateBolEolPreview, updateExt3aOutputSection (all sub-renderers), buildPacket() 3A fields.
- `tsc --noEmit` ✅ 0 errors
- `tsc --project tsconfig.json` (build) ✅ Clean dist compiled
- All 3A files verified in dist/

### Items Requiring Owner Approval Before Next Merge
- HOLE-SESSION5-002 — approved, deferred to staging gate (npm install && npm test on droplet)
