# Model Extension 3A UI Implementation Ledger v0.4.1

- Governed by: `orbital-thermal-trade-system-model-extension-3a-blueprint-v0.4.1 §11`
- Build status: **PENDING** — UI work is the remaining open item after runtime merge

## UI Requirements (Blueprint §11)

### §11.1 Thermal Architecture surface — NOT STARTED
- Additive zone create/delete/duplicate/reorder controls
- Per-zone topology field editors (flow_direction, upstream/downstream refs, isolation_boundary)
- Convergence exchange zone role selector
- Isolation bridge resistance field
- Resistance chain sub-object editor (all R terms per zone)
- Working-fluid selector with catalog lookup
- Pickup-geometry selector with catalog lookup
- Per-zone defaults provenance display

### §11.2 Stage authoring surface — NOT STARTED
- Additive stage block create/delete/duplicate/reorder
- Parallel stage placement at same zone level
- Per-stage zone assignment from declared zones

### §11.3 Radiator and Storage surface — NOT STARTED
- Cavity emissivity mode selector + basis fields
- geometry_mode selector (single/double-sided)
- Per-face area and view factor fields
- BOL emissivity field + degradation fraction or EOL override
- BOL/EOL area preview and delta summary
- Background sink temperature override

### §11.4 Output and Packet surface — NOT STARTED
- Topology report summary
- Convergence report summary
- Resistance-chain summary per zone
- Defaults audit summary
- BOL/EOL radiator delta summary
- Radiation-pressure warning summary
- Catalog ids and versions used

## Integration point
`ui/app/app.js` is the target file. `runtime/runner/run-extension-3a.ts` is the callable runtime. `runtime/emitters/topology-report.ts` produces the report output for display.
