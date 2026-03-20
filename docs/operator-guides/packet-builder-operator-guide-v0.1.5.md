# Packet Builder Operator Guide

Version: v0.1.5
Status: canonical operator guide
Project: space-server-heat-dissipation

## 1. Purpose

This guide explains how to use the Orbital Thermal Trade System browser packet-builder to author and export
a deterministic engineering trade packet.

The packet-builder is a seven-tab operator workflow. It compiles operator inputs into a structured packet
bundle for authoritative runtime execution. It does not produce authoritative engineering outputs itself.

## 2. Runtime Authority Statement

All authoritative engineering outputs — radiator sizing, load aggregation, Carnot validation,
and flag generation — are produced by the server-side runtime formula engine.

Browser preview values shown in the UI are display-only and subordinate to runtime results.
This is declared in every exported packet via `runtime_authority_declaration: "runtime"`.

## 3. Seven-Tab Workflow

### Tab 1 — Scenario

Select a scenario preset from the dropdown to seed coherent initial state.
Available presets: `50kw_baseline`, `100kw_baseline`, `1mw_baseline`, `custom_blank`.

Preset defaults are applied to downstream tabs. All defaults remain inspectable and serialisable.
Override any field by editing it directly after applying a preset.

Set the architecture class to determine the thermal topology. Available classes:

- `cold_loop_plus_hot_backbone` — standard single-backbone architecture
- `cold_loop_plus_dual_hot_island` — dual hot-island topology
- `cold_loop_plus_dual_hot_island_plus_exchange_hub` — adds eutectic/PCM exchange hub
- `cold_loop_plus_dual_hot_island_plus_solar_polish` — adds solar thermal polishing source
- `custom` — operator-specified

The scenario ID is generated deterministically from the preset seed, node class, mission mode, and architecture class.

### Tab 2 — Compute Payload

Select a compute device preset to populate device parameters.
The maturity class and performance/thermal basis notes are shown for every preset.

Set device count and target load state. The module overhead fields (memory, storage, network,
power conversion, control) represent additional electrical draw beyond the device array.

The compute module total preview shown at the bottom is display-only.

### Tab 3 — Non-Compute Payload

Add one or more non-compute payload blocks using the **+ Add Payload Block** button.
Select an archetype to prefill power and duty-cycle values.

Each block has four subsystem power fields (RF comms, telemetry, radar, optical crosslink),
a duty mode (continuous, uniform, per\_subsystem), and a duty fraction.

When the packet is built, additive payload blocks are compiled into a generated aggregate
comms-load compatibility file. This generated file is disclosed in the transform trace.

If `per_subsystem` duty mode is used, a warning is emitted that it has been simplified
to the aggregate duty fraction for runtime compatibility.

### Tab 4 — Thermal Architecture

Configure the primary thermal zone for the scenario.

The zone type family is canonical:
`compute_vault`, `hx_boundary`, `high_temp_backbone`, `radiator_emitter`, `custom`.

Richer semantics are expressed through zone subtypes without replacing the canonical type family.

If a two-hot-island or solar-polish topology is selected, the architecture section surfaces
the relevant framing controls. Solar-polish selection requires source characterisation and
will surface as a validation warning.

### Tab 5 — Radiator & Storage

Select a radiator material family to display its emissivity, temperature limits, areal density,
and maturity class.

Set emissivity, view factor, target surface temperature, sink temperature, and reserve margin.
A display-only radiator area preview is shown based on the current compute and non-compute
load estimates. This preview is non-authoritative.

Set the storage class and storage parameters. For hot-island topologies, assign a topology role
to the storage element.

### Tab 6 — Optional Branches

Add conversion branch blocks using the **+ Add Branch Block** button.
Select a preset to populate branch type, variant, mode, and efficiency parameters.

Branch variants (`base`, `with_regen`, `solar_polish`, `custom`) change declared assumptions
and required source terms. They do not change thermodynamic law.

For heat-lift branches, at least one source term (work input, external heat input, or
storage drawdown) must be declared, or `research_required` must be true.
This is enforced as a blocking validation rule per specification §18.9.

### Tab 7 — Output & Packet

Tab 7 displays:

- Validation summary (blocking issues and warnings)
- Derived summary (display-only previews)
- Bundle file manifest preview
- Transform trace
- Research-required items
- Branding / confidentiality metadata fields
- Runtime authority declaration
- Packet preview (run-packet.json)

Click **Build Packet** to compile the current state into the canonical payload file set.
The output preview shows the generated `run-packet.json`.

Click **Download Bundle** to download the packet bundle. If JSZip is available in the browser,
the bundle is downloaded as a `.zip` containing all payload files. Otherwise, `run-packet.json`
is downloaded individually.

## 4. Validation Rules

The following blocking issues prevent packet export:

- Missing scenario ID
- Device count less than 1
- Any power field negative
- Radiator target temperature at or below 0 K
- Emissivity outside (0, 1]
- View factor outside (0, 1]
- Target surface temperature exceeds material limit temperature
- Power cycle branch with T\_hot ≤ T\_cold
- Heat-lift branch with no declared source term and `research_required` not set

The following conditions produce warnings (packet export allowed):

- Simultaneous heat-lift and power-cycle branch selections
- Experimental or speculative device or material presets
- Solar-polish architecture without source characterisation
- Per-subsystem duty mode simplified to aggregate for compatibility export

## 5. Generated Compatibility Artifacts

When additive non-compute payload blocks are used, the state compiler generates a
canonical `comms-load` aggregate file. This file:

- Is a valid comms-load schema object
- Receives a deterministic payload ID based on the ordered block contents
- Is listed in `payload_file_refs` and `file_manifest`
- Is disclosed in `transform_trace`

The generated file allows the current runtime family to accept additive UI payload state
without schema replacement.

## 6. Transform Trace

Every catalog preset application, generated compatibility artifact, and normalisation step
is recorded in `transform_trace` and disclosed in the exported packet.
This allows operators and reviewers to trace how the packet was constructed.

## 7. Research-Required Items

Items flagged `research_required` in any preset, block, or field are collected into
`research_required_items` and disclosed in the packet output. These items are not blocking
by default but must be resolved before any engineering decision that depends on them.
