# space-server-heat-dissipation

Engineering spec and design notebook for a modular orbital compute node with a high-temperature thermal backbone.

## Scope
- 50 kW modular node baseline
- 1200 K radiator / high-T backbone loop (segregated from compute cold loop)
- Compute payload: accelerator-first (H200-class) with fault containment
- Scaling model: distributed modules → fleet

## Structure
- `docs/architecture/` — node classes, subsystem boundaries, interfaces
- `docs/thermal/` — thermal zones, loops, radiator sizing, materials
- `docs/compute/` — compute sled specs, networking, storage
- `docs/finance/` — ROI and scaling economics
- `diagrams/` — figures (SVG/PNG) and exported drawings
