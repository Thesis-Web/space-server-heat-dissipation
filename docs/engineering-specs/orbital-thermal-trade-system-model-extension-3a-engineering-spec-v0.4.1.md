# Orbital Thermal Trade System Model Extension 3A Engineering Spec v0.4.1

## 1. Document Control

- Document Type: Engineering Spec
- Project: space-server-heat-dissipation
- Version: v0.4.1
- Prior version: v0.3.0
- Status: Draft for owner approval
- Owner: James

### 1.1 Version delta from v0.3.0

- Y incremented (0.3 → 0.4): added resistance chain input field declarations in §6 (BLOCKER 1 resolved), added F(x) state vector and update rule in §11.4 (BLOCKER 2 resolved), added T_sink source declaration in §9 and §11 (BLOCKER 3 resolved), added backward compat rule for legacy packets in §5.3
- Z incremented (0.0 → 0.1): changed `runaway_multiplier` minimum from 1 to 2.0 (§5.4), fixed `effective_emissive_geometry` naming inconsistency in §11.9, corrected cut list version reference to v0.1.0

### 1.2 Governing relationship

- Supplements `docs/engineering-specs/orbital-thermal-trade-system-engineering-spec-v0.1.0.md`
- Supplements `docs/blueprints/orbital-thermal-trade-system-blueprint-v0.1.1.md`
- Must be implemented consistently with `orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1.md`
- Extension 2 spec/blueprint no longer holds canonical weight; repo state governs until 3A build begins, then this spec governs

### 1.3 Primary intake basis

- `/mnt/data/extension-3a-cut-list-v0.1.0.md`

---

## 2. Scope

This extension defines the deterministic schema, runtime, UI, packet, output, validation, default, and test contracts for foundational model hardening covering:

- loop topology and flow ordering,
- additive thermal-zone blocks compiled into canonical `thermal_zones[]`,
- convergence exchange zone support,
- cycle convergence and runaway detection,
- isolation bridge resistance,
- working-fluid catalog and schema,
- pickup-geometry catalog and schema,
- cavity-emissivity wiring,
- two-sided radiator geometry,
- mission-life emissivity degradation,
- junction-to-sink thermal resistance chain,
- flag-only radiation-pressure output,
- defaults audit gate.

This extension shall fit into existing canonical families:

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

All numeric outputs remain runtime-authoritative. The browser may preview helper values but may not produce authoritative numeric results.

### 3.2 Explicit serialization

No output-driving topology, resistance, geometry, or degradation field may be implied by UI state alone. Every such field must be present in the serialized packet.

### 3.3 Compatibility-first patching

Implementation shall extend existing families before inventing new top-level objects.

### 3.4 Baseline honesty

No 3A field may silently assume ideal cross-boundary transfer, ideal emissivity permanence, ideal one-sided geometry, or automatic convergence.

### 3.5 Metadata-only separation

Catalog fields declared metadata-only shall not influence numeric outputs.

### 3.6 Bounded radiation-pressure treatment

Radiation pressure may raise flags and emit summary metrics only. No propagation engine is added.

### 3.7 Declared input sources only

Every variable in every runtime equation must trace to a declared field in a declared schema family. No equation may reference an undeclared variable.

---

## 4. Required New and Updated Files

### 4.1 Schemas

- `schemas/thermal-zone.schema.json` (patch)
- `schemas/radiator.schema.json` (patch)
- `schemas/scenario.schema.json` (patch)
- `schemas/run-packet.schema.json` (patch)
- `schemas/working-fluid.schema.json` (new)
- `schemas/pickup-geometry.schema.json` (new)

### 4.2 Catalogs

- `ui/app/catalogs/working-fluids.v0.1.0.json`
- `ui/app/catalogs/pickup-geometries.v0.1.0.json`
- `ui/app/catalogs/defaults-audit-3a.v0.1.0.json` or equivalent generated audit artifact

### 4.3 Runtime

- `runtime/validators/topology.ts` or equivalent
- `runtime/validators/defaults.ts` or equivalent
- `runtime/formulas/resistance-chain.ts` or equivalent
- `runtime/formulas/radiator-3a.ts` or extension patch to existing radiation formulas
- `runtime/transforms/topology-normalizer.ts` or equivalent
- `runtime/emitters/topology-report.ts` or equivalent output patch

### 4.4 Docs and ledgers

