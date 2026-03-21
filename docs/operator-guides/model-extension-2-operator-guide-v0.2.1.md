# Model Extension 2 Operator Guide v0.2.1

## 1. Document Control

- Document Type: Operator Guide
- Project: space-server-heat-dissipation
- Version: v0.2.1
- Status: Canonical operator reference
- Owner: James
- Governing Spec: `docs/engineering-specs/orbital-thermal-trade-system-model-extension-2-engineering-spec-v0.2.1.md`
- Governing Blueprint: `docs/blueprints/orbital-thermal-trade-system-model-extension-2-blueprint-v0.2.1.md`

---

## 2. Purpose

This guide documents every new dropdown, numeric field, and behavior introduced by Model Extension 2. It explains the meaning of baseline versus exploratory mode, how coefficients affect outputs, and why exploratory values are not flight claims.

All Extension 2 outputs carry the label `EXPLORATORY_ONLY — Not proven hardware performance`. This is a hard non-negotiable rule from the governing spec (§3.4).

---

## 3. Operator Workflow Overview

Per blueprint §14, the intended workflow is:

1. Build and validate a baseline scenario in Tabs 1–6.
2. Enable Extension 2 in Tab 1 using the Extension 2 section.
3. Choose or derive a source spectral profile in Tab 2.
4. Define spectral stage blocks in Tab 4 — select absorber, cavity, mediator, and emitter families and set bounded coefficients.
5. Review research-confidence warnings and validate stage inputs.
6. Generate baseline and exploratory outputs in Tab 7.
7. Inspect the delta table and uncertainty labels together.
8. Never use exploratory outputs as baseline deterministic outputs.

---

## 4. Tab 1 — Scenario Extension 2 Fields

### 4.1 Enable Extension 2 (enable_model_extension_2)

Controls whether Extension 2 fields are serialised and computed.

- `false` (default): All Extension 2 fields are absent, null, empty, or ignored.
- `true`: Extension 2 fields are shown and serialised. Computation depends on `model_extension_2_mode`.

### 4.2 Extension 2 Mode (model_extension_2_mode)

Governs which result sections are emitted by the runtime.

| Value | Meaning |
|-------|---------|
| `disabled` | Fields serialised. No exploratory computation performed. |
| `baseline_only` | Exploratory fields serialised but must not affect baseline numeric outputs. |
| `exploratory_compare` | Baseline result, exploratory result, and delta result are all emitted. |
| `exploratory_only` | Only exploratory result emitted. Baseline is preserved but delta not emitted. |

**Operator note:** For most trade studies, use `exploratory_compare`. This preserves the baseline path unchanged while computing the exploratory parallel path.

### 4.3 Exploratory Result Policy (exploratory_result_policy)

Controls how exploratory results appear in the output bundle.

| Value | Meaning |
|-------|---------|
| `do_not_mix` (default) | Baseline and exploratory are kept strictly separate in output. |
| `emit_delta_only` | Only the delta (difference) is emitted, not the full exploratory result. |
| `emit_parallel_result` | Both baseline and exploratory results appear side by side. |

### 4.4 Research Packet Intent (research_packet_intent)

Declares the purpose of this packet. Used for audit and downstream routing.

| Value | Meaning |
|-------|---------|
| `engineering_trade` (default) | Standard trade study. |
| `research_screen` | Early-stage screening of exploratory candidates. |
| `bench_candidate` | Candidate being evaluated for bench test. |
| `custom` | Operator-defined intent. |

### 4.5 Strict Research Enforcement (strict_research_enforcement)

When `true`, any stage with `research_required = true` will surface as a validation warning and will be listed in `research_required_items[]` in the packet.

**Recommended:** Keep `true`. This ensures all research-required items are visible in every packet.

---

## 5. Tab 2 — Source Spectral Profile

### 5.1 Source Spectral Profile Dropdown (source_spectral_profile_ref)

Selects a catalog entry characterising the thermal emission band of the compute payload. This ref is inherited by default when adding new spectral stage blocks.

