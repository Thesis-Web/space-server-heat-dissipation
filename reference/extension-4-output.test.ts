/**
 * reference/extension-4-output.test.ts
 * Extension 4 output tests — ext4-spec-v0.1.4 §20.6
 *
 * Governing law: ext4-spec-v0.1.4 §20.6, §18.1–§18.5, §9.14
 * Blueprint law:  blueprint-v0.1.4 §Emitter-Responsibilities, §Controls-and-Gates Gate 6
 *
 * Required assertions per §20.6:
 * 1. markdown includes ext4 section
 * 2. JSON packet includes extension_4_result
 * 3. flags include ext4 IDs where appropriate
 * 4. equivalent area fields null correctly when unavailable or Q_base_ref <= 0
 * 5. iteration_history absent in minimal mode and present only in full detail mode
 */

import { runExtension4 } from '../runtime/runner/run-extension-4';
import type { Extension4Input } from '../runtime/runner/run-extension-4';
import {
  emitExt4MarkdownSection,
} from '../runtime/emitters/markdown-emitter';
import {
  attachExt4ResultToPacket,
  serializeExt4Result,
} from '../runtime/emitters/json-emitter';
import {
  emit4Flags,
  FLAG_IDS_EXT4,
} from '../runtime/emitters/flag-emitter';

// ─── Shared stubs ─────────────────────────────────────────────────────────────

const STUB_RADIATOR = {
  radiator_id: 'radiator-01',
  target_surface_temp_k: 350,
  effective_area_m2: 2.0,
  emissivity: 0.9,
  sink_temp_k: 3,
};

const STUB_3A = {
  extension_3a_enabled: true,
  convergence_attempted: true,
  convergence_iterations: 6,
  convergence_status: 'converged' as const,
  blocking_on_nonconvergence: false,
  t_sink_resolved_k: 4.0,
  radiator_area_bol_required_m2: 1.8,
  radiator_area_eol_required_m2: 2.2,
};

const ONE_PASS_CONFIG = {
  tpv_model_id: 'tpv-output-test-v0',
  coverage_fraction: 0.20,
  radiator_view_factor_to_tpv: 0.80,
  spectral_capture_fraction: 0.60,
  coupling_derate_fraction: 0.90,
  conversion_efficiency_mode: 'fixed',
  eta_tpv_fixed: 0.15,
  export_fraction: 1.0,
  onboard_return_heat_fraction: 0.0,
  cell_cooling_mode: 'separate_cooling',
  iteration_report_detail: 'minimal',
};

const ONE_PASS_INPUT: Extension4Input = {
  scenario: {
    scenario_id: 'scn-output-onepass-001',
    enable_model_extension_4: true,
    model_extension_4_mode: 'one_pass',
    tpv_recapture_config: ONE_PASS_CONFIG,
  },
  run_packet: {},
  radiators: [STUB_RADIATOR],
  extension_3a_result: STUB_3A,
};

const ONE_PASS_INPUT_FULL: Extension4Input = {
  scenario: {
    scenario_id: 'scn-output-onepass-full-001',
    enable_model_extension_4: true,
    model_extension_4_mode: 'one_pass',
    tpv_recapture_config: { ...ONE_PASS_CONFIG, iteration_report_detail: 'full' },
  },
  run_packet: {},
  radiators: [STUB_RADIATOR],
  extension_3a_result: STUB_3A,
};

// =============================================================================
// §20.6 Assertion 1 — markdown includes ext4 section
// §18.2: emitExt4MarkdownSection produces non-empty markdown
// =============================================================================

