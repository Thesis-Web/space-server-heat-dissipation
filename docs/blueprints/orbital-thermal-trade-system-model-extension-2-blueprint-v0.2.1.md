# Orbital Thermal Trade System Model Extension 2 Blueprint v0.2.1

## 1. Document Control

- Document Type: Blueprint
- Project: space-server-heat-dissipation
- Version: v0.2.1
- Status: Controlled extension blueprint
- Owner: James
- Relationship to governing law:
  - Supplements `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
  - Supplements `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
  - Supplements `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md`
  - Supplements `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md`

---

## 2. Intent

Model Extension 2 adds a deterministic, research-visible, spectrally-aware exploratory layer to the orbital thermal trade system.

Its purpose is to let the product represent, compare, and bound architectures that attempt to:

- route low-grade chip waste heat through spectrally selective absorber / emitter / cavity systems
- use refractory, eutectic, PCM, or hybrid mediator structures as concentration or storage stages
- separate baseline thermal behavior from exploratory spectral-routing behavior
- preserve explicit accounting for work input, external thermal input, storage discharge, losses, and unresolved confidence
- expose bounded deltas rather than silently rewriting baseline law

This extension is not a declaration that interstitial-radiation-guided concentration is proven. It is a deterministic extension for disciplined exploration.

---

## 3. Product Positioning After Extension 2

After this extension, the product becomes:

- a deterministic orbital compute thermal trade engine
- a catalog-driven packet builder
- a runtime-authoritative comparison engine
- a bounded exploratory platform for spectrally engineered thermal concepts

The product remains not:

- proof that passive waste-heat concentration is solved
- proof that spectral matching alone creates net temperature lift
- a substitute for bench characterization of materials, coatings, cavities, or mediator behavior
- a flight-certification solver

This framing is mandatory in UI, packet, and guides.

---

## 4. Non-Negotiable Design Principles

### 4.1 Runtime authority remains singular
The browser UI may display helper values and collect exploratory assumptions, but the runtime remains the only numerical authority.

### 4.2 Every exploratory variable must be fully declared
Each exploratory variable shall have:
- semantic meaning
- data type
- units or explicit dimensionless state
- numeric domain
- default value
- provenance class
- maturity class
- confidence class
- research-required rule

### 4.3 Baseline and exploratory outputs must remain separable
The system must preserve:
- `baseline_result`
- `exploratory_result`
- `delta_result`

The baseline path must remain reproducible without Extension 2 enabled.

### 4.4 No silent free lunch
No absorber, cavity, hot island, mediator, regeneration stage, or solar-polish concept may imply net uplift without explicit accounting for:
- available source heat
- capture fraction
- band overlap
- geometry coupling
- mediator transfer
- thermal loss
- work input if any
- external thermal input if any
- storage drawdown if any

### 4.5 Research honesty is mandatory
Unknown material behavior, unvalidated frequency claims, placeholder coefficients, and hypothesis-only variables must remain visible throughout UI, packet, output, and guides.

### 4.6 Compatibility-first implementation
Extension 2 shall layer onto the existing canonical families:
- `scenario`
- `compute-device`
- `compute-module`
- `comms-load`
- `thermal-zone`
- `storage`
- `radiator`
- `conversion-branch`
- `run-packet`

It must not create a second top-level runtime packet system.

### 4.7 Thin UI, thick contracts
The UI shall expose controls only for deterministic schema fields and runtime-visible packet structures.

### 4.8 Material Variable Classification Rule
Every material-facing field shall be classified as one of:
- `authoritative_baseline`
- `cataloged_exploratory`
- `metadata_only`

Definitions:
- `authoritative_baseline`: already present in baseline repo law and already allowed to affect baseline runtime outputs
- `cataloged_exploratory`: allowed to affect exploratory outputs only through explicit Extension 2 runtime equations and only when serialized in normalized packet state
- `metadata_only`: may affect warnings, confidence, or guide text, but shall not affect numeric outputs unless a future law promotes it

Required examples:

**authoritative_baseline**
- radiator emissivity where already canonical
- canonical storage-energy basis where already canonical
- canonical branch-efficiency basis where already canonical
- canonical source temperature basis where already canonical

