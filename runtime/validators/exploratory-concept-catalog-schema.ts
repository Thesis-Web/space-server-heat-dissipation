/**
 * exploratory-concept-catalog-schema.ts
 *
 * Schema validation for the ExploratoryConceptCatalog and
 * ExploratoryConceptCatalogEntry types.
 *
 * Governed by:
 *   - Extension 3C Engineering Spec v0.1.0 §4, §9, §11
 *   - Extension 3C Blueprint v0.1.0
 *
 * This validator enforces:
 *   - Required field presence (§9.1, §4.2)
 *   - Enum membership (§9.1)
 *   - Literal-true markers (§9.1)
 *   - Prohibited runtime field prefixes (§7, §11.2)
 *   - Semantic invariants (§4.3)
 *   - Collection invariants (§5.2, §9.2)
 *
 * This module does NOT introduce any runtime authority.
 * It does NOT alter packet, scenario, or result objects.
 * It is metadata-layer validation only.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type EvidenceClass =
  | "tier1_primary"
  | "tier2_analyst"
  | "tier3_technical_press"
  | "tier4_operator_discussion"
  | "tier5_model_inference";

export type MaturityState =
  | "concept_only"
  | "early_theoretical"
  | "bench_principle"
  | "prototype_candidate"
  | "research_watch";

export type ConfidenceState =
  | "low"
  | "low_medium"
  | "medium"
  | "medium_high"
  | "high";

export type OutputEffectClass =
  | "metadata_only_no_runtime_effect";

export type PromotionRequirement =
  | "future_canonical_extension_required";

export type RenderVisibility =
  | "hidden"
  | "catalog_read_only"
  | "appendix_read_only"
  | "catalog_and_appendix_read_only";

/** Canonical 3C concept identifiers. Spec §4.1, §6. */
export type ConceptId =
  | "EXT-DISC-007"
  | "EXT-DISC-018"
  | "EXT-DISC-019";

// ── Domain object types (spec §4.1) ───────────────────────────────────────────

export interface ExploratoryConceptCatalogEntry {
  schema_version: "3c-1";
  extension_id: "3c";
  concept_id: ConceptId;
  title: string;
  short_label: string;
  summary: string;
  provenance_evidence_class: EvidenceClass;
  provenance_sources: string[];
  maturity_state: MaturityState;
  confidence_state: ConfidenceState;
  output_effect_class: OutputEffectClass;
  promotion_requirement: PromotionRequirement;
  no_current_runtime_authority: true;
  render_visibility: RenderVisibility;
  caveats: string[];
  notes: string[];
  explicit_non_goals: string[];
  tpv_exclusion_acknowledged: true;
  downstream_owner_hint?: "planned_extension_4";
  tags?: string[];
}

