import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ContractValidator } from "../src/index.js";

const validator = new ContractValidator();

test("accepts a source-attributed evidence bundle", () => {
  const bundle = JSON.parse(readFileSync("examples/valid/evidence-bundle.json", "utf8"));
  assert.equal(validator.validate("evidence-bundle", bundle).valid, true);
});

test("rejects evidence without source_family", () => {
  const bundle = JSON.parse(readFileSync("examples/invalid/evidence-bundle-missing-source-family.json", "utf8"));
  const result = validator.validate("evidence-bundle", bundle);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.instancePath === "/items/0" && error.keyword === "required"));
});

test("prevents an approval-gated action from claiming execution", () => {
  const action = JSON.parse(readFileSync("examples/invalid/action-intent-executed-unapproved.json", "utf8"));
  assert.equal(validator.validate("action-intent", action).valid, false);
});

test("reports unknown contract names", () => {
  assert.throws(() => validator.validate("missing", {}), /Unknown advisory contract/);
});
