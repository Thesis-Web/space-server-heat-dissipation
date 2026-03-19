# Orbital Thermal Trade System UI Expansion Blueprint

Version: v0.1.5  
Status: canonical controlled-expansion blueprint patch  
Date: 2026-03-19  
Owner: James  
Project: space-server-heat-dissipation

## 1. Purpose

This blueprint defines the next controlled productization step for the orbital thermal trade system browser packet-builder.

This document is a **supplemental blueprint patch**. It does not replace the canonical human blueprint or the canonical human engineering specification. It extends them so the browser UI can evolve from a valid skeleton into an operator-grade configuration surface while preserving the repo’s existing deterministic runtime and schema family.

This patch exists to ensure the UI expansion fits the current build line like a constrained extension, not like a second product.

## 2. Governing Relationship

This blueprint shall be interpreted together with:

- `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
- `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- `docs/engineering-specs/orbital-thermal-trade-system-ui-expansion-engineering-spec-v0.1.5.md`

Where this blueprint is less detailed than the engineering specification, the engineering specification governs implementation details.

Where this blueprint appears to encourage a broader product shape than the current repo can support deterministically, the current repo shape governs until the engineering specification explicitly patches the schema/runtime family.

## 3. Product Intent After This Patch

After this patch, the browser packet-builder shall remain a seven-tab operator workflow, but it shall become:

- catalog-driven where presets are appropriate
- additive where the underlying architecture is inherently plural
- explicit about uncertainty and maturity
- explicit about thermodynamic source terms
- explicit about packet contents and output bundle metadata
- materially more useful for controlled design-space exploration

The UI remains a **packet builder and structured input compiler**. It does not become an alternate solver.

## 4. Non-Negotiable Design Principles

### 4.1 Runtime numerical authority remains singular

The browser may derive previews, summaries, byte lengths, deterministic identifiers, and human-readable warnings, but all authoritative engineering outputs remain runtime-derived.

### 4.2 Compatibility-first expansion

The UI expansion shall extend the repo’s existing schema-ref architecture instead of introducing a second incompatible browser-only packet family.

The patch shall therefore prefer:

- additive refs over opaque inline blobs
- subtype / variant extensions over replacement enum families
- generated compatibility artifacts over ad hoc browser-only state
- packet metadata that discloses transforms rather than hiding them

### 4.3 Architecture honesty

No UI selection may imply free thermal uplift.

Any architecture implying temperature lift, high-grade service heat, hot-island charging, or thermal polishing shall expose at least one declared source term:

- work input
- external heat input
- storage discharge
- or explicit research-required status

### 4.4 Visible uncertainty

The UI shall visibly distinguish:

- flight-proven analog assumptions
- qualified estimates
- prototype / experimental assumptions
- unknowns requiring research

### 4.5 Editable defaults, not hidden defaults

Catalog entries may prefill fields, but defaults must remain inspectable and serializable into exported payloads or emitted assumptions.

## 5. Repo-Fit Objective

This patch is considered successful only if it fits the current repo line with **controlled additions**.

It shall fit the present package family that already includes:

- schema-first payloads
- runtime formulas and transforms
- a browser packet builder under `ui/app/`
- run-bundle assembly
- schema lint, typecheck, test, and build gates

This patch shall not require a destructive repo redesign to implement.

## 6. Required UI Information Architecture

The existing seven-tab structure remains canonical:

1. Scenario
2. Compute Payload
3. Non-Compute Payload
4. Thermal Architecture
5. Radiator & Storage
6. Optional Branches
7. Output & Packet

No eighth primary tab shall be introduced in this patch.

## 7. Required Tab-by-Tab Product Behavior

### 7.1 Tab 1 — Scenario

Tab 1 shall evolve from a mostly manual header form into a preset-aware scenario compiler.

Required additions:

- scenario preset dropdown
- scenario preset summary panel
- node-class-aware field defaults
- architecture-class dropdown plus custom option
- mission-mode dropdown with current canonical values
- deterministic scenario-id seed helper
- explicit preset / override visibility

Required initial preset set:

- `50kw_baseline`
- `100kw_baseline`
- `1mw_baseline`
- `custom_blank`

### 7.2 Tab 2 — Compute Payload

Tab 2 shall remain a single compute-module authoring surface in this patch, but with catalog-driven device selection.

Required additions:

- compute device family dropdown
- compute device preset dropdown
- package thermal limits display
- pickup geometry selector
- explicit module overhead breakout visibility
- maturity / thermal-basis note panel
- operator override visibility

The patch shall not require multi-module scenario authoring in this version.

### 7.3 Tab 3 — Non-Compute Payload

Tab 3 shall change from a single aggregate non-compute payload entry into an additive block editor.

Required behavior:

- add payload block
- remove payload block
- duplicate payload block
- reorder payload blocks
- show aggregate non-compute total
- show generated compatibility payload id
- expose whether the export is additive-ref mode or generated aggregate mode

This patch intentionally treats non-compute loads as plural at the UI level while preserving compatibility with the current single `comms-load` runtime entry.

### 7.4 Tab 4 — Thermal Architecture

Tab 4 shall expand the architecture model while preserving the current canonical thermal-zone type family.

Required additions:

- zone subtype selector
- pickup geometry selector when relevant
- two-hot-island topology selector
- exchange-hub presence toggle
- solar thermal polishing source toggle
- source/sink routing visibility
- zone-role summary panel

### 7.5 Tab 5 — Radiator & Storage

Tab 5 shall support material-aware radiator/storage selection while preserving the current radiator and storage schemas as the canonical execution family.

Required additions:

