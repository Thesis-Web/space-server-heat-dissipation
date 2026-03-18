# Orbital Thermal Trade System Blueprint

Version: v0.1.0 Status: canonical human blueprint Date: 2026-03-18 Owner: James Project:
space-server-heat-dissipation

## 1. Purpose

This blueprint defines the canonical human design for a deterministic, AI-assisted orbital thermal
trade system. The system is intended to model modular orbital compute nodes and their thermal,
electrical, packaging, and optional energy-export behavior under configurable architectures and
operating conditions.

This document is the primary concept and product authority for the build.

It defines:

- what the product is
- what the product is not
- what the product must model
- how the human operator interacts with the system
- how AI systems participate in design, research, build, and compilation
- what outputs the system must produce
- which architectural separations are mandatory
- what implementation philosophy must govern the later engineering specification

This document is intentionally broader than an engineering specification. It defines the full system
concept, boundaries, workflow, product logic, and control philosophy that all later implementation
artifacts must obey.

## 2. Product Statement

The product is a deterministic orbital compute thermal trade system.

It is not a final spacecraft design and it is not a single closed thermal solution. It is a
structured design and trade engine that allows a user to configure an orbital compute node, change
assumptions, add or remove stages, change thermal transport strategies, change device classes,
change radiator assumptions, add or remove optional conversion branches, and observe the resulting
computed outputs.

The product exists to answer questions such as:

- how much radiator area is implied by a given architecture
- how cold or hot each thermal zone must operate
- how much parasitic electrical load is consumed by thermal-control choices
- how different chipsets affect useful thermal gradients
- how optional branches such as reverse Brayton, Stirling, TPV, TEG, or directed RF export change
  the trade space
- how non-compute loads such as crosslinks, telemetry, communications, and radar alter system
  balance
- how the design changes across node classes, mission modes, and orbit assumptions

The system is intended to support serious trade analysis, not narrative ideation.

## 3. Strategic Product Framing

The product should be framed as a decision-grade trade platform for orbital compute thermal
architecture.

The first commercial-grade value is not a claim that orbital waste heat export is solved. The first
value is a system that computes the consequences of architecture choices in a repeatable and
inspectable way.

The product is therefore positioned as:

- a thermal architecture trade engine
- a node configuration modeling system
- a design packet generator for AI-assisted structured analysis
- a deterministic build substrate for future deeper solvers and report generation

This framing is mandatory because the project contains both defensible physical structure and
speculative architecture branches. The product must expose the trade space without forcing
unsupported claims.

## 4. Primary Objectives

The system must:

- allow full schema-driven configuration of orbital compute-node scenarios
- treat compute payload configuration as a first-class input
- treat thermal zones and stage boundaries as first-class inputs
- compute descriptive numeric outputs rather than issuing simplistic pass or fail judgments in the
  core engine
- surface warnings, flags, bounds violations, and comparison deltas
- support modular insertion or removal of optional thermal and energy-conversion branches
- support operator-visible outputs for idle, light, medium, and full-load conditions
- support human-readable and machine-readable artifact generation
- support deterministic AI orchestration using pinned documents and schema-valid packets

## 5. Non-Goals

The initial system does not attempt to:

- prove that a final spacecraft architecture is commercially viable
- replace detailed CFD, FEA, radiation-effects analysis, or full mission simulation
- act as a final flight software stack
- allow freeform AI reasoning to override numeric authority
- bury uncertainty under a single summary verdict
- turn the browser UI into the primary solver or primary source of truth
- conflate physically distinct operating modes for convenience

## 6. Canonical Design Principles

The system must obey the following principles.

### 6.1 Schema first

All meaningful user selections, runtime calculations, prompt packets, reports, and comparisons must
be rooted in structured schemas.

### 6.2 Numeric authority is separate from language authority

Human language systems may explain, compare, normalize, critique, and compile. They do not serve as
the canonical numeric authority.

### 6.3 The engine computes and the report interprets

The core engine emits descriptive outputs, deltas, and flags. Interpretation is layered on top.

### 6.4 Modular stage composition

The architecture must support adding, removing, or replacing stages without rewriting the whole
system.