If no catalog profile is selected, a derived-profile disclosure badge appears. Per spec §6.5, if the runtime derives a profile, the packet must include: basis temperature, helper wavelength result, derived profile id, provenance class, and research-required state.

### 5.2 Profile Helper Card

When a catalog profile is selected, a card appears showing:

- Label and profile class
- Nominal source temperature
- Declared wavelength band (min, peak, max in µm)
- Emissivity basis
- Maturity class and research-required flag
- Source note

### 5.3 Wien λ-peak Helper (display-only)

The Wien helper computes: `λ_peak_um = 2897.771955 / T_source_k`

This is a display aid only. Per spec §6.4, this helper does not drive any numeric outputs unless a derived profile is explicitly serialised. It is shown for operator reference to compare declared peak wavelength against the Wien prediction.

---

## 6. Tab 4 — Spectral Stage Blocks

### 6.1 Adding, Removing, Duplicating, Reordering Stages

- **Add Stage Block:** Creates a new stage with default placeholder values. All coefficients default to conservative estimates. All stages default to `research_required = true`.
- **Remove:** Deletes the stage from the list.
- **Dup:** Duplicates a stage for quick variant creation.
- **↑ / ↓:** Reorders stages. Order does not affect computation per spec §13 (stages are independent).

### 6.2 Zone References

| Field | Meaning |
|-------|---------|
| `source_zone_ref` | ID of the thermal zone supplying heat to this stage. Must match a declared zone in the scenario. |
| `target_zone_ref` | ID of the thermal zone receiving useful transfer from this stage. |

### 6.3 Family Dropdowns

Each stage requires selection of four catalog families. These are mandatory for exploratory computation.

| Dropdown | Catalog | Meaning |
|----------|---------|---------|
| Source Spectral Profile | `source-spectral-profiles` | Emission band of the heat source |
| Absorber Family | `absorber-families` | Material or structure capturing the source radiation |
| Emitter Family | `emitter-families` | Surface emitting recovered energy onward |
| Cavity Geometry | `cavity-geometries` | Physical geometry coupling absorber to emitter |
| Mediator Family | `mediator-families` | Thermal mediator transferring energy between absorber and emitter |

### 6.4 Stage Mode (stage_mode)

| Value | Meaning |
|-------|---------|
| `passive_capture` | Passive spectral capture only, no active pumping. |
| `capture_to_regen_store` | Capture with transfer into a regenerative hot-island storage. |
| `capture_to_active_hot_island` | Capture into an active hot-island with external heat input. |
| `capture_plus_solar_polish` | Capture combined with solar thermal polishing. Requires source characterisation. |
| `custom` | Operator-defined mode. |

### 6.5 Coefficient Inputs — Effect on Outputs

All coefficient inputs are bounded to [0, 1] or [0, ∞) as declared per spec §11.4. These fields are **output-driving** per spec §11.6.

| Field | Bounds | Effect |
|-------|--------|--------|
| `capture_efficiency_fraction` | [0, 1] | Fraction of source zone heat available for capture. Higher = more heat available. |
| `band_match_score` | [0, 1] | Spectral overlap quality between source profile and absorber. Higher = more efficient conversion. |
| `geometry_coupling_score` | [0, 1] | Geometric view factor and coupling quality. Higher = less geometric loss. |
| `mediator_transfer_score` | [0, 1] | Mediator heat transfer effectiveness. Higher = better delivery to target zone. |
| `regeneration_effectiveness` | [0, 1] | Fraction of residual heat recovered via regeneration. |
| `thermal_loss_fraction` | [0, 1) | Fraction of available heat lost as waste. Lower = less loss. Must be < 1. |
| `work_input_w` | ≥ 0 W | External work consumed by the stage (e.g. pumping). Increases residual reject. |
| `external_heat_input_w` | ≥ 0 W | External thermal input added to the stage (e.g. solar). Increases useful transfer. |
| `storage_drawdown_w` | ≥ 0 W | Power drawn from thermal storage to assist this stage. Increases useful transfer. |
| `source_capture_fraction_override` | [0, 1] | If > 0, overrides `capture_efficiency_fraction` for the source-available calculation. |

**How the exploratory efficiency is computed (spec §13.5):**

