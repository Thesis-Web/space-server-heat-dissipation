# Orbital Thermal Trade System Model Extension 2 Engineering Spec v0.2.1

## 1. Document Control

- Document Type: Engineering Spec
- Project: space-server-heat-dissipation
- Version: v0.2.1
- Status: Controlled extension engineering specification
- Owner: James
- Governing Relationship:
  - Supplements `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
  - Supplements `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
  - Supplements `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md`
  - Must be implemented consistently with `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`

---

## 2. Scope

This extension defines the deterministic schema, runtime, UI, packet, and output contracts for a bounded exploratory model layer covering:

- source spectral profiles
- absorber families
- emitter families
- cavity geometries
- mediator families
- bounded exploratory coefficients for spectral matching and coupling
- baseline-versus-exploratory comparison outputs
- research confidence and provenance tracking
- repo-fit implementation ordering and starter data contracts

This extension shall fit into the existing canonical families already present in the repo:

- `scenario`
- `compute-device`
- `compute-module`
- `comms-load`
- `thermal-zone`
- `storage`
- `radiator`
- `conversion-branch`
- `run-packet`

This extension shall not create a second incompatible runtime packet model.

---

## 3. Non-Negotiable Rules

### 3.1 Runtime authority
All numeric outputs remain runtime-authoritative.

### 3.2 Explicit exploratory serialization
No exploratory coefficient may be implied by UI selection alone without appearing in schema-valid serialized state.

### 3.3 Baseline and exploratory states remain separable
The runtime shall preserve a baseline result path and an exploratory result path when comparison is requested.

### 3.4 No free-lunch enforcement
No Extension 2 stage may improve source quality, reduce radiator area, or improve branch feasibility without explicit terms for:
- source thermal availability
- capture effectiveness
- band overlap
- geometry coupling
- mediator transfer
- losses
- work input if used
- external thermal input if used
- storage drawdown if used

### 3.5 Bounded coefficients only
Every exploratory coefficient shall have min, max, default, units or dimensionless declaration, provenance, and a defined application point in runtime math.

### 3.6 Compatibility-first patch rule
Implementation shall add fields, refs, arrays, and deterministic transforms to existing families before inventing wholly new top-level packet objects.

### 3.7 Manifest visibility
Any generated transform artifacts, derived profiles, or aggregated exploratory objects must appear in packet metadata and file manifest.

### 3.8 Metadata-only versus output-driving separation
Fields declared metadata-only in this spec must not influence numeric outputs until a future law promotes them.

---

## 4. Required New Files

### 4.1 Catalog files under `ui/app/catalogs/`
- `source-spectral-profiles.v0.1.0.json`
- `absorber-families.v0.1.0.json`
- `emitter-families.v0.1.0.json`
- `cavity-geometries.v0.1.0.json`
- `mediator-families.v0.1.0.json`
- `research-evidence-classes.v0.1.0.json`

### 4.2 Catalog schema files under `schemas/`
- `source-spectral-profile.schema.json`
- `absorber-family.schema.json`
- `emitter-family.schema.json`
- `cavity-geometry.schema.json`
- `mediator-family.schema.json`
- `spectral-stage.schema.json`

### 4.3 Guide files
- `docs/operator-guides/model-extension-2-operator-guide-v0.2.1.md`
- `docs/research-guides/model-extension-2-research-guide-v0.2.1.md`

### 4.4 Required implementation ledgers
For deterministic build work, the implementation packet shall also contain:
- `docs/implementation-ledgers/model-extension-2-schema-ledger-v0.2.1.md`
- `docs/implementation-ledgers/model-extension-2-ui-ledger-v0.2.1.md`
- `docs/implementation-ledgers/model-extension-2-runtime-ledger-v0.2.1.md`
- `docs/implementation-ledgers/model-extension-2-catalog-starter-pack-v0.2.1.md`

---

## 5. Scenario Contract Patch

### 5.1 Required scenario fields
The scenario family shall be extended to support:
- `enable_model_extension_2` : boolean, default `false`
- `model_extension_2_mode` : enum, default `disabled`
- `source_spectral_profile_ref` : string or null, default `null`
- `spectral_stage_refs[]` : array of string ids, default `[]`
- `exploratory_result_policy` : enum, default `do_not_mix`
- `research_packet_intent` : enum, default `engineering_trade`
- `strict_research_enforcement` : boolean, default `true`