### 6.5 State-transform modeling

Each stage is modeled by what enters, what leaves, what is consumed, what is produced, and which
constraints apply.

### 6.6 No free lunch rules

The blueprint must preserve hard distinctions between heat-lift architectures and true
power-generation architectures. Work input and thermal source quality must remain explicit.

### 6.7 Thin UI, thick contracts

The browser UI is a packet builder and validation surface, not a replacement solver.

### 6.8 Deterministic AI by AI

AI systems may participate heavily, but only through pinned documents, defined roles, explicit
outputs, and controlled drift boundaries.

## 7. Users and Operators

The system is intended for the following operator classes.

### 7.1 Primary operator

The primary operator is the human project owner who defines the objective, selects scenario
assumptions, chooses branches, interprets outputs, and controls final decisions.

### 7.2 Design compiler

A language-model assistant is used to author canonical blueprints, engineering specifications,
schema definitions, output contracts, and conformance logic.

### 7.3 Build orchestrator

A hub model is used to implement code, execute structured runs, compare artifacts, and assemble
output packages under the control of pinned design artifacts.

### 7.4 Research verifier

A citation-first research model is used to obtain and refresh material properties, component
envelopes, literature findings, and contradiction checks.

## 8. Source of Truth Hierarchy

The project must use a strict authority stack.

### 8.1 Human canonical blueprint

This document is the top conceptual authority.

### 8.2 Human canonical engineering specification

The engineering specification converts this blueprint into build law.

### 8.3 AI-pinned build blueprint and AI-pinned build specification

These are derived, tighter, line-item build-law abstractions of the human canonical documents and
are what implementation-oriented AI systems are expected to obey during build execution.

### 8.4 Runtime formulas and schema contracts

These serve as machine-enforced authority for computation and validation.

### 8.5 Reports and narrative summaries

These are downstream artifacts and are never allowed to silently alter upstream architecture or
calculation rules.

## 9. Product Boundaries

The product boundary for v0 includes:

- scenario definition
- compute payload definition
- thermal-zone and thermal-stage composition
- radiator and emitter configuration
- optional storage and conversion branches
- non-compute load modeling for communications, telemetry, and radar functions
- runtime computations and flags
- packet generation for AI-assisted analysis and reporting
- lightweight browser UI for input selection and packet generation

The product boundary for v0 excludes:

- full orbital mechanics simulation
- high-fidelity structural dynamics
- full radiation-hardness solver
- atmospheric beam propagation at defense-grade fidelity
- final launch-vehicle integration analysis
- final financial pro forma

## 10. Architecture Overview

The system consists of four top-level layers.

### 10.1 Canonical design layer

Contains blueprint, engineering spec, operator guides, prompt contracts, and conformance rules.

### 10.2 Schema layer

Contains the structured data models used by the UI, runtime engine, AI packets, reports, examples,
and validation pipelines.

### 10.3 Runtime authority layer

Contains formulas, validation logic, constraints, unit handling, scenario execution, comparison
logic, and artifact generation.

### 10.4 Interaction layer

Contains the lightweight browser UI, generated machine payloads, generated prompt packets, and
assembled report outputs.

### 10.5 Governing math in blueprint scope

The blueprint must carry enough governing math, locked equations, reference cases, and variable
definitions to prevent architectural drift during engineering-spec derivation.

The blueprint is not the place for exhaustive derivations, implementation code, or full validation
harness detail. Those belong in the engineering specification and runtime authority layer.

However, the blueprint must still include:

- the canonical governing equations that define the architecture
- the variable names and physical meaning of those equations
- the interpretation boundaries for each equation
- the reference sizing cases that anchor trade intuition
- the explicit distinction between descriptive outputs and judgment outputs

This project is math-governed. The blueprint must therefore be mathematically anchored, even though
the engineering specification will carry the heavier implementation detail.

## 11. Scenario Model

A scenario is the top-level container for a system run.

A scenario must define the outer context in which all deeper choices are interpreted.

The scenario model must include, at minimum:

- scenario identifier
- scenario version
- scenario label
- orbit class
- thermal environment class
- mission mode
- node class
- system architecture class
- utilization profile family
- thermal policy
- selected optional branches
- reporting preferences

