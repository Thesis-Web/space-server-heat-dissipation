/**
 * units.ts
 * Unit normalization and validation for runtime inputs.
 * Policy: §10 — internal canonical units are SI.
 * Governed by §26.3 (units validation).
 */
export type CanonicalUnit = 'K' | 'Pa' | 'kg' | 's' | 'W' | 'J' | 'm2' | 'm' | 'kg_per_m3' | 'J_per_kgK' | 'dimensionless' | 'kg_per_s';
/**
 * Convert Celsius to Kelvin. §10.2 — UI may accept °C.
 */
export declare function celsiusToKelvin(t_c: number): number;
/**
 * Convert Kelvin to Celsius for display. §10.3.
 */
export declare function kelvinToCelsius(t_k: number): number;
/**
 * Convert kW to W for internal normalization. §10.2.
 */
export declare function kilowattsToWatts(kw: number): number;
/**
 * Convert bar to Pa. §10.2.
 */
export declare function barToPascal(bar: number): number;
/**
 * Convert atm to Pa. §10.2.
 */
export declare function atmToPascal(atm: number): number;
/**
 * Convert g to kg. §10.2.
 */
export declare function gramToKilogram(g: number): number;
/**
 * Convert m² to cm² (display). §10.3.
 */
export declare function squareMetresToSquareCentimetres(m2: number): number;
export interface UnitViolation {
    field: string;
    message: string;
}
/**
 * Assert all temperature fields (K) are physically valid (> 0).
 * Absolute zero or below is non-physical for thermodynamic state. §10.1.
 */
export declare function assertTemperatureFields(obj: Record<string, number>, fields: string[]): UnitViolation[];
/**
 * Assert all power fields (W) are non-negative.
 */
export declare function assertPowerFields(obj: Record<string, number>, fields: string[]): UnitViolation[];
/**
 * Assert fraction fields are in [0, 1].
 */
export declare function assertFractionFields(obj: Record<string, number>, fields: string[]): UnitViolation[];
/**
 * Normalize a scenario-level temperature input:
 * if value is clearly in Celsius range (< 200), convert to K with warning.
 * This is a UI-layer normalization fallback only; spec-clean inputs are in K. §10.2.
 */
export declare function normalizeTempInput(value: number, field: string): {
    k: number;
    warning?: string;
};
//# sourceMappingURL=units.d.ts.map