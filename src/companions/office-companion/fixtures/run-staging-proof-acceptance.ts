import { runOfficeStagingProofAcceptance } from "./staging-proof-acceptance.js";

try {
  await runOfficeStagingProofAcceptance();
  console.log("PASS office-companion-staging-proof");
} catch (error) {
  console.error(
    `FAIL office-companion-staging-proof - ${
      error instanceof Error ? error.stack ?? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
