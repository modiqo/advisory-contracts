import { readFileSync } from "node:fs";
import { ContractValidator } from "../src/index.js";

interface ExampleCase { schema: string; path: string; valid: boolean }

const cases = JSON.parse(readFileSync("examples/examples-manifest.json", "utf8")) as ExampleCase[];
const validator = new ContractValidator();
let failures = 0;

for (const example of cases) {
  const value = JSON.parse(readFileSync(`examples/${example.path}`, "utf8")) as unknown;
  const result = validator.validate(example.schema, value);
  const passed = result.valid === example.valid;
  console.log(`${passed ? "PASS" : "FAIL"} ${example.path} (${example.schema}, expected ${example.valid ? "valid" : "invalid"})`);
  if (!passed) {
    failures += 1;
    console.error(result.errors);
  }
}

if (failures > 0) process.exitCode = 1;