- `docs/implementation-ledgers/model-extension-3a-schema-ledger-v0.4.1.md`
- `docs/implementation-ledgers/model-extension-3a-ui-ledger-v0.4.1.md`
- `docs/implementation-ledgers/model-extension-3a-runtime-ledger-v0.4.1.md`
- `docs/operator-guides/model-extension-3a-operator-guide-v0.4.1.md`

---

## 5. Scenario Contract Patch

### 5.1 Required scenario fields

The scenario family shall be extended to support:

- `enable_model_extension_3a` : boolean, default `false`
- `model_extension_3a_mode` : enum, default `disabled`
- `thermal_zones[]` : plural canonical zone array, default `[]`
- `topology_validation_policy` : enum, default `blocking`
- `convergence_control` : object, default as declared in §5.4
- `defaults_audit_version` : string or null, default `null`

### 5.2 Allowed values

`model_extension_3a_mode`:

- `disabled`
- `topology_only`
- `foundational_hardening`

`topology_validation_policy`:

- `blocking`
- `warn_only`

### 5.3 Required behavior

If `enable_model_extension_3a = false`, all 3A fields must be absent, null, empty, or ignored by normalization.

If `model_extension_3a_mode = topology_only`, topology validation and report emission shall run, but convergence iteration and 3A radiator overrides may remain inactive unless their required fields are fully declared.

If `model_extension_3a_mode = foundational_hardening`, all declared 3A fields must participate in validation and runtime.

**Legacy packet backward compatibility:** A scenario packet that does not declare `enable_model_extension_3a` at all shall be treated as if the field is `false`. The field is therefore optional in schema with a default of `false`. Normalization shall inject the default before validation. A legacy packet shall never fail validation solely because the 3A fields are absent.

### 5.4 Convergence control object

The canonical `convergence_control` object shall contain:

- `max_iterations` : integer, default `25`, min `1`, max `500`
- `tolerance_abs_w` : number, default `1.0`, min `0` exclusive
- `tolerance_rel_fraction` : number, default `0.001`, min `0` exclusive, max `1`
- `runaway_multiplier` : number, default `4.0`, min `2.0`
- `blocking_on_nonconvergence` : boolean, default `true`

**Note on `runaway_multiplier` minimum:** The minimum is `2.0`, not `1.0`. At a multiplier of 1.0, runaway would be declared the instant any state vector component exceeds its initial magnitude, which would block every scenario with non-trivial initial conditions. A minimum of 2.0 provides a meaningful stability window while still catching genuine runaway.

---

## 6. Thermal-Zone Contract Patch

### 6.1 Required thermal-zone fields

Each zone shall include the current canonical minimum fields plus the following 3A patch fields:

- `zone_role` : enum
- `flow_direction` : enum
- `isolation_boundary` : boolean, default `false`
- `upstream_zone_ref` : string or null, default `null`
- `downstream_zone_ref` : string or null, default `null`
- `bridge_resistance_k_per_w` : number or null, default `null`
- `working_fluid_ref` : string or null, default `null`
- `pickup_geometry_ref` : string or null, default `null`
- `convergence_enabled` : boolean, default `false`
- `resistance_chain` : object or null, default `null` — see §6.5

### 6.2 Allowed `zone_role` values

- `compute_vault`
- `hx_boundary`
- `high_temp_backbone`
- `radiator_emitter`
- `convergence_exchange`
- `custom`

### 6.3 Allowed `flow_direction` values

- `source`
- `sink`
- `bidirectional`
- `isolated`

### 6.4 Field rules

- `upstream_zone_ref != zone_id`
- `downstream_zone_ref != zone_id`
- if `isolation_boundary = true`, then `bridge_resistance_k_per_w` must be present and `> 0`
- if `pickup_geometry_ref != null`, then `zone_role` must be one of `compute_vault`, `hx_boundary`, `convergence_exchange`, `custom`
- if `working_fluid_ref != null`, it must resolve to a declared working-fluid catalog id
- if `zone_role = convergence_exchange`, then `convergence_enabled = true`
- if `resistance_chain != null`, all present numeric sub-fields must be `>= 0`

### 6.5 Resistance chain sub-object

The `resistance_chain` sub-object on each thermal zone declares the junction-to-sink resistance terms for that zone. All fields are optional (null = not declared for this zone). The runtime shall use declared terms and treat absent terms as zero unless a blocking validation rule requires them.

Fields:

- `r_junction_to_case_k_per_w` : number or null — thermal resistance from device junction to package case; typically sourced from compute-device spec or datasheet
- `r_case_to_spreader_k_per_w` : number or null — resistance from package case to heat spreader or thermal interface material; typically sourced from board/module assembly spec
- `r_spreader_to_pickup_nominal_k_per_w` : number or null — nominal resistance from spreader to pickup interface before geometry multiplier is applied; multiplied by `nominal_resistance_multiplier` from the selected pickup geometry catalog entry
- `r_pickup_to_loop_k_per_w` : number or null — resistance from pickup interface to the working fluid loop or transport medium
- `r_loop_to_sink_k_per_w` : number or null — resistance from loop exit to the final rejection sink (radiator wall or equivalent)

**R_bridge_adjustment:** When `isolation_boundary = true` on this zone, the bridge resistance `bridge_resistance_k_per_w` declared on this zone is added to the chain total as `R_bridge_adjustment`. When `isolation_boundary = false`, `R_bridge_adjustment = 0`. This term is derived, not a separate field.

**Provenance note:** Resistance term values must be sourced from compute-device specs, module assembly specs, pickup geometry catalog entries, or explicit operator declarations. Values that are operator-estimated must be visible in the defaults audit. Silent use of zero for missing terms is only permitted when the defaults audit records the zero and the operator has not declared a blocking validation requirement for that zone.

### 6.6 Canonical object example

```json
{
  "zone_id": "zone-hot-island-a",
  "zone_label": "Hot Island A",
  "zone_role": "convergence_exchange",
  "target_temp_k": 850,
  "temp_min_k": 780,
  "temp_max_k": 920,
  "flow_direction": "bidirectional",
  "isolation_boundary": true,
  "upstream_zone_ref": "zone-backbone-in",
  "downstream_zone_ref": "zone-radiator-out",
  "bridge_resistance_k_per_w": 0.015,
  "working_fluid_ref": "fluid-nak-v0",
  "pickup_geometry_ref": "geom-microchannel-v0",
  "convergence_enabled": true,
  "resistance_chain": {
    "r_junction_to_case_k_per_w": 0.005,
    "r_case_to_spreader_k_per_w": 0.003,
    "r_spreader_to_pickup_nominal_k_per_w": 0.008,
    "r_pickup_to_loop_k_per_w": 0.004,
    "r_loop_to_sink_k_per_w": 0.002
  }
}
```

---

## 7. Working-Fluid Catalog Contract

### 7.1 Required catalog fields

Each working-fluid entry shall include:

- `working_fluid_id`
- `label`
- `fluid_class`
- `phase_class`
- `temp_operating_min_k`
- `temp_operating_max_k`
- `cp_basis_j_per_kgk`
- `density_basis_kg_per_m3`
- `thermal_conductivity_w_per_mk`
- `viscosity_basis_pa_s`
- `gamma_ratio` : nullable for non-gases
- `latent_heat_basis_j_per_kg` : nullable for non-phase-change use
- `provenance_class`
- `confidence_class`
- `maturity_class`
- `research_required`
- `source_note`

### 7.2 Allowed `fluid_class` values

- `noble_gas`
- `molecular_gas`
- `liquid_metal`
- `phase_change_refrigerant`
- `water_family`
- `custom`

### 7.3 Allowed `phase_class` values

- `single_phase_gas`
- `single_phase_liquid`
- `two_phase_allowed`
- `custom`

### 7.4 Required starter entries

The starter catalog shall contain at minimum:

- helium-xenon mixture basis
- ammonia
- carbon dioxide
- water
- sodium
- NaK
- lithium

These entries are starter bounded entries, not endorsement of final flight use.

### 7.5 Intrinsic-only rule

The working-fluid catalog shall not contain:

- pump architecture identity,
- compressor architecture identity,
- branch ownership,
- loop naming,
- stage-type selection.

---

## 8. Pickup-Geometry Catalog Contract

### 8.1 Required catalog fields

Each pickup-geometry entry shall include:

- `pickup_geometry_id`
- `label`
- `geometry_class`
- `contact_mode`
- `nominal_contact_area_fraction`
- `nominal_spreading_factor`
- `nominal_resistance_multiplier`
- `manufacturability_class`
- `provenance_class`
- `confidence_class`
- `research_required`
- `source_note`

### 8.2 Allowed `geometry_class` values

