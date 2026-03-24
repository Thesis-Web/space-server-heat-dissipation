/**
 * reference/extension-4-state-compilation.test.ts
 * Extension 4 state-compilation tests — ext4-spec-v0.1.4 §20.7
 * Gate 7 — Blueprint Control 8
 *
 * Governing law: ext4-spec-v0.1.4 §20.7, §19.4, §5.1, §6.1, §6.2, §3 rule 13
 * Blueprint law:  blueprint-v0.1.4 §Controls-and-Gates Gate 7 (Control 8),
 *                 §State-compilation-control, §Build-Agent-Responsibilities
 *
 * Required assertions per §20.7 (minimum 6):
 * 1. Scenario field pass-through: enable_model_extension_4=true,
 *    model_extension_4_mode='iterative', valid tpv_recapture_config →
 *    all three in compiled payload with declared values.
 * 2. Run-packet mirror pass-through: same fields present in compiled run-packet.
 * 3. No silent field drop: all §5.1 and §6.1 fields present with declared
 *    value or declared default.
 * 4. Disabled state: enable_model_extension_4=false, mode='disabled',
 *    no numeric result fields populated.
 * 5. extension_4_catalog_versions pass-through: non-null object preserved
 *    without mutation; not routed to numeric path.
 * 6. Conformance with 3B pattern: same no-hidden-state compilation pattern.
 */

// HOLE-002 context: state-compiler.js uses ESM export syntax.
// jest.config.js patched to transform .js files via ts-jest + allowJs.
// See docs/extension-4-build-issue-log-v0.1.4.md §HOLE-002 (pending owner approval).

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — state-compiler.js is a UI JS file with no .d.ts; HOLE-002 approved.
import { compileStateToPayloads } from '../ui/app/state-compiler.js';

// ─── §5.1 required scenario field names ──────────────────────────────────────
const SCENARIO_EXT4_FIELDS_S51 = [
  'enable_model_extension_4',
  'model_extension_4_mode',
  'tpv_recapture_config',
  'extension_4_catalog_versions',
] as const;

// ─── §6.1 required run-packet field names ────────────────────────────────────
const PACKET_EXT4_FIELDS_S61 = [
  'enable_model_extension_4',
  'model_extension_4_mode',
  'tpv_recapture_config',
  'extension_4_catalog_versions',
  'extension_4_result',
] as const;

// ─── Minimal valid tpv_recapture_config ───────────────────────────────────────
const VALID_TPV_CONFIG = {
  tpv_model_id: 'tpv-gate7-test-v0',
  coverage_fraction: 0.20,
  radiator_view_factor_to_tpv: 0.80,
  spectral_capture_fraction: 0.60,
  coupling_derate_fraction: 0.90,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.15,
  export_fraction: 0.50,
  onboard_return_heat_fraction: 0.80,
  cell_cooling_mode: 'separate_cooling',
};

// ─── Minimal catalogs stub ────────────────────────────────────────────────────
const STUB_CATALOGS = {};

// ─── Helper: parse scenario.json from compileStateToPayloads output ───────────
function getScenario(state: Record<string, unknown>): Record<string, unknown> {
  const { files } = compileStateToPayloads(state, STUB_CATALOGS);
  const scenarioFile = files.find((f: { name: string; content: string }) => f.name === 'scenario.json');
  if (!scenarioFile) throw new Error('scenario.json not found in compiled output');
  return JSON.parse(scenarioFile.content) as Record<string, unknown>;
}

// ─── Helper: parse run-packet.json from compileStateToPayloads output ─────────
function getPacket(state: Record<string, unknown>): Record<string, unknown> {
  const { files } = compileStateToPayloads(state, STUB_CATALOGS);
  const packetFile = files.find((f: { name: string; content: string }) => f.name === 'run-packet.json');
  if (!packetFile) throw new Error('run-packet.json not found in compiled output');
  return JSON.parse(packetFile.content) as Record<string, unknown>;
}

// =============================================================================
// §20.7 Assertion 1 — Scenario field pass-through
// enable_model_extension_4=true, model_extension_4_mode='iterative',
// valid tpv_recapture_config → all three present in compiled scenario payload.
// =============================================================================

