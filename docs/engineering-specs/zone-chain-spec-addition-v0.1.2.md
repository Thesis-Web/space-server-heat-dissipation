# Zone Chain Architecture — Spec Addition v0.1.2

**Status:** APPROVED — ChatGPT sanity check complete, owner approved session 6  
**Supersedes:** v0.1.0, v0.1.1  
**Pinned to:** engineering-spec-v0.1.0 §19, §28.1, §28.3; blueprint-v0.1.1 §14.1, §14.2, §14.3  
**Session:** 6  
**Changes from v0.1.1:**
- `chain_role` renamed to `loop_role` (ChatGPT caveat 4 — reduces confusion with `zone_role`)
- ZC-001 now accepts `convergence_enabled = true` OR `zone_role = convergence_exchange` (ChatGPT caveat 2)
- `boundary_side` noted as optional future field, not required now (ChatGPT caveat 3)

---

## 1. Governing Mental Model

The thermal architecture is a **non-linear chain of sequential HX handoffs**. The operator can insert, remove, or change any HX boundary zone, any working fluid, and any loop chain in any position. The model does not prescribe a fixed number of loops or a fixed topology. Physics and routing correctness are what matter.

```
Loop A (He-Xe, cold)
  compute vault → HX-1 (convergence_exchange, hot island)
                          ↓
                  Loop B (eutectic, mid-temp)
                    → HX-2 (convergence_exchange)
                              ↓
                      Loop C (NaK, hot backbone)
                        → radiator emitter
                                ↓
                        (regen branch taps here, or at any declared branch_interface)
```

Key constraints confirmed by owner:
- Eutectic metal never contacts chipset. He-Xe is always the compute-side fluid.
- Hot island zone IS the HX boundary. It is storage AND exchange in one zone.
- Any loop can be inserted, changed, or removed. The model must not impose a fixed number of loops.
- Two loops do NOT feed one zone simultaneously. Single upstream per zone is correct.
- The topology is not required to be linear. Branches off the main chain are expressed via conversion branches, not additional upstream refs.

---

## 2. New Fields — Additive, Both Optional

### 2.1 `chain_id` (string | null, default null)

Identifies which fluid loop circuit this zone belongs to. Free-form string chosen by the operator. Examples: `"cold_loop_hexe"`, `"hot_island_a"`, `"backbone_nak"`, `"regen_eutectic"`. Zones without a `chain_id` belong to an implicit singleton chain and connect freely without cross-chain validation.

### 2.2 `loop_role` (enum | null, default null)

Declares the semantic role of this zone's loop circuit. This is distinct from `zone_role` which is a node-local topology descriptor.

| `loop_role` | Meaning |
|---|---|
| `cold_loop` | Compute-side cold transport loop. Never contacts high-temperature media directly. |
| `hot_island` | Buffer/storage zone that also acts as HX boundary between two loops. |
| `hot_backbone` | High-temperature transport loop. May feed radiator or regen. |
| `regen_loop` | Dedicated regeneration circuit. May tap hot island or backbone. |
| `radiator_loop` | Final rejection circuit terminating at a radiator emitter zone. |
| `safety_loop` | Isolation or thermal dump circuit. Never touches hot island unless declared. |
| `custom` | Operator-declared. |

**Schema description required:** UI labels and schema descriptions must note explicitly:

> `zone_role` = node-local topology role of this individual zone  
> `loop_role` = semantic role of the fluid loop / chain this zone belongs to

---

## 3. Validation Rules

### ZC-001 — Cross-chain handoff requires declared exchange boundary

If two adjacent zones (A.downstream_zone_ref = B.zone_id) declare **different** `chain_id` values, then at least one of A or B must satisfy:

- `zone_role = convergence_exchange`, **OR**
- `convergence_enabled = true`

If neither condition is met, emit blocking error: `cross_chain_handoff_without_hx_declared`.

Note: When `zone_role = convergence_exchange` is declared, the runtime normalizer forces `convergence_enabled = true`. Both paths are valid. `zone_role = convergence_exchange` is the canonical declaration path.

### ZC-002 — Singleton zones connect freely

Zones without a `chain_id` (null or absent) may connect to any other zone without triggering ZC-001. This preserves full backward compatibility with all existing scenarios.

### ZC-003 — Chain subgraph connectivity warning

Zones sharing the same `chain_id` must form a connected subgraph in the topology DAG. If two zones share a `chain_id` but have no direct or indirect connection path through the declared upstream/downstream refs, emit warning: `chain_id_disconnected_subgraph`.

---

## 4. What This Does NOT Change

- `upstream_zone_ref` — remains a single string. Single parent per zone is correct.
- `downstream_zone_ref` — remains a single string.
- `convergence_enabled` — unchanged. ZC-001 reads it; does not modify it.
- `bridge_resistance_k_per_w` — unchanged.
- DAG cycle detection (spec §28.1) — unchanged.
- All runtime math modules — unchanged.
- All existing scenarios without `chain_id` — fully valid, ZC-002 applies.

---

## 5. Optional Future Field (Not Required Now)

