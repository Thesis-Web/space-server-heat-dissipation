# Model Extension 2 Research Guide v0.2.1

## 1. Document Control

- Document Type: Research Guide
- Project: space-server-heat-dissipation
- Version: v0.2.1
- Status: Canonical research sourcing reference
- Owner: James
- Governing Spec: `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md`
- Governing Blueprint: `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`

---

## 2. Purpose

This guide documents how to source catalog entries, assign confidence and provenance classes, use placeholder values correctly, and promote a field from hypothesis to a higher-confidence class. It governs the research workflow for all Extension 2 catalog families.

---

## 3. Catalog Sourcing Method

### 3.1 Authoritative Source Priority

Source data for catalog entries shall be obtained in the following priority order:

1. **Measured laboratory or spaceflight data** — primary instruments, calibrated test rigs, or verified heritage missions. Required for `provenance_class = measured`.
2. **Peer-reviewed literature** — journals with documented uncertainty bounds. Required for `provenance_class = literature_derived`.
3. **Analog estimation from a comparable system** — documented analog system with declared differences. Required for `provenance_class = analog_estimated`.
4. **Computational model output with documented assumptions** — simulation or analytical model with explicit assumption set. May justify `provenance_class = literature_derived` if published, otherwise `analog_estimated`.
5. **Expert engineering estimate** — a documented engineering judgment with named author and stated basis. Assign `provenance_class = placeholder` and `confidence_class = low` or `medium` depending on specificity.
6. **Placeholder or hypothesis** — a value chosen to make the model runnable with no specific evidence. Must use `provenance_class = placeholder` or `hypothesis_only` and `confidence_class = low` or `unknown`.

### 3.2 Documentation Requirements per Entry

Every catalog entry populated from research shall include in its `source_note` field:

- The source type (measurement, paper, vendor datasheet, estimate, etc.)
- The basis temperature or wavelength range from which the value was derived
- Any declared uncertainty or range
- Whether the value is expected to be stable under GEO radiation environment

If the source is published literature, include enough information to retrieve the source (author, title fragment, year, or DOI if known).

### 3.3 Source Spectral Profile Sourcing

Each source spectral profile entry requires a thermal emission band characterisation. To populate:

1. Identify the operating temperature of the source (e.g. GPU die junction temperature, hot-island target temperature).
2. Compute or look up the approximate Wien peak: `λ_peak = 2897.771955 / T_K` µm.
3. Assign a wavelength band (min, peak, max) with declared basis.
4. Record the emissivity basis from vendor data, material handbooks, or measurement.
5. Assign provenance and confidence per §3.1.

### 3.4 Absorber Family Sourcing

Each absorber family entry characterises a material or structure that captures radiation from a source. Key parameters requiring sourcing:

- `absorptivity_target`: Spectral or integrated absorptivity. Look up in material property databases (e.g. NIST, published emissivity/absorptivity tables, vendor coating data).
- `operating_temp_range_min_k` / `max_k`: Material stability bounds. Cross-reference with published phase diagrams, oxidation thresholds, or creep data.
- `compatibility_notes`: Material interaction with working fluid, enclosure material, and GEO radiation environment.

### 3.5 Emitter Family Sourcing

Each emitter family entry characterises a surface that emits captured or transferred energy. Key parameters:

- `emissivity_target`: Spectral or total hemispherical emissivity. Material property databases, coatings data, or measurement.
- `emission_temp_range_min_k` / `max_k`: Must be compatible with declared radiator target temperature.
- Coating stability in GEO (UV, particle radiation, micrometeoroid effects on emissivity).

### 3.6 Cavity Geometry Sourcing

Each cavity geometry entry characterises the physical coupling structure. Key parameters:

- `view_factor_estimate`: Geometric view factor from absorber to emitter within the cavity. Compute from geometry (e.g. Hottel crossed-string or Monte Carlo for complex geometries) or cite published view factor charts.
- `cavity_type`: closed_cavity, open_cavity, channel, custom. Declare which applies.
- `aspect_ratio_nominal`: Length/diameter or equivalent ratio characterising the cavity.

### 3.7 Mediator Family Sourcing

Each mediator family entry characterises the thermal mediator transporting heat between absorber and emitter. Key parameters:

- `operating_temp_range_min_k` / `max_k`: Must bracket the expected operating temperature of the stage.
- `thermal_conductivity_w_per_m_k` or `heat_transfer_coefficient_w_per_m2_k`: From material handbooks, fluid property databases, or vendor data.
- `mediator_class`: eutectic_metal, working_fluid, solid_conductor, composite, custom.
- Long-duration stability in the declared temperature band (radiation effects, chemical stability, containment material compatibility).

---

## 4. Confidence Assignment Method

### 4.1 Confidence Class Definitions

| Class | Assigned When |
|-------|--------------|
| `high` | Value is derived from direct measurement or well-validated published data with explicit uncertainty bounds. Uncertainty is small relative to the application. The measurement or publication conditions are representative of the target application environment. |
| `medium` | Value is derived from literature data or analog estimation from a comparable system. Declared uncertainty is moderate or bounds have not been explicitly quantified. Conditions differ from the target application in a documented and bounded way. |
| `low` | Value is an engineering estimate, analogy from a dissimilar system, or derived from a model with unvalidated assumptions. Operator cannot quantify the uncertainty. This is the default for new entries. |
| `unknown` | No basis for confidence assignment. Placeholder value with no supporting information. |

### 4.2 Assigning Confidence

When populating a catalog entry:

1. Assess the source quality per §3.1.
2. Assess whether the source conditions match the target application (temperature range, environment, geometry, radiation exposure).
3. Assign the most conservative class that honestly reflects the evidence.
4. Do not assign `high` confidence to values not backed by measurement or well-validated literature.
5. Document the basis in `source_note`.

### 4.3 Confidence and research_required

If any of the following apply, set `research_required = true`:

- `confidence_class = low` or `unknown`
- `provenance_class = placeholder` or `hypothesis_only`
- Value is outside the demonstrated operating envelope of any known analogous system
- GEO radiation, charging, or micrometeoroid effects on the parameter have not been assessed

`research_required = true` is the **default** for all new entries. It may only be set to `false` after explicit review and documented justification.

---

## 5. Allowed Placeholder Usage

### 5.1 When Placeholders Are Permitted

Placeholders are explicitly permitted for Extension 2 catalog entries at the `v0.2.1` level. This is not a defect — it reflects the early exploratory nature of the model layer.

A placeholder entry:

- Uses `provenance_class = placeholder` or `hypothesis_only`
- Uses `confidence_class = low` or `unknown`
- Sets `research_required = true`
- Has a `source_note` that states it is a placeholder and describes the intent (e.g. "placeholder for GEO hot-island mediator — no measured data; value chosen to make model runnable")

### 5.2 Placeholder Naming Convention

Placeholder entries in the catalog shall use labels that clearly indicate their status, e.g.:

- `[PLACEHOLDER] Eutectic Metal Mediator — 800–1200 K`
- `[ESTIMATE] MWCNT Absorber — Analog from terrestrial data`

### 5.3 Placeholders Do Not Make Outputs Authoritative

Use of a placeholder entry in a spectral stage does not cause the exploratory result to become an engineering commitment. All outputs remain `EXPLORATORY_ONLY` regardless of the provenance of individual entries.

---

## 6. Promoting a Field from Hypothesis to Higher Confidence

### 6.1 Promotion Criteria

A field may be promoted from `hypothesis_only` or `placeholder` to a higher provenance class only when:

| Target Class | Required Evidence |
|---|---|
| `analog_estimated` | A documented comparable system exists with declared differences from the target application. The differences are bounded. |
| `literature_derived` | A peer-reviewed or formally published source directly addresses the parameter for conditions representative of the target application. |
| `measured` | A calibrated measurement has been performed under conditions representative of the target application with documented uncertainty. |

### 6.2 Promotion Workflow

1. Identify the target field and current provenance class.
2. Gather the supporting evidence per the criteria in §6.1.
3. Document the evidence in the `source_note` field of the catalog entry, including source type, basis conditions, and declared uncertainty.
4. Update `provenance_class` to the promoted class.
5. Update `confidence_class` to match the evidence quality per §4.1.
6. If the evidence is sufficient, set `research_required = false` with a documented justification.
7. Update the catalog file version or add a `revision_note` field noting the promotion and date.
8. Notify the project owner (James) before committing a promoted entry as canonical.

### 6.3 What Promotion Does Not Do

Promoting a field's provenance class:

- Does not make Extension 2 outputs authoritative — that requires full runtime validation and spec-level sign-off.
- Does not remove the `EXPLORATORY_ONLY` label from the output layer.
- Does not eliminate the need for a formal engineering review before any flight application.

---

## 7. GEO Environment Considerations for Catalog Entries

All catalog entries for this project target a GEO orbital environment. The following effects shall be considered and documented in `source_note` when assigning provenance and confidence:

- **Proton and electron radiation fluence**: GEO sees high trapped particle flux. Polymer-based materials, coatings, and lubricants degrade. Ceramic and refractory materials are generally more stable.
- **Thermal cycling**: GEO eclipse seasons (twice per year, up to ~70 minutes per eclipse) cause thermal cycling. Joints, coatings, and phase-change materials are affected.
- **Electrostatic charging**: GEO spacecraft experience surface and deep dielectric charging. Conductive coatings and grounding paths are relevant for absorber and emitter surfaces.
- **Micrometeoroid and debris flux**: GEO flux is lower than LEO but non-zero. Surface degradation over mission life affects emissivity and absorptivity.
- **No atomic oxygen**: Unlike LEO, GEO has negligible AO flux. Aluminium, silver, and other AO-sensitive materials are not degraded by this mechanism.

If a catalog entry's source data was derived from LEO conditions or terrestrial conditions, this must be declared in `source_note` and `research_required` must be set to `true` until GEO-representative data is obtained.

---

## 8. Catalog File Versioning

All catalog JSON files in `ui/app/catalogs/` are versioned using the filename convention:

```
<catalog-name>.v<MAJOR>.<MINOR>.<PATCH>.json
```

- Increment PATCH for corrections and non-breaking additions.
- Increment MINOR for new entries that do not change existing entry semantics.
- Increment MAJOR only for incompatible changes to the entry schema.

When a catalog file is updated, the `catalog_version` field in the file header must also be updated to match the filename version.

---

## 9. Research-Required Resolution Tracking

All entries with `research_required = true` shall be tracked in the project's research queue. The packet `research_required_items[]` field is the machine-readable tracking surface. Human-readable tracking shall be maintained separately by the project owner.

A `research_required` item is considered resolved when:

1. Evidence meeting the criteria in §6.1 has been obtained.
2. The catalog entry has been updated and promoted per §6.2.
3. The project owner has reviewed and approved the update.
4. The updated catalog has been committed to the repo with a documented commit message.
