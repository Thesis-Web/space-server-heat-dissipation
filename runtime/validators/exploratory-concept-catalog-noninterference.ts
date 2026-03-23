/**
 * exploratory-concept-catalog-noninterference.ts
 *
 * Non-interference validation for the 3C exploratory concept catalog.
 *
 * Governed by:
 *   - Extension 3C Engineering Spec v0.1.0 §10, §11.4, §11.5
 *   - Extension 3C Blueprint v0.1.0 Gate 4 — Non-interference integrity
 *
 * This module enforces the invariant that:
 *   - 3C catalog data does NOT enter runtime packets (§11.4)
 *   - 3C catalog data does NOT alter scenario configs (§11.4)
 *   - 3C catalog data does NOT alter result objects (§11.4)
 *   - Numeric outputs are identical with or without 3C catalog loaded (§11.5)
 *
 * This module has NO runtime authority.
 * It does NOT modify, compute, or produce any thermal credit, factor, or output.
 * It is an audit/guard layer only.
 *
 * Gate 4 failure action: stop implementation and log hard failure.
 */


// ── Non-interference result type ──────────────────────────────────────────────

export interface NonInterferenceResult {
  passed: boolean;
  violations: string[];
  check: string;
}

// ── Prohibited concept ID strings ─────────────────────────────────────────────

const CONCEPT_IDS_3C = ["EXT-DISC-007", "EXT-DISC-018", "EXT-DISC-019"] as const;

// ── Packet isolation check (spec §11.4) ───────────────────────────────────────

/**
 * Assert that a runtime packet object does NOT contain 3C catalog data.
 *
 * Per spec §11.4 pseudocode:
 *   assert packet does not contain "exploratoryConcepts"
 *   assert packet does not contain any catalog concept_id as active selector
 */