### 5.2 Allowed values
`model_extension_2_mode`:
- `disabled`
- `baseline_only`
- `exploratory_compare`
- `exploratory_only`

`exploratory_result_policy`:
- `do_not_mix`
- `emit_delta_only`
- `emit_parallel_result`

`research_packet_intent`:
- `engineering_trade`
- `research_screen`
- `bench_candidate`
- `custom`

### 5.3 Required behavior
If `enable_model_extension_2 = false`, all Extension 2 fields must be absent, null, empty, or ignored by normalization.

If `model_extension_2_mode = exploratory_compare`, the runtime shall emit:
- `baseline_result`
- `exploratory_result`
- `delta_result`

If `model_extension_2_mode = baseline_only`, exploratory fields shall serialize but must not affect baseline numeric outputs.

---

## 6. Source Spectral Profile Contract

### 6.1 Required catalog fields
Each source spectral profile entry shall include:
- `profile_id`
- `label`
- `profile_class`
- `source_type`
- `temperature_basis_min_k`
- `temperature_basis_nominal_k`
- `temperature_basis_max_k`
- `wavelength_band_min_um`
- `wavelength_band_peak_um`
- `wavelength_band_max_um`
- `emissivity_basis`
- `provenance_class`
- `maturity_class`
- `confidence_class`
- `source_note`
- `research_required`

### 6.2 Allowed initial profile classes
- `compute_die_band`
- `package_hotspot_band`
- `warm_transport_band`
- `hot_island_band`
- `solar_polished_hot_island_band`
- `custom`

### 6.3 Numeric rules
- `temperature_basis_min_k > 0`
- `temperature_basis_min_k <= temperature_basis_nominal_k <= temperature_basis_max_k`
- `0 < wavelength_band_min_um <= wavelength_band_peak_um <= wavelength_band_max_um`
- `0 <= emissivity_basis <= 1`

### 6.4 Wien-law helper
The runtime may compute a helper:
- `lambda_peak_um = 2897.771955 / T_source_k`

This helper is display or exploratory support only unless a derived profile is explicitly serialized.

### 6.5 Derived-profile disclosure
If the UI derives a profile instead of using a catalog ref, the packet must include:
- derived basis temperature
- helper wavelength result
- derived profile id
- provenance class
- research-required state

---

## 7. Absorber Family Contract

### 7.1 Required catalog fields
Each absorber family entry shall include:
- `absorber_family_id`
- `label`
- `absorber_class`
- `wavelength_band_min_um`
- `wavelength_band_nominal_um`
- `wavelength_band_max_um`
- `nominal_absorptivity`
- `nominal_emissivity`
- `temperature_min_k`
- `temperature_nominal_k`
- `temperature_max_k`
- `contamination_sensitivity`
- `corrosion_sensitivity`
- `radiation_sensitivity`
- `surface_state_class`
- `provenance_class`
- `maturity_class`
- `confidence_class`
- `output_effect_class`
- `default_enabled_for_exploration`
- `notes[]`
- `research_required`

### 7.2 Allowed initial absorber classes
- `broadband_mid_ir_absorber`
- `narrowband_mid_ir_absorber`
- `metamaterial_candidate`
- `ceramic_selective_absorber`
- `refractory_receiver_surface`
- `custom`

### 7.3 Numeric bounds
- `0 <= nominal_absorptivity <= 1`
- `0 <= nominal_emissivity <= 1`
- `temperature_min_k < temperature_nominal_k < temperature_max_k`
- `0 < wavelength_band_min_um <= wavelength_band_nominal_um <= wavelength_band_max_um`

### 7.4 Output-driving rule
The following absorber fields may affect exploratory outputs:
- `wavelength_band_*`
- `nominal_absorptivity`
- `temperature_*`

The following absorber fields are metadata-only:
- `contamination_sensitivity`
- `corrosion_sensitivity`
- `radiation_sensitivity`
- `surface_state_class`
- `notes[]`

