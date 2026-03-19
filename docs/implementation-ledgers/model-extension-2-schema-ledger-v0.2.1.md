# Model Extension 2 Schema Ledger v0.2.1

## Required schema additions

### scenario
Add:
- `enable_model_extension_2: boolean`
- `model_extension_2_mode: enum`
- `source_spectral_profile_ref: string|null`
- `spectral_stage_refs: string[]`
- `exploratory_result_policy: enum`
- `research_packet_intent: enum`
- `strict_research_enforcement: boolean`

### run-packet
Add:
- `derived_source_profiles[]`
- `extension_2_catalog_ids_used[]`
- `extension_2_catalog_versions_used{}`
- `extension_2_catalog_checksums_sha256{}`
- `exploratory_coefficients_summary`
- `baseline_result`
- `exploratory_result`
- `delta_result`
- `extension_2_stage_results[]`

### thermal-zone or extension object
Support refs to:
- `spectral_stage_refs[]`

### spectral-stage.schema.json
Create explicit object with all required fields from the engineering spec.

### catalog schemas
Create explicit schemas for:
- source spectral profiles
- absorber families
- emitter families
- cavity geometries
- mediator families

## Enum families

### provenance_class
- measured
- literature_derived
- analog_estimated
- placeholder
- hypothesis_only

### maturity_class
- concept_only
- bench_evidence
- modeled_only
- heritage_analog
- qualified_estimate
- custom

### confidence_class
- low
- medium
- high
- unknown

### output_effect_class
- output_driving
- metadata_only
- warning_only
