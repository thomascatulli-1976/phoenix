import { runOfficeCompanionServerSmoke } from "./server-smoke.js";

try {
  await runOfficeCompanionServerSmoke();
  console.log("PASS office-companion-runtime-server");
} catch (error) {
  console.error(
    `FAIL office-companion-runtime-server - ${
      error instanceof Error ? error.stack ?? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