---

## 8. Emitter Family Contract

### 8.1 Required catalog fields
Each emitter family entry shall include:
- `emitter_family_id`
- `label`
- `emitter_class`
- `wavelength_band_min_um`
- `wavelength_band_nominal_um`
- `wavelength_band_max_um`
- `nominal_emissivity`
- `nominal_selectivity_fraction`
- `temperature_min_k`
- `temperature_nominal_k`
- `temperature_max_k`
- `tpv_compatibility_class`
- `provenance_class`
- `maturity_class`
- `confidence_class`
- `output_effect_class`
- `default_enabled_for_exploration`
- `notes[]`
- `research_required`

### 8.2 Allowed initial emitter classes
- `broadband_radiator`
- `selective_emitter`
- `variable_emissivity_surface`
- `tpv_coupled_emitter_candidate`
- `custom`

### 8.3 Numeric bounds
- `0 <= nominal_emissivity <= 1`
- `0 <= nominal_selectivity_fraction <= 1`
- `temperature_min_k < temperature_nominal_k < temperature_max_k`

### 8.4 Output-driving rule
The following emitter fields may affect exploratory outputs:
- `wavelength_band_*`
- `nominal_emissivity`
- `nominal_selectivity_fraction`
- `temperature_*`

The following emitter fields are metadata-only:
- `tpv_compatibility_class`
- `notes[]`

---

## 9. Cavity Geometry Contract

### 9.1 Required catalog fields
Each cavity geometry entry shall include:
- `cavity_geometry_id`
- `label`
- `geometry_class`
- `optical_access_factor`
- `surface_area_multiplier`
- `coupling_uniformity_class`
- `nominal_view_factor`
- `nominal_path_length_factor`
- `manufacturability_class`
- `output_effect_class`
- `notes[]`
- `research_required`

### 9.2 Allowed initial geometry classes
- `planar_receiver`
- `folded_cavity`
- `microchannel_receiver`
- `porous_exchange_matrix`
- `annular_hot_island_receiver`
- `custom`

### 9.3 Numeric bounds
- `0 <= optical_access_factor <= 1`
- `surface_area_multiplier >= 1`
- `0 < nominal_view_factor <= 1`
- `nominal_path_length_factor >= 1`

### 9.4 Output-driving rule
The following cavity fields may affect exploratory outputs:
- `optical_access_factor`
- `surface_area_multiplier`
- `nominal_view_factor`
- `nominal_path_length_factor`

The following cavity fields are metadata-only:
- `coupling_uniformity_class`
- `manufacturability_class`
- `notes[]`

---

## 10. Mediator Family Contract

### 10.1 Required catalog fields
Each mediator family entry shall include:
- `mediator_family_id`
- `label`
- `mediator_class`
- `phase_behavior_class`
- `temperature_min_k`
- `temperature_nominal_k`
- `temperature_max_k`
- `nominal_specific_energy_j_per_kg`
- `nominal_density_kg_per_m3`
- `nominal_thermal_buffer_fraction`
- `compatible_absorber_classes[]`
- `compatible_emitter_classes[]`
- `contamination_sensitivity`
- `corrosion_sensitivity`
- `cycling_risk`
- `provenance_class`
- `maturity_class`
- `confidence_class`
- `output_effect_class`
- `default_enabled_for_exploration`
- `notes[]`
- `research_required`

### 10.2 Allowed initial mediator classes
- `pcm_eutectic_store`
- `sensible_refractory_store`
- `liquid_metal_exchange_candidate`
- `hybrid_pcm_refractory_store`
- `custom`

### 10.3 Numeric bounds
- `temperature_min_k < temperature_nominal_k < temperature_max_k`
- `nominal_specific_energy_j_per_kg > 0`
- `nominal_density_kg_per_m3 > 0`
- `0 <= nominal_thermal_buffer_fraction <= 1`

### 10.4 Output-driving rule
The following mediator fields may affect exploratory outputs:
- `temperature_*`
- `nominal_specific_energy_j_per_kg`
- `nominal_density_kg_per_m3`
- `nominal_thermal_buffer_fraction`