### 11.1 Orbit class

For v0 and the first deterministic build track, the orbit class is GEO only.

The blueprint intentionally excludes LEO, MEO, and other orbital classes from the initial build
because eclipse cadence, contact-window behavior, thermal cycling burden, and communications-window
constraints materially complicate the model and weaken focus during early architecture locking.

The initial scenario model must therefore support:

- GEO
- custom GEO environment profile

Other orbit classes are explicitly reserved for later blueprint revisions and must not be introduced
into v0 implementation unless the canonical documents are formally revised.

### 11.2 Mission mode

The model must support, at minimum:

- compute only
- compute plus communications
- compute plus communications plus sensing
- compute plus export experimentation

### 11.3 Node class

The model must support, at minimum:

- 50 kW class
- 300 kW class
- 1 MW class
- custom node class

### 11.4 Utilization profile

The model must support the following named operating states at minimum:

- idle
- light
- medium
- full

It must also support custom duty-cycle definitions.

## 12. Compute Payload Model

The compute payload model is a first-class subsystem.

The system must not hardcode a single accelerator family or assume a single ideal chipset. The
operator must be able to choose among different present and future devices, including devices with
higher allowable operating temperatures.

### 12.1 Compute device family

The system must support a compute-device schema that includes, at minimum:

- vendor
- family
- sku or label
- device type
- nominal TDP
- peak TDP
- allowable junction temperature
- allowable package temperature
- allowable cold-plate target range
- heat flux density
- nominal idle, light, medium, and full-load electrical behavior
- package mass estimate
- packaging notes

### 12.2 Compute module

The compute module schema must support, at minimum:

- device selection
- device count
- board count
- memory or attached accelerator overhead
- power-conversion overhead
- network overhead
- storage overhead
- redundancy mode
- target load profile
- board-level thermal grouping

### 12.3 Hot-capable device support

The system must explicitly support hotter-tolerant device selections because allowable higher
operating temperatures can improve downstream thermal usefulness and alter the trade space between
cold-loop targets, exchanger approach temperatures, hot-backbone inlet temperatures, and resulting
radiator burdens.

The system must not assume that a hotter-capable chip is automatically preferable. The report layer
must preserve the trade between useful temperature gain and packaging, reliability, hotspot, and
lifetime penalties.

## 13. Non-Compute Electrical Load Model

The product must model non-compute internal loads as first-class contributors to total internal
dissipation and thermal burden.

These must include, at minimum:

- communications payload power
- telemetry payload power
- radar or sensing payload power
- optical inter-satellite link power
- power-conversion losses
- control-system power
- thermal-management parasitics

The operator must be able to enable or disable specific non-compute loads.

## 14. Thermal Architecture Model

The thermal architecture must be explicitly zone-based and stage-based.

### 14.1 Canonical zones

The baseline architecture must support four canonical thermal zones.

#### Zone A — Compute vault and cold-loop domain

This is the domain that directly interfaces with the compute hardware and other
temperature-sensitive components.

#### Zone B — Heat-exchanger boundary domain

This is the transition region between the cold-sensitive domain and any hotter transport or storage
domain.

#### Zone C — High-temperature backbone and storage domain

This is the optional or required domain for elevated-temperature transport, storage, and branch
feeding.

#### Zone D — Radiator and emitter field domain

This is the final rejection or emission domain.

The engine must allow additional zones only through explicit schema-defined extension rather than ad
hoc narrative.

### 14.2 Thermal stages

A thermal stage is a modular component that transforms thermal and work state across the system.

Every thermal stage must declare, at minimum:

- stage identifier
- stage type
- input heat state
- output heat state
- work input
- work output
- losses
- temperature bounds
- pressure bounds if relevant
- material or working-fluid dependencies
- optional flags

### 14.3 Stage categories

The model must support, at minimum, the following stage categories:

- direct capture stage
- transport stage
- exchanger stage
- storage stage
- lift stage
- power-cycle stage
- emission stage
- rejection stage
- branch interface stage

## 15. Thermal Transport Options

The system must support configurable thermal transport primitives.

These may include, at minimum:

- pumped single-phase liquid loop
- pumped gas loop
- loop heat pipe or capillary transport abstraction
- immersion-cooled module abstraction
- phase-change material buffer abstraction
- direct hot-body transfer abstraction
- gas-to-gas exchange abstraction
- gas-to-solid exchange abstraction
- liquid-to-solid exchange abstraction

The v0 blueprint does not require all options to be implemented immediately, but it requires the
architecture and schemas to anticipate them cleanly.

## 16. Working Fluid and Coolant Model

The system must support configurable thermal media as structured selections rather than prose-only
choices.

The model must include, at minimum:

- fluid or medium identifier
- medium class
- intended use domain
- temperature range
- pressure notes
- compatibility notes
- density or mass notes
- hazards or restrictions
- confidence or maturity classification

The system must support at least:

- gas-loop working media
- liquid-loop dielectric media
- solid or latent storage media

## 17. Radiator and Emitter Model

The system must treat radiator and emitter configuration as a first-class modeled subsystem.

The radiator model must include, at minimum:

- target surface temperature
- emissivity assumption
- effective radiating area
- packaging notes
- deployment notes
- material family
- geometry notes
- reserve margin notes

The engine must output radiator sizing and related descriptive quantities without embedding a
simplistic final viability verdict in the core computation layer.

The report layer may add packaging warnings, scale warnings, or system-level concern flags.

## 18. Storage Model

The product must support optional thermal storage.

The storage model must support, at minimum:

- storage medium identifier
- storage class
- sensible or latent characterization
- target temperature domain
- usable storage capacity abstraction
- mass estimate input or output fields
- integration zone
- charge and discharge notes

This model exists to support both simple buffering and higher-temperature branch-feeding scenarios.

## 19. Optional Conversion and Branch Model

The product must support optional branches that may be included or excluded from a scenario without
redesigning the entire system.

### 19.1 Branch categories

The system must support, at minimum:

- no branch
- reverse-Brayton or heat-lift branch
- Brayton power-cycle branch
- Stirling branch
- TPV branch
- TEG branch
- RF export branch
- laser export branch
- custom branch placeholder

### 19.2 Mandatory separation of branch logic

The system must preserve hard conceptual separation between the following categories:

- heat-lift mode
- true power-generation mode
- electrical conversion mode
- directed-energy emission mode

These may interact, but they may not be silently merged or narrated as if they are physically
equivalent.

### 19.3 Heat-lift mode

Heat-lift mode is any branch in which external work is consumed to move heat to a more useful or
more rejectable state.

### 19.4 True power-cycle mode

True power-cycle mode is any branch that generates work from a sufficiently high-quality thermal
source. This mode must be modeled separately from heat-lift mode.

### 19.5 Scavenging mode

Scavenging mode includes low-grade recovery branches such as TEG-like devices. These may be modeled,
but must not be allowed to masquerade as architecture-defining replacements for rejection.

## 20. Communications, Telemetry, and Radar Model

The system must explicitly support non-compute mission loads that contribute to both electrical
demand and thermal output.

This section is not limited to mission overhead bookkeeping. It also covers use cases in which
excess or high-gradient thermal conditions may support downstream branches that produce usable
emitted radiation, communications capability, telemetry support, sensing support, or thermal-load
redirection strategies.

This includes, at minimum:

- inter-satellite RF communications
- downlink or telemetry RF communications
- radar or active sensing loads
- optical communications or crosslinks
- optional branches that use high-gradient thermal conditions to support power-conversion or
  emitted-radiation functions

The operator must be able to toggle these loads or branches on or off and vary their duty or
intensity profile.

The blueprint does not assume that any such branch is automatically efficient, dominant, or
architecture-defining. It only requires that these branches be representable and comparable when
included.

## 21. Runtime Output Philosophy

The engine must compute descriptive outputs. It must not reduce the entire design space to a
simplistic works or does not work statement.

The engine must output numeric consequences and explicit flags.

This distinction is mandatory.

### 21.1 Required output classes

The system must produce at least the following output families.

#### Thermal outputs

