# Advisory Contracts

Language-neutral, versioned contracts for composing evidence-backed advisory workflows across data sources, expert systems, and action destinations.

The JSON Schemas are canonical. TypeScript types and runtime validation are conveniences built from the same package. Python is intentionally not the authority; Python bindings can be generated later without splitting the contract definition.

## What this package standardizes

- `decision-context`: the decision, actor, trigger, stakes, deadline, and constraints
- `source-spec`: capability-based input requirements and graceful-degradation rules
- `evidence-item` and `evidence-bundle`: provenance-preserving normalized evidence
- `advisory-rubric`: remixable expert guidance, including Crucible/Heavybit skills
- `decision`: recommendation, counter-evidence, unknowns, thresholds, and kill criteria
- `action-intent`: previewable, approval-gated downstream effects
- `module-manifest`: what a collector, advisor, challenger, renderer, or writer consumes and produces
- `run-manifest`: exact contract, adapters, modules, and degraded stages used by a run

## Use directly

Until the npm package is published, pin a GitHub release or commit and consume `schemas/v1/*.schema.json` directly. Validate at every module boundary. Contract version `0.1.0` carries schema family `v1`; additive changes stay in `v1`, while breaking changes create `v2`.

```ts
import { ContractValidator } from "@modiqo/advisory-contracts";

const contracts = new ContractValidator();
contracts.assert("evidence-bundle", candidate);
```

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

## Contribution rules

1. Change or add a schema.
2. Update the matching TypeScript type.
3. Add both valid and invalid examples for new behavior.
4. Run `npm run check` and `npm run build`.
5. Treat a breaking shape change as a new schema directory, never an in-place edit to a released major schema family.

## Status

This repository begins at `0.1.0`: suitable for experimentation and Play authoring, but not yet promised as a stable 1.0 API.
