# Orbital Thermal Trade System Engineering Specification

Version: v0.1.0  
Status: canonical human engineering specification  
Date: 2026-03-18  
Owner: James  
Project: space-server-heat-dissipation

## 1. Purpose

This engineering specification converts the canonical human blueprint into build law for the first deterministic implementation track of the orbital thermal trade system.

This document defines:

- repository structure
- artifact families
- schema families
- field contracts
- governing equations
- variable definitions
- validation rules
- runtime behavior
- comparison behavior
- browser UI behavior
- AI packet behavior
- output contracts
- versioning and conformance gates

This document is implementation-authoritative for the human canonical layer. The AI-pinned build documents will later be derived from this document and the blueprint. The implementation must not bypass this document.

## 2. Scope

This specification governs the first deterministic build track for a schema-first, browser-assisted, runtime-authoritative orbital thermal trade system.

The implementation covered by this version includes:

- GEO-only scenario support
- structured configuration of orbital compute-node scenarios
- compute payload modeling
- non-compute internal load modeling
- zone-based thermal architecture modeling
- configurable radiator, storage, and optional branch modeling
- math-authoritative runtime execution
- descriptive output generation
- scenario comparison generation
- browser-based packet builder
- AI run packet generation for downstream orchestration

The implementation covered by this version does not include:

- full CFD
- full FEA
- high-fidelity orbital mechanics
- high-fidelity atmospheric beam propagation
- flight software
- final spacecraft certification logic
- final financial model
- full manufacturing BOM solver

## 3. Normative Relationship to Blueprint

The engineering specification inherits its conceptual authority from the canonical human blueprint.

Where this document is more detailed than the blueprint, this document governs implementation.  
Where this document appears to conflict with the blueprint, the blueprint governs until this document is formally revised.

The implementation must preserve the following blueprint truths without reinterpretation:

- schema-first architecture
- separation of numeric authority from language authority
- descriptive outputs in the core engine rather than simplistic viability verdicts
- mandatory separation of heat-lift mode from true power-cycle mode
- thin browser UI and thick contracts
- deterministic AI role separation
- GEO-only scope for v0

## 4. Deterministic Build Law

The implementation must obey the following build laws.

### 4.1 No undocumented field invention

No runtime, UI, or AI packet layer may invent schema fields not declared in the versioned schema family.

### 4.2 No undocumented formula substitution

No runtime module may replace a governing equation without formal document revision and version change.

### 4.3 No hidden derived assumptions

Any derived assumption used by runtime execution must be surfaced in emitted outputs or in declared defaults.

### 4.4 No silent operating-mode fusion

Heat-lift stages, power-cycle stages, electrical conversion stages, and directed-energy stages may not be silently fused into a single stage unless that combined stage is explicitly declared in schema and documented in this specification.

### 4.5 No UI-only truth

The browser UI must not own canonical defaults that differ from the runtime or schema defaults.

### 4.6 No language-model numeric override

No language model may supersede runtime numerical outputs.

## 5. Repository Target Shape

The repository must evolve to the following logical shape.

    docs/
      blueprints/
      engineering-specs/
      operator-guides/
      research-guides/
      ai-pinned/
    schemas/
      scenario/
      compute-device/
      compute-module/
      thermal-zone/
      thermal-stage/
      working-fluid/
      storage/
      radiator/
      conversion-branch/
      communications-payload/
      run-packet/
    runtime/
      constants/
      formulas/
      validators/
      transforms/
      comparison/
      emitters/
      runner/
    ui/
      app/
      schemas/
      templates/
    examples/
      scenarios/
      packets/
      reports/
    templates/
      reports/
      packets/
      comparison/
    tools/
      conformance/
    reference/

The implementation may use different sub-file granularity than shown above, but the following separations are mandatory:

- human canonical docs must not be mixed with runtime code
- schema files must be version-visible
- runtime formula modules must be separate from UI code
- examples must be separate from canonical contracts
- AI-pinned artifacts must be separate from human canonical artifacts

## 6. Versioning Rules

### 6.1 Version syntax

All canonical documents, schemas, and major runtime output contracts must use semantic version style:

`vMAJOR.MINOR.PATCH`

### 6.2 Version change meaning

- MAJOR: incompatible contract or conceptual change
- MINOR: backward-compatible new capability
- PATCH: clarifications, formatting, non-breaking corrections

### 6.3 Version declarations

Every schema file must declare:

- schema_id
- schema_version

Every runtime result bundle must declare:

- blueprint_version
- engineering_spec_version
- runtime_version
- schema_bundle_version

### 6.4 Derived AI-pinned documents

Every AI-pinned document must declare the exact canonical human blueprint and engineering specification versions from which it was derived.

## 7. GEO-Only System Boundary

### 7.1 Orbit boundary

This version supports GEO only.

### 7.2 GEO environment model

The implementation must support a GEO environment profile abstraction that can include:

- external absorbed solar load term
- external absorbed Earth-reflected term if chosen
- external Earth IR term if chosen
- eclipse fraction or duty model if chosen
- background radiative sink approximation
- user-defined margins

### 7.3 Orbit validation