export function ensureCatalogDoesNotEnterRuntimePacket(
  packet: Record<string, unknown>
): NonInterferenceResult {
  const violations: string[] = [];

  if ("exploratoryConcepts" in packet) {
    violations.push(
      'packet contains forbidden key "exploratoryConcepts" — 3C data must not enter runtime packets'
    );
  }

  for (const conceptId of CONCEPT_IDS_3C) {
    if (conceptId in packet) {
      violations.push(
        `packet contains forbidden key "${conceptId}" — concept IDs must not appear as active selectors in runtime packets`
      );
    }
    // Check nested structures for concept ID leakage
    const serialized = JSON.stringify(packet);
    // We look for the concept ID as an active selector key, not as documentary metadata
    const activePatterns = [
      `"active_concept":"${conceptId}"`,
      `"enabled_concept":"${conceptId}"`,
      `"selected_concept":"${conceptId}"`,
      `"concept_selector":"${conceptId}"`,
    ];
    for (const pattern of activePatterns) {
      if (serialized.includes(pattern)) {
        violations.push(
          `packet contains 3C concept ID "${conceptId}" as an active runtime selector — this violates non-interference`
        );
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    check: "ensureCatalogDoesNotEnterRuntimePacket",
  };
}

// ── Scenario config isolation check (spec §11.4) ─────────────────────────────

/**
 * Assert that a scenario config object has NO fields derived from 3C catalog entries.
 *
 * Per spec §11.4 pseudocode:
 *   assert config has no fields derived from catalog entries
 */
export function ensureCatalogDoesNotAlterScenarioConfig(
  config: Record<string, unknown>
): NonInterferenceResult {
  const violations: string[] = [];

  if ("exploratoryConcepts" in config) {
    violations.push(
      'scenario config contains forbidden key "exploratoryConcepts" — 3C data must not appear in scenario configs'
    );
  }

  for (const conceptId of CONCEPT_IDS_3C) {
    if (conceptId in config) {
      violations.push(
        `scenario config contains forbidden key "${conceptId}" — concept IDs must not appear in scenario configs`
      );
    }
  }

  // Check for 3C-derived thermal credit injection
  const threeCCreditKeys = [
    "exploratory_thermal_credit",
    "geo_scavenging_credit",
    "near_field_radiative_credit",
    "osmotic_cooling_credit",
  ];
  for (const key of threeCCreditKeys) {
    if (key in config) {
      violations.push(
        `scenario config contains forbidden 3C-derived field "${key}" — 3C concepts must not produce any credit in scenario configs`
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    check: "ensureCatalogDoesNotAlterScenarioConfig",
  };
}

// ── Result isolation check (spec §11.4) ───────────────────────────────────────

/**
 * Assert that a result object contains no credited runtime metrics from 3C catalog.
 *
 * Per spec §11.4 pseudocode:
 *   assert results contain no credited runtime metric from catalog
 */
export function ensureCatalogDoesNotAlterResults(
  results: Record<string, unknown>
): NonInterferenceResult {
  const violations: string[] = [];

  if ("exploratoryConcepts" in results) {
    violations.push(
      'results contain forbidden key "exploratoryConcepts" — 3C data must not appear in runtime results'
    );
  }

  for (const conceptId of CONCEPT_IDS_3C) {
    if (conceptId in results) {
      violations.push(
        `results contain forbidden key "${conceptId}" — concept IDs must not appear in runtime results`
      );
    }
  }

  // Check for 3C-specific credited output fields (forbidden report displays, spec §12.4)
  const forbidden3CResultKeys = [
    "exploratory_concept_roi",
    "exploratory_concept_performance_delta",
    "geo_scavenging_area_reduction",
    "near_field_radiative_area_reduction",
    "osmotic_cooling_area_reduction",
    "onboard_heat_return_from_3c",
    "tpv_credit_from_3c",
  ];
  for (const key of forbidden3CResultKeys) {
    if (key in results) {
      violations.push(
        `results contain forbidden 3C-derived field "${key}" — 3C concepts must not produce any credited outputs`
      );
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    check: "ensureCatalogDoesNotAlterResults",
  };
}

// ── Full non-interference test (spec §11.5) ───────────────────────────────────

/**
 * Full numeric non-interference assertion: outputs must be identical
 * with and without 3C catalog present.
 *
 * Per spec §11.5 pseudocode:
 *   assert deepNumericEqual(runControl.outputs, runWithCatalog.outputs)
 *   assert deepEqual(runControl.packets, runWithCatalog.packets)
 *   assert deepEqual(runControl.results, runWithCatalog.results)
 *
 * @param runControl - Outputs from run WITHOUT 3C catalog
 * @param runWithCatalog - Outputs from run WITH 3C catalog loaded
 */
export function assertNonInterference(
  runControl: { outputs: unknown; packets: unknown; results: unknown },
  runWithCatalog: { outputs: unknown; packets: unknown; results: unknown }
): NonInterferenceResult {
  const violations: string[] = [];

  const controlOutStr = JSON.stringify(runControl.outputs);
  const catalogOutStr = JSON.stringify(runWithCatalog.outputs);
  if (controlOutStr !== catalogOutStr) {
    violations.push(
      "numeric outputs differ between control run and 3C-catalog run — 3C presence must not change any numeric output"
    );
  }

  const controlPktStr = JSON.stringify(runControl.packets);
  const catalogPktStr = JSON.stringify(runWithCatalog.packets);
  if (controlPktStr !== catalogPktStr) {
    violations.push(
      "packet objects differ between control run and 3C-catalog run — 3C presence must not change any packet"
    );
  }

  const controlResStr = JSON.stringify(runControl.results);
  const catalogResStr = JSON.stringify(runWithCatalog.results);
  if (controlResStr !== catalogResStr) {
    violations.push(
      "result objects differ between control run and 3C-catalog run — 3C presence must not change any result"
    );
  }

  return {
    passed: violations.length === 0,
    violations,
    check: "assertNonInterference",
  };
}

// ── Composite gate check ──────────────────────────────────────────────────────

/**
 * Run all static non-interference checks on packet, config, and results.
 * Returns a combined result. If any check fails, the overall result is failed.
 *
 * This does not perform the runtime comparison check (assertNonInterference),
 * which requires actual execution data.
 */
export function runStaticNonInterferenceChecks(
  packet: Record<string, unknown>,
  config: Record<string, unknown>,
  results: Record<string, unknown>
): NonInterferenceResult {
  const all: NonInterferenceResult[] = [
    ensureCatalogDoesNotEnterRuntimePacket(packet),
    ensureCatalogDoesNotAlterScenarioConfig(config),
    ensureCatalogDoesNotAlterResults(results),
  ];

  const violations = all.flatMap((r) => r.violations);
  return {
    passed: violations.length === 0,
    violations,
    check: "runStaticNonInterferenceChecks (composite)",
  };
}
