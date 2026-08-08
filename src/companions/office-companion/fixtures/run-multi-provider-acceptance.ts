import { runMultiProviderAcceptance } from "./multi-provider-acceptance.js";

try {
  await runMultiProviderAcceptance();
  console.log("PASS office-companion-multi-provider-adapters");
} catch (error) {
  console.error(
    `FAIL office-companion-multi-provider-adapters - ${
      error instanceof Error ? error.stack ?? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
}