If any scenario declares an orbit class other than GEO, runtime validation must reject the scenario under v0.1.0.

## 8. Canonical Node Classes

The implementation must support the following node classes:

- 50 kW class
- 300 kW class
- 1 MW class
- custom

These node classes are scenario labels and scale anchors. They are not hard constraints on exact payload power.

## 9. Governing Math Policy

The system is math-governed. All core thermal, electrical, and branch outputs must be derived from explicit formula modules.

### 9.1 Math presentation policy

This document defines the canonical equation set, variable names, and interpretation rules.  
The runtime implementation must use these equations or declared equivalents that are algebraically identical.

### 9.2 Output policy

The runtime must compute and emit:

- raw outputs
- derived outputs
- flags
- declared assumptions
- uncertainty notes where a parameter is user-estimated rather than sourced

The runtime must not emit a single final viability truth value as a substitute for the underlying output set.

## 10. Units Policy

### 10.1 Canonical internal units

The runtime must normalize to SI internally.

Minimum canonical internal units:

- temperature: K
- pressure: Pa
- mass: kg
- time: s
- power: W
- energy: J
- area: m²
- length: m
- density: kg/m³
- specific heat: J/kg-K
- emissivity: dimensionless
- efficiency: dimensionless fraction
- mass flow: kg/s

### 10.2 UI input units

The UI may allow user-friendly unit entry, but every input must be normalized to canonical internal units before runtime execution.

### 10.3 Output unit display

The runtime may emit both canonical SI values and operator-friendly display units, but SI must remain present in structured output.

## 11. Variable Naming Convention

The following variable naming convention is canonical.

### 11.1 General

- `Q_dot_*` = heat flow rate in W
- `W_dot_*` = work or electrical power flow rate in W
- `m_dot_*` = mass flow rate in kg/s
- `T_*` = temperature in K
- `P_*` = pressure in Pa
- `A_*` = area in m²
- `epsilon_*` = emissivity
- `eta_*` = efficiency
- `rho_*` = density
- `cp_*` = specific heat
- `L_*` = latent heat
- `U_*` = overall heat-transfer coefficient
- `UA_*` = exchanger conductance
- `COP_*` = coefficient of performance
- `phi_*` = dimensionless duty or utilization fraction

### 11.2 Zone temperature variables

- `T_zone_a`
- `T_zone_b`
- `T_zone_c`
- `T_zone_d`

### 11.3 Representative scenario variables

- `Q_dot_internal`
- `Q_dot_external`
- `Q_dot_total_reject`
- `Q_dot_stage_loss`
- `W_dot_parasitic`
- `W_dot_branch`
- `A_radiator_effective`
- `T_radiator_target`
- `m_storage`
- `E_storage_usable`

## 12. Canonical Equation Set

This section defines the baseline canonical equation set for v0.1.0.

### 12.1 System energy balance

For a steady-state scenario abstraction:

`Q_dot_total_reject = Q_dot_internal + Q_dot_external + W_dot_parasitic + Q_dot_branch_losses - W_dot_exported_equivalent`

Interpretation rules:

- `Q_dot_internal` includes compute and non-compute dissipation
- `Q_dot_external` includes modeled environmental absorption terms
- `W_dot_parasitic` is treated as internal dissipation unless the operator explicitly models it as externally removed
- `Q_dot_branch_losses` includes conversion and control losses that remain on-node
- `W_dot_exported_equivalent` is only applied if a branch removes usable energy from the node in modeled form
- if no export branch exists, `W_dot_exported_equivalent = 0`

### 12.2 Radiator emission equation

Canonical radiator rejection equation:

`Q_dot_rad = epsilon_rad * sigma * A_radiator_effective * (T_radiator_target^4 - T_sink_effective^4)`

Where:

- `sigma = 5.670374419e-8 W/m²-K⁴`
- `T_sink_effective` defaults to 0 K for first-order sizing unless the scenario explicitly sets a higher effective sink term

First-order sizing rearrangement:

`A_radiator_effective = Q_dot_rad / (epsilon_rad * sigma * (T_radiator_target^4 - T_sink_effective^4))`

### 12.3 Blackbody limit note

No modeled emitter may exceed blackbody radiative power at its declared temperature and emissivity.  
Any directed or shaped emission model must still preserve declared temperature and radiance bounds.

### 12.4 Sensible-heat transport equation

For a single-phase transport stage:

`Q_dot_transport = m_dot_stage * cp_stage * (T_out - T_in)`

Rearranged for mass flow:

`m_dot_stage = Q_dot_transport / (cp_stage * Delta_T_stage)`

Where:

`Delta_T_stage = T_out - T_in`

### 12.5 Latent or storage energy equation

For a storage abstraction that may include sensible and latent terms:

`E_storage_usable = m_storage * cp_storage * Delta_T_storage + m_storage * L_storage * phi_latent_utilization`

Where:

- `phi_latent_utilization` ranges from 0 to 1
- if no latent component exists, `L_storage = 0`

### 12.6 Exergy upper bound equation

For a thermal source abstraction:

`W_dot_exergy_max = Q_dot_source * (1 - T_ref / T_source)`

Interpretation rules:

- `T_ref` is the scenario reference sink or environment temperature
- `T_source` must be greater than `T_ref`
- if `T_source <= T_ref`, runtime must reject the exergy calculation as non-physical for positive work extraction

### 12.7 Carnot heat-engine limit

`eta_carnot_engine = 1 - T_cold / T_hot`

Interpretation rules:

- valid only for an idealized upper-bound comparison
- no runtime branch may declare actual thermal-to-work efficiency greater than `eta_carnot_engine`

### 12.8 Carnot heat-pump limit

`COP_heating_carnot = T_hot / (T_hot - T_cold)`

Interpretation rules:

- valid only for idealized upper-bound comparison
- no heat-lift branch may declare actual `COP_heating_actual` greater than `COP_heating_carnot`

### 12.9 Heat-lift work equation

For heat-lift mode:

`Q_dot_hot = Q_dot_cold + W_dot_input`

`COP_heating_actual = Q_dot_hot / W_dot_input`

Equivalent rearrangement:

`W_dot_input = Q_dot_hot / COP_heating_actual`

or

`W_dot_input = Q_dot_cold / (COP_heating_actual - 1)`

Interpretation rules:

- the runtime must preserve the distinction between cold-side heat removed and hot-side heat delivered
- the hot side is what the radiator must ultimately see if the lifted heat remains on-node

### 12.10 Power-cycle equation

For a true power-cycle branch:

`W_dot_cycle = eta_cycle_actual * Q_dot_hot_source`

Interpretation rules:

- `Q_dot_hot_source` must come from a declared thermal source quality that supports power-cycle mode
- waste heat from a low-temperature source may be included, but the branch must not implicitly claim a high-temperature source unless explicitly modeled

### 12.11 Heat-exchanger duty equation

For a generic exchanger:

`Q_dot_hx = UA_hx * Delta_T_lm`

where `Delta_T_lm` is the log-mean temperature difference if the stage is modeled in that level of detail.

For v0.1.0, runtime may alternatively use a simpler effectiveness model:

`Q_dot_hx = epsilon_hx * Q_dot_hx_max`

with

`Q_dot_hx_max = C_min * (T_hot_in - T_cold_in)`

and

`C_min = min(m_dot_hot * cp_hot, m_dot_cold * cp_cold)`

### 12.12 Load-state interpolation rule

If a device or subsystem declares idle, light, medium, and full power values, intermediate duty outputs must be derived by declared interpolation rule.

Default interpolation rule for v0.1.0:

- piecewise linear interpolation between declared duty points

### 12.13 Total internal dissipation equation

`Q_dot_internal = W_dot_compute + W_dot_non_compute + W_dot_conversion_losses + W_dot_control_losses`

Interpretation rule:

Any electrical draw that remains on-node is thermalized on-node unless explicitly exported.

## 13. Interpretation Boundaries for Governing Math

### 13.1 Heat-lift versus power-cycle boundary

A heat-lift branch uses work input to move heat to a more rejectable or useful state.  
A power-cycle branch extracts work from a sufficiently high-quality thermal source.

The runtime must enforce separate stage types, separate fields, and separate validation logic for these modes.

### 13.2 Directed-energy branch boundary

A directed-energy branch may remove usable energy from the node only after prior modeled conversion steps.  
The branch must account for conversion losses that remain on-node.

### 13.3 Low-grade scavenging boundary

Scavenging branches such as TEG-like stages may be modeled, but the runtime must flag low-significance outputs if the branch contributes insignificantly relative to total thermal burden.

## 14. Reference Cases

The following reference cases are mandatory anchoring cases for v0.1.0.  
They exist to prevent drift in trade intuition and test runtime correctness.

### 14.1 Radiator area reference cases at epsilon = 0.9 and T_sink_effective = 0 K

For `Q_dot_rad = 1,000,000 W`:

- at `T_radiator_target = 350 K`, `A_radiator_effective ≈ 1306 m²`
- at `T_radiator_target = 600 K`, `A_radiator_effective ≈ 151 m²`
- at `T_radiator_target = 800 K`, `A_radiator_effective ≈ 48 m²`

### 14.2 300 kW reference cases at epsilon = 0.9 and T_sink_effective = 0 K

For `Q_dot_rad = 300,000 W`:

- at `T_radiator_target = 600 K`, `A_radiator_effective ≈ 45.36 m²`
- at `T_radiator_target = 800 K`, `A_radiator_effective ≈ 14.35 m²`
- at `T_radiator_target = 1000 K`, `A_radiator_effective ≈ 5.88 m²`

### 14.3 50 kW reference cases at epsilon = 0.9 and T_sink_effective = 0 K

For `Q_dot_rad = 50,000 W`:

- at `T_radiator_target = 600 K`, `A_radiator_effective ≈ 7.56 m²`
- at `T_radiator_target = 800 K`, `A_radiator_effective ≈ 2.39 m²`
- at `T_radiator_target = 1200 K`, `A_radiator_effective ≈ 0.4725 m²`

### 14.4 Heat-pump upper-bound example

For `T_cold = 330 K` and `T_hot = 800 K`:

`COP_heating_carnot ≈ 1.702`

For `T_cold = 330 K` and `T_hot = 1000 K`:

`COP_heating_carnot ≈ 1.493`

These values are upper bounds. The runtime must not allow an actual modeled COP above these limits.

## 15. Scenario Schema Contract

The scenario schema is the top-level orchestration schema.

### 15.1 Required fields

The scenario schema must include:

- `scenario_id`
- `schema_version`
- `scenario_version`
- `label`
- `orbit_class`
- `environment_profile`
- `mission_mode`
- `node_class`
- `architecture_class`
- `utilization_profile`
- `thermal_policy`
- `selected_branches`
- `reporting_preferences`

### 15.2 Required field semantics

- `scenario_id`: stable identifier for one run definition
- `schema_version`: schema contract version
- `scenario_version`: operator-authored scenario revision
- `orbit_class`: must be `GEO` in v0.1.0
- `environment_profile`: inline object or named reference
- `mission_mode`: enumerated mode
- `node_class`: enumerated or custom
- `architecture_class`: descriptive architecture label
- `utilization_profile`: named or custom duty family
- `thermal_policy`: selected operating policy
- `selected_branches`: list of enabled optional branches
- `reporting_preferences`: summary and display settings

### 15.3 Scenario validation rules

- reject if `orbit_class != GEO`
- reject if any required field is absent
- reject if selected branch identifiers are undefined
- reject if any referenced subsystem schema object is missing or version-incompatible

## 16. Compute Device Schema Contract

### 16.1 Required fields

The compute-device schema must include:

- `device_id`
- `schema_version`
- `vendor`
- `family`
- `sku`
- `device_type`
- `nominal_tdp_w`
- `peak_tdp_w`
- `allowable_junction_temp_k`
- `allowable_package_temp_k`
- `allowable_coldplate_temp_min_k`
- `allowable_coldplate_temp_max_k`
- `heat_flux_w_per_cm2`
- `power_idle_w`
- `power_light_w`
- `power_medium_w`
- `power_full_w`
- `package_mass_kg`
- `packaging_notes`

### 16.2 Validation rules

- `peak_tdp_w >= nominal_tdp_w`
- `allowable_junction_temp_k > allowable_package_temp_k`
- `allowable_coldplate_temp_max_k <= allowable_package_temp_k`
- load-state powers must be monotonically non-decreasing across idle, light, medium, full
- all temperatures must be > 0 K

## 17. Compute Module Schema Contract

### 17.1 Required fields

The compute-module schema must include:

- `module_id`
- `schema_version`
- `device_ref`
- `device_count`
- `board_count`
- `memory_power_w`
- `storage_power_w`
- `network_power_w`
- `power_conversion_overhead_w`
- `control_overhead_w`
- `redundancy_mode`
- `target_load_state`
- `thermal_grouping_label`

### 17.2 Derived compute power

The runtime must compute:

`W_dot_compute_module = device_count * W_dot_device_selected_load + memory_power_w + storage_power_w + network_power_w + power_conversion_overhead_w + control_overhead_w`

### 17.3 Validation rules

- `device_count >= 1`
- `board_count >= 1`
- `target_load_state` must be a declared load state or valid custom duty description

## 18. Communications Payload Schema Contract

### 18.1 Required fields

The communications-payload schema must include:

- `payload_id`
- `schema_version`
- `rf_comms_power_w`
- `telemetry_power_w`
- `radar_power_w`
- `optical_crosslink_power_w`
- `duty_cycle_profile`
- `notes`

### 18.2 Derived non-compute load

`W_dot_non_compute = rf_comms_power_w + telemetry_power_w + radar_power_w + optical_crosslink_power_w`

Duty cycle rules must be applied before aggregation if selected.

## 19. Thermal Zone Schema Contract

### 19.1 Required fields

The thermal-zone schema must include:

- `zone_id`
- `schema_version`
- `zone_label`
- `zone_type`
- `target_temp_k`
- `temp_min_k`
- `temp_max_k`
- `pressure_min_pa` if relevant
- `pressure_max_pa` if relevant
- `notes`

### 19.2 Canonical zone types

- `compute_vault`
- `hx_boundary`
- `high_temp_backbone`
- `radiator_emitter`
- `custom`

### 19.3 Validation rules

- `temp_min_k <= target_temp_k <= temp_max_k`
- if pressure bounds are supplied, `pressure_min_pa <= pressure_max_pa`

## 20. Working Fluid Schema Contract

### 20.1 Required fields

The working-fluid schema must include:

- `fluid_id`
- `schema_version`
- `label`
- `medium_class`
- `intended_use_domain`
- `temp_min_k`
- `temp_max_k`
- `pressure_notes`
- `compatibility_notes`
- `hazards`
- `maturity_class`
- `default_cp_j_per_kgk` if runtime abstraction uses fixed cp
- `default_density_kg_per_m3` if runtime abstraction requires it

### 20.2 Validation rules

- `temp_min_k < temp_max_k`
- if a stage references this fluid, the stage operating temperature range must lie within the declared fluid range unless the scenario explicitly sets an out-of-range flag that triggers failure or review as configured