The following mediator fields are metadata-only:
- `contamination_sensitivity`
- `corrosion_sensitivity`
- `cycling_risk`
- `notes[]`

---

## 11. Spectral Stage Contract

### 11.1 Required schema object
A versioned `spectral_stage` object shall be added as an explicit extension family or a deterministic nested object referenced from scenario and thermal-zone structures.

### 11.2 Required fields
Each spectral stage shall include:
- `spectral_stage_id`
- `label`
- `enabled`
- `source_zone_ref`
- `target_zone_ref`
- `source_spectral_profile_ref`
- `absorber_family_ref`
- `emitter_family_ref`
- `cavity_geometry_ref`
- `mediator_family_ref`
- `stage_mode`
- `capture_efficiency_fraction`
- `band_match_score`
- `geometry_coupling_score`
- `mediator_transfer_score`
- `regeneration_effectiveness`
- `thermal_loss_fraction`
- `work_input_w`
- `external_heat_input_w`
- `storage_drawdown_w`
- `source_capture_fraction_override`
- `notes[]`
- `provenance_class`
- `maturity_class`
- `confidence_class`
- `research_required`

### 11.3 Allowed stage modes
- `passive_capture`
- `capture_to_regen_store`
- `capture_to_active_hot_island`
- `capture_plus_solar_polish`
- `custom`

### 11.4 Numeric bounds
- `0 <= capture_efficiency_fraction <= 1`
- `0 <= band_match_score <= 1`
- `0 <= geometry_coupling_score <= 1`
- `0 <= mediator_transfer_score <= 1`
- `0 <= regeneration_effectiveness <= 1`
- `0 <= thermal_loss_fraction < 1`
- `0 <= source_capture_fraction_override <= 1`
- `work_input_w >= 0`
- `external_heat_input_w >= 0`
- `storage_drawdown_w >= 0`

### 11.5 No-hidden-default rule
If any stage score is not explicitly provided, runtime must either:
- use a catalog-declared default and serialize it in normalized state, or
- flag the stage incomplete

### 11.6 Stage output-driving map
The following stage fields drive exploratory output:
- `capture_efficiency_fraction`
- `band_match_score`
- `geometry_coupling_score`
- `mediator_transfer_score`
- `regeneration_effectiveness`
- `thermal_loss_fraction`
- `work_input_w`
- `external_heat_input_w`
- `storage_drawdown_w`
- `source_capture_fraction_override`

The following stage fields are metadata-only:
- `notes[]`
- `maturity_class` for numeric effect
- `confidence_class` for numeric effect

These metadata-only fields still affect warnings and strictness.

---

## 12. Research Confidence Contract

### 12.1 Provenance class enum
- `measured`
- `literature_derived`
- `analog_estimated`
- `placeholder`
- `hypothesis_only`

### 12.2 Maturity class enum
- `concept_only`
- `bench_evidence`
- `modeled_only`
- `heritage_analog`
- `qualified_estimate`
- `custom`

### 12.3 Confidence class enum
- `low`
- `medium`
- `high`
- `unknown`

### 12.4 Output effect class enum
- `output_driving`
- `metadata_only`
- `warning_only`

### 12.5 Research-required rule
If `provenance_class` is `placeholder` or `hypothesis_only`, `research_required` must be `true`.

If `strict_research_enforcement = true` and an output-driving field is `placeholder` or `hypothesis_only`, packet generation shall raise at least a blocking caution.

---

## 13. Required Math and Accounting

### 13.1 Baseline preservation
Current baseline load calculations and total reject accounting from the existing repo remain authoritative and unchanged unless Extension 2 explicitly adds exploratory parallel results.

### 13.2 Baseline heat source estimate
For each source zone used by a spectral stage:
- `Q_dot_stage_source_available_w = Q_dot_zone_reject_available_w × source_capture_fraction`

where:
- `0 <= source_capture_fraction <= 1`
- `source_capture_fraction = source_capture_fraction_override` if provided
- otherwise `source_capture_fraction = capture_efficiency_fraction`

### 13.3 Exploratory source-band helper
Where needed for source characterization:
- `lambda_peak_um = 2897.771955 / T_source_k`
with `T_source_k > 0`

