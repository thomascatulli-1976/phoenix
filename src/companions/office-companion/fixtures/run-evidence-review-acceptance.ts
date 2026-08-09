import { runEvidenceReviewAcceptance } from "./evidence-review-acceptance.js";

try {
  await runEvidenceReviewAcceptance();
  console.log("PASS office-companion-evidence-review");
} catch (error) {
  console.error(
    `FAIL office-companion-evidence-review - ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
