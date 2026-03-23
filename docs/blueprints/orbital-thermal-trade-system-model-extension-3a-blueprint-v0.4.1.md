# Orbital Thermal Trade System Model Extension 3A Blueprint v0.4.1

## 1. Document Control

- Document Type: Blueprint
- Project: space-server-heat-dissipation
- Version: v0.4.1
- Prior version: v0.3.0
- Status: Draft for owner approval
- Owner: James
- Extension Class: Foundational model-hardening package

### 1.1 Version delta from v0.3.0

- Y incremented (0.3 → 0.4): added governing math anchors in §6, added additive-block UI design contract in §7.2 (new material not previously declared)
- Z incremented (0.0 → 0.1): changed §1.2 canonical weight statement for Extension 2 artifacts, changed §5.2 repo-state trace position

### 1.2 Canonical weight statement

This document supplements the following artifacts:

- `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md` — governing parent blueprint, full canonical weight
- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md` — governing parent spec, full canonical weight
- `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md` — supplements where relevant
- `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md` — supplements where relevant

This document supersedes no prior canon by implication. Any conflict with parent canon must be resolved explicitly in the matching 3A engineering spec and issue log.

**Extension 2 artifacts no longer hold canonical weight.** The repo state as built under Extension 2 is the binding reality. The Extension 2 blueprint and spec are historical reference only. Where repo state and Extension 2 spec conflict, repo state governs. When the 3A build begins, this 3A blueprint and its companion engineering spec become canonical build law.

### 1.3 Primary intake basis

- `/mnt/data/extension-3a-cut-list-v0.1.0.md`

### 1.4 Repo-state trace basis used during authoring

- `dist/runtime/runner/run-scenario.d.ts`
- `dist/runtime/runner/run-scenario.js`
- `dist/runtime/validators/cross-reference.js`
- `examples/packets/run-packet-geo-50kw-001.json`

---

## 2. Executive Summary

Extension 3A is the bounded foundational package that hardens the current orbital thermal trade system before any deeper subsystem expansion. It does four things and does only those four things:

1. makes multi-zone thermal topology explicit and declared,
2. makes convergence and runaway handling explicit and blocking,
3. makes radiator math structurally honest for cavity emissivity, two-sided geometry, and mission-life degradation,
4. makes resistance-chain realism and working-fluid / pickup-geometry selection first-class deterministic inputs.

This package is intentionally narrower than the scope of any prior extension work. It does not add new speculative thermodynamic branches, and it does not promote exploratory terminology from prior extensions into baseline canon. Its job is to make the baseline packet, schema, UI, and runtime capable of representing real bounded thermal networks without silent idealizations.

---

## 3. Why 3A Exists

The current repo already contains a canonical thermal-zone family, additive UI block behavior, runtime support for plural `thermal_zones[]` and `thermal_stages[]`, and explicit stage zone references and radiator sizing math. The prior extension UI build used a static tab-per-concept structure. Post-build review determined that this structure is insufficient: a static single-instance tab cannot represent parallel stages, multiple hot islands operating simultaneously, or the full range of thermal architectures the system must support.

What is missing is:

- a topology contract binding zones into declared directed networks,
- convergence criteria that either converge or block,
- resistance accounting between compute junction and final sink,
- radiator sizing that carries beginning-of-life (BOL) versus end-of-life (EOL) emissivity realism,
- a UI authoring model that supports additive zone and stage blocks rather than static single-instance tabs.

Without this package, the product can serialize multiple zones yet still under-specify how those zones relate, converge, lose energy across isolation boundaries, and drive radiator sizing across mission life.

---

## 4. Canonical Intent for 3A

### 4.1 Bounded package intent

Extension 3A shall be:

- buildable independently,
- mergeable independently,
- testable independently,
- re-testable after downstream extensions merge.

### 4.2 Product capability after 3A

After 3A, the product becomes:

- topology-declared instead of topology-implied,
- convergence-declared instead of convergence-assumed,
- resistance-chain-aware instead of direct-transfer-idealized,
- radiator-life-aware instead of emissivity-static,
- catalog-aware for working fluid and pickup geometry where those inputs materially affect runtime,
- UI-capable of additive parallel-stage and multi-hot-island authoring.

### 4.3 Product capability not granted by 3A

3A does not:

- authorize a new thermodynamics engine,
- authorize orbital dynamics simulation,
- certify flight readiness,
- certify any working fluid or pickup geometry as operationally valid,
- absorb exploratory terminology from prior extensions as baseline truth,
- add vault atmosphere depth, pump parasitic depth, eclipse buffering, TPV feedback recursion, or TEG optimization into canon.

---

## 5. Repo-State Trace and Drift Position

### 5.1 Conservatively traced current repo reality

The repo state shall be described as follows:

- a single canonical thermal-zone form is present in runtime-facing contracts,
- additive block behavior exists in the current UI/operator surface,
- stage-to-zone references exist in runtime validation,
- the runtime can serialize plural thermal zones and plural thermal stages,
- the prior extension UI build used static single-instance tabs that post-build review found insufficient for parallel-stage and multi-island authoring,
- prior extension terminology is extension-specific and shall not be restated as baseline 3A fact without explicit trace.

### 5.2 Mandatory drift posture

3A authoring shall not retroactively canonize prior extension exploratory labels as foundational thermal-zone law. 3A may only assert that additive stage/block behavior exists in repo state and must remain traceable. Any claim about prior extension canon must be sourced to the repo artifact, not to a prior spec document, since Extension 2 spec/blueprint no longer holds canonical weight.

---

## 6. Governing Math Anchors

This section declares the governing mathematical principles that define 3A architecture. These are not full derivations — the engineering spec carries implementation detail — but they are declared here to prevent architectural drift during spec derivation and future revision.

### 6.1 Isolation bridge resistance

Heat transfer across a declared isolation boundary:

```
Q_dot_bridge = (T_upstream - T_downstream) / R_bridge
```

where R_bridge is the explicit declared resistance in K/W. If the boundary is declared and R_bridge is absent, execution blocks. This principle forbids idealized lossless cross-boundary transfer.

### 6.2 Junction-to-sink resistance chain

The total thermal resistance from compute junction to final sink:

```
R_total = R_junction_to_case + R_case_to_spreader
        + R_spreader_to_pickup_effective + R_pickup_to_loop
        + R_loop_to_sink + R_bridge_adjustment