### 13.4 Band overlap helper
Define:
- `band_overlap_width_um = max(0, min(source_max_um, absorber_max_um) - max(source_min_um, absorber_min_um))`
- `source_band_width_um = max(source_max_um - source_min_um, epsilon)`
- `band_match_score = clamp(band_overlap_width_um / source_band_width_um, 0, 1)`

where:
- `epsilon = 1e-9`

### 13.5 Geometry coupling helper
Define a bounded exploratory helper:
- `geometry_coupling_effective = clamp(optical_access_factor × nominal_view_factor × min(1, 1 / nominal_path_length_factor) , 0, 1)`

This helper may populate a default for `geometry_coupling_score`, but the normalized score must be serialized explicitly.

### 13.6 Mediator transfer helper
Define a bounded exploratory helper:
- `mediator_transfer_effective = clamp(nominal_thermal_buffer_fraction × min(1, T_stage_nominal_k / T_target_nominal_k) , 0, 1)`

where denominator terms must remain greater than zero.

This helper may populate a default for `mediator_transfer_score`, but the normalized score must be serialized explicitly.

### 13.7 Stage exploratory transfer factor
Compute:
- `eta_stage_exploratory = capture_efficiency_fraction × band_match_score × geometry_coupling_score × mediator_transfer_score × regeneration_effectiveness × (1 - thermal_loss_fraction)`

Enforce:
- `0 <= eta_stage_exploratory <= 1`

### 13.8 Exploratory useful transfer
For each enabled stage:
- `Q_dot_stage_useful_w = Q_dot_stage_source_available_w × eta_stage_exploratory + external_heat_input_w + storage_drawdown_w + work_input_w`

This equation must be explicitly labeled exploratory transfer accounting, not proven hardware performance.

### 13.9 Stage residual reject
For each enabled stage:
- `Q_dot_stage_residual_w = max(0, Q_dot_stage_source_available_w + external_heat_input_w + storage_drawdown_w + work_input_w - Q_dot_stage_useful_w)`

### 13.10 Total exploratory target-zone inlet
If multiple stages target the same zone:
- `Q_dot_target_zone_exploratory_inlet_w = Σ_i Q_dot_stage_useful_w`

### 13.11 Exploratory storage-energy estimate
If a mediator-backed storage state is modeled:
- `E_storage_stage_nominal_j = mediator_mass_kg × nominal_specific_energy_j_per_kg × nominal_thermal_buffer_fraction`

with:
- `mediator_mass_kg > 0`

This is exploratory storage accounting only unless promoted by future law.

### 13.12 Exploratory radiator delta
When exploratory routing retargets reject:
- `Q_dot_total_reject_exploratory = Q_dot_baseline_reject - Q_dot_recovered_or_retargeted_w + Q_dot_stage_residual_total_w + Q_dot_additional_losses_w`

where:
- `Q_dot_recovered_or_retargeted_w = Σ useful transfer routed away from baseline radiator path`
- `Q_dot_stage_residual_total_w = Σ_i Q_dot_stage_residual_w`
- `Q_dot_additional_losses_w >= 0`

### 13.13 Radiator area preservation
For any radiator result:
- `Q_dot_rad = epsilon_rad × sigma × F_view × A_effective × (T_rad_target^4 - T_sink_effective^4)`
- `A_effective = Q_dot_rad / (epsilon_rad × sigma × F_view × (T_rad_target^4 - T_sink_effective^4))`

with:
- `sigma = 5.670374419e-8 W/m^2/K^4`

### 13.14 Delta reporting
If exploratory coefficients alter radiator area, branch feasibility, or storage state, output must show:
- baseline value
- exploratory value
- delta
- provenance / confidence note

### 13.15 Clamping and invalid-state rule
If any formula input violates a declared bound:
- runtime shall not silently clamp for final output
- runtime may compute a helper clamp for preview only
- final packet generation must emit validation failure or incomplete state

---

## 14. UI Contract Patch

### 14.1 Tab 1 additions
Add:
- Extension 2 enable checkbox
- scenario mode dropdown
- exploratory result policy dropdown
- research packet intent dropdown
- strict research enforcement checkbox

