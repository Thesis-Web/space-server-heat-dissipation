# space-server-heat-dissipation

Orbital thermal trade system — schema, runtime, and browser packet-builder.

Version: v0.1.5 (UI expansion patch)

## Governing Law

| Document | Path |
|---|---|
| Human Blueprint v0.1.1 | `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md` |
| Human Engineering Spec v0.1.0 | `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md` |
| UI Expansion Blueprint v0.1.5 | `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md` |
| UI Expansion Engineering Spec v0.1.5 | `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md` |

Priority order: UI Expansion Spec v0.1.5 → Blueprint v0.1.1 (supersedes spec in conflicts/holes).

## Runtime Authority

All authoritative engineering outputs are produced by the server-side runtime formula engine.
Browser previews in the UI are display-only and subordinate to runtime results.

Regression anchor (pinned per spec §18.10):
`Q = 50,000 W, ε = 0.90, F = 1.0, T = 1200 K, T_sink = 0 K → A = 0.4725 m²`

## Gates

From repo root:

```
npm ci
npm run lint:schemas
npm run typecheck
npm test
npm run build
```

## Repo Structure

```
schemas/                   JSON schemas (canonical + v0.1.5 patched)
schemas/catalogs/          Catalog schema files
runtime/
  constants.ts             Stefan-Boltzmann, regression anchor, version constants
  formulas/                Radiation, loads, power-cycle, exergy, heat-transport, storage
  validators/              Blocking and warning validation (spec §21)
  transforms/              Payload aggregation, scenario aggregation, catalog resolution
  runner/                  Run-packet executor
  emitters/                Packet metadata and summary emitter
  tests/                   Reference-case tests (regression anchor gate)
ui/app/
  index.html               Seven-tab operator packet-builder
  app.js                   UI controller
  catalog-loader.js        Versioned catalog loader
  state-compiler.js        UI state → canonical payload serialiser
  id-utils.js              Deterministic identifier helpers
  catalogs/                Versioned catalog data files (v0.1.0)
docs/
  blueprints/              Canonical blueprint documents
  engineering-specs/       Canonical engineering specification documents
  operator-guides/         Packet builder operator guide
  research-guides/         Catalog sourcing and research guide
examples/
  scenarios/               Example scenario JSON
  packets/                 Example run-packet JSON
scripts/
  lint-schemas.mjs         AJV-based schema linter
.github/workflows/ci.yml   CI: lint:schemas → typecheck → test → build
```

## Key Architecture Rules

- The browser UI is a packet builder and structured input compiler. It is not an alternate solver.
- The canonical branch-type and zone-type families are preserved; richer meanings expressed via subtypes/variants.
- Additive non-compute payload blocks compile to a deterministic generated comms-load aggregate (transform disclosed in trace).
- Every preset default is inspectable, serialisable, and overridable.
- All generated compatibility artifacts are disclosed in `transform_trace` and `file_manifest`.