## 21. Storage Schema Contract

### 21.1 Required fields

The storage schema must include:

- `storage_id`
- `schema_version`
- `label`
- `storage_class`
- `target_temp_k`
- `temp_min_k`
- `temp_max_k`
- `cp_j_per_kgk`
- `latent_heat_j_per_kg`
- `latent_utilization_fraction`
- `mass_kg`
- `integration_zone`
- `notes`

### 21.2 Derived storage energy

`E_storage_usable = mass_kg * cp_j_per_kgk * (temp_max_k - temp_min_k) + mass_kg * latent_heat_j_per_kg * latent_utilization_fraction`

### 21.3 Validation rules

- `latent_utilization_fraction` must be in [0, 1]
- `mass_kg >= 0`
- `temp_min_k < temp_max_k`

## 22. Radiator Schema Contract

### 22.1 Required fields

The radiator schema must include:

- `radiator_id`
- `schema_version`
- `target_surface_temp_k`
- `emissivity`
- `effective_area_m2` if user-specified
- `material_family`
- `geometry_class`
- `deployment_class`
- `packaging_notes`
- `reserve_margin_fraction`

### 22.2 Derived sizing

If `effective_area_m2` is not user-specified, the runtime must compute it from required rejection and governing emission equation.

If `effective_area_m2` is user-specified, the runtime must compute achievable rejection and resulting mismatch.

### 22.3 Validation rules

- `0 < emissivity <= 1`
- `target_surface_temp_k > 0`
- `reserve_margin_fraction >= 0`

## 23. Thermal Stage Schema Contract

### 23.1 Required fields

The thermal-stage schema must include:

- `stage_id`
- `schema_version`
- `stage_type`
- `input_zone_ref`
- `output_zone_ref`
- `input_temp_k`
- `output_temp_k`
- `work_input_w`
- `work_output_w`
- `loss_w`
- `pressure_in_pa` if relevant
- `pressure_out_pa` if relevant
- `fluid_ref` if relevant
- `efficiency` or `effectiveness` fields as appropriate
- `notes`

### 23.2 Supported stage types

- `capture`
- `transport`
- `exchanger`
- `storage`
- `lift`
- `power_cycle`
- `emission`
- `rejection`
- `branch_interface`

### 23.3 Stage validation rules

- a `lift` stage must have `work_input_w >= 0`
- a `power_cycle` stage must have a declared high-temperature source field and may not derive its source implicitly from a low-temperature stage without explicit modeling
- `loss_w >= 0`
- temperature direction must not violate stage semantics unless a custom stage contract explicitly allows it

## 24. Conversion Branch Schema Contract

### 24.1 Required fields

The conversion-branch schema must include:

- `branch_id`
- `schema_version`
- `branch_type`
- `enabled`
- `input_stage_ref` or `input_zone_ref`
- `mode_label`
- `efficiency_or_cop`
- `output_class`
- `loss_partition_rule`
- `notes`

### 24.2 Supported branch types

- `none`
- `reverse_brayton`
- `brayton_power_cycle`
- `stirling`
- `tpv`
- `teg`
- `rf_export`
- `laser_export`
- `custom`

### 24.3 Validation rules

- for heat-lift branches, `efficiency_or_cop` is interpreted as COP and must obey Carnot bound
- for power-cycle branches, `efficiency_or_cop` is interpreted as efficiency and must obey Carnot bound
- for directed-energy branches, upstream electrical or thermal input must be declared explicitly

## 25. Run Packet Schema Contract

### 25.1 Required fields

The run-packet schema must include:

- `packet_id`
- `schema_version`
- `blueprint_version`
- `engineering_spec_version`
- `scenario_ref`
- `payload_file_refs`
- `operator_notes`
- `requested_outputs`
- `branch_selection_summary`
- `comparison_requests`
- `ai_role_instructions`

### 25.2 Purpose

The run packet is the deterministic handoff artifact from browser UI to hub AI workflow.

### 25.3 Validation rules

- referenced payload files must exist within the packet bundle
- declared canonical versions must match or intentionally declare mismatch
- comparison requests must reference valid scenario or variant identifiers

## 26. Runtime Module Requirements

The runtime must be structured into the following module families.

### 26.1 Constants module

Must expose:

- Stefan-Boltzmann constant
- supported default sink approximations
- supported default interpolation rules
- any standard reference temperatures used by runtime defaults

### 26.2 Formula modules

Must include, at minimum:

- `radiation`
- `exergy`
- `heat_pump`
- `power_cycle`
- `storage`
- `heat_transport`
- `heat_exchanger`
- `loads`

### 26.3 Validator modules

Must include, at minimum:

- schema validation
- units validation
- bounds validation
- operating-mode validation
- cross-reference validation

### 26.4 Transform modules

Must include, at minimum:

- load-state resolution
- default expansion
- unit normalization
- scenario aggregation

### 26.5 Runner modules

Must include, at minimum:

- single-scenario execution
- comparison execution
- packet execution

### 26.6 Emitter modules

Must include, at minimum:

- structured JSON emitter
- human-readable markdown summary emitter
- comparison emitter
- flag emitter