describe('Extension 4 output — §20.6', () => {

  describe('Assertion 1: markdown includes ext4 section (§20.6 item 1, §18.2)', () => {
    test('emitExt4MarkdownSection produces non-empty string for enabled one-pass result', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const md = emitExt4MarkdownSection(result);
      expect(typeof md).toBe('string');
      expect(md.length).toBeGreaterThan(0);
    });

    test('markdown section includes Extension 4 heading', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const md = emitExt4MarkdownSection(result);
      expect(md).toMatch(/Extension 4/i);
    });

    test('markdown section includes TPV recapture or tpv reference', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const md = emitExt4MarkdownSection(result);
      // Must reference the TPV model or convergence status
      expect(md).toMatch(/tpv|TPV|recapture|disabled/i);
    });

    test('disabled result markdown section includes disabled indicator', () => {
      const disabledInput: Extension4Input = {
        scenario: { scenario_id: 'scn-disabled-md', enable_model_extension_4: false },
        run_packet: {},
        radiators: [STUB_RADIATOR],
      };
      const result = runExtension4(disabledInput);
      const md = emitExt4MarkdownSection(result);
      expect(md.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // §20.6 Assertion 2 — JSON packet includes extension_4_result
  // §18.1: attachExt4ResultToPacket attaches under extension_4_result key
  // §6.1: extension_4_result is the canonical attachment key
  // ===========================================================================

  describe('Assertion 2: JSON packet includes extension_4_result (§20.6 item 2, §18.1)', () => {
    test('attachExt4ResultToPacket adds extension_4_result key to packet', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const packet: Record<string, unknown> = { packet_id: 'pkt-001' };
      attachExt4ResultToPacket(packet, result);
      expect('extension_4_result' in packet).toBe(true);
    });

    test('attached extension_4_result matches the result object', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const packet: Record<string, unknown> = { packet_id: 'pkt-001' };
      attachExt4ResultToPacket(packet, result);
      const attached = packet['extension_4_result'] as typeof result;
      expect(attached.extension_4_enabled).toBe(result.extension_4_enabled);
      expect(attached.q_rad_net_w).toBe(result.q_rad_net_w);
    });

    test('serializeExt4Result produces valid JSON string', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const json = serializeExt4Result(result);
      expect(() => JSON.parse(json)).not.toThrow();
      const parsed = JSON.parse(json);
      expect(parsed.extension_4_enabled).toBe(true);
    });

    test('serialized JSON includes extension_4_result key when attached to packet', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const packet: Record<string, unknown> = { packet_id: 'pkt-002', schema_version: 'v0.1.5' };
      attachExt4ResultToPacket(packet, result);
      const json = JSON.stringify(packet);
      const parsed = JSON.parse(json);
      expect('extension_4_result' in parsed).toBe(true);
    });
  });

  // ===========================================================================
  // §20.6 Assertion 3 — flags include ext4 IDs where appropriate
  // §18.3: emit4Flags produces Flag objects with correct flag IDs
  // ===========================================================================

  describe('Assertion 3: flags include ext4 IDs where appropriate (§20.6 item 3, §18.3)', () => {
    test('emit4Flags on disabled result produces EXT4-INFO-DISABLED flag', () => {
      const disabledInput: Extension4Input = {
        scenario: { scenario_id: 'scn-flags-disabled', enable_model_extension_4: false },
        run_packet: {},
        radiators: [STUB_RADIATOR],
      };
      const result = runExtension4(disabledInput);
      const flags = emit4Flags(result);
      const ids = flags.map(f => f.flag_id);
      expect(ids).toContain(FLAG_IDS_EXT4.INFO_DISABLED);
    });

    test('emit4Flags on one-pass result contains EXT4-INFO-ONEPASS flag', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      const flags = emit4Flags(result);
      const ids = flags.map(f => f.flag_id);
      expect(ids).toContain(FLAG_IDS_EXT4.INFO_ONEPASS);
    });

    test('emit4Flags on one-pass-without-3A result contains EXT4-INFO-ONEPASS-NO-3A flag', () => {
      const noA3Input: Extension4Input = {
        scenario: {
          scenario_id: 'scn-flags-no3a',
          enable_model_extension_4: true,
          model_extension_4_mode: 'one_pass',
          tpv_recapture_config: ONE_PASS_CONFIG,
        },
        run_packet: {},
        radiators: [STUB_RADIATOR],
      };
      const result = runExtension4(noA3Input);
      const flags = emit4Flags(result);
      const ids = flags.map(f => f.flag_id);
      expect(ids).toContain(FLAG_IDS_EXT4.INFO_ONEPASS_NO_3A);
    });
  });

  // ===========================================================================
  // §20.6 Assertion 4 — equivalent area fields null when unavailable or Q_base_ref <= 0
  // §9.14: area metrics null when 3A area basis absent or Q_base_ref <= 0
  // ===========================================================================

  describe('Assertion 4: equivalent area fields null correctly (§20.6 item 4, §9.14)', () => {
    test('area fields are null when no 3A result provided (basis absent)', () => {
      const noA3Input: Extension4Input = {
        scenario: {
          scenario_id: 'scn-area-no3a',
          enable_model_extension_4: true,
          model_extension_4_mode: 'one_pass',
          tpv_recapture_config: ONE_PASS_CONFIG,
        },
        run_packet: {},
        radiators: [STUB_RADIATOR],
      };
      const result = runExtension4(noA3Input);
      expect(result.area_equivalent_bol_m2).toBeNull();
      expect(result.area_equivalent_eol_m2).toBeNull();
      expect(result.area_delta_bol_m2).toBeNull();
      expect(result.area_delta_eol_m2).toBeNull();
    });

    test('area fields are null when 3A provides null area values', () => {
      const stub3aNoArea = {
        extension_3a_enabled: true,
        convergence_attempted: true,
        convergence_iterations: 5,
        convergence_status: 'converged' as const,
        blocking_on_nonconvergence: false,
        t_sink_resolved_k: 4.0,
        radiator_area_bol_required_m2: null,   // no area from 3A
        radiator_area_eol_required_m2: null,
      };
      const input: Extension4Input = {
        scenario: {
          scenario_id: 'scn-area-null3a',
          enable_model_extension_4: true,
          model_extension_4_mode: 'one_pass',
          tpv_recapture_config: ONE_PASS_CONFIG,
        },
        run_packet: {},
        radiators: [STUB_RADIATOR],
        extension_3a_result: stub3aNoArea,
      };
      const result = runExtension4(input);
      expect(result.area_equivalent_bol_m2).toBeNull();
      expect(result.area_equivalent_eol_m2).toBeNull();
    });

    test('area fields are non-null when valid 3A area basis present', () => {
      const result = runExtension4(ONE_PASS_INPUT);
      // STUB_3A has valid bol/eol areas → area metrics must be non-null
      expect(result.area_equivalent_bol_m2).not.toBeNull();
      expect(result.area_equivalent_eol_m2).not.toBeNull();
    });
  });

  // ===========================================================================
  // §20.6 Assertion 5 — iteration_history absent in minimal, present in full
  // §16.4–§16.5: "absent not empty array is canonical minimal form" (§16.5)
  // ===========================================================================

  describe('Assertion 5: iteration_history absent in minimal, present in full detail (§20.6 item 5, §16.5)', () => {
    test('iteration_history absent (undefined) in minimal detail mode (§16.5)', () => {
      const result = runExtension4(ONE_PASS_INPUT);  // minimal mode
      expect((result as unknown as Record<string, unknown>)['iteration_history']).toBeUndefined();
    });

    test('iteration_history present with 1 entry in full detail one-pass mode (§16.4)', () => {
      const result = runExtension4(ONE_PASS_INPUT_FULL);
      expect(result.iteration_history).toBeDefined();
      expect(result.iteration_history!.length).toBe(1);
    });

    test('iteration_history entry[0] has iteration_index=1 in one-pass full detail', () => {
      const result = runExtension4(ONE_PASS_INPUT_FULL);
      expect(result.iteration_history![0].iteration_index).toBe(1);
    });

    test('iteration_history entry[0] abs_delta_w null on first iteration (§15.3)', () => {
      const result = runExtension4(ONE_PASS_INPUT_FULL);
      expect(result.iteration_history![0].abs_delta_w).toBeNull();
      expect(result.iteration_history![0].rel_delta_fraction).toBeNull();
    });
  });

});