- `direct_cold_plate`
- `dual_sided_package_pickup`
- `microchannel_plate`
- `vapor_chamber_interface`
- `heat_pipe_interface`
- `immersion_bath_pickup`
- `custom`

### 8.3 Numeric bounds

- `0 < nominal_contact_area_fraction <= 1`
- `nominal_spreading_factor >= 1`
- `nominal_resistance_multiplier > 0`

### 8.4 Output-driving law

`nominal_resistance_multiplier` is the only mandatory numeric field from this catalog that may directly affect the runtime resistance chain in 3A. It is applied as:

```
r_spreader_to_pickup_effective = r_spreader_to_pickup_nominal_k_per_w
                                 * nominal_resistance_multiplier
```

where `r_spreader_to_pickup_nominal_k_per_w` comes from the zone's `resistance_chain` sub-object.

---

## 9. Radiator Contract Patch

### 9.1 Required radiator fields

The radiator family shall be extended to support:

- `geometry_mode` : enum
- `face_a_area_m2` : number
- `face_b_area_m2` : number or `0`
- `face_a_view_factor` : number
- `face_b_view_factor` : number
- `surface_emissivity_bol` : number
- `surface_emissivity_eol_override` : number or null, default `null`
- `emissivity_degradation_fraction` : number or null, default `null`
- `cavity_emissivity_mode` : enum, default `disabled`
- `cavity_view_factor` : number or null, default `null`
- `cavity_surface_emissivity` : number or null, default `null`
- `background_sink_temp_k_override` : number or null, default `null`

### 9.2 Allowed values

`geometry_mode`:

- `single_sided`
- `double_sided_symmetric`
- `double_sided_asymmetric`

`cavity_emissivity_mode`:

- `disabled`
- `surface_only`
- `gray_cavity_approx`

### 9.3 Numeric bounds

- `0 < face_a_view_factor <= 1`
- `0 <= face_b_view_factor <= 1`
- `0 < surface_emissivity_bol <= 1`
- if `surface_emissivity_eol_override != null`, then `0 < surface_emissivity_eol_override <= 1`
- if `emissivity_degradation_fraction != null`, then `0 <= emissivity_degradation_fraction <= 1`
- if `cavity_emissivity_mode = gray_cavity_approx`, then `0 < cavity_view_factor <= 1` and `0 < cavity_surface_emissivity <= 1`
- if `background_sink_temp_k_override != null`, then `background_sink_temp_k_override > 0`

### 9.4 T_sink source declaration

Every radiator sizing equation requires a background sink temperature T_sink in Kelvin. The runtime shall resolve T_sink using the following priority order:

1. If `background_sink_temp_k_override` is present and non-null on the radiator object, use it.
2. Else, use the `sink_temperature_k` field from the scenario's declared environment profile.
3. If neither source is present, block execution with a missing-sink-temperature error.

The resolved T_sink shall appear in the runtime output and defaults audit as a declared or overridden value, never as a silent constant.

---

## 10. Packet Contract Patch

### 10.1 Required run-packet metadata additions

The run-packet shall support:

- `topology_report_policy`
- `defaults_audit_version`
- `catalog_versions.working_fluids`
- `catalog_versions.pickup_geometries`
- `generated_artifacts[]` entries for any topology report, defaults audit report, or convergence trace emitted

### 10.2 Generated artifact visibility

Any generated topology/convergence/defaults report must appear in packet metadata and file manifest.

---

## 11. Runtime Math

### 11.1 Directed topology graph

Define the declared zone graph as:

- vertices `V = { zone_id }`
- directed edges `E = { (upstream_zone_ref → zone_id) and (zone_id → downstream_zone_ref) }` for non-null refs

The graph is valid if:

1. all references resolve to declared zone_ids,
2. no self-edge exists,
3. the graph is acyclic.

Acyclic validation shall use Kahn topological sort or DFS cycle detection. If unresolved refs or cycles exist under `topology_validation_policy = blocking`, packet execution is blocked.

### 11.2 Isolation bridge resistance law

For a declared isolation boundary bridge:

```
Q_dot_bridge_w = (T_upstream_k - T_downstream_k) / R_bridge_k_per_w
```

where:

- `R_bridge_k_per_w = bridge_resistance_k_per_w` from the zone declaring the boundary
- positive value means heat transfers from upstream to downstream
- sign convention is enforced by declared upstream/downstream refs

