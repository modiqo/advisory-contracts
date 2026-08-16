import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ContractValidator, parseContentSourceInput } from "../src/index.js";

const validator = new ContractValidator();

test("accepts a source-attributed evidence bundle", () => {
  const bundle = JSON.parse(
    readFileSync("examples/valid/evidence-bundle.json", "utf8"),
  );
  assert.equal(validator.validate("evidence-bundle", bundle).valid, true);
});

test("rejects evidence without source_family", () => {
  const bundle = JSON.parse(
    readFileSync(
      "examples/invalid/evidence-bundle-missing-source-family.json",
      "utf8",
    ),
  );
  const result = validator.validate("evidence-bundle", bundle);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.instancePath === "/items/0" && error.keyword === "required"
    ),
  );
});

test("prevents an approval-gated action from claiming execution", () => {
  const action = JSON.parse(
    readFileSync(
      "examples/invalid/action-intent-executed-unapproved.json",
      "utf8",
    ),
  );
  assert.equal(validator.validate("action-intent", action).valid, false);
});

test("reports unknown contract names", () => {
  assert.throws(
    () => validator.validate("missing", {}),
    /Unknown advisory contract/,
  );
});

test("accepts explicit URI and Markdown content sources", () => {
  const uri = JSON.parse(
    readFileSync("examples/valid/content-source-uri.json", "utf8"),
  );
  const markdown = JSON.parse(
    readFileSync("examples/valid/content-source-markdown.json", "utf8"),
  );
  assert.equal(validator.validate("content-source", uri).valid, true);
  assert.equal(validator.validate("content-source", markdown).valid, true);
});

test("rejects ambiguous and unsafe content sources", () => {
  const ambiguous = JSON.parse(
    readFileSync(
      "examples/invalid/content-source-both-uri-and-markdown.json",
      "utf8",
    ),
  );
  const unsafe = JSON.parse(
    readFileSync("examples/invalid/content-source-unsafe-uri.json", "utf8"),
  );
  assert.equal(validator.validate("content-source", ambiguous).valid, false);
  assert.equal(validator.validate("content-source", unsafe).valid, false);
});

test("maps a Play source string deterministically", () => {
  assert.deepEqual(
    parseContentSourceInput("live", " HTTPS://modiqo.ai/pricing "),
    {
      schema_version: "v1",
      source_id: "live",
      kind: "uri",
      uri: "https://modiqo.ai/pricing",
    },
  );

  const markdown = "# Pricing\n\nSimple plans for small teams.\n";
  assert.deepEqual(parseContentSourceInput("draft", markdown), {
    schema_version: "v1",
    source_id: "draft",
    kind: "markdown",
    markdown,
  });
});

test("fails closed for empty input and unsupported URI schemes", () => {
  assert.throws(
    () => parseContentSourceInput("empty", "   "),
    /non-empty HTTP\(S\) URI or Markdown/,
  );
  assert.throws(
    () => parseContentSourceInput("unsafe", "javascript:alert(1)"),
    /must use http or https/,
  );
  assert.throws(
    () => parseContentSourceInput("file", "file:\/\/\/tmp\/pricing.md"),
    /must use http or https/,
  );
});

test("accepts evidence-linked landing and pricing snapshots", () => {
  const landing = JSON.parse(
    readFileSync("examples/valid/landing-page-snapshot-uri.json", "utf8"),
  );
  const pricing = JSON.parse(
    readFileSync("examples/valid/pricing-page-snapshot-markdown.json", "utf8"),
  );
  assert.equal(
    validator.validate("landing-page-snapshot", landing).valid,
    true,
  );
  assert.equal(
    validator.validate("pricing-page-snapshot", pricing).valid,
    true,
  );
});

test("rejects dangling evidence and pricing plan references", () => {
  const landing = JSON.parse(
    readFileSync(
      "examples/invalid/landing-page-snapshot-missing-evidence.json",
      "utf8",
    ),
  );
  const pricing = JSON.parse(
    readFileSync(
      "examples/invalid/pricing-page-snapshot-missing-plan.json",
      "utf8",
    ),
  );
  const landingResult = validator.validate("landing-page-snapshot", landing);
  const pricingResult = validator.validate("pricing-page-snapshot", pricing);
  assert.equal(landingResult.valid, false);
  assert.ok(
    landingResult.errors.some((error) =>
      error.keyword === "contractReference" &&
      error.instancePath === "/positioning/evidence_refs/0"
    ),
  );
  assert.equal(pricingResult.valid, false);
  assert.ok(
    pricingResult.errors.some((error) =>
      error.keyword === "contractReference" &&
      error.instancePath === "/calls_to_action/0/plan_id"
    ),
  );
});

test("accepts provider-neutral conversation artifacts", () => {
  const conversation = JSON.parse(
    readFileSync("examples/valid/conversation-artifact.json", "utf8"),
  );
  assert.equal(
    validator.validate("conversation-artifact", conversation).valid,
    true,
  );
});

