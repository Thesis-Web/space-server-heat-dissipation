# space-server-heat-dissipation

**Orbital Thermal Trade System — v0.1.2**  
Runtime: `v0.1.0` | Spec: `engineering-spec-v0.1.0` | Blueprint: `v0.1.1`  
Scope: GEO-only, schema-first, math-authoritative thermal trade tool for orbital compute nodes.

---

## Purpose

This repository implements the first deterministic build track of the orbital thermal trade system for GEO-orbit compute node heat dissipation. It is a **schema-first, runtime-authoritative, browser-assisted** engineering tool designed to support trade studies for orbital compute platforms at the 50 kW, 300 kW, and 1 MW class scales.

The system produces **structured, descriptive outputs** — not single viability verdicts. Every numeric result is traceable to a governing equation in the engineering specification.

---

## Governing Documents

All law for this implementation is internal to the repository.

| Document | Location | Role |
|---|---|---|
| Engineering Specification v0.1.0 | `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md` | Primary implementation law |
| Blueprint v0.1.1 | `docs/blueprints/` | Conceptual authority |

**Priority order:** engineering spec > blueprint > all other files.

---

## Quick Start

### Requirements

- **Node.js** ≥ 20.0.0 (LTS) — see HOLE-001 log
- **npm** ≥ 10.x

### Install

```bash
git clone <repo>
cd space-server-heat-dissipation
npm install
```

### Run conformance gates

```bash
npm run conformance
```

This runs in order:
1. Schema gate — validates all 11 JSON schemas (§41.2)
2. TypeScript typecheck — drift gate (§41.7)
3. Reference-case tests — runtime gate (§41.3, §41.6)
4. ESLint

### Run reference tests only

```bash
npm test
```

### Build TypeScript to `dist/`

```bash
npm run build
```

### Browser UI (packet builder)

Open `ui/app/index.html` directly in any modern browser. **No server required.** (§41.4)

The UI is a packet builder only — it does not execute the runtime solver. That is the Node.js runtime's role.

---

## Repository Structure

```
space-server-heat-dissipation/
├── docs/
│   ├── blueprints/              # Human canonical blueprint
│   ├── engineering-specs/       # Governing engineering specification
│   ├── operator-guides/
│   ├── research-guides/
│   └── ai-pinned/               # AI-derived build artifacts
├── schemas/                     # 11 versioned JSON schemas
│   ├── scenario/
│   ├── compute-device/
│   ├── compute-module/
│   ├── thermal-zone/
│   ├── thermal-stage/
│   ├── working-fluid/
│   ├── storage/
│   ├── radiator/
│   ├── conversion-branch/
│   ├── communications-payload/
│   └── run-packet/
├── runtime/
│   ├── constants/               # σ, defaults, version declarations
│   ├── formulas/                # 8 canonical equation modules
│   ├── validators/              # 5 validator modules
│   ├── transforms/              # 4 transform modules
│   ├── comparison/              # Comparison runner
│   ├── emitters/                # 4 output emitters
│   └── runner/                  # 3 runner modules
├── ui/app/                      # Static browser packet builder (7 tabs)
├── examples/                    # Reference scenario and packet files
├── templates/                   # Report and packet templates
├── tools/conformance/           # Schema gate tool
├── reference/                   # Reference-case test suite
└── .github/workflows/           # CI pipeline
```

---

## Architecture

### Core Principles (from §3 and §4)

| Law | Reference |
|---|---|
| No undocumented field invention | §4.1 |
| No undocumented formula substitution | §4.2 |
| No hidden derived assumptions | §4.3 |
| No silent operating-mode fusion | §4.4 |
| No UI-only truth | §4.5 |
| No language-model numeric override | §4.6 |

### System Boundary (§2, §7)

- **Orbit:** GEO only in v0.1.0. Any other orbit class is rejected at runtime.
- **Node classes:** 50 kW, 300 kW, 1 MW, custom
- **Out of scope:** full CFD, FEA, high-fidelity orbital mechanics, flight certification, financial model

### Runtime Execution Order (§27)

The runtime executes in exactly this 11-step sequence:

1. Schema load and packet completeness check
2. Payload normalization to canonical SI units
3. Operating-mode validation (GEO check, Carnot bounds, mode fusion check)
4. Load-state resolution
5. Internal dissipation aggregation
6. Environmental term aggregation
7. Stage execution (DAG order)
8. Branch execution with mode-specific validation
9. Radiator sizing or achieved-rejection computation
10. Flag generation
11. Output emission

---

## Formula Modules

All governing equations are in `runtime/formulas/`. No formula may be substituted without a spec revision (§4.2).

| Module | Governing Equations | Key Functions |
|---|---|---|
| `radiation.ts` | §12.2, §32.3 | `computeRadiatorArea`, `computeRadiatorEmission` |
| `exergy.ts` | §12.6 | `computeExergyUpperBound` |
| `heat-pump.ts` | §12.7–12.9, §29 | `computeCarnotHeatPumpBound`, `computeHeatLift` |
| `power-cycle.ts` | §12.7, §12.10, §30 | `computeCarnotEngineBound`, `computePowerCycle` |
| `storage.ts` | §12.5, §21.2 | `computeStorageEnergy` |
| `heat-transport.ts` | §12.4 | `computeRequiredMassFlow` |
| `heat-exchanger.ts` | §12.11 | `computeHxDutyEpsNtu`, `computeHxDutyUaLmtd` |
| `loads.ts` | §12.12–12.13, §17.2, §18.2 | `aggregateInternalDissipation`, `computeModulePower` |