**cataloged_exploratory**
- absorber wavelength band
- absorber absorptivity
- cavity optical access factor
- cavity nominal view factor
- cavity nominal path-length factor
- mediator specific energy basis
- mediator density basis
- mediator nominal thermal buffer fraction
- emitter nominal selectivity fraction

**metadata_only**
- contamination sensitivity
- corrosion sensitivity
- radiation sensitivity
- manufacturability class
- source note text

No material family may remain a label-only dropdown.

---

## 5. Scope Added by Extension 2

### 5.1 Source spectral characterization
Support configurable source-band descriptors for waste-heat origin zones and branch inlets.

### 5.2 Material and surface exploration
Support selectable absorber, emitter, cavity, and mediator families with structured metadata and evidence state.

### 5.3 Spectral coupling
Support explicit, bounded coefficients for source-band matching, geometry coupling, mediator transfer, and regeneration quality.

### 5.4 Research confidence
Support provenance, maturity, confidence, and research-required metadata for all Extension 2 assumptions.

### 5.5 Baseline-versus-exploratory comparison
Support side-by-side or delta-aware outputs showing how exploratory spectral architecture differs from baseline architecture under the same mission load.

### 5.6 Deterministic packet extension
Serialize all Extension 2 variables as deterministic packet and bundle metadata.

### 5.7 Guide expansion
Document what Extension 2 is, how to use it, and how not to over-claim results.

---

## 6. New Product Concepts

### 6.1 Source spectral profile
A source spectral profile describes the assumed thermal-emission band family of a source zone or branch inlet.

### 6.2 Absorber family
An absorber family describes the wavelength region, absorptivity behavior, temperature range, and evidence state of an absorber surface or receiver concept.

### 6.3 Emitter family
An emitter family describes the wavelength region, emissivity behavior, selectivity behavior, temperature range, and evidence state of a reject or conversion-coupled emitter concept.

### 6.4 Cavity geometry family
A cavity geometry family describes the optical access, nominal view factor, area multiplier, and coupling uniformity class of a receiver or hot-island cavity topology.

### 6.5 Mediator family
A mediator family describes the thermal-storage or transfer medium between source capture and target use, including temperature band, specific energy basis, density basis, risk sensitivities, and compatibility classes.

### 6.6 Spectral concentration stage
A spectral concentration stage is a bounded exploratory stage that routes source heat through declared absorber, cavity, mediator, and emitter concepts using explicit coefficients and losses.

### 6.7 Regenerative hot island
A regenerative hot island is a storage-coupled zone that accepts routed thermal input, loses energy through explicit loss rules, and may later discharge to a radiator or branch.

### 6.8 Solar-polished hot island
A solar-polished hot island is a regenerative hot island that also receives declared external thermal input from a separate source term.

---

## 7. Updated UI Information Architecture

Extension 2 extends the seven-tab UI introduced by the UI expansion patch line.

### 7.1 Tab 1 — Scenario
Add:
- `enable_model_extension_2`
- `model_extension_2_mode`
- `research_packet_intent`
- `exploratory_result_policy`
- `strict_research_enforcement`

### 7.2 Tab 2 — Compute Payload
Add display/helper section:
- source spectral profile selector or derived default
- nominal package temperature band
- Wien-law helper card
- profile provenance label

### 7.3 Tab 3 — Non-Compute Payload
Allow optional source spectral profiles for payload-origin heat sources where relevant.

### 7.4 Tab 4 — Thermal Architecture
Add repeatable spectral-stage blocks with:
- source zone mapping
- target zone mapping
- absorber family selector
- emitter family selector
- cavity geometry selector
- mediator family selector
- stage mode selector
- explicit coefficient inputs
- provenance / maturity / confidence controls
- stage summary card

### 7.5 Tab 5 — Radiator & Storage
Add:
- exploratory hot-island storage card
- mediator temperature-band card
- emitter family selector
- variable-emissivity exploratory flag
- baseline vs exploratory radiator summary cards