## 27. Runtime Execution Order

The runtime must execute in the following order.

### 27.1 Step 1 — schema load

Load all required schemas and validate packet-level completeness.

### 27.2 Step 2 — payload normalization

Normalize input payloads to canonical SI units and expand defaults.

### 27.3 Step 3 — operating-mode validation

Enforce boundary rules, including GEO-only scope and branch-mode separation.

### 27.4 Step 4 — load-state resolution

Resolve compute and non-compute loads for the selected utilization state or custom duty case.

### 27.5 Step 5 — internal dissipation aggregation

Compute total internal dissipation.

### 27.6 Step 6 — environmental term aggregation

Compute total external thermal inputs if modeled.

### 27.7 Step 7 — stage execution

Execute stages in topologically valid order.

### 27.8 Step 8 — branch execution

Execute optional branches with strict mode-specific validation.

### 27.9 Step 9 — radiator sizing or achieved rejection computation

Compute required area or achieved rejection based on scenario mode.

### 27.10 Step 10 — flag generation

Generate descriptive problem-area flags.

### 27.11 Step 11 — output emission

Emit structured outputs, summaries, packet-ready report artifacts, and comparison artifacts if requested.

## 28. Stage Execution Rules

### 28.1 Directed acyclic execution graph

Thermal stage execution must form a directed acyclic graph for v0.1.0.  
True cyclic solver behavior is out of scope for this version unless a loop is collapsed into an explicitly documented equivalent stage.

### 28.2 Stage dependency ordering

A stage may not execute until all required upstream states are available.

### 28.3 Branch insertion points

Optional branches may only attach at declared branch interface stages or allowed zone outputs.

### 28.4 Loss accounting

All stage losses must be explicitly accounted for either as:

- heat remaining on-node
- exported equivalent loss
- unallocated modeling error, which must trigger a failure

## 29. Heat-Lift Branch Rules

### 29.1 Required fields

A heat-lift branch must declare:

- `T_cold_source_k`
- `T_hot_delivery_k`
- `Q_dot_cold_w`
- `COP_heating_actual`

### 29.2 Validation rules

- `T_hot_delivery_k > T_cold_source_k`
- `COP_heating_actual <= COP_heating_carnot`
- `Q_dot_hot_w = Q_dot_cold_w + W_dot_input`
- `W_dot_input >= 0`

### 29.3 Emission accounting

If lifted heat remains on-node, the radiator rejection requirement must increase to include the added work input.

## 30. Power-Cycle Branch Rules

### 30.1 Required fields

A power-cycle branch must declare:

- `T_hot_source_k`
- `T_cold_sink_k`
- `Q_dot_hot_source_w`
- `eta_cycle_actual`

### 30.2 Validation rules

- `T_hot_source_k > T_cold_sink_k`
- `eta_cycle_actual <= eta_carnot_engine`
- `W_dot_cycle = eta_cycle_actual * Q_dot_hot_source_w`

### 30.3 Source-quality rule

A power-cycle branch must not infer a high-temperature source from a low-temperature compute zone unless an explicit upstream stage has already provided that thermal state.

## 31. TEG and Low-Significance Recovery Rules

### 31.1 Purpose

TEG-like stages are permitted as modeled scavenging branches.

### 31.2 Constraints

The runtime must not allow TEG-like branches to reduce required total thermal rejection by more than the electrical output they explicitly produce.

### 31.3 Flag rule

If a scavenging branch output is less than the configured significance threshold, the runtime must emit `low_significance_recovery_branch_output`.

Default threshold for v0.1.0:

- 1 percent of total internal dissipation

## 32. Radiator Geometry and Packaging Rules

### 32.1 Geometry classes

The radiator schema must support at minimum:

- fixed_body
- fixed_panel
- deployable_panel
- custom

### 32.2 Effective-area versus planform distinction

The runtime must distinguish:

- effective radiating area
- planform or packaging footprint when relevant

### 32.3 Margin rule

When sizing a radiator, required area must be multiplied by:

`A_radiator_with_margin = A_radiator_effective * (1 + reserve_margin_fraction)`

### 32.4 Temperature flag rule

If `target_surface_temp_k` exceeds operator-selected material policy range, the runtime must emit `exceeds_selected_material_range` and `requires_extreme_target_surface_temperature`.

## 33. Thermal Policy Contract

The thermal-policy model must support, at minimum:

- conservative
- nominal
- aggressive
- experimental

Each policy may define:

- allowable cold-plate target range
- allowable package-temperature margin
- allowable hot-backbone target range
- default reserve margin fraction
- flag severity thresholds

## 34. Output Contract

### 34.1 Structured output root

Every runtime execution must emit a structured result root with:

- `run_id`
- `runtime_version`
- `blueprint_version`
- `engineering_spec_version`
- `schema_bundle_version`
- `scenario_id`
- `load_state`
- `outputs`
- `flags`
- `assumptions`
- `notes`

### 34.2 Required thermal outputs