### Key Equations

**Radiator emission (§12.2):**
```
Q_dot_rad = ε · σ · A · (T_rad⁴ − T_sink⁴)
σ = 5.670374419 × 10⁻⁸ W/m²·K⁴
```

**System energy balance (§12.1):**
```
Q_dot_total_reject = Q_dot_internal + Q_dot_external
                   + W_dot_parasitic + Q_dot_branch_losses
                   − W_dot_exported_equivalent
```

**Carnot heat-engine bound (§12.7):**
```
η_carnot = 1 − T_cold / T_hot
```

**Carnot heat-pump bound (§12.8):**
```
COP_heating_carnot = T_hot / (T_hot − T_cold)
```

---

## Reference Cases

The test suite in `reference/` validates against mandatory anchoring cases from §14 and Appendix B. All must pass within ±0.5% tolerance (§42).

| Case | Description | Expected |
|---|---|---|
| 1 MW @ 350 K | Radiator area | ≈ 1306 m² |
| 1 MW @ 600 K | Radiator area | ≈ 151 m² |
| 1 MW @ 800 K | Radiator area | ≈ 48 m² |
| 300 kW @ 600 K | Radiator area | ≈ 45.36 m² |
| 300 kW @ 800 K | Radiator area | ≈ 14.35 m² |
| 300 kW @ 1000 K | Radiator area | ≈ 5.88 m² |
| 50 kW @ 600 K | Radiator area | ≈ 7.56 m² |
| 50 kW @ 800 K | Radiator area | ≈ 2.39 m² |
| 50 kW @ 1200 K | Radiator area | ≈ 0.95 m² |
| T_cold=330K, T_hot=800K | COP_carnot | ≈ 1.702 |
| T_cold=330K, T_hot=1000K | COP_carnot | ≈ 1.493 |
| LEO orbit | Runtime rejection | Error flag |
| COP > Carnot | Runtime rejection | RangeError |
| TEG 400W / 50kW | Low-significance flag | Flagged |

---

## Canonical Defaults (§40)

| Parameter | Default | Reference |
|---|---|---|
| `T_sink_effective` | 0 K | §40 — first-order radiator sizing |
| `epsilon_rad` | 0.9 | §40 |
| Reserve margin (nominal) | 0.15 | §40, §33 |
| Reserve margin (conservative) | 0.25 | §33 |
| Reserve margin (aggressive) | 0.05 | §33 |
| Low-significance threshold | 1% of Q_dot_internal | §31.3 |
| Interpolation rule | Piecewise linear | §12.12 |
| Reference temperature (exergy) | 300 K | §26.1 |

All defaults are surfaced as declared assumptions in runtime output (§4.3).

---

## Schema Family

11 versioned JSON schemas govern all data contracts. Located in `schemas/`.

| Schema | Governs |
|---|---|
| `scenario` | Top-level run definition (§15) |
| `compute-device` | Accelerator thermal/electrical profile (§16) |
| `compute-module` | Board assembly (§17) |
| `thermal-zone` | Zone temperature envelope (§19) |
| `thermal-stage` | DAG execution node (§23) |
| `working-fluid` | Fluid property envelope (§20) |
| `storage` | Thermal energy storage block (§21) |
| `radiator` | Radiator configuration (§22, §32) |
| `conversion-branch` | Optional branch (§24) |
| `communications-payload` | Non-compute loads (§18) |
| `run-packet` | Deterministic AI handoff (§25, §37) |

---

## Browser UI (§36, §41.4)

**File:** `ui/app/index.html` — open directly in browser, no install required.

The UI has 7 tabs matching the 7 required sections of §36.2:

| Tab | Content |
|---|---|
| 1 · Scenario | Scenario ID, orbit class, thermal policy, environment profile |
| 2 · Compute Payload | Device profile (H200-class etc.), module configuration |
| 3 · Non-Compute Payload | Communications, telemetry, radar, duty cycles |
| 4 · Thermal Architecture | Zones, stages, working fluid |
| 5 · Radiator & Storage | Radiator sizing inputs, PCM/sensible storage |
| 6 · Optional Branches | TEG, Brayton, Stirling, directed-energy branches |
| 7 · Output & Packet | Validation, scenario JSON generation, run packet generation, bundle download |

**Prohibited UI behaviors (§36.4):**
- Embedding divergent formulas
- Mutating schema field names
- Producing runtime outputs independently of the authoritative runtime
- Silently fixing invalid input

---

## AI Role Contracts (§38)

| Agent | Role |
|---|---|
| **Claude** | Build orchestration, implementation, packet execution, artifact assembly, diff/drift review |
| **ChatGPT** | Blueprint and spec design, schema design, conformance review |
| **Perplexity** | Citation-first property research, materials/fluid data refresh |
| **Runtime** | Calculation, validation, output emission — sole numeric authority |