**`hx_boundary_role`** — ChatGPT identified this as useful for explicit hot-side/cold-side semantics at HX boundary zones. Deferred. Not needed for the MVP sequential handoff model. Log for future spec revision if reporting needs to disambiguate hot-side vs cold-side in the output.

---

## 6. Implementation Plan

### Phase 1 — Schema (non-breaking)

**File:** `schemas/thermal-zone/thermal-zone.schema.json`

Add to `properties`:
```json
"chain_id": {
  "type": ["string", "null"],
  "default": null,
  "description": "Fluid loop circuit identity. Zone chain spec addition v0.1.2 §2.1. Zones without chain_id connect freely (ZC-002)."
},
"loop_role": {
  "type": ["string", "null"],
  "enum": ["cold_loop","hot_island","hot_backbone","regen_loop","radiator_loop","safety_loop","custom",null],
  "default": null,
  "description": "Semantic role of the fluid loop this zone belongs to. Distinct from zone_role (node-local topology). Zone chain spec addition v0.1.2 §2.2."
}
```

### Phase 2 — Runtime validator (additive)

**File:** `runtime/validators/cross-reference.ts`

Add function `validateChainBoundaries(zones)`:
- Implements ZC-001: cross-chain adjacency check
- Implements ZC-002: singleton bypass
- Implements ZC-003: disconnected subgraph warning
- Returns violations in same `CrossReferenceViolation[]` format as existing validators

Call from existing zone cross-reference validation block in `validateZoneTopologyRefs()`.

### Phase 3 — UI zone block card (additive)

**File:** `ui/app/app.js`

Add to `addZoneBlock` defaults:
```javascript
chain_id:  data.chain_id  || null,
loop_role: data.loop_role || null,
```

Add to `syncZoneBlock`:
```javascript
b.chain_id  = document.getElementById(`z${idx}_chain_id`)?.value  || null;
b.loop_role = document.getElementById(`z${idx}_loop_role`)?.value || null;
```

Add to `compileZoneBlock` return object:
```javascript
chain_id:  b.chain_id  ?? null,
loop_role: b.loop_role ?? null,
```

Add to `renderZoneBlocks` zone card template (after zone_type dropdown):
```html
<div class="field-row"><label>Chain ID</label>
  <input id="z${idx}_chain_id" type="text"
    value="${b.chain_id||''}" placeholder="e.g. cold_loop_hexe"
    oninput="syncZoneBlock(${idx})" />
</div>
<div class="field-row"><label>Loop Role</label>
  <select id="z${idx}_loop_role" onchange="syncZoneBlock(${idx})">
    <option value="">— none —</option>
    <option value="cold_loop">cold_loop</option>
    <option value="hot_island">hot_island</option>
    <option value="hot_backbone">hot_backbone</option>
    <option value="regen_loop">regen_loop</option>
    <option value="radiator_loop">radiator_loop</option>
    <option value="safety_loop">safety_loop</option>
    <option value="custom">custom</option>
  </select>
</div>
```

Add to `updateTopologyStatus` chain summary:
```
Chain summary: cold_loop_hexe (3 zones) → backbone_nak (2 zones)
```

### Phase 4 — State-compiler pass-through

**File:** `ui/app/state-compiler.js`

Confirm `compileZoneBlock` emits `chain_id` and `loop_role`. If Phase 3 adds them to the zone block object, they pass through automatically. Verify after Phase 3 before writing any code here.

### Phase 5 — Tests

**File:** `reference/extension-3a-chain-topology.test.ts`

Required test cases:
1. Two-chain scenario with valid convergence_exchange HX boundary — ZC-001 passes
2. Two-chain scenario with convergence_enabled=true (no zone_role) — ZC-001 passes
3. Two-chain scenario with no HX boundary — ZC-001 fails, expect `cross_chain_handoff_without_hx_declared`
4. Singleton zone (no chain_id) connecting to named chain zone — ZC-002 passes, no error
5. Two zones with same chain_id, no connection path — ZC-003 warning emitted

---

## 7. Orbit Class / Gravity — Logged TODOs

**TODO-GRAVITY-001** (one-turn patch):
The UI orbit class dropdown has MEO / LEO / HEO options that the runtime hard-rejects. Add a disabled label or warning note to the dropdown so operators know these are not supported in v0.1.0. Do not remove them — keeps the door open.

**TODO-GRAVITY-002** (future spec revision, non-trivial):
Add `gravity_g: number` to `environment_profile` schema (default 0 for microgravity). Ground server use case = 9.81, lunar = 1.62, Mars = 3.72. Heat transport formulas (two-phase flow regime, bubble nucleation, natural convection, loop heat pipe performance) branch on this field. Requires dedicated physics spec revision. Not a one-turn patch.

---

## 8. Repo Placement

This document must be committed to the repo at:

```
docs/engineering-specs/zone-chain-spec-addition-v0.1.2.md
```

Reason: This spec addition has architectural significance beyond session scope. The repo must carry the full decision history, not only git log entries.

---

*Pinned: engineering-spec-v0.1.0 §19.1–§19.3, §28.1, §28.3; blueprint-v0.1.1 §14.1–§14.3*  
*Session 6 — owner approved — ChatGPT sanity check complete — ready for implementation*
