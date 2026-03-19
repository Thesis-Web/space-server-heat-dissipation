# Orbital Thermal Trade System UI Expansion Engineering Specification

Version: v0.1.5  
Status: canonical controlled-expansion engineering-spec patch  
Date: 2026-03-19  
Owner: James  
Project: space-server-heat-dissipation

## 1. Purpose

This engineering specification defines the exact implementation law for the UI expansion patch that grows the current packet-builder into a production-like operator tool **without breaking the existing schema/runtime family**.

This is a patch specification, not a clean-sheet replacement.

Its job is to ensure that new UI surface area, new catalog files, new metadata, and new additive composition rules all fit deterministically into the repo line that already exists.

## 2. Governing Relationship

This engineering specification shall be implemented consistently with:

- `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- `docs/blueprints/orbital-thermal-trade-system-ui-expansion-blueprint-v0.1.5.md`

Where this patch conflicts with current v0.1.0 schema object names, **current canonical object names shall be preserved unless this patch explicitly revises them**.

## 3. Repo-Fit Law

### 3.1 Current canonical implementation family

This patch assumes the active repo line already contains:

- `schemas/scenario.schema.json`
- `schemas/run-packet.schema.json`
- `schemas/compute-device.schema.json`
- `schemas/compute-module.schema.json`
- `schemas/comms-load.schema.json`
- `schemas/thermal-zone.schema.json`
- `schemas/conversion-branch.schema.json`
- `schemas/radiator.schema.json`
- `schemas/storage.schema.json`
- `runtime/transforms/scenario-aggregation.ts`
- `runtime/runner/run-packet.ts`
- `ui/app/index.html`
- `ui/app/app.js`

### 3.2 Compatibility-first rule

The implementation shall extend these objects by controlled addition.

The implementation shall not:

- replace the scenario object with a new top-level browser-only packet shape
- replace the canonical branch enum family
- replace the canonical zone enum family
- require additive browser state that cannot be compiled back into deterministic payload files

### 3.3 Allowed extension mechanisms

Allowed mechanisms are:

- optional fields added to existing schemas
- new catalog JSON assets
- new catalog schema files
- new compatibility transform functions
- deterministic generated payload files
- packet metadata additions
- output-section additions

## 4. Required New Files

### 4.1 Catalog data files

Required:

- `ui/app/catalogs/scenario-presets.v0.1.0.json`
- `ui/app/catalogs/compute-device-presets.v0.1.0.json`
- `ui/app/catalogs/payload-archetypes.v0.1.0.json`
- `ui/app/catalogs/material-families.v0.1.0.json`
- `ui/app/catalogs/branch-presets.v0.1.0.json`
- `ui/app/catalogs/branding.v0.1.0.json`

### 4.2 Catalog schema files

Recommended and deterministic:

- `schemas/catalogs/scenario-preset-catalog.schema.json`
- `schemas/catalogs/compute-device-preset-catalog.schema.json`
- `schemas/catalogs/payload-archetype-catalog.schema.json`
- `schemas/catalogs/material-family-catalog.schema.json`
- `schemas/catalogs/branch-preset-catalog.schema.json`
- `schemas/catalogs/branding-catalog.schema.json`

### 4.3 UI support files

Allowed where needed:

- `ui/app/catalog-loader.js`
- `ui/app/state-compiler.js`
- `ui/app/id-utils.js`

If the implementation keeps a single `app.js`, the file split is optional.

### 4.4 Runtime support files

Allowed where needed:

- `runtime/transforms/payload-aggregation.ts`
- `runtime/transforms/catalog-resolution.ts`
- `runtime/transforms/id-normalization.ts`
- `runtime/emitters/packet-metadata-emitter.ts`

### 4.5 Guides

Required:

- `docs/operator-guides/packet-builder-operator-guide-v0.1.5.md`
- `docs/research-guides/catalog-sourcing-and-research-guide-v0.1.5.md`

## 5. Scenario Schema Patch

### 5.1 Existing canonical fields preserved

The current scenario schema fields remain canonical, including:

- `scenario_id`
- `scenario_version`
- `label`
- `orbit_class`
- `mission_mode`
- `node_class`
- `architecture_class`
- `thermal_policy_id`
- `compute_module_ref`
- `non_compute_load_ref`
- `thermal_architecture_ref`
- `selected_branches`
- `radiator_ref`
- `storage_ref`
- `comms_load_ref`
- `assumptions`
- `reporting_preferences`

### 5.2 Required additive scenario fields

Add the following optional fields to `schemas/scenario.schema.json`:

- `scenario_preset_id: string`
- `scenario_preset_version: string`
- `catalog_versions_used: object`
- `catalog_checksums_sha256: object`
- `branch_block_refs: string[]`
- `non_compute_payload_refs: string[]`
- `thermal_zone_refs: string[]`
- `material_family_refs: string[]`
- `topology_ref: string`
- `generated_aggregate_payload_ref: string`
- `transform_trace: string[]`
- `research_required_items: string[]`

### 5.3 Scenario serialization rule

The scenario object remains the runtime entry point.

If additive payload blocks or repeatable branch blocks are used in the UI, the scenario shall still serialize deterministically to the current runtime family by means of:

- declared refs to additive blocks, and
- a generated compatibility artifact where the current runtime still requires a single aggregate object

## 6. Run-Packet Schema Patch

### 6.1 Existing canonical fields preserved

The current run-packet family remains canonical.

### 6.2 Required run-packet additions

Add the following required or conditionally required fields to `schemas/run-packet.schema.json`:

- `file_manifest` — array of `{ name, byte_length }`
- `catalog_ids_used` — array of strings
- `catalog_versions_used` — object keyed by catalog family
- `catalog_checksums_sha256` — object keyed by catalog family
- `transform_trace` — array of strings
- `runtime_authority_declaration` — string const `runtime`
- `branding_metadata` — object
- `validation_summary` — object
- `risk_summary` — object
- `research_required_items` — array of strings

### 6.3 Packet manifest rule

Every file listed in `payload_file_refs` shall also appear in `file_manifest`.

Every generated compatibility payload file shall be listed in both places.

### 6.4 Byte-length rule

`byte_length` shall be the UTF-8 encoded byte length of the exact serialized file content.

## 7. Compute-Device Schema Patch

### 7.1 Existing canonical fields preserved

The current compute-device schema remains canonical, including:

- `device_id`
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
- load-state powers
- `package_mass_kg`
- `packaging_notes`

### 7.2 Required compute-device additions

Add optional fields:

- `preset_id: string`
- `maturity_class: string`
- `thermal_grade: string`
- `package_type: string`
- `cooling_pickup_class: string`
- `pickup_geometry: string`
- `performance_basis_note: string`
- `thermal_basis_note: string`
- `research_required: boolean`
- `risk_notes: string[]`

### 7.3 Required initial dropdown values

`device_type` remains canonical:

- `gpu`
- `cpu`
- `accelerator`
- `asic`
- `fpga`
- `custom`

Required preset-facing `maturity_class` values:

- `experimental`
- `prototype`
- `qualified_estimate`
- `flight_proven_analog`
- `flight_proven`

Required `cooling_pickup_class` values:

- `cold_plate`
- `immersed_block`
- `vapor_chamber_assisted`
- `custom`

Required `pickup_geometry` values:

- `single_sided_cold_plate`
- `double_sided_cold_plate`
- `vertical_stack_cube_slot`
- `custom`

## 8. Compute-Module Schema Patch

### 8.1 Existing canonical fields preserved

The compute-module remains the assembly-level compute load object.

### 8.2 Required compute-module additions

Add optional fields:

- `module_preset_id: string`
- `ui_device_preset_id: string`
- `overrides_applied: string[]`
- `packaging_stress_class: string`
- `compactness_stress_class: string`

### 8.3 Compute power accounting

The runtime-facing compute-module total internal electrical draw at selected load state shall remain:

- `W_dot_compute_module = W_dot_devices + W_dot_memory + W_dot_storage + W_dot_network + W_dot_power_conversion + W_dot_control`

where:

- `W_dot_devices = device_count × W_dot_device_at_selected_load_state`

## 9. Non-Compute Payload Model Patch

### 9.1 Current compatibility reality

The current runtime family uses a single `comms-load` object referenced by:

- `non_compute_load_ref`
- `comms_load_ref`

This patch shall preserve that compatibility.

### 9.2 Required additive UI payload block structure

Each additive payload block in UI state shall minimally contain:

- `payload_block_id`
- `archetype_id`
- `label`
- `rf_comms_power_w`
- `telemetry_power_w`
- `radar_power_w`
- `optical_crosslink_power_w`
- `duty_mode`
- `duty_fraction`
- `thermal_coupling_zone_ref`
- `research_required`
- `notes`

### 9.3 Required aggregation transform

When exporting to the current runtime family, additive payload blocks shall compile into a generated aggregate `comms-load` payload using:

- `rf_comms_power_w_total = Σ_i (rf_comms_power_w_i × duty_factor_i)`
- `telemetry_power_w_total = Σ_i (telemetry_power_w_i × duty_factor_i)`
- `radar_power_w_total = Σ_i (radar_power_w_i × duty_factor_i)`
- `optical_crosslink_power_w_total = Σ_i (optical_crosslink_power_w_i × duty_factor_i)`

where:

- `duty_factor_i = 1.0` when `duty_mode = continuous`
- `duty_factor_i = duty_fraction_i` when `duty_mode = uniform`
- `duty_factor_i = duty_fraction_i` for the aggregate compatibility export when `duty_mode = per_subsystem` and no per-subsystem decomposition exists

### 9.4 Aggregate non-compute load equation

The generated aggregate non-compute load shall satisfy:

- `W_dot_non_compute_total = rf_total + telemetry_total + radar_total + optical_total`

### 9.5 Generated compatibility file rule

The generated file shall:

- be a valid `comms-load` schema object
- receive a deterministic `payload_id`
- be included in `payload_file_refs`
- be included in `file_manifest`
- be disclosed in `transform_trace`

## 10. Thermal-Zone Schema Patch

### 10.1 Existing canonical fields preserved

The current thermal-zone schema remains canonical.

### 10.2 Required thermal-zone additions

Add optional fields:

- `zone_subtype: string`
- `pickup_geometry: string`
- `service_role: string`
- `material_family_ref: string`
- `coupled_zone_refs: string[]`
- `topology_role: string`
- `research_required: boolean`

### 10.3 Canonical zone-type family preserved

`zone_type` remains:

- `compute_vault`
- `hx_boundary`
- `high_temp_backbone`
- `radiator_emitter`
- `custom`

### 10.4 Required zone-subtype values

At minimum:

- `controlled_compute_vault`
- `chipset_pickup_stage1`
- `low_gradient_loop`
- `eutectic_exchange_hub`
- `regen_hot_island`
- `active_hot_island`
- `radiator_service_domain`
- `payload_emitter_zone`
- `branch_sink_zone`
- `custom`

### 10.5 Required service-role values

At minimum:

- `pickup`
- `transport`
- `exchange`
- `storage`
- `rejection`
- `payload`
- `branch_sink`
- `custom`

## 11. Storage Schema Patch

### 11.1 Existing canonical fields preserved

The current storage schema remains canonical.

### 11.2 Required storage additions

Add optional fields:

- `preset_id: string`
- `material_family_ref: string`
- `charge_role: string`
- `discharge_role: string`
- `topology_role: string`
- `storage_state_basis: string`
- `research_required: boolean`

### 11.3 Required storage-class values preserved

Current `storage_class` values remain canonical:

- `sensible_solid`
- `sensible_liquid`
- `pcm_latent`
- `eutectic_metal`
- `mixed`
- `custom`

### 11.4 Required additional storage preset vocabulary

Catalog-facing preset labels shall support at minimum:

- `pcm_eutectic_store`
- `sensible_refractory_store`
- `custom`

These map onto the canonical storage schema without replacing canonical `storage_class` values.

## 12. Radiator Schema Patch

### 12.1 Existing canonical fields preserved

The current radiator schema remains canonical.

### 12.2 Required radiator additions

Add optional fields:

- `preset_id: string`
- `material_family_ref: string`
- `service_domain_type: string`
- `maturity_class: string`
- `research_required: boolean`
- `risk_notes: string[]`

### 12.3 Required service-domain values

At minimum:

- `primary_rejector`
- `payload_service_domain`
- `branch_sink_domain`
- `custom`

## 13. Conversion-Branch Schema Patch

### 13.1 Existing canonical fields preserved

The current conversion-branch schema remains canonical.

### 13.2 Required branch additions

Add optional fields:

- `preset_id: string`
- `branch_variant: string`
- `source_zone_ref: string`
- `sink_zone_ref: string`
- `requires_work_input: boolean`
- `allows_external_heat_source: boolean`
- `work_input_w: number`
- `external_heat_input_w: number`
- `storage_drawdown_w: number`
- `requires_carnot_check: boolean`
- `maturity_class: string`
- `research_required: boolean`
- `risk_notes: string[]`

### 13.3 Canonical branch-type family preserved

`branch_type` remains:

- `none`
- `reverse_brayton`
- `brayton_power_cycle`
- `stirling`
- `tpv`
- `teg`
- `rf_export`
- `laser_export`
- `custom`

### 13.4 Required branch-variant values

At minimum:

- `base`
- `with_regen`
- `solar_polish`
- `custom`

### 13.5 Required branch mode values preserved

Current `mode_label` values remain canonical:

- `heat_lift`
- `power_cycle`
- `electrical_conversion`
- `directed_energy_emission`
- `scavenging`

## 14. Topology Contract

### 14.1 Required topology metadata object

Where the UI exposes two-hot-island or solar-polish architectures, a topology payload or embedded topology metadata object shall minimally include:

- `topology_id`
- `topology_type`
- `regen_hot_island_zone_ref`
- `active_hot_island_zone_ref`
- `exchange_hub_zone_ref`
- `solar_source_enabled`
- `solar_source_ref`
- `source_branch_refs`
- `consumer_branch_refs`
- `notes`
- `research_required`

### 14.2 Required topology-type values

At minimum:

- `single_backbone`
- `dual_hot_island`
- `dual_hot_island_with_exchange_hub`
- `dual_hot_island_with_solar_polish`
- `custom`

## 15. Catalog Contracts

### 15.1 Scenario preset catalog contract

Each scenario preset entry shall include:

- `preset_id`
- `label`
- `version`
- `node_class`
- `scenario_id_seed`
- `mission_mode_default`
- `architecture_class_default`
- `compute_device_preset_id`
- `compute_module_defaults`
- `payload_archetype_defaults`
- `thermal_zone_defaults`
- `radiator_defaults`
- `storage_defaults`
- `branch_defaults`
- `reporting_defaults`
- `risk_notes`
- `research_required`

### 15.2 Compute-device preset catalog contract

Each entry shall include:

- `preset_id`
- `label`
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
- `maturity_class`
- `thermal_grade`
- `cooling_pickup_class`
- `pickup_geometry`
- `performance_basis_note`
- `thermal_basis_note`
- `packaging_notes`
- `research_required`

### 15.3 Payload archetype catalog contract

Each entry shall include:

- `archetype_id`
- `label`
- `rf_comms_power_w`
- `telemetry_power_w`
- `radar_power_w`
- `optical_crosslink_power_w`
- `default_duty_mode`
- `default_duty_fraction`
- `default_thermal_coupling_zone_ref`
- `notes`
- `research_required`

### 15.4 Material-family catalog contract

Each entry shall include:

- `material_family_id`
- `label`
- `material_class`
- `nominal_temp_min_k`
- `nominal_temp_max_k`
- `default_emissivity`
- `estimated_areal_density_kg_per_m2`
- `corrosion_sensitivity`
- `contamination_sensitivity`
- `vibration_sensitivity`
- `maturity_class`
- `notes`
- `research_required`

### 15.5 Branch-preset catalog contract

Each entry shall include:

- `preset_id`
- `label`
- `branch_type`
- `branch_variant`
- `mode_label`
- `output_class`
- `requires_work_input`
- `allows_external_heat_source`
- `requires_carnot_check`
- `default_efficiency_fraction`
- `default_efficiency_or_cop`
- `default_loss_partition_rule`
- `risk_notes`
- `maturity_class`
- `research_required`

### 15.6 Branding catalog contract

Each entry shall include:

- `branding_id`
- `organization_name`
- `contact_name`
- `contact_email`
- `rights_notice`
- `confidentiality_notice`
- `recipient_notice`
- `default_packet_footer`

## 16. Required Initial Catalog Values

### 16.1 Scenario presets

Required:

- `50kw_baseline`
- `100kw_baseline`
- `1mw_baseline`
- `custom_blank`

### 16.2 Compute-device presets

Required:

- `gpu_h200_class`
- `gpu_nextgen_placeholder`
- `asic_high_heat_class`
- `custom`

### 16.3 Payload archetypes

Required:

- `ttc_baseline`
- `rf_relay`
- `optical_crosslink`
- `radar_payload`
- `mixed_mission`
- `custom`

### 16.4 Material families

Required:

- `carbon_composite`
- `sic`
- `refractory_metal_generic`
- `molybdenum_alloy`
- `tungsten_alloy`
- `eutectic_metal_compatible`
- `liquid_metal_compatible`
- `custom`

### 16.5 Branch presets

Required:

- `reverse_brayton_base`
- `reverse_brayton_with_regen`
- `brayton_power_cycle_base`
- `brayton_power_cycle_with_regen`
- `stirling_base`
- `stirling_with_regen`
- `tpv_base`
- `teg_base`
- `solar_polish`
- `rf_export`
- `laser_export`
- `custom`

## 17. UI Control Contract

### 17.1 Tab 1 controls

Required dropdowns / controls:

- `scenario_preset_id`
- `node_class`
- `mission_mode`
- `architecture_class`

Required `architecture_class` values at minimum:

- `cold_loop_plus_hot_backbone`
- `cold_loop_plus_dual_hot_island`
- `cold_loop_plus_dual_hot_island_plus_exchange_hub`
- `cold_loop_plus_dual_hot_island_plus_solar_polish`
- `custom`

### 17.2 Tab 2 controls

Required dropdowns / controls:

- `compute_device_preset_id`
- `device_type`
- `cooling_pickup_class`
- `pickup_geometry`
- `redundancy_mode`
- `target_load_state`

### 17.3 Tab 3 controls

Each payload block shall contain:

- archetype dropdown
- label input
- four subsystem power inputs
- duty-mode dropdown
- duty-fraction input
- coupling-zone dropdown
- notes input
- duplicate/remove controls

Required `duty_mode` values:

- `continuous`
- `uniform`
- `per_subsystem`

### 17.4 Tab 4 controls

Required zone-facing dropdowns:

- `zone_type`
- `zone_subtype`
- `service_role`
- `pickup_geometry`

### 17.5 Tab 5 controls

Required radiator/storage-facing dropdowns:

- `material_family_ref`
- `service_domain_type`
- `storage_class`
- `storage_preset_id`

### 17.6 Tab 6 controls

Each branch block shall contain:

- branch preset dropdown
- branch type display
- branch variant display
- mode display
- source-zone dropdown
- sink-zone dropdown
- input-stage ref input/dropdown
- efficiency / COP input
- efficiency fraction input
- work input field
- external heat input field
- storage drawdown field
- risk / maturity display

### 17.7 Tab 7 controls

Required output sections:

- derived summary
- validation summary
- risk summary
- file manifest preview
- transform trace preview
- branding / confidentiality block

## 18. Math and Accounting Law

### 18.1 Additive non-compute total

For UI additive payload blocks:

- `W_dot_non_compute_total = Σ_i [ (W_rf_i + W_tel_i + W_radar_i + W_opt_i) × duty_factor_i ]`

### 18.2 Compute internal total

For the selected compute module:

- `W_dot_compute_total = device_count × W_dot_device(load_state) + W_memory + W_storage + W_network + W_conversion + W_control`

### 18.3 Internal reject accounting

Preserve the base runtime aggregation relationship:

- `Q_dot_internal = W_dot_compute_total + W_dot_non_compute_total + W_dot_conversion_losses + W_dot_control_losses`

### 18.4 Total reject accounting

Preserve the base engineering law for total reject burden:

- `Q_dot_total_reject = Q_dot_internal + Q_dot_external + Q_dot_branch_losses - W_dot_exported_equivalent`

### 18.5 Radiator sizing law

Preserve the base radiator relationship:

- `Q_dot_rad = ε_rad × σ × F_view × A_radiator_effective × (T_radiator_target^4 - T_sink_effective^4)`
- `A_radiator_effective = Q_dot_rad / [ ε_rad × σ × F_view × (T_radiator_target^4 - T_sink_effective^4) ]`

where:

- `σ = 5.670374419e-8 W/m²·K⁴`

### 18.6 Margin-applied radiator area

Preserve the existing margin relation:

- `A_with_margin = A_radiator_effective × (1 + reserve_margin_fraction)`

### 18.7 Power-cycle Carnot bound

For `mode_label = power_cycle`:

- `η_carnot_engine = 1 - (T_cold / T_hot)`
- require `0 < η_actual <= η_carnot_engine`
- and `η_actual = efficiency_or_cop`

### 18.8 Heat-lift Carnot bound

For `mode_label = heat_lift`:

- `COP_heating_carnot = T_hot / (T_hot - T_cold)`
- require `1 < COP_actual <= COP_heating_carnot`
- and `COP_actual = efficiency_or_cop`

### 18.9 No silent uplift enforcement

If a branch or topology implies temperature lift or hot-side service improvement, then at least one of the following shall be declared positive or flagged unresolved:

- `work_input_w`
- `external_heat_input_w`
- `storage_drawdown_w`
- `research_required = true`

### 18.10 Corrected regression anchor

The corrected 50 kW radiator case at 1200 K shall remain pinned:

- `Q = 50,000 W`
- `ε = 0.90`
- `F = 1.0`
- `T = 1200 K`
- `T_sink = 0 K`
- `A = 0.4725 m²` rounded to four decimals

## 19. Deterministic Identifier Law

### 19.1 Objects requiring stable ids

Stable deterministic ids are required for:

- payload blocks
- generated aggregate payloads
- branch blocks
- thermal zones
- topology objects
- packet ids when compiled from unchanged ordered inputs
- bundle ids except for timestamp component if timestamp remains part of bundle naming

### 19.2 Deterministic id basis

For generated compatibility objects, the id basis shall be a stable ordered digest input over:

- object type
- ordered block ids
- ordered block values after normalization
- relevant schema version

### 19.3 Ordering rule

Reordering blocks shall produce a new deterministic id because order is part of operator intent.

## 20. Transform Disclosure Law

Every compatibility transform shall be disclosed in packet metadata.

Required `transform_trace` entries at minimum when relevant:

- scenario preset application
- compute-device preset application
- additive payload aggregation
- catalog default expansion
- runtime default expansion
- schema normalization

## 21. Validation Law

### 21.1 Blocking validation cases

The UI shall block packet export when any of the following are true:

- required canonical ids are missing
- device count < 1
- any required power field is negative
- radiator target temperature <= 0
- emissivity not in `(0, 1]`
- view factor not in `(0, 1]`
- `target_surface_temp_k > material_limit_temp_k`
- `mode_label = power_cycle` and `t_hot_source_k <= t_cold_sink_k`
- `mode_label = heat_lift` and required source term set is absent and `research_required != true`

### 21.2 Non-blocking warning cases

Warnings shall be surfaced for:

- simultaneous heat-lift and power-cycle branch selections
- speculative device presets
- speculative material presets
- solar-polish architecture with missing source characterization
- aggregate payload generated from per-subsystem duty mode simplification

### 21.3 Validation summary output

The packet preview shall expose:

- blocking issues
- warnings
- research-required items
- unsupported architecture notes

## 22. Risk Output Contract

The output preview and packet metadata shall include:

- `maturity_class`
- `ttl_class`
- `thermal_cycling_risk`
- `corrosion_risk`
- `contamination_risk`
- `vibration_risk`
- `packaging_stress`
- `compactness_stress`
- `research_required_items`

Required `ttl_class` values:

- `short`
- `moderate`
- `long`
- `mission_limited`
- `unknown`

## 23. Branding / Confidentiality Contract

Branding metadata shall be report-only.

No branding field may change runtime results, validation logic, or schema meaning.

Required branding output fields:

- `organization_name`
- `contact_name`
- `contact_email`
- `rights_notice`
- `confidentiality_notice`
- `recipient_notice`
- `default_packet_footer`

## 24. Bundle and Export Contract

### 24.1 Required payload files when relevant

A completed packet bundle shall include at minimum:

- `scenario.json`
- `run-packet.json`
- `scenario-summary.md`
- generated aggregate payload file if additive UI payload mode is used
- any exported preset-resolved or topology payload files required by the final implementation

### 24.2 Required manifest fields

Each manifest entry shall include:

- `name`
- `byte_length`

### 24.3 Required packet metadata fields

The packet preview and/or `run-packet.json` shall include:

- `catalog_ids_used`
- `catalog_versions_used`
- `catalog_checksums_sha256`
- `transform_trace`
- `runtime_authority_declaration`
- `validation_summary`
- `risk_summary`
- `branding_metadata`

## 25. Implementation Order

Required order:

1. patch law docs
2. patch schemas by controlled addition
3. add catalog schema files
4. add catalog data files
5. patch runtime transforms for compatibility aggregation and metadata
6. patch UI state model and controls
7. patch packet preview / export
8. add guides
9. run gates

## 26. Gate Requirements

From repo root, implementation must continue to pass:

- `npm ci`
- `npm run lint:schemas`
- `npm run typecheck`
- `npm test`
- `npm run build`

## 27. Acceptance Criteria

This patch is accepted only if all of the following are true:

1. the browser can load versioned preset catalogs
2. scenario presets populate deterministic initial state
3. additive non-compute payloads compile to a deterministic compatibility artifact
4. repeatable branch blocks compile to current branch-family semantics
5. richer zone meanings serialize by subtype, not type replacement
6. changed operator values propagate into exported payloads and therefore into runtime outputs
7. transform-generated files are disclosed in packet metadata and manifest
8. risk / maturity / branding summaries appear in output preview
9. the repo remains buildable and gate-clean

## 28. Out of Scope

This patch does not:

- authorize final spacecraft certification logic
- authorize browser-only substitution for runtime equations
- solve high-fidelity transient thermal physics
- replace the existing runtime formula module family
