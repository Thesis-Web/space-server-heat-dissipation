"use strict";
/**
 * schema.ts
 * JSON schema validation module.
 * Governed by §26.3 (schema validation) and §41.2 (schema gate).
 * Uses AJV draft-07 per schema $schema declarations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadSchema = loadSchema;
exports.validateDocument = validateDocument;
exports.assertValid = assertValid;
exports.validateScenarioBundle = validateScenarioBundle;
exports.clearValidatorCache = clearValidatorCache;
const ajv_1 = __importDefault(require("ajv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ajv = new ajv_1.default({ allErrors: true, strict: false });
// Cache compiled validators keyed by schema_id
const validatorCache = new Map();
// ─── Schema loader ────────────────────────────────────────────────────────────
/**
 * Load and compile a JSON schema from the schemas/ directory.
 * Schema path is resolved relative to repo root.
 */
function loadSchema(schemaId) {
    if (validatorCache.has(schemaId)) {
        return validatorCache.get(schemaId);
    }
    const schemaDir = path.resolve(__dirname, '../../schemas', schemaId);
    const schemaFile = path.join(schemaDir, `${schemaId}.schema.json`);
    if (!fs.existsSync(schemaFile)) {
        throw new Error(`Schema file not found: ${schemaFile}`);
    }
    const raw = fs.readFileSync(schemaFile, 'utf-8');
    const schema = JSON.parse(raw);
    const validate = ajv.compile(schema);
    validatorCache.set(schemaId, validate);
    return validate;
}
// ─── Validate a document against its schema ───────────────────────────────────
/**
 * Validate a parsed JSON document against the named schema.
 * Returns structured result — does not throw on validation failure.
 */
function validateDocument(schemaId, document, dataId) {
    const validate = loadSchema(schemaId);
    const valid = validate(document);
    return {
        valid,
        errors: valid ? null : (validate.errors ?? null),
        schema_id: schemaId,
        data_id: dataId,
    };
}
/**
 * Validate a document and throw if invalid.
 * Produces a human-readable error summary.
 */
function assertValid(schemaId, document, dataId) {
    const result = validateDocument(schemaId, document, dataId);
    if (!result.valid) {
        const messages = (result.errors ?? [])
            .map(e => `  [${e.instancePath || '/'}] ${e.message}`)
            .join('\n');
        throw new Error(`Schema validation failed for ${schemaId}` +
            (dataId ? ` (${dataId})` : '') +
            `:\n${messages}`);
    }
}
/**
 * Validate a scenario payload bundle:
 * scenario + all referenced subsystem documents.
 * §15.3 — reject if any referenced subsystem schema object is missing.
 */
function validateScenarioBundle(scenario, subsystems) {
    const results = [];
    results.push(validateDocument('scenario', scenario, 'scenario'));
    for (const [schemaId, doc] of Object.entries(subsystems)) {
        results.push(validateDocument(schemaId, doc, schemaId));
    }
    return results;
}
/**
 * Clear validator cache — for testing use only.
 */
function clearValidatorCache() {
    validatorCache.clear();
}
//# sourceMappingURL=schema.js.map