export interface ExploratoryConceptCatalog {
  schema_version: "3c-catalog-1";
  extension_id: "3c";
  entries: readonly ExploratoryConceptCatalogEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const REQUIRED_CONCEPT_IDS: readonly ConceptId[] = [
  "EXT-DISC-007",
  "EXT-DISC-018",
  "EXT-DISC-019",
];

const ALLOWED_RENDER_VISIBILITY: readonly RenderVisibility[] = [
  "hidden",
  "catalog_read_only",
  "appendix_read_only",
  "catalog_and_appendix_read_only",
];

/** Prohibited field name prefixes per spec §7, §11.2. */
const PROHIBITED_FIELD_PREFIXES: readonly string[] = [
  "iteration_count",
  "convergence_tolerance",
  "non_convergence_behavior",
  "recaptured_power",
  "exported_power",
  "onboard_heat_return",
  "radiator_area_reduction",
  "feedback_pass",
  "rerun_behavior",
];

const REQUIRED_NON_GOAL_FRAGMENTS: readonly string[] = [
  "no runtime thermal credit",
  "no packet authority",
  "no scenario execution authority",
  "no numeric output mutation",
];

// ── Validation result type ────────────────────────────────────────────────────

export interface CatalogValidationResult {
  valid: boolean;
  errors: string[];
  concept_id?: string;
  catalog_checked?: boolean;
}

// ── Entry validation (spec §9.1, §11.2) ──────────────────────────────────────

/**
 * Validate a single ExploratoryConceptCatalogEntry.
 * Checks all required fields, enum memberships, literal markers, and
 * prohibited field prefixes per spec §9.1, §11.2.
 *
 * Pseudocode from spec §11.2 is implemented here.
 */
export function validateExploratoryConceptCatalogEntry(
  entry: unknown
): CatalogValidationResult {
  const errors: string[] = [];

  if (!entry || typeof entry !== "object") {
    return { valid: false, errors: ["entry is not an object"] };
  }

  const e = entry as Record<string, unknown>;

  // Literal assertions (spec §11.2)
  if (e.schema_version !== "3c-1") {
    errors.push(`schema_version must equal "3c-1", got: ${JSON.stringify(e.schema_version)}`);
  }
  if (e.extension_id !== "3c") {
    errors.push(`extension_id must equal "3c", got: ${JSON.stringify(e.extension_id)}`);
  }
  if (!REQUIRED_CONCEPT_IDS.includes(e.concept_id as ConceptId)) {
    errors.push(`concept_id must be one of ${REQUIRED_CONCEPT_IDS.join(", ")}, got: ${JSON.stringify(e.concept_id)}`);
  }
  if (e.output_effect_class !== "metadata_only_no_runtime_effect") {
    errors.push(`output_effect_class must equal "metadata_only_no_runtime_effect", got: ${JSON.stringify(e.output_effect_class)}`);
  }
  if (e.promotion_requirement !== "future_canonical_extension_required") {
    errors.push(`promotion_requirement must equal "future_canonical_extension_required", got: ${JSON.stringify(e.promotion_requirement)}`);
  }
  if (e.no_current_runtime_authority !== true) {
    errors.push(`no_current_runtime_authority must equal true, got: ${JSON.stringify(e.no_current_runtime_authority)}`);
  }
  if (e.tpv_exclusion_acknowledged !== true) {
    errors.push(`tpv_exclusion_acknowledged must equal true, got: ${JSON.stringify(e.tpv_exclusion_acknowledged)}`);
  }

  // String field validation (spec §4.2)
  if (typeof e.title !== "string" || e.title.length < 1 || e.title.length > 160) {
    errors.push("title must be a string of 1-160 chars");
  }
  if (typeof e.short_label !== "string" || e.short_label.length < 1 || e.short_label.length > 64) {
    errors.push("short_label must be a string of 1-64 chars");
  }
  if (typeof e.summary !== "string" || e.summary.length < 1 || e.summary.length > 1500) {
    errors.push("summary must be a string of 1-1500 chars");
  }

  // Render visibility enum (spec §4.1)
  if (!ALLOWED_RENDER_VISIBILITY.includes(e.render_visibility as RenderVisibility)) {
    errors.push(`render_visibility must be one of ${ALLOWED_RENDER_VISIBILITY.join(", ")}, got: ${JSON.stringify(e.render_visibility)}`);
  }

  // Array field validation (spec §4.2, §11.2)
  if (!Array.isArray(e.provenance_sources) || e.provenance_sources.length < 1) {
    errors.push("provenance_sources must be a non-empty array");
  }
  if (!Array.isArray(e.caveats)) {
    errors.push("caveats must be an array (may be empty)");
  }
  if (!Array.isArray(e.notes)) {
    errors.push("notes must be an array (may be empty)");
  }
  if (!Array.isArray(e.explicit_non_goals)) {
    errors.push("explicit_non_goals must be an array");
  } else {
    // Check required non-goal fragments (spec §4.3, §11.2)
    const nonGoalText = (e.explicit_non_goals as unknown[])
      .filter((g) => typeof g === "string")
      .map((g) => (g as string).toLowerCase())
      .join(" | ");

    for (const required of REQUIRED_NON_GOAL_FRAGMENTS) {
      if (!nonGoalText.includes(required)) {
        errors.push(`explicit_non_goals must include: "${required}"`);
      }
    }
  }

  // Prohibited field prefix check (spec §7, §11.2)
  const keys = Object.keys(e);
  for (const key of keys) {
    for (const prohibited of PROHIBITED_FIELD_PREFIXES) {
      if (key.startsWith(prohibited)) {
        errors.push(`prohibited field name: "${key}" (matches prohibited prefix "${prohibited}")`);
      }
    }
  }

  // Optional field validation
  if (e.downstream_owner_hint !== undefined && e.downstream_owner_hint !== "planned_extension_4") {
    errors.push(`downstream_owner_hint must equal "planned_extension_4" if present, got: ${JSON.stringify(e.downstream_owner_hint)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    concept_id: typeof e.concept_id === "string" ? e.concept_id : undefined,
  };
}

// ── Catalog collection validation (spec §5.2, §9.2, §11.1) ───────────────────

/**
 * Validate an ExploratoryConceptCatalog collection.
 * Checks catalog-level invariants per spec §5.2, §9.2, §11.1.
 * Calls entry validation for each entry per spec §11.1.
 *
 * Pseudocode from spec §11.1 is implemented here.
 */
export function validateExploratoryConceptCatalog(
  rawCatalog: unknown
): CatalogValidationResult {
  const errors: string[] = [];

  if (!rawCatalog || typeof rawCatalog !== "object") {
    return { valid: false, errors: ["catalog is not an object"], catalog_checked: false };
  }

  const cat = rawCatalog as Record<string, unknown>;

  // Catalog-level literal assertions (spec §11.1)
  if (cat.schema_version !== "3c-catalog-1") {
    errors.push(`catalog schema_version must equal "3c-catalog-1", got: ${JSON.stringify(cat.schema_version)}`);
  }
  if (cat.extension_id !== "3c") {
    errors.push(`catalog extension_id must equal "3c", got: ${JSON.stringify(cat.extension_id)}`);
  }

  // Entries array and count (spec §5.2, §11.1)
  if (!Array.isArray(cat.entries)) {
    errors.push("catalog.entries must be an array");
    return { valid: false, errors, catalog_checked: true };
  }
  if (cat.entries.length !== 3) {
    errors.push(`catalog.entries must have exactly 3 items at initial 3C release, got: ${cat.entries.length}`);
  }

  // Per-entry validation and duplicate check
  const seenIds = new Set<string>();
  for (const entry of cat.entries) {
    const result = validateExploratoryConceptCatalogEntry(entry);
    if (!result.valid) {
      for (const err of result.errors) {
        errors.push(`entry(${result.concept_id ?? "unknown"}): ${err}`);
      }
    }
    if (result.concept_id) {
      if (seenIds.has(result.concept_id)) {
        errors.push(`duplicate concept_id: ${result.concept_id}`);
      }
      seenIds.add(result.concept_id);
    }
  }

  // Required concept IDs check (spec §5.2, §11.1)
  for (const reqId of REQUIRED_CONCEPT_IDS) {
    if (!seenIds.has(reqId)) {
      errors.push(`missing required concept_id: ${reqId}`);
    }
  }

  // Extra concept IDs check (spec §5.2)
  for (const seenId of seenIds) {
    if (!REQUIRED_CONCEPT_IDS.includes(seenId as ConceptId)) {
      errors.push(`extra concept_id not allowed in initial 3C release: ${seenId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    catalog_checked: true,
  };
}

// ── Read-only UI projection (spec §11.3) ──────────────────────────────────────

export interface ExploratoryConceptUIProjection {
  conceptId: string;
  title: string;
  shortLabel: string;
  summary: string;
  evidenceClass: EvidenceClass;
  maturityState: MaturityState;
  confidenceState: ConfidenceState;
  renderVisibility: RenderVisibility;
  caveats: string[];
  notes: string[];
  /** Always false — no active runtime effect. Spec §11.3. */
  activeRuntimeEffect: false;
  /** Always false — concept cannot be selected into a scenario. Spec §11.3. */
  selectable: false;
  /** Always false — concept cannot be injected into a scenario. Spec §11.3. */
  scenarioInjectable: false;
}

/**
 * Project an ExploratoryConceptCatalogEntry to a read-only UI view model.
 * Per spec §11.3. Returns only descriptive fields; never allows runtime binding.
 */
export function projectExploratoryConceptForUI(
  entry: ExploratoryConceptCatalogEntry
): ExploratoryConceptUIProjection {
  return {
    conceptId: entry.concept_id,
    title: entry.title,
    shortLabel: entry.short_label,
    summary: entry.summary,
    evidenceClass: entry.provenance_evidence_class,
    maturityState: entry.maturity_state,
    confidenceState: entry.confidence_state,
    renderVisibility: entry.render_visibility,
    caveats: entry.caveats,
    notes: entry.notes,
    activeRuntimeEffect: false,
    selectable: false,
    scenarioInjectable: false,
  };
}

/**
 * Freeze and return the raw catalog object to prevent downstream mutation.
 * Per spec §11.1 loader return contract.
 */
export function freezeCatalog(catalog: ExploratoryConceptCatalog): Readonly<ExploratoryConceptCatalog> {
  return Object.freeze({
    ...catalog,
    entries: Object.freeze(catalog.entries.map((e) => Object.freeze({ ...e }))),
  });
}
