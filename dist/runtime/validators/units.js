"use strict";
/**
 * units.ts
 * Unit normalization and validation for runtime inputs.
 * Policy: §10 — internal canonical units are SI.
 * Governed by §26.3 (units validation).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.celsiusToKelvin = celsiusToKelvin;
exports.kelvinToCelsius = kelvinToCelsius;
exports.kilowattsToWatts = kilowattsToWatts;
exports.barToPascal = barToPascal;
exports.atmToPascal = atmToPascal;
exports.gramToKilogram = gramToKilogram;
exports.squareMetresToSquareCentimetres = squareMetresToSquareCentimetres;
exports.assertTemperatureFields = assertTemperatureFields;
exports.assertPowerFields = assertPowerFields;
exports.assertFractionFields = assertFractionFields;
exports.normalizeTempInput = normalizeTempInput;
// ─── Input-unit to SI conversions ────────────────────────────────────────────
/**
 * Convert Celsius to Kelvin. §10.2 — UI may accept °C.
 */
function celsiusToKelvin(t_c) {
    return t_c + 273.15;
}
/**
 * Convert Kelvin to Celsius for display. §10.3.
 */
function kelvinToCelsius(t_k) {
    return t_k - 273.15;
}
/**
 * Convert kW to W for internal normalization. §10.2.
 */
function kilowattsToWatts(kw) {
    return kw * 1000;
}
/**
 * Convert bar to Pa. §10.2.
 */
function barToPascal(bar) {
    return bar * 1e5;
}
/**
 * Convert atm to Pa. §10.2.
 */
function atmToPascal(atm) {
    return atm * 101325;
}
/**
 * Convert g to kg. §10.2.
 */
function gramToKilogram(g) {
    return g / 1000;
}
/**
 * Convert m² to cm² (display). §10.3.
 */
function squareMetresToSquareCentimetres(m2) {
    return m2 * 1e4;
}
/**
 * Assert all temperature fields (K) are physically valid (> 0).
 * Absolute zero or below is non-physical for thermodynamic state. §10.1.
 */
function assertTemperatureFields(obj, fields) {
    const violations = [];
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
function assertPowerFields(obj, fields) {
    const violations = [];
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
function assertFractionFields(obj, fields) {
    const violations = [];
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
function normalizeTempInput(value, field) {
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
//# sourceMappingURL=units.js.map