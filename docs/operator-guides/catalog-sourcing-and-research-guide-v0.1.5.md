# Catalog Sourcing and Research Guide

Version: v0.1.5
Status: canonical research guide
Project: space-server-heat-dissipation

## 1. Purpose

This guide explains how catalog entries in the orbital thermal trade system are sourced,
labelled with maturity classes, refreshed over time, and prevented from silently acquiring
engineering authority they do not possess.

## 2. Catalog Authority Statement

Catalog entries are data inputs, not authoritative engineering outputs.

A catalog entry that says a device has a nominal TDP of 700 W does not constitute an
authoritative engineering claim about that device in a space environment.
The catalog entry is a prefill convenience with a declared basis and maturity class.

All catalog entries must be inspectable and serialisable into exported payloads.
Operators must be able to see what defaults were applied and override them.

## 3. Maturity Class Definitions

Every catalog entry that carries performance or thermal values is assigned a maturity class.

| Maturity Class | Meaning |
|---|---|
| `experimental` | Early-stage research result; values are unvalidated estimates. Use requires explicit research-required flag. |
| `prototype` | Demonstrated at lab/prototype scale; not qualified for system-level use without further testing. |
| `qualified_estimate` | Values derived from qualified analogues, published literature, or engineering models with reasonable confidence. Specific system qualification not confirmed. |
| `flight_proven_analog` | Values derived from flight-proven analogues in similar environments. Not the exact part or configuration. Extrapolation risk present. |
| `flight_proven` | Values from a qualified, flight-proven part or system in a relevant environment. Highest confidence. |

When in doubt, assign the lower (more conservative) maturity class.

## 4. Sourcing Rules

### 4.1 Compute device presets

Device TDP, power-state, and thermal limit values shall be sourced from:

- Manufacturer datasheets (preferred primary source)
- Published benchmarks with methodology disclosed
- Peer-reviewed characterisation studies

Values shall not be invented or extrapolated beyond the disclosed basis without
assigning `maturity_class: experimental` and `research_required: true`.

### 4.2 Material family entries

Material thermal properties shall be sourced from:

- Published materials databases (NIST, ASM, manufacturer)
- Peer-reviewed thermal characterisation papers
- Qualification reports from analogous space programs (where declassified/public)

Emissivity values are surface-condition and temperature dependent.
All emissivity entries are representative values; the `notes` field must state this.

### 4.3 Branch preset entries

Efficiency and COP values for conversion branches shall be sourced from:

- Published system demonstrations with stated operating conditions
- Theoretical Carnot bounds (as upper limits, not expected performance)
- Peer-reviewed modelling studies with stated assumptions

Values exceeding the Carnot bound for the stated temperature pair are prohibited.

### 4.4 Scenario and payload archetype entries

Scenario preset values are representative baseline configurations for trade studies.
They are not mission-specific designs. Every scenario preset carries `research_required: true`
for any field that has not been confirmed for a specific mission context.

## 5. Research-Required Flag Protocol

An entry with `research_required: true` means:

1. The value is a placeholder, estimate, or analogue-derived assumption.
2. No engineering decision that depends on this value is authorised until the value is
   confirmed by a qualified source for the specific application.
3. The item will appear in `research_required_items` in exported packets.

The research-required flag is not a disclaimer that removes the entry from use.
It is a trackable obligation that follows the entry through the packet and into runtime output.

## 6. Catalog Refresh Protocol

Catalog files are versioned: `catalog-name.v0.1.0.json`.

When a catalog entry is updated:

1. A new catalog version is released: `catalog-name.v0.1.1.json`.
2. The old catalog file is retained for reproducibility of prior packets.
3. The catalog schema is updated only if required by a schema change; otherwise only the data file changes.
4. The `catalog_version` field inside the JSON file is updated.
5. Packets that reference the old catalog version remain reproducible against it.

The UI always loads the specific versioned catalog files declared in `catalog-loader.js`.
To adopt a new catalog version, update the path in `catalog-loader.js` and increment the `catalog_version`.

## 7. Preventing Silent Authority

Catalog entries must not acquire silent authority through the following mechanisms:

**Prohibited:**

- Using catalog default values without surfacing them to the operator (violation of spec §4.5)
- Hiding a `research_required: true` flag in a preset that the operator cannot inspect
- Asserting that a catalog entry is flight-qualified without a cited qualified source
- Silently upgrading a `maturity_class` without an explicit sourcing decision

**Required:**

- All catalog defaults applied to a packet must be disclosed in `transform_trace`
- All catalog versions used must appear in `catalog_versions_used` in the exported packet
- All `research_required: true` entries must appear in `research_required_items` in the exported packet
- Maturity class must be visible in the UI for every preset that carries it

## 8. Adding a New Catalog Entry

To add a new entry to an existing catalog:

1. Identify the source for every numeric field.
2. Assign the correct maturity class per section 3.
3. Write a `performance_basis_note` and `thermal_basis_note` (for device entries) or `notes`
   (for other catalog types) that states the source and any caveats.
4. Set `research_required: true` unless all values are qualified for the specific application context.
5. Add the entry to the catalog data file.
6. Run `npm run lint:schemas` to verify the entry validates against the catalog schema.
7. Update the catalog version if the entry is a breaking change or significant addition.

## 9. Contested or Unavailable Values

If a value required by the catalog schema is genuinely unknown or contested:

- Use a conservative placeholder (e.g., 0 for power, 0 for efficiency)
- Set `research_required: true`
- Explain in the `notes` field what is unknown and what sourcing action is required
- Do not invent a plausible-sounding number to fill the field

The goal is a catalog that is honest about what it knows and what it does not know.
An acknowledged gap is better than a silent false precision.