If `isolation_boundary = true` and `bridge_resistance_k_per_w` is absent or zero, execution is blocked.

### 11.3 Resistance chain law

Input fields are all sourced from the thermal zone's `resistance_chain` sub-object (§6.5) and the pickup-geometry catalog (§8):

```
R_spreader_to_pickup_effective
    = resistance_chain.r_spreader_to_pickup_nominal_k_per_w
      * nominal_resistance_multiplier

R_bridge_adjustment
    = bridge_resistance_k_per_w    (if isolation_boundary = true)
    = 0                            (if isolation_boundary = false)

R_total_k_per_w
    = resistance_chain.r_junction_to_case_k_per_w
    + resistance_chain.r_case_to_spreader_k_per_w
    + R_spreader_to_pickup_effective
    + resistance_chain.r_pickup_to_loop_k_per_w
    + resistance_chain.r_loop_to_sink_k_per_w
    + R_bridge_adjustment
```

Null resistance chain terms are treated as zero. If the defaults audit requires non-zero presence for a term and it is null, validation blocks.

Heat flow through chain:

```
Q_dot_chain_w = (T_junction_k - T_sink_k) / R_total_k_per_w
```

Implied junction temperature at known load:

```
T_junction_k = T_sink_k + Q_dot_load_w * R_total_k_per_w
```

`T_sink_k` in the chain equations is resolved from the zone's downstream target temperature or the declared scenario sink temperature, consistent with §9.4.

### 11.4 Convergence iteration law

**State vector definition:**

Let the convergence-enabled subgraph contain zones `Z_c = { z | z.convergence_enabled = true }` and the edges between them `E_c = { (i, j) | i ∈ Z_c and j ∈ Z_c and i declares j as neighbor }`.

The state vector at iteration k is:

```
x^(k) = { Q_ij^(k) for each edge (i,j) in E_c }
```

where each `Q_ij^(k)` is the zone-boundary heat exchange value in watts flowing from zone i to zone j at iteration k.

**Initial state:**

```
Q_ij^(0) = (T_target_i - T_target_j) / R_bridge_ij
```

for each convergence-enabled edge (i,j), using declared target temperatures and declared bridge resistances.

**Update rule F:**

For each iteration k, compute x^(k+1) = F(x^(k)) as follows:

Step 1 — Resolve zone temperatures from current exchange flows:

For each zone i in Z_c:

```
Q_net_i^(k) = sum over j: Q_ji^(k) - sum over j: Q_ij^(k)
            + Q_internal_load_i

T_resolved_i^(k) = T_sink_k + (Q_dot_load_i - Q_net_i^(k)) * R_total_i
```

where `Q_dot_load_i` is the declared internal load for zone i, `R_total_i` is the total resistance chain for zone i from §11.3, and `T_sink_k` is the resolved background sink temperature.

Clamp `T_resolved_i^(k)` to declared `[temp_min_k, temp_max_k]` bounds before continuing. If clamped, emit a flag.

Step 2 — Recompute exchange flows from updated temperatures:

For each convergence-enabled edge (i,j):

```
Q_ij^(k+1) = (T_resolved_i^(k) - T_resolved_j^(k)) / R_bridge_ij
```

where `R_bridge_ij` is `bridge_resistance_k_per_w` from the zone declaring the boundary.

**Convergence criteria:**

Convergence is achieved when either:

```
max over (i,j): | Q_ij^(k+1) - Q_ij^(k) | <= tolerance_abs_w
```

or:

```
max over (i,j): | Q_ij^(k+1) - Q_ij^(k) | / max( |Q_ij^(k+1)|, 1.0 )
    <= tolerance_rel_fraction
```

for `k <= max_iterations`.

**Runaway detection:**

Runaway is declared when:

```
max over (i,j): | Q_ij^(k+1) | > runaway_multiplier * max( max over (i,j): |Q_ij^(0)|, 1.0 )
```

or when any value becomes NaN, Infinity, or violates declared physical bounds.

If convergence fails and `blocking_on_nonconvergence = true`, execution is blocked.

### 11.5 Surface-only emissivity law

If `cavity_emissivity_mode = surface_only`:

```
epsilon_effective = surface_emissivity_bol    (for BOL calculations)
epsilon_effective = epsilon_eol               (for EOL calculations, resolved per §11.7)
```

### 11.6 Gray cavity approximation

