# Extension 3B Pull-From-Droplet Manifest v0.1.0

## 1. Purpose

This manifest lists files required by a future build agent that are not present in the uploaded repo zip snapshot.

## 2. Result for this authoring pass

No implementation-critical source, schema, UI, or governance files required for authoring the 3B blueprint/spec were identified as missing from the uploaded repo zip.

The uploaded snapshot already contains:

- governing docs under `docs/`
- source runtime under `runtime/`
- source schemas under `schemas/`
- UI source under `ui/app/`
- conformance tools under `tools/`
- built `dist/` tree

## 3. Conditional pull items only

No mandatory pull items identified.

If the owner later wants droplet parity beyond the uploaded zip snapshot, the following are conditional-only and not required to author or implement 3B from source:

| Item class | Path | Why it may be pulled later | Downstream dependency |
|---|---|---|---|
| Build metadata | `.git/` state on droplet | only if the owner wants exact git history or commit-context parity | none for deterministic source build |
| CI/runtime environment | droplet-local shell aliases or secrets | only if CI/deploy workflows are later extended | not required for 3B source implementation |
| Node installation cache | `node_modules/` | reproducible install should come from package lock, not copied cache | not required |

## 4. Manifest conclusion

For the purposes of the 3B blueprint/spec authoring pass, the uploaded zip is sufficient. No mandatory droplet pull is required before a deterministic 3B implementation build begins.