### 7.6 Tab 6 — Optional Branches
Extend branch blocks with:
- source-quality qualifier
- exploratory coupling disclosure
- exergy sensitivity disclosure

### 7.7 Tab 7 — Output & Packet
Add:
- baseline result card
- exploratory result card
- delta result card
- stage results table
- research-confidence summary
- extension-2 manifest section

### 7.8 UI-to-runtime determinism rule
Every Extension 2 UI control shall map to exactly one of:
- canonical schema field
- extension schema field
- normalized derived field
- metadata-only field

No UI control may exist without declared packet serialization behavior.

For any control that can be auto-derived:
- the derived value must be shown
- the derivation basis must be preserved
- the normalized result must be serialized explicitly if used by runtime

---

## 8. Required Catalog Families

The product shall add:
- source spectral profiles
- absorber families
- emitter families
- cavity geometries
- mediator families
- research evidence classes

Each catalog entry must be versioned, schema-valid, and free of executable logic.

---

## 9. Architecture Expansion Intent

### 9.1 Controlled compute vault remains primary source
The compute vault remains the canonical primary source zone for compute waste heat.

### 9.2 Low-gradient transport remains explicit
Extension 2 does not delete or obscure low-gradient transport paths.

### 9.3 Spectral stages are optional and explicit
A scenario may include zero, one, or multiple spectral stages, but each must be declared and individually serialized.

### 9.4 Regenerative and active hot islands remain distinct
The system must preserve separate roles for regenerative storage and active discharge / consumer-facing zones.

### 9.5 Solar polish remains external augmentation
Solar polish is external thermal augmentation and must never be confused with waste-heat-only concentration.

---

## 10. Mathematical Positioning

### 10.1 Authoritative accounting math
The following remain runtime-authoritative:
- thermal load aggregation
- total reject accounting
- storage state progression
- radiator rejection math
- Carnot bounds where branches use them
- work-input accounting
- external thermal input accounting

### 10.2 Bounded exploratory math
The following may be runtime-computed only as bounded exploratory terms with explicit disclosure:
- source-band peak wavelength estimate
- band overlap score
- geometry coupling score
- stage exploratory transfer factor
- exploratory useful transfer
- exploratory target-zone inlet delta

### 10.3 Prohibited math behavior
The runtime must not:
- imply perpetual concentration
- imply temperature lift from zero source terms
- hide work terms
- hide losses
- turn a placeholder coefficient into a silent law constant

---

## 11. Material Variable Philosophy

Every material-facing field must be modeled as one of three classes:

### 11.1 Authoritative baseline fields
Fields that already affect baseline runtime law:
- radiator emissivity
- storage energy basis where already canonical
- branch efficiency where already canonical
- source temperatures where already canonical

### 11.2 Cataloged exploratory fields
Fields that may affect exploratory outputs only through explicit Extension 2 formulas:
- absorber wavelength band
- absorber absorptivity
- cavity optical access factor
- cavity view factor
- mediator specific energy basis
- mediator density basis
- emitter selectivity fraction
- variable-emissivity exploratory mode

### 11.3 Metadata-only fields
Fields that shall not change outputs directly until future law explicitly promotes them:
- contamination notes
- corrosion notes
- radiation sensitivity notes
- manufacturability class
- source note text

---

## 12. Required Material Data Posture

The system shall require full structured data for each material family entry, including:
- nominal wavelength band
- nominal thermal range
- nominal optical or thermal coefficients
- risk sensitivity classes
- provenance class
- maturity class
- confidence class
- default enable/disable posture
- research-required boolean

No material family may exist as a label-only dropdown.

---

## 13. Required Output Philosophy

The system shall emit:
- baseline architecture summary
- exploratory architecture summary
- declared exploratory coefficients and defaults
- provenance / maturity / confidence section
- research-required flags
- baseline-versus-exploratory delta section
- cautionary note if exploratory variables materially affect radiator area, branch viability, or storage behavior

### 13.1 Baseline / exploratory / delta separation rule
The output surface shall preserve three independent result sections:
- `baseline_result`
- `exploratory_result`
- `delta_result`

