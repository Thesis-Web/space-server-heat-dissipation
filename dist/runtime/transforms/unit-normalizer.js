"use strict";
/**
 * unit-normalizer.ts
 * Unit normalization transform — converts UI inputs to canonical SI. §10.2.
 * Governed by §26.4, §10.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeFields = normalizeFields;
const units_1 = require("../validators/units");
/**
 * Normalize a flat record of numeric fields to SI based on a unit map.
 * unit_map: { fieldName: 'degC' | 'kW' | 'bar' | 'si' }
 * SI fields are passed through unchanged.
 */
function normalizeFields(input, unit_map) {
    const data = { ...input };
    const notes = [];
    const assumptions = [];
    for (const [field, unit] of Object.entries(unit_map)) {
        if (!(field in data))
            continue;
        const original = data[field];
        switch (unit) {
            case 'degC': {
                const converted = (0, units_1.celsiusToKelvin)(original);
                data[field] = converted;
                notes.push({ field, original, converted, from_unit: '°C', to_unit: 'K' });
                assumptions.push({
                    field,
                    value: `${original} °C → ${converted.toFixed(2)} K`,
                    source: 'inferred',
                    note: 'Converted from Celsius to Kelvin per §10.2.',
                });
                break;
            }
            case 'kW': {
                const converted = (0, units_1.kilowattsToWatts)(original);
                data[field] = converted;
                notes.push({ field, original, converted, from_unit: 'kW', to_unit: 'W' });
                break;
            }
            case 'bar': {
                const converted = (0, units_1.barToPascal)(original);
                data[field] = converted;
                notes.push({ field, original, converted, from_unit: 'bar', to_unit: 'Pa' });
                break;
            }
            case 'si':
            default:
                // Already SI — no conversion needed
                break;
        }
    }
    return { data, notes, assumptions };
}
//# sourceMappingURL=unit-normalizer.js.map