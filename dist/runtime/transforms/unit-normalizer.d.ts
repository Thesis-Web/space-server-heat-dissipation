/**
 * unit-normalizer.ts
 * Unit normalization transform — converts UI inputs to canonical SI. §10.2.
 * Governed by §26.4, §10.
 */
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
export declare function normalizeFields(input: Record<string, number>, unit_map: Record<string, 'degC' | 'kW' | 'bar' | 'si'>): NormalizationResult<Record<string, number>>;
//# sourceMappingURL=unit-normalizer.d.ts.map