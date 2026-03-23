# Model Extension 3A Schema Implementation Ledger v0.4.1

- Governed by: `orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1 §4.1`

## Schema Status

| File | Version | Action | Status |
|---|---|---|---|
| `schemas/thermal-zone/thermal-zone.schema.json` | v0.2.0 | Patched — 10 new 3A fields + resistance_chain sub-object | ✅ |
| `schemas/radiator/radiator.schema.json` | v0.2.0 | Patched — 10 new 3A fields | ✅ |
| `schemas/scenario/scenario.schema.json` | v0.2.0 | Patched — 6 new 3A fields, Extension-2 preserved | ✅ |
| `schemas/run-packet/run-packet.schema.json` | v0.2.0 | Patched — 7 new 3A fields | ✅ |
| `schemas/working-fluid/working-fluid.schema.json` | v0.2.0 | Patched — full §7.1 fields added; legacy fluid_id preserved (DIFF-3A-001) | ✅ |
| `schemas/pickup-geometry/pickup-geometry.schema.json` | v0.1.0 | **NEW** — full §8.1–§8.3 (HOLE-3A-001) | ✅ |

## Backward Compatibility

All patched schemas use `additionalProperties: false` with new fields optional/nullable. Legacy packets without 3A fields validate correctly. See §5.3 backward compat rule.