test("rejects conversation findings with missing evidence", () => {
  const conversation = JSON.parse(
    readFileSync(
      "examples/invalid/conversation-artifact-missing-evidence.json",
      "utf8",
    ),
  );
  const result = validator.validate("conversation-artifact", conversation);
  assert.equal(result.valid, false);
  assert.ok(
    result.errors.some((error) =>
      error.keyword === "contractReference" &&
      error.instancePath === "/identified_decisions/0/evidence_refs/0"
    ),
  );
});

test("accepts compact operating briefs and rejects ambiguous ranks", () => {
  const valid = JSON.parse(
    readFileSync("examples/valid/operating-brief.json", "utf8"),
  );
  const invalid = JSON.parse(
    readFileSync(
      "examples/invalid/operating-brief-duplicate-rank.json",
      "utf8",
    ),
  );
  assert.equal(validator.validate("operating-brief", valid).valid, true);
  const invalidResult = validator.validate("operating-brief", invalid);
  assert.equal(invalidResult.valid, false);
  assert.ok(
    invalidResult.errors.some((error) =>
      error.keyword === "contractReference" &&
      error.instancePath === "/priorities/1/rank"
    ),
  );
});

test("requires URI snapshots to come from a rendered rote browse capture", () => {
  const landing = JSON.parse(
    readFileSync("examples/valid/landing-page-snapshot-uri.json", "utf8"),
  );
  landing.extraction.method = "markdown-parser";
  landing.extraction.rendered = false;
  assert.equal(
    validator.validate("landing-page-snapshot", landing).valid,
    false,
  );
});

test("assessment harnesses consume the rendered navigation snapshot without a DOM-quiet wait", () => {
  for (
    const path of [
      "scripts/landing-page-agent-harness.ts",
      "scripts/pricing-page-agent-harness.ts",
    ]
  ) {
    const harness = readFileSync(path, "utf8");
    assert.match(harness, /const snapshotId = capturedSnapshotId\(opened\)/);
    assert.doesNotMatch(harness, /"--quiet-ms"/);
  }
});

test("pricing assessment uses a bounded one-shot fast reasoning path", () => {
  const harness = readFileSync("scripts/pricing-page-agent-harness.ts", "utf8");
  assert.match(harness, /const REASONING_TIMEOUT_MS = 27_000/);
  assert.match(harness, /const MAX_RUBRIC_CHARS = 1_200/);
  assert.match(
    harness,
    /type ReasoningAgent = "codex" \| "claude" \| "kimi" \| "pi" \| "hermes"/,
  );
  assert.match(harness, /model_reasoning_effort/);
  assert.match(harness, /settings\.provider \? \["--provider"/);
  assert.match(harness, /compactPageEvidence/);
  assert.doesNotMatch(
    harness,
    /--output-schema|--json-schema|priorOutput|repairErrors/,
  );
  assert.doesNotMatch(harness, /for \(let attempt/);
});

test("landing assessment uses a bounded one-shot fast reasoning path", () => {
  const harness = readFileSync("scripts/landing-page-agent-harness.ts", "utf8");
  assert.match(harness, /const REASONING_TIMEOUT_MS = 27_000/);
  assert.match(harness, /const MAX_RUBRIC_CHARS = 1_200/);
  assert.match(
    harness,
    /type ReasoningAgent = "codex" \| "claude" \| "kimi" \| "pi" \| "hermes"/,
  );
  assert.match(harness, /model_reasoning_effort/);
  assert.match(harness, /settings\.provider \? \["--provider"/);
  assert.match(harness, /compactPageEvidence/);
  assert.match(harness, /snapshotFromFacts/);
  assert.match(harness, /kimi-code\/kimi-for-coding-highspeed/);
  assert.doesNotMatch(
    harness,
    /--output-schema|--json-schema|priorOutput|repairErrors/,
  );
  assert.doesNotMatch(harness, /for \(let attempt/);
});

test("founder daily brief uses private file input and a bounded one-shot reasoning path", () => {
  const harness = readFileSync(
    "scripts/founder-daily-brief-agent-harness.ts",
    "utf8",
  );
  assert.match(harness, /const REASONING_TIMEOUT_MS = 27_000/);
  assert.match(harness, /const MAX_EVIDENCE_CHARS = 6_000/);
  assert.match(harness, /const MAX_RUBRIC_CHARS = 1_200/);
  assert.match(harness, /--input-file/);
  assert.match(
    harness,
    /type ReasoningAgent = "codex" \| "claude" \| "kimi" \| "pi" \| "hermes"/,
  );
  assert.match(harness, /model_reasoning_effort/);
  assert.match(harness, /settings\.provider \? \["--provider"/);
  assert.match(harness, /approval: \{ required: true, state: "proposed" \}/);
  assert.doesNotMatch(harness, /for \(let attempt/);
});
