# Launch + Packaging Assumptions (Draft)

**Status:** Draft v0.1  
**Intent:** Capture packaging logic for 50 kW modules. Numbers here are placeholders until radiator/array are locked.

## 1) What we are packing

A **Class S 50 kW module** consists of:
- Compute vault (pressurized or controlled atmosphere) + avionics bay
- Cold-loop pumps + plumbing + cold plates
- Cold-to-hot heat exchanger boundary (Zone B)
- High-T backbone loop components (Zone C) (working fluid + containment)
- Radiator field (Zone D) designed for **1200 K effective emission**
- Solar array + power electronics + batteries (orbit-dependent)
- Comms payload: TT&C + optical crosslinks

## 2) Packaging philosophy

- **Compute vault is the rigid core** (launch loads, alignment, shock)
- **Radiator and solar arrays are deployable** (folded/stowed for fairing)
- Module should be “single-fault containable” as a fleet building block

## 3) Fairing constraints (conceptual)

We do not lock exact launchers yet. We assume common cylindrical fairing envelopes and build the module to be:
- Compatible with “~5 m class” fairings by default
- Radiator and arrays packaged as fold-outs (origami stow)

## 4) Payload count per launch (speculative)

Until we lock:
- radiator area at 1200 K (emissivity + view factors),
- solar array area for 50 kW continuous (degradation + orbit),
- battery for eclipse (if applicable),
we only define the *method*:

### Method
1. Compute **stowed volume** of one module (core + folded radiator + folded array).
2. Compute **mass** of one module (dry + prop margin).
3. Compute launcher “usable payload” to target orbit.
4. Pack by whichever binds first: volume or mass.

### Current expectation (qualitative)
- At **1200 K**, radiator area is far smaller than conventional low-T radiators, so **arrays and power** likely dominate stowed volume.
- Early designs will be **array-limited**, not radiator-limited.

## 5) Open items to lock next
1. Orbit: LEO vs GEO affects eclipse + link budget + station keeping
2. Array specific power assumption (W/kg) and packing factor
3. Radiator emissivity + structural areal density at 1200 K
4. Crosslink terminal count per node and their power draw
