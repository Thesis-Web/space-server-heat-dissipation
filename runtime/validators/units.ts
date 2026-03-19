/**
 * units.ts
 * Unit normalization and validation for runtime inputs.
 * Policy: §10 — internal canonical units are SI.
 * Governed by §26.3 (units validation).
 */

// ─── Canonical unit set §10.1 ─────────────────────────────────────────────────

export type CanonicalUnit =
  | 'K'        // temperature
  | 'Pa'       // pressure
  | 'kg'       // mass
  | 's'        // time
  | 'W'        // power
  | 'J'        // energy
  | 'm2'       // area
  | 'm'        // length
  | 'kg_per_m3'  // density
  | 'J_per_kgK'  // specific heat
  | 'dimensionless' // emissivity, efficiency, fractions
  | 'kg_per_s';  // mass flow

// ─── Input-unit to SI conversions ────────────────────────────────────────────

/**
 * Convert Celsius to Kelvin. §10.2 — UI may accept °C.
 */
export function celsiusToKelvin(t_c: number): number {
  return t_c + 273.15;
}

/**
 * Convert Kelvin to Celsius for display. §10.3.
 */
export function kelvinToCelsius(t_k: number): number {
  return t_k - 273.15;
}

/**
 * Convert kW to W for internal normalization. §10.2.
 */
export function kilowattsToWatts(kw: number): number {
  return kw * 1000;
}

/**
 * Convert bar to Pa. §10.2.
 */
export function barToPascal(bar: number): number {
  return bar * 1e5;
}

/**
 * Convert atm to Pa. §10.2.
 */
export function atmToPascal(atm: number): number {
  return atm * 101325;
}

/**
 * Convert g to kg. §10.2.
 */
export function gramToKilogram(g: number): number {
  return g / 1000;
}

/**
 * Convert m² to cm² (display). §10.3.
 */
export function squareMetresToSquareCentimetres(m2: number): number {
  return m2 * 1e4;
}

// ─── Unit assertion helpers ───────────────────────────────────────────────────

export interface UnitViolation {
  field: string;
  message: string;
}

/**
 * Assert all temperature fields (K) are physically valid (> 0).
 * Absolute zero or below is non-physical for thermodynamic state. §10.1.
 */
export function assertTemperatureFields(
  obj: Record<string, number>,
  fields: string[]
): UnitViolation[] {
  const violations: UnitViolation[] = [];
  for (const field of fields) {
    if (field in obj) {
      if (obj[field] <= 0) {
        violations.push({
          field,
          message: `Temperature field ${field} must be > 0 K (canonical unit). Got ${obj[field]}`,
        });
      }
    }
  }
  return violations;
}

/**
 * Assert all power fields (W) are non-negative.
 */
export function assertPowerFields(
  obj: Record<string, number>,
  fields: string[]
): UnitViolation[] {
  const violations: UnitViolation[] = [];
  for (const field of fields) {
    if (field in obj) {
      if (obj[field] < 0) {
        violations.push({
          field,
          message: `Power field ${field} must be >= 0 W. Got ${obj[field]}`,
        });
      }
    }
  }
  return violations;
}

/**
 * Assert fraction fields are in [0, 1].
 */
export function assertFractionFields(
  obj: Record<string, number>,
  fields: string[]
): UnitViolation[] {
  const violations: UnitViolation[] = [];
  for (const field of fields) {
    if (field in obj) {
      if (obj[field] < 0 || obj[field] > 1) {
        violations.push({
          field,
          message: `Fraction field ${field} must be in [0, 1]. Got ${obj[field]}`,
        });
      }
    }
  }
  return violations;
}

/**
 * Normalize a scenario-level temperature input:
 * if value is clearly in Celsius range (< 200), convert to K with warning.
 * This is a UI-layer normalization fallback only; spec-clean inputs are in K. §10.2.
 */
export function normalizeTempInput(value: number, field: string): { k: number; warning?: string } {
  if (value > 200) {
    return { k: value }; // already Kelvin
  }
  if (value > -100 && value < 200) {
    // Likely Celsius input
    return {
      k: celsiusToKelvin(value),
      warning: `${field}: value ${value} appears to be Celsius; converted to ${celsiusToKelvin(value).toFixed(2)} K`,
    };
  }
  return { k: value };
}
