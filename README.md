# space-server-heat-dissipation

Orbital thermal trade system — schema, runtime, and browser packet-builder.

**Version:** v0.1.5 (Extension 1 — full runtime, schema, UI, and catalog layer)

**License:** Proprietary. Copyright (c) 2026 Exnulla, a division of Lake Area LLC. All Rights Reserved. See `LICENSE`.

---

## Governing Law

| Document | Path |
|---|---|
| Human Blueprint v0.1.1 | `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md` |
| Human Engineering Spec v0.1.0 | `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md` |
| UI Expansion Blueprint v0.1.5 | `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md` |
| UI Expansion Engineering Spec v0.1.5 | `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md` |
| Model Extension 2 Blueprint v0.2.1 | `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md` |
| Model Extension 2 Engineering Spec v0.2.1 | `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md` |

**Priority order:** Blueprint supersedes spec in all conflicts and holes.
If spec is silent, fall back to blueprint. If blueprint is also silent, best-solve must be logged and owner-approved before becoming canonical.

---

## Runtime Authority

All authoritative engineering outputs are produced by the server-side runtime formula engine.
Browser previews in the UI are display-only and subordinate to runtime results.

Regression anchor (pinned per spec §18.10):

```
Q = 50,000 W, ε = 0.90, F = 1.0, T = 1200 K, T_sink = 0 K → A = 0.4725 m²
```

---

## CI Gates

From repo root:

```bash
npm ci
npm run lint:schemas    # AJV schema compilation — 23/23 schemas
npm run typecheck       # TypeScript strict — 0 errors
npm test                # Reference-case suite — 40/40 tests
npm run lint            # ESLint runtime source
npm run build           # tsc compile to dist/
```

All gates currently passing.

---

## Repo Structure

```
LICENSE                              Proprietary license — Exnulla / Lake Area LLC

schemas/
  <family>/                          One subdirectory per schema family
    *.schema.json                    Core schemas (v0.1.0, spec-authoritative)
  catalogs/
    *.schema.json                    Catalog validation schemas

runtime/
  constants/
    constants.ts                     Physics constants (σ, Wien), runtime defaults,
                                     version declarations, TRM/Extension 2 hook layer (§E)
  formulas/
    radiation.ts                     Radiator sizing, regression anchor, Stefan-Boltzmann
    loads.ts                         Compute module, comms payload, dissipation aggregation
    power-cycle.ts                   Carnot bounds, power-cycle and heat-lift validation
    storage.ts                       Sensible + latent storage energy (spec §21.2)
    exergy.ts                        Exergy formulas
    heat-transport.ts                Heat transport formulas
    heat-pump.ts                     Heat-pump Carnot bounds and heat-lift
    heat-exchanger.ts                ε-NTU and UA-LMTD heat exchanger models
  validators/
    bounds.ts                        Zone, storage, radiator bounds validation (§19.3, §21.3, §22.3)
    operating-mode.ts                Orbit class, mode fusion, Carnot checks
    schema.ts                        AJV runtime schema validator
    units.ts                         Unit normalisation helpers
    cross-reference.ts               Cross-reference validator
  transforms/
    scenario-aggregator.ts           System balance aggregation
    default-expander.ts              Default injection with assumption surfacing (§4.3, §40)
    load-state-resolver.ts           Load-state resolution (§12.12)
    unit-normalizer.ts               Unit normalisation transform
    payload-aggregation.ts           Additive UI payload blocks → canonical comms-load
    scenario-aggregation.ts          Scenario aggregation transform
    catalog-resolution.ts            Catalog lookup helpers
  runner/
    run-scenario.ts                  Single-scenario 11-step executor (§27)
    run-comparison.ts                Comparison runner
    run-packet.ts                    Run-packet executor
  comparison/
    run-comparison.ts                Comparison re-export shim (§43 path)
  emitters/
    json-emitter.ts                  Structured runtime result emitter (§34)
    flag-emitter.ts                  Flag generation and severity classification
    markdown-emitter.ts              Markdown summary emitter
    comparison-emitter.ts            Comparison output emitter
    packet-metadata-emitter.ts       Packet metadata and manifest emitter

reference/
  scenario-runner.test.ts            End-to-end 50 kW reference case (§41.3, §45)
  radiation.test.ts                  Regression anchor gate (§18.10, §41.6)
  power-cycle.test.ts                Carnot bounds reference cases
  heat-pump.test.ts                  Heat-pump reference cases
  loads.test.ts                      Load aggregation reference cases
  operating-mode.test.ts             Operating mode validation cases

ui/app/
  index.html                         Seven-tab operator packet-builder (v0.1.5)
  app.js                             UI controller
  catalog-loader.js                  Versioned catalog loader
  state-compiler.js                  UI state → canonical payload serialiser
  id-utils.js                        Deterministic identifier helpers
  catalogs/
    scenario-presets.v0.1.0.json
    compute-device-presets.v0.1.0.json
    payload-archetypes.v0.1.0.json
    material-families.v0.1.0.json
    branch-presets.v0.1.0.json
    branding.v0.1.0.json

docs/
  blueprints/                        Canonical blueprint documents
  engineering-specs/                 Canonical engineering specification documents
  operator-guides/                   Packet builder and catalog sourcing guides
  implementation-ledgers/            Extension 2 implementation planning ledgers
  theory/                            TRM and interstitial radiation theory documents

examples/
  scenarios/                         Example scenario JSON files
  packets/                           Example run-packet JSON files

templates/
  reports/
    scenario-summary-template.md     Runtime output report template

tools/
  conformance/
    lint-schemas.mjs                 AJV-based schema linter (Gate: npm run lint:schemas)
    validate-schemas.js              Legacy schema gate (kept for reference)
```

---

## Key Architecture Rules

- The browser UI is a packet builder and structured input compiler. It is not an alternate solver.
- The runtime is the only numerical authority. No language model may supersede runtime outputs.
- The canonical branch-type and zone-type families are preserved; richer meanings are expressed via subtypes and variants.
- Additive non-compute payload blocks compile to a deterministic generated comms-load aggregate. The transform is disclosed in `transform_trace`.
- Every preset default is inspectable, serialisable, and overridable.
- All generated compatibility artifacts are disclosed in `transform_trace` and `file_manifest`.
- Schema-first: no runtime or UI layer may invent fields not declared in the versioned schema family.
- GEO-only scope in v0.1.0. `orbit_class` must be `GEO`.

---

## Extension 2 — TRM Forward Surface

`runtime/constants/constants.ts` Section E declares the forward hook layer for
Model Extension 2 (interstitial radiation / TRM exploratory architecture).

These constants (`TRM_*`, `WIEN_DISPLACEMENT_UM_K`, `TrmProvenanceClass`,
`TrmMaturityClass`, `TrmConfidenceClass`) are inert in Extension 1 — nothing
imports them yet. They establish the named import surface Extension 2 runtime
modules will use. Extension 1 runs with zero dependency on Section E.

Extension 2 governing law:
- `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md`

---

## Ownership

Copyright (c) 2026 Exnulla, a division of Lake Area LLC. All Rights Reserved.

IP Owner: James Huson — LakeAreaLLC@gmail.com — 936.239.1100
174 Holiday Ln, Livingston, TX 77351