### 14.2 Tab 2 additions
Add:
- source spectral profile dropdown
- source-temperature-derived helper card
- provenance label
- derived-profile disclosure badge

### 14.3 Tab 4 additions
Thermal Architecture shall support repeatable spectral-stage blocks with:
- add stage
- remove stage
- duplicate stage
- reorder stage
- source zone dropdown
- target zone dropdown
- absorber family dropdown
- emitter family dropdown
- cavity geometry dropdown
- mediator family dropdown
- stage mode dropdown
- coefficient inputs
- provenance / maturity / confidence selectors
- stage validity card

### 14.4 Tab 5 additions
Radiator & Storage shall support:
- exploratory hot-island storage card
- mediator temperature-band card
- emitter family dropdown
- baseline vs exploratory radiator summary

### 14.5 Tab 7 additions
Output shall render:
- baseline summary
- exploratory summary
- delta table
- stage manifest summary
- research-confidence summary
- blocking validation list

---

## 15. Validation Rules

### 15.1 Stage completeness
An enabled spectral stage is invalid if any are missing:
- source zone ref
- target zone ref
- source profile ref or declared derived profile state
- absorber family ref
- emitter family ref
- cavity geometry ref
- mediator family ref

### 15.2 Coefficient bounds
Any coefficient outside its declared range shall block packet generation.

### 15.3 Provenance enforcement
If a stage materially affects output and its provenance is `placeholder` or `hypothesis_only`, output must carry a blocking caution or research-required warning according to strictness.

### 15.4 No-silent-mix validation
If scenario mode is `baseline_only`, exploratory fields shall not affect baseline outputs.

### 15.5 Packet transparency
If Extension 2 is enabled, output bundle must disclose all exploratory coefficients, derived defaults, and catalog ids used.

### 15.6 Metadata-only enforcement
Fields declared metadata-only must not alter exploratory numeric outputs.

### 15.7 Derived-profile integrity
If a derived source profile is used, the packet must serialize enough information to reproduce the derivation deterministically.

---

## 16. Packet and Manifest Contract Patch

### 16.1 Required packet fields
The run-packet output shall include:
- `enable_model_extension_2`
- `model_extension_2_mode`
- `source_spectral_profile_refs[]`
- `derived_source_profiles[]`
- `spectral_stage_refs[]`
- `extension_2_catalog_ids_used[]`
- `extension_2_catalog_versions_used{}`
- `extension_2_catalog_checksums_sha256{}`
- `exploratory_result_policy`
- `research_packet_intent`
- `strict_research_enforcement`
- `exploratory_coefficients_summary`
- `research_required_items[]`

### 16.2 Required result sections
The emitted result bundle shall include:
- `baseline_result`
- `exploratory_result` when applicable
- `delta_result` when applicable
- `extension_2_summary`
- `extension_2_stage_results[]`

### 16.3 Deterministic ids
Implementation shall generate deterministic ids for:
- derived source profiles
- spectral stages
- exploratory result bundles
- delta result bundles

Stable ordered input must produce stable ids.

### 16.4 File manifest additions
If any derived source profiles or normalized stage defaults are generated, they must appear in:
- `payload_file_refs[]` where applicable
- `file_manifest[]` with filename and byte length

---

## 17. Starter Catalog Minimums

### 17.1 Source spectral profiles
Must ship with at least:
- `compute_h200_warm_band`
- `compute_h200_hotspot_band`
- `warm_transport_backbone_band`
- `regen_hot_island_band`
- `solar_polished_hot_island_band`

### 17.2 Absorber families
Must ship with at least:
- `broadband_mid_ir_generic`
- `narrowband_mid_ir_generic`
- `ceramic_selective_absorber_generic`
- `refractory_receiver_surface_generic`

### 17.3 Emitter families
Must ship with at least:
- `broadband_radiator_generic`
- `selective_emitter_generic`
- `variable_emissivity_surface_generic`

### 17.4 Cavity geometries
Must ship with at least:
- `planar_receiver_generic`
- `folded_cavity_generic`
- `annular_hot_island_receiver_generic`

### 17.5 Mediator families
Must ship with at least:
- `pcm_eutectic_generic`
- `sensible_refractory_store_generic`
- `liquid_metal_exchange_candidate_generic`

