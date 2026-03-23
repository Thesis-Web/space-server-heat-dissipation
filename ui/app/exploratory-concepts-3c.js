/**
 * exploratory-concepts-3c.js
 *
 * Read-only UI catalog data for Extension 3C exploratory concepts.
 *
 * Governed by:
 *   - Extension 3C Engineering Spec v0.1.0 §12, §13
 *   - Extension 3C Blueprint v0.1.0 — Render Visibility Law
 *
 * CRITICAL — UI NON-AUTHORITY CONTRACT:
 *   - This module is DESCRIPTIVE ONLY. No activation controls.
 *   - No user control path can activate these concepts into a scenario.
 *   - No packet field carries these concepts as active runtime authority.
 *   - No numeric summary or result field attributes credit to these concepts.
 *   - These concepts are metadata-only with NO current runtime effect.
 *
 * NOTE — PATH DIFF RESOLUTION (DIFF-3C-001):
 *   Spec §8.1 named ui/app/catalog/exploratoryConcepts.ts but the actual
 *   ui/app tree has no catalog/ subdirectory and uses vanilla JS. This file
 *   is placed at ui/app/exploratory-concepts-3c.js per repo convention.
 *   See build issue log for full DIFF-3C-001 documentation.
 *
 * NOTE — COMPONENT DIFF RESOLUTION (DIFF-3C-002):
 *   Spec §8.1 named ui/app/components/ExploratoryConceptCatalogPanel.tsx
 *   but no components/ directory exists and UI is not React/TSX.
 *   The panel rendering is delegated to this data module + inline HTML in
 *   the host app. See build issue log for full DIFF-3C-002 documentation.
 */

"use strict";

// ── Catalog data (read-only, no runtime authority) ────────────────────────────

/**
 * The canonical 3C exploratory concept UI projections.
 * Per spec §11.3 — projectExploratoryConceptForUI shape.
 *
 * activeRuntimeEffect: false — always, no exceptions.
 * selectable: false — always, no exceptions.
 * scenarioInjectable: false — always, no exceptions.
 */
export const EXPLORATORY_CONCEPTS_3C = Object.freeze([
  Object.freeze({
    conceptId: "EXT-DISC-007",
    title: "GEO Scavenging / Ambient Collection",
    shortLabel: "GEO Scavenging",
    summary:
      "Exploratory concept investigating the potential to harvest ambient thermal or radiative energy in geosynchronous orbit conditions for supplemental heat management. Preserved as metadata only. No current runtime thermal credit or scenario authority.",
    evidenceClass: "tier5_model_inference",
    maturityState: "concept_only",
    confidenceState: "low",
    renderVisibility: "catalog_and_appendix_read_only",
    caveats: [
      "No active runtime authority under Extension 3C.",
      "No thermal credit, no packet authority, no scenario execution authority.",
    ],
    notes: [
      "Preserved from prior ideation lineage for governance continuity.",
      "Downstream owner hint: planned Extension 4.",
    ],
    activeRuntimeEffect: false,
    selectable: false,
    scenarioInjectable: false,
  }),
  Object.freeze({
    conceptId: "EXT-DISC-018",
    title: "Near-Field Radiative Transfer Enhancement",
    shortLabel: "Near-Field Radiative",
    summary:
      "Exploratory concept examining near-field radiative transfer mechanisms as a potential avenue for enhanced thermal dissipation beyond classical far-field limits. Preserved as metadata only. No current runtime thermal credit or scenario authority.",
    evidenceClass: "tier5_model_inference",
    maturityState: "concept_only",
    confidenceState: "low",
    renderVisibility: "catalog_and_appendix_read_only",
    caveats: [
      "No active runtime authority under Extension 3C.",
      "No thermal credit, no packet authority, no scenario execution authority.",
    ],
    notes: [
      "Preserved from prior ideation lineage for governance continuity.",
      "Downstream owner hint: planned Extension 4.",
    ],
    activeRuntimeEffect: false,
    selectable: false,
    scenarioInjectable: false,
  }),
  Object.freeze({
    conceptId: "EXT-DISC-019",
    title: "Osmotic / Chemical Gradient Cooling",
    shortLabel: "Osmotic Gradient Cooling",
    summary:
      "Exploratory concept investigating osmotic or chemical gradient mechanisms as potential non-traditional cooling pathways. Preserved as metadata only. No current runtime thermal credit or scenario authority.",
    evidenceClass: "tier5_model_inference",
    maturityState: "concept_only",
    confidenceState: "low",
    renderVisibility: "catalog_and_appendix_read_only",
    caveats: [
      "No active runtime authority under Extension 3C.",
      "No thermal credit, no packet authority, no scenario execution authority.",
    ],
    notes: [
      "Preserved from prior ideation lineage for governance continuity.",
      "Downstream owner hint: planned Extension 4.",
    ],
    activeRuntimeEffect: false,
    selectable: false,
    scenarioInjectable: false,
  }),
]);

/**
 * Render the exploratory concepts catalog panel as an HTML string.
 * READ-ONLY display only. No controls, no toggles, no activation inputs.
 * Per spec §12.1 allowed UI displays.
 */
export function renderExploratoryConceptsCatalogPanel() {
  const rows = EXPLORATORY_CONCEPTS_3C.map((concept) => {
    const caveatsHtml = concept.caveats
      .map((c) => `<li>${escapeHtml(c)}</li>`)
      .join("");
    const notesHtml = concept.notes
      .map((n) => `<li>${escapeHtml(n)}</li>`)
      .join("");

    return `
      <div class="exploratory-concept-card" data-concept-id="${escapeHtml(concept.conceptId)}">
        <div class="concept-header">
          <span class="concept-id-badge">${escapeHtml(concept.conceptId)}</span>
          <span class="concept-title">${escapeHtml(concept.title)}</span>
          <span class="metadata-only-badge">METADATA ONLY — NO RUNTIME EFFECT</span>
        </div>
        <div class="concept-summary">${escapeHtml(concept.summary)}</div>
        <div class="concept-meta">
          <span class="meta-label">Evidence:</span>
          <span class="meta-value">${escapeHtml(concept.evidenceClass)}</span>
          <span class="meta-label">Maturity:</span>
          <span class="meta-value">${escapeHtml(concept.maturityState)}</span>
          <span class="meta-label">Confidence:</span>
          <span class="meta-value">${escapeHtml(concept.confidenceState)}</span>
        </div>
        <div class="concept-promotion-notice">
          ⚠ Promotion to runtime authority requires a future canonical extension.
        </div>
        <div class="concept-caveats">
          <strong>Caveats:</strong>
          <ul>${caveatsHtml}</ul>
        </div>
        <div class="concept-notes">
          <strong>Notes:</strong>
          <ul>${notesHtml}</ul>
        </div>
      </div>
    `;
  });

  return `
    <section class="exploratory-concepts-catalog-panel" aria-label="Exploratory Concepts Catalog (Read-Only)">
      <div class="catalog-panel-header">
        <h3>Exploratory Concepts — Extension 3C (Metadata Only)</h3>
        <div class="catalog-non-authority-banner">
          These concepts carry NO current runtime authority. They are preserved for
          evidence traceability and research continuity only. No thermal credit,
          no packet authority, and no scenario execution authority is granted.
          Promotion to runtime authority requires a future explicit canonical extension.
        </div>
      </div>
      <div class="catalog-entries">
        ${rows.join("")}
      </div>
    </section>
  `;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
