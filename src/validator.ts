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
    const valid = validator(value);
    return { valid: Boolean(valid), errors: validator.errors ? [...validator.errors] : [] };
  }

  assert(schemaName: string, value: unknown): void {
    const result = this.validate(schemaName, value);
    if (!result.valid) throw new Error(`${schemaName} validation failed: ${JSON.stringify(result.errors)}`);
  }
}