- `q_dot_internal_w`
- `q_dot_external_w`
- `q_dot_total_reject_w`
- `t_zone_a_k`
- `t_zone_b_k`
- `t_zone_c_k`
- `t_zone_d_k`
- `t_radiator_target_k`
- `a_radiator_effective_m2`
- `a_radiator_with_margin_m2`
- `storage_energy_usable_j`
- `stage_losses_w`

### 34.3 Required electrical outputs

- `w_dot_compute_w`
- `w_dot_non_compute_w`
- `w_dot_parasitic_w`
- `w_dot_branch_generated_w`
- `w_dot_branch_consumed_w`
- `w_dot_net_margin_w` if modeled

### 34.4 Required packaging and mass outputs

- `mass_estimate_total_kg` if enough fields exist
- `mass_estimate_radiator_kg` if enough fields exist
- `mass_estimate_storage_kg`
- `packaging_notes`

### 34.5 Required comparison outputs

If comparison mode is requested, emit:

- `delta_q_dot_total_reject_w`
- `delta_a_radiator_effective_m2`
- `delta_w_dot_parasitic_w`
- `delta_mass_estimate_total_kg` when available
- `delta_flags`

## 35. Flag Contract

The runtime must support a structured flag object with:

- `flag_id`
- `severity`
- `message`
- `related_subsystem`
- `related_field`
- `trigger_value`
- `threshold_value`
- `review_required`

### 35.1 Minimum supported flags

- `exceeds_selected_material_range`
- `exceeds_selected_fluid_range`
- `exceeds_selected_device_thermal_policy`
- `requires_extreme_target_surface_temperature`
- `requires_large_radiator_scale`
- `requires_high_parasitic_work_input`
- `low_significance_recovery_branch_output`
- `assumption_incompleteness`
- `research_confirmation_required`

### 35.2 Severity classes

Minimum severity classes:

- `info`
- `warning`
- `review`
- `error`

## 36. Browser UI Contract

### 36.1 Purpose

The browser UI is a packet builder and validator.

### 36.2 Required UI sections

The UI must expose at minimum:

- scenario selection
- compute payload selection
- non-compute payload selection
- thermal architecture selection
- radiator and storage selection
- optional branch selection
- output and packet generation section

### 36.3 UI responsibilities

The UI must:

- load versioned schemas
- validate required fields before packet generation
- support user-friendly units but normalize before packet output
- generate machine payload files
- generate human-readable summary
- generate run packet
- support bundle download

### 36.4 UI prohibited behavior

The UI must not:

- embed divergent formulas
- mutate schema field names
- hide normalization logic
- produce runtime outputs independently of the authoritative runtime engine
- silently fix invalid input without warning

## 37. Packet Bundle Contract

### 37.1 Bundle contents

A generated run bundle must include at minimum:

- `scenario.json`
- referenced subsystem JSON payloads
- `run-packet.json`
- `scenario-summary.md`
- optional operator notes file

### 37.2 Bundle naming

Recommended bundle naming pattern:

`runbundle-<scenario_id>-<timestamp>-v<bundle_version>.zip`

### 37.3 Bundle integrity

The run packet must include checksums or at minimum file-length and file-name manifest entries for included payloads.

## 38. AI Role Contract

### 38.1 ChatGPT role contract

Responsible for:

- blueprint and engineering-spec design work
- schema design
- conformance review
- normalization and compilation support

Not responsible for:

- replacing runtime numeric authority
- inventing undocumented branch behavior

### 38.2 Claude role contract

Responsible for:

- build orchestration
- implementation
- packet execution
- artifact assembly
- diff and drift review

### 38.3 Perplexity role contract

Responsible for:

- citation-first property research
- contradiction checks
- materials and fluid envelope refresh
- current-state research notes

### 38.4 Runtime role contract

Responsible for:

- calculation
- validation
- output emission
- comparison generation

## 39. Research Confirmation Rules

The runtime and packet system must support marking fields as:

- operator-estimated
- sourced
- inferred
- research-required

If a scenario relies on a field marked `research-required`, the runtime must emit `research_confirmation_required`.

## 40. Example Canonical Defaults

The following defaults are permitted for v0.1.0 unless overridden:

- `T_sink_effective = 0 K` for first-order radiator sizing
- `epsilon_rad = 0.9`
- piecewise linear load interpolation
- significance threshold for scavenging branches = 1 percent of total internal dissipation
- reserve margin fraction default = 0.15 under nominal thermal policy

These defaults must be surfaced in output assumptions.

## 41. Conformance Gates

The implementation is not conformant unless it passes all of the following gates.

### 41.1 Document gate

Required canonical docs exist in their expected family locations.

### 41.2 Schema gate

Declared schema files exist and validate syntactically.

### 41.3 Runtime gate

Runtime modules exist for required formula families and execute reference cases correctly.

### 41.4 UI gate

UI can produce a valid bundle without requiring local install beyond static browser use.

### 41.5 Packet gate

Generated packet bundle matches declared contract.

### 41.6 Reference-case gate

Runtime reproduces the mandatory reference cases within declared tolerance.

### 41.7 Drift gate

No implementation artifact contradicts canonical versions without explicit version change and document update.

## 42. Reference-Case Tolerances

For v0.1.0, reference-case outputs must match canonical values within:

