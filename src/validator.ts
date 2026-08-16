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

function validateSemanticReferences(schemaName: string, value: unknown): ErrorObject[] {
  if (!["landing-page-snapshot", "pricing-page-snapshot", "conversation-artifact", "operating-brief", "sales-follow-up-package"].includes(schemaName)) return [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  const record = value as Record<string, unknown>;
  const errors: ErrorObject[] = [];
  if (["landing-page-snapshot", "pricing-page-snapshot", "conversation-artifact"].includes(schemaName)) {
    const evidenceIds = recordIds(record, "evidence", "evidence_id", errors);
    checkEvidenceReferences(record, evidenceIds, "", errors);
  }

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

  if (schemaName === "conversation-artifact") {
    const segmentIds = recordIds(record, "transcript_segments", "segment_id", errors);
    recordIds(record, "identified_decisions", "item_id", errors);
    recordIds(record, "action_items", "item_id", errors);
    const evidence = record.evidence;
    if (Array.isArray(evidence)) {
      evidence.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const locator = (item as Record<string, unknown>).locator;
        if (!locator || typeof locator !== "object" || Array.isArray(locator)) return;
        const locatorRecord = locator as Record<string, unknown>;
        if (locatorRecord.kind === "transcript-segment" && typeof locatorRecord.value === "string" && !segmentIds.has(locatorRecord.value)) {
          errors.push(semanticError(`/evidence/${index}/locator/value`, `references missing segment_id '${locatorRecord.value}'`, { missing: locatorRecord.value }));
        }
      });
    }
  }

  if (schemaName === "operating-brief") {
    recordIds(record, "priorities", "priority_id", errors);
    const priorities = record.priorities;
    if (Array.isArray(priorities)) {
      const ranks = new Set<number>();
      priorities.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const priority = item as Record<string, unknown>;
        const rank = priority.rank;
        if (typeof rank === "number") {
          if (ranks.has(rank)) errors.push(semanticError(`/priorities/${index}/rank`, `must be unique; duplicate '${rank}'`, { duplicate: rank }));
          ranks.add(rank);
        }
        const nextAction = priority.next_action;
        if (nextAction && typeof nextAction === "object" && !Array.isArray(nextAction)) {
          const actionDecisionId = (nextAction as Record<string, unknown>).decision_id;
          const priorityId = priority.priority_id;
          if (typeof actionDecisionId === "string" && typeof priorityId === "string" && actionDecisionId !== priorityId) {
            errors.push(semanticError(`/priorities/${index}/next_action/decision_id`, `must match priority_id '${priorityId}'`, { expected: priorityId }));
          }
        }
      });
      for (let expected = 1; expected <= priorities.length; expected += 1) {
        if (!ranks.has(expected)) errors.push(semanticError("/priorities", `ranks must be contiguous from 1; missing '${expected}'`, { missing: expected }));
      }
    }
  }

  if (schemaName === "sales-follow-up-package") {
    const actionIds = recordIds(record, "actions", "action_id", errors);
    const packageId = record.package_id;
    const actions = record.actions;
    if (Array.isArray(actions)) {
      actions.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const action = item as Record<string, unknown>;
        if (typeof packageId === "string" && action.decision_id !== packageId) {
          errors.push(semanticError(`/actions/${index}/decision_id`, `must match package_id '${packageId}'`, { expected: packageId }));
        }
        const approval = action.approval;
        if (!approval || typeof approval !== "object" || Array.isArray(approval)) return;
        const approvalRecord = approval as Record<string, unknown>;
        if (approvalRecord.required !== true || approvalRecord.state !== "proposed" || action.status !== "proposed") {
          errors.push(semanticError(`/actions/${index}`, "sales follow-up actions must remain approval-required proposals"));
        }
      });
    }
    if (actionIds.size === 0) {
      errors.push(semanticError("/actions", "must contain at least one proposed action"));
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
    if (schemaValid) errors.push(...validateSemanticReferences(schemaName, value));
    return { valid: Boolean(schemaValid) && errors.length === 0, errors };
  }

  assert(schemaName: string, value: unknown): void {
    const result = this.validate(schemaName, value);
    if (!result.valid) throw new Error(`${schemaName} validation failed: ${JSON.stringify(result.errors)}`);
  }
}
