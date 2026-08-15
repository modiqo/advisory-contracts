import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import type { FormatsPlugin } from "ajv-formats";

const require = createRequire(import.meta.url);
const formatsModule = require("ajv-formats") as FormatsPlugin | { default: FormatsPlugin };
const addFormats: FormatsPlugin = typeof formatsModule === "function" ? formatsModule : formatsModule.default;

interface ContractManifest {
  schemas: Array<{ name: string; path: string }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[];
}

function semanticError(instancePath: string, message: string, params: Record<string, unknown> = {}): ErrorObject {
  return {
    keyword: "contractReference",
    instancePath,
    schemaPath: "#/contractReference",
    params,
    message
  };
}

function recordIds(
  value: Record<string, unknown>,
  collectionName: string,
  idName: string,
  errors: ErrorObject[]
): Set<string> {
  const ids = new Set<string>();
  const collection = value[collectionName];
  if (!Array.isArray(collection)) return ids;
  collection.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const id = (item as Record<string, unknown>)[idName];
    if (typeof id !== "string") return;
    if (ids.has(id)) {
      errors.push(semanticError(`/${collectionName}/${index}/${idName}`, `must be unique; duplicate '${id}'`, { duplicate: id }));
    }
    ids.add(id);
  });
  return ids;
}

function checkEvidenceReferences(value: unknown, evidenceIds: Set<string>, path: string, errors: ErrorObject[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkEvidenceReferences(item, evidenceIds, `${path}/${index}`, errors));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const childPath = `${path}/${key}`;
    if (key === "evidence_refs" && Array.isArray(child)) {
      child.forEach((reference, index) => {
        if (typeof reference === "string" && !evidenceIds.has(reference)) {
          errors.push(semanticError(`${childPath}/${index}`, `references missing evidence_id '${reference}'`, { missing: reference }));
        }
      });
    } else {
      checkEvidenceReferences(child, evidenceIds, childPath, errors);
    }
  }
}

function validateSnapshotReferences(schemaName: string, value: unknown): ErrorObject[] {
  if (schemaName !== "landing-page-snapshot" && schemaName !== "pricing-page-snapshot") return [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const record = value as Record<string, unknown>;
  const errors: ErrorObject[] = [];
  const evidenceIds = recordIds(record, "evidence", "evidence_id", errors);
  checkEvidenceReferences(record, evidenceIds, "", errors);

  if (schemaName === "pricing-page-snapshot") {
    const planIds = recordIds(record, "plans", "plan_id", errors);
    const callsToAction = record.calls_to_action;
    if (Array.isArray(callsToAction)) {
      callsToAction.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const planId = (item as Record<string, unknown>).plan_id;
        if (typeof planId === "string" && !planIds.has(planId)) {
          errors.push(semanticError(`/calls_to_action/${index}/plan_id`, `references missing plan_id '${planId}'`, { missing: planId }));
        }
      });
    }
  }

  return errors;
}

function discoverPackageRoot(): string {
  const candidates = [
    fileURLToPath(new URL("../", import.meta.url)),
    fileURLToPath(new URL("../../", import.meta.url))
  ];
  const root = candidates.find((candidate) => existsSync(`${candidate}/contract-manifest.json`));
  if (!root) throw new Error("Could not locate contract-manifest.json");
  return root;
}

export class ContractValidator {
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(root = discoverPackageRoot()) {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const manifest = JSON.parse(readFileSync(`${root}/contract-manifest.json`, "utf8")) as ContractManifest;
    const schemas = manifest.schemas.map(({ name, path }) => ({
      name,
      schema: JSON.parse(readFileSync(`${root}/${path}`, "utf8")) as object
    }));
    for (const { schema } of schemas) ajv.addSchema(schema);
    for (const { name, schema } of schemas) this.validators.set(name, ajv.getSchema((schema as { $id: string }).$id)!);
  }

  validate(schemaName: string, value: unknown): ValidationResult {
    const validator = this.validators.get(schemaName);
    if (!validator) throw new Error(`Unknown advisory contract: ${schemaName}`);
    const schemaValid = validator(value);
    const errors = validator.errors ? [...validator.errors] : [];
    if (schemaValid) errors.push(...validateSnapshotReferences(schemaName, value));
    return { valid: Boolean(schemaValid) && errors.length === 0, errors };
  }

  assert(schemaName: string, value: unknown): void {
    const result = this.validate(schemaName, value);
    if (!result.valid) throw new Error(`${schemaName} validation failed: ${JSON.stringify(result.errors)}`);
  }
}