No language model may supersede runtime numerical outputs (§4.6).

---

## Output Contract (§34)

Every runtime execution emits:

- `run_id`, `runtime_version`, `blueprint_version`, `engineering_spec_version`, `schema_bundle_version`
- `outputs.thermal` — Q̇ values, zone temperatures, radiator area, storage energy
- `outputs.electrical` — compute/non-compute/parasitic/branch power
- `outputs.packaging` — mass estimates
- `flags` — structured flag array (§35)
- `assumptions` — all declared defaults and estimates (§4.3)
- `notes` — derivation notes

**No single viability verdict is emitted (§9.2).**

---

## Flag Contract (§35)

| Flag ID | Severity | Trigger |
|---|---|---|
| `exceeds_selected_material_range` | review | Radiator temp exceeds material policy |
| `requires_extreme_target_surface_temperature` | review | High T_rad flag |
| `requires_large_radiator_scale` | warning | Area > 500 m² |
| `requires_high_parasitic_work_input` | warning | Parasitic > 10% rejection |
| `low_significance_recovery_branch_output` | warning | Branch < 1% of Q_dot_internal |
| `research_confirmation_required` | review | Field marked research-required |
| `orbit_class_rejected` | error | Non-GEO orbit |
| `carnot_violation` | error | COP or η exceeds Carnot bound |

---

## Conformance Gates (§41)

| Gate | What | How |
|---|---|---|
| §41.1 Document gate | Required docs exist | Manual / CI check |
| §41.2 Schema gate | 11 schemas valid | `npm run lint:schemas` |
| §41.3 Runtime gate | Formula modules execute | `npm test` |
| §41.4 UI gate | Bundle without local install | Open `ui/app/index.html` |
| §41.5 Packet gate | Generated packet matches contract | `npm test` |
| §41.6 Reference-case gate | ±0.5% tolerance | `npm test` |
| §41.7 Drift gate | No impl contradicts canonical versions | `npm run typecheck` |

---

## Hole Log (Build Audit)

The following specification gaps were found during build and resolved per owner approval. Each is logged for traceability.

| Hole | Description | Resolution | Status |
|---|---|---|---|
| HOLE-001 | Node.js version not specified in spec | Defaulted to Node 20 LTS / TypeScript 5.x per owner approval | ✅ Approved |
| HOLE-002 | `loads.ts` required by §26.2 but missing from §43 file list | Added per §26.2 law. §26.2 governs over §43 | ✅ Approved |
| HOLE-003 | `operating-mode.ts` and `cross-reference.ts` required by §26.3 but missing from §43 | Added per §26.3 law | ✅ Approved |
| HOLE-004 | `run-packet.ts` runner required by §26.5 but missing from §43 | Added per §26.5 law | ✅ Approved |
| HOLE-005 | No README specified in §43 | Built full in-depth README per owner directive | ✅ Approved |
| HOLE-006 | `templates/reports/` and `examples/` content not specified | Built from Appendix A and §36.2 | ✅ Approved |
| HOLE-007 | UI spec §41.4 says static browser only; no multi/single-file directive | Built as multi-tab single-file HTML per owner approval | ✅ Approved |
| HOLE-008 | Comparison-emitter and flag-emitter not named in §43 but required by §26.6 | Added per §26.6 law | ✅ Approved |
| HOLE-009 | No CI workflow specified in spec | Added per owner directive | ✅ Approved |
| HOLE-010 | `bounds.ts` imports `flag-emitter` before it existed — build-order defect | Fixed by building `flag-emitter` first in Step 6 | ✅ Resolved |
| HOLE-011 | `run-scenario.ts` imported `THERMAL_POLICY_MARGINS` but used it only indirectly via `expandDefaults` | Removed dead import; ESLint would have flagged this. No spec change. Logged here per owner law. | ✅ Approved |
| HOLE-012 | §36.2 requires 7 UI sections but names no tab structure | Built 7 tabs matching §36.2 required sections exactly | ✅ Approved |

---

## Prohibited Behaviors (§46)

The following are **prohibited in v0.1.0**:

- LEO-specific assumptions in canonical runtime logic
- Hidden solver constants not surfaced in docs or outputs
- UI-generated numeric results differing from runtime-authoritative results
- Branch types not declared in schema family
- Runtime acceptance of power-cycle efficiency greater than Carnot bound
- Runtime acceptance of heat-lift COP greater than Carnot bound
- Branch narratives implying free temperature amplification without work input

---

## Versioning (§6)

All canonical documents, schemas, and runtime output contracts use `vMAJOR.MINOR.PATCH`.

- **MAJOR:** incompatible contract or conceptual change
- **MINOR:** backward-compatible new capability
- **PATCH:** clarifications, formatting, non-breaking corrections

Every runtime result bundle declares `runtime_version`, `blueprint_version`, `engineering_spec_version`, and `schema_bundle_version`.

---

## License

Internal project — owner: James. Not for public distribution at this version.

---

_This repository is governed deterministically by its internal pinned documents. Do not extend without formal spec revision and version change._