All starter entries may be conservative, generic, and research-flagged where appropriate.

---

## 18. Guide Requirements

### 18.1 Operator guide
Must document:
- each new dropdown and numeric field
- baseline vs exploratory mode meaning
- how coefficients affect outputs
- why exploratory values are not flight claims

### 18.2 Research guide
Must document:
- catalog sourcing method
- confidence assignment method
- allowed placeholder usage
- conditions for promoting a field from hypothesis to measured or literature-derived

---

## 19. Implementation Order

Required sequence:
1. land this law patch
2. land implementation ledgers
3. patch schema families
4. add catalog schemas and catalog JSON files
5. patch runtime normalization and validation
6. patch runtime result composition
7. patch UI controls and output rendering
8. add guides
9. run gates

No opportunistic redesign outside this order.

---

## 20. Gate Requirements

After implementation, repo must still pass from repo root:
- `npm ci`
- `npm run lint:schemas`
- `npm run typecheck`
- `npm test`
- `npm run build`

---

## 21. Acceptance Criteria

This extension is accepted only if:
1. product can serialize Extension 2 variables deterministically
2. baseline and exploratory modes are visibly separable
3. changing Extension 2 variables changes exploratory outputs through explicit runtime math
4. no exploratory variable silently modifies baseline outputs in baseline-only mode
5. output bundles disclose all exploratory coefficients and confidence state
6. guides and implementation ledgers exist
7. all repo gates pass

---

## 22. Out of Scope

This extension does not:
- declare measured production performance for spectral concentration hardware
- validate specific material families beyond declared evidence state
- replace baseline repo runtime with an unconstrained research solver
- authorize language-model-only numeric reasoning

---

## 23. Local UI Server Launch Contract

### 23.1 Required artifact
A shell script `start-ui.sh` shall be created at the repo root with execute permission (chmod +x).

### 23.2 Behavior
The script shall:
1. resolve its own directory to locate `ui/app/`
2. verify `ui/app/` exists or exit with error
3. detect platform: macOS uses `open`, Linux uses `xdg-open`, fallback prints URL
4. spawn browser open with a 1-second delay to allow server startup
5. start `python3 -m http.server $PORT` where PORT defaults to 8080
6. accept `$PORT` override via environment variable

### 23.3 No build step required
The script shall not invoke `npm`, `tsc`, or any build tool. The UI is serveable as static files.

### 23.4 Gate behavior
The script is not a CI gate artifact. It is a convenience launcher. CI gates remain npm-only.

---

## 24. Run Packet Output Surface Contract

### 24.1 Trigger
After `buildPacket()` completes and `_lastBundleFiles` is populated, the button `id="run-packet-btn"` becomes visible alongside the download button in the Tab 7 button row.

### 24.2 Implementation
Clicking "Run Packet" invokes `openPacketOutput()`. This function:
- reads `_lastBundleFiles` from module scope
- parses `run-packet.json`, `scenario.json`, `compute-module-01.json`, `radiator-01.json` from the bundle
- computes preview physics values (same equations as `updateOutputTab`)
- builds a self-contained HTML string
- embeds the `_lastBundleFiles` array as a JSON literal in a script block within the HTML
- creates a Blob URL and opens it in a new tab

### 24.3 Required content sections
The output surface shall render: Packet Identity, Scenario Summary, Compute Payload, Radiator Configuration, Branches, Research Required Items, Bundle Manifest, Transform Trace, and a Download Bundle button.

### 24.4 Non-authoritative declaration
Every numeric value shall carry a visible `(preview)` label. A banner at the top shall read:
"All numeric values are browser-side previews only. Authoritative outputs require server-side runtime execution per governing spec §4.1 and §14."

### 24.5 Bundle download within output surface
The embedded script block in the output HTML shall define `dlBundle()` using the embedded `_ef` array, using JSZip CDN if available, falling back to `run-packet.json` download.

### 24.6 Required HTML element
`index.html` shall include `<button class="btn btn-secondary" id="run-packet-btn" style="display:none;">&#9654; Run Packet</button>` in the Tab 7 button row, after `download-packet-btn`.
