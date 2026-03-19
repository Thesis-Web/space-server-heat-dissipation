/**
 * operating-mode.test.ts
 * Runtime operating-mode enforcement tests.
 * Appendix B cases 6 (non-GEO rejection), 8 (COP > Carnot), 9 (low-sig TEG).
 */

import { validateOrbitClass, checkScavengingSignificance } from '../runtime/validators/operating-mode';

describe('Reference cases — operating-mode validation (Appendix B)', () => {

  // ── Appendix B case 6 — non-GEO rejection §7.3 ───────────────────────────
  it('Appendix B case 6: rejects non-GEO orbit class (§7.3)', () => {
    const violations = validateOrbitClass('LEO');
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].severity).toBe('error');
    expect(violations[0].message).toMatch(/GEO/);
  });

  it('Accepts GEO orbit class (§7.3)', () => {
    const violations = validateOrbitClass('GEO');
    expect(violations).toHaveLength(0);
  });

  // ── Appendix B case 9 — low-significance TEG-like branch §31.3 ───────────
  it('Appendix B case 9: flags low-significance TEG branch (§31.3)', () => {
    // TEG output = 400 W, total internal = 50,000 W → 0.8% < 1% threshold
    const flag = checkScavengingSignificance('teg-branch-01', 400, 50_000);
    expect(flag).not.toBeNull();
    expect(flag!.flag_id).toBe('low_significance_recovery_branch_output');
    expect(flag!.severity).toBe('error');
  });

  it('Does not flag significant branch (§31.3)', () => {
    // Branch output = 1000 W on 50,000 W internal = 2% > 1% threshold
    const flag = checkScavengingSignificance('useful-branch', 1000, 50_000);
    expect(flag).toBeNull();
  });
});