- internal heat load
- external absorbed heat if modeled in scenario scope
- total reject load
- zone temperatures or target temperature states
- radiator target temperature
- effective radiator area
- storage behavior summary
- stage-level losses

#### Electrical outputs

- total bus load
- compute load
- non-compute load
- parasitic thermal-management load
- branch power consumption or generation
- net remaining electrical margin if modeled

#### Packaging and mass outputs

- estimated subsystem masses where available
- estimated radiator mass abstraction where available
- storage mass abstraction where available
- notable packaging implications

#### Comparison outputs

- scenario deltas across alternatives
- stage-on versus stage-off comparisons
- device-family comparisons
- utilization-state comparisons

## 22. Flags and Problem Areas

The product must support surfaced problem areas without collapsing them into a single binary
verdict.

The flag system must include, at minimum:

- exceeds selected material range
- exceeds selected fluid range
- exceeds selected device thermal policy
- requires extreme target surface temperature
- requires large radiator scale
- requires high parasitic work input
- low-significance recovery branch output
- assumption incompleteness
- research confirmation required

Flags are descriptive warnings and review prompts. They are not substitutes for the underlying
numeric outputs.

## 23. Comparison and Trade Philosophy

The product must make side-by-side trade evaluation easy.

The system must support comparisons such as:

- chipset family A versus chipset family B
- conservative versus aggressive thermal policy
- no storage versus storage
- no heat-lift branch versus reverse-Brayton branch
- no branch versus TPV branch
- compute-only versus compute plus RF/radar loads
- one orbit class versus another

The purpose of the system is not only to compute one architecture but to illuminate the design trade
space.

## 24. Browser UI Philosophy

The browser UI must remain intentionally lightweight.

It is not the primary solver. It is a structured scenario selector, schema validator, summary
surface, and packet generator.

### 24.1 UI responsibilities

The UI must:

- expose structured input controls for supported schema families
- validate user entries at the schema level where practical
- show a compact summary of scenario choices
- generate machine-readable payloads
- generate a human-readable run packet for the hub model
- support download of the assembled packet bundle

### 24.2 UI non-responsibilities

The UI must not:

- become the canonical source of architecture truth
- hide runtime assumptions
- embed sprawling duplicated solver logic
- silently alter schema fields
- invent unsupported branches

## 25. Packet and Artifact Architecture

The system must support generated run bundles.

Each run bundle must be structured so that a hub AI system can consume it deterministically.

A run bundle should include, at minimum:

- one or more machine payload files
- one scenario summary file
- one run instruction packet
- declared blueprint and specification version references
- branch and policy selections
- operator notes if provided

The packet architecture must be strict enough that later build systems can validate and diff packet
contents.

## 26. AI Role Architecture

The system must explicitly define model roles to prevent responsibility blur.

### 26.1 ChatGPT role

This role is responsible for:

- canonical blueprint authorship support
- canonical engineering specification authorship support
- schema architecture design
- output-contract design
- normalization and compilation of structured outputs
- contradiction detection and conformance review

### 26.2 Claude role

This role is responsible for:

- build orchestration
- code implementation
- packet execution
- diff and drift review against pinned documents
- artifact assembly

### 26.3 Perplexity role

This role is responsible for:

- citation-first property research
- current-state research refresh
- contradiction checking against literature or source claims
- extraction of material, fluid, and component notes into structured form

### 26.4 Runtime authority role

The runtime layer is responsible for:

- formulas
- units
- validation
- range checks
- scenario execution
- comparison output

No language model is allowed to supersede runtime authority for canonical numeric output.

## 27. Deterministic Build Philosophy

This project is a deterministic build for AI by AI.

That means:

- the system must be described first in canonical human documents
- those documents must later be transformed into tighter AI-pinned build-law documents
- the build system must implement only what is authorized by the pinned documents
- drift must be surfaced rather than silently papered over
- final output assembly must remain tied to versioned artifacts

## 28. Human Canonical Documents

The project must first produce the following human canonical documents:

- blueprint
- engineering specification
- operator workflow guide
- research guide
- output contract guide if separated

These are human-legible authority documents and may contain rationale and architecture explanation.

## 29. AI-Pinned Documents

After the human canonical documents are complete, the project must derive AI-pinned documents.

