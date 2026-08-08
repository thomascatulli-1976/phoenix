import { runGeminiAdapterAcceptance } from "./gemini-adapter-acceptance.js";

try {
  await runGeminiAdapterAcceptance();
  console.log("PASS office-companion-gemini-reference-adapter");
} catch (error) {
  console.error(
    `FAIL office-companion-gemini-reference-adapter - ${
      error instanceof Error ? error.stack ?? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
