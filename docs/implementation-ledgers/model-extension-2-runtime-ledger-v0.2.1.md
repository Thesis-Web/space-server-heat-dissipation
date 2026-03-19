# Model Extension 2 Runtime Ledger v0.2.1

## Normalization
- normalize scenario extension flags
- normalize derived source profiles when no catalog ref is selected
- normalize stage coefficients
- serialize defaults explicitly

## Validation
- enforce coefficient bounds
- enforce completeness rules
- enforce metadata-only separation
- enforce baseline-only isolation
- enforce derived-profile reproducibility

## Result composition
- compute baseline path unchanged
- compute exploratory path in parallel when enabled
- compute delta path only from explicit baseline vs exploratory sections

## Exploratory math path
1. determine source profile
2. compute or accept band match score
3. compute or accept geometry coupling score
4. compute or accept mediator transfer score
5. compute eta_stage_exploratory
6. compute useful transfer
7. compute residual reject
8. aggregate target-zone inlet
9. compute exploratory radiator delta
10. emit baseline/exploratory/delta results separately
