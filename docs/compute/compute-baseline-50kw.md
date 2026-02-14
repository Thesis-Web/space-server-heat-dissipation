# Compute Baseline — 50 kW Module (Class S)

**Status:** Draft v0.1  
**Intent:** Lock a repeatable compute bill-of-materials class for the 50 kW node.

## 1) Power budget envelope

| Subsystem | Target (kW) | Notes |
|---|---:|---|
| GPUs | 30–40 | Accelerator-first payload |
| CPU + DRAM | 3–6 | Host + memory power (platform dependent) |
| NVMe / local storage | 0.5–2 | Cache/checkpoint, not long-term archive |
| Fabric / switching | 0.5–2 | NVLink/PCIe + Ethernet/optics PHYs |
| BMC / control / misc | 0.2–0.8 | Flight computer, monitoring, housekeeping |
| **Compute payload subtotal** | **~40–44** | Design target |
| Spacecraft overhead + margin | 6–10 | ADCS, TT&C, pumps, heaters, etc. |
| **Node total** | **50** | Electrical bus continuous |

## 2) Accelerator class (locked)

### 2.1 GPU class
- **NVIDIA H200 class**
- Target TDP band: **600–700 W** per GPU (bin-dependent; use 600 W where possible)
- Cooling: cold-loop cold plates (Zone A), heat lifted via HX to high-T backbone (Zone C)

### 2.2 GPU Block abstraction
Define one repeatable **GPU Block**:
- 10 × H200 @ 600 W → **6.0 kW** GPU power
- Host CPU(s) sized for lanes, IO, and memory bandwidth
- DRAM sized for model staging + caching
- NVMe for local dataset shards + checkpoints

## 3) Host CPU classes (options)

We do not lock a specific part number yet; we lock **capability classes**.

### Option A — x86 server host class
- Dual-socket class, high PCIe lane count (Gen5/Gen6 timeline dependent)
- RAS features: ECC, patrol scrub, MCA, memory mirroring (optional)
- Target host power per GPU Block: **0.5–1.2 kW**

### Option B — ARM server host class
- High efficiency, high core count, PCIe lane density varies by platform
- Target host power per GPU Block: **0.4–1.0 kW**

## 4) DRAM classes

- ECC mandatory
- Baseline per GPU Block: **1–4 TB** system RAM (range depends on workload)
- Memory bandwidth and error model must be documented (radiation upset strategy)

## 5) Storage classes

### NVMe local (hot)
- Baseline per GPU Block: **30–120 TB** NVMe (TLC) as cache/checkpoint
- Endurance: sized for write amplification + checkpoint cadence

### Warm / fleet storage (not in-node)
- Bulk dataset storage assumed off-node (other modules or ground), depending on service model

## 6) Networking classes

### Intra-node fabric
- 100–400 GbE class (or equivalent) for host-to-host and storage
- Latency target depends on workload (training vs inference)

### Inter-node crosslinks
- Optical crosslinks baseline
- Node aggregate target: **10–200 Gbps early**, **Tbps-class later** (fleet evolution)
- Payload boundary stays IP-native

## 7) Target configurations (Class S)

### Baseline (balanced)
- 6 × GPU Blocks → ~60 GPUs
- GPU power: 36–42 kW (600–700 W each)
- Host + RAM + NVMe + fabric: 6–8 kW
- Compute payload: ~42–50 kW (trim to keep node at 50 kW bus)

### Inference-first (higher GPU, lower host)
- Push GPU toward 40–44 kW
- Reduce DRAM and NVMe footprint where workload permits

## 8) Open items to lock next
1. Per-customer bandwidth product: 50 Mbps / 500 Mbps / 1–2 Gbps tiers
2. Radiation mitigation strategy per memory tier (ECC only vs redundancy vs scrubbing cadence)
3. Exact GPU count per 50 kW module once pumps + HX parasitics are locked
4. Crosslink optical terminal power and mass assumptions