- ±0.5 percent for simple closed-form equations
- ±2 percent for rounded displayed values where internal exact constants are used

## 43. Initial File Set Required by This Specification

At minimum, the next deterministic build track must create:

- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- `schemas/scenario/scenario.schema.json`
- `schemas/compute-device/compute-device.schema.json`
- `schemas/compute-module/compute-module.schema.json`
- `schemas/thermal-zone/thermal-zone.schema.json`
- `schemas/thermal-stage/thermal-stage.schema.json`
- `schemas/working-fluid/working-fluid.schema.json`
- `schemas/storage/storage.schema.json`
- `schemas/radiator/radiator.schema.json`
- `schemas/conversion-branch/conversion-branch.schema.json`
- `schemas/communications-payload/communications-payload.schema.json`
- `schemas/run-packet/run-packet.schema.json`
- `runtime/formulas/radiation.ts`
- `runtime/formulas/exergy.ts`
- `runtime/formulas/heat-pump.ts`
- `runtime/formulas/power-cycle.ts`
- `runtime/formulas/storage.ts`
- `runtime/formulas/heat-transport.ts`
- `runtime/formulas/heat-exchanger.ts`
- `runtime/validators/schema.ts`
- `runtime/validators/bounds.ts`
- `runtime/validators/units.ts`
- `runtime/runner/run-scenario.ts`
- `runtime/comparison/run-comparison.ts`
- `ui/app/` static browser UI files
- `templates/reports/`
- `examples/scenarios/`
- `examples/packets/`

## 44. First Implementation Priority Order

The build must proceed in this order.

### 44.1 Priority 1

- schema family
- constants and formula modules
- runtime validators
- reference-case tests

### 44.2 Priority 2

- scenario runner
- comparison runner
- emitters

### 44.3 Priority 3

- lightweight browser UI
- packet generation
- examples

### 44.4 Priority 4

- AI-pinned document derivation
- advanced comparison/report packaging

## 45. Implementation Notes on 50 kW Class Baseline

The 50 kW class module remains the preferred atomic unit for early architecture and scaling work.

The engineering implementation must support:

- realistic compute-device entries, including H200-class accelerators
- realistic load-state variation
- realistic non-compute mission load inclusion
- radiator sizing across hot-body assumptions
- future comparison against 300 kW and 1 MW classes without restructuring the schema family

This note is a build guidance anchor, not a runtime hardcode.

## 46. Formal Prohibitions

The following are prohibited in v0.1.0 implementation:

- LEO-specific assumptions in canonical v0 runtime logic
- hidden solver constants that are not surfaced in docs or outputs
- UI-generated numeric results that differ from runtime-authoritative results
- branch types not declared in schema family
- runtime acceptance of a power-cycle efficiency greater than Carnot bound
- runtime acceptance of a heat-lift COP greater than Carnot bound
- branch narratives that imply free temperature amplification without work input

## 47. Required Future Derivatives

Once this human canonical engineering specification is accepted, the following derivative artifacts must be created:

- AI build blueprint
- AI build engineering spec
- AI conformance checklist
- Claude hub execution guide
- ChatGPT design/compiler guide
- Perplexity research guide

These are out of scope for this document’s content, but in scope for this document’s downstream intent.

## 48. Completion Criteria for This Specification

This engineering specification is complete for v0.1.0 when:

- all required contracts are declared
- governing equations are declared
- variable names and interpretation boundaries are declared
- required artifact families are declared
- conformance gates are declared
- the document is sufficient to derive the first AI-pinned build artifacts without reopening conceptual ambiguity

## 49. Appendix A — Minimal Example Scenario Payload Shape

The following is a non-normative illustrative shape only.

    {
      "scenario_id": "geo-50kw-h200-nominal",
      "schema_version": "v0.1.0",
      "scenario_version": "v0.1.0",
      "label": "GEO 50 kW H200 nominal",
      "orbit_class": "GEO",
      "environment_profile": "geo_default_v0",
      "mission_mode": "compute_plus_communications",
      "node_class": "50kw",
      "architecture_class": "cold_loop_plus_hot_backbone",
      "utilization_profile": "full",
      "thermal_policy": "nominal",
      "selected_branches": ["none"],
      "reporting_preferences": {
        "summary_markdown": true,
        "comparison_enabled": false
      }
    }

## 50. Appendix B — Minimal Reference Test Cases

The runtime test harness must at minimum test:

1. 1 MW radiator sizing at 350 K, 600 K, 800 K
2. 300 kW radiator sizing at 600 K, 800 K, 1000 K
3. 50 kW radiator sizing at 600 K, 800 K, 1200 K
4. Carnot heat-engine bound at 350 K source and 300 K sink
5. Carnot heat-pump bound at 330 K to 800 K and 330 K to 1000 K
6. rejection of non-GEO scenario
7. rejection of invalid power-cycle source logic
8. rejection of heat-lift COP beyond Carnot
9. flagging of low-significance TEG-like branch

## 51. Appendix C — Engineering Intent

The system is not intended to win by narrative flourish.  
It is intended to win by structural clarity, numeric honesty, and deterministic artifact flow.

This specification exists to prevent drift during build.
