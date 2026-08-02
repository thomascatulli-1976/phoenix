import { readFile } from "node:fs/promises";
import {
  defaultPhoenixApprovalPolicy,
  evaluatePhoenixApproval,
  type PhoenixApprovalAttestation,
  type PhoenixApprovalInput,
  type PhoenixApprovalPolicy,
} from "./approval-engine";

const readJson = async <T>(path: string): Promise<T> =>
  JSON.parse(await readFile(path, "utf8")) as T;

const [inputPath, policyPath] = process.argv.slice(2);
if (!inputPath) {
  throw new Error(
    "Usage: tsx src/platform/governance/run-approval.ts <input.json> [policy.json]",
  );
}

const input = await readJson<PhoenixApprovalInput>(inputPath);
const policy = policyPath
  ? await readJson<PhoenixApprovalPolicy>(policyPath)
  : defaultPhoenixApprovalPolicy();

const report = evaluatePhoenixApproval(input, policy);
console.log(JSON.stringify(report, null, 2));

if (report.mergeAuthorization !== "granted") {
  process.exitCode = 1;
}