```

where each term is an explicitly declared input field on the thermal-zone resistance chain sub-object, R_spreader_to_pickup_effective is the nominal spreader-to-pickup resistance multiplied by the pickup geometry multiplier, and R_bridge_adjustment is the zone's declared bridge resistance when an isolation boundary is present, otherwise zero.

The implied junction temperature at a known load:

```
T_junction = T_sink + Q_dot_load * R_total
```

This principle forbids computing junction temperatures without a declared resistance path.

### 6.3 Stefan-Boltzmann radiator sizing

For each radiator face:

```
Q_dot_face = epsilon_effective * sigma * A_face * F_face * (T_rad^4 - T_sink^4)
```

where sigma = 5.670374419e-8 W/m²/K⁴, A_face is face area in m², F_face is the face view factor, T_sink is the declared background sink temperature from the scenario environment profile or a declared override field, and epsilon_effective is the emissivity resolved through the declared cavity model.

Required area inversion for a target rejection load Q_dot_required is the algebraic rearrangement of the above.

### 6.4 BOL and EOL emissivity

End-of-life emissivity is:

```
epsilon_eol = epsilon_eol_override                          (if override is declared)
epsilon_eol = epsilon_bol * (1 - degradation_fraction)     (else)
```

BOL and EOL area requirements differ. The delta must be reported and compared to declared reserve margin. Insufficient margin raises a warning.

### 6.5 Gray cavity effective emissivity approximation

For a gray-diffuse cavity with declared surface emissivity and cavity view factor:

```
epsilon_cavity_effective = 1 / ( (1/epsilon_surface) + ((1 - F_cavity) / F_cavity) )
```

Physical basis: this is the two-surface gray-body enclosure exchange factor approximation for a cavity where one surface is the emitting panel and the other is the effective environment, as described in standard radiative heat transfer references (e.g., Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, Chapter 13). This approximation is bounded and replaceable. It is not a full enclosure solver.

### 6.6 Convergence law

For any connected convergence-exchange subgraph, define the state vector x^(k) as the set of zone-boundary heat exchange values (in watts) for all convergence-enabled zone pairs at iteration k. The iteration is:

```
x^(k+1) = F(x^(k))
```

where F is defined in the engineering spec as: resolve zone temperatures from current exchange flows and resistance chain, then recompute exchange flows from updated temperatures and bridge resistances.

Convergence is declared when the maximum absolute or relative change across all state vector components falls within the declared tolerance. Runaway is declared when any state vector component exceeds the declared multiplier times its initial magnitude. Non-convergence with blocking policy active blocks execution. The engineering spec defines the exact update rule, state vector composition, and runaway trigger.

---

## 7. Functional Architecture Added by 3A

### 7.1 Thermal topology layer

3A adds a topology declaration layer on top of the current `thermal-zone` family.

Each zone declares:

- flow direction role,
- isolation-boundary state,
- upstream zone reference,
- downstream zone reference,
- optional working-fluid reference,
- optional pickup-geometry reference,
- resistance chain sub-object containing all declared resistance terms for that zone's junction-to-sink path.

### 7.2 Additive thermal-zone and stage authoring

The prior extension UI build used static single-instance tabs. Post-build review determined this structure is insufficient.

The 3A UI shall replace static single-instance zone/stage tabs with additive block authoring surfaces. The operator shall be able to:

- create any number of thermal-zone blocks,
- create any number of thermal-stage blocks,
- assign each block an explicit zone role and stage type,
- declare topology relationships between blocks,
- arrange parallel stages at the same zone level,
- configure two or more hot islands as separate zone blocks with independent temperature targets, fluid references, and resistance chains.

Each additive block compiles into a canonical zone or stage entry in `thermal_zones[]` or `thermal_stages[]` in the run packet. The runtime does not receive "tabs" — it receives ordered arrays of canonical objects. The UI is responsible for serializing the operator's additive block authoring into those arrays correctly.

This design allows the operator to model parallel heat paths, multiple hot islands, branched backbone topologies, and redundant radiator segments without restructuring the schema.

### 7.3 Convergence exchange zone support

3A introduces the convergence exchange zone as a subtype of the existing thermal-zone family, represented as a bounded `zone_role` enum value. This is not a new top-level object family. A convergence exchange zone participates in iterative exchange resolution and requires convergence to be declared in the scenario.

### 7.4 Resistance-chain layer

3A adds an explicit junction-to-sink resistance chain model. Each thermal zone that participates in the resistance chain declares its contributing resistance terms as a structured sub-object. The runtime aggregates declared chain terms and resolves junction temperature, chain heat flow, and isolation bridge loss.

### 7.5 Radiator realism layer

3A adds cavity emissivity wiring, two-sided radiator geometry handling, mission-life emissivity degradation handling, and BOL versus EOL radiator sizing visibility to the radiator family.

### 7.6 Catalog realism layer

3A adds a working-fluid catalog family and a pickup-geometry catalog family. Both carry provenance and confidence labels. The defaults audit surface covers all new output-driving fields.

### 7.7 Flag-only radiation-pressure layer

3A adds a bounded radiation-pressure metric for scenario warning and reporting only. No orbital propagation engine is added.

---

## 8. Canonical Families Preserved and Extended

3A layers onto existing canonical families:

- `scenario`
- `compute-device`
- `compute-module`
- `comms-load`
- `thermal-zone`
- `storage`
- `radiator`
- `conversion-branch`
- `run-packet`

3A shall not create a second top-level packet system.

---

## 9. Required Scope

### 9.1 Loop topology and flow ordering

Explicit topology fields on thermal zones, acyclic validation, declared chains.

### 9.2 Additive zone blocks and convergence exchange zones

Additive block UI authoring, packet compilation to plural canonical zones, convergence exchange zone role support, bounded sequential and parallel stage chaining only where explicitly declared.

### 9.3 Cycle convergence and runaway detection

Declared iteration limit, declared convergence tolerance, blocking non-convergence path, visible convergence status.

### 9.4 Isolation bridge resistance

Explicit cross-boundary resistance field, runtime bridge loss accounting, visible loss reporting.

### 9.5 Working-fluid catalog surface

Bounded starter catalog, intrinsic properties only, provenance and confidence labels.

### 9.6 Defaults audit gate

Full default surface review before merge. No schema or runtime merge without documented default table.

### 9.7 Cavity emissivity wiring

Declared cavity-emissivity mode, runtime equation hook, visible effect in radiator sizing.

### 9.8 Two-sided radiator geometry

Geometry mode declaration, per-face view factor handling, per-face contribution visibility.

### 9.9 Mission-life emissivity degradation

BOL emissivity basis, degradation basis or EOL override, BOL/EOL delta reporting, reserve-margin warning path.

### 9.10 Thermal resistance chain

Explicit declared chain from junction to sink, per-zone resistance term fields, chain contribution visible in runtime outputs.

### 9.11 Pickup geometry catalog

Bounded pickup geometry families, declared link from geometry selection to resistance chain multiplier.

### 9.12 Radiation-pressure flag

Scalar screening metric, warning/report output only, no dynamics solver.

---

## 10. Explicit Out of Scope

3A does not include:

- vault atmosphere coupling depth,
- pump parasitic subsystem depth,
- eclipse buffer behavior,
- TEG side-harvest extensions,
- exploratory catalogs with no runtime effect,
- TPV recapture feedback loop.

---

## 11. UI Information Architecture Changes

### 11.1 Thermal Architecture surface

The thermal architecture surface shall add:

- additive zone create / delete / duplicate / reorder controls,
- per-zone topology field editors (flow direction, upstream/downstream refs, isolation boundary),
- convergence exchange zone role selector,
- isolation bridge resistance field,
- resistance chain sub-object editor (all R terms per zone),
- working-fluid selector with catalog lookup,
- pickup-geometry selector with catalog lookup,
- per-zone defaults provenance display.

### 11.2 Stage authoring surface

The stage authoring surface shall support:

- additive stage block create / delete / duplicate / reorder controls,
- parallel stage placement at the same zone level,
- per-stage zone assignment from declared zones,
- stage type selection from canonical stage categories.

### 11.3 Radiator and Storage surface

The radiator/storage surface shall add:

- cavity emissivity mode selector,
- cavity emissivity basis fields,
- geometry mode selector (single-sided, double-sided symmetric, double-sided asymmetric),
- per-face area and view factor fields,
- BOL emissivity field,
- degradation fraction or EOL emissivity override,
- BOL/EOL area preview and delta summary,
- background sink temperature override field.

### 11.4 Output and Packet surface

The packet/output surface shall add:

- topology report summary,
- convergence report summary,
- resistance-chain summary per zone,
- defaults audit summary,
- BOL/EOL radiator delta summary,
- radiation-pressure warning summary,
- catalog ids and versions used.

---

## 12. Output Framing Requirements

3A outputs must show, at minimum:

- what zones were declared and their declared topology order,
- whether topology validation passed,
- whether convergence was attempted and whether it converged,
- how much bridge resistance loss was applied per boundary,
- resistance chain totals per zone,
- what working fluid and pickup geometry were selected where relevant,
- BOL radiator sizing,
- EOL radiator sizing,
- the delta between BOL and EOL sizing,
- whether reserve margin is sufficient,
- whether radiation-pressure flags were raised.

---

## 13. Controls, Gates, and Acceptance

### 13.1 Pre-merge gates

3A shall not merge without:

- schema validation,
- state compiler validation,
- UI additive-zone creation/deletion/reorder validation,
- runtime topology validation,
- bounded regression for radiator BOL/EOL sizing,
- failure-path tests for cycle non-convergence,
- documented defaults audit completion.

### 13.2 Acceptance intent

This blueprint is product-acceptable only if the matching engineering spec defines:

- exact field ownership and naming for topology additions and resistance chain sub-object,
- exact runtime equations for resistance, radiator, and convergence handling with fully declared input sources,
- exact default table,
- exact validation behavior,
- exact file additions and patch order,
- explicit issue logging for any best-solve decisions.

---

## 14. Risks and Mitigations

### 14.1 Drift risk from prior extension terminology

Mitigation: trace repo behavior, not prior extension labels. Keep issue log attached. Extension 2 spec/blueprint is historical reference only.

### 14.2 Over-idealized radiator risk

Mitigation: BOL/EOL sizing, two-sided geometry, cavity-emissivity equation, per-face view factors, declared sink temperature source.

### 14.3 Under-specified convergence risk

Mitigation: explicit state vector definition, explicit update rule F, explicit stopping criteria, blocking failure path.

### 14.4 Catalog realism risk

Mitigation: intrinsic fluid data only, geometry-to-math linkage only, confidence/provenance visible.

### 14.5 Runtime complexity creep risk

Mitigation: preserve canonical families, bound 3A to foundational hardening only, enforce out-of-scope list.

### 14.6 Static tab regression risk

Mitigation: additive block UI design is explicitly declared in §7.2 as required. Static single-instance tab structure is explicitly prohibited for zone and stage authoring surfaces.

---

## 15. Required Companion Logs

The 3A authoring packet shall include:

- deterministic assembly log,
- issue log (`diff`, `hole`, `additive`, `contra`) — current version: `extension-3a-authoring-issue-log-v0.2.0.md`,
- default surface audit log,
- implementation ledger when build work begins.

---

## 16. Owner Approval Requirement

This draft is not canonical until owner approval is granted for all logged best-solve items in the companion issue log. Until that approval, this file is the proposed 3A blueprint, not active repo law.
