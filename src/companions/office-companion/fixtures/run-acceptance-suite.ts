import { runOfficeCompanionAcceptanceSuite } from "./acceptance-suite.js";

const results = runOfficeCompanionAcceptanceSuite();

for (const result of results) {
  const marker = result.passed ? "PASS" : "FAIL";
  const detail = result.error ? ` - ${result.error}` : "";
  console.log(`${marker} ${result.suite}${detail}`);
}

const failures = results.filter((result) => !result.passed);

if (failures.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`PASS phoenix-office-companion (${results.length} suites)`);
}
