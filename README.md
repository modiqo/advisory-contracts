# Advisory Contracts

Language-neutral, versioned contracts for composing evidence-backed advisory workflows across data sources, expert systems, and action destinations.

The JSON Schemas are canonical. TypeScript types and runtime validation are conveniences built from the same package. Python is intentionally not the authority; Python bindings can be generated later without splitting the contract definition.

## What this package standardizes

- `decision-context`: the decision, actor, trigger, stakes, deadline, and constraints
- `source-spec`: capability-based input requirements and graceful-degradation rules
- `content-source`: a safe discriminated input containing either an HTTP(S) URI or inline Markdown
- `landing-page-snapshot`: normalized landing-page messaging, sections, CTAs, proof, metadata, and exact evidence references
- `pricing-page-snapshot`: normalized plans, packaging, value metric, CTAs, trust signals, ambiguities, and exact evidence references
- `evidence-item` and `evidence-bundle`: provenance-preserving normalized evidence
- `advisory-rubric`: remixable expert guidance, including Crucible/Heavybit skills
- `decision`: recommendation, counter-evidence, unknowns, thresholds, and kill criteria
- `action-intent`: previewable, approval-gated downstream effects
- `module-manifest`: what a collector, advisor, challenger, renderer, or writer consumes and produces
- `run-manifest`: exact contract, adapters, modules, and degraded stages used by a run

## Use directly

Until the npm package is published, pin a GitHub release or commit and consume `schemas/v1/*.schema.json` directly. Validate at every module boundary. Contract version `0.2.0` carries schema family `v1`; additive changes stay in `v1`, while breaking changes create `v2`.

```ts
import { ContractValidator } from "@modiqo/advisory-contracts";

const contracts = new ContractValidator();
contracts.assert("evidence-bundle", candidate);
```

Convert a Play's single `source` string into the canonical input shape without guessing between two populated fields:

```ts
import { parseContentSourceInput } from "@modiqo/advisory-contracts";

const livePage = parseContentSourceInput("landing-page", "https://modiqo.ai/");
// { schema_version: "v1", source_id: "landing-page", kind: "uri", uri: "https://modiqo.ai/" }

const draft = parseContentSourceInput("pricing-draft", "# Pricing\n\n## Pro — $99/month");
// { schema_version: "v1", source_id: "pricing-draft", kind: "markdown", markdown: "..." }
```

Detection is deterministic and fails closed:

- Valid `http://` and `https://` inputs become `kind: "uri"`.
- Any other non-empty text becomes `kind: "markdown"`.
- URI-like inputs using `file:`, `javascript:`, or another unsupported scheme are rejected rather than treated as Markdown.
- A structured `ContentSource` cannot contain both `uri` and `markdown`.

## Landing and pricing ingestion

The public Play surface can remain a single required string:

```text
source=https://modiqo.ai/
```

or inline Markdown:

```text
source=# Headline

Product description and proposed CTA.
```

The acquisition stage must normalize that source before any advisory model evaluates it:

| Input | Required acquisition | Snapshot requirement |
| --- | --- | --- |
| HTTP(S) URI | Render and inspect with `rote browse` | `method: "rote-browse"`, `rendered: true`, and `final_uri` |
| Markdown | Parse the supplied text without browsing | `method: "markdown-parser"` and `rendered: false` |

Every normalized claim points to an entry in the snapshot's `evidence` array. Validation rejects duplicate evidence IDs, dangling `evidence_refs`, duplicate pricing plan IDs, and CTAs that reference a missing plan. This lets assessors explain exactly which browser element or Markdown line range supports each conclusion.

```bash
npm install
npm run check
```

## Use in Rote Plays

Do not make one Play shell out to another Play merely to obtain a schema. At release time, vendor the exact schema files a consuming Play needs under `lib/advisory-contracts/v1/`, record the upstream version and SHA-256 digest, and validate deterministic process-step inputs and outputs against that copy.

A future `crucible-heavybit/advisory-contracts` Play can serve as the discoverable authority and conformance test, but the GitHub release remains the canonical source and the vendored schemas keep each Play reproducible offline. A typical module boundary is:

```text
Gmail / GitHub / CRM / web collectors
        -> EvidenceBundle v1
Crucible / Heavybit advisory rubric
        -> AdvisoryRubric v1
decision synthesis + challenger
        -> Decision v1
approval-gated writer
        -> ActionIntent v1
```

Every run should emit a `run-manifest` with the contract version and content digest so a result can be reproduced and audited.

### Pricing-page reasoning harness

`scripts/pricing-page-agent-harness.ts` is the executable boundary used by the
pricing assessment Play. It accepts an HTTP(S) URI or inline Markdown, captures
URI evidence with a full Rote Browser snapshot, asks one selected local agent
(`codex`, `claude`, `pi`, or `hermes`) to normalize the evidence, and rejects
output that fails the `pricing-page-snapshot` schema or evidence-reference
checks.

Published Plays should invoke a commit-pinned raw GitHub URL with `rote deno`
from a `process.exec` step. A typed Crucible `sales_and_commercial` /
`pricing-packaging` step must run first. The harness reads that exact response
from the current DAG workspace, keeping the licensed guidance out of argv,
diagnostics, and the final result.

```text
auth_crucible
  -> load_pricing_rubric
  -> process.exec: rote deno run --allow-all <pinned-harness-url> --source $source --agent $reasoning_agent
```

The optional `--rubric` argument exists only for isolated harness development.
Do not use it in a published Play because process diagnostics can expose argv.

### Landing-page reasoning harness

`scripts/landing-page-agent-harness.ts` applies the same boundary to landing
pages. It accepts an HTTP(S) URI or inline Markdown, captures the complete
rendered Rote Browser snapshot for URI inputs, and asks the selected local
agent to produce both a `landing-page-snapshot` and a detailed messaging
decision memo. The harness validates the schema, checks every evidence
reference (including ranked recommendations), and permits one constrained
repair attempt before failing nonzero.

Published Plays should invoke a commit-pinned raw GitHub URL after a typed
Crucible `marketing_and_growth` / `messaging-positioning` step. The harness
loads that exact response from the current DAG workspace, so licensed guidance
does not travel in argv or appear in the final result.

```text
auth_crucible
  -> load_messaging_rubric
  -> process.exec: rote deno run --allow-all <pinned-harness-url> --source $source --agent $reasoning_agent
```

## Contribution rules

1. Change or add a schema.
2. Update the matching TypeScript type.
3. Add both valid and invalid examples for new behavior.
4. Run `npm run check` and `npm run build`.
5. Treat a breaking shape change as a new schema directory, never an in-place edit to a released major schema family.

## Status

This repository is at `0.2.0`: suitable for experimentation and Play authoring, but not yet promised as a stable 1.0 API.