- radiator material family dropdown
- material basis note visibility
- areal-density basis visibility
- storage preset selector
- storage class selector
- hot-island storage role selector
- emitted assumptions visibility

### 7.6 Tab 6 — Optional Branches

Tab 6 shall become a repeatable branch block editor.

Required behavior:

- add branch
- remove branch
- duplicate branch
- reorder branch blocks
- branch preset selector
- source / sink / input-stage selection
- explicit work input visibility
- explicit external heat visibility
- explicit storage drawdown visibility
- Carnot-bound preview notes
- branch mode honesty warnings

### 7.7 Tab 7 — Output & Packet

Tab 7 shall evolve from a basic packet preview into a deterministic bundle preview surface.

Required additions:

- selected preset summary
- additive payload summary
- branch summary
- risk summary
- validation summary
- bundle file manifest preview
- catalog ids / versions used
- transform disclosures
- branding / confidentiality metadata
- runtime authority declaration

## 8. Required Catalog Families

The UI shall become catalog-driven through versioned JSON assets under:

- `ui/app/catalogs/`

Required catalog files for this patch:

- `ui/app/catalogs/scenario-presets.v0.1.0.json`
- `ui/app/catalogs/compute-device-presets.v0.1.0.json`
- `ui/app/catalogs/payload-archetypes.v0.1.0.json`
- `ui/app/catalogs/material-families.v0.1.0.json`
- `ui/app/catalogs/branch-presets.v0.1.0.json`
- `ui/app/catalogs/branding.v0.1.0.json`

If implementation requires schema validation for catalogs, the repo may add catalog schema files under `schemas/catalogs/`, but catalog logic itself shall remain data-only.

## 9. Required Product Concepts Added by This Patch

### 9.1 Scenario presets

Scenario presets shall seed coherent initial operator states without hiding underlying assumptions.

### 9.2 Device-family presets

Compute-device presets shall expose high-confidence baseline entries and clearly mark speculative entries.

### 9.3 Additive non-compute payloads

The operator shall be able to model zero, one, or many non-compute payload blocks.

### 9.4 Expanded zone meanings

The product shall support richer thermal architecture semantics through **subtypes**, not by replacing the canonical zone-type family.

### 9.5 Expanded branch meanings

The product shall support richer branch variants through **variant metadata**, not by replacing the canonical branch-type family.

### 9.6 Material family selection

The product shall let the operator choose and inspect material families used by radiator and exchange/storage concepts.

### 9.7 Reliability and maturity framing

The UI shall surface structured lifecycle and maturity framing without pretending to be a full qualification tool.

### 9.8 Branding / confidentiality metadata

The output packet shall support client-facing packet/report metadata without altering engineering logic.

## 10. Required Zone Model Expansion

The canonical thermal-zone type family remains:

- `compute_vault`
- `hx_boundary`
- `high_temp_backbone`
- `radiator_emitter`
- `custom`

The UI expansion shall add richer meanings through subtype support including at minimum:

- `controlled_compute_vault`
- `chipset_pickup_stage1`
- `low_gradient_loop`
- `eutectic_exchange_hub`
- `regen_hot_island`
- `active_hot_island`
- `radiator_service_domain`
- `payload_emitter_zone`
- `branch_sink_zone`

## 11. Required Branch Model Expansion

The canonical branch-type family remains:

- `none`
- `reverse_brayton`
- `brayton_power_cycle`
- `stirling`
- `tpv`
- `teg`
- `rf_export`
- `laser_export`
- `custom`

Richer intent shall be expressed through preset metadata and variant fields such as:

- `base`
- `with_regen`
- `solar_polish`
- `custom`

The UI shall never imply that a variant changes the underlying thermodynamic law. A variant changes declared assumptions and required source terms.

## 12. Two-Hot-Island and Exchange-Hub Framing

The UI shall support exploratory architecture families involving:

- regen hot island
- active hot island
- eutectic / PCM exchange hub
- solar thermal polishing source

This support is representational and accounting-aware. It is not an endorsement that such architectures are already solved or flight-ready.

## 13. Required Output Framing

The output surface shall now show at minimum:

- what was selected
- what was generated for compatibility
- what remains authoritative only in runtime
- what is speculative or research-required
- what bundle artifacts are included

The output surface shall not collapse the packet into marketing prose.

## 14. Product Honesty on Math and Preview

The browser may show preview math where already allowed by the base product, including radiator preview sizing and branch plausibility notes, but preview math remains:

- display-only
- subordinate to runtime
- clearly labeled non-authoritative

All added UI fields shall ultimately affect exported scenario state or emitted assumptions so that changed operator inputs propagate to runtime output through declared variables.

## 15. Required Guides

This patch shall add:

- `docs/operator-guides/packet-builder-operator-guide-v0.1.5.md`
- `docs/research-guides/catalog-sourcing-and-research-guide-v0.1.5.md`

The operator guide shall explain the seven-tab workflow and packet-generation behavior.

The research guide shall explain how uncertain catalog entries are sourced, labeled, refreshed, and kept out of silent authority.

## 16. Acceptance Intent

This blueprint patch is product-acceptable only if the matching engineering specification defines an implementation path that:

- preserves current runtime authority
- preserves current schema family where possible
- maps additive UI state into current payload families deterministically
- discloses generated compatibility artifacts
- keeps the repo buildable and testable

## 17. Out of Scope

This blueprint patch does not:

- authorize browser-only solver logic
- certify final spacecraft architectures
- certify speculative device families as drop-in mainstream parts
- replace the existing runtime formula family
- require multi-module or multi-scenario orchestration in the browser UI