If `cavity_emissivity_mode = gray_cavity_approx`, the effective emissivity shall be:

```
epsilon_cavity_effective = 1 / ( (1 / epsilon_surface) + ((1 - F_cavity) / F_cavity) )
```

where:

- `epsilon_surface = cavity_surface_emissivity`
- `F_cavity = cavity_view_factor`

Clamp result into `(0, 1]`.

Physical basis: this is the two-surface gray-body enclosure exchange factor approximation for a cavity where one surface is the emitting panel and the other is the effective environment. Reference: Incropera & DeWitt, Fundamentals of Heat and Mass Transfer, radiation exchange in enclosures chapter. This approximation is bounded and suitable for 3A foundational wiring. It is not a full enclosure solver.

### 11.7 Mission-life emissivity degradation

If `surface_emissivity_eol_override` is present and non-null:

```
epsilon_eol = surface_emissivity_eol_override
```

Else:

```
epsilon_eol = surface_emissivity_bol * (1 - emissivity_degradation_fraction)
```

with clamp into `(0, 1]`. If `emissivity_degradation_fraction` is null in the else path, `epsilon_eol = epsilon_bol`.

BOL emissivity:

```
epsilon_bol = surface_emissivity_bol
```

If `cavity_emissivity_mode` is not `disabled`, both epsilon_bol and epsilon_eol are passed through the cavity effective emissivity calculation in §11.6 before use in sizing equations.

### 11.8 Two-sided radiator heat rejection

For each face:

```
Q_dot_face_i = epsilon_effective_i * sigma * A_i * F_i * (T_rad^4 - T_sink^4)
```

Total radiator rejection:

```
Q_dot_radiator_total = Q_dot_face_a + Q_dot_face_b
```

where:

- `sigma = 5.670374419e-8 W/m^2/K^4`
- `A_b = 0` and `F_b = 0` for `single_sided`
- `T_rad` is the radiator surface temperature (from zone target temp or declared radiator temp field)
- `T_sink` is resolved per §9.4

Required area inversion when solving for symmetric double-sided area:

```
A_face_required = Q_dot_required
                  / ( sigma * (T_rad^4 - T_sink^4)
                      * (epsilon_a * F_a + epsilon_b * F_b) )
```

for `A_face_a = A_face_b = A_face_required`.

For asymmetric geometry, runtime shall solve directly by using declared areas if provided, or by assigning all unspecified required area to face A and reporting the asymmetry assumption.

### 11.9 BOL and EOL area sizing

Define the effective emissive geometry factor for each life state:

```
effective_emissive_factor_bol
    = epsilon_effective_bol_a * F_a + epsilon_effective_bol_b * F_b

effective_emissive_factor_eol
    = epsilon_effective_eol_a * F_a + epsilon_effective_eol_b * F_b
```

where `epsilon_effective_bol_*` and `epsilon_effective_eol_*` are resolved through §11.7 and §11.6 for each face.

Required area at BOL:

```
A_bol_required = Q_dot_required
                 / ( sigma * (T_rad^4 - T_sink^4) * effective_emissive_factor_bol )
```

Required area at EOL:

```
A_eol_required = Q_dot_required
                 / ( sigma * (T_rad^4 - T_sink^4) * effective_emissive_factor_eol )
```

Area delta:

```
Delta_A_eol_minus_bol = A_eol_required - A_bol_required
```

Reserve margin sufficiency shall be checked against the declared radiator reserve margin field. If EOL requirement exceeds available margin, a warning is emitted.

### 11.10 Radiation-pressure flag metric

For emitted flux:

```
q_doubleprime_w_per_m2 = Q_dot_total / A_projected_m2
```

Screening pressure:

```
p_rad_pa = q_doubleprime_w_per_m2 / c
```

where `c = 299792458 m/s`. This is an absorptive lower-bound screening value.

Screening force:

```
F_rad_n = p_rad_pa * A_projected_m2 * C_r
```

where `C_r` defaults to `1.0` unless a reflector-style coefficient is explicitly declared in a future extension.

3A shall emit `p_rad_pa` and `F_rad_n` as report metrics only and shall raise a warning if either exceeds declared thresholds.

---

## 12. Defaults Table

### 12.1 Required defaults