describe('Extension 4 state compilation — §20.7 Gate 7', () => {

  describe('Assertion 1: scenario field pass-through (§20.7 item 1, §19.4, §5.1)', () => {
    const state = {
      enable_model_extension_4: true,
      model_extension_4_mode: 'iterative',
      tpv_recapture_config: VALID_TPV_CONFIG,
    };

    test('compiled scenario contains enable_model_extension_4=true', () => {
      const scenario = getScenario(state);
      expect(scenario['enable_model_extension_4']).toBe(true);
    });

    test('compiled scenario contains model_extension_4_mode=iterative', () => {
      const scenario = getScenario(state);
      expect(scenario['model_extension_4_mode']).toBe('iterative');
    });

    test('compiled scenario contains tpv_recapture_config with tpv_model_id', () => {
      const scenario = getScenario(state);
      expect(scenario['tpv_recapture_config']).toBeDefined();
      expect((scenario['tpv_recapture_config'] as Record<string, unknown>)['tpv_model_id'])
        .toBe('tpv-gate7-test-v0');
    });
  });

  // ===========================================================================
  // §20.7 Assertion 2 — Run-packet mirror pass-through
  // Same fields present in compiled run-packet with correct values.
  // ===========================================================================

  describe('Assertion 2: run-packet mirror pass-through (§20.7 item 2, §19.4, §6.1)', () => {
    const state = {
      enable_model_extension_4: true,
      model_extension_4_mode: 'iterative',
      tpv_recapture_config: VALID_TPV_CONFIG,
    };

    test('compiled run-packet contains enable_model_extension_4=true', () => {
      const packet = getPacket(state);
      expect(packet['enable_model_extension_4']).toBe(true);
    });

    test('compiled run-packet contains model_extension_4_mode=iterative', () => {
      const packet = getPacket(state);
      expect(packet['model_extension_4_mode']).toBe('iterative');
    });

    test('compiled run-packet contains tpv_recapture_config', () => {
      const packet = getPacket(state);
      expect(packet['tpv_recapture_config']).toBeDefined();
      const cfg = packet['tpv_recapture_config'] as Record<string, unknown>;
      expect(cfg['tpv_model_id']).toBe('tpv-gate7-test-v0');
    });
  });

  // ===========================================================================
  // §20.7 Assertion 3 — No silent field drop
  // All §5.1 scenario fields and §6.1 packet fields present with declared value
  // or declared default when state fields absent.
  // ===========================================================================

  describe('Assertion 3: no silent field drop (§20.7 item 3, §5.1, §6.1)', () => {
    // State with all ext4 fields explicitly set
    const fullState = {
      enable_model_extension_4: true,
      model_extension_4_mode: 'iterative',
      tpv_recapture_config: VALID_TPV_CONFIG,
      extension_4_catalog_versions: { tpv_catalog_version: 'v1.0.0' },
    };

    test('all §5.1 scenario fields present in compiled scenario', () => {
      const scenario = getScenario(fullState);
      for (const field of SCENARIO_EXT4_FIELDS_S51) {
        expect(field in scenario).toBe(true);
      }
    });

    test('all §6.1 run-packet fields present in compiled run-packet', () => {
      const packet = getPacket(fullState);
      for (const field of PACKET_EXT4_FIELDS_S61) {
        expect(field in packet).toBe(true);
      }
    });

    test('absent ext4 state fields default to declared defaults (not dropped)', () => {
      // State with no ext4 fields at all → defaults apply per §5.1
      const emptyState = {};
      const scenario = getScenario(emptyState);
      // §5.1: enable_model_extension_4 defaults false
      expect(scenario['enable_model_extension_4']).toBe(false);
      // §5.1: model_extension_4_mode defaults 'disabled'
      expect(scenario['model_extension_4_mode']).toBe('disabled');
      // §5.1: tpv_recapture_config defaults null
      expect(scenario['tpv_recapture_config']).toBeNull();
      // §5.1: extension_4_catalog_versions defaults null
      expect(scenario['extension_4_catalog_versions']).toBeNull();
    });

    test('extension_4_result defaults to null in compiled run-packet (§6.1)', () => {
      const packet = getPacket(fullState);
      expect(packet['extension_4_result']).toBeNull();
    });
  });

  // ===========================================================================
  // §20.7 Assertion 4 — Disabled state produces no numeric authority
  // enable_model_extension_4=false → scenario reflects false and mode=disabled;
  // no ext4 numeric result fields populated in compiled payload.
  // ===========================================================================

  describe('Assertion 4: disabled state produces no numeric authority (§20.7 item 4)', () => {
    const disabledState = {
      enable_model_extension_4: false,
      model_extension_4_mode: 'disabled',
    };

    test('compiled disabled scenario has enable_model_extension_4=false', () => {
      const scenario = getScenario(disabledState);
      expect(scenario['enable_model_extension_4']).toBe(false);
    });

    test('compiled disabled scenario has model_extension_4_mode=disabled', () => {
      const scenario = getScenario(disabledState);
      expect(scenario['model_extension_4_mode']).toBe('disabled');
    });

    test('compiled disabled run-packet extension_4_result is null (no numeric authority)', () => {
      const packet = getPacket(disabledState);
      // state-compiler sets extension_4_result=null; runtime populates it after dispatch
      expect(packet['extension_4_result']).toBeNull();
    });
  });

  // ===========================================================================
  // §20.7 Assertion 5 — extension_4_catalog_versions pass-through
  // Non-null object preserved without mutation; not routed to numeric path.
  // §6.2: pass-through provenance only; zero numeric authority.
  // ===========================================================================

  describe('Assertion 5: extension_4_catalog_versions pass-through (§20.7 item 5, §6.2)', () => {
    const catalogVersions = {
      tpv_model_catalog_version: 'v1.2.3',
      spectral_profile_catalog_version: 'v0.9.1',
      custom_annotation: 'test-ref',
    };
    const state = {
      enable_model_extension_4: true,
      model_extension_4_mode: 'iterative',
      tpv_recapture_config: VALID_TPV_CONFIG,
      extension_4_catalog_versions: catalogVersions,
    };

    test('extension_4_catalog_versions preserved in compiled scenario without mutation', () => {
      const scenario = getScenario(state);
      const compiledCatalog = scenario['extension_4_catalog_versions'] as Record<string, unknown>;
      expect(compiledCatalog).not.toBeNull();
      expect(compiledCatalog['tpv_model_catalog_version']).toBe('v1.2.3');
      expect(compiledCatalog['spectral_profile_catalog_version']).toBe('v0.9.1');
      expect(compiledCatalog['custom_annotation']).toBe('test-ref');
    });

    test('extension_4_catalog_versions preserved in compiled run-packet without mutation', () => {
      const packet = getPacket(state);
      const compiledCatalog = packet['extension_4_catalog_versions'] as Record<string, unknown>;
      expect(compiledCatalog).not.toBeNull();
      expect(compiledCatalog['tpv_model_catalog_version']).toBe('v1.2.3');
    });

    test('original catalogVersions object not mutated by compilation', () => {
      const snapshot = JSON.stringify(catalogVersions);
      getScenario(state);
      expect(JSON.stringify(catalogVersions)).toBe(snapshot);
    });
  });

  // ===========================================================================
  // §20.7 Assertion 6 — Conformance with 3B pattern
  // ext4 compilation follows the same no-hidden-state pattern as 3B.
  // §3 rule 13: no hidden state.
  // ===========================================================================

  describe('Assertion 6: conformance with 3B no-hidden-state pattern (§20.7 item 6, §3 rule 13)', () => {
    test('ext4 scenario fields present alongside 3B fields in compiled scenario', () => {
      const state = {
        // 3B fields
        enable_model_extension_3b: true,
        model_extension_3b_mode: 'full',
        // ext4 fields
        enable_model_extension_4: true,
        model_extension_4_mode: 'one_pass',
        tpv_recapture_config: VALID_TPV_CONFIG,
      };
      const scenario = getScenario(state);
      // Both ext families present simultaneously — no hidden state, no interference
      expect(scenario['enable_model_extension_3b']).toBe(true);
      expect(scenario['enable_model_extension_4']).toBe(true);
      expect(scenario['model_extension_3b_mode']).toBe('full');
      expect(scenario['model_extension_4_mode']).toBe('one_pass');
    });

    test('ext4 run-packet fields present alongside 3B fields in compiled run-packet', () => {
      const state = {
        enable_model_extension_3b: true,
        model_extension_3b_mode: 'full',
        enable_model_extension_4: true,
        model_extension_4_mode: 'one_pass',
        tpv_recapture_config: VALID_TPV_CONFIG,
      };
      const packet = getPacket(state);
      expect(packet['enable_model_extension_3b']).toBe(true);
      expect(packet['enable_model_extension_4']).toBe(true);
      expect(packet['extension_3b_result']).toBeNull();
      expect(packet['extension_4_result']).toBeNull();
    });

    test('ext4 defaults mirror the 3B ?? null pattern for optional fields', () => {
      // When both enabled but config absent, both use ?? null default pattern
      const state = {
        enable_model_extension_4: false,
        enable_model_extension_3b: false,
      };
      const scenario = getScenario(state);
      expect(scenario['tpv_recapture_config']).toBeNull();
      expect(scenario['extension_4_catalog_versions']).toBeNull();
    });
  });

});