`delta_result` shall be computed only from explicit baseline and exploratory runtime sections, never from browser-side arithmetic.

---

## 14. Operator Workflow

1. build baseline scenario
2. enable Extension 2
3. choose or derive source spectral profile
4. choose absorber / cavity / mediator / emitter families
5. set or accept bounded coefficients
6. review research-confidence warnings
7. generate baseline and exploratory outputs
8. inspect delta and uncertainty together

Exploratory outputs must never masquerade as baseline deterministic outputs.

---

## 15. Documentation Requirements

### 15.1 Operator guide
Must explain:
- what Extension 2 is for
- how to enable it
- what each new dropdown and coefficient means
- which outputs are authoritative versus exploratory
- how to interpret deltas and flags

### 15.2 Research guide
Must explain:
- how source profiles are derived
- how material family fields are sourced
- how confidence classes are assigned
- when coefficients are placeholder-only
- what bench data is required to upgrade confidence

---

## 16. Success Condition

Extension 2 is successful when:
1. the product can represent spectral / hot-island research concepts without breaking baseline law
2. every new variable is serialized deterministically
3. changing Extension 2 variables changes exploratory outputs through explicit runtime math paths
4. baseline and exploratory outputs remain separate and inspectable
5. runtime authority is preserved
6. research uncertainty remains visible in UI, packet, and report surfaces
7. the extension fits the current repo like a controlled layer rather than a redesign

---

## 17. Out of Scope

This extension does not:
- prove the interstitial-radiation model as settled physics
- declare exact production coefficients for spectral concentration hardware
- certify any material family for flight
- replace the baseline thermal architecture model
- authorize browser-only performance claims
- bypass future materials and bench-research programs

---

## 18. Local UI Server Launch

The UI must be launchable by a single user action without requiring the operator to manually invoke terminal server commands.

The product shall ship a `start-ui.sh` script at the repo root that:
- starts a local HTTP server serving `ui/app/` on port 8080
- opens the browser to `http://localhost:8080` using the platform-appropriate open command
- prints the URL to stdout regardless of auto-open availability
- requires no build step and no npm invocation

---

## 19. Run Packet Output Surface

After the operator builds a packet, a "Run Packet" button shall appear adjacent to the Download Bundle button.

When the operator activates "Run Packet":
- A new browser tab opens displaying a self-contained formatted HTML summary of the compiled packet
- The surface clearly labels all numeric values as preview only
- The raw JSON bundle is available as a "Download Bundle" artifact within that surface
- The surface carries the runtime authority declaration per spec §4.1 and §14

The formatted output surface shall render at minimum:
- packet identity and timestamp
- scenario summary table
- compute payload summary with preview module total
- radiator configuration summary with preview area sizing
- branch summary
- research-required items
- bundle file manifest
- transform trace
- Download Bundle button

The output surface shall not contain a solver. All numeric values are derived from UI-side state and are labeled display-only.

---

## 18. Local UI Server Launch

The UI must be launchable by a single user action without requiring the operator to manually invoke terminal server commands.

The product shall ship a `start-ui.sh` script at the repo root that:
- starts a local HTTP server serving `ui/app/` on port 8080
- opens the browser to `http://localhost:8080` using the platform-appropriate open command
- prints the URL to stdout regardless of auto-open availability
- requires no build step and no npm invocation

---

## 19. Run Packet Output Surface

After the operator builds a packet, a "Run Packet" button shall appear adjacent to the Download Bundle button.

When the operator activates "Run Packet":
- A new browser tab opens displaying a self-contained formatted HTML summary of the compiled packet
- The surface clearly labels all numeric values as preview only
- The raw JSON bundle is available as a "Download Bundle" artifact within that surface
- The surface carries the runtime authority declaration per spec §4.1 and §14

The formatted output surface shall render at minimum:
- packet identity and timestamp
- scenario summary table
- compute payload summary with preview module total
- radiator configuration summary with preview area sizing
- branch summary
- research-required items
- bundle file manifest
- transform trace
- Download Bundle button

The output surface shall not contain a solver. All numeric values are derived from UI-side state and are labeled display-only.