| Field | Default |
|---|---|
| `enable_model_extension_3a` | `false` |
| `model_extension_3a_mode` | `disabled` |
| `topology_validation_policy` | `blocking` |
| `convergence_control.max_iterations` | `25` |
| `convergence_control.tolerance_abs_w` | `1.0` |
| `convergence_control.tolerance_rel_fraction` | `0.001` |
| `convergence_control.runaway_multiplier` | `4.0` |
| `convergence_control.blocking_on_nonconvergence` | `true` |
| `thermal-zone.flow_direction` | `isolated` |
| `thermal-zone.isolation_boundary` | `false` |
| `thermal-zone.upstream_zone_ref` | `null` |
| `thermal-zone.downstream_zone_ref` | `null` |
| `thermal-zone.bridge_resistance_k_per_w` | `null` |
| `thermal-zone.working_fluid_ref` | `null` |
| `thermal-zone.pickup_geometry_ref` | `null` |
| `thermal-zone.convergence_enabled` | `false` |
| `thermal-zone.resistance_chain` | `null` |
| `thermal-zone.resistance_chain.*` (all sub-fields) | `null` (treated as zero unless audit requires) |
| `radiator.geometry_mode` | `single_sided` |
| `radiator.face_b_area_m2` | `0` |
| `radiator.face_b_view_factor` | `0` |
| `radiator.surface_emissivity_bol` | required input — no silent default |
| `radiator.surface_emissivity_eol_override` | `null` |
| `radiator.emissivity_degradation_fraction` | `null` (epsilon_eol = epsilon_bol when null) |
| `radiator.cavity_emissivity_mode` | `disabled` |
| `radiator.cavity_view_factor` | `null` |
| `radiator.cavity_surface_emissivity` | `null` |
| `radiator.background_sink_temp_k_override` | `null` (falls back to environment profile) |

### 12.2 Default rules

No default may be hidden. Every default must appear in the defaults audit artifact and in operator-facing assumptions output when used. `surface_emissivity_bol` has no silent default; it must be explicitly declared by the operator or execution blocks.

---

## 13. Validation Rules

### 13.1 Topology validation

Blocking:

- unresolved zone refs,
- self-referential zone refs,
- cycles under blocking policy,
- isolation boundary declared without resistance.

Warnings:

- disconnected non-isolated zones,
- bidirectional zones with only one declared neighbor,
- convergence-enabled zone with no convergence neighbor.

### 13.2 Catalog validation

Blocking:

- unresolved `working_fluid_ref`,
- unresolved `pickup_geometry_ref`,
- numeric bounds violation in any output-driving catalog field.

### 13.3 Radiator validation

Blocking:

- missing `surface_emissivity_bol`,
- invalid emissivity range (not in (0,1]),
- invalid view factor range,
- `double_sided_*` mode with missing face B inputs when face B is required,
- gray cavity mode with missing cavity inputs,
- no T_sink source resolvable (no override and no environment profile sink temp).

### 13.4 Convergence validation

Blocking:

- `max_iterations < 1`,
- invalid tolerances (zero or negative),
- `runaway_multiplier < 2.0`,
- non-convergence with blocking policy,
- runaway state,
- numeric divergence (NaN, Infinity).

### 13.5 Resistance validation

Blocking:

- negative resistance term,
- `r_spreader_to_pickup_nominal_k_per_w` declared with a pickup geometry ref that does not resolve,
- invalid pickup geometry multiplier (zero or negative).

Warnings:

- all resistance chain terms null for a zone with declared load (zero total resistance with non-zero load implies infinite heat flow).

---

## 14. Output Contract

### 14.1 Required emitted fields

The runtime structured result shall emit, at minimum:

- `topology_valid` : boolean
- `topology_cycle_detected` : boolean
- `topology_order[]` : array of zone ids in resolved topological order when valid
- `convergence_attempted` : boolean
- `convergence_iterations` : integer
- `convergence_status` : enum (`not_required`, `converged`, `nonconverged`, `runaway`, `invalid`)
- `bridge_losses_w[]` : per-boundary array of bridge loss values
- `bridge_losses_w_total` : sum of all bridge losses
- `resistance_chain_totals` : map of zone_id to total R value
- `t_sink_resolved_k` : resolved T_sink used in radiator calculations
- `radiator_area_bol_required_m2` : number
- `radiator_area_eol_required_m2` : number
- `radiator_area_delta_m2` : number
- `reserve_margin_sufficient` : boolean or null if not computable
- `radiation_pressure_pa` : number or null
- `radiation_pressure_force_n` : number or null
- `defaults_applied[]` : array of field-path strings where defaults were injected