These must include, at minimum:

- AI build blueprint
- AI build specification
- AI conformance checklist

These documents must be tighter, more line-item, more imperative, more artifact-bound, and less
interpretive than the human canonical documents.

Their purpose is not to replace the human canonical documents but to force deterministic compliance
during build execution.

## 30. Schema Architecture

The schema family must be a visible and versioned part of the project.

The minimum intended schema family includes:

- scenario schema
- compute-device schema
- compute-module schema
- thermal-zone schema
- thermal-stage schema
- working-fluid schema
- storage schema
- radiator schema
- conversion-branch schema
- communications-payload schema
- run-packet schema

The engineering specification must define each schema formally.

## 31. Runtime Architecture

The runtime layer must be versioned, inspectable, and contract-driven.

The intended runtime includes, at minimum:

- formula modules
- unit and range validation modules
- scenario runner
- comparison runner
- artifact emitter

The runtime must be able to accept schema-valid inputs and produce structured outputs suitable for
both UI display and AI packet execution.

## 32. Repo Target Shape

The target repository should evolve toward a shape similar to the following:

- canonical docs
- schemas
- runtime
- examples
- templates
- lightweight UI
- output bundles
- conformance helpers

Exact file paths are left to the engineering specification, but the repository must clearly
separate:

- human canonical design artifacts
- AI-pinned build artifacts
- runtime authority code
- UI code
- sample inputs and outputs

## 33. Versioning and Change Control

The project must be versioned deliberately.

Changes to the blueprint, engineering specification, schemas, runtime contracts, or output contracts
must be explicit and reviewable.

Derived AI-pinned documents must declare the canonical versions they were generated from.

The product must never silently drift from its declared blueprint and specification versions.

## 34. Phased Delivery Model

The blueprint defines the following intended phased delivery sequence.

### Phase 1 — Human canonical blueprint

Complete the full concept blueprint.

### Phase 2 — Human canonical engineering specification

Translate the blueprint into implementation law.

### Phase 3 — AI-pinned blueprint and AI-pinned specification

Create the stricter build-law versions for deterministic AI obedience.

### Phase 4 — Schema family

Implement the versioned schema set.

### Phase 5 — Runtime authority layer

Implement formulas, validation, scenario execution, and comparison logic.

### Phase 6 — Lightweight browser UI

Implement the packet-builder and validation UI.

### Phase 7 — Claude-oriented build and run system

Implement the orchestration flow for packet consumption, output generation, and artifact assembly.

### Phase 8 — Report and comparison package assembly

Implement structured output bundles and report templates.

## 35. Acceptance Conditions for the Blueprint

This blueprint is considered successful when it clearly establishes:

- what the product is
- what the product is not
- who the actors are
- what the authoritative layers are
- what the system must model
- what the UI must and must not do
- how AI roles are separated
- how deterministic build discipline is enforced
- what the major artifact families are
- what the phased delivery order is

## 36. Open Decisions Reserved for Engineering Specification

The following topics are intentionally reserved for precise engineering-spec treatment:

- exact repository tree
- exact schema field names and validation rules
- exact runtime formula inventory
- exact UI control layouts
- exact packet file formats
- exact template file names
- exact comparison-report layouts
- exact conformance test structure

## 37. Risks and Discipline Requirements

The project must actively guard against the following risks:

- narrative drift replacing numeric authority
- AI build drift caused by ambiguous specifications
- duplicated solver logic across UI and runtime
- hidden assumption changes across scenario revisions
- accidental merging of physically distinct branch modes
- oversized scope before schema and runtime foundations are stable
- unsupported property claims entering the system without research verification

## 38. Final Blueprint Position

This blueprint establishes the project as a deterministic orbital compute thermal trade system with
a schema-first, runtime-authoritative, AI-assisted architecture.

The system is intended to let a human operator configure orbital compute-node scenarios, explore
architecture trade space, generate structured packets, and use AI systems under pinned authority to
build, execute, verify, and compile outputs.

This blueprint is the canonical human concept authority for the project. All later engineering
specifications and AI-pinned build documents must preserve its core distinctions, role boundaries,
and product philosophy.
