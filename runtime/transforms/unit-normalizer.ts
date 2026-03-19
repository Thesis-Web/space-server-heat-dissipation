/**
 * unit-normalizer.ts
 * Unit normalization transform — converts UI inputs to canonical SI. §10.2.
 * Governed by §26.4, §10.
 */

import { celsiusToKelvin, kilowattsToWatts, barToPascal } from '../validators/units';
import { Assumption } from '../emitters/json-emitter';

export interface NormalizationNote {
  field: string;
  original: number;
  converted: number;
  from_unit: string;
  to_unit: string;
}

export interface NormalizationResult<T> {
  data: T;
  notes: NormalizationNote[];
  assumptions: Assumption[];
}

/**
 * Normalize a flat record of numeric fields to SI based on a unit map.
 * unit_map: { fieldName: 'degC' | 'kW' | 'bar' | 'si' }
 * SI fields are passed through unchanged.
 */
export function normalizeFields(
  input: Record<string, number>,
  unit_map: Record<string, 'degC' | 'kW' | 'bar' | 'si'>
): NormalizationResult<Record<string, number>> {
  const data: Record<string, number> = { ...input };
  const notes: NormalizationNote[] = [];
  const assumptions: Assumption[] = [];

  for (const [field, unit] of Object.entries(unit_map)) {
    if (!(field in data)) continue;
    const original = data[field];

    switch (unit) {
      case 'degC': {
        const converted = celsiusToKelvin(original);
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
        const converted = kilowattsToWatts(original);
        data[field] = converted;
        notes.push({ field, original, converted, from_unit: 'kW', to_unit: 'W' });
        break;
      }
      case 'bar': {
        const converted = barToPascal(original);
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