### 14.2 Human-readable output

Markdown and flag emitters shall surface the same foundational truths in plain form, including T_sink source declaration, any defaults applied, and any warnings raised.

---

## 15. Starter Catalog Guidance

### 15.1 Working fluids

Each starter working-fluid entry shall carry a declared confidence basis:

- `sourced_authoritative`
- `sourced_secondary`
- `operator_estimated`
- `research_required`

For 3A, starter entries may use bounded representative values if provenance is marked and owner approves the issue log.

### 15.2 Pickup geometries

Pickup geometry starter entries may use bounded representative multipliers if provenance is marked and owner approves the issue log.

---

## 16. Test Plan

### 16.1 Schema tests

- validate patched `thermal-zone`, `radiator`, `scenario`, and `run-packet` schemas
- validate new `working-fluid` and `pickup-geometry` schemas
- validate that legacy packet without 3A fields passes schema normalization

### 16.2 Runtime topology tests

- acyclic 3-zone chain passes
- self-loop fails
- 3-zone directed cycle fails
- disconnected isolated zone warns only
- parallel zones at same level (two hot islands) pass as distinct zone objects

### 16.3 Convergence tests

- convergent fixed-point case converges within declared tolerance
- non-convergent oscillatory case blocks under blocking policy
- runaway case blocks
- convergence with runaway_multiplier = 2.0 does not falsely trigger on normal transient

### 16.4 Resistance tests

- full chain with all terms declared produces correct T_junction
- pickup geometry multiplier changes effective chain resistance
- null resistance chain (all terms absent) produces zero total and emits warning
- negative resistance term blocks

### 16.5 Radiator tests

- single-sided calculation matches baseline behavior when 3A features disabled
- symmetric double-sided calculation halves per-face requirement versus equal-emissivity single-sided case
- BOL/EOL degradation increases required area
- gray cavity approximation changes effective emissivity when enabled
- T_sink from override takes priority over environment profile
- missing T_sink blocks execution

### 16.6 Output tests

- topology report emitted
- defaults used are listed including T_sink source
- radiation-pressure metric emitted without changing orbit state
- resistance chain totals emitted per zone
- legacy packet produces clean pass with no false 3A errors

---

## 17. Patch Order

1. patch schemas (thermal-zone, radiator, scenario, run-packet; add working-fluid, pickup-geometry)
2. add working-fluid and pickup-geometry starter catalogs
3. add topology and defaults validators
4. add resistance-chain runtime logic (§11.3)
5. add convergence iteration runtime logic (§11.4)
6. add radiator-3A runtime logic (§§11.5–11.9)
7. add radiation-pressure flag emitter (§11.10)
8. patch UI: additive zone and stage blocks, radiator life controls, resistance chain editor
9. emit topology/convergence/resistance/default reports (§14)
10. run defaults audit gate
11. execute full test suite (§16)

---

## 18. Best-Solve Items Requiring Owner Approval

This engineering spec depends on the attached issue log `extension-3a-authoring-issue-log-v0.2.0.md` for all best-solve decisions, including:

- HOLE-001: dist/runtime contracts used as repo-state evidence due to absent source tree
- CONTRA-001: prior extension spectral-stage terminology not restated as 3A baseline fact
- ADDITIVE-001: convergence exchange zone as `zone_role` enum value rather than new top-level family
- ADDITIVE-002: gray cavity emissivity approximation as bounded 3A cavity law (physical basis now cited in §11.6)
- ADDITIVE-003: resistance chain input fields declared as sub-object on thermal-zone (new in v0.4.1)
- ADDITIVE-004: F(x) state vector defined as zone-boundary heat exchange values with two-step update rule (new in v0.4.1)
- ADDITIVE-005: T_sink resolved from radiator override then environment profile with blocking fallback (new in v0.4.1)
- DIFF-001: version v0.3.0 → v0.4.1
- DIFF-002: starter catalog values bounded and provenance-labeled
- DIFF-003: `runaway_multiplier` minimum changed from 1.0 to 2.0
- DIFF-004: `effective_emissive_geometry` naming unified with `_bol` and `_eol` suffixes
- DIFF-005: legacy packet backward compatibility rule added to §5.3
- DIFF-006: cut list version reference corrected to v0.1.0

Until owner approval, these are proposed implementation law, not active canon.
