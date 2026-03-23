# Model Extension 3A Operator Guide v0.4.1

Governed by: `orbital-thermal-trade-system-model-extension-3a-engineering-spec-v0.4.1`

## Enabling Extension 3A

Set in your scenario packet:
```json
{
  "enable_model_extension_3a": true,
  "model_extension_3a_mode": "foundational_hardening"
}
```

Modes: `disabled` | `topology_only` | `foundational_hardening`

## Required Fields (no silent defaults)

- `radiator.surface_emissivity_bol` — **must be declared**; execution blocks if absent (§12.2)
- `thermal-zone.bridge_resistance_k_per_w` — **must be declared and > 0** when `isolation_boundary: true` (§13.1)

## T_sink Resolution Priority (§9.4)

1. `radiator.background_sink_temp_k_override` (per-radiator override)
2. `scenario.environment_profile.sink_temperature_k`
3. Blocking error if neither is present

## Catalog References

- `working_fluid_ref` must match a `working_fluid_id` in `ui/app/catalogs/working-fluids.v0.1.0.json`
- `pickup_geometry_ref` must match a `pickup_geometry_id` in `ui/app/catalogs/pickup-geometries.v0.1.0.json`

## Convergence Control Minimums (§5.4)

- `runaway_multiplier` minimum: **2.0**
- `max_iterations` minimum: **1**, maximum: **500**
- Tolerances must be strictly positive

## Legacy Packets

A packet without `enable_model_extension_3a` is treated as `false`. No 3A errors are raised. (§5.3)
