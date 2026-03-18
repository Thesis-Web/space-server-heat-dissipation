# Node Class S — 50 kW Module (Baseline Spec)

**Status:** Draft v0.1  
**Purpose:** Atomic deployable compute module for orbital fleet scaling.  
**Design driver:** High-temperature thermal rejection with a **1200 K radiator target** via a
segregated thermal backbone.

---

## 1. Top-level targets

| Parameter                        |                                                Target |
| -------------------------------- | ----------------------------------------------------: |
| Electrical bus (continuous)      |                                                 50 kW |
| Compute payload (continuous)     |                                              40–44 kW |
| Spacecraft overhead + margin     |                                               6–10 kW |
| Thermal rejection (steady state) |                                                ~50 kW |
| Radiator effective temperature   |                                       1200 K (target) |
| Architecture                     | Cold compute loop + high-T backbone loop (HX-coupled) |
| Initial launch compatibility     |                    Falcon 9 / Falcon Heavy / Starship |

---

## 2. Mission role

- Orbital compute node designed to operate as a fleet component.
- Primary early revenue: AI inference / accelerator compute.
- Network philosophy: standard IP at payload boundary; optical crosslinks between nodes; TT&C
  separated from payload traffic.

---

## 3. Thermal architecture (segmented)

### 3.1 Thermal zones

- **Zone A — Compute Vault (Cold Loop):** 300–350 K class
- **Zone B — Heat Exchanger Interface:** cold-to-hot transfer boundary
- **Zone C — High-T Backbone:** 1000–1200 K class transport loop
- **Zone D — Radiator Field:** 1200 K effective emission

### 3.2 Control intent

- Maintain Zone A within narrow band (reduce thermal cycling).
- Zone C operates at high temperature for radiator mass/area minimization and exergy leverage.
- No direct exposure of electronics to Zone C temperatures.

---

## 4. Compute payload (accelerator-first)

### 4.1 GPU baseline (locked class)

- **NVIDIA H200 class**
- Preferred configuration: **600 W TDP variant** where available (thermal benefit)

### 4.2 Block model (design abstraction)

Define a **GPU Block** as the repeatable unit:

- 10 × H200 @ 600 W = 6.0 kW
- Host CPUs sized for lanes + IO (platform-dependent)
- Local RAM + NVMe for caching/checkpoints

### 4.3 50 kW module target configuration

- **6 × GPU Blocks** → ~36 kW GPU power
- Host + RAM + NVMe + fabric → ~8 kW
- Total compute payload → **~44 kW**

---

## 5. Power system (baseline)

- Solar generation sized for 50 kW continuous with degradation margin.
- Battery sized for eclipse continuity (orbit-dependent; not locked in this doc).

---

## 6. Networking (baseline)

- Intra-node: high-throughput fabric (100–400 GbE class).
- Inter-node: optical crosslinks (aggregate Tbps-class target at fleet scale).
- Payload interface: IP-native (no proprietary dependency).

---

## 7. Packaging & deployment (concept)

- Module designed to fit within a 5.2 m fairing diameter class.
- Radiator at 1200 K reduces required area drastically vs 350 K class, enabling compact radiator
  packaging.
- Fleet scales by replication; failure domain limited to one module.

---

## 8. Open items to lock next

1. Orbit choice (LEO/GEO; eclipse fraction)
2. Solar array stow/deploy method and areal density assumption
3. High-T working fluid selection (He/Xe vs liquid metal) + materials stack
4. Crosslink bandwidth target per node (Gbps/Tbps) based on service model
5. Radiation strategy: shielding mass vs redundancy vs error model
