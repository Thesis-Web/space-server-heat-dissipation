# Extension 4 v0.1.4 Rollback Note

| Field | Value |
|---|---|
| Document | Extension 4 Rollback Note |
| Version | v0.1.4 |
| Status | pre-build reference |
| Scope | Extension 4 only |
| Governing law | `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md`, `docs/blueprints/orbital-thermal-trade-system-model-extension-4-blueprint-v0.1.4.md` |

---

## Purpose

This note provides a clean operational rollback checklist for Extension 4 v0.1.4. If the first implementation pass lands badly, the owner or a repair agent can use this document to identify exactly what to revert and verify that the pre-ext4 repo state is restored.

---

## 1. New Files Introduced by Extension 4

The following files do not exist before Extension 4. A full rollback deletes all of them.

### Docs
- `docs/blueprints/orbital-thermal-trade-system-model-extension-4-blueprint-v0.1.4.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-4-engineering-spec-v0.1.4.md`

### Types
- `types/extension-4.d.ts`

### Runtime
- `runtime/formulas/tpv-recapture.ts`
- `runtime/transforms/extension-4-normalizer.ts`
- `runtime/validators/extension-4-bounds.ts`
- `runtime/runner/run-extension-4.ts`

### Schemas
- `schemas/tpv-recapture-config/tpv-recapture-config.schema.json`
- `schemas/tpv-recapture-result/tpv-recapture-result.schema.json`

### Tests
- `reference/extension-4-schema.test.ts`
- `reference/extension-4-energy-accounting.test.ts`
- `reference/extension-4-iteration.test.ts`
- `reference/extension-4-disabled-state.test.ts`
- `reference/extension-4-cohabitation.test.ts`
- `reference/extension-4-output.test.ts`
- `reference/extension-4-state-compilation.test.ts`

### Optional build logs (delete if present)
- `docs/extension-4-authoring-assembly-log-v0.1.4.md`
- `docs/extension-4-drift-review-log-v0.1.4.md`
- `docs/extension-4-build-issue-log-v0.1.4.md`

---

## 2. Shared Files Patched by Extension 4

The following files exist before Extension 4 and are patched additively. A full rollback reverts each to its pre-ext4 state. A partial rollback may surgically remove only the ext4 additions.

### Schemas
- `schemas/scenario/scenario.schema.json` — removes `enable_model_extension_4`, `model_extension_4_mode`, `tpv_recapture_config`, `extension_4_catalog_versions` fields
- `schemas/run-packet/run-packet.schema.json` — removes the above plus `extension_4_result` field

### Runtime
- `runtime/runner/run-packet.ts` — removes ext4 dispatcher call (dispatch order step 5) and ext4 result key from final packet
- `runtime/emitters/json-emitter.ts` — removes ext4 packet serialization path
- `runtime/emitters/markdown-emitter.ts` — removes ext4 markdown section
- `runtime/emitters/flag-emitter.ts` — removes all `EXT4-*` flag IDs
- `runtime/emitters/packet-metadata-emitter.ts` — removes ext4 metadata fields
- `runtime/emitters/topology-report.ts` — removes `Extension 4 — TPV Recapture` section

### UI
- `ui/app/app.js` — removes ext4 scenario fields and result display fields
- `ui/app/state-compiler.js` — removes ext4 scenario and run-packet compilation path

---

## 3. Packet and Schema Keys to Remove on Rollback

The following keys were not present before Extension 4 and should be removed from any in-flight packets or stored scenario JSON objects if rolling back:

**Scenario keys:**
- `enable_model_extension_4`
- `model_extension_4_mode`
- `tpv_recapture_config`
- `extension_4_catalog_versions`

**Run-packet keys (all of the above plus):**
- `extension_4_result`

---

## 4. Test Expectations on Rollback

If Extension 4 is reverted:

| Test file | Expected state after rollback |
|---|---|
| All `reference/extension-4-*.test.ts` | Deleted; test runner must not reference them |
| `reference/extension-4-state-compilation.test.ts` | Deleted |
| All pre-existing tests (3A, 3B, 3C, schema, etc.) | Must pass without modification — ext4 is additive only and must leave these unchanged |
| Schema validation of a scenario without ext4 fields | Must pass — ext4 fields are all optional with defaults |

If pre-existing tests fail after ext4 is reverted, that is a sign the ext4 patch inadvertently mutated a shared file beyond its additive mandate. Audit `runtime/runner/run-packet.ts`, the emitters, and both schemas first.

---

## 5. Governing Law References

- Spec §4.2 — full new-file list
- Spec §4.3 — full patched-file list
- Spec §4.4 — no-delete statement (no pre-existing file is deleted by ext4)
- Blueprint Appendix B — required artifact naming
- Blueprint Controls and Gates — gate list used to verify rollback completeness

---

## 6. Rollback Completeness Check

After rollback, verify:

- [ ] All new files in §1 above are absent from the repo
- [ ] All patched files in §2 above are restored to pre-ext4 state
- [ ] All ext4 scenario/packet keys in §3 are absent from active schemas
- [ ] `runtime/runner/run-packet.ts` dispatch order has no step 5 ext4 call
- [ ] No `EXT4-*` flag IDs remain in `flag-emitter.ts`
- [ ] No ext4 markdown section in `markdown-emitter.ts`
- [ ] No ext4 UI fields in `app.js` or `state-compiler.js`
- [ ] Pre-existing test suite passes from a clean install
