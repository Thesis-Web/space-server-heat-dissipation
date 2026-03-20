import { runScenario } from "./run-scenario";
const result = runScenario({
  scenario_id: "sc-8ca2e3390429b5d3",
  orbit_class: "GEO", thermal_policy: "nominal", load_state: "full",
  compute_modules: [{
    device_powers: { power_idle_w: 100, power_light_w: 350, power_medium_w: 600, power_full_w: 700 },
    device_count: 8, load_state: "full",
    memory_power_w: 500, storage_power_w: 100, network_power_w: 200,
    power_conversion_overhead_w: 300, control_overhead_w: 100,
  }],
  comms_payload: null, env_terms: null,
  radiator: { radiator_id: "rad-h200-baseline", target_surface_temp_k: 1200,
    emissivity: 0.90, view_factor: 1.0, reserve_margin_fraction: 0.15,
    areal_mass_density_kg_per_m2: 5 },
  storage: null, w_dot_parasitic_w: 0,
});
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