```
eta_stage_exploratory = capture_efficiency_fraction
                      × band_match_score
                      × geometry_coupling_score
                      × mediator_transfer_score
                      × regeneration_effectiveness
                      × (1 - thermal_loss_fraction)
```

**Useful transfer (spec §13.7):**

```
Q_dot_stage_useful = Q_dot_source_available × eta_stage_exploratory
                   + external_heat_input_w + storage_drawdown_w - work_input_w
```

### 6.6 Provenance, Maturity, Confidence Selectors

These fields are **metadata-only** per spec §11.6 — they do not change numeric outputs but affect warnings and strict enforcement.

| Field | Options | Meaning |
|-------|---------|---------|
| `provenance_class` | measured, literature_derived, analog_estimated, placeholder, hypothesis_only | How the coefficient value was obtained |
| `maturity_class` | concept_only, bench_evidence, modeled_only, heritage_analog, qualified_estimate, custom | Technology readiness of the stage |
| `confidence_class` | low, medium, high, unknown | Operator's confidence in the declared values |

**Operator guidance:** Set `provenance_class = placeholder` and `confidence_class = low` whenever values are estimated without supporting data. Never assign `measured` unless actual test data backs the value.

### 6.7 Stage Validity Card

The stage validity card shows real-time status:

- ✓ Green: All required fields are set and bounds are met.
- ⚠ Yellow: Non-blocking issues (e.g. `research_required` flagged).
- ✗ Red: Blocking issues — stage cannot drive exploratory computation until resolved.

---

## 7. Tab 5 — Extension 2 Radiator and Storage

### 7.1 Emitter Family Dropdown (ext2_emitter_family_ref)

Selects the emitter family for the exploratory radiator surface. This is separate from the baseline radiator material family. When selected, a card shows emissivity target, temperature range, and maturity.

### 7.2 Hot-Island Storage Card

| Field | Meaning |
|-------|---------|
| `ext2_hot_island_storage_class` | Storage medium class for the exploratory hot-island buffer (eutectic_metal, pcm_latent, sensible_solid, custom). |
| `ext2_mediator_temp_band_low_k` | Lower bound of mediator operating temperature band in K. |
| `ext2_mediator_temp_band_high_k` | Upper bound of mediator operating temperature band in K. |

### 7.3 Baseline vs Exploratory Radiator Summary

A live display card computes a preview comparison of baseline vs exploratory radiator area using the same Stefan-Boltzmann formula applied to the modified reject load. This is **display-only** and non-authoritative.

---

## 8. Tab 7 — Extension 2 Output Section

### 8.1 Baseline Summary

Shows baseline reject power and radiator area. These values derive from Tab 1–5 inputs, not from Extension 2 coefficients.

### 8.2 Exploratory Summary

Shows exploratory reject power and radiator area after applying all enabled stage transfers. Labelled `EXPLORATORY_ONLY` per spec §3.4.

### 8.3 Delta Table

Shows the difference between exploratory and baseline for:

- Q reject (W): Negative = exploratory rejects less heat (improvement).
- A radiator (m²): Negative = exploratory requires smaller radiator (improvement).

**Green values** indicate exploratory improvement. **Red values** indicate exploratory degradation. All values carry no engineering authority.

### 8.4 Stage Manifest Summary

Lists each enabled stage with its ID, computed η (eta), and Q_useful preview.

### 8.5 Research Confidence Summary

Aggregates `confidence_class` and `provenance_class` across all stage blocks. Displays count of `research_required` stages. Operator must resolve all research-required items before any flight commitment to exploratory values.

### 8.6 Extension 2 Blocking Validation

Lists any blocking issues from stage inputs that would prevent the runtime from executing exploratory computation. All blocking issues must be resolved before a packet is considered complete for exploratory execution.

---

## 9. Non-Authoritative Declaration

All Extension 2 outputs in this UI are display-only browser-side previews. Authoritative exploratory results require server-side runtime execution per spec §4.1 and §14. No browser-side numeric value produced by Extension 2 shall be used as a basis for engineering commitment, procurement, or flight design decisions.
